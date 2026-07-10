"""
SMS/USSD Gateway Service for ROADWATCH.

Simulates carrier SMS/USSD gateway integration for citizen notifications.
In production, this would connect to Twilio, AfricasTalking, or similar.

Supports:
- Send SMS notifications to citizens
- USSD menu navigation for feature phone users
- Complaint status update notifications
- Delivery status tracking
"""

import asyncio
import random
import logging
from datetime import datetime, timezone
from typing import Optional

from app.services.database import db

logger = logging.getLogger(__name__)

# In-memory USSD session store
ussd_sessions: dict = {}


class SMSService:
    """Gateway for SMS and USSD interactions with citizens."""

    @staticmethod
    async def send_sms(
        phone_number: str,
        message: str,
        channel: str = "sms",
        complaint_id: Optional[int] = None,
        authority_id: Optional[int] = None,
        event_type: str = "updated",
    ) -> dict:
        """Send an SMS notification. Simulates carrier delivery.

        Args:
            phone_number: Recipient phone number (E.164 format)
            message: SMS body text
            channel: 'sms' or 'ussd'
            complaint_id: Related complaint (optional)
            authority_id: Related authority (optional)
            event_type: Notification event type

        Returns:
            dict with status and notification_log_id
        """
        # Simulate carrier delivery delay (50-200ms)
        await asyncio.sleep(random.uniform(0.05, 0.2))

        # Simulate 95% delivery success rate
        status = "sent" if random.random() < 0.95 else "failed"

        # Log to citizen_notifications table
        log_id = db.execute(
            """
            INSERT INTO citizen_notifications
                (complaint_id, channel, recipient, event_type, status, provider_response)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                complaint_id,
                channel,
                phone_number,
                event_type,
                status,
                f"Simulated {channel} delivery via ROADWATCH gateway",
            ),
        )

        if status == "failed":
            logger.warning(
                "SMS delivery failed to %s (event: %s, complaint: %s)",
                phone_number,
                event_type,
                complaint_id,
            )

        return {
            "status": status,
            "notification_log_id": log_id,
            "channel": channel,
            "recipient": phone_number,
            "message_snippet": message[:80],
        }

    @staticmethod
    async def send_complaint_update(
        complaint_id: int, update_type: str
    ) -> list[dict]:
        """Send notification to citizen when complaint status changes.

        update_type: 'routed', 'escalated', 'resolved', 'rejected', 'in_progress'
        """
        complaint = db.query(
            """
            SELECT c.id, c.title, c.status, c.citizen_contact,
                   a.name AS authority_name
            FROM complaints c
            LEFT JOIN authorities a ON c.assigned_authority_id = a.id
            WHERE c.id = %s
            """,
            (complaint_id,),
        )
        if not complaint:
            return []
        c = complaint[0]

        citizen_phone = c.get("citizen_contact")
        if not citizen_phone:
            logger.info("No citizen contact for complaint %s — skipping SMS", complaint_id)
            return []

        # Build message per update type
        messages = {
            "routed": (
                f"ROADWATCH: Complaint #{c['id']} '{c['title'][:40]}' "
                f"routed to {c['authority_name'] or 'appropriate authority'}. "
                f"Reference: #{c['id']}. Track via USSD *762392824#"
            ),
            "escalated": (
                f"ROADWATCH: Complaint #{c['id']} has been ESCALATED "
                f"to higher authority. Reference: #{c['id']}"
            ),
            "resolved": (
                f"ROADWATCH: Complaint #{c['id']} '{c['title'][:40]}' "
                f"has been RESOLVED. Thank you for your report."
            ),
            "rejected": (
                f"ROADWATCH: Complaint #{c['id']} could not be processed. "
                f"Please re-file with more details or call helpline."
            ),
            "in_progress": (
                f"ROADWATCH: Complaint #{c['id']} is now IN PROGRESS. "
                f"Authority: {c['authority_name'] or 'Assigned department'}"
            ),
        }

        message = messages.get(update_type, f"ROADWATCH: Update on complaint #{c['id']} — {update_type}")

        result = await SMSService.send_sms(
            phone_number=citizen_phone,
            message=message,
            event_type=update_type,
            complaint_id=complaint_id,
        )
        return [result]

    @staticmethod
    def process_ussd_session(session_id: str, user_input: str) -> str:
        """Process USSD menu navigation.

        USSD Menu Structure:
        Main:       1. Report Issue  2. Check Status  3. Track Spending  4. Find Authority
        Report:     1. Pothole  2. Waterlogging  3. Debris  4. Signage  5. Other
        Check:      Enter complaint ID
        Spending:   1. By Road  2. City-wide  3. By Contractor
        Authority:  Enter road name

        Args:
            session_id: USSD session identifier
            user_input: User's menu selection or text input

        Returns:
            USSD response string (with 'CON ' prefix for continuation
            or 'END ' prefix for terminal response)
        """
        # Initialize or get session
        if session_id not in ussd_sessions:
            ussd_sessions[session_id] = {"step": "main", "data": {}}
            return (
                "CON ROADWATCH Civic Accountability\n"
                "1. Report Issue\n"
                "2. Check Status\n"
                "3. Track Spending\n"
                "4. Find Authority\n"
                "0. Help"
            )

        session = ussd_sessions[session_id]
        step = session["step"]

        # Handle user input based on current step
        if step == "main":
            if user_input == "1":
                session["step"] = "report_category"
                return (
                    "CON Report Issue — Select Category:\n"
                    "1. Pothole / Road Damage\n"
                    "2. Waterlogging\n"
                    "3. Debris / Garbage\n"
                    "4. Missing / Broken Signage\n"
                    "5. Other Issue\n"
                    "0. Back"
                )
            elif user_input == "2":
                session["step"] = "check_status"
                return "CON Enter Complaint ID (number):"
            elif user_input == "3":
                session["step"] = "spending_menu"
                return (
                    "CON Track Spending:\n"
                    "1. By Road Name\n"
                    "2. City-wide Summary\n"
                    "3. By Contractor\n"
                    "0. Back"
                )
            elif user_input == "4":
                session["step"] = "find_authority"
                return "CON Enter road name to find responsible authority:"
            elif user_input == "0":
                return (
                    "END ROADWATCH — AI-powered road accountability.\n"
                    "Web: roadwatch.app\n"
                    "SMS: Send ROAD <name> to this number\n"
                    "For emergencies, dial 100"
                )
            else:
                return "CON Invalid option. Please choose 1-4 or 0 for Help."

        elif step == "report_category":
            categories = {
                "1": "pothole",
                "2": "waterlogging",
                "3": "debris",
                "4": "missing_signage",
                "5": "paving_defect",
            }
            if user_input == "0":
                session["step"] = "main"
                del ussd_sessions[session_id]
                return (
                    "CON ROADWATCH Civic Accountability\n"
                    "1. Report Issue\n"
                    "2. Check Status\n"
                    "3. Track Spending\n"
                    "4. Find Authority\n"
                    "0. Help"
                )
            category = categories.get(user_input)
            if not category:
                return "CON Invalid. Select 1-5 or 0 for Back."
            session["data"]["category"] = category
            session["step"] = "report_location"
            return "CON Enter road name or area (e.g., 'SV Road Andheri'):"

        elif step == "report_location":
            session["data"]["location"] = user_input
            session["step"] = "report_description"
            return "CON Briefly describe the issue (max 160 chars):"

        elif step == "report_description":
            session["data"]["description"] = user_input[:160]
            session["step"] = "report_contact"
            return "CON Enter your phone number for updates:"

        elif step == "report_contact":
            session["data"]["contact"] = user_input
            # Log the complaint via DB
            try:
                complaint_id = db.execute(
                    """
                    INSERT INTO complaints
                        (title, description, category, status, citizen_contact,
                         geom, priority)
                    VALUES (%s, %s, %s, 'pending', %s,
                            ST_GeomFromText('POINT(72.85 19.12)', 4326), 3)
                    RETURNING id
                    """,
                    (
                        f"USSD: {session['data']['category']} on {session['data']['location']}",
                        session["data"]["description"],
                        session["data"]["category"],
                        session["data"]["contact"],
                    ),
                )
                # Clean up session
                del ussd_sessions[session_id]
                return (
                    f"END Thank you! Complaint #{complaint_id} registered.\n"
                    f"Track status: Send STATUS {complaint_id} to this number.\n"
                    f"Or dial *762392824# and choose option 2."
                )
            except Exception as e:
                logger.error("USSD complaint creation failed: %s", e)
                del ussd_sessions[session_id]
                return "END Sorry, we couldn't process your report. Please try again later."

        elif step == "check_status":
            try:
                cid = int(user_input.strip())
                complaint = db.query(
                    """
                    SELECT c.id, c.title, c.status, c.priority, c.escalation_level,
                           a.name AS authority_name
                    FROM complaints c
                    LEFT JOIN authorities a ON c.assigned_authority_id = a.id
                    WHERE c.id = %s
                    """,
                    (cid,),
                )
                if not complaint:
                    return "END Complaint not found. Check the ID and try again."
                c = complaint[0]
                status_icons = {
                    "pending": "⏳",
                    "routed": "📨",
                    "in_progress": "🔧",
                    "resolved": "✅",
                    "rejected": "❌",
                }
                icon = status_icons.get(c["status"], "❓")
                del ussd_sessions[session_id]
                return (
                    f"END Complaint #{c['id']}: {icon} {c['status'].upper()}\n"
                    f"{c['title'][:60]}\n"
                    f"Assigned: {c.get('authority_name') or 'Pending routing'}\n"
                    f"Priority: {c['priority']}/5 | Escalation: Level {c['escalation_level']}"
                )
            except ValueError:
                return "END Invalid ID. Please enter a number."

        elif step == "spending_menu":
            if user_input == "1":
                session["step"] = "spending_road"
                return "CON Enter road name (e.g., 'Western Express Highway'):"
            elif user_input == "2":
                del ussd_sessions[session_id]
                snapshot = db.query("SELECT get_citywide_budget_snapshot()")
                if snapshot:
                    return (
                        "END City Budget Snapshot — "
                        f"Total projects: {snapshot['total_projects']}, "
                        f"Spend rate: {snapshot['city_spend_pct']}%"
                    )
                return "END City-wide data not available. Try a specific road."
            elif user_input == "3":
                session["step"] = "spending_contractor"
                return "CON Enter contractor name (e.g., 'Zenith Construction'):"
            elif user_input == "0":
                return (
                    "CON Track Spending:\n"
                    "1. By Road Name\n"
                    "2. City-wide Summary\n"
                    "3. By Contractor\n"
                    "0. Back"
                )
            else:
                return "CON Invalid. Choose 1-3 or 0 for Back."

        elif step == "spending_road":
            del ussd_sessions[session_id]
            # Match road via alias
            from app.services.retrieval_engine import RetrievalEngine

            road_id, _, _, _ = RetrievalEngine.extract_entities(user_input)
            if road_id:
                summary = db.query(
                    "SELECT name, status, length_km FROM roads WHERE id = %s",
                    (road_id,),
                )
                budget = db.query(
                    "SELECT get_road_budget_summary(%s)", (road_id,)
                )
                if summary and budget:
                    s = summary[0]
                    b = budget[0]
                    return (
                        f"END {s['name']}: {s['status']}, {s['length_km']}km.\n"
                        f"Budget: ₹{b['total_sanctioned']:,.0f} sanctioned, "
                        f"₹{b['total_spent']:,.0f} spent ({b['spend_pct']}%)."
                    )
            return "END Road not found. Try: ROAD Western Express Highway via SMS."

        elif step == "spending_contractor":
            del ussd_sessions[session_id]
            from app.services.retrieval_engine import RetrievalEngine

            _, contractor_id, _, _ = RetrievalEngine.extract_entities(user_input)
            if contractor_id:
                c = db.query(
                    "SELECT name, rating, projects_completed, projects_delayed FROM contractors WHERE id = %s",
                    (contractor_id,),
                )
                if c:
                    c = c[0]
                    return (
                        f"END {c['name']}: Rating {c['rating']}/5. "
                        f"Completed: {c['projects_completed']}, "
                        f"Delayed: {c['projects_delayed']}."
                    )
            return "END Contractor not found. Try another name."

        elif step == "find_authority":
            del ussd_sessions[session_id]
            from app.services.retrieval_engine import RetrievalEngine

            road_id, _, authority_id, _ = RetrievalEngine.extract_entities(user_input)
            if authority_id:
                a = db.query(
                    "SELECT name, department_code, contact_email, contact_phone FROM authorities WHERE id = %s",
                    (authority_id,),
                )
                if a:
                    a = a[0]
                    return (
                        f"END {a['name']} ({a['department_code']})\n"
                        f"Email: {a['contact_email']}\n"
                        f"Phone: {a['contact_phone']}"
                    )
            if road_id:
                road = db.query(
                    "SELECT a.name, a.department_code, a.contact_phone FROM roads r JOIN authorities a ON r.authority_id = a.id WHERE r.id = %s",
                    (road_id,),
                )
                if road:
                    r = road[0]
                    return (
                        f"END Responsible: {r['name']} ({r['department_code']})\n"
                        f"Phone: {r['contact_phone']}"
                    )
            return "END Authority not found. Try a road name like 'Western Express Highway'."

        # Fallback
        del ussd_sessions[session_id]
        return "END Session expired. Please dial *762392824# to start again."

    @staticmethod
    def get_ussd_shortcode() -> str:
        """Return the USSD shortcode for ROADWATCH."""
        return "*762392824#"

    @staticmethod
    async def send_bulk_notification(
        complaint_ids: list[int], update_type: str
    ) -> list[dict]:
        """Send SMS notifications for multiple complaints."""
        results = []
        for cid in complaint_ids:
            try:
                result = await SMSService.send_complaint_update(cid, update_type)
                results.extend(result)
            except Exception as e:
                logger.error("Bulk notification failed for complaint %s: %s", cid, e)
        return results