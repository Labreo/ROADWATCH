#!/usr/bin/env bash
# Start the whole ROADWATCH stack for a demo: PostGIS, the FastAPI backend and
# the Next.js frontend. Press Ctrl+C to stop the backend and frontend.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/.roadwatch-pg"

"$ROOT/scripts/dev-db.sh"

if curl -s -o /dev/null http://127.0.0.1:8000/api/v1/auth/demo-enabled; then
  echo "Backend already running on http://localhost:8000"
  BACKEND_PID=""
else
  "$ROOT/scripts/dev-backend.sh" > "$LOG_DIR/backend.log" 2>&1 &
  BACKEND_PID=$!
  echo "Backend starting on http://localhost:8000 (log: .roadwatch-pg/backend.log)"
fi

cleanup() {
  if [ -n "$BACKEND_PID" ]; then kill "$BACKEND_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

for _ in $(seq 1 30); do
  curl -s -o /dev/null http://127.0.0.1:8000/api/v1/auth/demo-enabled && break
  sleep 1
done

echo "Frontend starting on http://localhost:3000"
cd "$ROOT/frontend"
npm run dev
