#!/usr/bin/env bash
# Run the FastAPI backend on port 8000 without Docker.
# Only one Concentrate key is read from the key file; it is never copied here.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_BIN="$HOME/miniforge3/envs/roadwatch-db/bin"
KEY_FILE="${ROADWATCH_KEY_FILE:-$HOME/learning/.env}"

if [ -f "$KEY_FILE" ]; then
  # CONCENTRATE_API_KEY in that file is rejected by the API (401), so prefer the working key.
  CONCENTRATE_API_KEY="$(sed -nE 's/^[[:space:]]*(export[[:space:]]+)?CONCENTRATE_CLAUDE_CODE_API_KEY=//p' "$KEY_FILE" | head -1 | tr -d "\"'\r")"
  export CONCENTRATE_API_KEY
fi

export POSTGRES_HOST=localhost POSTGRES_PORT="${POSTGRES_PORT:-5432}"
export POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres POSTGRES_DB=roadwatch

cd "$ROOT/backend"
exec "$ENV_BIN/python" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
