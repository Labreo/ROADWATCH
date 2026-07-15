import { Citation } from '@/components/chat/CitationRenderer';

export interface DemoMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  suggestedActions?: { type: string; target_id: number; label: string }[];
  evidence?: { title: string; items: string[] }[];
  suggestedPrompts?: string[];
}

export interface DemoScene {
  id: string;
  title: string;
  description: string;
  /** Narrative shown in the demo overlay explaining what this step demonstrates */
  narration: string;
  /** Store actions dispatched when this response appears */
  dispatchActions?: Array<{
    type: string;
    payload: Record<string, unknown>;
  }>;
}

export interface DemoSnippet {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  /** Covers which judging criteria (1-5) */
  criteria: number[];
  /** Duration estimate */
  duration: string;
  messages: DemoMessage[];
  /** Narration overlay shown before each message pair */
  scenes: DemoScene[];
}

const ROAD_CITATION: Citation = {
  type: 'road', id: 1, name: 'S.V. Road (Santacruz to Bandra)',
  code: 'SVR-LD01', status: 'poor', length: 4.8,
};

const OMEGA_CITATION: Citation = {
  type: 'contractor', id: 3, name: 'Omega Infrastructure Ltd.',
  rating: 1.85, blacklisted: true,
};

const ZENITH_CITATION: Citation = {
  type: 'contractor', id: 1, name: 'Zenith Construction Ltd.',
  rating: 4.2, blacklisted: false,
};

const AUTHORITY_CITATION: Citation = {
  type: 'authority', id: 1, name: 'Brihanmumbai Municipal Corporation (BMC)',
  code: 'BMC-HWEST',
};

export const demoSnippets: DemoSnippet[] = [
  {
    id: 'scenario-a',
    title: 'Why Did S.V. Road Fail?',
    subtitle: 'Recurring Failure Root Cause + Contractor Accountability',
    description: 'Covers root cause diagnostics (sub-base compaction, utility trenching overlap), contractor defect liability, and watchlist enforcement. Covers judging criteria 1 & 3.',
    criteria: [1, 3],
    duration: '~90s',
    messages: [
      {
        role: 'user',
        content: 'Why is S.V. Road damaged again? It was just repaired last year.',
      },
      {
        role: 'assistant',
        content:
          'S.V. Road (Santacruz to Bandra) scored a **health index of 32/100** — the lowest in Ward H-West. Root cause analysis reveals three compounding failures:\n\n- **Sub-base compaction at only 62%** (minimum 80% required for arterial roads). Core boring logs from March 2026 confirm the granular sub-base layer never reached design density.\n- **Overlapping utility trenching** — Between Oct 2025 and Feb 2026, three separate agencies (telecom, sewer, water main) excavated the same carriageway. None performed certified reinstatement.\n- **Asphalt binder substitution** — Chemical chromatography of binder samples shows standard commercial grade (VG-10) was used instead of the specified polymer-modified binder (PMB-40).\n\nContractor **Omega Infrastructure Ltd.** completed this work under tender BMC-RD-2025-0092 (₹4.8 Cr). The **3-year defect liability period is still active**, meaning Omega is legally bound to relay the full segment at zero additional cost. However, Omega has since been **blacklisted** (Order BMC-VIG-2026/A-41) and cannot bid on new municipal tenders.',
        citations: [ROAD_CITATION, OMEGA_CITATION],
        suggestedActions: [
          { type: 'navigate_to_road', target_id: 1, label: 'View S.V. Road on Map' },
          { type: 'navigate_to_contractor', target_id: 3, label: 'View Omega Blacklist Record' },
          { type: 'report_complaint_on_road', target_id: 1, label: 'File Official Complaint' },
        ],
        evidence: [
          {
            title: 'Sub-Base Compaction Deficit',
            items: [
              'Compression index: 62% (Required: >80%)',
              'Asphalt binder density: 1.8 g/cm³ (Required: 2.3 g/cm³)',
              'Water absorption: 8.5% (Excessive — indicates void ratio >12%)',
            ],
          },
          {
            title: 'Utility Excavation Timeline (6-month window)',
            items: [
              'Telecom cable trenching — Oct 2025 (no compaction test on record)',
              'Sewer repair excavation — Dec 2025',
              'Water main leak repair — Feb 2026',
            ],
          },
          {
            title: 'Defect Liability Enforcement',
            items: [
              'Tender BMC-RD-2025-0092: 3-Year DLP active until Oct 2028',
              'Contractor must relay at own cost; BMC penalty clause: 2% / month of delay',
              'BMC Vigilance Reference: BMC-VIG-2026/A-41',
            ],
          },
        ],
        suggestedPrompts: [
          'How much money was spent on S.V. Road?',
          'Show me the budget breakdown',
          'Who is financially liable for the repairs?',
        ],
      },
    ],
    scenes: [
      {
        id: 'scene-a-1',
        title: 'Ask about recurring failure',
        description: 'User asks about S.V. Road damage root cause',
        narration:
          'The citizen asks why this road keeps failing after recent repairs. In a real deployment, GPS coordinates pin the exact segment and the LLM queries the PostGIS spatial database for sub-base compaction records, utility excavation logs, and contractor defect liability terms.',
        dispatchActions: [
          {
            type: 'FOCUS_GEOSPATIAL_MAP',
            payload: { roadId: 1, zoom: 15 },
          },
        ],
      },
      {
        id: 'scene-a-2',
        title: 'Root cause & contractor evidence',
        description: 'AI shows compaction data, utility timeline, and blacklist status',
        narration:
          'The AI returns a structured diagnosis citing compaction test results, overlapping utility damage, and contractor blacklist status. Each evidence log expands with sensor-grade data. The citation cards link directly to the road map and contractor audit — click them mid-demo to navigate.',
        dispatchActions: [
          {
            type: 'FOCUS_GEOSPATIAL_MAP',
            payload: { roadId: 1, zoom: 15 },
          },
        ],
      },
    ],
  },
  {
    id: 'scenario-b',
    title: 'Where Did the Money Go?',
    subtitle: 'Budget Transparency + Materials Fraud',
    description: 'Covers budget sanction vs. expenditure tracking, material substitution fraud, unapproved variance detection. Covers judging criteria 2 & 3.',
    criteria: [2, 3],
    duration: '~80s',
    messages: [
      {
        role: 'user',
        content: 'Show me the budget breakdown for S.V. Road. I want to see where the ₹4.8 Crores went.',
      },
      {
        role: 'assistant',
        content:
          'Financial ledger for S.V. Road (Tender BMC-RD-2025-0092) shows **₹4,72,50,000 spent out of ₹4,80,00,000 sanctioned** — **98.4% utilization**. However, the Road Accountability Division flagged an **unapproved variance of 14%** in material procurement costs.\n\n**Key discrepancy:** The tender specified polymer-modified bitumen binder (PMB-40) at ₹78,500/tonne, but procurement invoices show standard VG-10 binder at ₹49,200/tonne was billed at PMB-40 rates. Core sample chromatography from 7 test pits confirms VG-10 was used throughout. The difference of **₹29,300/tonne × 240 tonnes = ₹70,32,000** was invoiced for material not delivered.\n\n**Contractor Omega Infrastructure Ltd.** has been flagged for this substitution. The Municipal Vigilance Commission has frozen the final milestone payment of ₹7,50,000 pending investigation.\n\n**Budget utilization by category:**\n- **Earthwork & sub-base:** ₹1,82,00,000 (38.5%)\n- **Bituminous layer:** ₹1,55,00,000 (32.8%) — **flagged**\n- **Drainage & utilities:** ₹78,50,000 (16.6%)\n- **Safety & markings:** ₹57,00,000 (12.1%)',
        citations: [ROAD_CITATION, OMEGA_CITATION],
        suggestedActions: [
          { type: 'navigate_to_road', target_id: 1, label: 'View Budget Details' },
          { type: 'navigate_to_contractor', target_id: 3, label: 'Audit Omega Invoices' },
        ],
        evidence: [
          {
            title: 'Financial Transparency Audit',
            items: [
              'Sanctioned Budget: ₹4,80,00,000',
              'Total Spent: ₹4,72,50,000 (98.4%)',
              'Unapproved Variance: 14% in materials category',
              'Frozen milestone: ₹7,50,000 (pending investigation)',
            ],
          },
          {
            title: 'Material Substitution Fraud — Chromatography Results',
            items: [
              'Specified: PMB-40 polymer-modified binder @ ₹78,500/tonne',
              'Delivered: VG-10 commercial binder @ ₹49,200/tonne',
              'Over-invoiced: ₹29,300/tonne × 240 tonnes = ₹70,32,000',
              'Test pits with VG-10 confirmation: 7 of 7 (100%)',
            ],
          },
          {
            title: 'Vigilance Action',
            items: [
              'Reference: BMC-VIG-2026/A-41',
              'Omega blacklisted from new tenders (3 years)',
              'Mandatory weekly third-party audits on active projects',
            ],
          },
        ],
        suggestedPrompts: [
          'Which contractors are blacklisted in Mumbai?',
          'What is the citywide budget utilization rate?',
          'Report a new road defect',
        ],
      },
    ],
    scenes: [
      {
        id: 'scene-b-1',
        title: 'Ask about budget',
        description: 'User requests spending details',
        narration:
          'The citizen demands a transparent breakdown of how tax money was spent. The system queries the financial ledger, cross-references material invoices against lab test results, and surfaces a ₹70 Lakh fraud pattern.',
        dispatchActions: [
          {
            type: 'MOUNT_BUDGET_SANKEY',
            payload: { roadId: 1 },
          },
        ],
      },
      {
        id: 'scene-b-2',
        title: 'Fraud evidence & contractor action',
        description: 'AI shows over-invoicing, material substitution, and blacklist enforcement',
        narration:
          'The AI presents a line-item budget breakdown with chromatography evidence proving material substitution. The evidence logs expand to show the exact per-tonne fraud calculation. The citation card links to Omega\'s contractor audit record.',
        dispatchActions: [
          {
            type: 'RENDER_CONTRACTOR_AUDIT',
            payload: { contractorId: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'scenario-c',
    title: 'Report & Track a Hazard',
    subtitle: 'Citizen Complaint → Authority Routing → Contractor Dispatch',
    description: 'Covers end-to-end complaint lifecycle: offline-capable filing, geospatial authority matching, SLA-constrained routing to contractor dispatch with IoT validation. Covers judging criteria 4 & 5.',
    criteria: [4, 5],
    duration: '~110s',
    messages: [
      {
        role: 'user',
        content: 'I want to report a dangerous pothole on S.V. Road near Bandra station. There\'s standing water and the road surface is caving in.',
      },
      {
        role: 'assistant',
        content:
          'Your report has been received and processed. Here is your **routing summary:**\n\n**Your Location** pinpoints the hazard at **S.V. Road, Bandra West** (19.0980°N, 72.8362°E).\n\n**Authority Match:** The system ran a geospatial boundary check using PostGIS ST_Contains. Your report falls under **BMC Ward H-West, Roads & Traffic Department**, supervised by Executive Engineer Mr. R.K. Joshi.\n\n**Defect Classification:** The AI vision pipeline classifies this as a **Class 1 structural failure** (subsidence >50mm with standing water) — priority escalation level **P1 (Critical)**.\n\n**SLA Response:** Under BMC Accountability Ordinance 2025, Class 1 defects require contractor mobilization within **4 hours** and permanent repair within **48 hours**. A 48-hour SLA clock has started.\n\n**Auto-Dispatch:** The system has dispatched **Zenith Construction Ltd.** (rating: 4.2/5) under work order **WO-HW-2026-4482**. Their repair crew GPS tracker is active and ETA is **25 minutes**.\n\n**Your Grievance Ticket #RW-2026-8899** has been created. You will receive SMS updates at each milestone.',
        citations: [
          ROAD_CITATION,
          ZENITH_CITATION,
          AUTHORITY_CITATION,
        ],
        suggestedActions: [
          { type: 'navigate_to_road', target_id: 1, label: 'View Hazard on Map' },
          { type: 'report_complaint_on_road', target_id: 1, label: 'Submit Photo Evidence' },
        ],
        evidence: [
          {
            title: 'Citizen Report Telemetry',
            items: [
              'Report ID: RW-2026-8899',
              'Location: 19.0980°N, 72.8362°E (S.V. Road, Bandra West)',
              'Classification: Class 1 — Structural Failure (subsidence >50mm)',
              'Priority: P1 (Critical) | SLA: 48-hour repair clock',
            ],
          },
          {
            title: 'Authority & Dispatch Chain',
            items: [
              'Matched Authority: BMC Ward H-West (via PostGIS ST_Contains)',
              'Executive Engineer: Mr. R.K. Joshi — ee.roads.hw@mcgm.gov.in',
              'Dispatched Contractor: Zenith Construction Ltd. (Rating: 4.2/5)',
              'Work Order: WO-HW-2026-4482 | Crew ETA: 25 min',
            ],
          },
          {
            title: 'Offline Resilience',
            items: [
              'Report was queued locally (IndexedDB) with compressed photo <500KB',
              'Background Sync auto-submitted when connectivity restored',
              'Reconciliation ID matches server record',
            ],
          },
        ],
        suggestedPrompts: [
          'Track my complaint status',
          'Show me the repair work order',
          'View SLA compliance for Ward H-West',
        ],
      },
    ],
    scenes: [
      {
        id: 'scene-c-1',
        title: 'Report a hazard',
        description: 'User files a complaint with location and description',
        narration:
          'The citizen reports a pothole with waterlogging. In a real scenario, they could attach a photo (compressed to <500KB offline). The system captures GPS from the device and queues the report even without connectivity.',
        dispatchActions: [
          {
            type: 'FOCUS_GEOSPATIAL_MAP',
            payload: { roadId: 1, zoom: 17, coordinates: [72.8362, 19.098] },
          },
        ],
      },
      {
        id: 'scene-c-2',
        title: 'Auto-routing & dispatch',
        description: 'AI shows authority match, SLA clock, and contractor dispatch',
        narration:
          'The AI demonstrates the full accountability pipeline: PostGIS spatial boundary matching identifies the responsible ward, the defect is classified by severity, an SLA timer starts, and a pre-qualified contractor is auto-dispatched with GPS-tracked crew. The evidence logs surface every step.',
        dispatchActions: [
          {
            type: 'NAVIGATE',
            payload: { view: 'complaints', complaintId: 8899 },
          },
        ],
      },
    ],
  },
  {
    id: 'scenario-d',
    title: 'Launch Digital Twin',
    subtitle: '3D Spatial Telemetry & Live Sensor Overlay',
    description: 'Launches the 3D Digital Twin view of S.V. Road with real-time sensor nodes and subsurface utility lines. Covers judging criteria 5.',
    criteria: [5],
    duration: '~60s',
    messages: [
      {
        role: 'user',
        content: 'Show the live condition of the model',
      },
      {
        role: 'assistant',
        content:
          '**Launching 3D Digital Twin** — S.V. Road (Santacruz to Bandra)\n\nThe spatial simulation is now rendering. Here is what you are seeing:\n\n- **Sensor Node Grid**: 12 IoT nodes are embedded at 400m intervals. 3 nodes show **Critical** readings (vibration amplitude > 8mm/s), 5 are **Elevated** (4–8mm/s), and 4 are **Nominal**.\n- **Subsurface Utility Overlay**: Water main (0.9m depth, active pressure 3.2 bar), electrical conduit (1.1m depth), and fiber optic trunk (1.4m depth) are all rendered.\n- **Structural Deformation Layer**: The model shows a 23mm surface depression at the Bandra end consistent with the sub-base compaction deficit in the engineering logs.\n\nYou can rotate, zoom, and tap any sensor node for a live telemetry readout. This view is synchronized with the PostGIS database in real time.',
        suggestedPrompts: [
          'Who is financially liable for the repairs?',
          'Show me the budget breakdown',
          'File a complaint on this road',
        ],
      },
    ],
    scenes: [
      {
        id: 'scene-d-1',
        title: 'Launch digital twin',
        description: 'AI opens the 3D spatial model with live sensor overlay',
        narration:
          'The user asks to see the live road model. The 3D Digital Twin renders the road geometry, utility pipes, and IoT sensor nodes pulled from the PostGIS telemetry database.',
        dispatchActions: [
          {
            type: 'SET_CONTEXT_VIEW',
            payload: { view: 'twin' },
          },
        ],
      },
    ],
  },
];