"""Data quality metrics API.

Provides per-region and cross-region data quality scores:
  - Completeness % (field null ratios)
  - Freshness (days since last update/import)
  - Consistency (internal data integrity)

Intended for the cross-region comparison view and admin dashboards.
"""

from fastapi import APIRouter, HTTPException
from app.services.data_quality import DataQualityService

router = APIRouter()


@router.get("/data-quality")
async def get_data_quality_all():
    """Return data quality metrics for all regions."""
    return DataQualityService.get_all_regions_quality()


@router.get("/data-quality/{region_code}")
async def get_data_quality_region(region_code: str):
    """Return data quality metrics for a single region."""
    code = region_code.upper()
    result = DataQualityService.get_region_quality(code)
    if result.get('overall_score') is None:
        raise HTTPException(status_code=404, detail=f"Region '{code}' not found or has no data")
    return result
