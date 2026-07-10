"""
ROADWATCH OSM Road Import ETL (Enhanced)
Fetches road data from OpenStreetMap via Overpass API for any city or region.

Usage:
    python scripts/import_osm.py --regions US,GB,KE          # Predefined regions
    python scripts/import_osm.py --bbox 42.20,-83.20,42.50,-82.90 --city-name "Detroit"
    python scripts/import_osm.py --bbox 51.50,-0.22,51.60,0.00 --city-name London --country-code GB
    python scripts/import_osm.py --regions KE --dry-run

Auto-creates region entry if new. Auto-classifies road_type from OSM highway tags.
Logs import stats to region_import_log table.

Requirements: overpy, psycopg2-binary, shapely
    pip install overpy psycopg2-binary shapely
"""

import os
import sys
import argparse
import math
from datetime import datetime, timezone
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    import overpy
except ImportError:
    overpy = None
    print("ERROR: 'overpy' not installed. Run: pip install overpy")

from app.services.database import db

# ── OSM highway tag → road_type mapping ──────────────────────────────
HIGHWAY_TO_ROAD_TYPE = {
    'motorway': 'Motorway',
    'motorway_link': 'Motorway',
    'trunk': 'NH',
    'trunk_link': 'NH',
    'primary': 'SH',
    'primary_link': 'SH',
    'secondary': 'MDR',
    'secondary_link': 'MDR',
    'tertiary': 'City',
    'tertiary_link': 'City',
    'residential': 'Local',
    'service': 'Local',
    'living_street': 'Local',
    'unclassified': 'City',
}

# ── Predefined region configurations ─────────────────────────────────
REGIONS_CONFIG = {
    'US': {
        'name': 'United States',
        'country_code': 'US',
        'default_currency': 'USD',
        'locale': 'en-US',
        'timezone': 'America/Detroit',
        'bbox': (42.20, -83.20, 42.50, -82.90),
        'highway_types': ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential'],
        'authority_map': {
            'motorway': 'FHWA-MI',
            'trunk': 'FHWA-MI',
            'primary': 'MDOT-LAN',
            'secondary': 'MDOT-LAN',
            'tertiary': 'DPW-DET',
            'residential': 'DPW-DET',
        },
        'default_authority_code': 'DPW-DET',
    },
    'GB': {
        'name': 'United Kingdom',
        'country_code': 'GB',
        'default_currency': 'GBP',
        'locale': 'en-GB',
        'timezone': 'Europe/London',
        'bbox': (51.50, -0.22, 51.60, 0.00),
        'highway_types': ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential'],
        'authority_map': {
            'motorway': 'NH-SE',
            'trunk': 'NH-SE',
            'primary': 'LHJC-LON',
            'secondary': 'LHJC-LON',
            'tertiary': 'CBC-HIGHWAYS',
            'residential': 'CBC-HIGHWAYS',
        },
        'default_authority_code': 'CBC-HIGHWAYS',
    },
    'KE': {
        'name': 'Kenya',
        'country_code': 'KE',
        'default_currency': 'KES',
        'locale': 'en-KE',
        'timezone': 'Africa/Nairobi',
        'bbox': (-1.40, 36.65, -1.15, 37.00),
        'highway_types': ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential'],
        'authority_map': {
            'motorway': 'KeNHA-HQ',
            'trunk': 'KeNHA-HQ',
            'primary': 'KURA-HQ',
            'secondary': 'KURA-HQ',
            'tertiary': 'NCC-ROADS',
            'residential': 'NCC-ROADS',
        },
        'default_authority_code': 'NCC-ROADS',
    },
}


def classify_road_type(highway_tag: str) -> str:
    """Map OSM highway tag to the road_type enum in the roads table."""
    return HIGHWAY_TO_ROAD_TYPE.get(highway_tag, 'City')


def build_overpass_query(bbox: tuple, highway_types: list) -> str:
    south, west, north, east = bbox
    highway_filter = '|'.join(highway_types)
    return f"""
    [out:json][timeout:90];
    (
      way["highway"~"^{highway_filter}$"]({south},{west},{north},{east});
    );
    out body;
    >;
    out skel qt;
    """


def ensure_region(region_code: str, region_name: str, country_code: str,
                  default_currency: str = 'USD', locale: str = 'en-US',
                  timezone: str = 'UTC') -> bool:
    """Create region entry if it doesn't exist. Returns True if created."""
    existing = db.query("SELECT code FROM regions WHERE code = %s", (region_code,))
    if existing:
        return False
    sql = """
    INSERT INTO regions (code, name, default_currency, locale, timezone)
    VALUES (%s, %s, %s, %s, %s)
    """
    db.execute(sql, (region_code, region_name, default_currency, locale, timezone))
    print(f"  Created new region: {region_code} ({region_name})")
    return True


def get_authority_id(department_code: str) -> Optional[int]:
    sql = "SELECT id FROM authorities WHERE department_code = %s"
    results = db.query(sql, (department_code,))
    return results[0]['id'] if results else None


def get_osm_road_name(tags: dict) -> str:
    return tags.get('name', '') or tags.get('ref', '') or f"Unnamed {tags.get('highway', 'road')}"


def get_road_code(tags: dict) -> str:
    ref = tags.get('ref', '')
    if ref:
        return f"OSM-{ref}"
    return f"OSM-{tags.get('highway', 'road').upper()[:4]}-{abs(hash(str(tags))) % 10000}"


def coords_to_linestring_wkt(coords: list) -> str:
    points = [f"{lon} {lat}" for lat, lon in coords]
    return f"LINESTRING({', '.join(points)})"


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return 6371.0 * c


def import_bbox(region_code: str, region_name: str, country_code: str,
                bbox: tuple, highway_types: list, authority_map: dict,
                default_authority_code: str, dry_run: bool = False,
                currency: str = 'USD', locale: str = 'en-US',
                tz: str = 'UTC') -> dict:
    """
    Import roads from OSM for a given bounding box.
    Auto-creates region if new. Classifies road_type from highway tag.
    """
    if overpy is None:
        return {'region': region_code, 'status': 'error', 'error': 'overpy not installed',
                'imported': 0, 'skipped': 0, 'errors': 0}

    print(f"\n{'='*60}")
    print(f"Importing {region_name} ({region_code})")
    print(f"  Bounding box: {bbox}")
    print(f"{'='*60}")

    if not dry_run:
        ensure_region(region_code, region_name, country_code, currency, locale, tz)

    api = overpy.Overpass()
    query = build_overpass_query(bbox, highway_types)
    print(f"  Querying Overpass API...")

    try:
        result = api.query(query)
    except Exception as e:
        print(f"  ERROR: Overpass query failed: {e}")
        return {'region': region_code, 'status': 'error', 'error': str(e),
                'imported': 0, 'skipped': 0, 'errors': 0}

    ways = result.ways
    print(f"  Found {len(ways)} ways")

    imported = 0
    skipped = 0
    errors = 0

    for way in ways:
        tags = way.tags
        highway_type = tags.get('highway', '')

        if not highway_type or highway_type not in highway_types:
            skipped += 1
            continue

        if len(way.nodes) < 2:
            skipped += 1
            continue

        name = get_osm_road_name(tags)
        road_code = get_road_code(tags)
        road_type = classify_road_type(highway_type)
        coords = [(float(node.lat), float(node.lon)) for node in way.nodes]

        length_km = sum(
            haversine_km(coords[i-1][0], coords[i-1][1], coords[i][0], coords[i][1])
            for i in range(1, len(coords))
        )

        if length_km < 0.01:
            skipped += 1
            continue

        authority_code = authority_map.get(highway_type, default_authority_code)
        authority_id = get_authority_id(authority_code)

        if not authority_id:
            print(f"  WARNING: No authority found for {authority_code}, skipping {name}")
            skipped += 1
            continue

        linestring_wkt = coords_to_linestring_wkt(coords)

        if dry_run:
            print(f"  [DRY-RUN] Would insert: {name} ({road_code}) | {highway_type} → {road_type} | {length_km:.2f} km | {authority_code}")
            imported += 1
            continue

        check_sql = "SELECT id FROM roads WHERE road_code = %s"
        existing = db.query(check_sql, (road_code,))
        if existing:
            skipped += 1
            continue

        insert_sql = """
        INSERT INTO roads (name, road_code, status, length_km, road_type, authority_id, geom)
        VALUES (%s, %s, 'fair', %s, %s, %s, ST_GeomFromText(%s, 4326))
        """
        params = (name, road_code, round(length_km, 2), road_type, authority_id, linestring_wkt)

        try:
            new_id = db.execute(insert_sql, params)
            if new_id:
                imported += 1
                if imported % 10 == 0:
                    print(f"    Progress: {imported} roads imported...")
        except Exception as e:
            print(f"    ERROR inserting {name}: {e}")
            errors += 1

    # Log import run
    if not dry_run:
        log_sql = """
        INSERT INTO region_import_log (region_code, source, roads_imported, roads_skipped, roads_errors)
        VALUES (%s, 'osm', %s, %s, %s)
        """
        db.execute(log_sql, (region_code, imported, skipped, errors))

    print(f"\n  Summary for {region_code}: {imported} imported, {skipped} skipped, {errors} errors")
    return {
        'region': region_code,
        'status': 'ok',
        'imported': imported,
        'skipped': skipped,
        'errors': errors,
    }


def import_region(region_code: str, dry_run: bool = False) -> dict:
    """Import using predefined region config."""
    cfg = REGIONS_CONFIG[region_code]
    return import_bbox(
        region_code=region_code,
        region_name=cfg['name'],
        country_code=cfg['country_code'],
        bbox=cfg['bbox'],
        highway_types=cfg['highway_types'],
        authority_map=cfg['authority_map'],
        default_authority_code=cfg['default_authority_code'],
        dry_run=dry_run,
        currency=cfg['default_currency'],
        locale=cfg['locale'],
        tz=cfg['timezone'],
    )


def main():
    parser = argparse.ArgumentParser(description='Enhanced OSM road data import for any city or region')
    parser.add_argument('--regions', type=str, default=None,
                        help='Comma-separated region codes (US,GB,KE)')
    parser.add_argument('--bbox', type=str, default=None,
                        help='Bounding box: south,west,north,east (e.g., "42.20,-83.20,42.50,-82.90")')
    parser.add_argument('--city-name', type=str, default=None,
                        help='City name for new region (implies --bbox)')
    parser.add_argument('--country-code', type=str, default='XX',
                        help='ISO 3166-1 alpha-2 country code for new region (default: XX)')
    parser.add_argument('--currency', type=str, default='USD',
                        help='Default currency code (default: USD)')
    parser.add_argument('--locale', type=str, default='en-US',
                        help='Locale string (default: en-US)')
    parser.add_argument('--timezone', type=str, default='UTC',
                        help='Timezone (default: UTC)')
    parser.add_argument('--highway-types', type=str, default=None,
                        help='Comma-separated OSM highway types (default: all)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Preview without inserting into database')
    args = parser.parse_args()

    if not args.regions and not args.bbox and not args.city_name:
        parser.print_help()
        print("\nERROR: Specify --regions, --bbox, or --city-name")
        sys.exit(1)

    default_highway_types = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential']

    if args.regions:
        region_codes = [r.strip().upper() for r in args.regions.split(',') if r.strip().upper() in REGIONS_CONFIG]
        if not region_codes:
            print(f"No valid regions specified. Choose from: {', '.join(REGIONS_CONFIG.keys())}")
            sys.exit(1)
    else:
        region_codes = None

    if args.highway_types:
        highway_types = [t.strip() for t in args.highway_types.split(',')]
    else:
        highway_types = default_highway_types

    print(f"ROADWATCH OSM Road Import ETL (Enhanced)")
    print(f"Mode: {'DRY-RUN' if args.dry_run else 'LIVE'}")

    total = {'imported': 0, 'skipped': 0, 'errors': 0}

    if region_codes:
        for code in region_codes:
            result = import_region(code, dry_run=args.dry_run)
            for key in ['imported', 'skipped', 'errors']:
                total[key] += result.get(key, 0)
    elif args.bbox:
        bbox = tuple(float(x.strip()) for x in args.bbox.split(','))
        if len(bbox) != 4:
            print("ERROR: --bbox requires exactly 4 values: south,west,north,east")
            sys.exit(1)
        city_name = args.city_name or f"Region-{bbox[0]:.2f}x{bbox[2]:.2f}"
        region_code = args.country_code.upper()
        if region_code == 'XX' and args.city_name:
            region_code = args.city_name[:2].upper()

        result = import_bbox(
            region_code=region_code,
            region_name=city_name,
            country_code=region_code,
            bbox=bbox,
            highway_types=highway_types,
            authority_map={},
            default_authority_code='',
            dry_run=args.dry_run,
            currency=args.currency,
            locale=args.locale,
            tz=args.timezone,
        )
        for key in ['imported', 'skipped', 'errors']:
            total[key] += result.get(key, 0)

    print(f"\n{'='*60}")
    print(f"TOTAL: {total['imported']} imported, {total['skipped']} skipped, {total['errors']} errors")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
