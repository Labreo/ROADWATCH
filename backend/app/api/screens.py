"""Read models and actions behind the 20 wireframe screens.

Public transparency data needs no sign-in. Operational screens and every action
check the caller's role; role-specific reads go through the views in
docs/schema_documented.sql under ``SET LOCAL ROLE``.
"""
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.auth import STAFF, require
from app.services.live_db import one, rows, tx

router = APIRouter(prefix="/screens", tags=["screens"])

# Liquidated damages accrued per overdue hour, used by the SLA screen.
LD_PER_OVERDUE_HOUR_INR = int(os.environ.get("LD_PER_OVERDUE_HOUR_INR", "4000"))
HEALTH_BY_STATUS = {"good": 88, "fair": 66, "under_construction": 58, "poor": 46}
OPEN_STATUSES = ("pending", "routed", "in_progress")


def health_score(status: str, open_complaints: int) -> int:
    return max(5, HEALTH_BY_STATUS.get(status, 60) - min(int(open_complaints or 0), 12))


# -------------------------------------------------------------------------
# Frames 01, 02: portal and road registry
# -------------------------------------------------------------------------
ROAD_SQL = """
SELECT r.id, r.name, r.road_code, r.status, r.road_type, r.length_km, r.surface_type, r.lane_count,
       r.width_m, r.aadt, r.last_relaying_date, r.authority_id, a.name AS authority, a.department_code,
       ct.name AS contractor, ct.contractor_code, ct.blacklisted AS contractor_blacklisted,
       ST_AsGeoJSON(r.geom)::json -> 'coordinates' AS coordinates,
       COUNT(c.id) FILTER (WHERE c.status IN ('pending','routed','in_progress')) AS open_complaints,
       COUNT(c.id) AS total_complaints
FROM roads r
LEFT JOIN authorities a ON a.id = r.authority_id
LEFT JOIN contractors ct ON ct.id = r.contractor_id
LEFT JOIN complaints c ON c.road_id = r.id
{where}
GROUP BY r.id, a.id, ct.id
ORDER BY COUNT(c.id) FILTER (WHERE c.status IN ('pending','routed','in_progress')) DESC, r.name
"""


def road_rows(where: str, params: tuple) -> list:
    data = rows(ROAD_SQL.format(where=where), params)
    for road in data:
        road["health_score"] = health_score(road["status"], road["open_complaints"])
    return data


@router.get("/overview")
def overview(region: str = "IN"):
    kpi = one(
        """
        SELECT
          (SELECT COUNT(*) FROM roads r JOIN authorities a ON a.id = r.authority_id WHERE a.region_code = %(r)s) AS roads,
          (SELECT COUNT(*) FROM authorities WHERE region_code = %(r)s) AS authorities,
          (SELECT COALESCE(SUM(p.budget_allocated), 0) FROM projects p JOIN authorities a ON a.id = p.authority_id
            WHERE a.region_code = %(r)s AND p.status <> 'cancelled') AS allocated,
          (SELECT COALESCE(SUM(p.budget_spent), 0) FROM projects p JOIN authorities a ON a.id = p.authority_id
            WHERE a.region_code = %(r)s AND p.status <> 'cancelled') AS spent,
          (SELECT COUNT(*) FROM complaints c JOIN authorities a ON a.id = c.assigned_authority_id WHERE a.region_code = %(r)s) AS complaints,
          (SELECT COUNT(*) FROM complaints c JOIN authorities a ON a.id = c.assigned_authority_id
            WHERE a.region_code = %(r)s AND c.status IN ('pending','routed','in_progress')) AS open_complaints,
          (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE c.sla_breached_at IS NULL) / NULLIF(COUNT(*), 0), 1)
             FROM complaints c JOIN authorities a ON a.id = c.assigned_authority_id WHERE a.region_code = %(r)s) AS sla_compliance
        """.replace("%(r)s", "%s"),
        (region,) * 7,
    )
    roads = road_rows("WHERE a.region_code = %s", (region,))
    return {"kpi": kpi, "corridors": roads[:6], "roads": roads}


@router.get("/roads")
def road_list(region: str = "IN", major: bool = False):
    """``major`` leaves out the ward streets, which would crowd the city map."""
    extra = " AND r.road_code NOT LIKE 'WARD-%%'" if major else ""
    return road_rows("WHERE a.region_code = %s" + extra, (region,))


@router.get("/roads/{road_id}")
def road_detail(road_id: int):
    found = road_rows("WHERE r.id = %s", (road_id,))
    if not found:
        raise HTTPException(status_code=404, detail="Road not found")
    return {
        **found[0],
        "projects": rows(
            """SELECT p.id, p.title, p.status, p.budget_allocated, p.budget_spent, p.delay_days, c.name AS contractor,
                      w.warranty_end_date, w.status AS warranty_status
               FROM projects p JOIN contractors c ON c.id = p.contractor_id
               LEFT JOIN project_warranties w ON w.project_id = p.id
               WHERE p.road_id = %s ORDER BY p.start_date DESC""", (road_id,)),
        "complaints": rows(
            """SELECT id, title, category, status, priority, escalation_level, created_at
               FROM complaints WHERE road_id = %s ORDER BY created_at DESC LIMIT 20""", (road_id,)),
    }


@router.get("/complaints")
def complaint_list(region: str = "IN"):
    return rows(
        """SELECT c.id, c.client_temp_id, c.title, c.description, c.category, c.status, c.priority, c.escalation_level,
                  c.created_at, c.assigned_authority_id, c.road_id, c.image_url, c.target_resolution_hours,
                  c.sla_breached_at, c.last_escalated_at, r.name AS road_name,
                  ST_AsGeoJSON(c.geom)::json -> 'coordinates' AS coordinates
           FROM complaints c LEFT JOIN authorities a ON a.id = c.assigned_authority_id
           LEFT JOIN roads r ON r.id = c.road_id
           WHERE a.region_code = %s OR a.region_code IS NULL
           ORDER BY (c.status IN ('resolved', 'rejected')), c.created_at DESC LIMIT 300""", (region,))


# -------------------------------------------------------------------------
# Frame 06: citizen reports
# -------------------------------------------------------------------------
@router.get("/me/reports")
def my_reports(user: dict = Depends(require("citizen"))):
    citizen_id = user["citizen_id"]
    citizen = one("SELECT * FROM citizen_complaint_totals WHERE citizen_id = %s", (citizen_id,), role="citizen")
    reports = rows(
        """SELECT id, title, category, status, priority, escalation_level, created_at, assigned_authority AS authority,
                  road_name, target_resolution_hours,
                  ROUND((target_resolution_hours - EXTRACT(EPOCH FROM NOW() - created_at) / 3600)::numeric, 1) AS hours_left
           FROM v_citizen_complaints WHERE citizen_id = %s ORDER BY created_at DESC LIMIT 50""",
        (citizen_id,), role="citizen")
    ids = [report["id"] for report in reports]
    history = rows(
        "SELECT complaint_id, history_seq, old_status, new_status, changed_at, remarks FROM v_citizen_status_history "
        "WHERE citizen_id = %s AND complaint_id = ANY(%s) ORDER BY complaint_id, history_seq",
        (citizen_id, ids), role="citizen") if ids else []
    for report in reports:
        report["history"] = [h for h in history if h["complaint_id"] == report["id"]]
    return {"citizen": citizen, "reports": reports}


@router.delete("/me/reports/{complaint_id}")
def withdraw_report(complaint_id: int, user: dict = Depends(require("citizen"))):
    """A citizen withdraws their own report before work starts. The audit trigger records the deletion."""
    with tx(user["email"], "Withdrawn by citizen") as cur:
        cur.execute(
            """DELETE FROM complaints
               WHERE id = %s AND citizen_id = %s AND status IN ('pending', 'routed')
               RETURNING id""",
            (complaint_id, user["citizen_id"]),
        )
        if cur.fetchone():
            return {"withdrawn": complaint_id}
        cur.execute("SELECT status FROM complaints WHERE id = %s AND citizen_id = %s", (complaint_id, user["citizen_id"]))
        found = cur.fetchone()
    if not found:
        raise HTTPException(status_code=404, detail="Report not found")
    raise HTTPException(status_code=409, detail=f"This report is already {found['status'].replace('_', ' ')} and can no longer be withdrawn.")


# -------------------------------------------------------------------------
# Frames 11 to 15: operations
# -------------------------------------------------------------------------
@router.get("/operations")
def operations(region: str = "IN", user: dict = Depends(require(*STAFF))):
    kpi = one(
        """SELECT COUNT(*) FILTER (WHERE c.status IN ('pending','routed','in_progress')) AS open_queue,
                  COUNT(*) FILTER (WHERE c.status = 'routed') AS routed,
                  COUNT(*) FILTER (WHERE c.status = 'in_progress') AS in_progress,
                  COUNT(*) FILTER (WHERE c.escalation_level > 0 AND c.status IN ('pending','routed','in_progress')) AS escalated,
                  COUNT(*) FILTER (WHERE c.priority >= 4 AND c.status IN ('pending','routed','in_progress')
                                   AND NOW() - c.created_at > make_interval(hours => c.target_resolution_hours)) AS critical_overdue,
                  (SELECT ROUND(AVG(EXTRACT(EPOCH FROM h.changed_at - x.created_at) / 3600)::numeric, 1)
                   FROM status_history h JOIN complaints x ON x.id = h.complaint_id
                   JOIN authorities y ON y.id = x.assigned_authority_id
                   WHERE h.new_status = 'resolved' AND h.history_seq > 1 AND y.region_code = %s) AS mean_repair_hours
           FROM complaints c JOIN authorities a ON a.id = c.assigned_authority_id WHERE a.region_code = %s""",
        (region, region))
    delivery = one(
        """SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'sent') AS sent FROM notification_log""")
    if user["role"] == "engineer":
        queue = rows(
            """SELECT id, title, category, status, priority, escalation_level, authority, road_code, road_name, hours_left
               FROM v_engineer_queue WHERE assigned_authority_id = %s
               ORDER BY escalation_level DESC, priority DESC, created_at LIMIT 40""",
            (user["authority_id"],), role="engineer")
    else:
        queue = rows(
        """SELECT c.id, c.title, c.category, c.status, c.priority, c.escalation_level, a.department_code AS authority,
                  r.road_code, r.name AS road_name,
                  ROUND((c.target_resolution_hours - EXTRACT(EPOCH FROM NOW() - c.created_at) / 3600)::numeric, 1) AS hours_left
           FROM complaints c JOIN authorities a ON a.id = c.assigned_authority_id
           LEFT JOIN roads r ON r.id = c.road_id WHERE a.region_code = %s
           ORDER BY (c.status IN ('resolved','rejected')), c.escalation_level DESC, c.priority DESC, c.created_at
           LIMIT 40""", (region,))
    hooks = rows(
        """SELECT a.department_code AS authority, w.webhook_url, w.is_active,
                  (SELECT l.status FROM notification_log l WHERE l.authority_id = a.id ORDER BY l.id DESC LIMIT 1) AS last_status,
                  (SELECT l.response_code FROM notification_log l WHERE l.authority_id = a.id ORDER BY l.id DESC LIMIT 1) AS last_code
           FROM authority_webhooks w JOIN authorities a ON a.id = w.authority_id ORDER BY a.id LIMIT 8""")
    log = rows("SELECT id, table_name, record_id, action, changed_by, changed_at FROM audit_log ORDER BY id DESC LIMIT 14")
    jurisdictions = rows(
        "SELECT authority_id, name, roads, projects, budget_allocated, open_complaints "
        "FROM v_admin_jurisdiction_summary WHERE region_code = %s ORDER BY open_complaints DESC",
        (region,), role="admin") if user["role"] == "admin" else []
    return {"kpi": kpi, "delivery": delivery, "queue": queue, "webhooks": hooks, "log": log, "jurisdictions": jurisdictions}


def own_ward_only(cur, user: dict, table: str, record_id: int) -> None:
    """Engineers act only inside their own ward or department; admins act anywhere."""
    if user["role"] != "engineer":
        return
    column = "assigned_authority_id" if table == "complaints" else "authority_id"
    cur.execute(f"SELECT {column} AS authority_id FROM {table} WHERE id = %s", (record_id,))
    found = cur.fetchone()
    if found and found["authority_id"] != user["authority_id"]:
        raise HTTPException(status_code=403, detail="This belongs to another ward. Only that ward's engineer or an administrator can change it.")


class Transition(BaseModel):
    status: str
    remarks: str = Field(default="", max_length=500)


@router.post("/complaints/{complaint_id}/transition")
def transition(complaint_id: int, body: Transition, user: dict = Depends(require("engineer", "admin"))):
    with tx(user["email"], body.remarks) as cur:
        own_ward_only(cur, user, "complaints", complaint_id)
        cur.execute("UPDATE complaints SET status = %s WHERE id = %s RETURNING id, status",
                    (body.status, complaint_id))
        updated = cur.fetchone()
    if not updated:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return dict(updated)


@router.post("/complaints/{complaint_id}/escalate")
def escalate(complaint_id: int, user: dict = Depends(require("engineer", "admin"))):
    with tx(user["email"]) as cur:
        own_ward_only(cur, user, "complaints", complaint_id)
        cur.execute("SELECT escalation_level FROM complaints WHERE id = %s FOR UPDATE", (complaint_id,))
        current = cur.fetchone()
        if not current:
            raise HTTPException(status_code=404, detail="Complaint not found")
        level = current["escalation_level"]
        if level >= 2:
            raise HTTPException(status_code=409, detail="Complaint is already at the highest escalation level")
        cur.execute(
            "UPDATE complaints SET escalation_level = %s, last_escalated_at = NOW(), "
            "sla_breached_at = COALESCE(sla_breached_at, NOW()) WHERE id = %s", (level + 1, complaint_id))
        cur.execute(
            "INSERT INTO sla_escalations (complaint_id, from_level, to_level, escalated_by) VALUES (%s, %s, %s, %s)",
            (complaint_id, level, level + 1, user["email"]))
    return {"id": complaint_id, "escalation_level": level + 1}


@router.post("/webhook-sink/{authority_code}")
async def webhook_sink(authority_code: str):
    """Local stand-in for an authority's webhook endpoint, used by the sample data."""
    return {"received": True, "authority": authority_code}


@router.get("/sla")
def sla(region: str = "IN", user: dict = Depends(require(*STAFF))):
    breaches = rows(
        """SELECT c.id, c.title, c.category, c.escalation_level, c.priority, a.department_code AS authority,
                  r.name AS road_name, ct.name AS contractor,
                  ROUND((EXTRACT(EPOCH FROM NOW() - c.created_at) / 3600 - c.target_resolution_hours)::numeric, 1) AS hours_overdue
           FROM complaints c JOIN authorities a ON a.id = c.assigned_authority_id
           LEFT JOIN roads r ON r.id = c.road_id LEFT JOIN contractors ct ON ct.id = r.contractor_id
           WHERE a.region_code = %s AND c.status IN ('pending','routed','in_progress')
             AND NOW() - c.created_at > make_interval(hours => c.target_resolution_hours)
           ORDER BY c.escalation_level DESC, hours_overdue DESC LIMIT 12""", (region,))
    for breach in breaches:
        breach["damages_inr"] = round(float(breach["hours_overdue"]) * LD_PER_OVERDUE_HOUR_INR)
    return {
        "config": rows(
            """SELECT s.id, COALESCE(s.category, 'default') AS category, s.escalation_hours, s.escalation_level,
                      a.department_code AS escalate_to
               FROM sla_config s LEFT JOIN authorities a ON a.id = s.escalate_to_authority_id
               WHERE s.region_code = %s OR s.region_code IS NULL ORDER BY s.category, s.escalation_level""", (region,)),
        "levels": rows(
            """SELECT c.escalation_level AS level, COUNT(*) AS open
               FROM complaints c JOIN authorities a ON a.id = c.assigned_authority_id
               WHERE a.region_code = %s AND c.status IN ('pending','routed','in_progress') GROUP BY 1 ORDER BY 1""", (region,)),
        "breaches": breaches,
        "ld_rate_per_hour_inr": LD_PER_OVERDUE_HOUR_INR,
        "history": rows(
            "SELECT id, complaint_id, title, from_level, to_level, notified_at, escalated_to "
            "FROM v_auditor_sla_breaches ORDER BY id DESC LIMIT 10", role="auditor"),
    }


@router.post("/sla/run")
def run_sla(user: dict = Depends(require("admin"))):
    with tx(user["email"]) as cur:
        cur.execute("SELECT escalate_overdue_complaints() AS escalated")
        return dict(cur.fetchone())


@router.get("/conflicts")
def conflicts(user: dict = Depends(require(*STAFF))):
    return {
        "roads": rows(
            """SELECT g.id, g.conflict_key, g.resolved, g.resolved_by, r.name AS primary_road, r.road_code,
                      (SELECT COUNT(*) FROM roads x WHERE x.conflict_group_id = g.id) AS members
               FROM road_conflict_groups g LEFT JOIN roads r ON r.id = g.primary_road_id ORDER BY g.resolved, g.id"""),
        "authorities": rows(
            """SELECT g.id, g.conflict_key, g.resolved, g.resolved_by, a.name AS primary_authority
               FROM authority_conflict_groups g LEFT JOIN authorities a ON a.id = g.primary_authority_id
               ORDER BY g.resolved, g.id"""),
        "overlaps": rows(
            """SELECT x.id AS authority_a_id, x.name AS authority_a, y.id AS authority_b_id, y.name AS authority_b,
                      ROUND((ST_Area(ST_Intersection(x.geom_boundary, y.geom_boundary)::geography) / 1e6)::numeric, 2) AS overlap_km2
               FROM authorities x JOIN authorities y ON x.id < y.id AND x.region_code = y.region_code
               WHERE x.region_code = 'IN' AND ST_Overlaps(x.geom_boundary, y.geom_boundary)
               ORDER BY overlap_km2 LIMIT 6"""),
        "aliases": rows(
            """SELECT a.alias_name, a.alias_type, r.road_code FROM road_aliases a
               JOIN roads r ON r.id = a.road_id ORDER BY a.id LIMIT 8"""),
        "boundaries": rows(
            """SELECT a.id, a.name, a.department_code, ST_AsGeoJSON(a.geom_boundary)::json -> 'coordinates' AS coordinates
               FROM authorities a WHERE a.region_code = 'IN' AND a.geom_boundary IS NOT NULL ORDER BY ST_Area(a.geom_boundary)"""),
    }


@router.post("/conflicts/{kind}/{group_id}/resolve")
def resolve_conflict(kind: str, group_id: int, user: dict = Depends(require("admin"))):
    tables = {"road": "road_conflict_groups", "authority": "authority_conflict_groups"}
    if kind not in tables:
        raise HTTPException(status_code=404, detail="Unknown conflict type")
    with tx(user["email"]) as cur:
        cur.execute(
            f"UPDATE {tables[kind]} SET resolved = TRUE, resolved_at = NOW(), resolved_by = %s "
            "WHERE id = %s AND NOT resolved RETURNING id", (user["email"], group_id))
        if not cur.fetchone():
            raise HTTPException(status_code=409, detail="Conflict group is already resolved or does not exist")
    return {"id": group_id, "resolved": True}


@router.get("/projects")
def projects(region: str = "IN", user: dict = Depends(require(*STAFF))):
    data = rows(
        """SELECT p.id, p.title, p.status, p.start_date, p.target_end_date, p.budget_allocated, p.budget_spent,
                  p.delay_days, c.name AS contractor, r.name AS road_name
           FROM projects p JOIN contractors c ON c.id = p.contractor_id JOIN roads r ON r.id = p.road_id
           JOIN authorities a ON a.id = p.authority_id WHERE a.region_code = %s ORDER BY p.start_date DESC""", (region,))
    for project in data:
        project["milestones"] = rows(
            """SELECT milestone_num, title, amount, status, due_date, completion_date, verified_by, payment_release_date
               FROM project_milestones WHERE project_id = %s ORDER BY milestone_num""", (project["id"],))
        tests = rows(
            """SELECT milestone_num, test_name, measured, unit, spec_min, spec_max, passed, tested_on
               FROM milestone_tests WHERE project_id = %s ORDER BY id""", (project["id"],))
        for milestone in project["milestones"]:
            milestone["tests"] = [t for t in tests if t["milestone_num"] == milestone["milestone_num"]]
    return data


class MilestoneVerify(BaseModel):
    verified_by: str = Field(min_length=2, max_length=120)


@router.post("/projects/{project_id}/milestones/{milestone_num}/verify")
def verify_milestone(project_id: int, milestone_num: int, body: MilestoneVerify, user: dict = Depends(require("engineer", "admin"))):
    with tx(user["email"]) as cur:
        own_ward_only(cur, user, "projects", project_id)
        cur.execute(
            """UPDATE project_milestones SET status = 'completed', completion_date = COALESCE(completion_date, CURRENT_DATE),
                      verified_by = %s WHERE project_id = %s AND milestone_num = %s RETURNING milestone_num, status""",
            (body.verified_by, project_id, milestone_num))
        updated = cur.fetchone()
    if not updated:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return dict(updated)


@router.post("/projects/{project_id}/milestones/{milestone_num}/release-payment")
def release_payment(project_id: int, milestone_num: int, user: dict = Depends(require("admin"))):
    with tx(user["email"]) as cur:
        cur.execute(
            """UPDATE project_milestones SET payment_release_date = CURRENT_DATE
               WHERE project_id = %s AND milestone_num = %s AND status = 'completed'
                 AND verified_by IS NOT NULL AND payment_release_date IS NULL RETURNING amount""",
            (project_id, milestone_num))
        paid = cur.fetchone()
        if not paid:
            raise HTTPException(status_code=409, detail="Payment needs a verified, unpaid milestone")
        cur.execute("UPDATE projects SET budget_spent = budget_spent + %s WHERE id = %s", (paid["amount"], project_id))
    return {"released": paid["amount"]}


@router.get("/regions")
def regions():
    data = rows(
        """SELECT g.code, g.name, g.default_currency, g.locale, g.timezone,
                  (SELECT COUNT(*) FROM authorities a WHERE a.region_code = g.code) AS authorities,
                  (SELECT COUNT(*) FROM roads r JOIN authorities a ON a.id = r.authority_id WHERE a.region_code = g.code) AS roads
           FROM regions g ORDER BY g.code = 'IN' DESC, g.code""")
    return {
        "regions": data,
        "imports": rows("SELECT * FROM region_import_log ORDER BY finished_at DESC NULLS LAST, id DESC LIMIT 10"),
        "cpi": rows("SELECT region_code, year, cpi_value FROM cpi_data ORDER BY region_code, year DESC"),
    }


# -------------------------------------------------------------------------
# Frames 16 to 20: transparency ledger
# -------------------------------------------------------------------------
@router.get("/ledger/spend")
def ledger_spend(region: str = "IN"):
    return {
        "flows": rows(
            """SELECT f.source_name, a.department_code AS authority, c.name AS contractor, SUM(f.amount) AS amount
               FROM fund_sources f JOIN projects p ON p.id = f.project_id
               JOIN authorities a ON a.id = p.authority_id JOIN contractors c ON c.id = p.contractor_id
               WHERE a.region_code = %s GROUP BY 1, 2, 3 ORDER BY amount DESC""", (region,)),
        "cost_per_km": rows(
            """SELECT v.project_id, v.title, v.road_name, v.length_km, v.allocated_per_km, v.spent_per_km, v.overrun_per_km,
                      r.road_code, r.road_type,
                      ROUND(100 * (v.spent_per_km - v.allocated_per_km) / NULLIF(v.allocated_per_km, 0), 1) AS variance_pct
               FROM cost_per_km_view v JOIN roads r ON r.id = v.road_id JOIN authorities a ON a.id = r.authority_id
               WHERE a.region_code = %s ORDER BY variance_pct DESC NULLS LAST LIMIT 8""", (region,)),
        "beneficiaries": one(
            """SELECT COALESCE(SUM(b.population_served), 0) AS population, COALESCE(SUM(b.estimated_daily_traffic), 0) AS daily_traffic,
                      COALESCE(SUM(b.household_count), 0) AS households
               FROM project_beneficiaries b JOIN projects p ON p.id = b.project_id
               JOIN authorities a ON a.id = p.authority_id WHERE a.region_code = %s""", (region,)),
    }


@router.get("/ledger/variance")
def ledger_variance(region: str = "IN"):
    variances = rows(
        """SELECT v.id, v.project_id, p.title AS project, v.original_budget, v.revised_budget, v.variance_amount,
                  v.variance_pct, v.reason, v.approved_by, v.approval_date
           FROM budget_variance_reasons v JOIN projects p ON p.id = v.project_id
           JOIN authorities a ON a.id = p.authority_id WHERE a.region_code = %s ORDER BY ABS(v.variance_amount) DESC""", (region,))
    totals = one(
        """SELECT COALESCE(SUM(p.budget_allocated), 0) AS allocated, COALESCE(SUM(p.budget_spent), 0) AS spent
           FROM projects p JOIN authorities a ON a.id = p.authority_id WHERE a.region_code = %s""", (region,))
    reserve = one(
        """SELECT COALESCE(SUM(r.allocated_amount), 0) AS allocated, COALESCE(SUM(r.utilized_amount), 0) AS utilized
           FROM contingency_reserves r JOIN projects p ON p.id = r.project_id
           JOIN authorities a ON a.id = p.authority_id WHERE a.region_code = %s""", (region,))
    trail = rows(
        """SELECT id, entity_type, entity_id, action, requested_by, approved_by, approved_at, status, comments
           FROM approval_trail ORDER BY id DESC LIMIT 10""")
    return {"variances": variances, "totals": totals, "reserve": reserve, "trail": trail}


@router.get("/contractors")
def contractors(region: str = "IN"):
    return rows(
        """SELECT c.id, c.contractor_code, c.name, c.rating, c.projects_completed, c.projects_delayed,
                  c.performance_index, c.blacklisted, c.blacklisted_reason, c.license_number,
                  COUNT(p.id) AS active_contracts, COALESCE(SUM(p.budget_allocated), 0) AS contract_value,
                  COALESCE(SUM(p.delay_days), 0) AS delay_days,
                  COALESCE((SELECT SUM(w.claim_count) FROM project_warranties w JOIN projects q ON q.id = w.project_id
                            WHERE q.contractor_id = c.id), 0) AS warranty_claims
           FROM contractors c LEFT JOIN projects p ON p.contractor_id = c.id
           WHERE c.license_number LIKE %s GROUP BY c.id ORDER BY c.performance_index DESC""",
        (f"LIC-{region}-%",))


class BlacklistChange(BaseModel):
    blacklisted: bool
    reason: str = Field(default="", max_length=500)


@router.post("/contractors/{contractor_id}/blacklist")
def set_blacklist(contractor_id: int, body: BlacklistChange, user: dict = Depends(require("admin"))):
    if body.blacklisted and not body.reason.strip():
        raise HTTPException(status_code=422, detail="A debarment reason is required")
    with tx(user["email"]) as cur:
        cur.execute(
            "UPDATE contractors SET blacklisted = %s, blacklisted_reason = %s WHERE id = %s RETURNING id, blacklisted",
            (body.blacklisted, body.reason.strip() or None, contractor_id))
        updated = cur.fetchone()
    if not updated:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return dict(updated)


@router.get("/tenders")
def tenders(region: str = "IN"):
    data = rows(
        """SELECT t.id, t.reference_no, t.title, t.estimated_value, t.status, t.published_date, t.bid_deadline,
                  a.department_code AS authority
           FROM tenders t JOIN authorities a ON a.id = t.authority_id WHERE a.region_code = %s ORDER BY t.id DESC""", (region,))
    for tender in data:
        tender["bids"] = rows(
            """SELECT b.contractor_id, c.name, c.contractor_code, c.blacklisted, b.financial_quote, b.technical_score,
                      b.financial_score, b.weighted_total, b.is_winner, b.evaluator_notes
               FROM tender_bids b JOIN contractors c ON c.id = b.contractor_id
               WHERE b.tender_id = %s ORDER BY b.weighted_total DESC NULLS LAST""", (tender["id"],))
        tender["criteria"] = rows(
            "SELECT criterion_name, weight_pct, max_score FROM evaluation_criteria WHERE tender_id = %s ORDER BY id",
            (tender["id"],))
    return data


class BidIn(BaseModel):
    contractor_id: int
    financial_quote: float = Field(gt=0)
    technical_score: float = Field(ge=0, le=100)


@router.post("/tenders/{tender_id}/bids")
def submit_bid(tender_id: int, body: BidIn, user: dict = Depends(require("admin"))):
    with tx(user["email"]) as cur:
        cur.execute(
            """INSERT INTO tender_bids (tender_id, contractor_id, financial_quote, technical_score)
               VALUES (%s, %s, %s, %s) RETURNING id""",
            (tender_id, body.contractor_id, body.financial_quote, body.technical_score))
        created = cur.fetchone()
    return dict(created)


@router.post("/tenders/{tender_id}/award/{contractor_id}")
def award_tender(tender_id: int, contractor_id: int, user: dict = Depends(require("admin"))):
    with tx(user["email"]) as cur:
        cur.execute("SELECT blacklisted FROM contractors WHERE id = %s", (contractor_id,))
        firm = cur.fetchone()
        if not firm:
            raise HTTPException(status_code=404, detail="Contractor not found")
        if firm["blacklisted"]:
            raise HTTPException(status_code=409, detail="A blacklisted contractor cannot be awarded a tender")
        cur.execute("UPDATE tender_bids SET is_winner = FALSE WHERE tender_id = %s AND is_winner", (tender_id,))
        cur.execute("UPDATE tender_bids SET is_winner = TRUE WHERE tender_id = %s AND contractor_id = %s RETURNING id",
                    (tender_id, contractor_id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="This contractor has no bid on the tender")
        cur.execute("UPDATE tenders SET status = 'awarded', award_date = CURRENT_DATE WHERE id = %s", (tender_id,))
    return {"tender_id": tender_id, "winner": contractor_id}


@router.get("/audit")
def audit(
    action: Optional[str] = Query(default=None, pattern="^(INSERT|UPDATE|DELETE)$"),
    limit: int = Query(default=40, le=200),
    user: dict = Depends(require("admin", "auditor")),
):
    where, params = ("WHERE action = %s", (action,)) if action else ("", ())
    return {
        "total": one("SELECT COUNT(*) AS n FROM audit_log", role="auditor")["n"],
        "events": rows(
            f"""SELECT id, table_name, record_id, action, old_values, new_values, changed_by, changed_at
                FROM audit_log {where} ORDER BY id DESC LIMIT %s""", (*params, limit), role="auditor"),
    }


# -------------------------------------------------------------------------
# Frames 08 to 10: twin, sensors, playback
# -------------------------------------------------------------------------
@router.get("/sensors")
def sensors(user: dict = Depends(require(*STAFF))):
    data = rows(
        """SELECT s.id, s.sensor_code, s.sensor_type, s.chainage_km, s.depth_mm, s.unit, s.alert_threshold,
                  s.battery_pct, s.last_calibrated, r.road_code,
                  (SELECT reading FROM sensor_readings x WHERE x.sensor_id = s.id ORDER BY recorded_at DESC LIMIT 1) AS latest,
                  (SELECT MAX(reading) FROM sensor_readings x WHERE x.sensor_id = s.id) AS peak
           FROM iot_sensors s JOIN roads r ON r.id = s.road_id ORDER BY s.sensor_code""")
    for sensor in data:
        sensor["series"] = rows(
            """SELECT recorded_at, reading FROM sensor_readings WHERE sensor_id = %s
               AND recorded_at > NOW() - INTERVAL '24 hours' ORDER BY recorded_at""", (sensor["id"],))
    return data


@router.get("/playback/{road_id}")
def playback(road_id: int, user: dict = Depends(require(*STAFF))):
    road = one("SELECT id, name, road_code, status FROM roads WHERE id = %s", (road_id,))
    if not road:
        raise HTTPException(status_code=404, detail="Road not found")
    history = rows(
        """SELECT snapshot_date, status_at_time, complaint_count, project_count, avg_depth_cm, source
           FROM road_defect_history WHERE road_id = %s ORDER BY snapshot_date""", (road_id,))
    for point in history:
        point["health_score"] = health_score(point["status_at_time"], point["complaint_count"])
    return {"road": road, "history": history}


@router.get("/twin/{road_id}")
def twin(road_id: int, user: dict = Depends(require(*STAFF))):
    found = road_rows("WHERE r.id = %s", (road_id,))
    if not found:
        raise HTTPException(status_code=404, detail="Road not found")
    return {
        **found[0],
        "project": one(
            """SELECT p.id, p.title, p.status, p.budget_allocated, p.budget_spent
               FROM projects p WHERE p.road_id = %s ORDER BY p.start_date DESC LIMIT 1""", (road_id,)),
        "contractor_detail": one(
            """SELECT c.name, c.contractor_code, c.rating, c.projects_completed, c.projects_delayed, c.blacklisted
               FROM contractors c WHERE c.id = COALESCE(
                 (SELECT p.contractor_id FROM projects p WHERE p.road_id = %s ORDER BY p.start_date DESC LIMIT 1),
                 (SELECT r.contractor_id FROM roads r WHERE r.id = %s))""", (road_id, road_id)),
        "defects": rows(
            """SELECT id, title, category, priority, status FROM complaints
               WHERE road_id = %s AND status IN ('pending', 'routed', 'in_progress')
               ORDER BY priority DESC, created_at DESC LIMIT 6""", (road_id,)),
        "sensors": rows(
            """SELECT s.sensor_code, s.sensor_type, s.unit, s.alert_threshold,
                      (SELECT reading FROM sensor_readings x WHERE x.sensor_id = s.id ORDER BY recorded_at DESC LIMIT 1) AS latest
               FROM iot_sensors s WHERE s.road_id = %s ORDER BY s.sensor_code""", (road_id,)),
        "materials": rows(
            """SELECT m.material_type, m.specification_grade, m.source_quarry, m.test_date, m.approved_by
               FROM road_materials m JOIN projects p ON p.id = m.project_id WHERE p.road_id = %s""", (road_id,)),
        "warranties": rows(
            """SELECT w.warranty_type, w.warranty_end_date, w.status, w.claim_count, c.name AS contractor
               FROM project_warranties w JOIN projects p ON p.id = w.project_id
               JOIN contractors c ON c.id = p.contractor_id WHERE p.road_id = %s""", (road_id,)),
    }


# -------------------------------------------------------------------------
# Reference data the older map, wizard and chat panels read: authorities with
# their boundaries, contractors and projects, all straight from PostgreSQL.
# -------------------------------------------------------------------------
@router.get("/reference")
def reference(region: str = "IN"):
    authorities = rows(
        """SELECT a.id, a.name, a.department_code, a.contact_email, a.contact_phone, a.region_code, a.conflict_group_id,
                  ST_AsGeoJSON(a.geom_boundary)::json AS boundary,
                  (SELECT u.display_name FROM app_users u WHERE u.role = 'engineer' AND u.authority_id = a.id
                   ORDER BY u.id LIMIT 1) AS engineer
           FROM authorities a WHERE a.region_code = %s ORDER BY a.id""", (region,))
    contractors = rows(
        """SELECT id, name, license_number, registration_date, contact_email, contact_phone, rating,
                  projects_completed, projects_delayed, blacklisted, blacklisted_reason
           FROM contractors ORDER BY id""")
    projects = rows(
        """SELECT p.id, p.title, p.road_id, p.contractor_id, p.authority_id, p.budget_allocated, p.budget_spent,
                  p.status, p.start_date, p.target_end_date, p.actual_end_date, p.delay_days,
                  COALESCE((SELECT json_agg(json_build_object('sourceName', f.source_name, 'amount', f.amount)
                                         ORDER BY f.amount DESC)
                            FROM fund_sources f WHERE f.project_id = p.id), '[]'::json) AS fund_sources
           FROM projects p JOIN authorities a ON a.id = p.authority_id
           WHERE a.region_code = %s ORDER BY p.id""", (region,))
    return {"authorities": authorities, "contractors": contractors, "projects": projects}


@router.get("/complaints/{complaint_id}/history")
def complaint_history(complaint_id: int):
    """Public status trail of one report (no citizen details), for the timeline."""
    return rows(
        """SELECT history_seq, old_status, new_status, changed_at
           FROM status_history WHERE complaint_id = %s ORDER BY history_seq""", (complaint_id,))
