#!/usr/bin/env bash
# Start ROADWATCH's PostgreSQL + PostGIS without Docker, from the conda env
# "roadwatch-db". Creates and seeds the database on first run.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGDATA="$ROOT/.roadwatch-pg"
ENV_BIN="$HOME/miniforge3/envs/roadwatch-db/bin"
export PATH="$ENV_BIN:$PATH"
PORT="${POSTGRES_PORT:-5432}"

if [ ! -d "$PGDATA" ]; then
  initdb -D "$PGDATA" -U postgres --auth=trust --encoding=UTF8 >/dev/null
  # Keep memory low: this replaces the Docker stack on a laptop.
  cat >> "$PGDATA/postgresql.conf" <<EOF
listen_addresses = 'localhost'
port = $PORT
shared_buffers = 64MB
max_connections = 30
EOF
fi

if ! pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
  pg_ctl -D "$PGDATA" -l "$PGDATA/server.log" -w start >/dev/null
fi

if ! psql -U postgres -h localhost -p "$PORT" -lqt | cut -d'|' -f1 | grep -qw roadwatch; then
  createdb -U postgres -h localhost -p "$PORT" roadwatch
  for f in schema.sql mock_data.sql; do
    psql -U postgres -h localhost -p "$PORT" -d roadwatch -q -v ON_ERROR_STOP=1 -f "$ROOT/docs/$f" >/dev/null
  done
fi

# Idempotent, so document-driven changes apply to an existing database too.
psql -U postgres -h localhost -p "$PORT" -d roadwatch -q -v ON_ERROR_STOP=1 \
  -c "SET client_min_messages = warning;" -f "$ROOT/docs/schema_documented.sql" >/dev/null

echo "PostGIS ready on localhost:$PORT (database: roadwatch)"
