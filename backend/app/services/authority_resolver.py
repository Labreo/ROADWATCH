from app.services.database import db

# Executive Engineer contact information for each authority
EXECUTIVE_ENGINEERS = {
    1: {  # MCGM Ward K-West
        'name': 'Er. Ramesh Sawant',
        'designation': 'Executive Engineer (Civil Engineering Division)',
        'contact': '+91-22-2623-0101',
        'email': 'ee.kw@mcgm.gov.in'
    },
    2: {  # MCGM Ward F-North
        'name': 'Er. Anil Deshmukh',
        'designation': 'Executive Engineer (Civil Engineering Division)',
        'contact': '+91-22-2402-1102',
        'email': 'ee.fn@mcgm.gov.in'
    },
    3: {  # MCGM Ward H-East
        'name': 'Er. Sandeep Patil',
        'designation': 'Executive Engineer (Civil Engineering Division)',
        'contact': '+91-22-2618-2203',
        'email': 'ee.he@mcgm.gov.in'
    },
    4: {  # State PWD Mumbai
        'name': 'Er. Vijay Kadam',
        'designation': 'Superintending Engineer (Public Works Division)',
        'contact': '+91-22-2202-3304',
        'email': 'se.mumbai@pwd.gov.in'
    },
    5: {  # NHAI RO Mumbai
        'name': 'Er. Yashwant Rao',
        'designation': 'Project Director (National Highways)',
        'contact': '+91-22-2756-4405',
        'email': 'romumbai@nhai.org'
    }
}

class AuthorityResolver:

    @staticmethod
    def get_region_for_coordinates(lon: float, lat: float):
        point_wkt = f"POINT({lon} {lat})"
        sql = """
        SELECT code, name, default_currency, locale, phone_format, timezone
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
        sql = "SELECT code, name, default_currency, locale, phone_format, timezone FROM regions WHERE code = %s"
        results = db.query(sql, (code,))
        return results[0] if results else None

    @staticmethod
    def list_all_regions():
        return db.query("SELECT code, name, default_currency, locale, phone_format, timezone FROM regions ORDER BY code")

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
    def resolve_authority_for_coordinates(lon: float, lat: float, exclude_authority_ids: list = None):
        """
        Resolves authority across ALL regions using PostGIS ST_Contains.
        1. Queries regions table bounding boxes for fast country filter
        2. Queries authorities where ST_Contains(geom_boundary, point) is true
        3. Smallest boundary wins (most granular jurisdiction)
        4. Falls back to region default if no boundary match
        5. Skips authorities in exclude_authority_ids (for reassignment)
        """
        if exclude_authority_ids is None:
            exclude_authority_ids = []

        region = AuthorityResolver.get_region_for_coordinates(lon, lat)
        region_code = region['code'] if region else 'IN'

        point_wkt = f"POINT({lon} {lat})"

        # Build exclusion clause
        exclude_clause = ""
        if exclude_authority_ids:
            placeholders = ",".join(str(int(x)) for x in exclude_authority_ids)
            exclude_clause = f" AND a.id NOT IN ({placeholders})"

        sql = f"""
        SELECT a.*, r.name as region_name, r.default_currency, r.locale, r.phone_format
        FROM authorities a
        LEFT JOIN regions r ON a.region_code = r.code
        WHERE ST_Contains(a.geom_boundary, ST_GeomFromText(%s, 4326)) = true
          AND a.geom_boundary IS NOT NULL
          {exclude_clause}
        ORDER BY ST_Area(a.geom_boundary) ASC
        LIMIT 1
        """
        results = db.query(sql, (point_wkt,))
        if results:
            res = dict(results[0])
            res.setdefault('region_code', region_code)
            return res

        sql = f"""
        SELECT a.*, r.name as region_name, r.default_currency, r.locale, r.phone_format
        FROM authorities a
        LEFT JOIN regions r ON a.region_code = r.code
        WHERE a.region_code = %s
          {exclude_clause}
        ORDER BY a.id ASC
        LIMIT 1
        """
        fallback = db.query(sql, (region_code,))
        if fallback:
            res = dict(fallback[0])
            res.setdefault('region_code', region_code)
            return res

        # Final fallback — skip if excluded
        final_sql = "SELECT * FROM authorities WHERE id = 4"
        if 4 not in exclude_authority_ids:
            final = db.query(final_sql)
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
    def resolve_with_routing_details(lon: float, lat: float, road_name: str = None) -> dict:
        """One-call: resolve authority for coordinates + build routing details."""
        authority = AuthorityResolver.resolve_authority_for_coordinates(lon, lat)
        region = AuthorityResolver.get_region_for_coordinates(lon, lat)
        region_name = region.get('name') if region else None
        return AuthorityResolver.build_routing_details(authority, road_name, region_name)

    @staticmethod
    def build_routing_details(authority: dict, road_name: str = None, region_name: str = None) -> dict:
        """
        Build a human-readable routing_details payload from resolved authority.
        Includes executive engineer info, fallback for unknown authorities.
        Returns dict with authority_name, executive_engineer_name, designation, contact, reason_for_routing.
        """
        auth_id = authority.get('id', 4)
        eng = EXECUTIVE_ENGINEERS.get(auth_id, {
            'name': 'Office of the Commissioner',
            'designation': 'Chief Engineer (Central Division)',
            'contact': '+91-22-2262-0251',
            'email': 'commissioner@mcgm.gov.in'
        })

        region = region_name or authority.get('region_name', authority.get('region_code', 'the region'))
        dept = authority.get('name', 'Department of Public Works')

        if road_name:
            reasons = [
                f"This issue on **{road_name}** falls under **{dept}** ({region}).",
                f"Routing to **{eng['name']}** ({eng['designation']})."
            ]
        else:
            reasons = [
                f"This location falls under **{dept}** ({region}).",
                f"Routing to **{eng['name']}** ({eng['designation']})."
            ]

        return {
            "authority_name": dept,
            "authority_id": auth_id,
            "executive_engineer_name": eng['name'],
            "designation": eng['designation'],
            "contact": eng['contact'],
            "email": eng['email'],
            "region": region,
            "reason_for_routing": " ".join(reasons)
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
