"""Project financial endpoints for ROADWATCH.

Provides read/write access to fund sources, budget variances, milestones,
contingency reserves, approval trail, and cost-per-km normalization.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.database import db
from app.services.validators import (
    FundSourcePayload,
    ValidatedContingencyPayload,
    ValidatedMilestonePayload,
    ValidatedVariancePayload,
    ValidatedApprovalPayload,
)

router = APIRouter()


# ── Helper ──────────────────────────────────────────────────────────────

def _get_project_or_404(project_id: int):
    """Return project row or raise 404."""
    rows = db.query("SELECT * FROM projects WHERE id = %s", (project_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="Project not found")
    return rows[0]


# ── Fund Sources ────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/fund-sources")
async def get_fund_sources(project_id: int):
    """Return fund sources allocated to a project."""
    _get_project_or_404(project_id)
    return db.query(
        "SELECT id, project_id, source_name, amount, created_at "
        "FROM fund_sources WHERE project_id = %s ORDER BY amount DESC",
        (project_id,),
    )


@router.put("/projects/{project_id}/fund-sources")
async def replace_fund_sources(project_id: int, payload: list[FundSourcePayload]):
    """Bulk-replace fund sources for a project (delete existing, insert new)."""
    _get_project_or_404(project_id)

    # Validate total does not exceed project budget
    project = _get_project_or_404(project_id)
    total = sum(fs.amount for fs in payload)
    if total > project["budget_allocated"]:
        raise HTTPException(
            status_code=400,
            detail=f"Total fund source amount ({total}) exceeds project budget "
                   f"({project['budget_allocated']})",
        )

    # Atomic replace
    db.query("DELETE FROM fund_sources WHERE project_id = %s", (project_id,))
    for fs in payload:
        db.query(
            "INSERT INTO fund_sources (project_id, source_name, amount) VALUES (%s, %s, %s)",
            (project_id, fs.source_name, fs.amount),
        )

    return db.query(
        "SELECT id, project_id, source_name, amount, created_at "
        "FROM fund_sources WHERE project_id = %s ORDER BY amount DESC",
        (project_id,),
    )


@router.get("/projects/fund-sources/summary")
async def get_fund_sources_summary():
    """Aggregate all fund sources city-wide."""
    return db.query("""
        SELECT fs.source_name,
               COUNT(DISTINCT fs.project_id) AS project_count,
               SUM(fs.amount) AS total_amount
        FROM fund_sources fs
        GROUP BY fs.source_name
        ORDER BY total_amount DESC
    """)


# ── Budget Variance Reasons ─────────────────────────────────────────────

@router.get("/projects/{project_id}/variance-reasons")
async def get_variance_reasons(project_id: int):
    """Return budget variance reasons for a project."""
    _get_project_or_404(project_id)
    return db.query(
        "SELECT * FROM budget_variance_reasons WHERE project_id = %s ORDER BY created_at DESC",
        (project_id,),
    )


@router.post("/projects/{project_id}/variance-reasons")
async def create_variance_reason(project_id: int, payload: ValidatedVariancePayload):
    """Record a budget variance reason for a project."""
    project = _get_project_or_404(project_id)

    original = payload.original_budget or project["budget_allocated"]
    revised = payload.revised_budget
    variance_amt = payload.variance_amount
    variance_pct = payload.variance_pct
    if variance_pct is None and original:
        variance_pct = round((variance_amt / original) * 100, 2)

    rows = db.query(
        """INSERT INTO budget_variance_reasons
           (project_id, original_budget, revised_budget, variance_amount,
            variance_pct, reason, approved_by, approval_date, approval_document_url)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
           RETURNING *""",
        (project_id, original, revised, variance_amt, variance_pct,
         payload.reason, payload.approved_by, payload.approval_date,
         payload.approval_document_url),
    )
    return rows[0]


@router.patch("/variance-reasons/{variance_id}")
async def update_variance_reason(variance_id: int, payload: dict):
    """Partially update a variance reason (e.g. add approval)."""
    allowed = {"approved_by", "approval_date", "approval_document_url", "reason"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    set_clauses = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [variance_id]
    rows = db.query(
        f"UPDATE budget_variance_reasons SET {set_clauses} WHERE id = %s RETURNING *",
        tuple(values),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Variance reason not found")
    return rows[0]


# ── Project Milestones ──────────────────────────────────────────────────

@router.get("/projects/{project_id}/milestones")
async def get_milestones(project_id: int):
    """Return milestones for a project, ordered by due_date."""
    _get_project_or_404(project_id)
    return db.query(
        "SELECT * FROM project_milestones WHERE project_id = %s ORDER BY due_date ASC",
        (project_id,),
    )


@router.post("/projects/{project_id}/milestones")
async def create_milestone(project_id: int, payload: ValidatedMilestonePayload):
    """Create a new milestone for a project."""
    _get_project_or_404(project_id)

    rows = db.query(
        """INSERT INTO project_milestones
           (project_id, title, description, amount, status, due_date,
            completion_date, verified_by, payment_release_date, notes)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
           RETURNING *""",
        (project_id, payload.title, payload.description, payload.amount,
         payload.status, payload.due_date, payload.completion_date,
         payload.verified_by, payload.payment_release_date, payload.notes),
    )
    return rows[0]


@router.patch("/milestones/{milestone_id}")
async def update_milestone(milestone_id: int, payload: dict):
    """Update milestone fields (status, amount, dates, etc.)."""
    allowed = {
        "title", "description", "amount", "status",
        "due_date", "completion_date", "verified_by",
        "payment_release_date", "notes",
    }
    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    set_clauses = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [milestone_id]
    rows = db.query(
        f"UPDATE project_milestones SET {set_clauses} WHERE id = %s RETURNING *",
        tuple(values),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return rows[0]


# ── Contingency Reserves ───────────────────────────────────────────────

@router.get("/projects/{project_id}/contingency")
async def get_contingency(project_id: int):
    """Return contingency reserve for a project."""
    _get_project_or_404(project_id)
    rows = db.query(
        "SELECT * FROM contingency_reserves WHERE project_id = %s",
        (project_id,),
    )
    return rows[0] if rows else {}


@router.post("/projects/{project_id}/contingency")
async def upsert_contingency(project_id: int, payload: ValidatedContingencyPayload):
    """Create or update contingency reserve for a project."""
    _get_project_or_404(project_id)

    existing = db.query(
        "SELECT id FROM contingency_reserves WHERE project_id = %s",
        (project_id,),
    )

    if existing:
        rows = db.query(
            """UPDATE contingency_reserves SET
               allocated_amount = %s, utilized_amount = %s, status = %s,
               approval_required = %s, release_notes = %s
               WHERE project_id = %s RETURNING *""",
            (payload.allocated_amount, payload.utilized_amount, payload.status,
             payload.approval_required, payload.release_notes, project_id),
        )
    else:
        rows = db.query(
            """INSERT INTO contingency_reserves
               (project_id, allocated_amount, utilized_amount, status,
                approval_required, release_notes)
               VALUES (%s, %s, %s, %s, %s, %s)
               RETURNING *""",
            (project_id, payload.allocated_amount, payload.utilized_amount,
             payload.status, payload.approval_required, payload.release_notes),
        )
    return rows[0]


@router.post("/projects/{project_id}/contingency/release")
async def release_contingency(project_id: int, payload: dict):
    """Record a contingency utilization. Payload: {amount, approved_by, notes}."""
    _get_project_or_404(project_id)

    release_amount = payload.get("amount", 0)
    if release_amount <= 0:
        raise HTTPException(status_code=400, detail="Release amount must be positive")

    current = db.query(
        "SELECT id, allocated_amount, utilized_amount FROM contingency_reserves WHERE project_id = %s",
        (project_id,),
    )
    if not current:
        raise HTTPException(status_code=404, detail="No contingency reserve found for project")

    row = current[0]
    new_utilized = row["utilized_amount"] + release_amount
    if new_utilized > row["allocated_amount"]:
        raise HTTPException(
            status_code=400,
            detail=f"Release amount ({release_amount}) would exceed remaining "
                   f"contingency ({row['allocated_amount'] - row['utilized_amount']})",
        )

    new_status = "exhausted" if new_utilized >= row["allocated_amount"] else "partially_utilized"
    rows = db.query(
        """UPDATE contingency_reserves SET
           utilized_amount = %s, status = %s, release_notes = %s
           WHERE id = %s RETURNING *""",
        (new_utilized, new_status, payload.get("notes"), row["id"]),
    )
    return rows[0]


# ── Approval Trail ──────────────────────────────────────────────────────

@router.get("/approvals")
async def list_approvals(
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    entity_id: Optional[int] = Query(None, description="Filter by entity ID"),
    status: Optional[str] = Query(None, description="Filter by approval status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List approval records with optional filters."""
    conditions = []
    params: list = []

    if entity_type:
        conditions.append("entity_type = %s")
        params.append(entity_type)
    if entity_id is not None:
        conditions.append("entity_id = %s")
        params.append(entity_id)
    if status:
        conditions.append("status = %s")
        params.append(status)

    where = " AND ".join(conditions) if conditions else "TRUE"
    sql = f"""
    SELECT * FROM approval_trail
    WHERE {where}
    ORDER BY created_at DESC
    LIMIT %s OFFSET %s
    """
    params.extend([limit, offset])
    return db.query(sql, tuple(params))


@router.post("/approvals")
async def create_approval(payload: ValidatedApprovalPayload):
    """Create an approval record."""
    rows = db.query(
        """INSERT INTO approval_trail
           (entity_type, entity_id, action, requested_by, approved_by,
            approved_at, status, comments)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
           RETURNING *""",
        (payload.entity_type, payload.entity_id, payload.action,
         payload.requested_by, payload.approved_by, payload.approved_at,
         payload.status, payload.comments),
    )
    return rows[0]


@router.patch("/approvals/{approval_id}")
async def update_approval(approval_id: int, payload: dict):
    """Update approval status, approver, or comments."""
    allowed = {"approved_by", "approved_at", "status", "comments"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    set_clauses = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [approval_id]
    rows = db.query(
        f"UPDATE approval_trail SET {set_clauses} WHERE id = %s RETURNING *",
        tuple(values),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Approval record not found")
    return rows[0]


# ── Cost Per KM ─────────────────────────────────────────────────────────

@router.get("/projects/cost-per-km")
async def list_cost_per_km(
    road_id: Optional[int] = Query(None, description="Filter by road ID"),
    threshold: Optional[float] = Query(None, ge=1.0, description="Flag projects where spent_per_km exceeds avg by this multiplier"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """Return cost-per-km normalized data across all projects."""
    if road_id:
        rows = db.query(
            "SELECT * FROM cost_per_km_view WHERE road_id = %s ORDER BY spent_per_km DESC LIMIT %s OFFSET %s",
            (road_id, limit, offset),
        )
    else:
        rows = db.query(
            "SELECT * FROM cost_per_km_view ORDER BY spent_per_km DESC LIMIT %s OFFSET %s",
            (limit, offset),
        )

    if not threshold:
        return {"projects": rows, "anomalies": []}

    # Compute average and flag outliers
    all_rows = db.query("SELECT spent_per_km FROM cost_per_km_view WHERE spent_per_km IS NOT NULL")
    if all_rows:
        avg = sum(r["spent_per_km"] for r in all_rows) / len(all_rows)
        anomalies = [
            r for r in rows
            if r["spent_per_km"] and r["spent_per_km"] > avg * threshold
        ]
        for a in anomalies:
            a["flag_reason"] = (
                f"Spent ₹{a['spent_per_km']:,.2f}/km — "
                f"{threshold:.1f}x above average of ₹{avg:,.2f}/km"
            )
    else:
        anomalies = []

    return {"projects": rows, "average_per_km": round(avg, 2) if all_rows else 0, "anomalies": anomalies}


@router.get("/projects/cost-per-km/comparison")
async def compare_cost_per_km(
    threshold: float = Query(1.5, ge=1.0, description="Multiplier above average to flag"),
):
    """Return roads where cost-per-km exceeds average by threshold multiplier."""
    return await list_cost_per_km(threshold=threshold)