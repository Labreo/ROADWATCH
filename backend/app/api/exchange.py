from fastapi import APIRouter, HTTPException, Query
from app.services.exchange_rate_service import ExchangeRateService

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
