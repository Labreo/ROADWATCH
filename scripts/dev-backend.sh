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

# Google sign-in (optional): put GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in
# .roadwatch-secrets at the project root. That file is git-ignored.
SECRETS_FILE="$ROOT/.roadwatch-secrets"
if [ -f "$SECRETS_FILE" ]; then
  for name in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET; do
    if [ -z "${!name:-}" ]; then
      value="$(sed -nE "s/^[[:space:]]*(export[[:space:]]+)?$name=//p" "$SECRETS_FILE" | head -1 | tr -d "\"' ")"
      [ -n "$value" ] && export "$name=$value"
    fi
  done
fi

export ROADWATCH_DEMO_LOGIN=1
export POSTGRES_HOST=localhost POSTGRES_PORT="${POSTGRES_PORT:-5432}"
export POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres POSTGRES_DB=roadwatch

cd "$ROOT/backend"
exec "$ENV_BIN/python" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
