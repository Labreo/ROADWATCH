"""Routing Accuracy Service

Computes routing accuracy scores based on citizen feedback from the
routing_feedback table. Used by the Routing Accuracy Feedback Loop (B2)
and the Routing SLA Dashboard (B4).
"""

from app.services.database import db


class RoutingAccuracyService:

    @staticmethod
    def compute_routing_accuracy_score(authority_id: int) -> float:
        """
        Compute the routing accuracy score for a given authority.
        Score = (confirmed_feedback_count / total_feedback_count) * 100
        Returns 0.00 if no feedback exists.
        """
        result = db.query(
            "SELECT "
            "COUNT(*) FILTER (WHERE citizen_confirmed = TRUE) AS confirmed, "
            "COUNT(*) AS total "
            "FROM routing_feedback "
            "WHERE authority_id = ?",
            (authority_id,),
        )

        if not result or result[0]["total"] == 0:
            return 0.00

        confirmed = result[0]["confirmed"] or 0
        total = result[0]["total"] or 0
        return round((confirmed / total) * 100, 2)

    @staticmethod
    def get_all_authority_scores() -> list:
        """Return routing accuracy scores for all authorities."""
        return db.query(
            "SELECT a.id, a.name, a.department_code, a.routing_accuracy_score, "
            "COUNT(rf.id) AS feedback_count "
            "FROM authorities a "
            "LEFT JOIN routing_feedback rf ON rf.authority_id = a.id "
            "GROUP BY a.id, a.name, a.department_code, a.routing_accuracy_score "
            "ORDER BY a.routing_accuracy_score DESC"
        )
