"""Budget transparency API endpoints for ROADWATCH.

Exposes sanctioned vs spent, funding sources, VfM index, inflation-adjusted
figures, and cross-region budget comparisons.
"""

from fastapi import APIRouter, HTTPException
from app.services.road_retriever import StructuredRoadRetriever
from app.services.transparency_service import (
    calculate_road_transparency,
    get_citywide_transparency_snapshot,
    calculate_vfm_index,
    get_citywide_vfm_snapshot,
)
from app.services.inflation_service import InflationService
from app.services.database import db

router = APIRouter()


@router.get("/budget/summary")
async def budget_summary():
    """City-wide budget snapshot with transparency score."""
    snapshot = StructuredRoadRetriever.get_citywide_budget_snapshot()
    if not snapshot:
        raise HTTPException(status_code=404, detail="No budget data available")
    transparency = get_citywide_transparency_snapshot()
    vfm = get_citywide_vfm_snapshot()
    return {
        "budget": snapshot,
        "transparency": transparency,
        "vfm": vfm,
    }


@router.get("/budget/road/{road_id}")
async def road_budget(road_id: int):
    """Per-road budget breakdown: sanctioned, spent, funding sources, variance."""
    summary = StructuredRoadRetriever.get_road_budget_summary(road_id)
    if not summary or summary["project_count"] == 0:
        raise HTTPException(status_code=404, detail="No budget data for this road")
    fund_sources = StructuredRoadRetriever.get_road_funding_sources_summary(road_id)
    cost_per_km = StructuredRoadRetriever.get_road_cost_per_km(road_id)
    variances = StructuredRoadRetriever.get_road_budget_variance_reasons(road_id)
    transparency = calculate_road_transparency(road_id)
    road = StructuredRoadRetriever.get_road_by_id(road_id)
    return {
        "road_name": road["name"] if road else None,
        "road_code": road["road_code"] if road else None,
        "summary": summary,
        "funding_sources": fund_sources,
        "cost_per_km": cost_per_km,
        "variance_reasons": variances,
        "transparency_score": transparency,
    }


@router.get("/budget/cross-region")
async def cross_region_budget():
    """Compare budget metrics across regions."""
    regions = db.query("SELECT code, name, default_currency FROM regions ORDER BY code")
    results = []
    for r in regions:
        region_data = db.query(
            """
            SELECT
                COUNT(DISTINCT p.id) AS project_count,
                COALESCE(SUM(p.budget_allocated), 0) AS total_sanctioned,
                COALESCE(SUM(p.budget_spent), 0) AS total_spent,
                CASE
                    WHEN COALESCE(SUM(p.budget_allocated), 0) > 0
                    THEN ROUND((COALESCE(SUM(p.budget_spent), 0) / SUM(p.budget_allocated)) * 100, 1)
                    ELSE 0
                END AS spend_pct,
                COALESCE(SUM(p.delay_days), 0) AS total_delay_days
            FROM projects p
            JOIN roads rd ON p.road_id = rd.id
            JOIN authorities a ON rd.authority_id = a.id
            WHERE a.region_code = %s
            """,
            (r["code"],),
        )
        road_count = db.query(
            "SELECT COUNT(*) AS cnt FROM roads r JOIN authorities a ON r.authority_id = a.id WHERE a.region_code = %s",
            (r["code"],),
        )
        results.append({
            "region_code": r["code"],
            "region_name": r["name"],
            "currency": r["default_currency"],
            "roads": road_count[0]["cnt"] if road_count else 0,
            "budget": region_data[0] if region_data else None,
        })
    return {"regions": results}


@router.get("/budget/vfm/{road_id}")
async def road_vfm(road_id: int):
    """Value-for-Money index for a specific road."""
    vfm = calculate_vfm_index(road_id)
    if not vfm:
        raise HTTPException(status_code=404, detail="VfM data not available for this road")
    return vfm


@router.get("/budget/vfm")
async def citywide_vfm():
    """City-wide Value-for-Money snapshot."""
    return get_citywide_vfm_snapshot()


@router.get("/budget/inflation/{road_id}")
async def road_inflation_adjusted(road_id: int, target_year: int = 2026):
    """Inflation-adjusted budget figures for a road's projects."""
    projects = StructuredRoadRetriever.get_road_projects(road_id)
    if not projects:
        raise HTTPException(status_code=404, detail="No projects for this road")
    road = StructuredRoadRetriever.get_road_by_id(road_id)
    region_code = "IN"
    if road:
        auth = db.query(
            "SELECT region_code FROM authorities WHERE id = %s",
            (road.get("authority_id"),),
        )
        if auth and auth[0].get("region_code"):
            region_code = auth[0]["region_code"]

    results = []
    for p in projects[:10]:
        start_yr = p["start_date"].year if hasattr(p["start_date"], "year") else 2024
        adj = InflationService.adjust_for_inflation(
            float(p["budget_spent"]), start_yr, target_year, region_code
        )
        results.append({
            "project_title": p["title"],
            "original_amount": float(p["budget_spent"]),
            "original_year": start_yr,
            "adjusted_amount": adj["adjusted_amount"] if adj else None,
            "inflation_multiplier": adj["inflation_multiplier"] if adj else None,
            "target_year": target_year,
        })
    return {"road_name": road["name"] if road else None, "projects": results}


@router.get("/budget/transparency/{road_id}")
async def road_transparency(road_id: int):
    """Transparency score with anomaly detection for a road."""
    transparency = calculate_road_transparency(road_id)
    if not transparency:
        raise HTTPException(status_code=404, detail="Transparency data not available")
    return transparency


@router.get("/budget/transparency")
async def citywide_transparency():
    """City-wide transparency report."""
    return get_citywide_transparency_snapshot()