'use client';

import { useLive } from '@/services/api';
import { Card, Kpi, KpiRow, Loadable, Mono, StatusBadge, hours, shortDate } from './ui';

// The app has no sign-in yet, so this shows the demo citizen seeded in schema_documented.sql.
const DEMO_CITIZEN_ID = 2;

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
  const state = useLive<Reports>(`/screens/citizens/${DEMO_CITIZEN_ID}/reports`);
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
              </Card>
            ))}
            {reports.length === 0 && <p className="text-[13px] text-[var(--fg-dim)]">No reports filed yet.</p>}
          </div>
        </div>
      )}
    </Loadable>
  );
}
