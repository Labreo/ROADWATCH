import os
import time
import httpx
import logging
from typing import Optional
from app.services.database import db
from app.services.inflation_service import InflationService

logger = logging.getLogger(__name__)

# Simple in-memory cache with TTL
_rate_cache: dict[str, tuple[float, float]] = {}  # key -> (rate, timestamp)
CACHE_TTL = 3600  # 1 hour


class ExchangeRateService:

    API_URL = "https://api.frankfurter.app/latest"

    @classmethod
    async def get_rate(cls, from_currency: str, to_currency: str) -> Optional[float]:
        """
        Fetch exchange rate from Frankfurter API (free, no key required).
        Caches result for 1 hour.
        """
        if from_currency == to_currency:
            return 1.0

        cache_key = f"{from_currency}_{to_currency}"
        now = time.time()

        cached = _rate_cache.get(cache_key)
        if cached and (now - cached[1]) < CACHE_TTL:
            return cached[0]

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    cls.API_URL,
                    params={"from": from_currency, "to": to_currency},
                )
                if resp.status_code != 200:
                    logger.warning(
                        "Exchange rate API returned %d for %s->%s",
                        resp.status_code,
                        from_currency,
                        to_currency,
                    )
                    return cls._get_fallback_rate(from_currency, to_currency)

                data = resp.json()
                rate = data["rates"].get(to_currency)
                if rate is None:
                    return cls._get_fallback_rate(from_currency, to_currency)

                _rate_cache[cache_key] = (float(rate), now)
                return float(rate)

        except Exception as e:
            logger.error("Exchange rate fetch error: %s", e)
            return cls._get_fallback_rate(from_currency, to_currency)

    @staticmethod
    def _get_fallback_rate(from_currency: str, to_currency: str) -> Optional[float]:
        """
        Hardcoded fallback rates for common pairs.
        Used when API is unavailable.
        """
        fallback: dict[str, dict[str, float]] = {
            "INR": {"USD": 0.012, "GBP": 0.0095, "KES": 1.55, "EUR": 0.011},
            "USD": {"INR": 83.50, "GBP": 0.79, "KES": 129.0, "EUR": 0.92},
            "GBP": {"INR": 105.0, "USD": 1.27, "KES": 163.0, "EUR": 1.17},
            "KES": {"INR": 0.65, "USD": 0.0078, "GBP": 0.0061, "EUR": 0.0071},
            "EUR": {"INR": 90.0, "USD": 1.09, "GBP": 0.86, "KES": 140.0},
        }
        if from_currency in fallback and to_currency in fallback[from_currency]:
            return fallback[from_currency][to_currency]
        return None

    @classmethod
    async def convert_amount(
        cls, amount: float, from_currency: str, to_currency: str
    ) -> Optional[dict]:
        """Convert an amount from one currency to another."""
        rate = await cls.get_rate(from_currency, to_currency)
        if rate is None:
            return None

        return {
            "amount_from": amount,
            "currency_from": from_currency,
            "amount_to": round(amount * rate, 2),
            "currency_to": to_currency,
            "rate": rate,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

    @classmethod
    async def compare_project_cost(
        cls, project_id: int, target_currency: str
    ) -> Optional[dict]:
        """
        Get a project's budget allocated/spent in the target currency.
        """
        projects = db.query(
            "SELECT p.id, p.title, p.budget_allocated, p.budget_spent, "
            "r.default_currency AS currency "
            "FROM projects p "
            "JOIN roads rd ON p.road_id = rd.id "
            "JOIN authorities a ON rd.authority_id = a.id "
            "JOIN regions r ON a.region_code = r.code "
            "WHERE p.id = ?",
            (project_id,),
        )
        if not projects:
            return None

        project = projects[0]
        source_currency = project["currency"]

        allocated_converted = await cls.convert_amount(
            float(project["budget_allocated"]), source_currency, target_currency
        )
        spent_converted = await cls.convert_amount(
            float(project["budget_spent"]), source_currency, target_currency
        )

        return {
            "project_id": project["id"],
            "project_title": project["title"],
            "source_currency": source_currency,
            "target_currency": target_currency,
            "budget_allocated_local": float(project["budget_allocated"]),
            "budget_allocated_converted": allocated_converted["amount_to"] if allocated_converted else None,
            "budget_spent_local": float(project["budget_spent"]),
            "budget_spent_converted": spent_converted["amount_to"] if spent_converted else None,
            "rate_used": allocated_converted["rate"] if allocated_converted else None,
            "rate_timestamp": allocated_converted["timestamp"] if allocated_converted else None,
        }

    @classmethod
    async def get_global_spend(cls, target_currency: str = "USD") -> Optional[dict]:
        """
        Aggregate all project budgets across all regions, converted to target currency.
        """
        projects = db.query(
            """
            SELECT p.id, p.title, p.budget_allocated, p.budget_spent,
                   rgn.default_currency AS currency, rgn.code AS region_code
            FROM projects p
            JOIN roads rd ON p.road_id = rd.id
            JOIN authorities a ON rd.authority_id = a.id
            JOIN regions rgn ON a.region_code = rgn.code
            WHERE p.status NOT IN ('cancelled')
            """
        )

        if not projects:
            return {"total_allocated": 0, "total_spent": 0, "projects": [], "target_currency": target_currency}

        total_allocated = 0.0
        total_spent = 0.0
        project_details = []

        for p in projects:
            alloc_conv = await cls.convert_amount(
                float(p["budget_allocated"]), p["currency"], target_currency
            )
            spent_conv = await cls.convert_amount(
                float(p["budget_spent"]), p["currency"], target_currency
            )

            if alloc_conv:
                total_allocated += alloc_conv["amount_to"]
            if spent_conv:
                total_spent += spent_conv["amount_to"]

            project_details.append({
                "project_id": p["id"],
                "title": p["title"],
                "region_code": p["region_code"],
                "currency": p["currency"],
                "budget_allocated_local": float(p["budget_allocated"]),
                "budget_allocated_converted": alloc_conv["amount_to"] if alloc_conv else None,
                "budget_spent_local": float(p["budget_spent"]),
                "budget_spent_converted": spent_conv["amount_to"] if spent_conv else None,
            })

        return {
            "total_allocated": round(total_allocated, 2),
            "total_spent": round(total_spent, 2),
            "target_currency": target_currency,
            "project_count": len(project_details),
            "projects": project_details,
        }

    @classmethod
    async def compare_with_inflation(
        cls, project_id: int, target_year: int | None = None, target_currency: str | None = None
    ) -> Optional[dict]:
        """Combine exchange rate conversion with inflation adjustment for fair comparison."""
        project = db.query(
            "SELECT p.id, p.title, p.budget_allocated, p.budget_spent, "
            "EXTRACT(YEAR FROM p.start_date) AS start_year, "
            "rgn.default_currency, rgn.code AS region_code "
            "FROM projects p "
            "JOIN roads rd ON p.road_id = rd.id "
            "JOIN authorities a ON rd.authority_id = a.id "
            "JOIN regions rgn ON a.region_code = rgn.code "
            "WHERE p.id = ?",
            (project_id,),
        )
        if not project:
            return None

        p = project[0]
        from_year = int(p['start_year']) if p['start_year'] else 2024
        to_year = target_year or 2026
        source_currency = p['default_currency']

        inflation_adjusted = InflationService.adjust_for_inflation(
            float(p['budget_spent']), from_year, to_year, p['region_code']
        )

        result = {
            "project_id": p['id'],
            "project_title": p['title'],
            "region_code": p['region_code'],
            "source_currency": source_currency,
            "from_year": from_year,
            "to_year": to_year,
            "budget_allocated_nominal": float(p['budget_allocated']),
            "budget_spent_nominal": float(p['budget_spent']),
        }

        if inflation_adjusted:
            result["budget_spent_inflation_adjusted"] = inflation_adjusted['adjusted_amount']
            result["inflation_multiplier"] = inflation_adjusted['inflation_multiplier']

        if target_currency and target_currency != source_currency:
            conv = await cls.convert_amount(
                inflation_adjusted['adjusted_amount'] if inflation_adjusted else float(p['budget_spent']),
                source_currency,
                target_currency,
            )
            if conv:
                result["budget_spent_adjusted_converted"] = conv['amount_to']
                result["target_currency"] = target_currency
                result["exchange_rate"] = conv['rate']

        return result
