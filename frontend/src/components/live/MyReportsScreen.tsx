'use client';

import { useStore } from '@/store/useStore';
import { apiDelete, useLive } from '@/services/api';
import { ActionButton, Card, Kpi, KpiRow, Loadable, Mono, StatusBadge, hours, shortDate } from './ui';
import RepairCheck from './RepairCheck';

interface Report {
  id: number; title: string; status: string; priority: number; created_at: string; authority: string | null;
  road_name: string | null; hours_left: number;
  history: { history_seq: number; old_status: string | null; new_status: string; changed_at: string; remarks: string | null }[];
}

interface Reports {
  citizen: { first_name: string; last_name: string; total_complaints_filed: number };
  reports: Report[];
}

const isOpen = (r: Report) => !['resolved', 'rejected'].includes(r.status);

export default function MyReportsScreen() {
  const role = useStore(s => s.session?.user.role);
  const setLoginOpen = useStore(s => s.setLoginOpen);
  const state = useLive<Reports>(role === 'citizen' ? '/screens/me/reports' : null);
  if (role !== 'citizen') {
    return (
      <div className="m-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-[var(--border-bright)] bg-[var(--surface-1)] p-8 text-center">
        <p className="text-sm text-[var(--foreground)]">Sign in with a citizen account to track your reports.</p>
        <button onClick={() => setLoginOpen(true)} className="rounded-md bg-[var(--signal-cyan)] px-4 py-2 text-[13px] font-medium text-[#04161a]">Sign in</button>
      </div>
    );
  }
  return (
    <Loadable state={state}>
      {({ citizen, reports }) => (
        <div className="flex flex-col gap-4">
          <KpiRow>
            <Kpi title="FILED" value={citizen.total_complaints_filed} note={`${citizen.first_name} ${citizen.last_name}`} />
            <Kpi title="RESOLVED" value={reports.filter(r => r.status === 'resolved').length} tone="emerald" />
            <Kpi title="ACTIVE" value={reports.filter(isOpen).length} />
            <Kpi title="PAST SLA" value={reports.filter(r => isOpen(r) && r.hours_left < 0).length} tone="rose" />
          </KpiRow>
          <div className="grid gap-4 lg:grid-cols-2">
            {reports.map(r => (
              <Card key={r.id} title={r.title} right={<StatusBadge status={r.status} />}>
                <p className="text-xs text-[var(--fg-dim)]">
                  <Mono tone="cyan">#CMP-{String(r.id).padStart(5, '0')}</Mono> · {r.road_name ?? 'Unmatched road'} · {r.authority ?? 'Unassigned'}
                </p>
                {isOpen(r) && (
                  <p className="mt-2 flex justify-between rounded-md bg-amber-500/10 px-3 py-2 text-[13px] text-[var(--foreground)]">
                    Repair deadline <Mono tone={r.hours_left < 0 ? 'rose' : 'amber'}>{r.hours_left < 0 ? `${hours(-r.hours_left)} overdue` : `${hours(r.hours_left)} left`}</Mono>
                  </p>
                )}
                <ol className="mt-3 flex flex-col gap-2">
                  {r.history.map(h => (
                    <li key={h.history_seq} className="flex gap-2.5 text-[13px] text-[var(--foreground)]">
                      <span aria-hidden className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[var(--signal-emerald)]" />
                      <span>
                        {h.new_status.replace('_', ' ')}
                        <span className="block text-xs text-[var(--fg-dim)]">{shortDate(h.changed_at)}{h.remarks ? ` · ${h.remarks}` : ''}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                {r.status === 'resolved' && <RepairCheck reportId={r.id} onDone={state.reload} />}
                {['pending', 'routed'].includes(r.status) && (
                  <ActionButton
                    variant="danger"
                    className="mt-3"
                    action={() => {
                      if (!window.confirm(`Withdraw report CMP-${String(r.id).padStart(5, '0')}? This deletes it.`)) return Promise.resolve();
                      return apiDelete(`/screens/me/reports/${r.id}`);
                    }}
                    onDone={state.reload}
                  >
                    Withdraw report
                  </ActionButton>
                )}
              </Card>
            ))}
            {reports.length === 0 && <p className="text-[13px] text-[var(--fg-dim)]">No reports filed yet.</p>}
          </div>
        </div>
      )}
    </Loadable>
  );
}
