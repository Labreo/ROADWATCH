#!/usr/bin/env bash
# Run the FastAPI backend on port 8000 without Docker.
# Only GEMINI_API_KEY is read from the key file; it is never copied here.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_BIN="$HOME/miniforge3/envs/roadwatch-db/bin"
KEY_FILE="${ROADWATCH_KEY_FILE:-$HOME/learning/.env}"

if [ -z "${GEMINI_API_KEY:-}" ] && [ -f "$KEY_FILE" ]; then
  GEMINI_API_KEY="$(sed -nE 's/^[[:space:]]*(export[[:space:]]+)?GEMINI_API_KEY=//p' "$KEY_FILE" | head -1 | tr -d "\"'
")"
  export GEMINI_API_KEY
fi

export ROADWATCH_DEMO_LOGIN=1
export POSTGRES_HOST=localhost POSTGRES_PORT="${POSTGRES_PORT:-5432}"
export POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres POSTGRES_DB=roadwatch

cd "$ROOT/backend"
exec "$ENV_BIN/python" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
