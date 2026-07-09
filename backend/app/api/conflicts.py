from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.services.conflict_resolver import ConflictResolver

router = APIRouter()


@router.get("/conflicts/roads")
async def list_road_conflicts(resolved: Optional[bool] = Query(None)):
    groups = ConflictResolver.list_road_conflicts(resolved)
    return {"conflicts": groups, "total": len(groups)}


@router.get("/conflicts/authorities")
async def list_authority_conflicts(resolved: Optional[bool] = Query(None)):
    groups = ConflictResolver.list_authority_conflicts(resolved)
    return {"conflicts": groups, "total": len(groups)}


class RoadConflictDetectRequest(BaseModel):
    name: str
    road_code: Optional[str] = None
    geom_wkt: Optional[str] = None


@router.post("/conflicts/roads/detect")
async def detect_road_conflicts(req: RoadConflictDetectRequest):
    duplicates = ConflictResolver.detect_road_duplicates(
        req.name, req.road_code, req.geom_wkt
    )
    return {"duplicates": duplicates, "total": len(duplicates)}


class AuthorityConflictDetectRequest(BaseModel):
    name: str
    department_code: Optional[str] = None


@router.post("/conflicts/authorities/detect")
async def detect_authority_conflicts(req: AuthorityConflictDetectRequest):
    duplicates = ConflictResolver.detect_authority_duplicates(
        req.name, req.department_code
    )
    return {"duplicates": duplicates, "total": len(duplicates)}


class ConflictCreateGroupRequest(BaseModel):
    conflict_key: str
    entity_ids: list[int]  # [primary_id, ...duplicates]


@router.post("/conflicts/roads/create-group")
async def create_road_conflict_group(req: ConflictCreateGroupRequest):
    group_id = ConflictResolver.create_road_conflict_group(
        req.conflict_key, req.entity_ids
    )
    if not group_id:
        raise HTTPException(status_code=400, detail="Could not create conflict group")
    return {"group_id": group_id, "status": "created"}


@router.post("/conflicts/authorities/create-group")
async def create_authority_conflict_group(req: ConflictCreateGroupRequest):
    group_id = ConflictResolver.create_authority_conflict_group(
        req.conflict_key, req.entity_ids
    )
    if not group_id:
        raise HTTPException(status_code=400, detail="Could not create conflict group")
    return {"group_id": group_id, "status": "created"}


class ConflictResolveRequest(BaseModel):
    resolution: str  # 'merge', 'link', 'dismiss'
    resolved_by: Optional[str] = "system"


@router.post("/conflicts/roads/{group_id}/resolve")
async def resolve_road_conflict(group_id: int, req: ConflictResolveRequest):
    result = ConflictResolver.resolve_road_conflict(
        group_id, req.resolution, req.resolved_by
    )
    if not result:
        raise HTTPException(status_code=404, detail="Conflict group not found")
    return result


@router.post("/conflicts/authorities/{group_id}/resolve")
async def resolve_authority_conflict(group_id: int, req: ConflictResolveRequest):
    result = ConflictResolver.resolve_authority_conflict(
        group_id, req.resolution, req.resolved_by
    )
    if not result:
        raise HTTPException(status_code=404, detail="Conflict group not found")
    return result
