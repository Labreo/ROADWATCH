#!/usr/bin/env bash
# Rebuild the local demo database from docs/*.sql, discarding every report,
# account and change made since. Use it before a demo to start from known data.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_BIN="$HOME/miniforge3/envs/roadwatch-db/bin"
PORT="${POSTGRES_PORT:-5432}"

"$ROOT/scripts/dev-db.sh" >/dev/null
echo "Dropping and rebuilding database 'roadwatch' on localhost:$PORT ..."
"$ENV_BIN/dropdb" -U postgres -h localhost -p "$PORT" --force --if-exists roadwatch
"$ROOT/scripts/dev-db.sh"
"$ENV_BIN/psql" -U postgres -h localhost -p "$PORT" -d roadwatch -At -c \
  "SELECT 'Roads: ' || (SELECT COUNT(*) FROM roads) || ', complaints: ' || (SELECT COUNT(*) FROM complaints) || ', contractors: ' || (SELECT COUNT(*) FROM contractors)"
echo "Sign in again in the app: old sessions were removed."
