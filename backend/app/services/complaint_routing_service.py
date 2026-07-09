"""Complaint Routing Service

Handles assignment, reassignment, and escalation of complaints
to the appropriate authorities. Uses the AuthorityResolver for
spatial jurisdiction matching and auto-reassignment logic.
"""

import json

from app.services.database import db
from app.services.authority_resolver import AuthorityResolver


class ComplaintRoutingService:

    @staticmethod
    def get_complaint_by_id(complaint_id: int) -> dict:
        """Fetch a single complaint by ID."""
        sql = """SELECT * FROM complaints WHERE id = %s"""
        results = db.query(sql, (complaint_id,))
        return results[0] if results else None

    @staticmethod
    def route_complaint(complaint_id: int) -> dict:
        """
        Assigns the appropriate authority to a complaint based on its coordinates
        and creates a notification_log entry.

        Returns the result dict with authority info and notification status.
        """
        complaint = ComplaintRoutingService.get_complaint_by_id(complaint_id)
        if not complaint:
            return {'success': False, 'error': f'Complaint {complaint_id} not found'}

        lon = None
        lat = None
        geom = complaint.get('geom')
        if geom and isinstance(geom, str) and geom.startswith('POINT'):
            # Parse "POINT(lon lat)"
            coords = geom.replace('POINT(', '').replace(')', '').strip().split()
            if len(coords) == 2:
                lon, lat = float(coords[0]), float(coords[1])

        if lon is None or lat is None:
            return {'success': False, 'error': f'Complaint {complaint_id} has no valid geometry'}

        declined = complaint.get('declined_authority_ids') or []
        if isinstance(declined, str):
            try:
                declined = json.loads(declined)
            except (json.JSONDecodeError, TypeError):
                declined = []
        if not isinstance(declined, list):
            declined = list(declined) if declined else []

        authority = AuthorityResolver.resolve_authority_with_auto_reassign(lon, lat, declined)
        auth_id = authority.get('id')

        # Update complaint with assigned authority
        update_sql = """
            UPDATE complaints
            SET assigned_authority_id = %s, status = 'routed'
            WHERE id = %s
        """
        db.execute(update_sql, (auth_id, complaint_id))

        # Create notification_log entry
        notif_sql = """
            INSERT INTO notification_log
                (complaint_id, authority_id, event_type, status)
            VALUES (%s, %s, 'complaint.assigned', 'sent')
        """
        notif_id = db.execute(notif_sql, (complaint_id, auth_id))

        return {
            'success': True,
            'complaint_id': complaint_id,
            'authority_id': auth_id,
            'authority_name': authority.get('name'),
            'reason': authority.get('reason_for_reassign'),
            'notification_log_id': notif_id
        }

    @staticmethod
    def reassign_complaint(complaint_id: int, declined_by_authority_id: int) -> dict:
        """
        Reassigns a complaint after an authority has declined it.
        Calls auto-reassign to exclude the declining authority, updates
        the complaint record, and logs the reassignment.
        """
        complaint = ComplaintRoutingService.get_complaint_by_id(complaint_id)
        if not complaint:
            return {'success': False, 'error': f'Complaint {complaint_id} not found'}

        geom = complaint.get('geom')
        lon = lat = None
        if geom and isinstance(geom, str) and geom.startswith('POINT'):
            coords = geom.replace('POINT(', '').replace(')', '').strip().split()
            if len(coords) == 2:
                lon, lat = float(coords[0]), float(coords[1])

        if lon is None or lat is None:
            return {'success': False, 'error': f'Complaint {complaint_id} has no valid geometry'}

        # Build updated declined_authority_ids list
        existing_declined = complaint.get('declined_authority_ids') or []
        if isinstance(existing_declined, str):
            try:
                existing_declined = json.loads(existing_declined)
            except (json.JSONDecodeError, TypeError):
                existing_declined = []
        if not isinstance(existing_declined, list):
            existing_declined = list(existing_declined) if existing_declined else []

        if declined_by_authority_id not in existing_declined:
            existing_declined.append(declined_by_authority_id)

        # Resolve new authority excluding declining ones
        authority = AuthorityResolver.resolve_authority_with_auto_reassign(lon, lat, existing_declined)
        new_auth_id = authority.get('id')

        # Update complaint
        update_sql = """
            UPDATE complaints
            SET assigned_authority_id = %s,
                declined_authority_ids = %s,
                status = 'routed'
            WHERE id = %s
        """
        db.execute(update_sql, (new_auth_id, existing_declined, complaint_id))

        # Log notification for reassignment to new authority
        notif_sql = """
            INSERT INTO notification_log
                (complaint_id, authority_id, event_type, status)
            VALUES (%s, %s, 'complaint.reassigned', 'sent')
        """
        notif_id = db.execute(notif_sql, (complaint_id, new_auth_id))

        # Log a notification for the declined authority as well
        declined_notif_sql = """
            INSERT INTO notification_log
                (complaint_id, authority_id, event_type, status)
            VALUES (%s, %s, 'complaint.declined', 'sent')
        """
        db.execute(declined_notif_sql, (complaint_id, declined_by_authority_id))

        return {
            'success': True,
            'complaint_id': complaint_id,
            'previous_authority_id': declined_by_authority_id,
            'new_authority_id': new_auth_id,
            'new_authority_name': authority.get('name'),
            'declined_authority_ids': existing_declined,
            'reason': authority.get('reason_for_reassign'),
            'notification_log_id': notif_id
        }

    @staticmethod
    def escalate_complaint(complaint_id: int) -> dict:
        """
        Escalates a complaint to the next level.
        Increments escalation_level, queries sla_config for the next-level
        authority, assigns it, and creates an sla_escalations audit entry.
        """
        complaint = ComplaintRoutingService.get_complaint_by_id(complaint_id)
        if not complaint:
            return {'success': False, 'error': f'Complaint {complaint_id} not found'}

        current_level = complaint.get('escalation_level') or 0
        next_level = current_level + 1

        category = complaint.get('category') or ''

        # Get region code from complaint
        region_code = complaint.get('region_override')
        if not region_code:
            geom = complaint.get('geom')
            if geom and isinstance(geom, str) and geom.startswith('POINT'):
                coords = geom.replace('POINT(', '').replace(')', '').strip().split()
                if len(coords) == 2:
                    lon, lat = float(coords[0]), float(coords[1])
                    region = AuthorityResolver.get_region_for_coordinates(lon, lat)
                    region_code = region['code'] if region else 'IN'

        if not region_code:
            region_code = 'IN'

        # Query sla_config for the next escalation level
        sla_sql = """
            SELECT * FROM sla_config
            WHERE escalation_level = %s
              AND (category = %s OR category IS NULL)
              AND region_code = %s
            ORDER BY category IS NOT NULL DESC
            LIMIT 1
        """
        sla_results = db.query(sla_sql, (next_level, category, region_code))
        sla = sla_results[0] if sla_results else None

        escalate_to_auth_id = None
        if sla:
            escalate_to_auth_id = sla.get('escalate_to_authority_id')

        if not escalate_to_auth_id:
            # Fallback: try general sla_config without region
            sla_fallback = db.query(sla_sql, (next_level, category, None))
            if sla_fallback:
                escalate_to_auth_id = sla_fallback[0].get('escalate_to_authority_id')

        if not escalate_to_auth_id:
            # Ultimate fallback: use authority 4 (State PWD Mumbai)
            escalate_to_auth_id = 4

        # Update complaint escalation
        update_sql = """
            UPDATE complaints
            SET escalation_level = %s,
                assigned_authority_id = %s,
                last_escalated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """
        db.execute(update_sql, (next_level, escalate_to_auth_id, complaint_id))

        # Insert sla_escalations audit entry
        sla_esc_sql = """
            INSERT INTO sla_escalations
                (complaint_id, from_level, to_level, escalated_by, escalated_to_authority_id, notification_status)
            VALUES (%s, %s, %s, 'system', %s, 'sent')
        """
        sla_esc_id = db.execute(sla_esc_sql, (complaint_id, current_level, next_level, escalate_to_auth_id))

        # Log notification for escalation
        notif_sql = """
            INSERT INTO notification_log
                (complaint_id, authority_id, event_type, status)
            VALUES (%s, %s, 'complaint.escalated', 'sent')
        """
        notif_id = db.execute(notif_sql, (complaint_id, escalate_to_auth_id))

        return {
            'success': True,
            'complaint_id': complaint_id,
            'from_level': current_level,
            'to_level': next_level,
            'escalated_to_authority_id': escalate_to_auth_id,
            'sla_escalation_id': sla_esc_id,
            'notification_log_id': notif_id
        }