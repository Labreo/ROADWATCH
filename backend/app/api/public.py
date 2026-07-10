"""Public read-only GeoJSON API for external consumption.

Provides open access to road and complaint data in standard GeoJSON format.
No authentication required. Intended for civic tech integrations, journalists,
and third-party applications.

Endpoints:
    GET /api/v1/public/roads?bbox=...&region=...&limit=...
    GET /api/v1/public/complaints?region=...&status=...&limit=...
"""

from fastapi import APIRouter, HTTPException, Query
from app.services.database import db

router = APIRouter()


def _row_to_geojson_feature(row: dict, geom_col: str = 'geom') -> dict:
    """Convert a database row with WKT geometry to a GeoJSON feature."""
    wkt = row.get(geom_col)
    if not wkt:
        return None

    geometry = _wkt_to_geojson_geometry(wkt)
    if geometry is None:
        return None

    properties = {k: v for k, v in row.items() if k != geom_col}
    return {
        'type': 'Feature',
        'geometry': geometry,
        'properties': properties,
    }


def _wkt_to_geojson_geometry(wkt: str) -> dict:
    """Convert a WKT string to a GeoJSON geometry dict."""
    if wkt.startswith('POINT'):
        coords_str = wkt.replace('POINT (', '').replace('POINT(', '').replace(')', '')
        parts = coords_str.strip().split()
        if len(parts) >= 2:
            return {'type': 'Point', 'coordinates': [float(parts[0]), float(parts[1])]}
    elif wkt.startswith('LINESTRING'):
        coords_str = wkt.replace('LINESTRING (', '').replace('LINESTRING(', '').replace(')', '')
        points = []
        for pair in coords_str.strip().split(','):
            parts = pair.strip().split()
            if len(parts) >= 2:
                points.append([float(parts[0]), float(parts[1])])
        if points:
            return {'type': 'LineString', 'coordinates': points}
    return None


@router.get("/public/roads")
async def public_roads(
    bbox: str = Query(None, description="Bounding box: min_lon,min_lat,max_lon,max_lat"),
    region: str = Query(None, description="Region code filter (e.g., IN, US, GB, KE)"),
    limit: int = Query(100, ge=1, le=10000, description="Max records"),
    offset: int = Query(0, ge=0, description="Skip N records"),
):
    """Return roads as a GeoJSON FeatureCollection.

    Filters by bounding box (bbox) and/or region code.
    Bbox format: min_lon,min_lat,max_lon,max_lat (WGS84).
    """
    conditions = []
    params = []

    if bbox:
        parts = [float(x.strip()) for x in bbox.split(',')]
        if len(parts) != 4:
            raise HTTPException(status_code=400, detail="bbox requires 4 values: min_lon,min_lat,max_lon,max_lat")
        min_lon, min_lat, max_lon, max_lat = parts
        conditions.append("ST_Intersects(geom, ST_MakeEnvelope(%s, %s, %s, %s, 4326))")
        params.extend([min_lon, min_lat, max_lon, max_lat])

    if region:
        conditions.append("r.region_code = %s")
        params.append(region.upper())

    where_clause = " AND ".join(conditions) if conditions else "TRUE"

    sql = f"""
    SELECT r.id, r.name, r.road_code, r.status, r.road_type, r.length_km,
           r.created_at, r.updated_at, r.authority_id, r.geom
    FROM roads r
    WHERE {where_clause}
    ORDER BY r.id
    LIMIT %s OFFSET %s
    """
    params.extend([limit, offset])

    rows = db.query(sql, tuple(params))

    features = []
    for row in rows:
        feature = _row_to_geojson_feature(row, 'geom')
        if feature:
            # Normalize timestamps to ISO strings
            for ts_col in ('created_at', 'updated_at'):
                if ts_col in feature['properties'] and feature['properties'][ts_col] is not None:
                    feature['properties'][ts_col] = str(feature['properties'][ts_col])
            features.append(feature)

    return {
        'type': 'FeatureCollection',
        'features': features,
        'metadata': {
            'returned': len(features),
            'limit': limit,
            'offset': offset,
        },
    }


@router.get("/public/complaints")
async def public_complaints(
    region: str = Query(None, description="Region code filter (e.g., IN, US, GB, KE)"),
    status: str = Query(None, description="Filter by status: pending, routed, in_progress, resolved, rejected"),
    category: str = Query(None, description="Filter by category: pothole, paving_defect, waterlogging, debris, missing_signage"),
    limit: int = Query(100, ge=1, le=10000, description="Max records"),
    offset: int = Query(0, ge=0, description="Skip N records"),
):
    """Return complaints as a GeoJSON FeatureCollection.

    Filters by region, status, and/or category. No authentication required.
    """
    conditions = []
    params = []

    if region:
        conditions.append("c.region_code = %s")
        params.append(region.upper())

    if status:
        conditions.append("c.status = %s")
        params.append(status)

    if category:
        conditions.append("c.category = %s")
        params.append(category)

    where_clause = " AND ".join(conditions) if conditions else "TRUE"

    sql = f"""
    SELECT c.id, c.title, c.description, c.category, c.status,
           c.priority, c.escalation_level, c.created_at, c.updated_at,
           c.assigned_authority_id, c.road_id, c.image_url, c.citizen_contact,
           c.geom
    FROM complaints c
    WHERE {where_clause}
    ORDER BY c.created_at DESC
    LIMIT %s OFFSET %s
    """
    params.extend([limit, offset])

    rows = db.query(sql, tuple(params))

    features = []
    for row in rows:
        feature = _row_to_geojson_feature(row, 'geom')
        if feature:
            for ts_col in ('created_at', 'updated_at'):
                if ts_col in feature['properties'] and feature['properties'][ts_col] is not None:
                    feature['properties'][ts_col] = str(feature['properties'][ts_col])
            features.append(feature)

    return {
        'type': 'FeatureCollection',
        'features': features,
        'metadata': {
            'returned': len(features),
            'limit': limit,
            'offset': offset,
        },
    }


@router.get("/public/regions")
async def public_regions():
    """Return all regions with summary statistics."""
    rows = db.query("""
    SELECT r.code, r.name, r.default_currency, r.locale, r.timezone,
           COALESCE(rd.road_count, 0) AS road_count,
           COALESCE(cd.complaint_count, 0) AS complaint_count,
           COALESCE(ctd.contractor_count, 0) AS contractor_count
    FROM regions r
    LEFT JOIN (SELECT a.region_code, COUNT(*) AS road_count FROM roads r2
               JOIN authorities a ON r2.authority_id = a.id
               GROUP BY a.region_code) rd ON rd.region_code = r.code
    LEFT JOIN (SELECT region_code, COUNT(*) AS complaint_count FROM complaints GROUP BY region_code) cd ON cd.region_code = r.code
    LEFT JOIN (SELECT region_code, COUNT(*) AS contractor_count FROM projects p
               JOIN contractors c ON p.contractor_id = c.id
               GROUP BY region_code) ctd ON ctd.region_code = r.code
    ORDER BY r.code
    """)
    return rows
