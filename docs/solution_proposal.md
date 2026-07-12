# TECHNICAL SOLUTION PROPOSAL: ROADWATCH
## AI-Powered Mobile-First Road Accountability & Infrastructure Intelligence Platform

---

### Platform Metadata
* **Project Name**: ROADWATCH
* **Sub-title**: Decoupled Civic Infrastructure Diagnostics, Spend Transparency, & Geospatial Routing Engine
* **Target Scale**: National / Municipal Smart City Deployment
* **Document Status**: Production-Ready Deployment Plan
* **Audience**: Municipal Commissioners, Smart City Directorate Inspectors, Hackathon Jury

---

## 1. Executive Summary

Municipal road networks represent the physical backbone of urban commerce, yet their maintenance is universally plagued by systemic inefficiencies: opaque public budgets, lack of contractor accountability, fragmented status data, and slow complaint resolution. **ROADWATCH** is an end-to-end civic-tech solution that addresses these challenges through a unified mobile-first experience.

ROADWATCH bridges the information gap between citizens and municipal authorities by combining three key pillars:
1. **Financial Transparency**: Providing citizens with direct access to road segment budgets, historical spending, and contractor scorecards.
2. **Geospatial & Spatial Diagnostics**: Visualizing road distress, simulated vibration sensor datasets, and underground drainage maps using interactive GIS overlays and 3D digital twins.
3. **AI-Driven Governance**: Employing a localized, offline-resilient report wizard and a conversational AI agent that safely reasons over municipal datasets to answer query citations and auto-route complaints using PostGIS spatial algorithms.

By integrating offline-first data synchronization, robust database schemas, and explainable AI pipelines, ROADWATCH transforms passive complaint filing into an active, data-driven citizen audit. The platform is designed for scalable city-wide and national deployment, creating a self-healing public infrastructure loop.

---

## 2. Problem Statement

### 2.1. Fragmented Infrastructure Information
Municipalities distribute road data across multiple siloed databases, including budget ledgers, contractor registries, and geographic information systems (GIS). This fragmentation prevents both citizens and public administrators from acquiring a unified view of road health, resulting in redundant survey work and mismanaged funding.

### 2.2. Opaque Financial Allocations & Repetitive Repairs
Citizens pay municipal taxes yet have no visibility into how specific road maintenance budgets are allocated. Contractors frequently perform low-quality paving work, leading to recurring defects (e.g. potholes forming within weeks of repair). Without transparent spending timelines, this cycle of repetitive repairs remains unaccountable.

### 2.3. Contractor Accountability Deficit
Contractors who repeatedly fail to meet project deadlines or deliver substandard infrastructure quality face few administrative consequences. Because there is no public contractor rating system or dynamic scorecards tracking average project delay days, blacklisted firms continue to bid on and win new public tenders.

### 2.4. Inefficient and Manual Complaint Routing
Traditional citizen reporting channels route complaints manually or through generic customer service operators who lack local geospatial context. Reports are frequently sent to the wrong department (e.g., routing a national highway defect to the local municipal ward), causing resolution delays and administrative overhead.

### 2.5. Low-Network and Accessibility Barriers in the Field
Citizen reporting apps often fail in transit zones, underpasses, or rural outskirts where mobile data connectivity is intermittent or absent. Furthermore, standard complex reporting portals exclude non-technical users or citizens who require local language interfaces.

---

## 3. Solution Overview

ROADWATCH addresses these systemic issues by establishing an integrated, mobile-first ecosystem that translates raw public data into actionable civic intelligence:

```
[ Citizen Layer ] ➔ [ Resilient Offline Sync Manager ] ➔ [ AI Routing Engine ] ➔ [ PostGIS GIS Boundary Checks ]
```

* **Geospatial Interface**: Replaces static forms with an interactive OpenStreetMap layer that visually codes road segments by their actual physical condition, making infrastructure deficits visible at a glance.
* **Resilient Connectivity**: An offline-first sync manager saves compressed photo reports inside local browser memory (IndexedDB) during signal drops, auto-uploading them once a connection is verified.
* **Automated AI Routing**: Backend routing algorithms query PostGIS boundaries to calculate which administrative department owns the defect coordinates and matches the nearest road to hold the correct paving contractor accountable.
* **Accessible transparency**: Generates easy-to-read, localized summaries of budget overruns, blacklisted contractor profiles, and 3D models of road segments with stress diagnostics.

---

## 4. Core Features

| Feature | Subsystem | Citizen Impact | Technical Implementation |
| :--- | :--- | :--- | :--- |
| **Interactive Map** | Leaflet / OpenStreetMap | Visualizes road health and defect clusters instantly. | Geometries rendered via TopoJSON/GeoJSON layers; custom color-coded segment status styles. |
| **Draggable AI Assistant** | ChatPanel & RAG Engine | Provides natural language answers on budgets, contractors, and routing. | Snappable bottom drawer UI (Framer Motion); structured parameterized LLM query engine. |
| **Smart Report Wizard** | ComplaintWizard | Instantly drafts complaint texts using captured photos. | WebRTC camera API, in-browser JPEG compression, auto-geolocation parsing. |
| **Budget Dashboard** | Transparency Engine | Exposes municipal spending, overruns, and scorecards. | Compact INR (Crore/Lakh) formattings, delay metrics charts, contractor profiles. |
| **3D Inspection View** | React Three Fiber | Renders interactive digital twin of selected road segment. | Custom GLB asset loading, OrbitControls interaction, lighting presets. |
| **Sensor Overlays** | Diagnostic Layer | Shows simulated vibration, stress heatmaps, and drainage. | Animated shader nodes, point-light indicators, and stress toggle states. |
| **Offline Sync Queue** | Local Sync Manager | Submits reports fully offline. | Dexie.js (IndexedDB) binary storage, Service Worker background sync. |

---

## 5. Technical Architecture

### 5.1. System Component Architecture
The architecture is divided into five layers to ensure performance, security, and scalability:

```
                  +----------------------------------------------+
                  |              Citizen Layer                   |
                  |     (Field Inspectors & General Public)      |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |         Mobile Experience Layer              |
                  |   (Next.js Client, Leaflet, WebGL / R3F)     |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |          Resilient Offline Layer             |
                  |     (IndexedDB Queue, Service Worker)        |
                  +----------------------+-----------------------+
                                         |  Idempotent REST Sync
                                         v
                  +----------------------------------------------+
                  |           AI + Routing Engine                |
                  | (FastAPI, LLM RAG, Spatial Containment API)  |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |       Infrastructure Intelligence Layer      |
                  |        (PostgreSQL 16 + PostGIS)             |
                  +----------------------------------------------+
```

1. **Citizen Layer**: Frontline access point for citizens filing complaints, monitoring contractors, or interacting with the chatbot.
2. **Mobile Experience Layer**: The client application built in Next.js. Renders dynamic maps, WebGL 3D twins, and holds local UI state via Zustand.
3. **Resilient Offline Layer**: The client-side database (Dexie.js/IndexedDB) and Service Worker that captures data in low-network areas.
4. **AI & Routing Engine**: The FastAPI backend. Classifies text categories via structured LLM prompt mapping and executes spatial routing algorithms.
5. **Infrastructure Intelligence Layer (Database)**: The persistent storage engine running PostgreSQL with PostGIS extensions to index geometries and run GIS containment functions.

---

## 6. Database Design

The database schema is designed for geospatial efficiency and strict relational integrity. Coordinates are stored in the EPSG:4326 Coordinate Reference System (CRS) for GPS compatibility.

### 6.1. Entity Relationship Schema

```
                     +-------------------+
                     |    AUTHORITIES    |
                     +---------+---------+
                               | 1
                               |
                               | 1..*
+-----------------+  1..*      |      1..*  +------------------+
|    CONTRACTORS  +------------+------------+      ROADS       |
+--------+--------+                         +--------+---------+
         | 1                                         | 1
         |                                           |
         | 1..*                                      | 1..*
+--------+--------+                         +--------+---------+
|    PROJECTS     |                         |    COMPLAINTS    |
+-----------------+                         +--------+---------+
                                                     | 1
                                                     |
                                                     | 1..*
                                            +--------+---------+
                                            |   SENSOR_LOGS    |
                                            +------------------+
```

### 6.2. Table Schemas

#### 1. Table: `authorities`
Stores administrative municipal and state agencies (e.g. City Works Department, State Highway Division) along with their official jurisdiction boundaries.
* **Fields:**
  * `id` (INTEGER, Primary Key): Unique identifier.
  * `name` (VARCHAR(150), Unique): Name of the administrative body.
  * `contact_email` (VARCHAR(100)): Escalation point of contact.
  * `geom_boundary` (GEOMETRY(MultiPolygon, 4326), Spatial Index): Geofenced jurisdiction boundary.

#### 2. Table: `contractors`
Stores public works contractors and their transparency scorecards.
* **Fields:**
  * `id` (INTEGER, Primary Key): Unique identifier.
  * `name` (VARCHAR(200)): Corporate name of the contractor.
  * `license_number` (VARCHAR(50), Unique): Government license registration.
  * `rating` (NUMERIC(3,2)): Dynamic average score derived from finished projects (0.00 to 5.00).
  * `blacklisted` (BOOLEAN): Status indicating whether the firm is barred from public bidding.
  * `total_contract_value` (NUMERIC(15,2)): Total budget value of projects handled.

#### 3. Table: `roads`
Stores individual road segments, their target budgets, and contractor associations.
* **Fields:**
  * `id` (INTEGER, Primary Key): Unique identifier.
  * `road_code` (VARCHAR(20), Unique): Standard registry code (e.g., SVR-LD01).
  * `name` (VARCHAR(200)): Common street name.
  * `status` (VARCHAR(30)): Status string (`good`, `fair`, `poor`, `under_construction`).
  * `length_km` (NUMERIC(6,2)): Segment length in kilometers.
  * `total_budget` (NUMERIC(15,2)): Budget allocated for the segment.
  * `spent_budget` (NUMERIC(15,2)): Real budget spent.
  * `geom` (GEOMETRY(LineString, 4326), Spatial Index): Line string path representation.
  * `authority_id` (INTEGER, Foreign Key ➔ `authorities.id`): Maintaining agency.
  * `contractor_id` (INTEGER, Foreign Key ➔ `contractors.id`): Active paving contractor.

#### 4. Table: `complaints`
Stores citizen reported defects, routing assignments, and synchronization metadata.
* **Fields:**
  * `id` (INTEGER, Primary Key): Unique identifier.
  * `client_temp_id` (UUID, Unique): Local client-generated identifier used for reconciliation.
  * `title` (VARCHAR(100)): Short header.
  * `description` (TEXT): Citizen text details.
  * `category` (VARCHAR(30)): Category string (`pothole`, `paving_defect`, `waterlogging`, `debris`, `missing_signage`).
  * `status` (VARCHAR(30)): Workflow status (`pending`, `routed`, `in_progress`, `resolved`, `rejected`).
  * `geom` (GEOMETRY(Point, 4326), Spatial Index): GPS coordinate of the defect.
  * `image_url` (VARCHAR(300)): URL to uploaded photo evidence in S3.
  * `created_at` (TIMESTAMP): Time database record was committed.
  * `offline_created_at` (TIMESTAMP): Time recorded by local clock when submitted offline.
  * `road_id` (INTEGER, Foreign Key ➔ `roads.id`): Associated road segment.
  * `assigned_authority_id` (INTEGER, Foreign Key ➔ `authorities.id`): Assigned routing target.

#### 5. Table: `sensor_logs`
Stores simulated real-time diagnostic readings for the digital twin overlay.
* **Fields:**
  * `id` (BIGINT, Primary Key): Unique log entry ID.
  * `road_id` (INTEGER, Foreign Key ➔ `roads.id`): Associated road segment.
  * `sensor_type` (VARCHAR(30)): Sensor type (`vibration`, `drainage_saturation`, `traffic_load`, `stress`).
  * `reading_value` (NUMERIC(6,2)): Numerical measurement reading.
  * `status` (VARCHAR(20)): Status (`nominal`, `warning`, `critical`).
  * `timestamp` (TIMESTAMP): Telemetry time.

---

## 7. AI Workflow

ROADWATCH avoids generic LLM wrappers by separating natural language translation from core geospatial calculations. The AI Accountability & Routing Engine connects context retrieval with PostGIS spatial logic.

```
Citizen Query ➔ Intent Parser ➔ Predefined Database Function call ➔ RAG Prompt Synthesis ➔ Citations Output
```

### 7.1. Conversational Retrieval & Citations
When a citizen asks, *"Who repaired the pothole outside SV Road station?"*, the platform routes the query through a multi-step pipeline:
1. **Semantic Intent Mapping**: The system maps the query to the `contractor_lookup` intent.
2. **Geospatial Lookup**: It executes a parameterized spatial query finding the nearest road segments matching "SV Road".
3. **Database Fetching**: It queries the active projects and contractor databases for the matching segment.
4. **Context Construction**: It structures the results into a clean template:
   ```json
   {
     "contractor": "Apex Infrastructure Ltd",
     "budget_allocated": 12500000.00,
     "road": "S.V. Road (Bandra)",
     "history": "3 previous overruns flagged"
   }
   ```
5. **Prompt Synthesis**: The LLM synthesizes this structured context into an answer, appending explicit UI citation cards that redirect the user to the contractor's scorecard or the road segment's 3D twin.

### 7.2. Spatial Routing Logic
When a complaint is synced, the engine automatically determines its owner without human triage:
* **Department Assignment**: A database trigger uses `ST_Contains` to match the complaint coordinates against the polygons in the `authorities` table.
  ```sql
  SELECT id, name FROM authorities 
  WHERE ST_Contains(geom_boundary, ST_SetSRID(ST_Point(72.83, 19.12), 4326));
  ```
* **Road Linkage**: A radial buffer identifies the closest road segment within a **20-meter** radius:
  ```sql
  SELECT id, contractor_id FROM roads 
  WHERE ST_DWithin(geom, ST_SetSRID(ST_Point(72.83, 19.12), 4326), 0.00018); -- Approx 20 meters in degree projection
  ```
If a match is found, the contractor is linked to the complaint, creating a transparent audit trail.

---

## 8. Mobile-First & Offline-First Design

### 8.1. Mobile Navigation & Snappable Interaction
The interface is optimized for handheld screens down to a 320px viewport, using a responsive shell that replaces standard desktop sidebars with:
* **Bottom Sheets**: Slide-up panels containing filters, lists, and forms.
* **Touch Gestures**: Pull handles that let users swipe panels up or down to expand, peek, or close views.
* **Compact Text Scaling**: Auto-compacting large currency formats (e.g., `₹1.12 Cr` instead of `₹1,11,75,000`) and using dynamic tailwind scaling (`text-[1.4rem] lg:text-[1.8rem]`) prevents layout breaking.

### 8.2. Offline Synchronization Manager
To ensure durability in environments with weak reception:
1. **Compress**: Captured photos are downscaled in-browser using HTML5 Canvas to under 500KB to reduce bandwidth consumption.
2. **Store**: Reports are stored locally in IndexedDB (via Dexie.js) using the citizen's GPS coordinates and local timestamps.
3. **Queue**: The Service Worker registers a background sync event (`sync-complaints`).
4. **Flush**: Once network availability is restored, the service worker pushes queued items in a single HTTP batch to `/api/v1/complaints/sync`.
5. **Purge**: After a successful API response matches local UUIDs with server IDs, the local image Blobs are deleted to conserve device storage.

---

## 9. Security, Privacy, & Governance

* **Citizen Anonymity**: Citizens can submit reports anonymously. GPS coordinate transmission is limited to the coordinates of the defect itself, protecting citizen privacy.
* **Role-Based Access Control (RBAC)**: Administrative routes (such as tender approvals, manual routing overrides, and blacklisting operations) are protected behind JWT authorization.
* **Explainable AI**: The system is prevented from executing raw, dynamically generated SQL statements. It accesses the database solely through parameterized functions, enforcing a strict boundary between conversational logic and database state.

---

## 10. Assumptions & Scope

### 10.1. Platform Assumptions
* **GPS Accuracy**: It is assumed that the client device has a GPS module with accuracy within 10 meters. If GPS is unavailable, the user can place a pin manually on the interactive map.
* **PostGIS Projections**: All geometry coordinates are stored in the WGS 84 (`SRID 4326`) coordinate reference system.

### 10.2. CPPP Procurement Ledger Integration
* **Real-world Tender Audits**: Integration of over 3.5MB of actual Central Public Procurement Portal (CPPP) data containing thousands of national highway and state highway contracts across all 28 Indian States.
* **Award of Contract (AOC) Inspection**: Citizens can drill down into the exact administrative parameters (Tender Reference, Organization Name, Selected Bidder, bids received, contract date, and completion period).

### 10.3. Smart Geospatial Routing via Overpass API
* **Dynamic Jurisdiction Auditing**: Uses OpenStreetMap Overpass queries to map coordinates to road classifications (NHAI, State Highway, Municipal, PWD) and dynamically retrieve relevant Executive Engineer contacts.

---

## 11. Conclusion

ROADWATCH elevates civic-tech from simple form reporting to an interactive platform for public accountability. By connecting financial budgets directly to physical road segments, blacklisted contractor scorecards, and spatial PostGIS/Overpass routing, the platform provides a complete system of municipal oversight.

Its mobile-first, offline-resilient architecture ensures that the system is accessible to field inspectors and citizens alike, regardless of network conditions. ROADWATCH is ready to be deployed as a scalable, transparent civic infrastructure platform.

---

## 12. Appendix: Suggested Presentation Screens

To assist the design and production team in preparing slides or proposal materials, the following key interfaces should be included:

* **Slide 1: Landing Page & Dashboard**: Showcases the 4 KPI summary cards (Road Registry, Sanctioned Spend, Pending Defects, and Resolution Rate) with compact currency format styling (`₹1.12 Cr`).
* **Slide 2: Public Spend Ledger**: Dedicated data grid featuring paginated, searchable CPPP contracts, complete with the CPPP-themed Award of Contract details modal.
* **Slide 3: WebGL 3D Segment digital Twin**: Displays the rotating 3D road model with active sensor hotspots and underground utility pipelines.
* **Slide 4: Floating Persistent Chatbot**: Shows the chatbot widget with its quick Highway Explorer dropdown, matching keywords to the local CPPP dataset and FAQ knowledge base.

