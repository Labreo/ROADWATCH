# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ROADWATCH** — Civic Infrastructure Intelligence Platform. Smart-city system for road accountability: public spend tracking, AI-powered defect routing (vision + geospatial), contractor scorecards, digital twins, and offline-first citizen reporting.

## Development Commands

### Prerequisites (Docker)
```bash
docker compose up -d                # Start PostgreSQL (PostGIS) + Redis
```

### Backend (FastAPI, Python 3.11+)
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload       # http://localhost:8000
# Tests (if test file exists):
# pytest app/tests/ -v
```

### Frontend (Next.js 16, TypeScript)
```bash
cd frontend
npm install
npm run dev                        # http://localhost:3000 (Turbopack)
npm run build                      # Static export via `next.config.ts`
npm run lint                       # ESLint
```

**IMPORTANT**: This uses Next.js 16 — breaking changes exist. Read `node_modules/next/dist/docs/` before writing code (see `frontend/AGENTS.md`).

### Mobile (Capacitor — iOS/Android)
```bash
npm run mobile:build               # Build Next.js
npm run mobile:sync                # Build + `npx cap sync`
npm run mobile:open-ios            # Sync + open Xcode
npm run mobile:android             # Sync + open Android Studio
```

## Architecture (5-Layer Stack)

```
┌──────────────────────────────────────────┐
│ 1. CITIZEN & EXPERIENCE LAYER            │
│    Next.js PWA + R3F Digital Twins       │
├──────────────────────────────────────────┤
│ 2. RESILIENT OFFLINE SYNC LAYER          │
│    IndexedDB (Dexie.js) + Service Worker │
├──────────────────────────────────────────┤
│ 3. AI ACCOUNTABILITY & ROUTING LAYER     │
│    LLM + RAG + Budget Analytics Engine   │
├──────────────────────────────────────────┤
│ 4. INFRASTRUCTURE INTELLIGENCE LAYER     │
│    PostGIS/GeoAlchemy2 Spatial Queries   │
├──────────────────────────────────────────┤
│ 5. GEOSPATIAL & TRANSPARENCY DATABASE    │
│    PostgreSQL + PostGIS + Redis          │
└──────────────────────────────────────────┘
```

## Key Technical Decisions

### Frontend (Next.js 16 App Router)
- **State**: Zustand for UI state + navigation (`src/store/useStore.ts`), IndexedDB (Dexie.js) for offline data
- **Maps**: Leaflet via react-leaflet (`src/components/map/`)
- **3D**: React Three Fiber + Drei (`src/components/3d/`, `src/components/twin/`)
- **Styling**: Tailwind CSS v4 with glassmorphism design system
- **Animation**: Framer Motion
- **Fonts**: Geist + Outfit (via next/font)
- **PWA**: `output: 'export'` in next.config.ts; service worker at `public/sw.js`
- **Types**: All shared contracts in `src/types/index.ts`
- **Components organized by domain**: chat/, complaints/, dashboard/, map/, operations/, playback/, sensors/, transparency/, twin/

### Backend (FastAPI + PostGIS)
- **API Prefix**: `/api/v1`
- **Core Routes**: `chat`, `complaints`, `whatsapp` — each in `backend/app/api/`
- **Services** (business logic in `backend/app/services/`):
  - `road_retriever.py` — Structured SQL queries for roads, contractors, complaints (parameterized, no raw injection)
  - `retrieval_engine.py` — LLM query processing with tool calling
  - `vision_pipeline.py` — Streams images to Gemini for defect classification
  - `authority_resolver.py` — Geospatial authority matching (ST_Contains on municipal boundaries)
  - `database.py` — Postgres/PostGIS connection with auto-schema initialization
- **Database**: uses `?` placeholders internally, auto-converted to `%s` for psycopg2
- **Geometry handling**: WKT conversion via `to_wkt()` helper in database.py

### Key Data Flow: Offline Complaint Submission
1. User submits complaint offline → compressed photo (<500KB) → IndexedDB
2. Service Worker Background Sync triggers when online
3. POST `/api/v1/complaints/sync` (batch) or individual `/api/v1/complaints`
4. Backend runs PostGIS ST_Contains (authority boundary) + ST_DWithin (road proximity, 20m)
5. LLM classifies defect category
6. Complaint persisted, client reconciled

### Key Data Flow: AI Chat with Photo
1. POST `/api/v1/chat/analyze-photo` — multipart with image + GPS
2. Coordinates resolved: form params → EXIF GPS → fallback (Mumbai)
3. Gemini vision pipeline evaluates damage (streaming)
4. Backend creates complaint record in PostGIS
5. Returns NDJSON stream: telemetry → content → metadata/draft_complaint

### Database (PostgreSQL 16 + PostGIS 3.4)
- **Tables**: `authorities`, `contractors`, `roads`, `projects`, `complaints`
- **Spatial columns**: `roads.geom` (LineString, 4326), `authorities.geom_boundary` (Polygon, 4326), `complaints.geom` (Point, 4326)
- **All spatial columns have GIST indexes**
- Schema: `docs/schema.sql`, mock data: `docs/mock_data.sql`
- Mock data in `docs/mock_data.sql` covers Mumbai jurisdiction (India defaults).

### Containerized Deployment
- `docker-compose.yml` defines: db (postgis/postgis:16-3.4), redis (7-alpine), backend (FastAPI)
- Schema + mock data auto-loaded to db on first start

## Running the Full Stack
```bash
docker compose up -d                # Start DB + Redis + Backend
cd frontend && npm run dev          # Start frontend separately
```

### Running without Docker (lighter)
Needs a conda env holding PostgreSQL, PostGIS and the backend packages:
```bash
conda create -n roadwatch-db -c conda-forge postgis python=3.11 pip
~/miniforge3/envs/roadwatch-db/bin/pip install -r backend/requirements.txt
./scripts/dev-db.sh                 # Local PostGIS in .roadwatch-pg/, seeded on first run
./scripts/dev-backend.sh            # API on http://localhost:8000
cd frontend && npm run dev          # App on http://localhost:3000
```
`docs/schema_documented.sql` adds what Documents 1, 3 and 4 specify (citizens, status history, state machine, spatial routing, audit lock, role views, sensors, sign-in, milestone tests). `docs/seed_wireframes.sql` scales invented Mumbai sample data to the wireframe totals. Load order: `schema.sql`, `mock_data.sql`, `schema_documented.sql`, `seed_wireframes.sql`.

The wireframe screens live in `frontend/src/components/live/` and read `backend/app/api/screens.py`.

### AI
Chat and photo analysis use Gemini through its OpenAI-compatible endpoint (`backend/app/services/llm_config.py`). Set `GEMINI_API_KEY`; `LLM_MODEL` overrides the model. Keep the key server-side.

### Sign-in and roles
`backend/app/api/auth.py` handles citizen, engineer, admin and auditor accounts. Passwords are pgcrypto bcrypt hashes and sessions store only a token hash. Public transparency screens need no sign-in. Role-specific reads run under `SET LOCAL ROLE roadwatch_<role>` through the views in `schema_documented.sql`. `ROADWATCH_DEMO_LOGIN=1`, set by `scripts/dev-backend.sh`, enables one-click sample accounts; never set it on a deployment.

### Tests
With the API running from `scripts/dev-backend.sh`:
```bash
cd backend && ~/miniforge3/envs/roadwatch-db/bin/python -m pytest app/tests -q
```

## Project Directory Structure
```
ROADWATCH/
├── docker-compose.yml              # All infra services
├── docs/                           # Architecture, schema, mock data
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                 # FastAPI entrypoint
│       ├── api/                    # Route handlers (chat, complaints, whatsapp)
│       └── services/              # Business logic (retrieval, vision, GIS)
└── frontend/
    ├── next.config.ts              # Static export + trailing slashes
    ├── capacitor.config.ts         # Mobile build config
    ├── public/                     # Static assets, SW, 3D GLB models
    └── src/
        ├── app/                    # Next.js App Router pages
        ├── components/             # Domain-based components
        │   ├── chat/              # AI chatbot panel + citation rendering
        │   ├── complaints/        # Wizard, timeline, SLA alerts
        │   ├── map/               # Leaflet map wrappers
        │   ├── operations/        # Admin dashboard, jurisdiction maps
        │   ├── playback/          # Historical timeline playback
        │   ├── sensors/           # IoT sensor dashboard + cross-section
        │   ├── transparency/      # Budget charts, Sankey, sync center
        │   ├── twin/              # React Three Fiber digital twin
        │   ├── dashboard/         # Road details, health scorecards
        │   ├── demo/              # Landing hero + tour guide
        │   └── shared/            # Reusable: shell, sidebar, bottom sheet, cards
        ├── data/                   # Mock data + templates
        ├── services/               # Engine services (offline, diagnostics, etc.)
        ├── store/                  # Zustand store
        └── types/                  # Shared TypeScript types (matching backend Pydantic)
```