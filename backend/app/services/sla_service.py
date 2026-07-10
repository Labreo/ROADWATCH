"""
SLA timer service for automatic complaint escalation.
Runs as background asyncio task, checks every 60s for breached complaints.
"""
import asyncio
import logging
from datetime import datetime
from typing import Any, Optional

from app.services.database import db
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

# Priority mapping by category (1=lowest, 5=highest)
PRIORITY_BY_CATEGORY: dict[str, int] = {
    "emergency": 5,
    "waterlogging": 4,
    "pothole": 3,
    "paving_defect": 2,
    "debris": 2,
    "missing_signage": 1,
}

# Default priority for unknown categories
DEFAULT_PRIORITY = 3

# Severity-to-priority mapping (B3: Image-based severity prioritization)
SEVERITY_PRIORITY_MAP: dict[str, int] = {
    "emergency": 5,
    "high": 4,
    "medium": 3,
    "low": 1,
}


def compute_priority_from_vision(
    severity: str,
    has_traffic: bool = False,
    category: str = "",
    escalation_level: int = 0,
) -> int:
    """
    B3: Compute priority from vision analysis results.
    severity: 'emergency', 'high', 'medium', 'low'
    has_traffic: whether the defect is on a high-traffic road
    category: defect category (for fallback)
    escalation_level: current escalation level (for boost)

    Priority logic:
    - emergency: always 5
    - high: 4 (boost to 5 if has_traffic)
    - medium: category base (boost +1 if has_traffic, max 4)
    - low: 1 (boost to 2 if has_traffic)
    - Each escalation level adds +1, capped at 5
    """
    severity = severity.lower() if severity else "medium"
    base = SEVERITY_PRIORITY_MAP.get(severity, DEFAULT_PRIORITY)

    # Traffic boost
    if has_traffic and severity in ("high", "medium", "low"):
        base = min(5, base + 1)

    # Escalation boost
    base = min(5, base + escalation_level)

    return base


def compute_priority(category: str, escalation_level: int = 0) -> int:
    """
    Compute priority from category + escalation boost.
    Each escalation level adds +1, capped at 5.
    """
    base = PRIORITY_BY_CATEGORY.get(category, DEFAULT_PRIORITY)
    return min(5, base + escalation_level)


class SlaService:
    """Background SLA monitor. Checks complaints and escalates when thresholds breached."""

    _task: Optional[asyncio.Task] = None
    _running = False

    @classmethod
    async def check_sla(cls):
        """
        Query all active complaints that have breached their SLA threshold
        and escalate them one level.
        Region-aware: resolves complaint region from assigned authority and
        matches against region-specific sla_config.
        """
        now = datetime.utcnow()

        for current_level in (0, 1):
            target_level = current_level + 1

            # Get SLA configs for this level (all regions)
            configs = db.query(
                "SELECT id, category, escalation_hours, escalation_level, "
                "escalate_to_authority_id, notify_template, region_code "
                "FROM sla_config WHERE escalation_level = ?",
                (target_level,),
            )

            if not configs:
                continue

            # Build lookup: (region_code, category) -> config
            cat_configs: dict[tuple[Optional[str], Optional[str]], dict] = {}
            for cfg in configs:
                cat_configs[(cfg["region_code"], cfg["category"])] = cfg

            # Query complaints eligible for this escalation, joined with region
            complaints = db.query(
                "SELECT c.id, c.title, c.category, c.status, c.escalation_level, "
                "c.priority, c.assigned_authority_id, c.created_at, c.updated_at, "
                "c.description, a.region_code "
                "FROM complaints c "
                "LEFT JOIN authorities a ON c.assigned_authority_id = a.id "
                "WHERE c.status IN ('pending', 'routed', 'in_progress') "
                "AND c.escalation_level = ? "
                "ORDER BY c.created_at ASC",
                (current_level,),
            )

            for complaint in complaints:
                region_code = complaint.get("region_code") or "IN"
                # Try: exact (region, category) match first
                cfg = cat_configs.get((region_code, complaint["category"]))
                if not cfg:
                    # Fallback: region-specific NULL category
                    cfg = cat_configs.get((region_code, None))
                if not cfg:
                    # Global fallback: no region, exact category
                    cfg = cat_configs.get((None, complaint["category"]))
                if not cfg:
                    # Ultimate fallback: no region, NULL category
                    cfg = cat_configs.get((None, None))
                if not cfg:
                    continue

                # Escalate!
                target_authority_id = cfg["escalate_to_authority_id"]
                old_level = complaint["escalation_level"]
                new_level = old_level + 1
                escalated_by = "system"

                # Update complaint
                new_priority = compute_priority(
                    complaint["category"], new_level
                )
                db.execute(
                    "UPDATE complaints SET escalation_level = ?, "
                    "last_escalated_at = NOW(), "
                    "priority = ?, "
                    "updated_at = NOW() "
                    "WHERE id = ?",
                    (new_level, new_priority, complaint["id"]),
                )

                # If escalated to Level 2, mark SLA breached
                if new_level >= 2:
                    db.execute(
                        "UPDATE complaints SET sla_breached_at = NOW() WHERE id = ?",
                        (complaint["id"],),
                    )

                # Insert escalation audit record
                escalation_id = db.execute(
                    "INSERT INTO sla_escalations "
                    "(complaint_id, from_level, to_level, escalated_by, "
                    "escalated_to_authority_id, notification_status) "
                    "VALUES (?, ?, ?, ?, ?, 'pending')",
                    (complaint["id"], old_level, new_level, escalated_by, target_authority_id),
                )

                logger.info(
                    "Escalated complaint #%d from level %d to %d (priority: %d)",
                    complaint["id"],
                    old_level,
                    new_level,
                    new_priority,
                )

                # Send notification to authority
                escalation_data = {
                    "from_level": old_level,
                    "to_level": new_level,
                    "escalated_by": escalated_by,
                    "escalated_to_authority_id": target_authority_id,
                }
                await NotificationService.notify_complaint_escalated(
                    complaint, escalation_data
                )

                # Send citizen notification if contact present
                citizen_contact = complaint.get("citizen_contact")
                if citizen_contact:
                    target_auth = None
                    if target_authority_id:
                        from app.services.authority_resolver import AuthorityResolver
                        target_auth = AuthorityResolver.get_authority_by_id(target_authority_id)
                    await NotificationService.notify_citizen_escalated(
                        complaint, escalation_data, target_auth or {}
                    )

    @classmethod
    async def start_background_monitor(cls):
        """
        Start the background SLA check loop. Runs every 60 seconds.
        """
        if cls._running:
            logger.warning("SLA monitor already running")
            return

        cls._running = True
        logger.info("SLA background monitor started (check interval: 60s)")

        try:
            while cls._running:
                try:
                    await cls.check_sla()
                except Exception as e:
                    logger.error("SLA check error: %s", e, exc_info=True)
                await asyncio.sleep(60)
        except asyncio.CancelledError:
            logger.info("SLA monitor cancelled")
        finally:
            cls._running = False

    @classmethod
    def stop_background_monitor(cls):
        """Signal the background monitor to stop."""
        cls._running = False
        logger.info("SLA monitor stop requested")