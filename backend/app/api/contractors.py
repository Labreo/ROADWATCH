"""Contractor endpoints for ROADWATCH.

Provides read and limited write access to contractors, exposing the
normalized ``contractor_code`` and computed ``performance_index``.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.database import db

router = APIRouter()


@router.get("/contractors")
async def list_contractors(
    min_performance: Optional[float] = Query(None, ge=0, le=100, description="Minimum performance index"),
    blacklisted: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=200, description="Max results"),
    offset: int = Query(0, ge=0, description="Skip N rows"),
):
    """Return contractors, ordered by performance index descending."""
    conditions: list[str] = []
    params: list = []

    if min_performance is not None:
        conditions.append("performance_index >= %s")
        params.append(min_performance)
    if blacklisted is not None:
        conditions.append("blacklisted = %s")
        params.append(blacklisted)

    where = " AND ".join(conditions) if conditions else "TRUE"

    sql = f"""
    SELECT id, name, contractor_code, license_number, rating,
           projects_completed, projects_delayed, performance_index,
           blacklisted, blacklisted_reason, registration_date,
           contact_email, contact_phone, created_at, updated_at
    FROM contractors
    WHERE {where}
    ORDER BY performance_index DESC
    LIMIT %s OFFSET %s
    """
    params.extend([limit, offset])
    return db.query(sql, tuple(params))


@router.get("/contractors/{contractor_id}")
async def get_contractor(contractor_id: int):
    """Return a single contractor by ID."""
    sql = """
    SELECT id, name, contractor_code, license_number, rating,
           projects_completed, projects_delayed, performance_index,
           blacklisted, blacklisted_reason, registration_date,
           contact_email, contact_phone, created_at, updated_at
    FROM contractors
    WHERE id = %s
    """
    rows = db.query(sql, (contractor_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return rows[0]


@router.patch("/contractors/{contractor_id}")
async def update_contractor(contractor_id: int, payload: dict):
    """Partially update a contractor's editable fields.

    The ``performance_index`` is recalculated automatically by a database
    trigger when ``rating``, ``projects_completed``, or ``projects_delayed``
    change.
    """
    allowed = {
        "rating", "projects_completed", "projects_delayed",
        "blacklisted", "blacklisted_reason",
        "contact_email", "contact_phone",
    }

    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        raise HTTPException(
            status_code=400,
            detail=f"No valid fields to update. Allowed: {', '.join(sorted(allowed))}",
        )

    # Build SET clause safely (keys are validated against allowed set)
    set_clauses = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [contractor_id]

    sql = f"""
    UPDATE contractors
    SET {set_clauses}
    WHERE id = %s
    RETURNING id, name, contractor_code, rating, projects_completed,
              projects_delayed, performance_index, blacklisted
    """
    rows = db.query(sql, tuple(values))
    if not rows:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return rows[0]