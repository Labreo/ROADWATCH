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
