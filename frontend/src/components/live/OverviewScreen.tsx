'use client';

import { useStore } from '@/store/useStore';
import { useLive } from '@/services/api';
import { Badge, Card, Kpi, KpiRow, Loadable, Mono, Table, money, num } from './ui';

interface Corridor {
  id: number;
  name: string;
  road_code: string;
  status: string;
  authority: string | null;
  contractor: string | null;
  open_complaints: number;
  health_score: number;
}

interface Overview {
  kpi: {
    roads: number; authorities: number; allocated: number; spent: number;
    complaints: number; open_complaints: number; sla_compliance: number | null;
  };
  corridors: Corridor[];
}

const conditionTone = (score: number) => (score >= 75 ? 'emerald' : score >= 60 ? 'cyan' : score >= 50 ? 'amber' : 'rose');

export default function OverviewScreen() {
  const regionCode = useStore(s => s.regionCode);
  const setActiveView = useStore(s => s.setActiveView);
  const state = useLive<Overview>(`/screens/overview?region=${regionCode}`);

  return (
    <Loadable state={state}>
      {({ kpi, corridors }) => {
        const over = Number(kpi.spent) - Number(kpi.allocated);
        return (
          <div className="flex flex-col gap-4">
            <section className="rounded-lg border border-[var(--border-bright)] bg-[var(--surface-1)] p-6 lg:p-8">
              <Badge tone="emerald">LIVE · {num(kpi.roads)} ROADS MONITORED</Badge>
              <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-[var(--foreground)] lg:text-[46px] lg:leading-[52px]">
                Every road has a budget, a contractor and an owner.
              </h1>
              <p className="mt-3 max-w-xl text-[13px] leading-5 text-[var(--fg-dim)]">
                ROADWATCH ties public spend, contractor liability and citizen complaints to the exact stretch of road under your feet.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <button onClick={() => setActiveView('complaints')} className="rounded-md bg-[var(--signal-cyan)] px-4 py-2 text-[13px] font-medium text-[#04161a]">
                  Report a road issue
                </button>
                <button onClick={() => setActiveView('roads')} className="rounded-md border border-[var(--border-bright)] bg-[var(--surface-3)] px-4 py-2 text-[13px] font-medium text-[var(--foreground)]">
                  Open the road map
                </button>
              </div>
            </section>

            <KpiRow>
              <Kpi title="GAZETTED ROADS" value={num(kpi.roads)} note={`Across ${kpi.authorities} authorities`} />
              <Kpi title="ACTIVE CAPITAL SPEND" value={money(kpi.spent)} tone={over > 0 ? 'amber' : 'emerald'}
                note={over > 0 ? `${money(over)} over sanction` : `${money(-over)} under sanction`} />
              <Kpi title="CITIZEN COMPLAINTS" value={num(kpi.complaints)} tone="rose" note={`${kpi.open_complaints} open right now`} />
              <Kpi title="SLA COMPLIANCE" value={kpi.sla_compliance === null ? '—' : `${kpi.sla_compliance}%`} tone="emerald" note="Complaints with no SLA breach" />
            </KpiRow>

            <Card title="Corridors that need attention" flush right={
              <button onClick={() => setActiveView('roads')} className="text-xs text-[var(--signal-cyan)]">View all roads →</button>
            }>
              <Table
                rows={corridors}
                rowKey={r => r.id}
                columns={[
                  { head: 'ROAD', cell: r => r.name },
                  { head: 'CODE', cell: r => <Mono>{r.road_code}</Mono> },
                  { head: 'AUTHORITY', cell: r => r.authority ?? '—' },
                  { head: 'CONTRACTOR', cell: r => r.contractor ?? '—' },
                  { head: 'OPEN', cell: r => <Mono>{r.open_complaints}</Mono> },
                  { head: 'CONDITION', cell: r => <Badge tone={conditionTone(r.health_score)}>{r.status.replace('_', ' ').toUpperCase()} · {r.health_score}</Badge> },
                ]}
              />
            </Card>
          </div>
        );
      }}
    </Loadable>
  );
}
