from app.services.database import db

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
