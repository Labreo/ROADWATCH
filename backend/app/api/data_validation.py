"""Data validation endpoint for ROADWATCH.

GET /api/v1/data/validate — returns a comprehensive validation report covering
referential integrity, spatial consistency, date sanity, budget consistency,
and complaint routing across all core tables.
"""

from fastapi import APIRouter

from app.services.database import db
from app.services.data_quality import score_road, score_all_roads, get_summary_stats

router = APIRouter()


def _fail(table: str, column: str, record_id: int, reason: str) -> dict:
    return {
        "table": table,
        "column": column,
        "record_id": record_id,
        "reason": reason,
    }


def _check_group(name: str, checks: list[dict]) -> dict:
    """Package a group of checks into the standard result shape."""
    failures = [c for c in checks if c is not None]
    return {
        "passed": len(checks) - len(failures),
        "failed": len(failures),
        "total": len(checks),
        "failures": failures,
    }


# ---------------------------------------------------------------------------
# 1. REFERENTIAL INTEGRITY
# ---------------------------------------------------------------------------

def _check_referential_integrity() -> dict:
    """Verify every foreign key value points to an existing row."""
    failures: list[dict] = []

    # Helper: find rows whose FK column references a non-existent PK
    def orphans(table: str, fk_col: str, ref_table: str, ref_pk: str = "id"):
        rows = db.query(
            f"SELECT id, {fk_col} FROM {table} WHERE {fk_col} IS NOT NULL"
        )
        if not rows:
            return
        ids = {r["id"] for r in rows}
        fk_vals = {r[fk_col] for r in rows}
        if not fk_vals:
            return
        placeholders = ",".join("%s" for _ in fk_vals)
        existing = db.query(
            f"SELECT {ref_pk} FROM {ref_table} WHERE {ref_pk} IN ({placeholders})",
            tuple(fk_vals),
        )
        existing_set = {r[ref_pk] for r in existing}
        for r in rows:
            if r[fk_col] not in existing_set:
                failures.append(
                    _fail(
                        table,
                        fk_col,
                        r["id"],
                        f"{fk_col}={r[fk_col]} references non-existent {ref_table}.{ref_pk}",
                    )
                )

    # --- Direct FK checks ---
    orphans("roads", "authority_id", "authorities")
    orphans("roads", "contractor_id", "contractors")
    orphans("projects", "road_id", "roads")
    orphans("projects", "contractor_id", "contractors")
    orphans("projects", "authority_id", "authorities")
    orphans("complaints", "assigned_authority_id", "authorities")
    orphans("complaints", "road_id", "roads")
    orphans("sla_config", "escalate_to_authority_id", "authorities")
    orphans("sla_escalations", "complaint_id", "complaints")
    orphans("sla_escalations", "escalated_to_authority_id", "authorities")
    orphans("authority_webhooks", "authority_id", "authorities")
    orphans("notification_log", "complaint_id", "complaints")
    orphans("notification_log", "authority_id", "authorities")
    orphans("road_region_crossings", "road_id", "roads")
    orphans("road_region_crossings", "authority_id", "authorities")
    orphans("region_overlap_routes", "complaint_id", "complaints")
    orphans("road_defect_history", "road_id", "roads")
    orphans("fund_sources", "project_id", "projects")
    orphans("budget_variance_reasons", "project_id", "projects")
    orphans("project_milestones", "project_id", "projects")
    orphans("contingency_reserves", "project_id", "projects")

    # --- Region code FK ---
    rows = db.query(
        "SELECT id, region_code FROM authorities WHERE region_code IS NOT NULL"
    )
    if rows:
        codes = {r["region_code"] for r in rows}
        placeholders = ",".join("%s" for _ in codes)
        existing = db.query(
            f"SELECT code FROM regions WHERE code IN ({placeholders})",
            tuple(codes),
        )
        existing_set = {r["code"] for r in existing}
        for r in rows:
            if r["region_code"] not in existing_set:
                failures.append(
                    _fail(
                        "authorities",
                        "region_code",
                        r["id"],
                        f"region_code={r['region_code']} references non-existent region",
                    )
                )

    # --- Declined authority IDs (array column) ---
    comp_rows = db.query(
        "SELECT id, declined_authority_ids FROM complaints "
        "WHERE declined_authority_ids IS NOT NULL "
        "AND array_length(declined_authority_ids, 1) > 0"
    )
    if comp_rows:
        all_declined = set()
        for r in comp_rows:
            all_declined.update(r["declined_authority_ids"])
        placeholders = ",".join("%s" for _ in all_declined)
        existing = db.query(
            f"SELECT id FROM authorities WHERE id IN ({placeholders})",
            tuple(all_declined),
        )
        existing_set = {e["id"] for e in existing}
        for r in comp_rows:
            for aid in r["declined_authority_ids"]:
                if aid not in existing_set:
                    failures.append(
                        _fail(
                            "complaints",
                            "declined_authority_ids",
                            r["id"],
                            f"declined_authority_id={aid} references non-existent authority",
                        )
                    )

    # --- Road region crossing region_code FK ---
    rrc_rows = db.query(
        "SELECT id, region_code FROM road_region_crossings WHERE region_code IS NOT NULL"
    )
    if rrc_rows:
        rrc_codes = {r["region_code"] for r in rrc_rows}
        placeholders = ",".join("%s" for _ in rrc_codes)
        existing = db.query(
            f"SELECT code FROM regions WHERE code IN ({placeholders})",
            tuple(rrc_codes),
        )
        existing_set = {r["code"] for r in existing}
        for r in rrc_rows:
            if r["region_code"] not in existing_set:
                failures.append(
                    _fail(
                        "road_region_crossings",
                        "region_code",
                        r["id"],
                        f"region_code={r['region_code']} references non-existent region",
                    )
                )

    return _check_group("referential_integrity", failures)


# ---------------------------------------------------------------------------
# 2. SPATIAL CONSISTENCY
# ---------------------------------------------------------------------------

def _check_spatial_consistency() -> dict:
    """Verify that geometries fall within their expected region bounding box.

    For each road with an authority, checks that the road's LineString
    geometry is within the region's bounding_box.

    For each complaint with an assigned_authority_id, checks that the
    complaint's Point geometry is within the region's bounding box.

    Returns individual failures with the offending id and details.
    """
    failures: list[dict] = []

    # --- Roads: check geom against authority region bounding box ---
    road_rows = db.query(
        """
        SELECT r.id, r.name, r.road_code, r.authority_id, a.region_code
        FROM roads r
        JOIN authorities a ON a.id = r.authority_id
        WHERE r.authority_id IS NOT NULL
          AND a.region_code IS NOT NULL
        """
    )
    for row in road_rows:
        # Check if road geometry is within the region's bounding box
        # We use ST_Within for the full linestring; if any part falls outside,
        # ST_Within returns false.  We also use ST_Intersects as a looser
        # check — a road crossing a boundary legitimately may only intersect.
        result = db.query(
            """
            SELECT
              ST_Within(r.geom, reg.bounding_box) AS within_bbox,
              ST_Intersects(r.geom, reg.bounding_box) AS intersects_bbox
            FROM roads r
            JOIN authorities a ON a.id = r.authority_id
            JOIN regions reg ON reg.code = a.region_code
            WHERE r.id = ?
            """,
            (row["id"],),
        )
        if result:
            r = result[0]
            if not r["within_bbox"] and not r["intersects_bbox"]:
                failures.append(
                    _fail(
                        "roads",
                        "geom",
                        row["id"],
                        f"Road '{row['name']}' (code={row['road_code']}, "
                        f"region={row['region_code']}) does not intersect or "
                        f"lie within its region's bounding box",
                    )
                )

    # --- Complaints: check geom against authority region bounding box ---
    comp_rows = db.query(
        """
        SELECT c.id, c.title, c.assigned_authority_id, a.region_code
        FROM complaints c
        JOIN authorities a ON a.id = c.assigned_authority_id
        WHERE c.assigned_authority_id IS NOT NULL
          AND a.region_code IS NOT NULL
        """
    )
    for row in comp_rows:
        result = db.query(
            """
            SELECT
              ST_Within(c.geom, reg.bounding_box) AS within_bbox
            FROM complaints c
            JOIN authorities a ON a.id = c.assigned_authority_id
            JOIN regions reg ON reg.code = a.region_code
            WHERE c.id = ?
            """,
            (row["id"],),
        )
        if result and not result[0]["within_bbox"]:
            failures.append(
                _fail(
                    "complaints",
                    "geom",
                    row["id"],
                    f"Complaint '{row['title']}' (authority_region={row['region_code']}) "
                    f"lies outside its region's bounding box",
                )
            )

    return _check_group("spatial_consistency", failures)


# ---------------------------------------------------------------------------
# 3. DATE SANITY
# ---------------------------------------------------------------------------

def _check_date_sanity() -> dict:
    """Verify date fields are sensible and constraints are met."""
    failures: list[dict] = []

    # --- Roads: last_relaying_date not in the future ---
    rows = db.query(
        "SELECT id, name, last_relaying_date FROM roads "
        "WHERE last_relaying_date IS NOT NULL"
    )
    for r in rows:
        if r["last_relaying_date"]:
            # Compare with CURRENT_DATE via SQL
            result = db.query(
                "SELECT ?::date > CURRENT_DATE AS is_future",
                (r["last_relaying_date"],),
            )
            if result and result[0]["is_future"]:
                failures.append(
                    _fail(
                        "roads",
                        "last_relaying_date",
                        r["id"],
                        f"last_relaying_date={r['last_relaying_date']} is in the future "
                        f"(road '{r['name']}')",
                    )
                )

    # --- Projects: start_date <= target_end_date (already a DB constraint, but double-check) ---
    rows = db.query(
        "SELECT id, title, start_date, target_end_date FROM projects "
        "WHERE start_date > target_end_date"
    )
    for r in rows:
        failures.append(
            _fail(
                "projects",
                "start_date",
                r["id"],
                f"start_date={r['start_date']} > target_end_date={r['target_end_date']} "
                f"(project '{r['title']}')",
            )
        )

    # --- Projects: actual_end_date >= start_date ---
    rows = db.query(
        "SELECT id, title, start_date, actual_end_date FROM projects "
        "WHERE actual_end_date IS NOT NULL AND actual_end_date < start_date"
    )
    for r in rows:
        failures.append(
            _fail(
                "projects",
                "actual_end_date",
                r["id"],
                f"actual_end_date={r['actual_end_date']} < start_date={r['start_date']} "
                f"(project '{r['title']}')",
            )
        )

    # --- Projects: actual_end_date <= CURRENT_DATE (not in future) ---
    rows = db.query(
        "SELECT id, title, actual_end_date FROM projects "
        "WHERE actual_end_date IS NOT NULL AND actual_end_date > CURRENT_DATE"
    )
    for r in rows:
        failures.append(
            _fail(
                "projects",
                "actual_end_date",
                r["id"],
                f"actual_end_date={r['actual_end_date']} is in the future "
                f"(project '{r['title']}')",
            )
        )

    # --- Projects in 'planned' or 'in_progress': target_end_date in the past (warning) ---
    rows = db.query(
        "SELECT id, title, status, target_end_date FROM projects "
        "WHERE status IN ('planned', 'in_progress') "
        "AND target_end_date < CURRENT_DATE"
    )
    for r in rows:
        failures.append(
            _fail(
                "projects",
                "target_end_date",
                r["id"],
                f"project '{r['title']}' is {r['status']} but "
                f"target_end_date={r['target_end_date']} is in the past",
            )
        )

    # --- Contractors: registration_date not in the future ---
    rows = db.query(
        "SELECT id, name, registration_date FROM contractors "
        "WHERE registration_date > CURRENT_DATE"
    )
    for r in rows:
        failures.append(
            _fail(
                "contractors",
                "registration_date",
                r["id"],
                f"registration_date={r['registration_date']} is in the future "
                f"(contractor '{r['name']}')",
            )
        )

    # --- Complaints: created_at not in the future ---
    rows = db.query(
        "SELECT id, title, created_at FROM complaints "
        "WHERE created_at > CURRENT_TIMESTAMP"
    )
    for r in rows:
        failures.append(
            _fail(
                "complaints",
                "created_at",
                r["id"],
                f"created_at={r['created_at']} is in the future "
                f"(complaint '{r['title']}')",
            )
        )

    # --- Project milestones: completion_date >= due_date ---
    rows = db.query(
        "SELECT id, title, due_date, completion_date FROM project_milestones "
        "WHERE completion_date IS NOT NULL AND completion_date < due_date"
    )
    for r in rows:
        failures.append(
            _fail(
                "project_milestones",
                "completion_date",
                r["id"],
                f"completion_date={r['completion_date']} < due_date={r['due_date']} "
                f"(milestone '{r['title']}')",
            )
        )

    return _check_group("date_sanity", failures)


# ---------------------------------------------------------------------------
# 4. BUDGET CONSISTENCY
# ---------------------------------------------------------------------------

def _check_budget_consistency() -> dict:
    """Verify budget_spent does not exceed budget_allocated without approved variance."""
    failures: list[dict] = []

    # Find projects where budget_spent > budget_allocated
    rows = db.query(
        "SELECT id, title, budget_allocated, budget_spent FROM projects "
        "WHERE budget_spent > budget_allocated"
    )
    for r in rows:
        # Check if an approved variance record exists
        approved = db.query(
            "SELECT id, approved_by, approval_date FROM budget_variance_reasons "
            "WHERE project_id = ? AND approved_by IS NOT NULL",
            (r["id"],),
        )
        if not approved:
            failures.append(
                _fail(
                    "projects",
                    "budget_spent",
                    r["id"],
                    f"budget_spent={r['budget_spent']} exceeds "
                    f"budget_allocated={r['budget_allocated']} "
                    f"(project '{r['title']}') but no approved budget variance found",
                )
            )
        else:
            # Check that the approved variance covers the overspend amount
            total_row = db.query(
                "SELECT COALESCE(SUM(variance_amount), 0) AS total_variance "
                "FROM budget_variance_reasons "
                "WHERE project_id = ? AND approved_by IS NOT NULL",
                (r["id"],),
            )
            total_variance = float(total_row[0]["total_variance"]) if total_row else 0.0
            overspend = float(r["budget_spent"]) - float(r["budget_allocated"])
            if total_variance < overspend:
                failures.append(
                    _fail(
                        "projects",
                        "budget_spent",
                        r["id"],
                        f"budget_spent={r['budget_spent']} exceeds "
                        f"budget_allocated={r['budget_allocated']} "
                        f"by {overspend:.2f} but approved variance only covers "
                        f"{total_variance:.2f} (project '{r['title']}')",
                    )
                )

    # --- Check contingency reserves: utilized_amount <= allocated_amount ---
    rows = db.query(
        "SELECT id, project_id, allocated_amount, utilized_amount "
        "FROM contingency_reserves "
        "WHERE utilized_amount > allocated_amount"
    )
    for r in rows:
        failures.append(
            _fail(
                "contingency_reserves",
                "utilized_amount",
                r["id"],
                f"utilized_amount={r['utilized_amount']} exceeds "
                f"allocated_amount={r['allocated_amount']} "
                f"(project_id={r['project_id']})",
            )
        )

    # --- Check fund_sources: total fund sources should not exceed project budget ---
    project_rows = db.query(
        """
        SELECT p.id, p.title, p.budget_allocated,
               COALESCE(SUM(fs.amount), 0) AS total_funded
        FROM projects p
        LEFT JOIN fund_sources fs ON fs.project_id = p.id
        GROUP BY p.id, p.title, p.budget_allocated
        HAVING COALESCE(SUM(fs.amount), 0) > p.budget_allocated * 1.05
        """
    )
    for r in project_rows:
        failures.append(
            _fail(
                "fund_sources",
                "amount",
                r["id"],
                f"total fund_sources={r['total_funded']} exceeds "
                f"budget_allocated={r['budget_allocated']} by more than 5% "
                f"(project '{r['title']}')",
            )
        )

    return _check_group("budget_consistency", failures)


# ---------------------------------------------------------------------------
# 5. COMPLAINT ROUTING
# ---------------------------------------------------------------------------

def _check_complaint_routing() -> dict:
    """Verify complaint routing fields reference valid authorities."""
    failures: list[dict] = []

    # --- assigned_authority_id exists ---
    # (already covered by referential integrity, but check for completeness)
    rows = db.query(
        "SELECT c.id, c.title, c.assigned_authority_id "
        "FROM complaints c "
        "LEFT JOIN authorities a ON a.id = c.assigned_authority_id "
        "WHERE c.assigned_authority_id IS NOT NULL AND a.id IS NULL"
    )
    for r in rows:
        failures.append(
            _fail(
                "complaints",
                "assigned_authority_id",
                r["id"],
                f"assigned_authority_id={r['assigned_authority_id']} does not exist "
                f"(complaint '{r['title']}')",
            )
        )

    # --- declined_authority_ids all exist (already covered in ref integrity, but re-check) ---
    comp_rows = db.query(
        "SELECT id, title, declined_authority_ids FROM complaints "
        "WHERE declined_authority_ids IS NOT NULL "
        "AND array_length(declined_authority_ids, 1) > 0"
    )
    for r in comp_rows:
        for aid in r["declined_authority_ids"]:
            exists = db.query("SELECT id FROM authorities WHERE id = ?", (aid,))
            if not exists:
                failures.append(
                    _fail(
                        "complaints",
                        "declined_authority_ids",
                        r["id"],
                        f"declined_authority_id={aid} does not exist "
                        f"(complaint '{r['title']}')",
                    )
                )

    # --- Complaints in 'routed' or 'in_progress' status should have an assigned_authority_id ---
    rows = db.query(
        "SELECT id, title, status FROM complaints "
        "WHERE status IN ('routed', 'in_progress') "
        "AND assigned_authority_id IS NULL"
    )
    for r in rows:
        failures.append(
            _fail(
                "complaints",
                "assigned_authority_id",
                r["id"],
                f"complaint '{r['title']}' has status '{r['status']}' "
                f"but no assigned_authority_id",
            )
        )

    # --- Complaints with 'pending' status should NOT have an assigned_authority_id ---
    rows = db.query(
        "SELECT id, title, status, assigned_authority_id FROM complaints "
        "WHERE status = 'pending' AND assigned_authority_id IS NOT NULL"
    )
    for r in rows:
        failures.append(
            _fail(
                "complaints",
                "assigned_authority_id",
                r["id"],
                f"complaint '{r['title']}' has status 'pending' but "
                f"assigned_authority_id={r['assigned_authority_id']} is set",
            )
        )

    return _check_group("complaint_routing", failures)


# ---------------------------------------------------------------------------
# GET /api/v1/data/validate
# ---------------------------------------------------------------------------

@router.get("/data/validate")
async def validate_data():
    """Run all data validation checks and return a comprehensive report.

    Returns per-category counts (passed / failed / total) together with a
    list of specific failure records for each check category.
    """
    checks = {
        "referential_integrity": _check_referential_integrity(),
        "spatial_consistency": _check_spatial_consistency(),
        "date_sanity": _check_date_sanity(),
        "budget_consistency": _check_budget_consistency(),
        "complaint_routing": _check_complaint_routing(),
    }

    total_passed = sum(c["passed"] for c in checks.values())
    total_failed = sum(c["failed"] for c in checks.values())
    total_checks = sum(c["total"] for c in checks.values())

    return {
        "summary": {
            "total_checks": total_checks,
            "passed": total_passed,
            "failed": total_failed,
        },
        "details": checks,
    }


# ---------------------------------------------------------------------------
# GET /api/v1/data-quality/road/{road_id}
# GET /api/v1/data-quality/summary
# ---------------------------------------------------------------------------

@router.get("/data-quality/road/{road_id}")
async def road_data_quality(road_id: int):
    """Return per-road data quality score with dimension breakdown.

    Scores are 0-100 across 4 dimensions: completeness, freshness,
    consistency, and spatial validity. Grade is A (>=90) through F (<40).
    """
    result = score_road(road_id)
    if result is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Road with id {road_id} not found")
    return result


@router.get("/data-quality/summary")
async def data_quality_summary():
    """Return aggregate data quality statistics across all roads.

    Includes average score, grade distribution, weakest dimension,
    and best/worst ranked roads.
    """
    return get_summary_stats()