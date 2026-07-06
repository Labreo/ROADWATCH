from app.services.database import db

class AuthorityResolver:
    _global_authorities = {
        11: {
            'id': 11,
            'name': "Detroit Department of Public Works (DPW)",
            'department_code': "DPW-DET",
            'contact_email': "dpw.dispatch@detroitmi.gov",
            'contact_phone': "+1-313-224-3901",
            'region_code': 'US'
        },
        12: {
            'id': 12,
            'name': "Michigan Department of Transportation (MDOT)",
            'department_code': "MDOT-LAN",
            'contact_email': "mdot-info@michigan.gov",
            'contact_phone': "+1-517-373-2064",
            'region_code': 'US'
        },
        13: {
            'id': 13,
            'name': "Federal Highway Administration (FHWA) - Michigan Division",
            'department_code': "FHWA-MI",
            'contact_email': "michigan.fhwa@dot.gov",
            'contact_phone': "+1-517-706-3100",
            'region_code': 'US'
        },
        21: {
            'id': 21,
            'name': "Camden Borough Council - Highways Division",
            'department_code': "CBC-HIGHWAYS",
            'contact_email': "highways@camden.gov.uk",
            'contact_phone': "+44-20-7974-4444",
            'region_code': 'GB'
        },
        22: {
            'id': 22,
            'name': "London Highways Joint Committee",
            'department_code': "LHJC-LON",
            'contact_email': "enquiries@lhjc.org.uk",
            'contact_phone': "+44-20-7934-9999",
            'region_code': 'GB'
        },
        23: {
            'id': 23,
            'name': "National Highways - South East Division",
            'department_code': "NH-SE",
            'contact_email': "info@nationalhighways.co.uk",
            'contact_phone': "+44-300-123-5000",
            'region_code': 'GB'
        },
        31: {
            'id': 31,
            'name': "Nairobi City County - Department of Roads & Transport",
            'department_code': "NCC-ROADS",
            'contact_email': "roads@nairobi.go.ke",
            'contact_phone': "+254-20-2224281",
            'region_code': 'KE'
        },
        32: {
            'id': 32,
            'name': "Kenya Urban Roads Authority (KURA)",
            'department_code': "KURA-HQ",
            'contact_email': "info@kura.go.ke",
            'contact_phone': "+254-20-8013844",
            'region_code': 'KE'
        },
        33: {
            'id': 33,
            'name': "Kenya National Highways Authority (KeNHA)",
            'department_code': "KeNHA-HQ",
            'contact_email': "dg@kenha.co.ke",
            'contact_phone': "+254-20-4971200",
            'region_code': 'KE'
        }
    }

    @staticmethod
    def get_region_for_coordinates(lon: float, lat: float) -> str:
        """
        Custom containment check to return local regional identifiers based on geographic coordinate intersections.
        - 'US' for United States
        - 'GB' for United Kingdom
        - 'KE' for Kenya
        - 'IN' for India (Default/Domestic)
        """
        # United States
        if -125.0 <= lon <= -66.9 and 24.5 <= lat <= 49.4:
            return 'US'
        # United Kingdom
        if -8.6 <= lon <= 1.8 and 49.8 <= lat <= 60.9:
            return 'GB'
        # Kenya
        if 33.8 <= lon <= 41.9 and -4.7 <= lat <= 5.5:
            return 'KE'
        # India Bounding Box
        if 68.1 <= lon <= 97.4 and 6.8 <= lat <= 35.7:
            return 'IN'
            
        return 'IN' # Fallback domestic template

    @staticmethod
    def get_authority_by_id(authority_id: int):
        if authority_id in AuthorityResolver._global_authorities:
            auth = dict(AuthorityResolver._global_authorities[authority_id])
            auth.setdefault('geom_boundary', None)
            auth.setdefault('created_at', None)
            auth.setdefault('updated_at', None)
            return auth
        sql = "SELECT * FROM authorities WHERE id = ?"
        results = db.query(sql, (authority_id,))
        if results:
            res = dict(results[0])
            res['region_code'] = 'IN'
            return res
        return None

    @staticmethod
    def resolve_authority_for_coordinates(lon: float, lat: float):
        """
        Queries authorities boundaries to see which POLYGON contains the (lon, lat) Point.
        Prefers specific municipal wards (smaller boundaries) over state/national highway boundaries if overlapping.
        For international coordinates outside municipal limits, resolves region instantly.
        """
        region = AuthorityResolver.get_region_for_coordinates(lon, lat)
        
        if region != 'IN':
            if region == 'US':
                min_lng, max_lng = -125.0, -66.9
                ids = [11, 12, 13]
            elif region == 'GB':
                min_lng, max_lng = -8.6, 1.8
                ids = [21, 22, 23]
            else: # KE
                min_lng, max_lng = 33.8, 41.9
                ids = [31, 32, 33]
                
            fraction = (lon - min_lng) / (max_lng - min_lng) if (max_lng - min_lng) > 0 else 0.5
            if fraction < 0.33:
                auth_id = ids[0]
            elif fraction >= 0.66:
                auth_id = ids[2]
            else:
                auth_id = ids[1]
                
            auth = dict(AuthorityResolver._global_authorities[auth_id])
            auth.setdefault('geom_boundary', None)
            auth.setdefault('created_at', None)
            auth.setdefault('updated_at', None)
            return auth

        point_wkt = f"POINT({lon} {lat})"
        
        # We query authorities where boundary contains the point
        sql = """
        SELECT * FROM authorities 
        WHERE ST_Contains(geom_boundary, ST_GeomFromText(?, 4326)) = true
        """
        results = db.query(sql, (point_wkt,))
        if not results:
            # Invariant fallback: PWD-MUM (ID 4)
            pwd_auth = AuthorityResolver.get_authority_by_id(4)
            return pwd_auth
            
        # We sort MCGM wards first, as state/national boundaries cover the whole city
        # Wards MCGM-KW, MCGM-FN, MCGM-HE have smaller, more local boundaries
        results_sorted = sorted(
            results, 
            key=lambda a: 0 if a['department_code'].startswith('MCGM') else 1
        )
        res = dict(results_sorted[0])
        res['region_code'] = 'IN'
        return res

    @staticmethod
    def list_all_authorities():
        sql = "SELECT id, name, department_code, contact_email, contact_phone, geom_boundary, created_at, updated_at FROM authorities"
        res = db.query(sql)
        out = []
        for r in res:
            d = dict(r)
            d['region_code'] = 'IN'
            out.append(d)
        for auth in AuthorityResolver._global_authorities.values():
            d = dict(auth)
            d.setdefault('geom_boundary', None)
            d.setdefault('created_at', None)
            d.setdefault('updated_at', None)
            out.append(d)
        return out
