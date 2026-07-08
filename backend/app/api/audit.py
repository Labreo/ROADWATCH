"""Audit log query endpoints for ROADWATCH.

Provides read-only access to the ``audit_log`` table populated by PostgreSQL
triggers on every INSERT / UPDATE / DELETE on complaints, projects,
contractors, and roads.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.database import db

router = APIRouter()


@router.get("/audit/log")
async def get_audit_log(
    table_name: Optional[str] = Query(None, description="Filter by table name"),
    record_id: Optional[int] = Query(None, description="Filter by record ID"),
    action: Optional[str] = Query(None, description="Filter by action (INSERT, UPDATE, DELETE)"),
    limit: int = Query(50, ge=1, le=500, description="Max results"),
    offset: int = Query(0, ge=0, description="Skip N rows"),
):
    """Return paginated audit log entries, most recent first."""
    conditions: list[str] = []
    params: list = []

    if table_name:
        conditions.append("table_name = %s")
        params.append(table_name)
    if record_id is not None:
        conditions.append("record_id = %s")
        params.append(record_id)
    if action:
        conditions.append("action = %s")
        params.append(action.upper())

    where = " AND ".join(conditions) if conditions else "TRUE"

    sql = f"""
    SELECT id, table_name, record_id, action, old_values, new_values,
           changed_by, changed_at
    FROM audit_log
    WHERE {where}
    ORDER BY changed_at DESC
    LIMIT %s OFFSET %s
    """
    params.extend([limit, offset])

    return db.query(sql, tuple(params))


@router.get("/audit/log/{log_id}")
async def get_audit_entry(log_id: int):
    """Return a single audit log entry by its ID."""
    sql = "SELECT * FROM audit_log WHERE id = %s"
    rows = db.query(sql, (log_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="Audit log entry not found")
    return rows[0]