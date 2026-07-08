from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.database import db
from app.services.authority_resolver import AuthorityResolver

router = APIRouter()

class GeoJSONPoint(BaseModel):
    type: str = Field(default="Point", pattern="^Point$")
    coordinates: List[float]

class ComplaintPayload(BaseModel):
    id: Optional[int] = None
    clientTempId: Optional[str] = None
    title: str
    description: str
    category: str
    geometry: GeoJSONPoint
    status: str = "pending"
    assignedAuthorityId: int
    roadId: Optional[int] = None
    createdAt: Optional[str] = None
    imageUrl: Optional[str] = None
    imagePreview: Optional[str] = None

@router.post("/complaints")
async def create_complaint(payload: ComplaintPayload):
    coords = payload.geometry.coordinates
    lon, lat = coords[0], coords[1]
    geom_wkt = f"POINT({lon} {lat})"

    conflict_sql = """
    SELECT id, title, status, ST_Distance(geom, ST_GeomFromText(%s, 4326)) as distance
    FROM complaints
    WHERE ST_DWithin(geom, ST_GeomFromText(%s, 4326), 0.001)
      AND category = %s
      AND status IN ('pending', 'routed', 'in_progress')
    ORDER BY distance ASC
    LIMIT 1
    """
    conflicts = db.query(conflict_sql, (geom_wkt, geom_wkt, payload.category))

    if conflicts:
        existing = conflicts[0]
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Overlapping geometry conflict: a similar report is already active in this jurisdiction.",
                "conflict_id": existing["id"],
                "conflict_title": existing["title"],
                "conflict_status": existing["status"],
                "distance": float(existing["distance"]) if existing.get("distance") else None
            }
        )

    created_at = payload.createdAt or datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    insert_sql = """
    INSERT INTO complaints (title, description, category, geom, status, client_temp_id, image_url, assigned_authority_id, road_id, created_at, updated_at)
    VALUES (%s, %s, %s, ST_GeomFromText(%s, 4326), %s, %s, %s, %s, %s, %s, %s)
    RETURNING id
    """
    params = (
        payload.title,
        payload.description,
        payload.category,
        geom_wkt,
        "routed",
        payload.clientTempId,
        payload.imageUrl or payload.imagePreview,
        payload.assignedAuthorityId,
        payload.roadId,
        created_at,
        created_at,
    )

    new_id = db.execute(insert_sql, params)
    if new_id is None:
        raise HTTPException(status_code=500, detail="Failed to insert complaint record.")

    region = AuthorityResolver.get_region_for_coordinates(lon, lat)
    region_code = region['code'] if region else 'IN'

    return {
        "id": new_id,
        "status": "routed",
        "region_code": region_code,
        "message": "Complaint registered and routed successfully."
    }
