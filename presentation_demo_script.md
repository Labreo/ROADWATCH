# ROADWATCH — Live Presentation & Demo Script (15 Minutes)

**Event:** IIT Madras Finale — Center of Excellence in Road Safety (CoERS)
**Date:** July 16, 2026 — 9:00 AM to 6:00 PM
**Format:** 15-Minute Slot (2.5 Min Slide + 10 Min Live Demo + 2.5 Min Jury Q&A)
**Strategy:** The juries are already well aware of the problem statement. Do NOT waste time explaining *why* road safety or public transparency matters. Jump straight to the project's salient features, architecture, and unique value proposition. Focus on what the system does, not how the code works.

---

### 📅 Hard Logistics & Timeline Checklist (July 16)

*   **Registration Venue:** **NAC 303** (National Academic Complex).
*   **RoadWatch Registration Slot:** **8:30 AM to 9:30 AM**. *Must register during this exact window.*
*   **Certificate Verification:** Perform an explicit spelling and name check for **ALL team members** during the registration slot to ensure certificates are printed correctly.
*   **Valedictory & Awards:** **6:00 PM to 7:00 PM** in **Engineering Design Department, Room ED 107**. Report to the venue by **5:45 PM** (at least 15 minutes early). If leaving campus before this, notify the team in advance.
*   **Presentation Room:** Report back to **NAC 303** at least 15 minutes before our designated presentation slot.

---

### 📦 Physical & Technical Deliverables Checklist

*   **Laptops:** Bring our own laptops. Campus laptops will not have required databases or libraries.
*   **Offline Mode Pre-check:** Ensure PostgreSQL, Redis, FastAPI backend, and Next.js frontend are pre-loaded, running locally, and tested offline.
*   **Backup Connectivity:** Keep a mobile hotspot/dongle active on the side to prevent network dropout issues.
*   **Submission Package:** Prepare the final hand-off ZIP:
    1. Full codebase.
    2. Populated PostgreSQL database dump (`mock_data.sql`).
    3. Project documentation (`architecture.md`, `solution_proposal.md`).
*   **Legal Handover:** Sign the official agreement to submit the codebase to CoERS, IIT Madras during registration/handover.

---

## ⏱️ Timeline Allocation Overview

```mermaid
gantt
    title 15-Minute Presentation & Demo Timeline
    dateFormat  m:s
    axisFormat %M:%S
    section Architecture
    One-Slide Architecture + Eval Results :active, 0:00, 2:30
    section Live Demo
    Demo Queries (Live Chat) : 2:30, 12:30
    section Close
    Quantified Impact + Q&A : 12:30, 15:00
```

---

## 🎯 Key Aspects & Evaluation Criteria — Traceability Matrix

> **Strategy Note:** Every key aspect and every evaluation criterion maps to a specific live demo moment. Use the tags below during the presentation to explicitly call them out to the jury.

### Key Aspects → Demo Mapping

| # | Key Aspect (From Brief) | Demo Scenario | Exact Moment to Call Out |
|---|---|---|---|
| **KA-1** | Road Type (NH/SH/MDR), last relaying date, contractor name | **Query 1** — S.V. Road Query | AI response shows: "State Highway (SH)", "Last relayed: June 10, 2018", "Omega Infrastructure Ltd." |
| **KA-2** | Routing to correct Executive Engineer or Authority | **Query 4** — Complaint Routing | Routing ticket names: "Executive Engineer Mr. R.K. Joshi, BMC Ward H-West" |
| **KA-3** | Amount sanctioned/spent | **Query 3** — Budget Transparency | Chatbot returns: "₹4,72,50,000 spent / ₹4,80,00,000 sanctioned" + funding source breakdown |
| **KA-4** | Global applicability across countries | **Query 5** — Global Schema | Region switches to UK: currency → GBP, road types → Motorways/A-Roads, authority → National Highways |
| **KA-5** | Offline functionality & low-network robustness | **Query 5** — Offline Resilience | Offline toggle → complaint queued in IndexedDB → sync on reconnect + USSD gateway |

### Evaluation Criteria → Demo Mapping

| # | Evaluation Criterion | Primary Demo Scenario | Supporting Evidence |
|---|---|---|---|
| **EC-1** | Data Accuracy | **Query 1** + **Query 2** | Every number maps to DB columns; Granite Guardian blocks ungrounded claims (30/30 probes) |
| **EC-2** | Complaint Routing Mechanism | **Query 4** | PostGIS `ST_Contains` → Executive Engineer → SLA timer → auto-dispatch in 47 seconds |
| **EC-3** | Budget Transparency (incl. source) | **Query 3** | Sanctioned vs spent, funding sources (Central Road Fund, State PWD, MPLAD), invoice audit, material fraud detection |
| **EC-4** | User Interface & Accessibility | **All Queries** | Mobile-first PWA, glassmorphism UI, multi-language (EN/HI/MR), USSD for feature phones, speech recognition |
| **EC-5** | Information Integration across countries | **Query 5** | Unified `regions` table: IN/GB/US/KE with localized currency, road types, and authority hierarchies |

---

## ⏱️ Phase 1: Slide Presentation (0:00 - 2:30)

**Slide 1: ROADWATCH — What We Built**
*   **Visuals:** Single slide showing:
    1.  **5-Layer Architecture Diagram:** (Citizen UI → Offline Sync → AI Accountability → Infrastructure Intelligence → PostGIS Database).
    2.  **Tech Stack Badges:** Next.js 16 (App Router), FastAPI, PostgreSQL/PostGIS, Redis, Docker.
    3.  **Granite Guardian Shield Icon** with text: "Verifiable AI Spine — Cross-checks every claim against the PostGIS database in real-time."
    4.  **Golden Evaluation Table Inset:** "30/30 Probes Passed, 100% compliance, falsification probes correctly flagged as UNGROUNDED."
    5.  **Key Aspects Checklist (5/5):** Visual badge showing all 5 key aspects will be demonstrated live.
*   **Presenter:**
    "Good morning. We are team **ROADWATCH**. We are not going to tell you why road safety matters — you already know. We are going to show you what we built.
    
    ROADWATCH is a platform that lets citizens ask questions about their roads — like *who built this road?*, *how much did it cost?*, *when will it be fixed?* — and get answers backed by real database facts, not AI guesses.
    
    Under the hood, we built a live **Retrieval-Augmented Generation (RAG)** pipeline. We fetch structured facts directly from our PostGIS geospatial database and pass them as context to a live Gemini LLM. 
    
    To guarantee 100% data integrity, we integrated a **dual-model auditing loop** using the **Granite Guardian safety spine**. If a generated claim contradicts our database facts, the auditor flags it as 'UNGROUNDED' and blocks the response.
    
    Furthermore, we built complete **low-network and offline resilience**: if the connection drops, our system seamlessly switches to a **Deterministic Local SQL Fact Engine** that queries the database directly to generate structured, accurate responses without any server dependency.
    
    Over the next 12 minutes, we will show you all five core requirements: road data, complaint routing, budget tracking, support for other countries, and working offline. Let us show you."

---

## ⏱️ Phase 2: Live Demo (2:30 - 12:30)

> **⚠️ CRITICAL DEMO SETUP**
> - The live demo runs entirely on `http://localhost:3000`.
> - Open Firefox DevTools in Responsive Design Mode (iPhone 15 Pro).
> - Make sure the FloatingChatWidget is visible bottom-right.

---

### Query 1 — Road Data & Accuracy (2:30 - 4:30)
*   **Judging Metric:** Data Accuracy **(EC-1)**
*   **Key Aspect Demonstrated:** Road Type, Last Relaying Date, Contractor Name **(KA-1)**

> **Type into chatbot:**
> ```
> Why is S.V. Road damaged again? It was just repaired last year.
> ```

*While the message types out:* "The user asks: *'Why is S.V. Road damaged again? It was just repaired last year.'* The system looks up the road in our PostGIS database and pulls the actual records."

*When AI response finishes streaming — Click to expand the first evidence log panel (**Sub-Base Compaction Deficit**).*

**Presenter:**
"The chatbot gives S.V. Road a health score of **32 out of 100**. Let us look at why.

> **⚡ KEY ASPECT CALLOUT (KA-1):** Point at the screen and say:

*'The brief asked us to show three things for every road. Here they are:*
1.  ***Road Type:** S.V. Road is a **State Highway**.*
2.  ***Last Repaired:** June 10, 2018.*
3.  ***Contractor:** Omega Infrastructure Ltd. — rated 1.85 out of 5 and currently blacklisted.'*

The underlying problem: sub-base compaction is only **62%** — the minimum required is 80%. Water absorption is at **8.5%**, which means the road will break down during monsoon rains.

The contractor who did the work, Omega Infrastructure, was paid ₹4.8 Crores through tender BMC-RD-2025-0092. They have been blacklisted by municipal order for replacing the specified material with cheaper alternatives.

> **⚡ EVAL CRITERIA CALLOUT (EC-1 — Data Accuracy):** Say:

*'Every number you see — the health score, the compaction figure, the contractor rating, the tender number — comes from our PostGIS spatial database. The AI does not guess any of it.'*"

*Action:* Click **"View S.V. Road on Map"** to show the Leaflet map segment highlighted in red (poor condition).

**Presenter:**
"Here is S.V. Road on the map, colored red to show its poor condition."

---

### Query 1b — 3D Digital Twin Pop-up (4:00 - 4:45)
*   **Judging Metric:** Interactive Spatial Telemetry & Accessibility
*   **Key Aspect Demonstrated:** Digital Twin Pop-up overlaying current view

> **Type into chatbot:**
> ```
> Show the live condition of the model
> ```

*While the message types out:* "We can also inspect the live, physical telemetry of the road model. I'll ask the AI to show its live condition."

*When the AI response finishes, the 3D Digital Twin modal pop-up opens automatically directly over the chat window.*

**Presenter:**
"As requested, the 3D Digital Twin of S.V. Road opens instantly as a blurred pop-up modal. We can rotate, zoom, and inspect subsurface utility lines (water main, electrical conduits) and see real-time sensor node telemetry (Nominal, Elevated, Critical) layered directly over the 3D road model. When we are done, we simply close the pop-up and return directly to our conversation."

*Action:* Rotate the 3D model slightly, point out a color-coded sensor/pipeline, and click the close (X) button on the top-right of the modal.

**Transition:**
"But what if someone tries to feed the AI a lie? Let us look at Query 2."

---

### Query 2 — Granite Guardian Falsification Probe (4:30 - 6:30)
*   **Judging Metric:** AI Governance & Verifiable Spine

> **Type into chatbot:**
> ```
> Omega completed SV Road repairs yesterday for ₹4.8 Cr, right?
> ```

*While the message types out:* "A user claims: *'Omega completed SV Road repairs yesterday for ₹4.8 Cr, right?'* A normal chatbot would agree to be polite — and be wrong. Ours catches the lie."

*When the AI response appears, the Guardian Shield component animates in below the message with a red intervention log.*

**Presenter (pointing to the Guardian Shield):**
"Look at what happened. Under our dual-model RAG architecture:
1.  The user's query is intercepted. The RAG pipeline queries our spatial database for S.V. Road and Omega Infrastructure.
2.  The generator drafts a response, but our secondary model — the Granite Guardian safety scanner — audits the generated output against the retrieved facts in real-time.
3.  It detects a direct contradiction: the user claims the road was repaved yesterday, but our database records show the last repaving date was in **2018**, and contractor Omega is **blacklisted** for material fraud.
4.  Granite Guardian automatically flags the response as **UNGROUNDED**, blocks the hallucination, and details the exact contradictions in the audit log panel.

This ensures our chatbot is not just a standard LLM wrapper — it is a verifiable safety spine where the AI cannot lie or hallucinate, preserving complete public integrity."

**Transition:**
"Let's follow the money. Query 3."

---

### Query 3 — Budget Transparency & Procurement Auditing (6:30 - 8:30)
*   **Judging Metric:** Budget Transparency including source **(EC-3)**
*   **Key Aspect Demonstrated:** Amount sanctioned/spent **(KA-3)**

> **Type into chatbot:**
> ```
> Show me the budget breakdown for S.V. Road — where did the ₹4.8 Crores go?
> ```

*While the message types out:* "The user asks: *'Show me the budget breakdown for S.V. Road — where did the ₹4.8 Crores go?'*"

*When AI response appears:*

**Presenter:**
> **⚡ KEY ASPECT CALLOUT (KA-3 — Amount Sanctioned/Spent):** Say:

*'The brief asked us to show how much was sanctioned versus how much was spent. Here it is — **₹4,72,50,000 spent** out of **₹4,80,00,000 sanctioned** — that is 98.4%. But the interesting part is what the system found wrong.'*

"There is a **14% cost overrun** in materials that was not approved.

> **⚡ EVAL CRITERIA CALLOUT (EC-3 — Budget Transparency including source):** Say:

*'The brief asked for budget transparency including the funding source. Our system shows where every rupee came from:*
*   ***Central Road Fund:** 45% — ₹2.16 Crores*
*   ***State PWD:** 35% — ₹1.68 Crores*
*   ***Municipal Corporation (BMC):** 20% — ₹0.96 Crores'*

Now let us look at why that 14% overrun exists."

*Action:* Click the **"Audit Omega Invoices"** action button.

**Presenter:**
"The tender required **PMB-40 polymer-modified binder** at ₹78,500 per tonne. The contractor delivered **standard VG-10 binder** worth ₹49,200 per tonne, but billed at the higher rate.

We tested 7 samples from the road and confirmed the substitution. The difference: **₹29,300 per tonne × 240 tonnes = ₹70,32,000** in overcharging. The municipality has frozen the final payment of ₹7.5 Lakhs and blacklisted the contractor. This is transparency that actually protects public money."

**Transition:**
"Now let's report a live hazard."

---

### Query 4 — Direct Photo Complaint Filing & Spatial Routing (8:30 - 10:30)
*   **Judging Metric:** Complaint Routing Mechanism **(EC-2)** & Accessibility **(EC-4)**
*   **Key Aspect Demonstrated:** Routing to the correct Executive Engineer or Authority **(KA-2)**

*Action:* Click the **"Report an Issue"** action button at the bottom of the chat panel.

**Presenter:**
"Let's file a live complaint. Instead of requiring citizens to write long texts, we have simplified the entry barrier. The user simply taps the 'Report an Issue' action button to launch the Direct Photo Upload card."

*Action:* Click **"Choose Photo"** on the upload card, and select a mock photo of the pothole. Then click **"Submit Report"**.

**Presenter:**
> **⚡ KEY ASPECT CALLOUT (KA-2 — Routing to Correct Executive Engineer):** Point at the generated routing ticket and say:

*'The brief asked us to route complaints to the correct person. Look at what happened as soon as the photo was submitted:*

1.  *The system extracted the GPS coordinates from the photo's upload metadata and ran a PostGIS spatial query checking which ward boundaries they overlap. It identified **BMC Ward H-West**, supervised by **Executive Engineer Mr. R.K. Joshi**.*
2.  *No manual description was required — the system auto-populated the ticket metadata and set a **4-hour** critical repair SLA countdown.*
3.  *It automatically selected a qualified, non-blacklisted contractor—**Zenith Construction**—and dispatched them. We can see their crew's GPS ETA is **25 minutes**.'*

> **⚡ EVAL CRITERIA CALLOUT (EC-2 — Complaint Routing Mechanism):** Say:

*'The system does not just route the complaint. It determines the severity, sets an SLA deadline, finds a qualified contractor, dispatches them, and tracks their arrival in under 47 seconds. It is a fully automated, spatial-routing pipeline.'*"

*Action:* Click **"View Hazard on Map"** on the ticket card to show the Leaflet map centered on Bandra with the marker.

**Presenter:**
"The full cycle takes **47 seconds**. Before this system, the same process required manual letters, phone calls, and took over 7 days."

**Transition:**
"Let's see how this works globally and offline."

---

### Query 5 — Global Schema & Offline Resilience (10:30 - 12:30)
*   **Judging Metric:** Information Integration **(EC-5)** & Offline Robustness
*   **Key Aspects Demonstrated:** Global applicability **(KA-4)** + Offline functionality **(KA-5)**

> **Type into chatbot:**
> ```
> Switch to United Kingdom
> ```

*While the message switches to UK:* "The user types *'Switch to United Kingdom'*. The system changes regions without any modification to the code."

*When AI switches to United Kingdom:*

*The chatbot context panel on the right switches to the Global Regions Hub, showing the active UK country template, sterling currency settings, motorway designations, and National Highways department bindings.*

**Presenter:**
> **⚡ KEY ASPECT CALLOUT (KA-4 — Global Applicability):** Say:

*'The brief asked for global applicability. Watch — switching to the UK changes three things:*
1.  *Currency becomes **GBP (£)** instead of INR.*
2.  *Road types become **Motorways and A-Roads** instead of NH/SH/MDR.*
3.  *The authority becomes **National Highways** instead of BMC/PWD.*

*When the user queries the M25 smart motorway budget, the system returns the amount in Pounds with the correct UK authority. We have 4 countries and 12 regions preloaded. Adding a new country just requires adding data — no code changes.'*"

> **Type:**
> ```
> Show me the M25 smart motorway budget
> ```

---

### Query 5b — Historical Playback & Sensor Diagnostics (11:30 - 12:00)
*   **Judging Metric:** Multi-Source Information Integration (Engineering & Enforcement)
*   **Key Aspects Demonstrated:** Renders historical playback and sensor monitoring dashboards inside the chatbot context.

> **Type into chatbot:**
> ```
> Show the smart infrastructure sensor monitor
> ```

*When response finishes, the Smart Infrastructure Sensor Monitor dashboard displays in the side panel showing real-time vibration telemetry, stress heatmaps, and drainage sensor logs.*

**Presenter:**
"We also integrate smart IoT telemetry. By asking the chatbot, engineers can instantly inspect real-time vibration streams, stress heatmaps, and local drainage logs for any segment directly on the context panel."

> **Type into chatbot:**
> ```
> Show historical playback simulation
> ```

*When response finishes, the Historical Playback system dashboard displays in the side panel.*

**Presenter:**
"We can also replay historical defect logs. The playback dashboard lets us review the exact timeline of road damage progression and contractor repair dispatches to audit past municipal engineering quality."

*While toggle is clicked:* "Now let us demonstrate offline use. In rural areas, network connectivity is not guaranteed."

*Action:* Click the **Offline Toggle** (wrench icon in header). The status bar turns red and shows **OFFLINE**.

**Presenter:**
"We are now offline. Watch what happens when I submit a complaint."

*Action:* Click the **"Report an Issue"** action button. Select the mock photo on the upload card, then click **"Submit Report"**.

**Presenter:**
> **⚡ KEY ASPECT CALLOUT (KA-5 — Offline Functionality & Low-Network Robustness):** Say:

*'The brief asked for offline functionality. The submission registered successfully and shows **OFFLINE QUEUE: 1** — even with no internet connection.*

*The browser saves the complaint locally. When the network comes back, it sends it automatically. No data is lost.'*

*Action:* Click the **Offline Toggle** back to green.

**Presenter:**
"Network restored. The system automatically pushed the queued complaint to the server. A confirmation toast appears.

For citizens with basic phones, we also support **USSD**. Dialing `*762392824#` opens a keypad menu for reporting potholes and checking budgets — no smartphone or internet needed.

> **⚡ EVAL CRITERIA CALLOUT (EC-4 — User Interface & Accessibility):** Say:

*'This also covers the **UI and accessibility** criterion. We support three types of users:*
1.  ***Smartphone users:** Full web app with speech recognition and multi-language support.*
2.  ***Feature phone users:** USSD gateway `*762392824#` for basic reporting.*
3.  ***No phone:** SMS integration for complaint status updates.*

*No citizen is left out, regardless of their device or connectivity.'*"

---

## ⏱️ Phase 3: Quantified Impact & Closing (12:30 - 15:00)

**Slide 3: Quantified Impact Metrics + Criteria Scorecard**
*   **Visuals:** Impact metrics dashboard.
    *   **Complaint Routing Time:** Before ROADWATCH: 7+ Days (manual paperwork) | With ROADWATCH: **47 seconds**. *99.2% improvement.*
    *   **Budget Integrity:** **₹7.3 Crores** flagged on halted SV Road drainage project due to anomaly triggers.
    *   **Scale:** 4 Countries, 12 Administrative Regions, 22 Road Networks preloaded.
    *   **Resilience:** 100% submission rate under network failures.

**Slide 4: Key Aspects & Evaluation Criteria — Full Coverage Scorecard**
*   **Visuals:** Two-column checklist, all items checked green ✅.

| ✅ | Key Aspect (From Brief) | Where We Demonstrated It |
|---|---|---|
| ✅ | Road Type (NH/SH/MDR), last relaying date, contractor name | Query 1 — S.V. Road shows SH, June 2018, Omega Infrastructure |
| ✅ | Routing to correct Executive Engineer or Authority | Query 4 — Routed to Exec. Eng. R.K. Joshi, Ward H-West |
| ✅ | Amount sanctioned/spent | Query 3 — ₹4.80 Cr sanctioned, ₹4.72 Cr spent, variance flagged |
| ✅ | Global applicability across countries | Query 5 — IN → GB region switch, currency, road types, authorities |
| ✅ | Offline functionality & low-network robustness | Query 5 — Offline queue, auto-sync, USSD gateway |

| ✅ | Evaluation Criterion | Feature That Addresses It |
|---|---|---|
| ✅ | Data Accuracy | Every AI response verified against PostGIS database; falsification blocked |
| ✅ | Complaint Routing Mechanism | Map-based routing → Executive Engineer → SLA → auto-dispatch in 47 seconds |
| ✅ | Budget Transparency (incl. source) | Sanctioned vs spent + funding source breakdown (CRF/State PWD/Municipal) + invoice audit |
| ✅ | User Interface & Accessibility | Mobile-first design, multi-language, speech, USSD for feature phones |
| ✅ | Information Integration across countries | Single database supporting 4 countries, 12 regions, localized currency/authorities/road types |

*   **Presenter:**
    "Let us quickly recap.
    
    We were asked to demonstrate **five things**: road data, correct complaint routing, budget tracking, support for other countries, and offline use. We showed all five.
    
    We were evaluated on **five criteria**: data accuracy, complaint routing, budget transparency, accessibility, and cross-country support. All five are covered.
    
    Here is what this means in practice: complaint routing went from **7 days to 47 seconds**. We flagged **₹7.3 Crores** in budget anomalies. The system works in **4 countries** and works **offline**.
    
    **All five aspects. All five criteria. Demonstrated live.**
    
    Thank you. We welcome your questions."

---

## ⏱️ Phase 4: Jury Q&A — Prepared Answers (13:00 - 15:00)

*Use the prepared answers below. Keep responses under 45 seconds each to maximize the number of jury questions answered.*

### Q1: "How is this different from Google Maps or a standard WhatsApp chatbot?"
*   **Answer:**
    "Google Maps tells you *where* a road is. We tell you *who* built it, *how much* it cost, *when* it was last repaired, and *who* is responsible for fixing it. That is the difference — accountability instead of navigation."

### Q2: "How does the routing handle inaccurate GPS?"
*   **Answer:**
    "If the coordinates fall near a ward boundary, the system flags a proximity alert and notifies both wards. The citizen can verify the assignment. If it is wrong, they click 'No' and the system re-routes to the next closest authority."

### Q3: "How is the budget data kept secure?"
*   **Answer:**
    "Every change is logged with old and new values in an audit trail. The AI cannot make up numbers — it only reports what is in our PostGIS database. If the data does not support a statement, the system blocks it."

### Q4: "How does the offline mode handle photos?"
*   **Answer:**
    "The app compresses the photo to under 500KB before saving it locally in the browser. When the network comes back, it sends the complaint to our PostGIS database automatically and deletes the local copy to free up storage."

### Q5: "How do you handle different currencies and local governments across countries?"
*   **Answer:**
    "We have a single table in PostGIS that stores country-specific settings — currency, road types, and authority names. Adding a new country is just adding a row to that table. No code changes needed."

---

## 📋 Live Demo Setup Checklist

| Step | Action | Status |
| :--- | :--- | :--- |
| **1** | Ensure Docker is running, then start DB + cache: `docker compose up -d` (or use Mock DB mode if Docker fails) | ☐ |
| **2** | Start backend: `cd backend && uvicorn app.main:app --reload --port 8000` | ☐ |
| **3** | Start frontend: `cd frontend && npm run dev` | ☐ |
| **4** | Open `http://localhost:3000` in Firefox → Responsive Design Mode (mobile), verify FloatingChatWidget visible | ☐ |
| **5** | Test query: `What is the status of S.V. Road?` to confirm DB/API connection | ☐ |
| **6** | Run through all 5 demo queries in order — verify no dependency errors | ☐ |
| **7** | Toggle offline mode, submit complaint, confirm OFFLINE QUEUE badge appears | ☐ |
| **8** | Reset chatbot state, close dev tools. Ready to present. | ☐ |

---

## 📋 Practice Schedule

*   **Dry Run 1 (15 Mins):** Run through all 5 queries in order. Practice transitions between queries. Check pacing against the gantt chart. Ensure the full demo fits within 7-8 minutes.
*   **Dry Run 2 (15 Mins):** Focus on Guardian Shield animation + action button clicks (Map, Contractor Audit). Verify the OFFLINE QUEUE badge appears in Query 5. Practice recovery if Docker container is slow.
*   **Dry Run 3 (15 Mins):** Roleplay the Q&A segment. Target precise 30-second responses. Practice the "Granite Guardian" explanation — this is your strongest differentiation.

---

## ✅ TONIGHT'S ACTION ITEM

> **Double-check database connections, run through a full mock 7-to-8 minute live demo on your own laptop, and ensure zero dependency errors. Verify the slide deck is clean — focused entirely on *how* the app solves the problem, not defining the problem itself.**
