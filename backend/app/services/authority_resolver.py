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
            res['match_type'] = 'exact_boundary'
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
            res['match_type'] = 'region_fallback'
            return res

        # Final fallback — skip if excluded
        final_sql = "SELECT * FROM authorities WHERE id = 4"
        if 4 not in exclude_authority_ids:
            final = db.query(final_sql)
            if final:
                res = dict(final[0])
                res['region_code'] = 'IN'
                res['match_type'] = 'hardcoded_fallback'
                return res

        return {
            'id': 4, 'name': 'State Public Works Department - Mumbai Division',
            'department_code': 'PWD-MUM', 'contact_email': 'se.mumbai@pwd.gov.in',
            'contact_phone': '+91-22-2202-3333', 'region_code': 'IN',
            'geom_boundary': None, 'created_at': None, 'updated_at': None,
            'match_type': 'hardcoded_fallback'
        }

    @staticmethod
    def resolve_authority_with_auto_reassign(lon: float, lat: float, declined_authority_ids: list = None) -> dict:
        """
        Resolves authority excluding already-declined authorities.
        If no authority is found (all excluded), escalates to region-level default.
        Returns the new authority + a 'reason_for_reassign' field explaining why.
        """
        if declined_authority_ids is None:
            declined_authority_ids = []

        original_count = len(declined_authority_ids)

        authority = AuthorityResolver.resolve_authority_for_coordinates(
            lon, lat, exclude_authority_ids=declined_authority_ids
        )

        is_escalation = original_count > 0
        is_fallback = False

        if not authority or not authority.get('id'):
            # Fallback to region-level default authority
            region = AuthorityResolver.get_region_for_coordinates(lon, lat)
            region_code = region['code'] if region else 'IN'

            sql = """
            SELECT a.*, r.name as region_name, r.default_currency, r.locale, r.phone_format
            FROM authorities a
            LEFT JOIN regions r ON a.region_code = r.code
            WHERE a.region_code = %s
            ORDER BY a.id ASC
            LIMIT 1
            """
            results = db.query(sql, (region_code,))
            if results:
                authority = dict(results[0])
                authority.setdefault('region_code', region_code)
                authority['match_type'] = 'region_fallback'
                is_fallback = True
            else:
                # Ultimate fallback — hardcoded default
                authority = {
                    'id': 4, 'name': 'State Public Works Department - Mumbai Division',
                    'department_code': 'PWD-MUM', 'contact_email': 'se.mumbai@pwd.gov.in',
                    'contact_phone': '+91-22-2202-3333', 'region_code': 'IN',
                    'geom_boundary': None, 'created_at': None, 'updated_at': None,
                    'match_type': 'hardcoded_fallback'
                }
                is_fallback = True

        # Build reason_for_reassign
        if is_fallback:
            reason = (
                f"All previously assigned authorities have declined this complaint. "
                f"Escalated to region-level default: {authority.get('name', 'Unknown')}."
            )
        elif is_escalation:
            declined_names = []
            for aid in declined_authority_ids:
                a = AuthorityResolver.get_authority_by_id(aid)
                declined_names.append(a['name'] if a else f"Authority #{aid}")
            reason = (
                f"Reassigned from {', '.join(declined_names)}. "
                f"New authority: {authority.get('name', 'Unknown')}."
            )
        else:
            reason = f"Initial authority assignment: {authority.get('name', 'Unknown')}."

        authority['reason_for_reassign'] = reason
        return authority

    @staticmethod
    def _calculate_spatial_metrics(lon: float, lat: float, authority_id: int, buffer_radius_m: int = 100) -> dict:
        """
        Calculate spatial metrics for authority routing confidence.
        - boundary_distance_meters: distance in meters from point to nearest boundary edge
        - area_match_percentage: what percentage of a 100m buffer around the point
          overlaps with the authority boundary
        """
        point_wkt = f"POINT({lon} {lat})"
        sql = """
        SELECT
            ROUND(ST_Distance(
                ST_GeomFromText(%s, 4326)::geography,
                ST_Boundary(a.geom_boundary)::geography
            )::numeric, 2) AS boundary_distance_meters,
            CASE
                WHEN ST_Contains(a.geom_boundary, ST_GeomFromText(%s, 4326))
                THEN ROUND(
                    (ST_Area(ST_Intersection(
                        ST_Buffer(ST_GeomFromText(%s, 4326)::geography, %s)::geometry,
                        a.geom_boundary
                    )) / NULLIF(ST_Area(ST_Buffer(ST_GeomFromText(%s, 4326)::geography, %s)::geometry), 0)) * 100::numeric, 2
                )
                ELSE 0.0
            END AS area_match_percentage
        FROM authorities a
        WHERE a.id = %s AND a.geom_boundary IS NOT NULL
        """
        params = (point_wkt, point_wkt, point_wkt, buffer_radius_m, point_wkt, buffer_radius_m, authority_id)
        results = db.query(sql, params)

        if results and results[0].get('boundary_distance_meters') is not None:
            return {
                'area_match_percentage': float(results[0]['area_match_percentage']),
                'boundary_distance_meters': float(results[0]['boundary_distance_meters']),
            }

        return {'area_match_percentage': None, 'boundary_distance_meters': None}

    @staticmethod
    def resolve_with_routing_details(lon: float, lat: float, road_name: str = None) -> dict:
        """One-call: resolve authority for coordinates + build routing details."""
        authority = AuthorityResolver.resolve_authority_for_coordinates(lon, lat)
        region = AuthorityResolver.get_region_for_coordinates(lon, lat)
        region_name = region.get('name') if region else None
        return AuthorityResolver.build_routing_details(authority, road_name, region_name, lon, lat)

    @staticmethod
    def build_routing_details(authority: dict, road_name: str = None, region_name: str = None, lon: float = None, lat: float = None) -> dict:
        """
        Build a human-readable routing_details payload from resolved authority.
        Includes executive engineer info, fallback for unknown authorities.
        Now includes routing_confidence, area_match_percentage, boundary_distance_meters.

        Confidence levels:
          - HIGH: exact ST_Contains boundary match
          - MEDIUM: fallback to region-level default
          - LOW: hardcoded fallback (no authoritative boundary match)
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

        # Determine match type and confidence
        match_type = authority.get('match_type', 'region_fallback')
        if match_type == 'exact_boundary':
            routing_confidence = 'HIGH'
        elif match_type == 'region_fallback':
            routing_confidence = 'MEDIUM'
        else:  # hardcoded_fallback
            routing_confidence = 'LOW'

        # Calculate spatial metrics when coordinates are available
        area_match_percentage = None
        boundary_distance_meters = None
        if lon is not None and lat is not None and match_type == 'exact_boundary':
            metrics = AuthorityResolver._calculate_spatial_metrics(lon, lat, auth_id)
            area_match_percentage = metrics['area_match_percentage']
            boundary_distance_meters = metrics['boundary_distance_meters']

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
            "reason_for_routing": " ".join(reasons),
            "routing_confidence": routing_confidence,
            "area_match_percentage": area_match_percentage,
            "boundary_distance_meters": boundary_distance_meters
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
