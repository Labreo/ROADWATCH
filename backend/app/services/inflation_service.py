import logging
from app.services.database import db

logger = logging.getLogger(__name__)

_CPI_TABLE: dict[str, dict[int, float]] = {}


def _load_cpi_data():
    try:
        rows = db.query("SELECT region_code, year, cpi_value FROM cpi_data ORDER BY region_code, year")
        if not rows:
            logger.warning("No CPI data found in database — using hardcoded defaults")
            _load_hardcoded_defaults()
            return

        for row in rows:
            region = row['region_code']
            year = row['year']
            val = float(row['cpi_value'])
            if region not in _CPI_TABLE:
                _CPI_TABLE[region] = {}
            _CPI_TABLE[region][year] = val
    except Exception as e:
        logger.warning(f"Database query failed in _load_cpi_data ({e}) — using hardcoded defaults")
        _load_hardcoded_defaults()


def _load_hardcoded_defaults():
    _CPI_TABLE.clear()
    _CPI_TABLE['IN'] = {2020: 100.0, 2021: 105.1, 2022: 111.6, 2023: 118.4, 2024: 124.8, 2025: 131.0, 2026: 136.5}
    _CPI_TABLE['US'] = {2020: 100.0, 2021: 104.7, 2022: 112.0, 2023: 115.8, 2024: 119.0, 2025: 121.5, 2026: 123.8}
    _CPI_TABLE['GB'] = {2020: 100.0, 2021: 102.6, 2022: 109.1, 2023: 115.4, 2024: 118.2, 2025: 120.8, 2026: 123.0}
    _CPI_TABLE['KE'] = {2020: 100.0, 2021: 106.2, 2022: 113.8, 2023: 121.5, 2024: 128.1, 2025: 133.6, 2026: 138.2}


_load_cpi_data()


class InflationService:

    @classmethod
    def adjust_for_inflation(cls, amount: float, from_year: int, to_year: int, region_code: str = 'IN') -> dict | None:
        if region_code not in _CPI_TABLE:
            logger.warning("No CPI data for region %s", region_code)
            return None

        cpi_data = _CPI_TABLE[region_code]
        from_cpi = cpi_data.get(from_year)
        to_cpi = cpi_data.get(to_year)

        if from_cpi is None or to_cpi is None:
            nearest_from = max((y for y in cpi_data if y <= from_year), default=None)
            nearest_to = min((y for y in cpi_data if y >= to_year), default=None)
            from_cpi = cpi_data.get(nearest_from) if nearest_from else None
            to_cpi = cpi_data.get(nearest_to) if nearest_to else None
            if from_cpi is None or to_cpi is None:
                return None

        multiplier = to_cpi / from_cpi
        adjusted = amount * multiplier

        return {
            "original_amount": round(amount, 2),
            "adjusted_amount": round(adjusted, 2),
            "from_year": from_year,
            "to_year": to_year,
            "region_code": region_code,
            "inflation_multiplier": round(multiplier, 4),
            "from_cpi": from_cpi,
            "to_cpi": to_cpi,
        }

    @classmethod
    def adjust_project_budget(cls, project_id: int, target_year: int | None = None) -> dict | None:
        project = db.query(
            "SELECT p.id, p.title, p.budget_allocated, p.budget_spent, "
            "p.start_date, EXTRACT(YEAR FROM p.start_date) AS start_year, "
            "rgn.code AS region_code, rgn.default_currency "
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

        allocated_adjusted = cls.adjust_for_inflation(
            float(p['budget_allocated']), from_year, to_year, p['region_code']
        )
        spent_adjusted = cls.adjust_for_inflation(
            float(p['budget_spent']), from_year, to_year, p['region_code']
        )

        return {
            "project_id": p['id'],
            "project_title": p['title'],
            "region_code": p['region_code'],
            "currency": p['default_currency'],
            "from_year": from_year,
            "to_year": to_year,
            "budget_allocated_nominal": float(p['budget_allocated']),
            "budget_allocated_adjusted": allocated_adjusted['adjusted_amount'] if allocated_adjusted else None,
            "budget_spent_nominal": float(p['budget_spent']),
            "budget_spent_adjusted": spent_adjusted['adjusted_amount'] if spent_adjusted else None,
            "inflation_multiplier": allocated_adjusted['inflation_multiplier'] if allocated_adjusted else None,
        }

    @classmethod
    def get_region_cpi_summary(cls, region_code: str) -> list[dict] | None:
        if region_code not in _CPI_TABLE:
            return None
        return [
            {"year": year, "cpi_value": cpi}
            for year, cpi in sorted(_CPI_TABLE[region_code].items())
        ]
