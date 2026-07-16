# Presenter's Script — ROADWATCH Demo

## Phase 1: Opening Slide (0:00 - 2:30)

"Good morning, members of the jury. I am Kanak Waradkar from Team ROADWATCH, and I am going to demonstrate our platform.

ROADWATCH is an unified AI agent platform that empowers average citizens to ask critical questions about their infrastructure—like *'Who built this road?'*, *'How much did it cost?'*, and *'When will it be fixed?'*—delivering answers backed by verified database facts, not AI hallucinations. It is built on independent data modules, fully localized, and accessible via an easy-to-use chatbot operating in all major national languages of India.

Our hackathon ideals are explicitly grounded in the **IIT Madras CoERS (Centre of Excellence for Road Safety) 5E Framework**—specifically merging **Engineering, Enforcement, and Empathy**. We believe road safety is a data-driven system, not a game of chance.

Under the hood, we built a live Retrieval-Augmented Generation (RAG) pipeline. We horizontally integrate and fetch structured facts directly from our PostGIS geospatial database, which pulls real-time data from authoritative national repositories including **MoRTH's iRAD (Integrated Road Accident Database)**, **NHAI's Data Lake**, and live state **VAHAN** and **SARATHI APIs**. This rich semantic context is then passed directly to a fine-tuned Gemini LLM.

To guarantee 100% data integrity, we integrated a dual-model auditing loop using the Granite Guardian safety spine. If a generated claim contradicts our database facts or signals foul play, the auditor flags it as `'UNGROUNDED'` and blocks the response.

Furthermore, we built complete low-network and offline resilience: if the connection drops, our system seamlessly switches to a **Deterministic Local SQL Fact Engine** that queries local database segments directly to generate structured, accurate responses without any server dependency. We also built systems like our 3D Digital Twin to make concern updates and report filing accessible to those with limited literacy.

Over the next 12 minutes, we will show you all five core requirements: road data, complaint routing, budget tracking, global schema, and working offline. Let us show you."

---

## Query 1 — Road Data & Accuracy (2:30 - 4:30)

"Coming to our dashboard, we begin with the AI chatbot since that is the focal point. The user asks: *'Why is S.V. Road damaged again? It was just repaired last year.'* The system looks up the road in our PostGIS spatial database, fetching the coordinates and pulling actual structural health records from the **IIT Madras CoERS Sanjaya Location Intelligence Engine**. This gives us an accurate text response and ties the connected module information across our systems.

The chatbot gives S.V. Road a health score of 32 out of 100. Let us look at why.

The brief asked us to show three things for every road. Here they are:

* **Road Type:** S.V. Road is a State Highway.
* **Last Repaired:** June 10, 2018.
* **Contractor:** Omega Infrastructure Ltd. — rated 1.85 out of 5 and currently blacklisted.

This is not a maintenance failure—this is a procurement fraud. The compaction never reached spec; the asphalt binder was swapped for a cheaper grade. Our system caught it because we cross-referenced on-site sensor readings against the original signed tender documents pulled directly from the Central Government's **PMGSY OMMAS (Online Management, Monitoring and Accounting System) API**—something no manual audit had done.

And the consequence is live on screen right now. Omega is blacklisted. Their final milestone payment of ₹7.5 Lakhs is frozen. The 3-year defect liability clause means this repair bill goes back to them—at zero cost to the taxpayer. ROADWATCH didn't just find the problem; it triggered the automated enforcement chain. Every number you see comes directly from our validated geospatial backend. The AI does not guess any of it.

Here is S.V. Road on the map, colored red to show its poor condition.

But suppose these numbers and data figures don't interest you, or you prefer a simplified visual solution. We have built an accessible 3D digital twin system. We can transform flat imagery into a 3D model where users can inspect physical telemetry. Let's ask the AI to show its live condition.

As requested, the **3D Digital Twin** of S.V. Road opens instantly as a pop-up modal. We can rotate, zoom, and inspect subsurface utility lines and see real-time sensor node telemetry layered directly over the road model. This model updates continuously using crowdsourced user data and administrative state upgrades. This solves the core accessibility gap—even if a citizen faces a literacy or language barrier, they can visually track structural changes layer-by-layer."

---

## Query 2 — Granite Guardian Falsification Probe (4:30 - 6:30)

"But what if someone tries to feed the AI a lie? Let us look at Query 2.

A user claims: *'Omega completed S.V. Road repairs yesterday for ₹4.8 Cr, right?'* A normal chatbot would agree just to be polite—and be entirely wrong. Ours catches the fabrication instantly.

Look at what happened under our dual-model RAG architecture:

1. The user's query is intercepted. The RAG pipeline queries our spatial database for S.V. Road and Omega Infrastructure.
2. The generator drafts a response, but our secondary model—the **Granite Guardian safety scanner**—audits the generated output against the facts retrieved from the **iRAD & OMMAS data layers** in real-time.
3. It detects a direct contradiction: the user claims the road was repaved yesterday, but our database records show the last repaving date was in 2018, and contractor Omega is actively blacklisted for material fraud.

Granite Guardian automatically flags the response as **UNGROUNDED**, blocks the hallucination, and details the exact contradictions in the audit log panel. This ensures our chatbot isn't just a standard wrapper—it is a verifiable safety spine where the AI cannot lie, preserving complete public integrity."

---

## Query 3 — Budget Transparency & Procurement Auditing (6:30 - 8:30)

"Let's follow the money. Query 3.

The user asks: *'Show me the budget breakdown for S.V. Road — where did the ₹4.8 Crores go?'*

The interface returns a visual Sankey diagram gathered from government contract budget documentations of the road ministries, cross-referenced with the **MoRTH Bhoomi Rashi portal**. The brief asked us to show how much was sanctioned versus how much was spent. Here it is—₹4,72,50,000 spent out of ₹4,80,00,000 sanctioned. That is 98.4%. But the critical part is what the system flagged as an anomaly.

There is a 14% cost overrun in materials that was never approved.

The brief asked for budget transparency including the funding source. Our system shows where every rupee came from:

* **Central Road Fund:** 45% — ₹2.16 Crores
* **State PWD:** 35% — ₹1.68 Crores
* **Municipal Corporation (BMC):** 20% — ₹0.96 Crores

Now let us look at why that 14% overrun exists.

The tender required PMB-40 polymer-modified binder at ₹78,500 per tonne. The contractor delivered standard VG-10 binder worth ₹49,200 per tonne, but billed at the higher rate. We cross-checked the data against materials logs: the difference amounted to ₹70,32,000 in overcharging. The municipality has frozen their final payment. This is transparency that actively protects public money."

---

## Query 4 — Direct Photo Complaint Filing & Spatial Routing (8:30 - 10:30)

"Now let's report a live hazard and look at complaint routing.

Instead of requiring citizens to write long text forms, we have simplified the entry barrier. The user simply taps the 'Report an Issue' action button to launch the Direct Photo Upload card.

Once the photo is sent, our multimodal pipeline processes the visual damage, maps it, and drafts a precise engineering ticket. When the user hits publish, the issue is securely, anonymously routed.

Look at what happens the instant the photo is submitted:

1. The system extracts the GPS coordinates from the photo's EXIF metadata and runs an instant PostGIS spatial query checking which ward boundaries they overlap against **ISRO's Bhuvan Geo-Portal layers**. It identifies BMC Ward H-West, supervised by Executive Engineer Mr. R.K. Joshi.
2. The application automatically syncs this ticket straight into the **eDAR (electronic Detailed Accident Report) pipeline** to flag it as a preventative hazard.
3. No manual description was required—the system auto-populated the ticket metadata, set a 4-hour critical repair SLA countdown, automatically selected a qualified, non-blacklisted contractor nearby—Zenith Construction—and dispatched them. We can see their crew's GPS ETA is 25 minutes.

This perfectly embodies the **CoERS Data-Driven Hyperlocal Interventions (DDHI)** principle. The system doesn't just route the complaint; it determines severity, sets an SLA deadline, selects a verified contractor, and tracks dispatch in under 47 seconds. Before this system, the same process required manual letters, phone calls, and took over 7 days."

---

## Query 5 — Global Schema & Offline Resilience (10:30 - 12:30)

"Let's see how this works globally and offline.

The user types *'Switch to United Kingdom'*. The system changes regions seamlessly without any modification to the core codebase.

The brief asked for global applicability. Switching to the UK dynamically remaps our schema fields:

* Currency switches to GBP (£) instead of INR.
* Road classifications adapt to Motorways and A-Roads instead of National/State Highways.
* The governing authority switches to National Highways UK instead of local PWD/BMC.

When the user queries the M25 smart motorway budget, the system returns the data localized perfectly. We have 4 countries and 12 regions preloaded. Adding a new country just requires adding structural data—zero code modifications.

We also integrate smart IoT telemetry. Engineers can instantly inspect real-time vibration streams, stress heatmaps, and drainage logs for any segment directly on the context panel, dynamically generating defect maps. We can even replay historical defect logs via our playback dashboard to audit past municipal engineering quality.

Now, let us demonstrate offline use. In remote rural areas, stable network connectivity is never guaranteed.

*(Demonstrate disconnecting network)* We are now entirely offline. Watch what happens when I submit a complaint ticket.

The submission registers successfully and displays **OFFLINE QUEUE: 1**—even with zero internet connection. The browser saves the state, coordinates, and compressed image payloads locally in an IndexedDB cache.

*(Reconnect network)* Network restored. The system automatically pushes the queued complaint to the server, and a confirmation toast appears.

This covers our UI, optimization, and accessibility criteria. The web app is custom-tailored for low-bandwidth, low-spec devices. It runs fully offline once cached, compresses assets before queuing, and operates smoothly on any modern smartphone browser without requiring an app installation. Voice input and multi-language support keep it usable for citizens of all literacy and physical accessibility needs.

By applying the **IIT Madras CoERS principles**, ROADWATCH proves that data-driven engineering, strict automated enforcement, and empathetic human-centric design can build a transparent, accident-free future for every citizen, everywhere. Thank you."