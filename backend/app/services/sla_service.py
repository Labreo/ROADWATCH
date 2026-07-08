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
        """
        # Find complaints ready for escalation
        # escalation_level 0 -> check Level 1 thresholds
        # escalation_level 1 -> check Level 2 thresholds
        # escalation_level 2 -> already at max, skip
        now = datetime.utcnow()

        for current_level in (0, 1):
            target_level = current_level + 1

            # Get SLA configs for this level
            configs = db.query(
                "SELECT id, category, escalation_hours, escalation_level, "
                "escalate_to_authority_id, notify_template "
                "FROM sla_config WHERE escalation_level = ?",
                (target_level,),
            )

            if not configs:
                continue

            # Build lookup: category -> config
            cat_configs: dict[Optional[str], dict] = {}
            for cfg in configs:
                cat_configs[cfg["category"]] = cfg

            # Fallback config (NULL category)
            fallback = cat_configs.get(None)

            # Query complaints eligible for this escalation
            complaints = db.query(
                "SELECT c.id, c.title, c.category, c.status, c.escalation_level, "
                "c.priority, c.assigned_authority_id, c.created_at, c.updated_at, "
                "c.description "
                "FROM complaints c "
                "WHERE c.status IN ('pending', 'routed', 'in_progress') "
                "AND c.escalation_level = ? "
                "ORDER BY c.created_at ASC",
                (current_level,),
            )

            for complaint in complaints:
                cfg = cat_configs.get(complaint["category"], fallback)
                if not cfg:
                    continue

                # Check if enough hours have passed since last update
                updated_at = complaint.get("updated_at") or complaint["created_at"]
                if isinstance(updated_at, str):
                    updated_at = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
                hours_elapsed = (now - updated_at.replace(tzinfo=None)).total_seconds() / 3600

                if hours_elapsed < cfg["escalation_hours"]:
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

                # Send notification
                escalation_data = {
                    "from_level": old_level,
                    "to_level": new_level,
                    "escalated_by": escalated_by,
                    "escalated_to_authority_id": target_authority_id,
                }
                await NotificationService.notify_complaint_escalated(
                    complaint, escalation_data
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