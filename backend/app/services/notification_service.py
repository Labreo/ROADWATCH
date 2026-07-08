"""
Notification service for webhook dispatch and SSE event broadcast.
Sends outbound notifications to authority webhook endpoints and logs delivery.
"""
import hmac
import hashlib
import json
import logging
from datetime import datetime
from typing import Any, Optional

import httpx

from app.services.database import db
from app.services.event_bus import broadcast_log

logger = logging.getLogger(__name__)


class NotificationService:
    """Dispatch webhook notifications to authority endpoints and SSE broadcast."""

    @staticmethod
    async def notify_complaint_assigned(
        complaint: dict, authority: dict
    ) -> dict:
        """Notify authority that a complaint was assigned to them."""
        payload = {
            "event": "complaint.assigned",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "complaint": {
                "id": complaint.get("id"),
                "title": complaint.get("title"),
                "description": complaint.get("description"),
                "category": complaint.get("category"),
                "status": complaint.get("status"),
                "priority": complaint.get("priority"),
                "createdAt": complaint.get("created_at"),
            },
            "authority": {
                "id": authority.get("id"),
                "name": authority.get("name"),
                "departmentCode": authority.get("department_code"),
            },
        }

        await broadcast_log(
            "info",
            f"Complaint #{complaint.get('id')} assigned to {authority.get('name', 'unknown')}.",
            complaint=complaint,
        )

        return await NotificationService._dispatch_webhook(
            authority_id=authority.get("id"),
            event_type="complaint.assigned",
            payload=payload,
            complaint_id=complaint.get("id"),
        )

    @staticmethod
    async def notify_complaint_escalated(
        complaint: dict,
        escalation: dict,
    ) -> dict:
        """Notify authority that a complaint was escalated."""
        payload = {
            "event": "complaint.escalated",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "complaint": {
                "id": complaint.get("id"),
                "title": complaint.get("title"),
                "category": complaint.get("category"),
                "status": complaint.get("status"),
                "priority": complaint.get("priority"),
            },
            "escalation": {
                "fromLevel": escalation.get("from_level", 0),
                "toLevel": escalation.get("to_level", 1),
                "escalatedBy": escalation.get("escalated_by", "system"),
            },
        }

        await broadcast_log(
            "alert",
            f"Complaint #{complaint.get('id')} escalated to Level {escalation.get('to_level')}.",
            complaint=complaint,
        )

        return await NotificationService._dispatch_webhook(
            authority_id=escalation.get("escalated_to_authority_id"),
            event_type="complaint.escalated",
            payload=payload,
            complaint_id=complaint.get("id"),
        )

    @staticmethod
    async def notify_complaint_declined(
        complaint: dict,
        old_authority: dict,
        new_authority: Optional[dict] = None,
    ) -> dict:
        """Notify about authority decline and reassignment."""
        payload = {
            "event": "complaint.declined",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "complaint": {
                "id": complaint.get("id"),
                "title": complaint.get("title"),
                "category": complaint.get("category"),
            },
            "declinedBy": {
                "id": old_authority.get("id"),
                "name": old_authority.get("name"),
            },
            "reassignedTo": {
                "id": new_authority.get("id"),
                "name": new_authority.get("name"),
            } if new_authority else None,
        }

        await broadcast_log(
            "warning",
            f"Complaint #{complaint.get('id')} declined by {old_authority.get('name', 'unknown')}."
            + (f" Reassigned to {new_authority.get('name')}." if new_authority else " No authority available."),
            complaint=complaint,
        )

        return await NotificationService._dispatch_webhook(
            authority_id=old_authority.get("id"),
            event_type="complaint.declined",
            payload=payload,
            complaint_id=complaint.get("id"),
        )

    @staticmethod
    async def _dispatch_webhook(
        authority_id: int,
        event_type: str,
        payload: dict,
        complaint_id: Optional[int] = None,
    ) -> dict:
        """Look up webhook config for authority and send POST."""
        # Fetch webhook config
        webhooks = db.query(
            "SELECT id, webhook_url, secret_token, is_active FROM authority_webhooks "
            "WHERE authority_id = ? AND is_active = TRUE AND (? = ANY(events) OR events = '{}')",
            (authority_id, event_type),
        )
        if not webhooks:
            return {"status": "skipped", "reason": "no_webhook"}

        wh = webhooks[0]
        url = wh["webhook_url"]
        secret = wh.get("secret_token") or ""
        webhook_id = wh["id"]
        body = json.dumps(payload, default=str)

        # HMAC signature
        signature = hmac.new(
            secret.encode("utf-8"),
            body.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        status = "pending"
        response_code = None
        response_body = None

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    url,
                    content=body,
                    headers={
                        "Content-Type": "application/json",
                        "X-Webhook-Signature": f"sha256={signature}",
                        "X-Event-Type": event_type,
                    },
                )
                status = "sent" if resp.status_code < 500 else "failed"
                response_code = resp.status_code
                response_body = resp.text[:500]
        except httpx.TimeoutException:
            status = "failed"
            response_code = 0
            response_body = "timeout"

        # Log notification
        db.execute(
            "INSERT INTO notification_log (complaint_id, authority_id, event_type, webhook_url, status, response_code, response_body) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (complaint_id, authority_id, event_type, url, status, response_code, response_body),
        )

        return {"status": status, "response_code": response_code}