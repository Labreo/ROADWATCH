"""Road endpoints: history, documents, timeline, and data quality.

Provides read/write access to road_defect_history, road_documents,
and the unified maintenance timeline.
"""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse

from app.services.database import db
from app.services.road_retriever import StructuredRoadRetriever

router = APIRouter()

UPLOAD_DIR = Path(os.environ.get("ROADWATCH_UPLOAD_DIR", "./uploads/roads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/roads/{road_id}/history")
async def get_road_history(
    road_id: int,
    limit: int = Query(30, ge=1, le=365, description="Max snapshots"),
    offset: int = Query(0, ge=0, description="Skip N rows"),
):
    """Return deterioration snapshots for a road, newest first."""
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


@router.get("/roads/{road_id}/timeline")
async def get_road_timeline(road_id: int):
    """Return unified chronological timeline of all events for a road.

    Combines project starts/completions, material tests, defect snapshots,
    complaints, and warranty events into a single sorted timeline.
    Useful for AI chat context and civic audit review.
    """
    if not db.query("SELECT id FROM roads WHERE id = %s", (road_id,)):
        raise HTTPException(status_code=404, detail="Road not found")
    return StructuredRoadRetriever.get_road_timeline(road_id)


@router.get("/roads/{road_id}/documents")
async def list_road_documents(road_id: int):
    """List all documents attached to a road."""
    if not db.query("SELECT id FROM roads WHERE id = %s", (road_id,)):
        raise HTTPException(status_code=404, detail="Road not found")
    return StructuredRoadRetriever.get_road_documents(road_id)


@router.post("/roads/{road_id}/documents")
async def upload_road_document(
    road_id: int,
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    title: str = Form(...),
):
    """Upload a document and attach it to a road.

    Stores the file in the configured upload directory and creates a
    database record in road_documents. Supported doc_type values:
    inspection_photo, design_document, contractor_report, material_certificate, other.
    """
    if not db.query("SELECT id FROM roads WHERE id = %s", (road_id,)):
        raise HTTPException(status_code=404, detail="Road not found")

    valid_types = {"inspection_photo", "design_document", "contractor_report", "material_certificate", "other"}
    if doc_type not in valid_types:
        raise HTTPException(status_code=422, detail=f"doc_type must be one of: {', '.join(valid_types)}")

    ext = Path(file.filename).suffix if file.filename else ".bin"
    stored_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / stored_name

    content = await file.read()
    file_path.write_bytes(content)

    file_size = len(content)
    mime_type = file.content_type or "application/octet-stream"
    file_url = f"/uploads/roads/{stored_name}"

    doc_id = db.execute(
        """
        INSERT INTO road_documents (road_id, doc_type, title, file_url, file_size_bytes, mime_type, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, 'api')
        """,
        (road_id, doc_type, title, file_url, file_size, mime_type),
    )

    return {
        "id": doc_id,
        "road_id": road_id,
        "doc_type": doc_type,
        "title": title,
        "file_url": file_url,
        "file_size_bytes": file_size,
        "mime_type": mime_type,
    }


@router.delete("/roads/{road_id}/documents/{doc_id}")
async def delete_road_document(road_id: int, doc_id: int):
    """Delete a document by ID.

    Removes both the database record and the stored file.
    """
    rows = db.query(
        "SELECT id, file_url FROM road_documents WHERE id = ? AND road_id = ?",
        (doc_id, road_id),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = rows[0]
    file_path = Path(doc["file_url"].lstrip("/")) if doc["file_url"].startswith("/uploads/") else None
    if file_path and file_path.exists():
        file_path.unlink()

    db.execute("DELETE FROM road_documents WHERE id = ?", (doc_id,))
    return {"deleted": True, "id": doc_id}