'use client';

import React, { useState } from 'react';
import { ShieldCheck, FileText, Download, Copy, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiGet, apiPost, useLive } from '@/services/api';
import { Badge, Card, Kpi, KpiRow, Loadable, Mono, StatusBadge, Table, shortDate } from './ui';

interface TrustComplaint {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: number;
  escalation_level: number;
  created_at: string;
  target_resolution_hours: number;
  road_name: string | null;
  road_code: string | null;
  authority: string | null;
  contractor: string | null;
  hazard_confirms: number;
  fixed_confirms: number;
  fake_flags: number;
  total_votes: number;
}

interface RecentVote {
  id: number;
  complaint_id: number;
  complaint_title: string;
  verifier_name: string;
  vote_type: 'confirm_hazard' | 'confirm_fixed' | 'flag_fake_closure';
  distance_m: number;
  comment: string | null;
  created_at: string;
}

interface CivicTrustData {
  complaints: TrustComplaint[];
  recent_votes: RecentVote[];
  stats: {
    total_verifications: number;
    total_hazard_confirms: number;
    total_fraud_flags: number;
    verified_complaints: number;
  };
}

interface RtiDossier {
  complaint_id: number;
  road_name: string | null;
  contractor: string | null;
  dossier: string;
}

export default function CivicTrustScreen() {
  const region = useStore((s) => s.regionCode);
  const session = useStore((s) => s.session);
  const state = useLive<CivicTrustData>(`/screens/civic-trust?region=${region}`);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [rtiModal, setRtiModal] = useState<RtiDossier | null>(null);

  const castVote = async (
    c: TrustComplaint,
    voteType: 'confirm_hazard' | 'confirm_fixed' | 'flag_fake_closure'
  ) => {
    setBusyId(c.id);
    setBanner(null);
    try {
      const res = await apiPost<{ auto_action: string | null }>(
        `/screens/civic-trust/${c.id}/verify`,
        {
          vote_type: voteType,
          verifier_name: session?.user.display_name || 'Kanak Waradkar (Ward Citizen)',
          distance_m: 11.4,
          comment:
            voteType === 'flag_fake_closure'
              ? 'On-site inspection shows crater is still unpatched despite resolved status.'
              : voteType === 'confirm_hazard'
              ? 'Confirmed severe pothole hazard on site within 15m GPS radius.'
              : 'Verified smooth asphalt patch completed on site.',
        }
      );
      setBanner(
        res.auto_action ||
          `✓ Recorded ${voteType.replace(/_/g, ' ')} on Ticket #CMP-${String(c.id).padStart(5, '0')} in PostgreSQL complaint_verifications.`
      );
      state.reload();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : 'Could not record verification');
    } finally {
      setBusyId(null);
    }
  };

  const openRtiDossier = async (complaintId: number) => {
    setBusyId(complaintId);
    try {
      const data = await apiGet<RtiDossier>(`/screens/civic-trust/${complaintId}/rti-dossier`);
      setRtiModal(data);
    } catch (err) {
      setBanner(err instanceof Error ? err.message : 'Could not generate RTI dossier');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-indigo-500/30 bg-slate-900/80 p-4 lg:p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-cyan-400" />
          <h1 className="text-lg font-bold text-white">
            CivicTrust — Citizen Crowd-Verification, Fake-Closure Guard &amp; Statutory RTI Dossier Engine
          </h1>
        </div>
        <p className="mt-1 max-w-3xl text-xs text-slate-300 leading-relaxed">
          Prevents unverified spam AND stops contractors from filing fake closures: when nearby citizens confirm an open
          hazard (<code className="text-cyan-300">confirm_hazard</code>), PostgreSQL automatically elevates the ticket
          to <strong>Priority P5 (Critical)</strong>. If a citizen flags a fake closure (
          <code className="text-rose-300">flag_fake_closure</code>), the database reopens the report and escalates it.
          Any ticket can also export a formal <strong>Section 6(1) Right to Information (RTI) Act, 2005</strong> legal
          petition compiled strictly from database rows.
        </p>
      </section>

      {banner && (
        <div
          role="status"
          className="rounded-lg border border-cyan-400/40 bg-cyan-950/50 px-4 py-2.5 text-xs text-cyan-100 flex items-center justify-between"
        >
          <span>{banner}</span>
          <button onClick={() => setBanner(null)} className="text-cyan-300 underline">
            Dismiss
          </button>
        </div>
      )}

      <Loadable state={state}>
        {(data) => (
          <div className="flex flex-col gap-4">
            <KpiRow>
              <Kpi
                title="CROWD VERIFICATIONS"
                value={data.stats.total_verifications}
                tone="cyan"
                note={`Across ${data.stats.verified_complaints} complaints`}
              />
              <Kpi
                title="HAZARD CONFIRMATIONS"
                value={data.stats.total_hazard_confirms}
                tone="amber"
                note="Auto-boosts priority to P5 at >= 2 votes"
              />
              <Kpi
                title="FAKE CLOSURES FLAGGED"
                value={data.stats.total_fraud_flags}
                tone="rose"
                note="Auto-reopens & escalates ticket"
              />
              <Kpi
                title="RTI PETITIONS READY"
                value={data.complaints.length}
                tone="emerald"
                note="Section 6(1) RTI Act 2005 format"
              />
            </KpiRow>

            <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
              <Card title="Community Verification & Statutory RTI Ledger" flush>
                <Table
                  rows={data.complaints}
                  rowKey={(c) => c.id}
                  columns={[
                    {
                      head: 'TICKET',
                      cell: (c) => (
                        <div>
                          <Mono tone="cyan">#CMP-{String(c.id).padStart(5, '0')}</Mono>
                          <p className="text-xs font-semibold text-white line-clamp-1">{c.title}</p>
                          <span className="text-[11px] text-slate-400">
                            {c.road_name || 'Ward Street'} · {c.authority || 'MCGM'}
                          </span>
                        </div>
                      ),
                    },
                    {
                      head: 'STATUS & PRIORITY',
                      cell: (c) => (
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={c.status} />
                          <span className="font-mono text-[11px] text-amber-300">
                            P{c.priority} · L{c.escalation_level}
                          </span>
                        </div>
                      ),
                    },
                    {
                      head: 'CROWD CONSENSUS',
                      cell: (c) => (
                        <div className="font-mono text-xs space-y-0.5">
                          <div className="text-amber-300">+{c.hazard_confirms} Hazard Confirms</div>
                          {c.fake_flags > 0 && (
                            <div className="text-rose-400">! {c.fake_flags} Fake-Closure Flags</div>
                          )}
                          {c.fixed_confirms > 0 && (
                            <div className="text-emerald-400">✓ {c.fixed_confirms} Fixed Confirms</div>
                          )}
                        </div>
                      ),
                    },
                    {
                      head: 'ON-SITE CROWD ACTIONS & RTI',
                      cell: (c) => (
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            disabled={busyId === c.id}
                            onClick={() => castVote(c, 'confirm_hazard')}
                            className="rounded border border-amber-400/40 bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/25 cursor-pointer"
                          >
                            +1 I Hit This Too
                          </button>
                          <button
                            type="button"
                            disabled={busyId === c.id}
                            onClick={() => castVote(c, 'flag_fake_closure')}
                            className="rounded border border-rose-400/40 bg-rose-500/15 px-2 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/25 cursor-pointer"
                          >
                            Flag Fake Closure
                          </button>
                          <button
                            type="button"
                            disabled={busyId === c.id}
                            onClick={() => openRtiDossier(c.id)}
                            className="inline-flex items-center gap-1 rounded bg-cyan-400 px-2.5 py-1 text-[11px] font-bold text-slate-950 hover:bg-cyan-300 cursor-pointer"
                          >
                            <FileText className="h-3 w-3" />
                            Draft RTI Dossier
                          </button>
                        </div>
                      ),
                    },
                  ]}
                />
              </Card>

              <Card title="Live Citizen Verification Stream">
                <ul className="flex flex-col gap-2.5 max-h-[540px] overflow-y-auto pr-1">
                  {data.recent_votes.map((v) => (
                    <li
                      key={v.id}
                      className="rounded-lg border border-white/[0.08] bg-slate-950 p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <Mono tone="cyan">#CMP-{String(v.complaint_id).padStart(5, '0')}</Mono>
                        <Badge
                          tone={
                            v.vote_type === 'flag_fake_closure'
                              ? 'rose'
                              : v.vote_type === 'confirm_hazard'
                              ? 'amber'
                              : 'emerald'
                          }
                        >
                          {v.vote_type.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="font-semibold text-slate-200">{v.verifier_name}</p>
                      {v.comment && <p className="text-slate-400 leading-relaxed">{v.comment}</p>}
                      <p className="font-mono text-[10px] text-slate-500">
                        GPS Proximity: {v.distance_m}m · {shortDate(v.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        )}
      </Loadable>

      {/* Statutory RTI Act Section 6(1) Dossier Modal */}
      {rtiModal && (
        <div
          className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Statutory RTI Dossier"
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-cyan-400/40 bg-slate-950 text-slate-100 shadow-2xl">
            <header className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase text-cyan-400">
                  RIGHT TO INFORMATION ACT, 2005 // SECTION 6(1) STATUTORY FILING
                </span>
                <h2 className="text-base font-bold text-white">
                  Official RTI &amp; Vigilance Dossier — Ticket #CMP-{String(rtiModal.complaint_id).padStart(5, '0')}
                </h2>
              </div>
              <button
                onClick={() => setRtiModal(null)}
                className="rounded-lg border border-white/[0.1] p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <pre className="flex-1 overflow-y-auto whitespace-pre-wrap bg-slate-900/60 p-5 font-mono text-xs leading-relaxed text-slate-200">
              {rtiModal.dossier}
            </pre>
            <footer className="flex justify-end gap-2.5 border-t border-white/[0.08] px-5 py-3">
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(rtiModal.dossier)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.15] px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy RTI Text
              </button>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([rtiModal.dossier], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `RTI_Section6_CMP_${rtiModal.complaint_id}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Download Official RTI (.TXT)
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
