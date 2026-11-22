'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { apiPost, useLive } from '@/services/api';
import {
  ActionButton, Badge, Card, Kpi, KpiRow, Loadable, Mono, StatusBadge, Table, Tabs, hours, money, num, shortDate,
} from './ui';
import StaffAccounts from './StaffAccounts';

const TABS = ['Command center', 'SLA escalations', 'Jurisdiction conflicts', 'Repair scheduler', 'Staff accounts'] as const;
type Tab = (typeof TABS)[number];

export default function OperationsScreen() {
  const [tab, setTab] = useState<Tab>('Command center');
  const role = useStore(s => s.userRole);
  // Only administrators manage accounts.
  const tabs = role === 'admin' ? TABS : TABS.filter(t => t !== 'Staff accounts');
  return (
    <div className="flex flex-col gap-4">
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === 'Command center' && <CommandCenter />}
      {tab === 'SLA escalations' && <SlaEngine />}
      {tab === 'Jurisdiction conflicts' && <Conflicts />}
      {tab === 'Repair scheduler' && <Scheduler />}
      {tab === 'Staff accounts' && role === 'admin' && <StaffAccounts />}
    </div>
  );
}

interface QueueRow {
  id: number; title: string; category: string; status: string; priority: number;
  escalation_level: number; authority: string; road_code: string | null; hours_left: number;
}

interface Ops {
  kpi: { open_queue: number; routed: number; in_progress: number; escalated: number; critical_overdue: number; mean_repair_hours: number | null };
  delivery: { total: number; sent: number };
  queue: QueueRow[];
  webhooks: { authority: string; webhook_url: string; last_status: string | null; last_code: number | null }[];
  log: { id: number; table_name: string; record_id: number; action: string; changed_by: string; changed_at: string }[];
}

const NEXT_STEP: Record<string, { to: string; label: string } | undefined> = {
  pending: { to: 'routed', label: 'Route' },
  routed: { to: 'in_progress', label: 'Dispatch' },
  in_progress: { to: 'resolved', label: 'Resolve' },
};

function CommandCenter() {
  const region = useStore(s => s.regionCode);
  const role = useStore(s => s.userRole);
  const canWork = role === 'engineer' || role === 'admin';
  const state = useLive<Ops>(`/screens/operations?region=${region}`, 15000);
  return (
    <Loadable state={state}>
      {({ kpi, delivery, queue, webhooks, log }) => (
        <div className="flex flex-col gap-4">
          <KpiRow>
            <Kpi title="OPEN QUEUE" value={num(kpi.open_queue)} note={`${kpi.routed} routed · ${kpi.in_progress} in progress`} />
            <Kpi title="CRITICAL OVERDUE" value={num(kpi.critical_overdue)} tone="rose" note={`${kpi.escalated} escalated`} />
            <Kpi title="MEAN TIME TO REPAIR" value={kpi.mean_repair_hours === null ? '—' : `${kpi.mean_repair_hours} h`} tone="emerald" note="Resolved complaints" />
            <Kpi title="WEBHOOK DELIVERY" value={delivery.total ? `${Math.round((100 * delivery.sent) / delivery.total)}%` : '—'} tone="indigo" note={`${delivery.total} notifications logged`} />
          </KpiRow>
          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <Card title="Grievance triage queue" flush>
              <Table
                rows={queue}
                rowKey={r => r.id}
                columns={[
                  { head: 'TICKET', cell: r => <Mono tone="cyan">#CMP-{String(r.id).padStart(5, '0')}</Mono> },
                  { head: 'ISSUE', cell: r => <span className="line-clamp-1">{r.title}{r.road_code ? ` · ${r.road_code}` : ''}</span> },
                  { head: 'AUTHORITY', cell: r => <Mono>{r.authority}</Mono> },
                  {
                    head: 'SLA',
                    cell: r => ['resolved', 'rejected'].includes(r.status)
                      ? <Mono>Closed</Mono>
                      : <Mono tone={r.hours_left < 0 ? 'rose' : r.hours_left < 12 ? 'amber' : undefined}>{hours(r.hours_left)}</Mono>,
                  },
                  { head: 'STATUS', cell: r => <span className="flex items-center gap-1"><StatusBadge status={r.status} />{r.escalation_level > 0 && <Badge tone="rose">L{r.escalation_level}</Badge>}</span> },
                  {
                    head: 'ACTION',
                    cell: r => {
                      const next = NEXT_STEP[r.status];
                      if (!next || !canWork) return null;
                      return (
                        <span className="flex gap-1.5">
                          <ActionButton onDone={state.reload} action={() => apiPost(`/screens/complaints/${r.id}/transition`, { status: next.to, remarks: `${next.label} from command center` })}>
                            {next.label}
                          </ActionButton>
                          {r.escalation_level < 2 && (
                            <ActionButton variant="danger" onDone={state.reload} action={() => apiPost(`/screens/complaints/${r.id}/escalate`)}>Escalate</ActionButton>
                          )}
                        </span>
                      );
                    },
                  },
                ]}
              />
            </Card>
            <div className="flex flex-col gap-4">
              <Card title="Authority webhooks">
                {webhooks.length === 0 && <p className="text-[13px] text-[var(--fg-dim)]">No webhooks registered.</p>}
                <ul className="flex flex-col gap-2">
                  {webhooks.map(h => (
                    <li key={h.webhook_url} className="flex items-center justify-between gap-2 text-xs text-[var(--foreground)]">
                      <span>{h.authority}</span>
                      <Mono tone={h.last_status === 'failed' ? 'rose' : h.last_status === 'sent' ? 'emerald' : undefined}>
                        {h.last_code ?? h.last_status ?? 'idle'}
                      </Mono>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title="Live system log" className="flex-1">
                <ul className="flex flex-col gap-1.5 font-mono text-[11px] leading-4 text-[var(--fg-dim)]">
                  {log.map(entry => (
                    <li key={entry.id}>
                      {new Date(entry.changed_at).toLocaleTimeString('en-GB')}{' '}
                      <span className="text-[var(--foreground)]">{entry.action}</span> {entry.table_name} #{entry.record_id}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </div>
      )}
    </Loadable>
  );
}

interface Sla {
  config: { id: number; category: string; escalation_hours: number; escalation_level: number; escalate_to: string | null }[];
  levels: { level: number; open: number }[];
  breaches: {
    id: number; title: string; escalation_level: number; authority: string; road_name: string | null;
    contractor: string | null; hours_overdue: number; damages_inr: number;
  }[];
  ld_rate_per_hour_inr: number;
}

function SlaEngine() {
  const region = useStore(s => s.regionCode);
  const role = useStore(s => s.userRole);
  const state = useLive<Sla>(`/screens/sla?region=${region}`);
  const [result, setResult] = useState<string | null>(null);
  return (
    <Loadable state={state}>
      {({ config, levels, breaches, ld_rate_per_hour_inr }) => {
        const atLevel = (n: number) => levels.find(l => l.level === n)?.open ?? 0;
        const damages = breaches.reduce((acc, b) => acc + b.damages_inr, 0);
        return (
          <div className="flex flex-col gap-4">
            <KpiRow>
              <Kpi title="SLA BREACHES OPEN" value={breaches.length} tone="rose" note="Past their repair target" />
              <Kpi title="AT LEVEL 1" value={atLevel(1)} tone="amber" note="Ward engineers notified" />
              <Kpi title="AT LEVEL 2" value={atLevel(2)} tone="rose" note="Executive engineers notified" />
              <Kpi title="DAMAGES ACCRUED" value={money(damages)} tone="indigo" note={`${money(ld_rate_per_hour_inr)} per overdue hour`} />
            </KpiRow>
            <div className="grid gap-4 xl:grid-cols-2">
              <Card title="Statutory SLA matrix" flush right={
                <span className="flex items-center gap-2">
                  {result && <Mono tone="emerald">{result}</Mono>}
                  {role === 'admin' && (
                    <ActionButton variant="primary" onDone={state.reload} action={async () => {
                      const r = await apiPost<{ escalated: number }>('/screens/sla/run');
                      setResult(`${r.escalated} escalated`);
                    }}>Run escalation check</ActionButton>
                  )}
                </span>
              }>
                <Table
                  rows={config}
                  rowKey={r => r.id}
                  columns={[
                    { head: 'CATEGORY', cell: r => r.category.replace('_', ' ') },
                    { head: 'AFTER', cell: r => <Mono>{r.escalation_hours} h</Mono> },
                    { head: 'LEVEL', cell: r => <Badge tone={r.escalation_level === 2 ? 'rose' : 'amber'}>L{r.escalation_level}</Badge> },
                    { head: 'ESCALATES TO', cell: r => r.escalate_to ?? '—' },
                  ]}
                />
              </Card>
              <Card title="Breach incident feed" right={<Badge tone="rose">{breaches.length} OPEN</Badge>}>
                <ul className="flex flex-col gap-2.5">
                  {breaches.map(b => (
                    <li key={b.id} className="rounded-lg border border-[var(--border-bright)] bg-[var(--surface-2)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Mono tone="cyan">#CMP-{String(b.id).padStart(5, '0')}</Mono>
                        <Badge tone={b.escalation_level === 2 ? 'rose' : 'amber'}>LEVEL {b.escalation_level}</Badge>
                      </div>
                      <p className="mt-1.5 text-[13px] font-medium text-[var(--foreground)]">{b.title}{b.contractor ? ` · ${b.contractor}` : ''}</p>
                      <p className="mt-1 text-xs text-[var(--fg-dim)]">
                        <span className="text-[var(--signal-rose)]">{hours(b.hours_overdue)} overdue</span> · damages {money(b.damages_inr)}
                      </p>
                    </li>
                  ))}
                  {breaches.length === 0 && <li className="text-[13px] text-[var(--fg-dim)]">No open breaches.</li>}
                </ul>
              </Card>
            </div>
          </div>
        );
      }}
    </Loadable>
  );
}

interface ConflictData {
  roads: { id: number; conflict_key: string; resolved: boolean; primary_road: string | null; road_code: string | null; members: number }[];
  authorities: { id: number; conflict_key: string; resolved: boolean; primary_authority: string | null }[];
  overlaps: { authority_a: string; authority_b: string; authority_a_id: number; authority_b_id: number; overlap_km2: number }[];
  aliases: { alias_name: string; alias_type: string; road_code: string }[];
  boundaries: { id: number; name: string; department_code: string; coordinates: number[][][] }[];
}

const BOUNDARY_COLORS = ['#818cf8', '#22d3ee', '#34d399', '#f59e0b', '#f43f5e'];

function BoundaryMap({ boundaries }: { boundaries: ConflictData['boundaries'] }) {
  const projected = useMemo(() => {
    // Statewide PWD and NHAI polygons would cover the whole canvas, so plot wards.
    const wards = boundaries.filter(b => b.department_code.startsWith('MCGM'));
    const visible = wards.length ? wards : boundaries;
    const all = visible.flatMap(b => b.coordinates[0]);
    const lons = all.map(p => p[0]), lats = all.map(p => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...lons) - 0.02, Math.max(...lons) + 0.02, Math.min(...lats) - 0.02, Math.max(...lats) + 0.02];
    const W = 760, H = 460;
    return visible.map((b, i) => ({
      ...b,
      color: BOUNDARY_COLORS[i % BOUNDARY_COLORS.length],
      path: `M${b.coordinates[0].map(([lon, lat]) => `${(((lon - x0) / (x1 - x0)) * W).toFixed(1)} ${((1 - (lat - y0) / (y1 - y0)) * H).toFixed(1)}`).join('L')}Z`,
    }));
  }, [boundaries]);
  return (
    <svg role="img" aria-label="Overlapping authority jurisdiction boundaries" viewBox="0 0 760 460" className="w-full bg-[var(--surface-0)]">
      {projected.map(b => <path key={b.id} d={b.path} fill={b.color} fillOpacity={0.12} stroke={b.color} strokeDasharray="7 5" />)}
    </svg>
  );
}

function Conflicts() {
  const role = useStore(s => s.userRole);
  const state = useLive<ConflictData>('/screens/conflicts');
  return (
    <Loadable state={state}>
      {({ roads, authorities, overlaps, aliases, boundaries }) => (
        <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
          <div className="flex flex-col gap-4">
            <Card title="Authority boundaries" flush><BoundaryMap boundaries={boundaries} /></Card>
            <Card title="ST_Overlaps results" flush>
              <Table
                rows={overlaps}
                rowKey={r => `${r.authority_a_id}-${r.authority_b_id}`}
                empty="No overlapping authority polygons."
                columns={[
                  { head: 'AUTHORITY A', cell: r => r.authority_a },
                  { head: 'AUTHORITY B', cell: r => r.authority_b },
                  { head: 'OVERLAP', cell: r => <Mono tone="rose">{r.overlap_km2} km²</Mono> },
                ]}
              />
            </Card>
          </div>
          <div className="flex flex-col gap-4">
            <Card title="Conflict groups" right={<Badge tone="amber">{roads.filter(r => !r.resolved).length + authorities.filter(a => !a.resolved).length} OPEN</Badge>}>
              <ul className="flex flex-col gap-2">
                {roads.map(r => (
                  <li key={`road-${r.id}`} className="flex items-center justify-between gap-2 text-[13px] text-[var(--foreground)]">
                    <span><Mono tone="cyan">{r.conflict_key}</Mono><br />{r.primary_road ?? 'Unassigned road'}</span>
                    {r.resolved ? <Badge tone="emerald">RESOLVED</Badge> : role !== 'admin' ? <Badge tone="rose">OPEN</Badge> : (
                      <ActionButton variant="primary" onDone={state.reload} action={() => apiPost(`/screens/conflicts/road/${r.id}/resolve`, {})}>Resolve</ActionButton>
                    )}
                  </li>
                ))}
                {authorities.map(a => (
                  <li key={`auth-${a.id}`} className="flex items-center justify-between gap-2 text-[13px] text-[var(--foreground)]">
                    <span><Mono tone="cyan">{a.conflict_key}</Mono><br />{a.primary_authority ?? 'Unassigned authority'}</span>
                    {a.resolved ? <Badge tone="emerald">RESOLVED</Badge> : role !== 'admin' ? <Badge tone="rose">OPEN</Badge> : (
                      <ActionButton variant="primary" onDone={state.reload} action={() => apiPost(`/screens/conflicts/authority/${a.id}/resolve`, {})}>Resolve</ActionButton>
                    )}
                  </li>
                ))}
                {roads.length + authorities.length === 0 && <li className="text-[13px] text-[var(--fg-dim)]">No conflict groups recorded.</li>}
              </ul>
            </Card>
            <Card title="Road aliases" flush>
              <Table rows={aliases} rowKey={r => `${r.road_code}-${r.alias_name}`} columns={[
                { head: 'ALIAS', cell: r => r.alias_name },
                { head: 'CANONICAL', cell: r => <Mono tone="cyan">{r.road_code}</Mono> },
              ]} />
            </Card>
          </div>
        </div>
      )}
    </Loadable>
  );
}

interface Milestone {
  milestone_num: number; title: string; amount: number; status: string; due_date: string | null;
  completion_date: string | null; verified_by: string | null; payment_release_date: string | null;
  tests: { test_name: string; measured: number; unit: string; spec_min: number | null; spec_max: number | null; passed: boolean; tested_on: string }[];
}

interface Project {
  id: number; title: string; status: string; start_date: string; target_end_date: string;
  budget_allocated: number; budget_spent: number; contractor: string; road_name: string; milestones: Milestone[];
}

function Scheduler() {
  const region = useStore(s => s.regionCode);
  const role = useStore(s => s.userRole);
  const state = useLive<Project[]>(`/screens/projects?region=${region}`);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  return (
    <Loadable state={state}>
      {projects => {
        const project = projects.find(p => p.id === selectedId) ?? projects.find(p => p.milestones.length > 0) ?? projects[0];
        if (!project) return <p className="text-sm text-[var(--fg-dim)]">No projects in this region.</p>;
        const start = new Date(project.start_date).getTime();
        const end = Math.max(new Date(project.target_end_date).getTime(), ...project.milestones.map(m => new Date(m.due_date ?? project.target_end_date).getTime()));
        const pos = (date: string | null) => Math.min(100, Math.max(0, ((new Date(date ?? project.target_end_date).getTime() - start) / (end - start || 1)) * 100));
        const today = pos(new Date().toISOString());
        const inspected = [...project.milestones].reverse().find(m => m.tests.length > 0);
        return (
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-2 text-xs text-[var(--fg-dim)]">
              Project
              <select
                value={project.id}
                onChange={e => setSelectedId(Number(e.target.value))}
                className="rounded-md border border-[var(--border-bright)] bg-[var(--surface-2)] px-2 py-1.5 text-[13px] text-[var(--foreground)]"
              >
                {projects.map(p => <option key={p.id} value={p.id}>#{p.id} {p.title}</option>)}
              </select>
            </label>
            <section className="flex flex-wrap items-center gap-6 rounded-lg border border-[var(--border-bright)] bg-[var(--surface-1)] px-4 py-3">
              <div className="min-w-60 flex-1">
                <Mono tone="cyan">PRJ-{String(project.id).padStart(5, '0')}</Mono>
                <h2 className="text-[22px] font-semibold text-[var(--foreground)]">{project.title}</h2>
              </div>
              <Fact name="CONTRACTOR" value={project.contractor} />
              <Fact name="SANCTIONED" value={money(project.budget_allocated)} />
              <Fact name="STATUS" value={<StatusBadge status={project.status} />} />
            </section>
            <Card title={`Milestone timeline, ${shortDate(project.start_date)} to ${shortDate(new Date(end).toISOString())}`}>
              <div className="relative flex flex-col gap-3">
                <div aria-hidden className="absolute bottom-0 top-0 z-10 w-0.5 bg-[var(--signal-rose)]" style={{ left: `calc(200px + (100% - 200px) * ${today / 100})` }} />
                {project.milestones.map((m, i) => {
                  const left = pos(i === 0 ? project.start_date : project.milestones[i - 1].due_date);
                  const right = pos(m.due_date);
                  const done = m.status === 'completed';
                  return (
                    <div key={m.milestone_num} className="flex items-center">
                      <span className="w-[200px] shrink-0 truncate pr-3 text-xs text-[var(--foreground)]">
                        <Mono tone="cyan">M{m.milestone_num}</Mono> {m.title}
                      </span>
                      <div className="relative h-7 flex-1">
                        <div
                          className={`absolute inset-y-0 flex items-center overflow-hidden rounded border px-2 text-[11px] ${done ? 'border-emerald-400/50 bg-emerald-500/10 text-[var(--signal-emerald)]' : m.status === 'in_progress' ? 'border-cyan-400/50 bg-cyan-500/10 text-[var(--signal-cyan)]' : 'border-slate-400/30 bg-slate-500/10 text-[var(--signal-slate)]'}`}
                          style={{ left: `${left}%`, width: `${Math.max(right - left, 4)}%` }}
                        >
                          {done ? 'Verified' : m.status.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {project.milestones.length === 0 && <p className="text-[13px] text-[var(--fg-dim)]">No milestones recorded for this project.</p>}
              </div>
            </Card>
            <Card title="Milestone payments" flush>
              <Table rows={project.milestones} rowKey={m => m.milestone_num} columns={[
                { head: 'MILESTONE', cell: m => m.title },
                { head: 'VALUE', cell: m => <Mono>{money(m.amount)}</Mono> },
                { head: 'VERIFIED BY', cell: m => m.verified_by ?? 'Pending' },
                {
                  head: 'STATUS',
                  cell: m => {
                    if (m.payment_release_date) return <Badge tone="emerald">PAID</Badge>;
                    if (m.status === 'completed' && m.verified_by) {
                      return role === 'admin'
                        ? <ActionButton variant="primary" onDone={state.reload} action={() => apiPost(`/screens/projects/${project.id}/milestones/${m.milestone_num}/release-payment`)}>Authorize payout</ActionButton>
                        : <Badge tone="amber">READY TO PAY</Badge>;
                    }
                    return role === 'engineer' || role === 'admin'
                      ? <ActionButton onDone={state.reload} action={() => apiPost(`/screens/projects/${project.id}/milestones/${m.milestone_num}/verify`, { verified_by: 'Ward field engineer' })}>Verify milestone</ActionButton>
                      : <StatusBadge status={m.status} />;
                  },
                },
              ]} />
            </Card>
            <Card title="Field verification">
              {inspected ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-[var(--fg-dim)]">M{inspected.milestone_num} {inspected.title}{inspected.verified_by ? `, signed by ${inspected.verified_by}` : ''}</p>
                  <div className="grid gap-2 md:grid-cols-3">
                    {inspected.tests.map(t => (
                      <div key={t.test_name} className="rounded-md border border-[var(--border-bright)] bg-[var(--surface-2)] px-3 py-2">
                        <p className="text-xs text-[var(--foreground)]">{t.test_name}</p>
                        <p className="mt-1 flex items-center justify-between gap-2">
                          <Mono tone={t.passed ? 'emerald' : 'rose'}>{t.measured} {t.unit}</Mono>
                          <Badge tone={t.passed ? 'emerald' : 'rose'}>{t.passed ? 'PASS' : 'FAIL'}</Badge>
                        </p>
                        <p className="mt-1 text-[11px] text-[var(--fg-dim)]">
                          Spec {t.spec_min !== null && t.spec_max !== null ? `${t.spec_min} to ${t.spec_max}` : t.spec_min !== null ? `at least ${t.spec_min}` : `at most ${t.spec_max}`} {t.unit}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-[13px] text-[var(--fg-dim)]">No core sample results recorded for this project yet.</p>}
            </Card>
          </div>
        );
      }}
    </Loadable>
  );
}

function Fact({ name, value }: { name: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-wider text-[var(--fg-dim)]">{name}</p>
      <div className="text-[13px] font-medium text-[var(--foreground)]">{value}</div>
    </div>
  );
}
