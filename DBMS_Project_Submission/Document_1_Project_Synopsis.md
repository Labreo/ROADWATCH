# Project Synopsis

**A concise overview of the proposed Database Management System (DBMS) project.**

---

## 1. General Information

### A) Project Title
**ROADWATCH — Civic Infrastructure Intelligence & Road Grievance Governance Platform**  
*(A PostGIS-Enabled, Trigger-Driven Municipal Public Works & Grievance Lifecycle Management System)*

* **Member 1 (Team Lead):** Kanak Waradkar | **Roll No:** `24B-CO-030` | **Email:** kanakwaradkar@gmail.com  
* **Member 2:** Krushna Surve | **Roll No:** `24B-CO-031` | **Email:** krushnasurve07@gmail.com  
* **Member 3:** Manjunath Subhash Gavada | **Roll No:** `24B-CO-035` | **Email:** manjunathgavada40@gmail.com  

---

## 2. Project Overview & Problem Statement

### • Introduction
**ROADWATCH** is an enterprise-grade civic infrastructure intelligence and database governance platform engineered for municipal corporations, State Public Works Departments (PWD), Smart City Directorates, and urban citizens. It provides a single source of truth for physical road network assets, municipal maintenance budgets, public procurement tenders, contractor execution scorecards, and citizen-reported road defects (such as potholes, structural cracking, and waterlogging).

### • Problem Statement
Urban road networks form the critical economic lifeline of modern cities, yet their maintenance and grievance redressal systems suffer from severe, systemic deficiencies:
1. **Siloed & Uncoordinated Data:** Road asset inventories, tender awards, financial budget allocations, and citizen grievances are maintained across disconnected paper logs or fragmented spreadsheets.
2. **Deficit of Contractor Accountability:** Contractors repeatedly deliver substandard resurfacing work that degrades within weeks, yet they face zero administrative penalties or delay tracking, enabling repeatedly blacklisted or non-performing vendors to secure lucrative new tenders.
3. **Misrouted Citizen Grievances:** Citizens who report road hazards through informal channels (WhatsApp groups, phone calls, social media) experience dropped complaints and bureaucratic finger-pointing because complaints are assigned manually without geospatial jurisdiction validation (e.g., routing a National Highway or PWD defect to a local municipal ward).
4. **Lack of Automated SLA Enforcement & Auditability:** No automated mechanism exists to escalate overdue grievances or record an immutable audit log when status updates, budget variances, or project deadlines are altered.

### • Proposed Solution
ROADWATCH resolves these failures by modeling every road segment, municipal authority jurisdiction, contractor profile, public tender, and citizen grievance as normalized entities within a high-performance relational database (**PostgreSQL with PostGIS extensions**). 

Crucially, **business rules, spatial routing, grievance lifecycles, and audit compliance are enforced directly at the database engine layer** using triggers, spatial containment functions (`ST_Contains`, `ST_DWithin`), domain check constraints, and role-based views. This architectural decision ensures data integrity, deterministic SLA escalation, and tamper-resistant auditability regardless of which web, mobile, or external API client connects to the database.

---

## 3. Scope and Objectives

### • Core Goals
1. **Design a Rigorously Normalized Relational Schema:** Author an expressive, normalized (3NF/BCNF) relational schema modeling municipal authorities, road geometries, public works contracts, contractors, tenders, and citizen grievances.
2. **Enforce Database-Level Grievance State Machine:** Implement strict transition validation via triggers preventing invalid status jumps (e.g., rejecting attempts to move a complaint directly from `pending` to `resolved` without prior assignment and inspection).
3. **Implement Automated SLA Breach Escalation:** Create scheduled and event-driven database procedures that automatically increment escalation levels (Level 0 → Level 1 → Level 2) and reassign responsibility when complaints breach category-specific SLA thresholds.
4. **Automate Dynamic Contractor Performance Metrics:** Calculate objective contractor performance ratings (`performance_index`, delay ratios, and project completion rates) via triggers upon project completion or delay updates.
5. **Provide Immutable Audit Logging:** Record all state modifications, budget variances, and data mutations in a central `audit_log` table capturing timestamp, old/new tuples, and acting user credentials.
6. **Demonstrate Measurable Query Optimization:** Benchmark complex spatial and analytical queries utilizing Spatial GiST indices and composite B-tree indices against non-indexed executions.

### • In Scope
* **Geospatial Asset & Jurisdiction Modeling:** Roads modeled with spatial LineStrings (`GEOMETRY(LineString, 4326)`) and administrative jurisdictions modeled with spatial Polygons (`GEOMETRY(Polygon, 4326)`).
* **Automated Spatial Defect Association:** Matching a citizen's GPS report (`GEOMETRY(Point, 4326)`) to the encompassing authority boundary via `ST_Contains` and snapping to the nearest road segment within a 20-meter tolerance via `ST_DWithin`.
* **Grievance Lifecycle Management:** Status progression through `pending` → `routed` → `in_progress` → `resolved` / `rejected`, with mandatory resolution logs and foreign key links to the acting authority.
* **Public Procurement & Tender Lifecycle:** Tracking tenders from publication through contractor bidding (`tender_bids` associative table) to award and project contract execution.
* **Fiscal Transparency & Variance Tracking:** Tracking allocated budget versus actual expenditures, milestone release approvals, and formal budget variance justification logs.
* **Role-Based Security Views:** Granular views separating permissions for Citizens, Field Engineers, Municipal Administrators, and Public Auditors.

### • Out of Scope
* Fabrication or low-level firmware development of physical vehicle accelerometer hardware (vibration sensor data is consumed via pre-formatted REST/JSON endpoints).
* Cellular telecommunications base-station handover logic.
* Financial escrow banking payment gateway execution (funds are tracked at the ledger/allocation level, not direct bank transfer wire).
* Native mobile binary compilation (a mobile-responsive Next.js Progressive Web App client fulfills all user interface requirements).

---

## 4. System Functionalities & User Roles

Access control is partitioned into four distinct user roles, each interacting with the system through restricted, role-specific database views and stored procedures:

* **Citizen:**
  * Can register and authenticate with verified contact credentials.
  * Can submit road defect complaints with geo-coordinates, description, category, and photo URL.
  * Can view real-time status, escalation history, and assigned department for their own complaints.
  * Can query public road transparency views (road condition scorecards, contractor performance rankings, and municipal expenditure per kilometer).

* **Field / Ward Engineer (Staff):**
  * Can view grievances routed specifically to their jurisdictional ward or assigned road segments.
  * Can update complaint status from `routed` to `in_progress` and subsequently to `resolved`, providing mandatory repair notes.
  * Can log completion of scheduled road maintenance milestones for supervisor review.

* **Municipal Authority Administrator (Commissioner / PWD Executive):**
  * Full administrative oversight across all roads, tenders, contractors, and grievances in their jurisdiction.
  * Floats new public tenders, evaluates contractor bids, and awards road maintenance contracts.
  * Approves or rejects project budget variances and contingency reserve releases.
  * Configures category-wise SLA thresholds (e.g., 24 hours for severe potholes, 72 hours for missing street signage).

* **Public Auditor & Oversight Officer:**
  * Read-only access to immutable system audit trails (`audit_log`), contractor penalty records, and SLA breach timelines.
  * Generates analytics reports on expenditure efficiency (allocated vs. spent per kilometer) and recurring failure zones.

---

## 5. Technology Stack

* **Frontend / User Interface:** Next.js 16 (React, TypeScript), Leaflet GIS mapping for interactive spatial road rendering, Framer Motion for stateful micro-interactions, and Tailwind CSS.
* **Backend / Application Server:** FastAPI (Python 3.11), SQLAlchemy ORM and `psycopg2` driver; core data validation, audit triggers, and state rules reside directly inside PostgreSQL.
* **Database Engine:** **PostgreSQL 16+** with the **PostGIS 3.4+** spatial extension (utilizing spatial types, GiST spatial indexing, PL/pgSQL stored trigger functions, and JSONB audit logging).
* **Database Modeling & Diagramming:** Draw.io / Lucidchart (Chen Notation ER modeling), dbdiagram.io, and PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)` execution profiler.
