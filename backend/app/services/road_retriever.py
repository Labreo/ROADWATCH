from typing import Optional
from app.services.database import db

class CrossRegionResolver:
    """Resolve road identities across different regions using the road_aliases table.

    A single road (e.g., "NH-48" in India) may be known by different names
    in different regions (local names, historical names, etc.). This resolver
    maps roads across regions via shared aliases.
    """

    @staticmethod
    def get_aliases(road_id: int) -> list[dict]:
        """Return all aliases for a given road."""
        return db.query("""
        SELECT ra.*, r.name AS road_name, r.road_code
        FROM road_aliases ra
        JOIN roads r ON ra.road_id = r.id
        WHERE ra.road_id = %s
        ORDER BY ra.is_primary DESC, ra.alias_type
        """, (road_id,))

    @staticmethod
    def find_roads_by_alias(alias_name: str) -> list[dict]:
        """Find all roads matching an alias name across regions."""
        return db.query("""
        SELECT r.id, r.name, r.road_code, r.status, r.length_km,
               r.road_type, a.region_code, a.name AS authority_name,
               ra.alias_name, ra.alias_type, ra.is_primary
        FROM road_aliases ra
        JOIN roads r ON ra.road_id = r.id
        LEFT JOIN authorities a ON r.authority_id = a.id
        WHERE LOWER(ra.alias_name) = LOWER(%s)
        ORDER BY a.region_code
        """, (alias_name,))

    @staticmethod
    def find_cross_region_roads(alias_name: str) -> list[dict]:
        """Find roads across regions sharing the same alias."""
        return db.query("""
        SELECT r.id, r.name, r.road_code, r.status, r.length_km,
               r.road_type, a.region_code, a.name AS authority_name,
               ra.alias_name, ra.alias_type
        FROM road_aliases ra
        JOIN roads r ON ra.road_id = r.id
        LEFT JOIN authorities a ON r.authority_id = a.id
        WHERE LOWER(ra.alias_name) = LOWER(%s)
        ORDER BY a.region_code, r.name
        """, (alias_name,))

    @staticmethod
    def link_roads(road_id_a: int, road_id_b: int, alias_name: str,
                   alias_type: str = 'international') -> dict:
        """Link two roads across regions by creating matching aliases.

        Both roads will share the same alias_name, enabling cross-region lookup.
        Returns dict with created alias IDs.
        """
        # Check both roads exist
        road_a = db.query("SELECT id, name, road_code FROM roads WHERE id = %s", (road_id_a,))
        road_b = db.query("SELECT id, name, road_code FROM roads WHERE id = %s", (road_id_b,))
        if not road_a or not road_b:
            raise ValueError("One or both road IDs not found")

        # Create alias on road A if not exists
        existing_a = db.query(
            "SELECT id FROM road_aliases WHERE road_id = %s AND alias_name = %s",
            (road_id_a, alias_name),
        )
        if not existing_a:
            aid_a = db.execute(
                "INSERT INTO road_aliases (road_id, alias_name, alias_type, is_primary) VALUES (%s, %s, %s, %s)",
                (road_id_a, alias_name, alias_type, True),
            )
        else:
            aid_a = existing_a[0]['id']

        # Create alias on road B if not exists
        existing_b = db.query(
            "SELECT id FROM road_aliases WHERE road_id = %s AND alias_name = %s",
            (road_id_b, alias_name),
        )
        if not existing_b:
            aid_b = db.execute(
                "INSERT INTO road_aliases (road_id, alias_name, alias_type, is_primary) VALUES (%s, %s, %s, %s)",
                (road_id_b, alias_name, alias_type, True),
            )
        else:
            aid_b = existing_b[0]['id']

        return {
            'alias_name': alias_name,
            'alias_type': alias_type,
            'road_a': {'id': road_id_a, 'name': road_a[0]['name'], 'alias_id': aid_a},
            'road_b': {'id': road_id_b, 'name': road_b[0]['name'], 'alias_id': aid_b},
        }

    @staticmethod
    def search_roads_cross_region(query_str: str) -> list[dict]:
        """Search roads by name or code, returning results grouped by region."""
        wildcard = f"%{query_str}%"
        return db.query("""
        SELECT r.id, r.name, r.road_code, r.status, r.length_km,
               r.road_type, a.region_code, a.name AS authority_name,
               ARRAY_AGG(DISTINCT ra.alias_name) FILTER (WHERE ra.alias_name IS NOT NULL) AS aliases
        FROM roads r
        LEFT JOIN authorities a ON r.authority_id = a.id
        LEFT JOIN road_aliases ra ON ra.road_id = r.id
        WHERE r.name ILIKE %s OR r.road_code ILIKE %s
        GROUP BY r.id, r.name, r.road_code, r.status, r.length_km,
                 r.road_type, a.region_code, a.name
        ORDER BY a.region_code, r.name
        """, (wildcard, wildcard))


class StructuredRoadRetriever:
    @staticmethod
    def get_road_by_id(road_id: int):
        sql = """
        SELECT r.*, a.name as authority_name, a.department_code as authority_code 
        FROM roads r
        LEFT JOIN authorities a ON r.authority_id = a.id
        WHERE r.id = ?
        """
        results = db.query(sql, (road_id,))
        return results[0] if results else None

    @staticmethod
    def search_roads_by_name(query_str: str):
        # Perform a case-insensitive search
        sql = """
        SELECT r.*, a.name as authority_name, a.department_code as authority_code 
        FROM roads r
        LEFT JOIN authorities a ON r.authority_id = a.id
        WHERE r.name LIKE ? OR r.road_code LIKE ?
        """
        wildcard = f"%{query_str}%"
        return db.query(sql, (wildcard, wildcard))

    @staticmethod
    def get_closest_road(lon: float, lat: float, max_distance: float = 0.005):
        """
        Finds the closest road segment to a given longitude and latitude.
        Uses PostGIS ST_DWithin and ST_Distance to compute the closest road segment.
        """
        point_wkt = f"POINT({lon} {lat})"
        sql = """
        SELECT r.*, a.name as authority_name, a.department_code as authority_code,
               ST_Distance(r.geom, ST_GeomFromText(?, 4326)) as distance
        FROM roads r
        LEFT JOIN authorities a ON r.authority_id = a.id
        WHERE ST_DWithin(r.geom, ST_GeomFromText(?, 4326), ?) = true
        ORDER BY distance ASC
        LIMIT 1
        """
        results = db.query(sql, (point_wkt, point_wkt, max_distance))
        return results[0] if results else None

    @staticmethod
    def get_road_projects(road_id: int):
        sql = """
        SELECT p.*, c.name as contractor_name, c.license_number as contractor_license,
               c.rating as contractor_rating, c.blacklisted as contractor_blacklisted
        FROM projects p
        LEFT JOIN contractors c ON p.contractor_id = c.id
        WHERE p.road_id = ?
        ORDER BY p.start_date DESC
        """
        return db.query(sql, (road_id,))

    @staticmethod
    def get_road_complaints(road_id: int):
        sql = """
        SELECT c.*, a.name as authority_name, a.department_code as authority_code 
        FROM complaints c
        LEFT JOIN authorities a ON c.assigned_authority_id = a.id
        WHERE c.road_id = ?
        ORDER BY c.created_at DESC
        """
        return db.query(sql, (road_id,))
        
    @staticmethod
    def get_contractor_by_name(name: str):
        sql = "SELECT * FROM contractors WHERE name LIKE ?"
        results = db.query(sql, (f"%{name}%",))
        return results[0] if results else None
        
    @staticmethod
    def get_contractor_projects(contractor_id: int):
        sql = """
        SELECT p.*, r.name as road_name, r.road_code
        FROM projects p
        LEFT JOIN roads r ON p.road_id = r.id
        WHERE p.contractor_id = ?
        ORDER BY p.start_date DESC
        """
        return db.query(sql, (contractor_id,))

    @staticmethod
    def get_project_fund_sources(project_id: int):
        sql = """
        SELECT id, project_id, source_name, amount
        FROM fund_sources
        WHERE project_id = ?
        ORDER BY amount DESC
        """
        return db.query(sql, (project_id,))

    @staticmethod
    def get_road_budget_summary(road_id: int):
        sql = """
        SELECT
            COUNT(p.id) AS project_count,
            COALESCE(SUM(p.budget_allocated), 0) AS total_sanctioned,
            COALESCE(SUM(p.budget_spent), 0) AS total_spent,
            CASE
                WHEN COALESCE(SUM(p.budget_allocated), 0) > 0
                THEN ROUND((COALESCE(SUM(p.budget_spent), 0) / SUM(p.budget_allocated)) * 100, 1)
                ELSE 0
            END AS spend_pct,
            COALESCE(SUM(ABS(p.budget_spent - p.budget_allocated)), 0) AS total_variance,
            COALESCE(SUM(p.delay_days), 0) AS total_delay_days
        FROM projects p
        WHERE p.road_id = ?
        """
        results = db.query(sql, (road_id,))
        return results[0] if results else None

    @staticmethod
    def get_road_cost_per_km(road_id: int):
        sql = """
        SELECT
            p.id AS project_id,
            p.title,
            r.length_km,
            p.budget_allocated,
            p.budget_spent,
            CASE
                WHEN r.length_km IS NOT NULL AND r.length_km > 0
                THEN ROUND(p.budget_allocated / r.length_km, 2)
                ELSE NULL
            END AS allocated_per_km,
            CASE
                WHEN r.length_km IS NOT NULL AND r.length_km > 0
                THEN ROUND(p.budget_spent / r.length_km, 2)
                ELSE NULL
            END AS spent_per_km,
            p.status,
            c.name AS contractor_name
        FROM projects p
        JOIN roads r ON p.road_id = r.id
        LEFT JOIN contractors c ON p.contractor_id = c.id
        WHERE p.road_id = ?
        ORDER BY p.budget_allocated DESC
        """
        return db.query(sql, (road_id,))

    @staticmethod
    def get_road_funding_sources_summary(road_id: int):
        sql = """
        SELECT
            fs.source_name,
            COALESCE(SUM(fs.amount), 0) AS total_amount,
            ROUND(
                COALESCE(SUM(fs.amount), 0) * 100.0 /
                NULLIF((SELECT SUM(fs2.amount) FROM fund_sources fs2 JOIN projects p2 ON fs2.project_id = p2.id WHERE p2.road_id = ?), 0)
            , 1) AS pct_of_total
        FROM fund_sources fs
        JOIN projects p ON fs.project_id = p.id
        WHERE p.road_id = ?
        GROUP BY fs.source_name
        ORDER BY total_amount DESC
        """
        return db.query(sql, (road_id, road_id))

    @staticmethod
    def get_road_budget_variance_reasons(road_id: int):
        sql = """
        SELECT bvr.*, p.title AS project_title
        FROM budget_variance_reasons bvr
        JOIN projects p ON bvr.project_id = p.id
        WHERE p.road_id = ?
        ORDER BY bvr.created_at DESC
        """
        return db.query(sql, (road_id,))

    @staticmethod
    def get_contractor_transparency_summary(contractor_id: int):
        sql = """
        SELECT
            c.id, c.name, c.rating, c.blacklisted, c.blacklisted_reason,
            c.projects_completed, c.projects_delayed,
            COALESCE(SUM(p.budget_allocated), 0) AS total_contracts_value,
            COALESCE(SUM(p.budget_spent), 0) AS total_spent,
            COALESCE(SUM(p.delay_days), 0) AS total_delay_days,
            COUNT(p.id) AS project_count
        FROM contractors c
        LEFT JOIN projects p ON c.id = p.contractor_id
        WHERE c.id = ?
        GROUP BY c.id, c.name, c.rating, c.blacklisted, c.blacklisted_reason,
                 c.projects_completed, c.projects_delayed
        """
        results = db.query(sql, (contractor_id,))
        return results[0] if results else None

    @staticmethod
    def get_citywide_budget_snapshot():
        sql = """
        SELECT
            COUNT(DISTINCT p.road_id) AS roads_with_projects,
            COUNT(p.id) AS total_projects,
            COALESCE(SUM(p.budget_allocated), 0) AS total_sanctioned_city,
            COALESCE(SUM(p.budget_spent), 0) AS total_spent_city,
            CASE
                WHEN COALESCE(SUM(p.budget_allocated), 0) > 0
                THEN ROUND((COALESCE(SUM(p.budget_spent), 0) / SUM(p.budget_allocated)) * 100, 1)
                ELSE 0
            END AS city_spend_pct,
            COALESCE(SUM(p.delay_days), 0) AS total_delay_days_city,
            COUNT(DISTINCT fs.source_name) AS distinct_funding_sources
        FROM projects p
        LEFT JOIN fund_sources fs ON p.id = fs.project_id
        """
        results = db.query(sql)
        return results[0] if results else None

    @staticmethod
    def get_road_project_milestones(road_id: int):
        sql = """
        SELECT
            p.title AS project_title,
            pm.title AS milestone_title,
            pm.description,
            pm.amount,
            pm.status,
            pm.due_date,
            pm.completion_date,
            pm.verified_by,
            pm.payment_release_date
        FROM project_milestones pm
        JOIN projects p ON pm.project_id = p.id
        JOIN roads r ON p.road_id = r.id
        WHERE r.id = ?
        ORDER BY pm.due_date ASC
        """
        return db.query(sql, (road_id,))

    @staticmethod
    def get_road_contingency_reserves(road_id: int):
        sql = """
        SELECT
            p.title AS project_title,
            cr.allocated_amount,
            cr.utilized_amount,
            cr.status,
            cr.release_notes
        FROM contingency_reserves cr
        JOIN projects p ON cr.project_id = p.id
        JOIN roads r ON p.road_id = r.id
        WHERE r.id = ?
        ORDER BY cr.allocated_amount DESC
        """
        return db.query(sql, (road_id,))

    @staticmethod
    def get_road_contingency_summary(road_id: int):
        sql = """
        SELECT
            COALESCE(SUM(cr.allocated_amount), 0) AS total_allocated,
            COALESCE(SUM(cr.utilized_amount), 0) AS total_utilized,
            COUNT(cr.id) AS release_count,
            COALESCE(SUM(cr.utilized_amount) * 100.0 / NULLIF(SUM(cr.allocated_amount), 0), 0) AS utilization_pct
        FROM contingency_reserves cr
        JOIN projects p ON cr.project_id = p.id
        JOIN roads r ON p.road_id = r.id
        WHERE r.id = ?
        """
        results = db.query(sql, (road_id,))
        return results[0] if results else None

    @staticmethod
    def get_road_contingency_statuses(road_id: int):
        sql = """
        SELECT
            cr.status,
            COUNT(cr.id) AS count,
            COALESCE(SUM(cr.allocated_amount), 0) AS total_allocated,
            COALESCE(SUM(cr.utilized_amount), 0) AS total_utilized
        FROM contingency_reserves cr
        JOIN projects p ON cr.project_id = p.id
        JOIN roads r ON p.road_id = r.id
        WHERE r.id = ?
        GROUP BY cr.status
        ORDER BY total_allocated DESC
        """
        return db.query(sql, (road_id,))

    @staticmethod
    def get_road_approval_trail(road_id: int):
        sql = """
        SELECT
            at.entity_type,
            at.action,
            at.requested_by,
            at.approved_by,
            at.approved_at,
            at.status,
            at.comments
        FROM approval_trail at
        JOIN projects p ON at.entity_id = p.id
        JOIN roads r ON p.road_id = r.id
        WHERE r.id = ?
        ORDER BY at.approved_at DESC NULLS LAST, at.created_at DESC
        """
        return db.query(sql, (road_id,))

    @staticmethod
    def get_road_tenders(road_id: int):
        """Get procurement tenders linked to projects on a road."""
        sql = """
        SELECT t.*, a.name AS authority_name, a.department_code AS authority_code,
               (SELECT COUNT(*) FROM tender_bids WHERE tender_id = t.id) AS bid_count
        FROM tenders t
        LEFT JOIN authorities a ON t.authority_id = a.id
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE p.road_id = ?
        ORDER BY t.published_date DESC NULLS LAST
        """
        return db.query(sql, (road_id,))

    @staticmethod
    def get_contractor_bids(contractor_id: int):
        sql = """
        SELECT tb.*, t.reference_no, t.title AS tender_title, t.status AS tender_status
        FROM tender_bids tb
        JOIN tenders t ON tb.tender_id = t.id
        WHERE tb.contractor_id = ?
        ORDER BY t.published_date DESC NULLS LAST
        """
        return db.query(sql, (contractor_id,))

    @staticmethod
    def get_road_beneficiaries(road_id: int):
        sql = """
        SELECT pb.*, p.title AS project_title
        FROM project_beneficiaries pb
        JOIN projects p ON pb.project_id = p.id
        WHERE p.road_id = ?
        ORDER BY pb.population_served DESC
        """
        return db.query(sql, (road_id,))

    @staticmethod
    def get_road_timeline(road_id: int):
        """Return a unified chronological timeline of all events for a road.

        Combines projects, material tests, defect snapshots, complaints,
        and warranties into a single ordered timeline.
        """
        sql = """
        SELECT event_date, event_type, description, material_note
        FROM (
            -- project starts
            SELECT p.start_date AS event_date, 'project_start' AS event_type,
                   p.title AS description, NULL::TEXT AS material_note
            FROM projects p WHERE p.road_id = ?
            UNION ALL
            -- project completions
            SELECT p.actual_end_date, 'project_completion', p.title, NULL
            FROM projects p WHERE p.road_id = ? AND p.actual_end_date IS NOT NULL
            UNION ALL
            -- material test dates
            SELECT rm.test_date, 'material_test',
                   rm.material_type || ': ' || COALESCE(rm.specification_grade, 'N/A') || ' from ' || COALESCE(rm.source_quarry, 'unknown'),
                   rm.mix_design_ref
            FROM road_materials rm JOIN projects p ON rm.project_id = p.id WHERE p.road_id = ?
            UNION ALL
            -- defect history snapshots (notable: status changes)
            SELECT rdh.snapshot_date, 'status_snapshot',
                   'Status: ' || rdh.status_at_time || ', Complaints: ' || rdh.complaint_count || ', Projects: ' || rdh.project_count,
                   NULL
            FROM road_defect_history rdh WHERE rdh.road_id = ?
            UNION ALL
            -- complaints filed
            SELECT c.created_at::date, 'complaint_filed',
                   c.title || ' (' || c.category || ')', NULL
            FROM complaints c WHERE c.road_id = ?
            UNION ALL
            -- complaints resolved
            SELECT c.updated_at::date, 'complaint_resolved',
                   c.title || ' — resolved', NULL
            FROM complaints c WHERE c.road_id = ? AND c.status = 'resolved'
            UNION ALL
            -- warranty starts
            SELECT pw.warranty_start_date, 'warranty_start',
                   'Warranty: ' || p.title, NULL
            FROM project_warranties pw JOIN projects p ON pw.project_id = p.id WHERE p.road_id = ?
            UNION ALL
            -- warranty expiries
            SELECT pw.warranty_end_date, 'warranty_expiry',
                   'Warranty expired: ' || p.title, NULL
            FROM project_warranties pw JOIN projects p ON pw.project_id = p.id WHERE p.road_id = ?
        ) AS timeline
        WHERE event_date IS NOT NULL
        ORDER BY event_date ASC
        """
        return db.query(sql, (road_id, road_id, road_id, road_id, road_id, road_id, road_id, road_id))

    @staticmethod
    def get_road_documents(road_id: int):
        sql = """
        SELECT id, road_id, doc_type, title, file_url, file_size_bytes, mime_type, uploaded_by, uploaded_at
        FROM road_documents
        WHERE road_id = ?
        ORDER BY uploaded_at DESC
        """
        return db.query(sql, (road_id,))

    @staticmethod
    def get_road_beneficiary_summary(road_id: int):
        sql = """
        SELECT
            COUNT(DISTINCT pb.id) AS beneficiary_records,
            COALESCE(SUM(pb.population_served), 0) AS total_population_served,
            COALESCE(SUM(pb.estimated_daily_traffic), 0) AS total_daily_traffic,
            COALESCE(SUM(pb.household_count), 0) AS total_households,
            COUNT(DISTINCT pb.project_id) AS project_count
        FROM project_beneficiaries pb
        JOIN projects p ON pb.project_id = p.id
        WHERE p.road_id = ?
        """
        results = db.query(sql, (road_id,))
        return results[0] if results else None

    @staticmethod
    def get_road_approval_summary(road_id: int):
        sql = """
        SELECT
            at.entity_type,
            at.action,
            at.requested_by,
            at.approved_by,
            at.approved_at,
            at.status,
            at.comments,
            p.title AS project_title
        FROM approval_trail at
        JOIN projects p ON at.entity_id = p.id
        JOIN roads r ON p.road_id = r.id
        WHERE r.id = ?
        ORDER BY at.approved_at DESC NULLS LAST, at.created_at DESC
        LIMIT 10
        """
        return db.query(sql, (road_id,))
