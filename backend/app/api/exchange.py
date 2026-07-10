from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.services.exchange_rate_service import ExchangeRateService
from app.services.inflation_service import InflationService

router = APIRouter()


@router.get("/exchange/rate")
async def get_exchange_rate(
    from_currency: str = Query("INR", min_length=3, max_length=3),
    to_currency: str = Query("USD", min_length=3, max_length=3),
):
    rate = await ExchangeRateService.get_rate(from_currency.upper(), to_currency.upper())
    if rate is None:
        raise HTTPException(status_code=502, detail="Could not fetch exchange rate")
    return {
        "from": from_currency.upper(),
        "to": to_currency.upper(),
        "rate": rate,
    }


@router.get("/exchange/convert")
async def convert_currency(
    amount: float = Query(..., gt=0),
    from_currency: str = Query("INR", min_length=3, max_length=3),
    to_currency: str = Query("USD", min_length=3, max_length=3),
):
    result = await ExchangeRateService.convert_amount(
        amount, from_currency.upper(), to_currency.upper()
    )
    if result is None:
        raise HTTPException(status_code=502, detail="Currency conversion failed")
    return result


@router.get("/exchange/compare/{project_id}")
async def compare_project_cost(
    project_id: int,
    to_currency: str = Query("USD", min_length=3, max_length=3),
):
    result = await ExchangeRateService.compare_project_cost(
        project_id, to_currency.upper()
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return result


@router.get("/exchange/global-spend")
async def global_spend(
    currency: str = Query("USD", min_length=3, max_length=3),
):
    result = await ExchangeRateService.get_global_spend(currency.upper())
    return result


@router.get("/exchange/inflation-adjust")
def inflation_adjust(
    amount: float = Query(..., gt=0),
    from_year: int = Query(..., ge=2000, le=2030),
    to_year: int = Query(2026, ge=2000, le=2030),
    region: str = Query("IN", min_length=2, max_length=2),
):
    result = InflationService.adjust_for_inflation(amount, from_year, to_year, region.upper())
    if result is None:
        raise HTTPException(status_code=404, detail="Inflation adjustment failed — check region/year")
    return result


@router.get("/exchange/inflation-compare/{project_id}")
def inflation_compare_project(
    project_id: int,
    target_year: Optional[int] = Query(None, ge=2000, le=2030),
):
    result = InflationService.adjust_project_budget(project_id, target_year)
    if result is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return result


@router.get("/exchange/inflation-cpi/{region_code}")
def get_cpi_data(region_code: str):
    result = InflationService.get_region_cpi_summary(region_code.upper())
    if result is None:
        raise HTTPException(status_code=404, detail="Region not found")
    return {"region_code": region_code.upper(), "cpi_data": result}
