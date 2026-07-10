"""Data quality metrics per region.

Computes and exposes data quality scores for each region:
  - completeness %: what fraction of expected fields are non-null
  - freshness avg: average days since last update/import
  - consistency score: internal consistency metric

Used by the /api/v1/data-quality endpoint and cross-region comparison views.
"""

from datetime import datetime, timezone
from app.services.database import db


class DataQualityService:

    @staticmethod
    def get_region_quality(region_code: str) -> dict:
        """
        Compute data quality metrics for a single region.
        Returns a dict with completeness, freshness, consistency, and overall score.
        """
        completeness = DataQualityService._completeness_score(region_code)
        freshness = DataQualityService._freshness_score(region_code)
        consistency = DataQualityService._consistency_score(region_code)

        overall = round(completeness['score'] * 0.35 + freshness['score'] * 0.35 + consistency['score'] * 0.30, 1)

        return {
            'region_code': region_code,
            'overall_score': overall,
            'completeness': completeness,
            'freshness': freshness,
            'consistency': consistency,
        }

    @staticmethod
    def get_all_regions_quality() -> list[dict]:
        """Compute data quality for all regions."""
        regions = db.query("SELECT code FROM regions")
        return [DataQualityService.get_region_quality(r['code']) for r in regions]

    @staticmethod
    def _completeness_score(region_code: str) -> dict:
        """
        Measure field completeness for roads and complaints in a region.
        Checks null ratios on critical fields (name, road_code, length_km, geom).
        """
        scores = {}

        # Roads completeness
        road_fields = ['name', 'road_code', 'length_km', 'road_type', 'geom']
        for field in road_fields:
            sql = f"""
            SELECT COUNT(*) AS total,
                   SUM(CASE WHEN {field} IS NULL OR {field} = '' THEN 1 ELSE 0 END) AS nulls
            FROM roads r
            JOIN authorities a ON r.authority_id = a.id
            WHERE a.region_code = %s
            """
            row = db.query(sql, (region_code,))
            if row and row[0]['total'] > 0:
                scores[field] = round((1 - row[0]['nulls'] / row[0]['total']) * 100, 1)
            else:
                scores[field] = 100.0

        avg_completeness = round(sum(scores.values()) / len(scores), 1) if scores else 0.0

        return {
            'score': avg_completeness,
            'details': scores,
            'label': f'{avg_completeness}% fields populated',
        }

    @staticmethod
    def _freshness_score(region_code: str) -> dict:
        """
        Measure data freshness based on last import and update times.
        Returns a score where 100 = fresh today, 0 = never updated.
        """
        now = datetime.now(timezone.utc)

        # Last import from region_import_log
        import_row = db.query("""
        SELECT MAX(finished_at) AS last_import
        FROM region_import_log
        WHERE region_code = %s
        """, (region_code,))

        # Last road update
        road_row = db.query("""
        SELECT MAX(r.updated_at) AS last_update
        FROM roads r
        JOIN authorities a ON r.authority_id = a.id
        WHERE a.region_code = %s
        """, (region_code,))

        last_import = import_row[0]['last_import'] if import_row and import_row[0]['last_import'] else None
        last_update = road_row[0]['last_update'] if road_row and road_row[0]['last_update'] else None

        # Use the most recent of import/update
        timestamps = [ts for ts in [last_import, last_update] if ts is not None]
        if not timestamps:
            return {'score': 0.0, 'days_since_update': None, 'label': 'No import data'}

        latest = max(timestamps)
        # Ensure latest is timezone-aware
        if latest.tzinfo is None:
            latest = latest.replace(tzinfo=timezone.utc)
        days_since = (now - latest).total_seconds() / 86400.0

        # Score decays: 100 at 0 days, 50 at 30 days, 0 at 90+ days
        if days_since <= 1:
            freshness_score = 100.0
        elif days_since <= 30:
            freshness_score = round(100 - (days_since - 1) * (50 / 29), 1)
        elif days_since <= 90:
            freshness_score = round(50 - (days_since - 30) * (50 / 60), 1)
        else:
            freshness_score = 0.0

        return {
            'score': freshness_score,
            'days_since_update': round(days_since, 1),
            'label': f'{round(days_since, 1)} days since last update',
        }

    @staticmethod
    def _consistency_score(region_code: str) -> dict:
        """
        Measure internal consistency:
          - Roads without authority → 0 (should be linked)
          - Complaints without road_id → penalized
          - Projects with mismatched budgets (spent > allocated)
        """
        deductions = 0.0
        checks = {}

        # Roads without authority_id
        row = db.query("""
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN authority_id IS NULL THEN 1 ELSE 0 END) AS no_authority
        FROM roads r
        JOIN authorities a ON r.authority_id = a.id
        WHERE a.region_code = %s
        """, (region_code,))
        if row and row[0]['total'] > 0:
            pct_no_auth = row[0]['no_authority'] / row[0]['total']
            deductions += pct_no_auth * 20
            checks['roads_without_authority'] = {
                'count': row[0]['no_authority'],
                'penalty': round(pct_no_auth * 20, 1),
            }
        else:
            checks['roads_without_authority'] = {'count': 0, 'penalty': 0}

        # Complaints without road_id
        row = db.query("""
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN road_id IS NULL THEN 1 ELSE 0 END) AS no_road
        FROM complaints
        WHERE region_code = %s
        """, (region_code,))
        if row and row[0]['total'] > 0:
            pct_no_road = row[0]['no_road'] / row[0]['total']
            deductions += pct_no_road * 15
            checks['complaints_without_road'] = {
                'count': row[0]['no_road'],
                'penalty': round(pct_no_road * 15, 1),
            }
        else:
            checks['complaints_without_road'] = {'count': 0, 'penalty': 0}

        # Projects with budget_spent > budget_allocated
        row = db.query("""
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN budget_spent > budget_allocated THEN 1 ELSE 0 END) AS over_budget
        FROM projects p
        JOIN roads r ON p.road_id = r.id
        JOIN authorities a ON r.authority_id = a.id
        WHERE a.region_code = %s
        """, (region_code,))
        if row and row[0]['total'] > 0:
            pct_over = row[0]['over_budget'] / row[0]['total']
            deductions += pct_over * 10
            checks['projects_over_budget'] = {
                'count': row[0]['over_budget'],
                'penalty': round(pct_over * 10, 1),
            }
        else:
            checks['projects_over_budget'] = {'count': 0, 'penalty': 0}

        consistency_score = max(0.0, 100.0 - deductions)

        return {
            'score': consistency_score,
            'details': checks,
            'label': f'{consistency_score}% consistent',
        }
