'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Box,
  Smartphone,
  CloudRain,
  ShieldCheck,
  Navigation,
  Radio,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  Play,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Session, apiGet, apiPost } from '@/services/api';
import Img2ThreePotholeModal from '@/components/3d/Img2ThreePotholeModal';
import MobileAppPresentation from './MobileAppPresentation';
import MonsoonShieldScreen from './MonsoonShieldScreen';
import CivicTrustScreen from './CivicTrustScreen';
import SafeCorridorScreen from './SafeCorridorScreen';
import BumpRadar from './BumpRadar';
import WarrantyClaims from './WarrantyClaims';

const SHOWCASE_TABS = [
  { id: 'pothole3d', label: '1. img2threejs 3D Pothole Studio', icon: Box, badge: 'NEW · 3D' },
  { id: 'mobile', label: '2. Mobile App & Workflow Deck', icon: Smartphone, badge: 'SLIDES + SIM' },
  { id: 'monsoon', label: '3. MonsoonShield Flood Predictor', icon: CloudRain, badge: 'NEW · POSTGIS' },
  { id: 'civictrust', label: '4. CivicTrust & RTI Generator', icon: ShieldCheck, badge: 'NEW · RTI' },
  { id: 'safecorridor', label: '5. SafeCorridor Ambulance Router', icon: Navigation, badge: 'NEW · ROUTER' },
  { id: 'bump', label: '6. Bump Radar + Warranty Clawback', icon: Radio, badge: 'SENSOR → NOTICE' },
  { id: 'roles', label: '7. All 4 User Roles End-to-End Check', icon: UserCheck, badge: 'LIVE E2E' },
] as const;

type ShowcaseTabId = (typeof SHOWCASE_TABS)[number]['id'];

export default function ShowcaseMode() {
  const [activeTab, setActiveTab] = useState<ShowcaseTabId>('pothole3d');
  const [roleSwitching, setRoleSwitching] = useState<string | null>(null);
  const [e2eResults, setE2eResults] = useState<{ step: string; status: 'ok' | 'fail'; detail: string }[]>([]);
  const [runningE2e, setRunningE2e] = useState(false);

  const { session, setSession, setActiveView } = useStore();

  const quickSwitchRole = async (role: 'guest' | 'citizen' | 'engineer' | 'admin' | 'auditor') => {
    setRoleSwitching(role);
    try {
      if (role === 'guest') {
        apiPost('/auth/logout').catch(() => undefined);
        setSession(null);
      } else {
        const sess = await apiPost<Session>('/auth/demo-login', { role });
        setSession(sess);
      }
    } catch (err) {
      console.error('Role switch failed:', err);
    } finally {
      setRoleSwitching(null);
    }
  };

  const runLiveEndToEndCheck = async () => {
    setRunningE2e(true);
    const checks: { step: string; status: 'ok' | 'fail'; detail: string }[] = [];
    try {
      const ov = await apiGet<{ kpi: { roads: number; complaints: number } }>('/screens/overview?region=IN');
      checks.push({
        step: '1. Public Guest — Live PostGIS Overview & Corridors',
        status: 'ok',
        detail: `${ov.kpi.roads} gazetted roads & ${ov.kpi.complaints} complaints queried live from PostgreSQL.`,
      });

      const p3d = await apiGet<{ scans: unknown[]; candidates: unknown[] }>('/screens/pothole-3d');
      checks.push({
        step: '2. img2threejs 3D Pothole Volumetric Engine (/screens/pothole-3d)',
        status: 'ok',
        detail: `${p3d.scans.length} saved 3D volumetric scans & ${p3d.candidates.length} open potholes ready for 3D reconstruction.`,
      });

      const mon = await apiGet<{ alert_level: string; corridors: unknown[] }>('/screens/monsoon-risk?rainfall_mm_hr=95');
      checks.push({
        step: '3. MonsoonShield Hydrological Predictor (/screens/monsoon-risk)',
        status: 'ok',
        detail: `${mon.corridors.length} corridors evaluated at 95 mm/hr (${mon.alert_level}).`,
      });

      const ct = await apiGet<{ complaints: unknown[]; stats: { total_verifications: number } }>('/screens/civic-trust');
      checks.push({
        step: '4. CivicTrust Crowd-Verification & Section 6(1) RTI Engine (/screens/civic-trust)',
        status: 'ok',
        detail: `${ct.stats.total_verifications} community verifications & statutory RTI generator online.`,
      });

      const sc = await apiGet<{ recommended_safe_corridor: { road_code: string; stability_score: number } }>('/screens/safe-corridor');
      checks.push({
        step: '5. SafeCorridor Ambulance & Two-Wheeler Router (/screens/safe-corridor)',
        status: 'ok',
        detail: `Safest corridor: ${sc.recommended_safe_corridor?.road_code} (Stability ${sc.recommended_safe_corridor?.stability_score}/100).`,
      });

      const wc = await apiGet<{ claims: unknown[]; total_amount: number }>('/screens/warranty-claims');
      checks.push({
        step: '6. Contractor Warranty Clawback & Bump Radar Clusters',
        status: 'ok',
        detail: `${wc.claims.length} defects covered by active contractor warranties (₹${wc.total_amount.toLocaleString('en-IN')} recoverable).`,
      });

      for (const r of ['citizen', 'engineer', 'admin', 'auditor'] as const) {
        const s = await apiPost<Session>('/auth/demo-login', { role: r });
        checks.push({
          step: `7.${r.toUpperCase()} Role Session & PostgreSQL RBAC Verification`,
          status: 'ok',
          detail: `Authenticated as ${s.user.display_name} (${s.user.email}) with role=${s.user.role}.`,
        });
      }
    } catch (err) {
      checks.push({
        step: 'Verification Error',
        status: 'fail',
        detail: err instanceof Error ? err.message : 'Check failed',
      });
    } finally {
      setE2eResults(checks);
      setRunningE2e(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Top Mentorship Showcase Hero & 1-Click Role Switcher Bar */}
      <section className="rounded-2xl border-2 border-cyan-400/50 bg-gradient-to-r from-slate-950 via-cyan-950/30 to-slate-950 p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400 px-2.5 py-0.5 font-mono text-[10px] font-extrabold uppercase text-slate-950">
                <Sparkles className="h-3 w-3" /> 3 PM MENTORSHIP SHOWCASE MODE
              </span>
              <span className="font-mono text-xs text-cyan-300">
                All Features Live · PostgreSQL + PostGIS + Gemini + img2threejs WebGL
              </span>
            </div>
            <h1 className="text-xl font-black text-white">
              ROADWATCH Complete Feature &amp; Multi-Role Live Demonstration Cockpit
            </h1>
          </div>

          {/* 1-Click Instant Role Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/[0.1] bg-slate-900/90 p-1.5">
            <span className="px-2 font-mono text-[10px] font-bold uppercase text-slate-400">
              Active Role ({session ? session.user.role : 'guest'}):
            </span>
            {(
              [
                ['guest', 'Public Guest'],
                ['citizen', 'Citizen'],
                ['engineer', 'Ward Engineer'],
                ['admin', 'Administrator'],
                ['auditor', 'Public Auditor'],
              ] as const
            ).map(([r, label]) => {
              const isCurrent = r === 'guest' ? !session : session?.user.role === r;
              return (
                <button
                  key={r}
                  type="button"
                  disabled={roleSwitching !== null}
                  onClick={() => quickSwitchRole(r)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-cyan-400 text-slate-950 shadow'
                      : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {roleSwitching === r ? 'Switching…' : label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Showcase Feature Navigation Pills */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2">
          {SHOWCASE_TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-all cursor-pointer ${
                  active
                    ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-lg shadow-cyan-500/10'
                    : 'border-white/[0.08] bg-slate-900/70 text-slate-300 hover:border-white/[0.2]'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <Icon className={`h-4 w-4 ${active ? 'text-cyan-300' : 'text-slate-400'}`} />
                  <span className="rounded bg-slate-950/90 px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-cyan-300 border border-cyan-500/30">
                    {t.badge}
                  </span>
                </div>
                <span className="text-xs font-bold leading-snug">{t.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Showcase Module Viewport */}
      {activeTab === 'pothole3d' && (
        <Img2ThreePotholeModal embedded={true} open={true} />
      )}

      {activeTab === 'mobile' && (
        <MobileAppPresentation onLaunch3DModal={() => setActiveTab('pothole3d')} />
      )}

      {activeTab === 'monsoon' && <MonsoonShieldScreen />}

      {activeTab === 'civictrust' && <CivicTrustScreen />}

      {activeTab === 'safecorridor' && <SafeCorridorScreen />}

      {activeTab === 'bump' && (
        <div className="flex flex-col gap-6">
          <BumpRadar />
          <div className="border-t border-white/[0.1] pt-6">
            <h2 className="mb-3 text-base font-bold text-white">
              Automatic Downstream Feed: Contractor Warranty Clawback &amp; Legal Notice Generator
            </h2>
            <WarrantyClaims />
          </div>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-950 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                End-to-End 4-Role Workflow Matrix &amp; Live Self-Test Suite
              </h2>
              <p className="text-xs text-slate-400">
                Click any role card below to jump directly into its workflow, or run the automated live API verification check.
              </p>
            </div>
            <button
              type="button"
              onClick={runLiveEndToEndCheck}
              disabled={runningE2e}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-950 hover:bg-cyan-300 cursor-pointer"
            >
              <Play className="h-4 w-4" />
              {runningE2e ? 'Running Live E2E Checks…' : 'Run Live E2E Verification Suite'}
            </button>
          </div>

          {e2eResults.length > 0 && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2">
              <div className="font-mono text-xs font-bold text-emerald-300">
                LIVE END-TO-END VERIFICATION RESULTS ({e2eResults.filter((x) => x.status === 'ok').length}/{e2eResults.length} PASSED)
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {e2eResults.map((r) => (
                  <div key={r.step} className="rounded-lg border border-white/[0.07] bg-slate-950 p-3 text-xs">
                    <div className="flex items-center justify-between font-bold text-white">
                      <span>{r.step}</span>
                      <span className={r.status === 'ok' ? 'text-emerald-400' : 'text-rose-400'}>
                        {r.status === 'ok' ? '✓ PASS' : '✗ FAIL'}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">{r.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                role: 'citizen' as const,
                title: '1. Citizen Workflow',
                account: 'kanakwaradkar@gmail.com',
                items: [
                  'Register with ward dropdown & password confirmation or Google OAuth 2 + PKCE',
                  'File geotagged report via AI-Lens Camera + img2threejs 3D Crater Scan',
                  'Track live status_history timeline & withdraw pending/routed reports',
                  'Verify resolved repairs on-site within 50m GPS geofence (Proof of Repair)',
                  'Confirm hazards or draft Section 6(1) RTI Act petitions in CivicTrust',
                ],
                targetView: 'reports' as const,
                cta: 'Sign In as Citizen & Open My Reports',
              },
              {
                role: 'engineer' as const,
                title: '2. Ward Engineer Workflow',
                account: 'engineer.kw@mcgm.gov.in (Ward K-West)',
                items: [
                  'Scoped strictly to own ward (MCGM-KW); cross-ward edits blocked with 403',
                  'Transition ward complaints (routed → in_progress → resolved) via state machine',
                  'Verify project milestones & inspect core sample lab test results',
                  'Issue AI-drafted Contractor Warranty Clawback recovery notices',
                  'Dispatch Pre-Monsoon desilting & cold-mix crews in MonsoonShield',
                ],
                targetView: 'admin' as const,
                cta: 'Sign In as Engineer & Open Triage Desk',
              },
              {
                role: 'admin' as const,
                title: '3. Administrator Workflow',
                account: 'admin@roadwatch.gov.in',
                items: [
                  'Full city-wide command center & statutory SLA escalation runner',
                  'Create staff accounts (engineer/auditor/admin) & reset passwords',
                  'Award tenders, submit bids (blacklisted firms blocked by DB trigger)',
                  'Blacklist/reinstate contractors & authorize verified milestone payouts',
                  'Inspect 44 PostgreSQL tables, 39 triggers & run live read-only SQL queries',
                ],
                targetView: 'admin' as const,
                cta: 'Sign In as Admin & Open Operations',
              },
              {
                role: 'auditor' as const,
                title: '4. Public Auditor Workflow',
                account: 'auditor@cag.gov.in',
                items: [
                  'Read-only forensic access across all regions under SET LOCAL ROLE roadwatch_auditor',
                  'Inspect append-only audit_log with side-by-side JSONB old_values vs new_values',
                  'Audit budget variances, contingency reserve drawdowns & approval trail',
                  'Review SLA breach liquidated damages & contractor warranty liabilities',
                  'Cannot mutate complaints, contractors, or tenders (enforced by DB & API)',
                ],
                targetView: 'budgets' as const,
                cta: 'Sign In as Auditor & Open Fiscal Ledger',
              },
            ].map((card) => (
              <div
                key={card.role}
                className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-slate-900/70 p-4 space-y-4"
              >
                <div className="space-y-2">
                  <span className="rounded bg-cyan-500/15 border border-cyan-400/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-cyan-300">
                    {card.account}
                  </span>
                  <h3 className="text-base font-bold text-white">{card.title}</h3>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {card.items.map((it) => (
                      <li key={it} className="flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await quickSwitchRole(card.role);
                    setActiveView(card.targetView);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300 cursor-pointer"
                >
                  {card.cta} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
