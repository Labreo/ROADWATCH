"""
Notification service for webhook dispatch, SSE event broadcast, and citizen SMS/email.
Sends outbound notifications to authority webhook endpoints, citizen contacts,
and logs delivery.
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

# ── Simulated Twilio/SendGrid providers (log-only) ──────────────────────

CITIZEN_TEMPLATES = {
    "routed": (
        "ROADWATCH: Your complaint #{id} '{title}' has been routed to {authority} "
        "({engineer}, {contact}). Track: roadwatch.app/track/{id}"
    ),
    "escalated": (
        "ROADWATCH: Complaint #{id} '{title}' has been escalated to Level {level}. "
        "New authority: {authority}. Track: roadwatch.app/track/{id}"
    ),
    "resolved": (
        "ROADWATCH: Complaint #{id} '{title}' has been marked as resolved by {authority}. "
        "Thank you for your report. Review: roadwatch.app/track/{id}"
    ),
    "rejected": (
        "ROADWATCH: Complaint #{id} '{title}' could not be routed. "
        "Please file a new report or contact your local authority."
    ),
}


def _simulate_send_sms(recipient: str, message: str) -> dict:
    """Simulated SMS dispatch — logs to console and returns success."""
    logger.info("📱 [SIMULATED SMS] To: %s | Body: %s", recipient, message[:120])
    return {"status": "sent", "provider": "simulated_sms", "message_id": None}


def _simulate_send_email(recipient: str, subject: str, body: str) -> dict:
    """Simulated email dispatch — logs to console and returns success."""
    logger.info("📧 [SIMULATED EMAIL] To: %s | Subject: %s", recipient, subject)
    return {"status": "sent", "provider": "simulated_email", "message_id": None}


def _determine_channel(contact: str) -> str:
    """Heuristic: if contact contains '@', treat as email, else SMS."""
    return "email" if "@" in contact else "sms"


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

    # ── Citizen Notifications ──────────────────────────────────────────

    @staticmethod
    async def notify_citizen_routed(
        complaint: dict, authority: dict
    ) -> dict:
        """Send SMS/email to citizen when complaint is routed to an authority."""
        contact = complaint.get("citizen_contact")
        if not contact:
            return {"status": "skipped", "reason": "no_contact"}

        message = CITIZEN_TEMPLATES["routed"].format(
            id=complaint.get("id", "?"),
            title=complaint.get("title", "Untitled"),
            authority=authority.get("name", "Unknown"),
            engineer=authority.get("executive_engineer_name", ""),
            contact=authority.get("contact_phone", ""),
        )

        return await NotificationService._send_citizen_notification(
            complaint_id=complaint.get("id"),
            contact=contact,
            event_type="routed",
            subject=f"ROADWATCH: Complaint #{complaint.get('id')} Routed",
            body=message,
        )

    @staticmethod
    async def notify_citizen_escalated(
        complaint: dict, escalation: dict, authority: dict
    ) -> dict:
        """Send SMS/email to citizen when complaint is escalated."""
        contact = complaint.get("citizen_contact")
        if not contact:
            return {"status": "skipped", "reason": "no_contact"}

        message = CITIZEN_TEMPLATES["escalated"].format(
            id=complaint.get("id", "?"),
            title=complaint.get("title", "Untitled"),
            level=escalation.get("to_level", 1),
            authority=authority.get("name", "Unknown"),
        )

        return await NotificationService._send_citizen_notification(
            complaint_id=complaint.get("id"),
            contact=contact,
            event_type="escalated",
            subject=f"ROADWATCH: Complaint #{complaint.get('id')} Escalated",
            body=message,
        )

    @staticmethod
    async def notify_citizen_resolved(
        complaint: dict, authority: dict
    ) -> dict:
        """Send SMS/email to citizen when complaint is resolved."""
        contact = complaint.get("citizen_contact")
        if not contact:
            return {"status": "skipped", "reason": "no_contact"}

        message = CITIZEN_TEMPLATES["resolved"].format(
            id=complaint.get("id", "?"),
            title=complaint.get("title", "Untitled"),
            authority=authority.get("name", "Unknown"),
        )

        return await NotificationService._send_citizen_notification(
            complaint_id=complaint.get("id"),
            contact=contact,
            event_type="resolved",
            subject=f"ROADWATCH: Complaint #{complaint.get('id')} Resolved",
            body=message,
        )

    @staticmethod
    async def notify_citizen_rejected(
        complaint: dict
    ) -> dict:
        """Send SMS/email to citizen when complaint cannot be routed."""
        contact = complaint.get("citizen_contact")
        if not contact:
            return {"status": "skipped", "reason": "no_contact"}

        message = CITIZEN_TEMPLATES["rejected"].format(
            id=complaint.get("id", "?"),
            title=complaint.get("title", "Untitled"),
        )

        return await NotificationService._send_citizen_notification(
            complaint_id=complaint.get("id"),
            contact=contact,
            event_type="rejected",
            subject=f"ROADWATCH: Complaint #{complaint.get('id')} Could Not Be Routed",
            body=message,
        )

    @staticmethod
    async def _send_citizen_notification(
        complaint_id: int,
        contact: str,
        event_type: str,
        subject: str,
        body: str,
    ) -> dict:
        """Helper: dispatch SMS or email, log to citizen_notifications table."""
        channel = _determine_channel(contact)
        if channel == "email":
            result = _simulate_send_email(contact, subject, body)
        else:
            result = _simulate_send_sms(contact, body)

        status = result.get("status", "failed")
        db.execute(
            "INSERT INTO citizen_notifications "
            "(complaint_id, channel, recipient, event_type, status, provider_response) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (complaint_id, channel, contact, event_type, status, json.dumps(result)),
        )

        if status == "sent":
            await broadcast_log(
                "info",
                f"Citizen notification sent ({channel}) for complaint #{complaint_id}: {event_type}",
            )

        return result

    # ── Boundary Alert Notification (used by B6) ───────────────────────

    @staticmethod
    async def notify_authorities_boundary_alert(
        complaint: dict,
        primary_authority: dict,
        secondary_authority: dict,
        boundary_distance_m: float,
    ) -> dict:
        """Notify both authorities when a complaint is near a jurisdiction boundary."""
        payload = {
            "event": "complaint.boundary_alert",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "complaint": {
                "id": complaint.get("id"),
                "title": complaint.get("title"),
                "category": complaint.get("category"),
            },
            "primary_authority": {
                "id": primary_authority.get("id"),
                "name": primary_authority.get("name"),
            },
            "secondary_authority": {
                "id": secondary_authority.get("id"),
                "name": secondary_authority.get("name"),
            },
            "boundary_distance_meters": boundary_distance_m,
        }

        # Notify primary authority
        await NotificationService._dispatch_webhook(
            authority_id=primary_authority.get("id"),
            event_type="complaint.boundary_alert",
            payload=payload,
            complaint_id=complaint.get("id"),
        )

        # Notify secondary authority
        await NotificationService._dispatch_webhook(
            authority_id=secondary_authority.get("id"),
            event_type="complaint.boundary_alert",
            payload=payload,
            complaint_id=complaint.get("id"),
        )

        await broadcast_log(
            "warning",
            f"Boundary alert: Complaint #{complaint.get('id')} is {boundary_distance_m:.1f}m "
            f"from boundary between {primary_authority.get('name')} and {secondary_authority.get('name')}.",
            complaint=complaint,
        )

        return {"status": "sent", "primary": primary_authority.get("id"), "secondary": secondary_authority.get("id")}