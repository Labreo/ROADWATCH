#!/bin/bash
# ROADWATCH ETL Pipeline — Import international road data from OpenStreetMap
# Usage: ./scripts/etl.sh [--dry-run]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Ensure required packages are installed
pip install -q overpy shapely psycopg2-binary 2>/dev/null || true

MODE="${1:---live}"
DRY_RUN_FLAG=""

if [ "$MODE" = "--dry-run" ]; then
    DRY_RUN_FLAG="--dry-run"
    echo "=== ROADWATCH ETL: DRY-RUN MODE ==="
else
    echo "=== ROADWATCH ETL: LIVE IMPORT ==="
fi

echo "Regions: US (Detroit), GB (Camden/London), KE (Nairobi)"
echo ""

python scripts/import_osm.py --regions US,GB,KE $DRY_RUN_FLAG

echo ""
echo "=== ETL Complete ==="
