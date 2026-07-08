from app.services.database import db

class AuthorityResolver:

    @staticmethod
    def get_region_for_coordinates(lon: float, lat: float):
        point_wkt = f"POINT({lon} {lat})"
        sql = """
        SELECT code, name, default_currency, locale, phone_format
        FROM regions
        WHERE ST_Contains(bounding_box, ST_GeomFromText(%s, 4326)) = true
        ORDER BY ST_Area(bounding_box) ASC
        LIMIT 1
        """
        results = db.query(sql, (point_wkt,))
        if results:
            return results[0]
        return None

    @staticmethod
    def get_region_by_code(code: str):
        sql = "SELECT code, name, default_currency, locale, phone_format FROM regions WHERE code = %s"
        results = db.query(sql, (code,))
        return results[0] if results else None

    @staticmethod
    def list_all_regions():
        return db.query("SELECT code, name, default_currency, locale, phone_format FROM regions ORDER BY code")

    @staticmethod
    def get_authority_by_id(authority_id: int):
        sql = """
        SELECT a.*, r.code as region_code, r.name as region_name,
               r.default_currency, r.locale, r.phone_format
        FROM authorities a
        LEFT JOIN regions r ON a.region_code = r.code
        WHERE a.id = %s
        """
        results = db.query(sql, (authority_id,))
        return results[0] if results else None

    @staticmethod
    def resolve_authority_for_coordinates(lon: float, lat: float):
        """
        Resolves authority across ALL regions using PostGIS ST_Contains.
        1. Queries regions table bounding boxes for fast country filter
        2. Queries authorities where ST_Contains(geom_boundary, point) is true
        3. Smallest boundary wins (most granular jurisdiction)
        4. Falls back to region default if no boundary match
        """
        region = AuthorityResolver.get_region_for_coordinates(lon, lat)
        region_code = region['code'] if region else 'IN'

        point_wkt = f"POINT({lon} {lat})"

        sql = """
        SELECT a.*, r.name as region_name, r.default_currency, r.locale, r.phone_format
        FROM authorities a
        LEFT JOIN regions r ON a.region_code = r.code
        WHERE ST_Contains(a.geom_boundary, ST_GeomFromText(%s, 4326)) = true
          AND a.geom_boundary IS NOT NULL
        ORDER BY ST_Area(a.geom_boundary) ASC
        LIMIT 1
        """
        results = db.query(sql, (point_wkt,))
        if results:
            res = dict(results[0])
            res.setdefault('region_code', region_code)
            return res

        sql = """
        SELECT a.*, r.name as region_name, r.default_currency, r.locale, r.phone_format
        FROM authorities a
        LEFT JOIN regions r ON a.region_code = r.code
        WHERE a.region_code = %s
        ORDER BY a.id ASC
        LIMIT 1
        """
        fallback = db.query(sql, (region_code,))
        if fallback:
            res = dict(fallback[0])
            res.setdefault('region_code', region_code)
            return res

        last_sql = "SELECT * FROM authorities WHERE id = 4"
        final = db.query(last_sql)
        if final:
            res = dict(final[0])
            res['region_code'] = 'IN'
            return res

        return {
            'id': 4, 'name': 'State Public Works Department - Mumbai Division',
            'department_code': 'PWD-MUM', 'contact_email': 'se.mumbai@pwd.gov.in',
            'contact_phone': '+91-22-2202-3333', 'region_code': 'IN',
            'geom_boundary': None, 'created_at': None, 'updated_at': None
        }

    @staticmethod
    def list_all_authorities():
        sql = """
        SELECT a.id, a.name, a.department_code, a.contact_email, a.contact_phone,
               a.region_code, a.geom_boundary, a.created_at, a.updated_at,
               r.name as region_name, r.default_currency, r.locale, r.phone_format
        FROM authorities a
        LEFT JOIN regions r ON a.region_code = r.code
        ORDER BY a.id
        """
        return db.query(sql)
