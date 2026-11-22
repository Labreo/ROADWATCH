'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useStore } from '@/store/useStore';

interface SlideSpec {
  num: number;
  badge: string;
  title: string;
  subtitle: string;
  workflowSteps: { title: string; detail: string; sqlOrTech: string }[];
  phoneScreenTitle: string;
  phoneScreenSubtitle: string;
  phoneActionLabel: string;
  mentorNote: string;
}

const SLIDES: SlideSpec[] = [
  {
    num: 1,
    badge: 'SLIDE 1 OF 8 · ARCHITECTURE',
    title: 'ROADWATCH Mobile App: Capacitor Hybrid + Offline-First PWA Architecture',
    subtitle:
      'One TypeScript/React codebase compiles to native iOS/Android via Capacitor 6 AND runs as an installable mobile PWA with direct hardware access.',
    workflowSteps: [
      {
        title: '1. Hardware Sensor & Camera Bridge',
        detail: 'Accesses 50 Hz 3-axis accelerometer (DeviceMotionEvent), high-accuracy GPS, and rear environment camera.',
        sqlOrTech: 'Capacitor Geolocation + WebRTC facingMode: environment',
      },
      {
        title: '2. Local-First IndexedDB Storage (Dexie.js)',
        detail: 'Compresses photos to <500 KB WebP on-device and stores queued reports in IndexedDB during dead-zone commutes.',
        sqlOrTech: 'Dexie.js syncQueue + Service Worker Background Sync',
      },
      {
        title: '3. PostGIS Spatial & Role-Secured Backend',
        detail: 'Every mobile sync packet runs through PostGIS spatial triggers and PostgreSQL role views (roadwatch_citizen).',
        sqlOrTech: 'SET LOCAL ROLE roadwatch_citizen → v_citizen_complaints',
      },
    ],
    phoneScreenTitle: 'ROADWATCH Mobile Home',
    phoneScreenSubtitle: 'Mumbai Ward K-West · GPS Locked (19.1197°N, 72.8464°E)',
    phoneActionLabel: 'Launch Mobile AI-Lens Scanner',
    mentorNote:
      'Highlight to mentor: The mobile app works both passively (in the pocket via Bump Radar) and actively (via AI-Lens Camera + img2threejs 3D crater scan).',
  },
  {
    num: 2,
    badge: 'SLIDE 2 OF 8 · PASSIVE SENSOR WORKFLOW',
    title: 'Workflow 1: Zero-Touch "Bump Radar" Accelerometer Detection',
    subtitle:
      'A commuter riding a two-wheeler or auto-rickshaw keeps the phone in their pocket. No typing or photo required.',
    workflowSteps: [
      {
        title: '1. 50 Hz Gravity Removal & Band-Pass Filter',
        detail: 'BumpDetector isolates vertical road impact shocks (m/s²) from normal engine vibration and phone tilt.',
        sqlOrTech: 'threshold = max(7.5 m/s², movingRMS * 3.4)',
      },
      {
        title: '2. PostGIS Spatial DBSCAN Clustering',
        detail: 'Shocks uploaded to ride_bumps are spatially clustered within a 15-meter radius across distinct rides.',
        sqlOrTech: 'ST_ClusterDBSCAN(ST_Transform(geom, 3857), eps := 15, minpoints := 2)',
      },
      {
        title: '3. Autonomous Report Creation & Ward Routing',
        detail: 'Once 3 shocks from 2 separate rides agree within 15m, PostgreSQL files a P5 pothole ticket automatically.',
        sqlOrTech: 'INSERT INTO complaints → trg_auto_route_complaint',
      },
    ],
    phoneScreenTitle: 'Bump Radar — Active Ride Telemetry',
    phoneScreenSubtitle: 'Marine Drive Corridor · 34 km/h · 50 Hz Accelerometer',
    phoneActionLabel: 'Simulate Pothole Shock (14.6 m/s²)',
    mentorNote:
      'Highlight to mentor: Unlike Boston Street Bump, our PostGIS backend cross-correlates shocks across multiple independent riders before filing a municipal ticket.',
  },
  {
    num: 3,
    badge: 'SLIDE 3 OF 8 · CAMERA + IMG2THREEJS 3D SCAN',
    title: 'Workflow 2: AI-Lens Camera Triage & img2threejs 3D Volumetric Reconstruction',
    subtitle:
      'When a citizen or field engineer snaps a photo of a pothole, ROADWATCH converts the 2D image into a 3D procedural Three.js crater model.',
    workflowSteps: [
      {
        title: '1. Live Camera Capture + EXIF GPS Extraction',
        detail: 'Captures road defect image and attaches live device latitude/longitude coordinates.',
        sqlOrTech: 'POST /api/v1/chat/analyze-photo (NDJSON Stream)',
      },
      {
        title: '2. Gemini Vision + img2threejs 8-Pass 3D Pipeline',
        detail: 'Extracts 32×32 luminance/edge depth heightmap and sculpts a procedural 4-layer pavement THREE.Group mesh.',
        sqlOrTech: 'Pass 1 Blockout → Pass 2 Strata → Pass 3 Crater Mesh → Pass 8 TS Code',
      },
      {
        title: '3. Automated Volumetric Bill of Quantities (BoQ)',
        detail: 'Integrates crater volume (Liters) to compute exact Hot-Mix Asphalt mass (kg) and tack coat required.',
        sqlOrTech: 'INSERT INTO pothole_3d_scans (volume_liters, asphalt_kg, estimated_cost_inr)',
      },
    ],
    phoneScreenTitle: 'img2threejs 3D Crater Scanner',
    phoneScreenSubtitle: 'S.V. Road Crater · 1.24m × 0.96m · Depth 11.2 cm',
    phoneActionLabel: 'Open Interactive 3D Crater Mesh',
    mentorNote:
      'Highlight to mentor: Instead of a static placeholder model, img2threejs generates a real displaced 3D mesh + engineering BoQ (kg of asphalt) from any 2D photo.',
  },
  {
    num: 4,
    badge: 'SLIDE 4 OF 8 · OFFLINE-FIRST RESILIENCE',
    title: 'Workflow 3: Dead-Zone & Monsoon Offline Sync Pipeline',
    subtitle:
      'Field inspections in Mumbai subways or heavy monsoon blackouts never lose data.',
    workflowSteps: [
      {
        title: '1. Client-Side Media Compression & UUID Stamp',
        detail: 'Photo is compressed to <500 KB and assigned a deterministic client_temp_id UUID.',
        sqlOrTech: 'OfflineSyncManager.compressMediaAsset() → IndexedDB',
      },
      {
        title: '2. Network Reconnection & Batch Flush',
        detail: 'When connectivity returns, queued tickets flush automatically with exponential backoff.',
        sqlOrTech: 'POST /api/v1/complaints/sync',
      },
      {
        title: '3. Spatial Duplicate Prevention (25m Radius)',
        detail: 'If another citizen already reported the same pothole within 25m, DuplicateComplaintDialog offers +1 Upvote.',
        sqlOrTech: 'ST_DWithin(geom::geography, point::geography, 25)',
      },
    ],
    phoneScreenTitle: 'Dexie.js Offline Sync Queue',
    phoneScreenSubtitle: '2 Geotagged Reports Queued in IndexedDB',
    phoneActionLabel: 'Flush Offline Queue to PostGIS',
    mentorNote:
      'Highlight to mentor: You can click the Online/Offline toggle in the top bar of ROADWATCH at any time to demonstrate live IndexedDB queueing and auto-flush.',
  },
  {
    num: 5,
    badge: 'SLIDE 5 OF 8 · POSTGIS AUTO-ROUTING',
    title: 'Workflow 4: Deterministic PostGIS Spatial Routing & Warranty Match',
    subtitle:
      'The citizen never has to guess whether a road belongs to BMC, MMRDA, MSRDC, or NHAI.',
    workflowSteps: [
      {
        title: '1. Point-in-Polygon Ward Containment',
        detail: 'PostgreSQL trigger trg_auto_route_complaint finds the exact ward boundary containing the GPS pin.',
        sqlOrTech: 'ST_Contains(authorities.geom_boundary, NEW.geom)',
      },
      {
        title: '2. Nearest Road Centerline Snapping (20m)',
        detail: 'Snaps the GPS coordinate to the nearest gazetted road LineString within 20 meters.',
        sqlOrTech: 'ST_DWithin(roads.geom::geography, NEW.geom::geography, 20)',
      },
      {
        title: '3. Automatic Contractor Warranty Clawback Check',
        detail: 'Checks if the road segment is under an active 3-year MoRTH defect liability warranty.',
        sqlOrTech: 'JOIN project_warranties WHERE created_at BETWEEN start AND end',
      },
    ],
    phoneScreenTitle: 'PostGIS Spatial Auto-Snap Result',
    phoneScreenSubtitle: 'Snapped 4.2m to SV-RD-01 · Routed to MCGM Ward K-West',
    phoneActionLabel: 'View Warranty Liability Match',
    mentorNote:
      'Highlight to mentor: Because routing happens in a BEFORE INSERT PostgreSQL trigger, even raw SQL inserts or SMS/WhatsApp reports are spatially routed.',
  },
  {
    num: 6,
    badge: 'SLIDE 6 OF 8 · WARD ENGINEER WORKFLOW',
    title: 'Workflow 5: Ward Engineer Field App & Quality-Gated Milestone Payouts',
    subtitle:
      'Engineers sign in on mobile/tablet and only have database permission to modify their own ward’s queue.',
    workflowSteps: [
      {
        title: '1. Ward-Scoped Queue & State-Machine Trigger',
        detail: 'Engineers transition tickets through pending → routed → in_progress → resolved.',
        sqlOrTech: 'trg_complaint_state_machine + status_history weak entity',
      },
      {
        title: '2. Core Sample Lab Testing (Generated Column)',
        detail: 'Field engineers log asphalt thickness (mm) and Marshall density (%) in milestone_tests.',
        sqlOrTech: 'passed BOOLEAN GENERATED ALWAYS AS (measured BETWEEN spec_min AND spec_max)',
      },
      {
        title: '3. Database Trigger Blocks Substandard Payouts',
        detail: 'If any core test fails (e.g., 42mm vs 50mm spec), PostgreSQL blocks treasury payment release.',
        sqlOrTech: 'trg_block_payout_on_failed_test → RAISE EXCEPTION',
      },
    ],
    phoneScreenTitle: 'Engineer Field Duty — Ward K-West',
    phoneScreenSubtitle: 'Ticket #CMP-00142 · HMA Core Test: 42mm (FAIL < 50mm)',
    phoneActionLabel: 'Test Database Payout Block',
    mentorNote:
      'Highlight to mentor: Even if an admin clicks Authorize Payout in the UI, the PostgreSQL trigger refuses the transaction because the core sample failed.',
  },
  {
    num: 7,
    badge: 'SLIDE 7 OF 8 · ANTI-FAKE-CLOSURE PROOF OF REPAIR',
    title: 'Workflow 6: Citizen On-Site "Proof of Repair" (50m Geofence + Live Camera)',
    subtitle:
      'Prevents officials or contractors from closing tickets with fake or old "after" photos.',
    workflowSteps: [
      {
        title: '1. 50-Meter PostGIS Geofence Enforcement',
        detail: 'Citizen must stand within 50m of the original complaint coordinates; gallery uploads are blocked.',
        sqlOrTech: 'ST_Distance(c.geom::geography, citizen_gps::geography) <= 50',
      },
      {
        title: '2. Gemini Vision Surface Inspection',
        detail: 'Evaluates the live photo to verify whether the pothole was genuinely patched or still broken.',
        sqlOrTech: 'POST /api/v1/screens/me/reports/{id}/verify-repair',
      },
      {
        title: '3. Automatic P5 Escalated Follow-Up Ticket',
        detail: 'If damage is still visible, PostgreSQL opens an escalated Level-1 / Priority-5 follow-up linked via parent_complaint_id.',
        sqlOrTech: 'INSERT INTO repair_checks + INSERT INTO complaints (priority=5, escalation_level=1)',
      },
    ],
    phoneScreenTitle: 'On-Site Proof of Repair Check',
    phoneScreenSubtitle: 'GPS Distance: 11.4m (Verified <= 50m) · Live Camera',
    phoneActionLabel: 'Run AI Repair Verification',
    mentorNote:
      'Highlight to mentor: This directly solves the real-world civic problem where contractors upload fake AI after-photos to close grievances.',
  },
  {
    num: 8,
    badge: 'SLIDE 8 OF 8 · CLOSED-LOOP ACCOUNTABILITY',
    title: 'Workflow 7: End-to-End Closed Loop — From Phone Shock to Legal Notice & Audit Log',
    subtitle:
      'Every action across all 4 roles (Citizen, Ward Engineer, Admin, Public Auditor) is cryptographically & relationally linked.',
    workflowSteps: [
      {
        title: '1. Sensor / Camera → 3D BoQ → Warranty Clawback',
        detail: 'A pothole detected by Bump Radar or AI-Lens automatically appears in Warranty Claims if the road is under warranty.',
        sqlOrTech: 'Rs 90,000+ chargeable to contractors (zero taxpayer cost)',
      },
      {
        title: '2. AI-Drafted Legal Recovery Notice & Section 6(1) RTI',
        detail: 'One click generates the contractor recovery notice or citizen RTI petition strictly from DB facts.',
        sqlOrTech: 'POST /screens/warranty-claims/{id}/notice & GET /civic-trust/{id}/rti-dossier',
      },
      {
        title: '3. Append-Only Immutable PostgreSQL Audit Log',
        detail: 'Public Auditors inspect JSONB before/after diffs of every mutation; UPDATE/DELETE on audit_log is revoked.',
        sqlOrTech: 'trg_audit_log_immutable + REVOKE UPDATE, DELETE, TRUNCATE ON audit_log',
      },
    ],
    phoneScreenTitle: 'Closed-Loop Accountability Complete',
    phoneScreenSubtitle: '4 Roles · 44 Tables · 39 Triggers · 100% Live PostGIS',
    phoneActionLabel: 'Open Live 3D Pothole Studio',
    mentorNote:
      'Highlight to mentor: Every single step is backed by real PostgreSQL constraints, triggers, and role privileges—nothing is mocked.',
  },
];

export default function MobileAppPresentation({
  onLaunch3DModal,
}: {
  onLaunch3DModal?: () => void;
}) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [simFeedback, setSimFeedback] = useState<string | null>(null);
  const { setIsReporting, setActiveView } = useStore();

  const slide = SLIDES[slideIdx];

  const handlePhoneAction = () => {
    if (slide.num === 1) {
      setIsReporting(true);
    } else if (slide.num === 2) {
      setSimFeedback('⚡ Peak Shock 14.6 m/s² recorded at 18.9432°N, 72.8235°E! Clustered via ST_ClusterDBSCAN → Auto-Filed Ticket #CMP-01298.');
    } else if (slide.num === 3 || slide.num === 8) {
      if (onLaunch3DModal) onLaunch3DModal();
    } else if (slide.num === 4) {
      setSimFeedback('✓ Flushed 2 compressed WebP reports from Dexie.js IndexedDB → PostGIS ST_Contains routed to MCGM-KW!');
    } else if (slide.num === 5) {
      setSimFeedback('✓ Active 36-Month Defect Liability Warranty matched: Contractor owes ₹18,450 repair at zero city cost!');
    } else if (slide.num === 6) {
      setSimFeedback('⛔ PostgreSQL Trigger Refused Payout: "Payout blocked: a quality test failed for milestone 2 of project 4 (42mm < 50mm spec)"');
    } else if (slide.num === 7) {
      setSimFeedback('🚨 Gemini Vision detected unpatched crater at 11.4m distance! Opened Escalated Follow-Up Ticket at Priority P5 (L1).');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Presentation Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/30 bg-slate-900/90 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-400">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-400">
              INTERACTIVE MENTORSHIP PRESENTATION DECK &amp; LIVE MOBILE SIMULATOR
            </span>
            <h2 className="text-base font-bold text-white">
              ROADWATCH Mobile App &amp; End-to-End PostGIS Workflow Architecture
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/mobile-presentation.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Fullscreen Slide Deck
          </a>
          <button
            type="button"
            onClick={() => {
              setSlideIdx((i) => (i > 0 ? i - 1 : SLIDES.length - 1));
              setSimFeedback(null);
            }}
            className="rounded-lg border border-white/[0.12] bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            ← Prev
          </button>
          <span className="font-mono text-xs text-cyan-300 px-2">
            {slideIdx + 1} / {SLIDES.length}
          </span>
          <button
            type="button"
            onClick={() => {
              setSlideIdx((i) => (i < SLIDES.length - 1 ? i + 1 : 0));
              setSimFeedback(null);
            }}
            className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 cursor-pointer"
          >
            Next Slide →
          </button>
        </div>
      </div>

      {/* Slide Progress Dots */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
        {SLIDES.map((s, idx) => (
          <button
            key={s.num}
            type="button"
            onClick={() => {
              setSlideIdx(idx);
              setSimFeedback(null);
            }}
            className={`rounded-lg border px-2 py-1.5 text-left transition-all cursor-pointer ${
              idx === slideIdx
                ? 'border-cyan-400 bg-cyan-500/20 text-white'
                : 'border-white/[0.06] bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-mono text-[9px] font-bold text-cyan-400">0{s.num}</div>
            <div className="truncate text-[10px] font-semibold">{s.title.split(':')[0]}</div>
          </button>
        ))}
      </div>

      {/* Main Split View: Left Slide Content & Workflow Diagram, Right Interactive iPhone Simulator */}
      <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
        {/* Left Slide Deck Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-slate-950 p-6 space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-cyan-500/15 border border-cyan-400/30 px-2.5 py-1 font-mono text-[10px] font-bold text-cyan-300">
                {slide.badge}
              </span>
              <span className="font-mono text-xs text-slate-400">
                Kanak Waradkar (24B-CO-030) · Krushna (031) · Manjunath (035)
              </span>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white leading-snug">{slide.title}</h3>
              <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">{slide.subtitle}</p>
            </div>

            {/* 3-Step Technical Workflow Pipeline */}
            <div className="space-y-3 pt-2">
              {slide.workflowSteps.map((st, i) => (
                <div
                  key={st.title}
                  className="rounded-xl border border-white/[0.08] bg-slate-900/70 p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-cyan-300">{st.title}</span>
                    <span className="rounded bg-slate-950 border border-white/[0.08] px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                      STEP 0{i + 1}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{st.detail}</p>
                  <div className="pt-1 font-mono text-[11px] text-amber-300">
                    SQL / Engine: <code>{st.sqlOrTech}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mentor Talking Point Box */}
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              3 PM Mentorship Talking Point
            </div>
            <p className="mt-1 text-xs text-amber-100 leading-relaxed">{slide.mentorNote}</p>
          </div>
        </div>

        {/* Right Interactive iPhone 16 Pro Mobile App Simulator */}
        <div className="mx-auto w-full max-w-[370px] rounded-[40px] border-4 border-slate-800 bg-slate-950 p-3.5 shadow-2xl flex flex-col justify-between min-h-[640px]">
          {/* Dynamic Island Notch */}
          <div>
            <div className="mx-auto mb-2 h-5 w-28 rounded-full bg-black border border-white/[0.08] flex items-center justify-center">
              <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse mr-2" />
              <span className="font-mono text-[8px] text-slate-400">AI-LENS 5G</span>
            </div>

            {/* Phone Status Bar */}
            <div className="flex justify-between px-3 py-1 font-mono text-[10px] text-slate-400 border-b border-white/[0.06]">
              <span>15:00 IST</span>
              <span className="text-cyan-400 font-bold">ROADWATCH PWA</span>
              <span className="text-emerald-400">100%</span>
            </div>

            {/* Phone App Header */}
            <div className="mt-3 rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-3.5">
              <span className="font-mono text-[9px] uppercase text-cyan-400">
                LIVE MOBILE VIEWPORT (390×844)
              </span>
              <h4 className="mt-0.5 text-sm font-bold text-white">{slide.phoneScreenTitle}</h4>
              <p className="mt-0.5 font-mono text-[10px] text-slate-400">{slide.phoneScreenSubtitle}</p>
            </div>

            {/* Interactive Phone Body Visual for Current Slide */}
            <div className="mt-3 rounded-2xl border border-white/[0.08] bg-slate-900/50 p-3.5 space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono text-slate-400">ACTIVE WORKFLOW STAGE</span>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                  STAGE {slide.num}/8
                </span>
              </div>

              {/* Visual representation inside phone screen */}
              <div className="rounded-xl border border-white/[0.07] bg-slate-950 p-3 space-y-2 font-mono text-[11px]">
                {slide.workflowSteps.map((w, idx) => (
                  <div key={idx} className="border-b border-white/[0.05] pb-2 last:border-b-0 last:pb-0">
                    <div className="text-cyan-300 font-bold">{w.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{w.sqlOrTech}</div>
                  </div>
                ))}
              </div>

              {simFeedback && (
                <div className="rounded-xl border border-emerald-400/40 bg-emerald-950/60 p-3 text-xs text-emerald-200 leading-relaxed">
                  {simFeedback}
                </div>
              )}

              <button
                type="button"
                onClick={handlePhoneAction}
                className="w-full rounded-xl bg-cyan-400 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-950 hover:bg-cyan-300 transition-colors cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                {slide.phoneActionLabel}
              </button>
            </div>
          </div>

          {/* Phone Bottom Tab Bar */}
          <div className="mt-4 grid grid-cols-4 gap-1 rounded-2xl border border-white/[0.08] bg-slate-900 p-1.5 text-center font-mono text-[9px]">
            <button
              type="button"
              onClick={() => setIsReporting(true)}
              className="rounded-xl py-1.5 text-cyan-300 hover:bg-slate-800 cursor-pointer"
            >
              AI-Lens
            </button>
            <button
              type="button"
              onClick={() => setActiveView('ride')}
              className="rounded-xl py-1.5 text-slate-300 hover:bg-slate-800 cursor-pointer"
            >
              BumpRadar
            </button>
            <button
              type="button"
              onClick={() => {
                if (onLaunch3DModal) onLaunch3DModal();
              }}
              className="rounded-xl py-1.5 text-amber-300 hover:bg-slate-800 cursor-pointer"
            >
              3D Crater
            </button>
            <button
              type="button"
              onClick={() => setActiveView('reports')}
              className="rounded-xl py-1.5 text-emerald-300 hover:bg-slate-800 cursor-pointer"
            >
              My SLA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
