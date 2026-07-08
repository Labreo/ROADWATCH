"""Road defect history endpoints for ROADWATCH.

Provides read access to the ``road_defect_history`` table which tracks
per-road deterioration over time, auto-snapshotted via triggers when
complaints or projects change.
"""

from fastapi import APIRouter, HTTPException, Query

from app.services.database import db

router = APIRouter()


@router.get("/roads/{road_id}/history")
async def get_road_history(
    road_id: int,
    limit: int = Query(30, ge=1, le=365, description="Max snapshots"),
    offset: int = Query(0, ge=0, description="Skip N rows"),
):
    """Return deterioration snapshots for a road, newest first."""
    # Verify road exists
    if not db.query("SELECT id FROM roads WHERE id = %s", (road_id,)):
        raise HTTPException(status_code=404, detail="Road not found")

    sql = """
    SELECT id, road_id, snapshot_date, status_at_time,
           complaint_count, project_count, avg_depth_cm, source, created_at
    FROM road_defect_history
    WHERE road_id = %s
    ORDER BY snapshot_date DESC
    LIMIT %s OFFSET %s
    """
    return db.query(sql, (road_id, limit, offset))


@router.get("/roads/{road_id}/history/summary")
async def get_road_history_summary(road_id: int):
    """Return aggregate statistics for a road's defect history."""
    if not db.query("SELECT id FROM roads WHERE id = %s", (road_id,)):
        raise HTTPException(status_code=404, detail="Road not found")

    sql = """
    SELECT
        COUNT(*)                                         AS total_snapshots,
        MIN(snapshot_date)                               AS first_snapshot,
        MAX(snapshot_date)                               AS last_snapshot,
        MAX(complaint_count)                             AS peak_complaints,
        ROUND(AVG(complaint_count), 1)                   AS avg_complaints,
        MAX(project_count)                               AS peak_projects,
        ROUND(AVG(project_count), 1)                     AS avg_projects
    FROM road_defect_history
    WHERE road_id = %s
    """
    rows = db.query(sql, (road_id,))
    return rows[0] if rows else {}