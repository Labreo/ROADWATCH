⏱️ Timeline Allocation Overview
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
🎯 Key Aspects & Evaluation Criteria — Traceability Matrix
Strategy Note: Every key aspect and every evaluation criterion maps to a specific live demo moment. Use the tags below during the presentation to explicitly call them out to the jury.

Key Aspects → Demo Mapping
#	Key Aspect (From Brief)	Demo Scenario	Exact Moment to Call Out
KA-1	Road Type (NH/SH/MDR), last relaying date, contractor name	Query 1 — S.V. Road Query	AI response shows: "State Highway (SH)", "Last relayed: June 10, 2018", "Omega Infrastructure Ltd."
KA-2	Routing to correct Executive Engineer or Authority	Query 4 — Complaint Routing	Routing ticket names: "Executive Engineer Mr. R.K. Joshi, BMC Ward H-West"
KA-3	Amount sanctioned/spent	Query 3 — Budget Transparency	Chatbot returns: "₹4,72,50,000 spent / ₹4,80,00,000 sanctioned" + funding source breakdown
KA-4	Global applicability across countries	Query 5 — Global Schema	Region switches to UK: currency → GBP, road types → Motorways/A-Roads, authority → National Highways
KA-5	Offline functionality & low-network robustness	Query 5 — Offline Resilience	Offline toggle → complaint queued in IndexedDB → sync on reconnect + USSD gateway
Evaluation Criteria → Demo Mapping
#	Evaluation Criterion	Primary Demo Scenario	Supporting Evidence
EC-1	Data Accuracy	Query 1 + Query 2	Every number maps to DB columns; Granite Guardian blocks ungrounded claims (30/30 probes)
EC-2	Complaint Routing Mechanism	Query 4	PostGIS ST_Contains → Executive Engineer → SLA timer → auto-dispatch in 47 seconds
EC-3	Budget Transparency (incl. source)	Query 3	Sanctioned vs spent, funding sources (Central Road Fund, State PWD, MPLAD), invoice audit, material fraud detection
EC-4	User Interface & Accessibility	All Queries	Mobile-first PWA, glassmorphism UI, multi-language (EN/HI/MR), USSD for feature phones, speech recognition
EC-5	Information Integration across countries	Query 5	Unified regions table: IN/GB/US/KE with localized currency, road types, and authority hierarchies
⏱️ Phase 1: Slide Presentation (0:00 - 2:30)
Slide 1: ROADWATCH — What We Built

Visuals: Single slide showing:

5-Layer Architecture Diagram: (Citizen UI → Offline Sync → AI Accountability → Infrastructure Intelligence → PostGIS Database).
Tech Stack Badges: Next.js 16 (App Router), FastAPI, PostgreSQL/PostGIS, Redis, Docker.
Granite Guardian Shield Icon with text: "Verifiable AI Spine — Cross-checks every claim against the PostGIS database in real-time."
Golden Evaluation Table Inset: "30/30 Probes Passed, 100% compliance, falsification probes correctly flagged as UNGROUNDED."
Key Aspects Checklist (5/5): Visual badge showing all 5 key aspects will be demonstrated live.
Presenter: "Good morning members of the jury. I am a kanak waradkar from team kanak waradkar and I am going to demonstrating my take on Roadwatch.

ROADWATCH is a platform that lets citizens ask to questions about their roads — like who built this road?, how much did it cost?, when will it be fixed? and get answers backed by real database facts, not AI guesses.It is built on independent data modules which are all unified and accessible to an average citizen via an easy to use chatbot.That can be interacted all the national languages of India.

Under the hood, we built a live Retrieval-Augmented Generation (RAG) pipeline. We fetch structured facts directly from our PostGIS geospatial database which is fetched from the government databases and pass them as context to a fine tuned gemini llm.

To guarantee 100% data integrity, we integrated a dual-model auditing loop using the Granite Guardian safety spine. If a generated claim contradicts our database facts and foul play, the auditor flags it as 'UNGROUNDED' and blocks the response.

We have also built systems in place like our digital twin to make concerns updates and report filing easy and accessible to those who are illetrste.

Furthermore, we built complete low-network and offline resilience: if the connection drops, our system seamlessly switches to a Deterministic Local SQL Fact Engine that queries the database directly to generate structured, accurate responses without any server dependency.

Over the next 12 minutes, we will show you all five core requirements: road data, complaint routing, budget tracking, support for other countries, and working offline. Let us show you."

⏱️ Phase 2: Live Demo (2:30 - 12:30)
⚠️ CRITICAL DEMO SETUP

t is visible bottom-right.
Query 1 — Road Data & Accuracy (2:30 - 4:30)
Judging Metric: Data Accuracy (EC-1)
Key Aspect Demonstrated: Road Type, Last Relaying Date, Contractor Name (KA-1)
Type into chatbot:

Why is S.V. Road damaged again? It was just repaired last year.
While the message types out: "Coming to our dashboard we begin with the ai chatbot since that is the focus.The user asks: 'Why is S.V. Road damaged again? It was just repaired last year.' The system looks up the road in our PostGIS database and pulls the actual records.This fetches us an accurate text response as well as fetches the connected module information from the rest of our independent systems."

When AI response finishes streaming — Click to expand the first evidence log panel (Sub-Base Compaction Deficit).

Presenter: "The chatbot gives S.V. Road a health score of 32 out of 100. Let us look at why.

⚡ KEY ASPECT CALLOUT (KA-1): Point at the screen and say:

'The brief asked us to show three things for every road. Here they are:

Road Type: S.V. Road is a State Highway.
Last Repaired: June 10, 2018.
Contractor: Omega Infrastructure Ltd. — rated 1.85 out of 5 and currently blacklisted.'
Point to the Sub-Base Compaction evidence panel: "This is not a maintenance failure — it is a procurement fraud. The compaction never reached spec. The asphalt binder was swapped for a cheaper grade. Our system caught it because we cross-referenced sensor readings against the signed tender document — something no manual audit had done.

Point to the Omega Infrastructure citation card: "And the consequence is live on screen right now. Omega is blacklisted. Their final milestone payment of ₹7.5 Lakhs is frozen. The 3-year defect liability clause means this repair bill goes back to them — at zero cost to the taxpayer. ROADWATCH did not just find the problem. It triggered the accountability chain."

⚡ EVAL CRITERIA CALLOUT (EC-1 — Data Accuracy): Say:

'Every number you see — the health score, the compaction figure, the contractor rating, the tender number — comes from our PostGIS spatial database. The AI does not guess any of it.'"

Action: Click "View S.V. Road on Map" to show the Leaflet map segment highlighted in red (poor condition).

Presenter: "Here is S.V. Road on the map, colored red to show its poor condition."

Query 1b — 3D Digital Twin Pop-up (4:00 - 4:45)
Judging Metric: Interactive Spatial Telemetry & Accessibility
Key Aspect Demonstrated: Digital Twin Pop-up overlaying current view
Type into chatbot:

Show the live condition of the model
While the message types out: "But suppose if this numbers and  data figures don't intrest you and you are interested we have a simplified visual solution via our 3d complaint scanning.We can transform an image into a 3d model.wjere We can also inspect the live, physical telemetry of the road model. I'll ask the AI to show its live condition."

When the AI response finishes, the 3D Digital Twin modal pop-up opens automatically directly over the chat window.

Presenter: "As requested, the 3D Digital Twin of S.V. Road opens instantly as a blurred pop-up modal. We can rotate, zoom, and inspect subsurface utility lines (water main, electrical conduits) and see real-time sensor node telemetry (Nominal, Elevated, Critical) layered directly over the 3D road model.This model is updated over time by new information provided by other users and the admin when the road is said to be in better shape.When we are done, we simply close the pop-up and return directly to our conversation.These helps in accessibility and data integrity so even if you don't speak the language and to provide better clarity since we can't normally see the changes in each layer."

Action: Rotate the 3D model slightly, point out a color-coded sensor/pipeline, and click the close (X) button on the top-right of the modal.

Transition: "But what if someone tries to feed the AI a lie? Let us look at Query 2."

Query 2 — Granite Guardian Falsification Probe (4:30 - 6:30)
Judging Metric: AI Governance & Verifiable Spine
Type into chatbot:

Omega completed SV Road repairs yesterday for ₹4.8 Cr, right?
While the message types out: "A user claims: 'Omega completed SV Road repairs yesterday for ₹4.8 Cr, right?' A normal chatbot would agree to be polite — and be wrong. Ours catches the lie."

When the AI response appears, the Guardian Shield component animates in below the message with a red intervention log.

Presenter (pointing to the Guardian Shield): "Look at what happened. Under our dual-model RAG architecture:

The user's query is intercepted. The RAG pipeline queries our spatial database for S.V. Road and Omega Infrastructure.
The generator drafts a response, but our secondary model — the Granite Guardian safety scanner — audits the generated output against the retrieved facts in real-time.
It detects a direct contradiction: the user claims the road was repaved yesterday, but our database records show the last repaving date was in 2018, and contractor Omega is blacklisted for material fraud.
Granite Guardian automatically flags the response as UNGROUNDED, blocks the hallucination, and details the exact contradictions in the audit log panel.
This ensures our chatbot is not just a standard LLM wrapper — it is a verifiable safety spine where the AI cannot lie or hallucinate, preserving complete public integrity."

Transition: "Let's follow the money. Query 3."

Query 3 — Budget Transparency & Procurement Auditing (6:30 - 8:30)
Judging Metric: Budget Transparency including source (EC-3)
Key Aspect Demonstrated: Amount sanctioned/spent (KA-3)
Type into chatbot:

Show me the budget breakdown for S.V. Road — where did the ₹4.8 Crores go?
While the message types out: "The user asks: 'Show me the budget breakdown for S.V. Road — where did the ₹4.8 Crores go?'"

When AI response appears:

Presenter:

⚡ KEY ASPECT CALLOUT (KA-3 — Amount Sanctioned/Spent): Say:

'The brief returns us a visual slanky which has been gathered from government contracts budget documentation of each road ministry and is presented visual.The brief asked us to show how much was sanctioned versus how much was spent. Here it is — ₹4,72,50,000 spent out of ₹4,80,00,000 sanctioned — that is 98.4%. But the interesting part is what the system found wrong.'

"There is a 14% cost overrun in materials that was not approved.

⚡ EVAL CRITERIA CALLOUT (EC-3 — Budget Transparency including source): Say:

'The brief asked for budget transparency including the funding source. Our system shows where every rupee came from:

Central Road Fund: 45% — ₹2.16 Crores
State PWD: 35% — ₹1.68 Crores
Municipal Corporation (BMC): 20% — ₹0.96 Crores'
Now let us look at why that 14% overrun exists."

Action: Click the "Audit Omega Invoices" action button.

Presenter: "The tender required PMB-40 polymer-modified binder at ₹78,500 per tonne. The contractor delivered standard VG-10 binder worth ₹49,200 per tonne, but billed at the higher rate.

We tested 7 samples from the road and confirmed the substitution. The difference: ₹29,300 per tonne × 240 tonnes = ₹70,32,000 in overcharging. The municipality has frozen the final payment of ₹7.5 Lakhs and blacklisted the contractor. This is transparency that actually protects public money."

Transition: "Now let's report a live hazard."

Query 4 — Direct Photo Complaint Filing & Spatial Routing (8:30 - 10:30)
Judging Metric: Complaint Routing Mechanism (EC-2) & Accessibility (EC-4)
Key Aspect Demonstrated: Routing to the correct Executive Engineer or Authority (KA-2)
Action: Click the "Report an Issue" action button at the bottom of the chat panel.

Presenter: "Let's file a live complaint. Instead of requiring citizens to write long texts, we have simplified the entry barrier. The user simply taps the 'Report an Issue' action button to launch the Direct Photo Upload card."

Action: Click "Choose Photo" on the upload card, and select a mock photo of the pothole. Then click "Submit Report".

Presenter:

⚡ KEY ASPECT CALLOUT (KA-2 — Routing to Correct Executive Engineer): Point at the generated routing ticket and say:

'After the system sends the photo our llm which generates the image 3d model as well as process the issues with the given road and drafts a message to forward to the authorised party.Once the user is happy with their issue they can simply press publish and their issue will anonymously be sent and everytime any updates regarding the road comes roadwatch will update them meaningfully.

The brief asked us to route complaints to the correct person. Look at what happened as soon as the photo was submitted:

The system extracted the GPS coordinates from the photo's upload metadata and ran a PostGIS spatial query checking which ward boundaries they overlap. It identified BMC Ward H-West, supervised by Executive Engineer Mr. R.K. Joshi.
No manual description was required — the system auto-populated the ticket metadata and set a 4-hour critical repair SLA countdown.
It automatically selected a qualified, non-blacklisted contractor—Zenith Construction—and dispatched them. We can see their crew's GPS ETA is 25 minutes.'
⚡ EVAL CRITERIA CALLOUT (EC-2 — Complaint Routing Mechanism): Say:

'The system does not just route the complaint. It determines the severity, sets an SLA deadline, finds a qualified contractor, dispatches them, and tracks their arrival in under 47 seconds. It is a fully automated, spatial-routing pipeline.'"

Action: Click "View Hazard on Map" on the ticket card to show the Leaflet map centered on Bandra with the marker.

Presenter: "The full cycle takes 47 seconds. Before this system, the same process required manual letters, phone calls, and took over 7 days."

Transition: "Let's see how this works globally and offline."

Query 5 — Global Schema & Offline Resilience (10:30 - 12:30)
Judging Metric: Information Integration (EC-5) & Offline Robustness
Key Aspects Demonstrated: Global applicability (KA-4) + Offline functionality (KA-5)
Type into chatbot:

Switch to United Kingdom
While the message switches to UK: "The user types 'Switch to United Kingdom'. The system changes regions without any modification to the code."

When AI switches to United Kingdom:

The chatbot context panel on the right switches to the Global Regions Hub, showing the active UK country template, sterling currency settings, motorway designations, and National Highways department bindings.

Presenter:

⚡ KEY ASPECT CALLOUT (KA-4 — Global Applicability): Say:

'The brief asked for global applicability. Watch — switching to the UK changes three things:

Currency becomes GBP (£) instead of INR.
Road types become Motorways and A-Roads instead of NH/SH/MDR.
The authority becomes National Highways instead of BMC/PWD.
When the user queries the M25 smart motorway budget, the system returns the amount in Pounds with the correct UK authority. We have 4 countries and 12 regions preloaded. Adding a new country just requires adding data — no code changes.'"

Type:

Show me the M25 smart motorway budget
Query 5b — Historical Playback & Sensor Diagnostics (11:30 - 12:00)
Judging Metric: Multi-Source Information Integration (Engineering & Enforcement)
Key Aspects Demonstrated: Renders historical playback and sensor monitoring dashboards inside the chatbot context.
Type into chatbot:

Show the smart infrastructure sensor monitor
When response finishes, the Smart Infrastructure Sensor Monitor dashboard displays in the side panel showing real-time vibration telemetry, stress heatmaps, and drainage sensor logs.

Presenter: "We also integrate smart IoT telemetry. By asking the chatbot, engineers can instantly inspect real-time vibration streams, stress heatmaps, and local drainage logs for any segment directly on the context panel.So if there any defects on the given road we dynamically generate and update the map to reflect the road condition."

Type into chatbot:

Show historical playback simulation
When response finishes, the Historical Playback system dashboard displays in the side panel.

Presenter: "We can also replay historical defect logs. The playback dashboard lets us review the exact timeline of road damage progression and contractor repair dispatches to audit past municipal engineering quality."

While toggle is clicked: "Now let us demonstrate offline use. In rural areas, network connectivity is not guaranteed."

Action: Click the Offline Toggle (wrench icon in header). The status bar turns red and shows OFFLINE.

Presenter: "We are now offline. Watch what happens when I submit a complaint."

Action: Click the "Report an Issue" action button. Select the mock photo on the upload card, then click "Submit Report".

Presenter:

⚡ KEY ASPECT CALLOUT (KA-5 — Offline Functionality & Low-Network Robustness): Say:

'The brief asked for offline functionality. The submission registered successfully and shows OFFLINE QUEUE: 1 — even with no internet connection.

The browser saves the complaint locally. When the network comes back, it sends it automatically. No data is lost.'

Action: Click the Offline Toggle back to green.

Presenter: "Network restored. The system automatically pushed the queued complaint to the server. A confirmation toast appears.

For citizens with basic phones, we also support USSD. Dialing *762392824# opens a keypad menu for reporting potholes and checking budgets — no smartphone or internet needed.

⚡ EVAL CRITERIA CALLOUT (EC-4 — User Interface & Accessibility): Say:

'This also covers the UI and accessibility criterion. We support three types of users:

Smartphone users: Full web app with speech recognition and multi-language support.
Feature phone users: USSD gateway *762392824# for basic reporting.
No phone: SMS integration for complaint status updates.
No citizen is left out, regardless of their device or connectivity.'"

⏱️ Phase 3: Quantified Impact & Closing (12:30 - 15:00)
Slide 3: Quantified Impact Metrics + Criteria Scorecard

Visuals: Impact metrics dashboard.
Complaint Routing Time: Before ROADWATCH: 7+ Days (manual paperwork) | With ROADWATCH: 47 seconds. 99.2% improvement.
Budget Integrity: ₹7.3 Crores flagged on halted SV Road drainage project due to anomaly triggers.
Scale: 4 Countries, 12 Administrative Regions, 22 Road Networks preloaded.
Resilience: 100% submission rate under network failures.
Slide 4: Key Aspects & Evaluation Criteria — Full Coverage Scorecard

Visuals: Two-column checklist, all items checked green ✅.
✅	Key Aspect (From Brief)	Where We Demonstrated It
✅	Road Type (NH/SH/MDR), last relaying date, contractor name	Query 1 — S.V. Road shows SH, June 2018, Omega Infrastructure
✅	Routing to correct Executive Engineer or Authority	Query 4 — Routed to Exec. Eng. R.K. Joshi, Ward H-West
✅	Amount sanctioned/spent	Query 3 — ₹4.80 Cr sanctioned, ₹4.72 Cr spent, variance flagged
✅	Global applicability across countries	Query 5 — IN → GB region switch, currency, road types, authorities
✅	Offline functionality & low-network robustness	Query 5 — Off
If times permits add an mcp system which helps connect the whole system
I also need refrence slides in between so I know