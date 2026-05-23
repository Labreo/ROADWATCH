from app.services.database import db

class AuthorityResolver:
    @staticmethod
    def get_authority_by_id(authority_id: int):
        sql = "SELECT * FROM authorities WHERE id = ?"
        results = db.query(sql, (authority_id,))
        return results[0] if results else None

    @staticmethod
    def resolve_authority_for_coordinates(lon: float, lat: float):
        """
        Queries authorities boundaries to see which POLYGON contains the (lon, lat) Point.
        Prefers specific municipal wards (smaller boundaries) over state/national highway boundaries if overlapping.
        """
        point_wkt = f"POINT({lon} {lat})"
        
        # We query authorities where boundary contains the point
        sql = """
        SELECT * FROM authorities 
        WHERE ST_Contains(geom_boundary, ?) = 1
        """
        results = db.query(sql, (point_wkt,))
        if not results:
            return None
            
        # We sort MCGM wards first, as state/national boundaries cover the whole city
        # Wards MCGM-KW, MCGM-FN, MCGM-HE have smaller, more local boundaries
        results_sorted = sorted(
            results, 
            key=lambda a: 0 if a['department_code'].startswith('MCGM') else 1
        )
        return results_sorted[0]

    @staticmethod
    def list_all_authorities():
        sql = "SELECT id, name, department_code, contact_email, contact_phone FROM authorities"
        return db.query(sql)
