"""
ROADWATCH Government Data Sync Framework

Pluggable sync framework for importing data from government data sources.
Defines a standard adapter pattern — implement BaseSyncAdapter for any source.

Usage:
    python scripts/sync_gov_data.py                            # Run all adapters
    python scripts/sync_gov_data.py --adapter openroads         # Run specific adapter
    python scripts/sync_gov_data.py --adapter india_pwd --dry-run
    python scripts/sync_gov_data.py --list                      # List available adapters
    python scripts/sync_gov_data.py --region IN                 # Run adapters for region
"""

import os
import sys
import argparse
import json
import abc
from datetime import datetime, timezone
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.database import db


# ── Base Adapter ──────────────────────────────────────────────────────

class BaseSyncAdapter(abc.ABC):
    """Abstract base class for government data sync adapters.

    Subclasses must implement:
      - adapter_id: unique string identifier
      - description: human-readable description
      - supported_regions: list of region codes this adapter works with
      - fetch(): returns list of dicts with government data
      - transform(raw_data): returns list of dicts ready for DB insertion
      - load(transformed_data): inserts transformed data into DB
    """

    @property
    @abc.abstractmethod
    def adapter_id(self) -> str:
        ...

    @property
    @abc.abstractmethod
    def description(self) -> str:
        ...

    @property
    @abc.abstractmethod
    def supported_regions(self) -> list[str]:
        ...

    @abc.abstractmethod
    def fetch(self, region_code: str, dry_run: bool = False) -> list[dict]:
        """Fetch raw data from the government source. Returns list of dicts."""
        ...

    @abc.abstractmethod
    def transform(self, raw_data: list[dict], region_code: str) -> list[dict]:
        """Transform raw data into DB-ready format."""
        ...

    @abc.abstractmethod
    def load(self, transformed_data: list[dict], dry_run: bool = False) -> dict:
        """Insert transformed data into the database. Returns summary stats."""
        ...

    def sync(self, region_code: str, dry_run: bool = False) -> dict:
        """Run the full ETL pipeline: fetch → transform → load."""
        print(f"  [{self.adapter_id}] Fetching data for {region_code}...")
        raw = self.fetch(region_code, dry_run)

        print(f"  [{self.adapter_id}] Transforming {len(raw)} records...")
        transformed = self.transform(raw, region_code)

        print(f"  [{self.adapter_id}] Loading {len(transformed)} records...")
        result = self.load(transformed, dry_run)

        result.update({
            'adapter_id': self.adapter_id,
            'region_code': region_code,
            'raw_count': len(raw),
            'transformed_count': len(transformed),
        })
        return result


# ── Mock Adapters (Hackathon Demo) ────────────────────────────────────

class MockIndiaPWDSyncAdapter(BaseSyncAdapter):
    """Mock adapter for Indian PWD road project data."""

    @property
    def adapter_id(self) -> str:
        return 'india_pwd'

    @property
    def description(self) -> str:
        return 'India PWD (Public Works Department) — road projects, budgets, completion status'

    @property
    def supported_regions(self) -> list[str]:
        return ['IN']

    def fetch(self, region_code: str, dry_run: bool = False) -> list[dict]:
        if dry_run:
            print(f"    [DRY-RUN] Would fetch from https://pwd.gov.in/api/road-projects?state=Mumbai")
            return []
        return [
            {'project_id': 'PWD/MUM/2025/042', 'road_name': 'SV Road Widening', 'budget_cr': 45.0, 'status': 'ongoing', 'contractor': 'Apex Infra', 'completion_pct': 62},
            {'project_id': 'PWD/MUM/2025/091', 'road_name': 'LBS Marg Resurfacing', 'budget_cr': 28.5, 'status': 'tendering', 'contractor': None, 'completion_pct': 0},
            {'project_id': 'PWD/MUM/2024/118', 'road_name': 'WEH Flyover Repair', 'budget_cr': 120.0, 'status': 'completed', 'contractor': 'Bharat Roads', 'completion_pct': 100},
        ]

    def transform(self, raw_data: list[dict], region_code: str) -> list[dict]:
        transformed = []
        for item in raw_data:
            status_map = {'ongoing': 'in_progress', 'completed': 'completed', 'tendering': 'planned', 'halted': 'halted'}
            transformed.append({
                'title': item['road_name'],
                'road_name': item['road_name'],
                'budget_allocated': item['budget_cr'] * 10000000,
                'status': status_map.get(item['status'], 'planned'),
                'contractor_name': item.get('contractor'),
                'source': 'india_pwd',
                'external_id': item['project_id'],
                'completion_pct': item.get('completion_pct', 0),
            })
        return transformed

    def load(self, transformed_data: list[dict], dry_run: bool = False) -> dict:
        imported = 0
        skipped = 0
        for item in transformed_data:
            if dry_run:
                print(f"    [DRY-RUN] Would insert project: {item['title']} ({item['budget_allocated']})")
                imported += 1
                continue
            try:
                sql = """
                INSERT INTO projects (title, road_id, contractor_id, authority_id, budget_allocated, budget_spent, status, start_date, target_end_date)
                VALUES (%s, %s, %s, %s, %s, 0, %s, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year')
                """
                imported += 1
            except Exception as e:
                print(f"    ERROR: {e}")
                skipped += 1
        return {'imported': imported, 'skipped': skipped}


class MockUSFHWASyncAdapter(BaseSyncAdapter):
    """Mock adapter for US FHWA (Federal Highway Administration) data."""

    @property
    def adapter_id(self) -> str:
        return 'us_fhwa'

    @property
    def description(self) -> str:
        return 'US FHWA — federal highway funding, project status, contractor compliance'

    @property
    def supported_regions(self) -> list[str]:
        return ['US']

    def fetch(self, region_code: str, dry_run: bool = False) -> list[dict]:
        if dry_run:
            return []
        return [
            {'fiscal_year': 2025, 'route': 'I-94', 'funding': 85000000, 'program': 'Interstate Maintenance', 'status': 'active'},
            {'fiscal_year': 2025, 'route': 'I-75', 'funding': 120000000, 'program': 'Bridge Replacement', 'status': 'active'},
            {'fiscal_year': 2024, 'route': 'M-1', 'funding': 32000000, 'program': 'Surface Transportation', 'status': 'completed'},
        ]

    def transform(self, raw_data: list[dict], region_code: str) -> list[dict]:
        return [{
            'route': item['route'],
            'funding': item['funding'],
            'program': item['program'],
            'fiscal_year': item['fiscal_year'],
            'status': item['status'],
            'source': 'us_fhwa',
        } for item in raw_data]

    def load(self, transformed_data: list[dict], dry_run: bool = False) -> dict:
        for item in transformed_data:
            if dry_run:
                print(f"    [DRY-RUN] FHWA funding: {item['route']} — ${item['funding']:,} ({item['program']})")
        return {'imported': len(transformed_data), 'skipped': 0}


class MockUKNHSSyncAdapter(BaseSyncAdapter):
    """Mock adapter for UK National Highways data."""

    @property
    def adapter_id(self) -> str:
        return 'uk_nh'

    @property
    def description(self) -> str:
        return 'UK National Highways — road network data, roadworks, traffic disruption'

    @property
    def supported_regions(self) -> list[str]:
        return ['GB']

    def fetch(self, region_code: str, dry_run: bool = False) -> list[dict]:
        if dry_run:
            return []
        return [
            {'road': 'M25', 'section': 'J10-J16', 'works': 'Smart Motorway Upgrade', 'budget_gbp': 324000000, 'completion': 'Dec 2026', 'status': 'in_progress'},
            {'road': 'A1', 'section': 'M25-A1(M)', 'works': 'Safety Barrier Renewal', 'budget_gbp': 156000000, 'completion': 'Mar 2025', 'status': 'completed'},
        ]

    def transform(self, raw_data: list[dict], region_code: str) -> list[dict]:
        return [{
            'road': item['road'],
            'section': item['section'],
            'works': item['works'],
            'budget_gbp': item['budget_gbp'],
            'status': item['status'],
            'source': 'uk_nh',
        } for item in raw_data]

    def load(self, transformed_data: list[dict], dry_run: bool = False) -> dict:
        for item in transformed_data:
            if dry_run:
                print(f"    [DRY-RUN] NH works: {item['road']} — {item['works']} (£{item['budget_gbp']:,})")
        return {'imported': len(transformed_data), 'skipped': 0}


class MockKeNRASyncAdapter(BaseSyncAdapter):
    """Mock adapter for Kenya NRA (National Roads Authority) data."""

    @property
    def adapter_id(self) -> str:
        return 'kenya_nra'

    @property
    def description(self) -> str:
        return 'Kenya NRA — national road network, maintenance schedules, contractor performance'

    @property
    def supported_regions(self) -> list[str]:
        return ['KE']

    def fetch(self, region_code: str, dry_run: bool = False) -> list[dict]:
        if dry_run:
            return []
        return [
            {'road': 'A104', 'section': 'Nairobi-Nakuru', 'works': 'Dual Carriageway Upgrade', 'budget_kes': 8200000000, 'contractor': 'Haji & Sons', 'status': 'ongoing'},
            {'road': 'A109', 'section': 'Mombasa Road', 'works': 'Emergency Pothole Patching', 'budget_kes': 450000000, 'contractor': 'Buzeki Roadworks', 'status': 'in_progress'},
        ]

    def transform(self, raw_data: list[dict], region_code: str) -> list[dict]:
        return [{
            'road': item['road'],
            'section': item['section'],
            'works': item['works'],
            'budget_kes': item['budget_kes'],
            'contractor': item['contractor'],
            'status': item['status'],
            'source': 'kenya_nra',
        } for item in raw_data]

    def load(self, transformed_data: list[dict], dry_run: bool = False) -> dict:
        for item in transformed_data:
            if dry_run:
                print(f"    [DRY-RUN] KeNHA: {item['road']} — {item['works']} (KES {item['budget_kes']:,})")
        return {'imported': len(transformed_data), 'skipped': 0}


# ── Adapter Registry ──────────────────────────────────────────────────

ADAPTER_REGISTRY: dict[str, BaseSyncAdapter] = {
    'india_pwd': MockIndiaPWDSyncAdapter(),
    'us_fhwa': MockUSFHWASyncAdapter(),
    'uk_nh': MockUKNHSSyncAdapter(),
    'kenya_nra': MockKeNRASyncAdapter(),
}

REGION_ADAPTER_MAP: dict[str, list[str]] = {
    'IN': ['india_pwd'],
    'US': ['us_fhwa'],
    'GB': ['uk_nh'],
    'KE': ['kenya_nra'],
}


def list_adapters():
    """Print available adapters."""
    print(f"{'Adapter ID':<20} {'Description':<60} {'Regions':<15}")
    print(f"{'-'*95}")
    for aid, adapter in ADAPTER_REGISTRY.items():
        regions = ', '.join(adapter.supported_regions)
        print(f"{aid:<20} {adapter.description:<60} {regions:<15}")


def run_sync(adapter_id: str, region_code: str, dry_run: bool = False) -> dict:
    """Run a specific adapter for a specific region."""
    adapter = ADAPTER_REGISTRY.get(adapter_id)
    if not adapter:
        print(f"ERROR: Unknown adapter '{adapter_id}'. Use --list to see available adapters.")
        return {'status': 'error', 'error': f'Unknown adapter: {adapter_id}'}

    if region_code not in adapter.supported_regions:
        print(f"  WARNING: Adapter '{adapter_id}' does not support region '{region_code}'. Supported: {adapter.supported_regions}")
        return {'status': 'skipped', 'reason': f'Unsupported region: {region_code}'}

    return adapter.sync(region_code, dry_run=dry_run)


def main():
    parser = argparse.ArgumentParser(description='ROADWATCH Government Data Sync Framework')
    parser.add_argument('--adapter', type=str, default=None,
                        help='Run specific adapter by ID (e.g., india_pwd, us_fhwa)')
    parser.add_argument('--region', type=str, default=None,
                        help='Filter by region code (e.g., IN, US, GB, KE)')
    parser.add_argument('--list', action='store_true', help='List available adapters')
    parser.add_argument('--dry-run', action='store_true', help='Preview without inserting')
    args = parser.parse_args()

    if args.list:
        list_adapters()
        return

    print(f"ROADWATCH Government Data Sync Framework")
    print(f"Mode: {'DRY-RUN' if args.dry_run else 'LIVE'}")
    print()

    if args.adapter:
        # Run single adapter
        region = args.region or IN
        if args.region:
            target_regions = [args.region.upper()]
        else:
            # Try all regions the adapter supports
            adapter = ADAPTER_REGISTRY.get(args.adapter)
            if not adapter:
                print(f"ERROR: Unknown adapter '{args.adapter}'")
                sys.exit(1)
            target_regions = adapter.supported_regions

        for region_code in target_regions:
            result = run_sync(args.adapter, region_code, args.dry_run)
            print(f"  Result: {json.dumps(result, default=str)}")
    else:
        # Run all adapters
        if args.region:
            region_code = args.region.upper()
            adapter_ids = REGION_ADAPTER_MAP.get(region_code, [])
            if not adapter_ids:
                print(f"No adapters registered for region '{region_code}'")
                print(f"Available: {', '.join(REGION_ADAPTER_MAP.keys())}")
                sys.exit(1)
            print(f"Running all adapters for region: {region_code}")
            for aid in adapter_ids:
                result = run_sync(aid, region_code, args.dry_run)
                print(f"  [{aid}] Result: {json.dumps(result, default=str)}")
        else:
            # Run all adapters for all regions
            for region_code, adapter_ids in REGION_ADAPTER_MAP.items():
                print(f"\n{'='*60}")
                print(f"Region: {region_code}")
                print(f"{'='*60}")
                for aid in adapter_ids:
                    result = run_sync(aid, region_code, args.dry_run)
                    print(f"  [{aid}] Result: {json.dumps(result, default=str)}")

    print(f"\nSync complete.")


if __name__ == '__main__':
    main()
