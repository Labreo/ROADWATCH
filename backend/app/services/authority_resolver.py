from typing import Optional, Callable
from app.services.database import db

BOUNDARY_ALERT_THRESHOLD_M: float = 50.0

# Callback for boundary alerts (set by complaints.py at runtime to avoid circular imports)
_on_boundary_alert: Optional[Callable] = None

def set_boundary_alert_callback(callback: Callable):
    global _on_boundary_alert
    _on_boundary_alert = callback


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
    def resolve_authority_for_coordinates(lon: float, lat: float, exclude_authority_ids: list = None, region_code: str = None):
        """
        Resolves authority using PostGIS ST_Contains.
        1. If region_code provided, queries only that region's authorities (skip regions table lookup)
        2. Otherwise queries regions table bounding boxes for fast country filter
        3. Queries authorities where ST_Contains(geom_boundary, point) is true
        4. Smallest boundary wins (most granular jurisdiction)
        5. Falls back to region default if no boundary match
        6. Skips authorities in exclude_authority_ids (for reassignment)
        """
        if exclude_authority_ids is None:
            exclude_authority_ids = []

        if region_code is None:
            region = AuthorityResolver.get_region_for_coordinates(lon, lat)
            region_code = region['code'] if region else 'IN'

        point_wkt = f"POINT({lon} {lat})"

        # Build exclusion clause
        exclude_clause = ""
        if exclude_authority_ids:
            placeholders = ",".join(str(int(x)) for x in exclude_authority_ids)
            exclude_clause = f" AND a.id NOT IN ({placeholders})"

        # Build region filter clause
        region_filter = ""
        params = [point_wkt]
        if region_code:
            region_filter = " AND a.region_code = %s"
            params.append(region_code)

        sql = f"""
        SELECT a.*, r.name as region_name, r.default_currency, r.locale, r.phone_format
        FROM authorities a
        LEFT JOIN regions r ON a.region_code = r.code
        WHERE ST_Contains(a.geom_boundary, ST_GeomFromText(%s, 4326)) = true
          AND a.geom_boundary IS NOT NULL
          {region_filter}
          {exclude_clause}
        ORDER BY ST_Area(a.geom_boundary) ASC
        LIMIT 1
        """
        results = db.query(sql, tuple(params))
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
    def resolve_authority_for_region(region_code: str, lon: float, lat: float):
        """
        Resolves authority for coordinates within a specific region.
        Passes region_code to resolve_authority_for_coordinates which
        narrows the spatial query to that region's authorities.

        Returns the resolved authority dict or a hardcoded fallback.
        """
        return AuthorityResolver.resolve_authority_for_coordinates(
            lon, lat, exclude_authority_ids=None, region_code=region_code
        )

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
    def resolve_with_routing_details(lon: float, lat: float, road_name: str = None, region_code: str = None) -> dict:
        """One-call: resolve authority for coordinates + build routing details."""
        authority = AuthorityResolver.resolve_authority_for_coordinates(lon, lat, region_code=region_code)
        if region_code:
            region = AuthorityResolver.get_region_by_code(region_code)
        else:
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
    def check_boundary_proximity(lon: float, lat: float, primary_authority_id: int) -> dict:
        """
        B6: Check if a point is within 50m of an authority boundary.
        If so, find the nearest adjacent authority and return alert info.

        Returns:
            {
                "near_boundary": bool,
                "boundary_distance_meters": float,
                "secondary_authority": dict or None,
                "secondary_authority_id": int or None,
            }
        """
        point_wkt = f"POINT({lon} {lat})"
        sql = """
        SELECT
            ST_Distance(
                ST_GeomFromText(%s, 4326)::geography,
                ST_Boundary(a.geom_boundary)::geography
            ) AS boundary_distance_meters
        FROM authorities a
        WHERE a.id = %s AND a.geom_boundary IS NOT NULL
        """
        results = db.query(sql, (point_wkt, primary_authority_id))
        if not results or results[0].get("boundary_distance_meters") is None:
            return {"near_boundary": False}

        distance = float(results[0]["boundary_distance_meters"])

        if distance > BOUNDARY_ALERT_THRESHOLD_M:
            return {"near_boundary": False}

        # Find adjacent authority (nearest one that doesn't contain the point)
        adj_sql = """
        SELECT a.id, a.name, a.department_code, a.contact_email, a.contact_phone,
               r.name AS region_name, r.code AS region_code,
               ST_Distance(
                   ST_GeomFromText(%s, 4326)::geography,
                   a.geom_boundary::geography
               ) AS distance_to_boundary
        FROM authorities a
        LEFT JOIN regions r ON a.region_code = r.code
        WHERE a.id != %s
          AND a.geom_boundary IS NOT NULL
          AND NOT ST_Contains(a.geom_boundary, ST_GeomFromText(%s, 4326))
        ORDER BY ST_Distance(
            ST_GeomFromText(%s, 4326)::geography,
            a.geom_boundary::geography
        ) ASC
        LIMIT 1
        """
        adjacent = db.query(adj_sql, (point_wkt, primary_authority_id, point_wkt, point_wkt))

        secondary = None
        if adjacent:
            adj = adjacent[0]
            secondary = {
                "id": adj["id"],
                "name": adj["name"],
                "department_code": adj.get("department_code"),
                "contact_email": adj.get("contact_email"),
                "contact_phone": adj.get("contact_phone"),
                "region_name": adj.get("region_name"),
                "region_code": adj.get("region_code"),
            }

        return {
            "near_boundary": True,
            "boundary_distance_meters": round(distance, 2),
            "secondary_authority": secondary,
            "secondary_authority_id": secondary["id"] if secondary else None,
        }

    @staticmethod
    def resolve_with_boundary_alert(lon: float, lat: float, region_code: str = None) -> dict:
        """
        B6: One-call resolver that also checks boundary proximity.
        Returns routing details + boundary alert info.
        """
        authority = AuthorityResolver.resolve_authority_for_coordinates(lon, lat, region_code=region_code)
        if not authority:
            return {"authority": None, "boundary_alert": None}

        routing = AuthorityResolver.build_routing_details(
            authority, region_name=None, lon=lon, lat=lat
        )

        boundary_info = AuthorityResolver.check_boundary_proximity(
            lon, lat, authority.get("id", 4)
        )

        # Fire boundary alert callback if near boundary
        if boundary_info.get("near_boundary") and _on_boundary_alert:
            try:
                _on_boundary_alert(
                    authority_id=authority.get("id"),
                    secondary_authority=boundary_info.get("secondary_authority"),
                    boundary_distance_m=boundary_info["boundary_distance_meters"],
                    lon=lon,
                    lat=lat,
                )
            except Exception:
                pass

        return {
            "authority": routing,
            "boundary_alert": boundary_info if boundary_info.get("near_boundary") else None,
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
