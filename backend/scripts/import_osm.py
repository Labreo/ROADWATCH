"""
ROADWATCH OSM Road Import ETL
Fetches road data from OpenStreetMap via Overpass API for international regions.

Usage:
    python scripts/import_osm.py                          # Import all regions
    python scripts/import_osm.py --regions US,GB           # Import specific regions
    python scripts/import_osm.py --dry-run                 # Preview without inserting
    python scripts/import_osm.py --regions KE --dry-run    # Preview KE only

Requirements: overpy, psycopg2-binary, shapely
    pip install overpy psycopg2-binary shapely
"""

import os
import sys
import argparse
import math
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    import overpy
except ImportError:
    overpy = None
    print("ERROR: 'overpy' not installed. Run: pip install overpy")

from app.services.database import db

REGIONS_CONFIG = {
    'US': {
        'name': 'United States',
        'bbox': (42.20, -83.20, 42.50, -82.90),  # Detroit area (south, west, north, east)
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
        'bbox': (51.50, -0.22, 51.60, 0.00),  # Camden / Central London (south, west, north, east)
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
        'bbox': (-1.40, 36.65, -1.15, 37.00),  # Nairobi (south, west, north, east)
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


def build_overpass_query(region_code: str) -> str:
    cfg = REGIONS_CONFIG[region_code]
    south, west, north, east = cfg['bbox']
    highway_filter = '|'.join(cfg['highway_types'])
    return f"""
    [out:json][timeout:60];
    (
      way["highway"~"^{highway_filter}$"]({south},{west},{north},{east});
    );
    out body;
    >;
    out skel qt;
    """


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


def import_region(region_code: str, dry_run: bool = False) -> dict:
    if overpy is None:
        return {'region': region_code, 'status': 'error', 'error': 'overpy not installed', 'imported': 0, 'skipped': 0}

    cfg = REGIONS_CONFIG[region_code]
    print(f"\n{'='*60}")
    print(f"Importing {cfg['name']} ({region_code})")
    print(f"  Bounding box: {cfg['bbox']}")
    print(f"{'='*60}")

    api = overpy.Overpass()
    query = build_overpass_query(region_code)
    print(f"  Querying Overpass API...")

    try:
        result = api.query(query)
    except Exception as e:
        print(f"  ERROR: Overpass query failed: {e}")
        return {'region': region_code, 'status': 'error', 'error': str(e), 'imported': 0, 'skipped': 0}

    ways = result.ways
    print(f"  Found {len(ways)} ways")

    imported = 0
    skipped = 0
    errors = 0

    for way in ways:
        tags = way.tags
        highway_type = tags.get('highway', '')

        if not highway_type:
            skipped += 1
            continue

        if len(way.nodes) < 2:
            skipped += 1
            continue

        name = get_osm_road_name(tags)
        road_code = get_road_code(tags)
        coords = [(float(node.lat), float(node.lon)) for node in way.nodes]

        length_km = 0.0
        for i in range(1, len(coords)):
            lat1, lon1 = coords[i - 1]
            lat2, lon2 = coords[i]
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
            c = 2 * math.asin(math.sqrt(a))
            length_km += 6371.0 * c

        if length_km < 0.01:
            skipped += 1
            continue

        authority_code = cfg['authority_map'].get(highway_type, cfg['default_authority_code'])
        authority_id = get_authority_id(authority_code)

        if not authority_id:
            print(f"  WARNING: No authority found for {authority_code}, skipping {name}")
            skipped += 1
            continue

        linestring_wkt = coords_to_linestring_wkt(coords)

        if dry_run:
            print(f"  [DRY-RUN] Would insert: {name} ({road_code}) | {highway_type} | {length_km:.2f} km | {authority_code}")
            imported += 1
            continue

        check_sql = "SELECT id FROM roads WHERE road_code = %s"
        existing = db.query(check_sql, (road_code,))
        if existing:
            skipped += 1
            continue

        insert_sql = """
        INSERT INTO roads (name, road_code, status, length_km, authority_id, geom)
        VALUES (%s, %s, 'fair', %s, %s, ST_GeomFromText(%s, 4326))
        """
        params = (name, road_code, round(length_km, 2), authority_id, linestring_wkt)

        try:
            new_id = db.execute(insert_sql, params)
            if new_id:
                imported += 1
                if imported % 10 == 0:
                    print(f"    Progress: {imported} roads imported...")
        except Exception as e:
            print(f"    ERROR inserting {name}: {e}")
            errors += 1

    print(f"\n  Summary for {region_code}: {imported} imported, {skipped} skipped, {errors} errors")
    return {
        'region': region_code,
        'status': 'ok',
        'imported': imported,
        'skipped': skipped,
        'errors': errors,
    }


def main():
    parser = argparse.ArgumentParser(description='Import OSM road data for international regions')
    parser.add_argument('--regions', type=str, default='US,GB,KE',
                        help='Comma-separated region codes to import (default: US,GB,KE)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Preview without inserting into database')
    args = parser.parse_args()

    region_codes = [r.strip().upper() for r in args.regions.split(',') if r.strip().upper() in REGIONS_CONFIG]
    if not region_codes:
        print(f"No valid regions specified. Choose from: {', '.join(REGIONS_CONFIG.keys())}")
        sys.exit(1)

    print(f"ROADWATCH OSM Road Import ETL")
    print(f"Regions: {', '.join(region_codes)}")
    print(f"Mode: {'DRY-RUN' if args.dry_run else 'LIVE'}")

    total = {'imported': 0, 'skipped': 0, 'errors': 0}
    for code in region_codes:
        result = import_region(code, dry_run=args.dry_run)
        for key in ['imported', 'skipped', 'errors']:
            total[key] += result.get(key, 0)

    print(f"\n{'='*60}")
    print(f"TOTAL: {total['imported']} imported, {total['skipped']} skipped, {total['errors']} errors")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
