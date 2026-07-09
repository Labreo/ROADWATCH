from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.authority_resolver import AuthorityResolver

router = APIRouter()


class ResolveRequest(BaseModel):
    latitude: float
    longitude: float


class ResolveResponse(BaseModel):
    region_code: str
    region_name: Optional[str] = None
    default_currency: Optional[str] = None
    locale: Optional[str] = None
    phone_format: Optional[str] = None
    timezone: Optional[str] = None
    authority: Optional[dict] = None


class RegionResponse(BaseModel):
    code: str
    name: str
    default_currency: str
    locale: str
    phone_format: Optional[str] = None
    timezone: Optional[str] = None


@router.post("/regions/resolve", response_model=ResolveResponse)
async def resolve_region(req: ResolveRequest):
    region = AuthorityResolver.get_region_for_coordinates(req.longitude, req.latitude)
    if not region:
        region = {'code': 'IN', 'name': 'India', 'default_currency': 'INR', 'locale': 'en-IN', 'phone_format': '+91-XX-XXXXXXXX', 'timezone': 'Asia/Kolkata'}

    authority = AuthorityResolver.resolve_authority_for_coordinates(req.longitude, req.latitude)

    return ResolveResponse(
        region_code=region['code'],
        region_name=region.get('name'),
        default_currency=region.get('default_currency'),
        locale=region.get('locale'),
        phone_format=region.get('phone_format'),
        timezone=region.get('timezone'),
        authority=authority,
    )


@router.get("/regions", response_model=list[RegionResponse])
async def list_regions():
    regions = AuthorityResolver.list_all_regions()
    return [RegionResponse(**r) for r in regions]


@router.get("/regions/{code}")
async def get_region(code: str):
    region = AuthorityResolver.get_region_by_code(code.upper())
    if not region:
        raise HTTPException(status_code=404, detail=f"Region '{code}' not found")
    return RegionResponse(**region)
