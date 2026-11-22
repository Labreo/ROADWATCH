# ROADWATCH — Final Demo Guide

**Aim:** Mini Project — develop a database application with front-end and back-end integration.

ROADWATCH meets it with three layers that talk to each other on every screen:

| Layer | Technology | Where |
|---|---|---|
| Front end | Next.js 16 + React (TypeScript), Tailwind | `frontend/src/components/live/`, `frontend/src/app/page.tsx` |
| Back end | FastAPI (Python), psycopg2, Gemini for chat and photo analysis | `backend/app/api/` (`screens.py`, `auth.py`, `db_explorer.py`, `complaints.py`, `chat.py`) |
| Database | PostgreSQL 18 + PostGIS 3.7 | `docs/schema.sql`, `docs/schema_documented.sql`, seed in `docs/mock_data.sql` and `docs/seed_wireframes.sql` |

Flow for every action: **browser → `fetch` to `http://localhost:8000/api/v1/...` → FastAPI route → parameterized SQL in a transaction → PostgreSQL (constraints, triggers, views, roles) → JSON → React screen.**

---

## 1. Before the demo (the evening before and 10 minutes before)

1. Reset the data so every count is the known starting value:
   ```bash
   ./scripts/reset-demo-db.sh
   ```
2. Start everything with one command (leave this terminal open):
   ```bash
   ./scripts/start-demo.sh
   ```
3. Open http://localhost:3000 and click through **Overview, Geospatial Map, Database** once. The first visit to each page compiles it; after that it is instant.
4. Check the AI: open **Chat Assistant** and ask *"Which contractor has the worst rating?"*. If the Wi-Fi fails, everything else still works: only chat and photo analysis need the internet.
5. Sign-in uses the **sample account buttons** in the Sign in dialog (Citizen, Ward engineer, Administrator, Public auditor). No password typing needed.

To stop: press `Ctrl+C` in the terminal running `start-demo.sh`. The database keeps running in the background; `./scripts/dev-db.sh` is safe to run again.

---

## 2. Demo script (about 10 minutes)

### Step 1 — Public read: Overview (no sign-in) · 1 min
- Open **Overview**. Every number (412 roads, 1,284 complaints, ₹384 Cr allocated vs ₹412.8 Cr spent, SLA %) is a live `SELECT` with `COUNT`, `SUM` and `FILTER` over `roads`, `complaints`, `projects`, `fund_sources`.
- Open **Geospatial Map**: road geometries (`LINESTRING`, SRID 4326) and complaint points come from PostGIS.
- Open **Contractor Scores**: ranking comes from the public view `v_public_contractor_ranking`; `performance_index` is kept up to date by the trigger `trg_contractor_perf_index`.

### Step 2 — CREATE: a citizen files a report · 2 min
- **Sign in → Citizen**.
- **Report an Issue → Report a defect → Initialize scanners →** upload a road photo (Gemini classifies it) **or** "No photo? Describe the damage instead", type a description, continue, **Publish civic ticket**.
- What the database does on that `INSERT INTO complaints`:
  - `trg_auto_route_complaint` (BEFORE INSERT) finds the ward with `ST_Contains(geom_boundary, point)` and the road with `ST_DWithin(..., 20 m)` and sets the status to `routed`.
  - `trg_status_history` writes row 1 of the weak entity `status_history (complaint_id, history_seq)`.
  - The audit trigger writes an `INSERT` row to `audit_log`.
- Open **My Reports**: the new ticket and its status history, read through the role views `v_citizen_complaints` and `v_citizen_status_history` while the connection runs `SET LOCAL ROLE roadwatch_citizen`.

### Step 3 — DELETE: withdraw the report · 30 s
- In **My Reports**, press **Withdraw report** on the new ticket and confirm.
- Backend runs `DELETE FROM complaints WHERE id = ? AND citizen_id = ? AND status IN ('pending','routed')`. `ON DELETE CASCADE` removes its history; the audit trigger records the `DELETE` with the citizen's email.
- A citizen cannot withdraw someone else's report, or one already in progress (tested in `backend/app/tests/test_access.py`).

### Step 4 — UPDATE with business rules: engineer and admin · 3 min
- **Sign out → Sign in → Ward engineer → Operations Dashboard → Command center.** Press **Dispatch** / **Resolve** on a report: an `UPDATE complaints SET status = ...`. The state-machine trigger `trg_complaint_state_machine` only allows `pending → routed → in_progress → resolved/rejected`; every change adds a `status_history` row.
- **Repair scheduler** tab → project *SV Road Emergency Asphalt Laying*, milestone 2: press **Verify** (UPDATE succeeds).
- **Sign in → Administrator →** same place → **Authorize payout**. PostgreSQL refuses: *"Payout blocked: a quality test failed for milestone 2 of project 4"*. The trigger `trg_block_payout_on_failed_test` sees a core sample (42 mm against the 50 mm minimum) in `milestone_tests`, whose `passed` column is a **generated column**.
- **Budget Compliance → Procurement**: submit a bid from *Omega Infrastructure (blacklisted)*. The trigger `trg_reject_blacklisted_bid` refuses it. Then on **Contractor Scores**, blacklist or reinstate a firm (UPDATE).
- **Budget Compliance → Audit log**: every change above is listed. `audit_log` is append-only: a trigger blocks `UPDATE`, `DELETE` and `TRUNCATE` on it.

### Step 5 — The database itself: Database screen · 2 min (admin)
- **Database** in the sidebar (staff only). Shows, read live from the PostgreSQL catalog:
  - 41 tables with row counts, primary keys, foreign keys (`column → table`), CHECK constraints and triggers per table.
  - 35 triggers, 10 views with the roles allowed to read them, 4 database roles, the ER diagram.
- **Run an example query** — each shows its SQL and runs read-only:
  - *Complaints per ward*: `JOIN`, `GROUP BY`, `COUNT(...) FILTER`.
  - *Which ward owns this spot?* / *Which road is this spot on?*: PostGIS `ST_Contains`, `ST_DWithin`.
  - *Contractor ranking*: window function `RANK() OVER`.
  - *Projects over budget*, *Monthly trend*: computed columns, `NULLIF`, CTE `WITH`.
  - *Public view as the citizen role*: works. *Citizen role reading a base table*: **PostgreSQL refuses with "permission denied for table complaints"** — access control enforced by the database, not only the app.

### Step 6 — AI over the database · 1 min
- **Chat Assistant**: *"Which contractor has the worst rating?"* or *"How much was spent on S.V. Road?"*. The backend runs SQL, passes only those rows to Gemini, and shows source cards. Gemini never touches the database directly.

### Step 7 — Showcase Mode, img2threejs 3D Crater Lab & Mobile Presentation · 3 min
- Click **★ Showcase Mode** in the top navigation bar (or **Showcase Mode** at the top of the sidebar):
  1. **1. img2threejs 3D Pothole Studio**: Upload any 2D pothole photo (or pick a live DB complaint), drag the **Cross-Section Laser Slicer**, adjust **Monsoon Water Pool (%)**, switch between **Pavement Strata PBR**, **Laser Depth Heatmap**, **Wireframe**, and **Simulate HMA Patch Repair**, inspect the **img2threejs TypeScript Code** tab, and click **Save 3D Scan & BoQ to DB** (writes to `pothole_3d_scans` + `audit_log`).
  2. **2. Mobile App & Workflow Deck**: Step through the 8 interactive slides explaining the Capacitor iOS/Android + Offline-First PWA architecture while clicking through the synchronized **Live iPhone 16 Pro Simulator** on the right (or open `http://localhost:3000/mobile-presentation.html` full-screen).
  3. **3. MonsoonShield Flood Predictor**: Drag the rainfall slider (`35 mm/hr` → `165 mm/hr Cloudburst`) to predict flood depth and asphalt stripping risk, then click **Dispatch Crew** to create a `preventive_work_orders` row in PostgreSQL.
  4. **4. CivicTrust & RTI Generator**: Click **+1 I Hit This Too** (2+ confirmations auto-boost complaint priority to P5), **Flag Fake Closure** (reopens and escalates), or **Draft RTI Dossier** to generate an official Section 6(1) Right to Information Act petition from live database facts.
  5. **5. SafeCorridor Ambulance Router**: Compare the recommended shock-free corridor against high-hazard routes using PostGIS `complaints` and `ride_bumps` vertical shock telemetry (`m/s²`).
  6. **6. Bump Radar + Warranty Clawback**: Replay accelerometer rides (`ST_ClusterDBSCAN` auto-files reports) and draft contractor warranty recovery notices.
  7. **7. All 4 User Roles End-to-End Check**: Use the **1-Click Active Role Switcher** at the top (`Public Guest`, `Citizen`, `Ward Engineer`, `Administrator`, `Public Auditor`) or click **Run Live E2E Verification Suite** to verify all endpoints and RBAC rules live.

---

## 3. DBMS concepts and where to show them

| Concept | In the database | In the app |
|---|---|---|
| ER model → relational schema | `DBMS_Project_Submission/Document_3_ERD_and_Schema.md`, ER diagram | Database screen (diagram, tables, keys) |
| Primary, foreign, composite keys | `status_history (complaint_id, history_seq)`, `milestone_tests` FK on `(project_id, milestone_num)` | Database screen → Tables |
| Weak entity | `status_history` | My Reports timeline |
| Normalization (3NF/BCNF) | Document 3, section 7; phones split into `citizen_phones` | — |
| CHECK, UNIQUE, NOT NULL, generated column | `milestone_tests.passed`, ratings 0–5, status lists | Payout block, bid rules |
| Triggers (PL/pgSQL) | routing, state machine, history, audit, blacklist bid block, payout block, performance index | Steps 2–4 |
| Views | `v_public_*`, `v_citizen_*`, `v_engineer_queue`, `v_admin_jurisdiction_summary`, `v_auditor_sla_breaches` | Contractor Scores, My Reports, Operations |
| Roles and privileges (GRANT) | `roadwatch_citizen / engineer / admin / auditor` | Sign-in roles; Database → citizen query refused |
| Transactions | `backend/app/services/live_db.py` `tx()`: commit or roll back as one unit | Any refused action leaves no partial change |
| Indexes | B-tree on keys; GiST on every geometry column | Map and routing speed |
| Spatial queries | `ST_Contains`, `ST_DWithin`, `ST_Distance` | Report routing, Database examples |
| Aggregates, window functions, CTEs | Overview, Contractor ranking, Monthly trend | Overview, Database examples |
| SQL injection safety | All SQL uses `%s` parameters | Test `test_wrong_password_and_injection_are_rejected` |
| Passwords | pgcrypto bcrypt; sessions store a SHA-256 hash of the token | Sign in |

---

## 4. Likely questions

- **Where is the data from?** Invented sample data for Mumbai, shaped like real municipal records. Not connected to a government source.
- **What if the front end is bypassed?** The rules live in the database: triggers, CHECK constraints and role privileges reject bad changes even from `psql`.
- **How do you test it?** `cd backend && ~/miniforge3/envs/roadwatch-db/bin/python -m pytest app/tests -q` (35 tests, with the backend running): access rules per role, injection, the withdraw rule, photo analysis with a stubbed model.
- **Why PostGIS?** Routing a report means "which ward polygon contains this GPS point" and "which road is within 20 m": spatial predicates with GiST indexes.

## 5. If something goes wrong

| Symptom | Fix |
|---|---|
| Page says "Backend is not reachable" | Backend stopped: run `./scripts/start-demo.sh` again (or `./scripts/dev-backend.sh`). |
| Numbers differ from the script | Run `./scripts/reset-demo-db.sh`, then sign in again. |
| Chat answers "backend error" | No internet or Gemini key problem; the rest of the demo is unaffected. |
| A page looks stale or broken after a rebuild | Hard refresh the browser (Cmd+Shift+R). |
| Port 3000 or 8000 busy | Close the other app using it, then start again. |
