'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { apiPost, useLive } from '@/services/api';
import { ActionButton, Badge, Card, Kpi, KpiRow, Loadable, Mono, StatusBadge, Table, Tabs, money, num, shortDate } from './ui';
import WarrantyClaims from './WarrantyClaims';
import { Flow, SankeyChart } from './charts';

const TABS = ['Spend flow', 'Budget variance', 'Warranty claims', 'Procurement', 'Audit log'] as const;
type Tab = (typeof TABS)[number];

export default function LedgerScreen() {
  const [tab, setTab] = useState<Tab>('Spend flow');
  const role = useStore(s => s.userRole);
  const tabs = role === 'admin' || role === 'auditor' ? TABS : TABS.filter(t => t !== 'Audit log');
  return (
    <div className="flex flex-col gap-4">
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === 'Spend flow' && <SpendFlow />}
      {tab === 'Budget variance' && <BudgetVariance />}
      {tab === 'Warranty claims' && <WarrantyClaims />}
      {tab === 'Procurement' && <Procurement />}
      {tab === 'Audit log' && <AuditLog />}
    </div>
  );
}

interface Spend {
  flows: Flow[];
  cost_per_km: {
    project_id: number; road_name: string; road_code: string; road_type: string;
    allocated_per_km: number; spent_per_km: number; variance_pct: number | null;
  }[];
  beneficiaries: { population: number; daily_traffic: number; households: number };
}

const varianceTone = (pct: number) => (pct > 25 ? 'rose' : pct > 0 ? 'amber' : 'emerald');

function SpendFlow() {
  const region = useStore(s => s.regionCode);
  const state = useLive<Spend>(`/screens/ledger/spend?region=${region}`);
  return (
    <Loadable state={state}>
      {({ flows, cost_per_km, beneficiaries }) => {
        const total = flows.reduce((acc, f) => acc + Number(f.amount), 0);
        return (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
              <Card title={`Where ${money(total)} came from and where it went`}>
                {flows.length ? <SankeyChart flows={flows} /> : <p className="text-[13px] text-[var(--fg-dim)]">No fund source records in this region.</p>}
              </Card>
              <Card title="Public benefit">
                <div className="flex flex-col gap-2.5">
                  <Kpi title="POPULATION SERVED" value={num(beneficiaries.population)} />
                  <Kpi title="DAILY TRAFFIC" value={num(beneficiaries.daily_traffic)} />
                  <Kpi title="HOUSEHOLDS" value={num(beneficiaries.households)} />
                </div>
              </Card>
            </div>
            <Card title="Cost per km against sanction" flush>
              <Table rows={cost_per_km} rowKey={r => r.project_id} columns={[
                { head: 'ROAD', cell: r => r.road_name },
                { head: 'CODE', cell: r => <Mono>{r.road_code}</Mono> },
                { head: 'CLASS', cell: r => r.road_type },
                { head: 'SPENT / KM', cell: r => <Mono>{money(r.spent_per_km)}</Mono> },
                { head: 'SANCTION / KM', cell: r => <Mono>{money(r.allocated_per_km)}</Mono> },
                {
                  head: 'VARIANCE',
                  cell: r => r.variance_pct === null ? '—' : <Badge tone={varianceTone(Number(r.variance_pct))}>{Number(r.variance_pct) > 0 ? '+' : ''}{r.variance_pct}%</Badge>,
                },
              ]} />
            </Card>
          </div>
        );
      }}
    </Loadable>
  );
}

interface Variance {
  variances: { id: number; project_id: number; project: string; variance_amount: number; reason: string; approved_by: string | null }[];
  totals: { allocated: number; spent: number };
  reserve: { allocated: number; utilized: number };
  trail: { id: number; entity_type: string; entity_id: number; action: string; requested_by: string | null; approved_by: string | null; status: string; comments: string | null }[];
}

function BudgetVariance() {
  const region = useStore(s => s.regionCode);
  const state = useLive<Variance>(`/screens/ledger/variance?region=${region}`);
  return (
    <Loadable state={state}>
      {({ variances, totals, reserve, trail }) => {
        const net = Number(totals.spent) - Number(totals.allocated);
        const reserveLeft = Number(reserve.allocated) - Number(reserve.utilized);
        return (
          <div className="flex flex-col gap-4">
            <KpiRow>
              <Kpi title="ALLOCATED" value={money(totals.allocated)} />
              <Kpi title="SPENT" value={money(totals.spent)} tone="indigo" />
              <Kpi title="NET POSITION" value={`${net > 0 ? '+' : '-'}${money(Math.abs(net))}`} tone={net > 0 ? 'rose' : 'emerald'} note={net > 0 ? 'Over allocation' : 'Under allocation'} />
              <Kpi title="CONTINGENCY LEFT" value={money(reserveLeft)} tone="amber" note={`Of ${money(reserve.allocated)} reserve`} />
            </KpiRow>
            <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
              <Card title="Variance reasons" flush>
                <Table rows={variances} rowKey={r => r.id} columns={[
                  { head: 'REF', cell: r => <Mono tone="cyan">BVR-{String(r.id).padStart(4, '0')}</Mono> },
                  { head: 'PROJECT', cell: r => <Mono>PRJ-{String(r.project_id).padStart(5, '0')}</Mono> },
                  { head: 'REASON', cell: r => r.reason },
                  { head: 'AMOUNT', cell: r => <Mono>{Number(r.variance_amount) > 0 ? '+' : '-'}{money(Math.abs(r.variance_amount))}</Mono> },
                  { head: 'FLAG', cell: r => <Badge tone={r.approved_by ? 'emerald' : 'rose'}>{r.approved_by ? 'APPROVED' : 'AUDIT QUERY'}</Badge> },
                ]} />
              </Card>
              <Card title="Approval trail">
                <ol className="flex flex-col gap-3">
                  {trail.map(step => (
                    <li key={step.id} className="flex gap-2.5">
                      <span aria-hidden className={`mt-1 h-3 w-3 shrink-0 rounded-full ${step.status === 'approved' ? 'bg-[var(--signal-emerald)]' : step.status === 'rejected' ? 'bg-[var(--signal-rose)]' : 'bg-[var(--signal-amber)]'}`} />
                      <span className="text-[13px] text-[var(--foreground)]">
                        {step.action} · {step.entity_type} #{step.entity_id}
                        <span className="block text-xs text-[var(--fg-dim)]">{step.approved_by ?? step.requested_by ?? 'Unassigned'} · {step.status}</span>
                      </span>
                    </li>
                  ))}
                  {trail.length === 0 && <li className="text-[13px] text-[var(--fg-dim)]">No approvals recorded.</li>}
                </ol>
              </Card>
            </div>
          </div>
        );
      }}
    </Loadable>
  );
}

interface Bid {
  contractor_id: number; name: string; contractor_code: string; blacklisted: boolean; financial_quote: number;
  technical_score: number | null; financial_score: number | null; weighted_total: number | null; is_winner: boolean;
}

interface Tender {
  id: number; reference_no: string; title: string; estimated_value: number; status: string;
  bids: Bid[]; criteria: { criterion_name: string; weight_pct: number; max_score: number }[];
}

function Procurement() {
  const region = useStore(s => s.regionCode);
  const canAward = useStore(s => s.userRole) === 'admin';
  const state = useLive<Tender[]>(`/screens/tenders?region=${region}`);
  const firms = useLive<{ id: number; name: string; blacklisted: boolean }[]>(`/screens/contractors?region=${region}`);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [firmId, setFirmId] = useState('');
  const [quote, setQuote] = useState('');
  const [tech, setTech] = useState('');
  return (
    <Loadable state={state}>
      {tenders => {
        const tender = tenders.find(t => t.id === selectedId) ?? tenders[0];
        if (!tender) return <p className="text-sm text-[var(--fg-dim)]">No tenders in this region.</p>;
        const field = 'rounded-md border border-[var(--border-bright)] bg-[var(--surface-2)] px-2 py-1.5 text-[13px] text-[var(--foreground)]';
        return (
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-2 text-xs text-[var(--fg-dim)]">
              Tender
              <select aria-label="Tender" value={tender.id} onChange={e => setSelectedId(Number(e.target.value))} className={field}>
                {tenders.map(t => <option key={t.id} value={t.id}>{t.reference_no}</option>)}
              </select>
            </label>
            <section className="flex flex-wrap items-center gap-6 rounded-lg border border-[var(--border-bright)] bg-[var(--surface-1)] px-4 py-3">
              <div className="min-w-60 flex-1">
                <Mono tone="cyan">{tender.reference_no}</Mono>
                <h2 className="text-[22px] font-semibold text-[var(--foreground)]">{tender.title}</h2>
              </div>
              <div><p className="font-mono text-[10px] tracking-wider text-[var(--fg-dim)]">ESTIMATE</p><p className="text-[13px] font-medium text-[var(--foreground)]">{money(tender.estimated_value)}</p></div>
              <div><p className="font-mono text-[10px] tracking-wider text-[var(--fg-dim)]">BIDS</p><p className="text-[13px] font-medium text-[var(--foreground)]">{tender.bids.length}</p></div>
              <StatusBadge status={tender.status} />
            </section>
            <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
              <Card title="Bid evaluation matrix" flush>
                <Table rows={tender.bids} rowKey={b => b.contractor_id} columns={[
                  { head: 'BIDDER', cell: b => <span>{b.name}<br /><Mono>{b.contractor_code}</Mono></span> },
                  { head: 'BID', cell: b => <Mono>{money(b.financial_quote)}</Mono> },
                  { head: 'TECH', cell: b => <Mono>{b.technical_score ?? '—'}</Mono> },
                  { head: 'FIN', cell: b => <Mono>{b.financial_score ?? '—'}</Mono> },
                  { head: 'SCORE', cell: b => <Mono tone={b.is_winner ? 'emerald' : undefined}>{b.weighted_total ?? '—'}</Mono> },
                  {
                    head: 'RESULT',
                    cell: b => b.is_winner ? <Badge tone="emerald">WINNER</Badge> : tender.status === 'awarded' ? <Badge>NOT AWARDED</Badge> : !canAward ? <Badge tone="amber">UNDER REVIEW</Badge> : (
                      <ActionButton variant="primary" onDone={state.reload} action={() => apiPost(`/screens/tenders/${tender.id}/award/${b.contractor_id}`)}>Award</ActionButton>
                    ),
                  },
                ]} />
                {canAward && <form onSubmit={e => e.preventDefault()} className="flex flex-wrap items-end gap-2 border-t border-[var(--border-bright)] p-4">
                  <label className="flex flex-col gap-1 text-xs text-[var(--fg-dim)]">Contractor
                    <select value={firmId} onChange={e => setFirmId(e.target.value)} className={field}>
                      <option value="">Select</option>
                      {firms.data?.map(f => <option key={f.id} value={f.id}>{f.name}{f.blacklisted ? ' (blacklisted)' : ''}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-[var(--fg-dim)]">Quote (₹)
                    <input type="number" min="1" value={quote} onChange={e => setQuote(e.target.value)} className={`${field} w-36`} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-[var(--fg-dim)]">Technical score
                    <input type="number" min="0" max="100" value={tech} onChange={e => setTech(e.target.value)} className={`${field} w-28`} />
                  </label>
                  <ActionButton
                    disabled={!firmId || !quote || !tech}
                    onDone={() => { setQuote(''); setTech(''); state.reload(); }}
                    action={() => apiPost(`/screens/tenders/${tender.id}/bids`, { contractor_id: Number(firmId), financial_quote: Number(quote), technical_score: Number(tech) })}
                  >
                    Submit bid
                  </ActionButton>
                </form>}
              </Card>
              <Card title="Evaluation criteria">
                <ul className="flex flex-col gap-3">
                  {tender.criteria.map(c => (
                    <li key={c.criterion_name}>
                      <div className="flex justify-between text-xs text-[var(--foreground)]"><span>{c.criterion_name}</span><Mono>{c.weight_pct}%</Mono></div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                        <div className="h-full rounded-full bg-[var(--signal-cyan)]" style={{ width: `${Math.min(Number(c.weight_pct), 100)}%` }} />
                      </div>
                    </li>
                  ))}
                  {tender.criteria.length === 0 && <li className="text-[13px] text-[var(--fg-dim)]">No weighted criteria recorded.</li>}
                </ul>
              </Card>
            </div>
          </div>
        );
      }}
    </Loadable>
  );
}

interface AuditEvent {
  id: number; table_name: string; record_id: number; action: string; changed_by: string; changed_at: string;
  old_values: Record<string, unknown> | null; new_values: Record<string, unknown> | null;
}

const ACTIONS = ['All', 'INSERT', 'UPDATE', 'DELETE'] as const;

function AuditLog() {
  const [action, setAction] = useState<(typeof ACTIONS)[number]>('All');
  const state = useLive<{ total: number; events: AuditEvent[] }>(`/screens/audit${action === 'All' ? '' : `?action=${action}`}`);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  return (
    <Loadable state={state}>
      {({ total, events }) => {
        const event = events.find(e => e.id === selectedId) ?? events[0];
        const keys = event ? Object.keys({ ...event.old_values, ...event.new_values }).filter(k => !['geom', 'geom_boundary', 'updated_at'].includes(k)).slice(0, 16) : [];
        const changed = (k: string) => JSON.stringify(event?.old_values?.[k]) !== JSON.stringify(event?.new_values?.[k]);
        return (
          <div className="flex flex-col gap-4">
            <section className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-bright)] bg-[var(--surface-1)] px-4 py-2.5">
              <div>
                <p className="text-[13px] font-medium text-[var(--foreground)]">Every change is recorded by database triggers and cannot be altered</p>
                <Mono>AFTER INSERT OR UPDATE OR DELETE → row_to_jsonb_audit() → audit_log</Mono>
              </div>
              <Badge tone="emerald">{num(total)} EVENTS</Badge>
            </section>
            <div className="grid gap-4 xl:grid-cols-[1fr_500px]">
              <Card title="Change history" flush right={
                <span className="flex gap-1">
                  {ACTIONS.map(a => (
                    <button key={a} onClick={() => setAction(a)} aria-pressed={a === action}
                      className={`rounded border px-2 py-0.5 font-mono text-[11px] ${a === action ? 'border-cyan-400/60 text-[var(--signal-cyan)]' : 'border-[var(--border-bright)] text-[var(--fg-dim)]'}`}>
                      {a}
                    </button>
                  ))}
                </span>
              }>
                <Table rows={events} rowKey={e => e.id} selected={event?.id} onRowClick={e => setSelectedId(e.id)} columns={[
                  { head: 'ID', cell: e => <Mono tone="cyan">{e.id}</Mono> },
                  { head: 'WHEN', cell: e => <Mono>{shortDate(e.changed_at)}</Mono> },
                  { head: 'ACTION', cell: e => <StatusBadge status={e.action} /> },
                  { head: 'TABLE', cell: e => <Mono>{e.table_name}</Mono> },
                  { head: 'RECORD', cell: e => <Mono>{e.record_id}</Mono> },
                  { head: 'CHANGED BY', cell: e => e.changed_by },
                ]} />
              </Card>
              <Card title={event ? `Change #${event.id}` : 'Change'} right={event && <StatusBadge status={event.action} />} flush>
                {event && (
                  <div className="grid grid-cols-2 font-mono text-[11px]">
                    <p className="bg-rose-500/10 px-3 py-1.5 text-[var(--signal-rose)]">OLD_VALUES</p>
                    <p className="bg-emerald-500/10 px-3 py-1.5 text-[var(--signal-emerald)]">NEW_VALUES</p>
                    {keys.map(k => (
                      <div key={k} className="contents">
                        {[event.old_values, event.new_values].map((side, i) => (
                          <div key={i} className={`min-w-0 break-words px-3 py-1.5 ${changed(k) ? (i ? 'bg-emerald-500/10' : 'bg-rose-500/10') : ''}`}>
                            <p className="text-[var(--fg-dim)]">{k}</p>
                            <p className="text-[var(--foreground)]">{JSON.stringify(side?.[k] ?? null)}</p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        );
      }}
    </Loadable>
  );
}
