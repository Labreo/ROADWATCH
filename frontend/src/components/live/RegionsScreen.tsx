'use client';

import { useStore } from '@/store/useStore';
import { useLive } from '@/services/api';
import { Badge, Card, Loadable, Mono, Table, shortDate } from './ui';

interface Regions {
  regions: { code: string; name: string; default_currency: string; locale: string; timezone: string | null; authorities: number; roads: number }[];
  imports: { id: number; region_code: string; source: string; roads_imported: number; roads_skipped: number; roads_errors: number; finished_at: string | null }[];
  cpi: { region_code: string; year: number; cpi_value: number }[];
}

export default function RegionsScreen() {
  const active = useStore(s => s.regionCode);
  const setRegion = useStore(s => s.setRegionCode);
  const state = useLive<Regions>('/screens/regions');
  return (
    <Loadable state={state}>
      {({ regions, imports, cpi }) => {
        const years = [...new Set(cpi.map(c => c.year))].sort((a, b) => b - a).slice(0, 3);
        const value = (code: string, year: number) => cpi.find(c => c.region_code === code && c.year === year)?.cpi_value ?? '—';
        return (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {regions.map(r => (
                <button
                  key={r.code}
                  onClick={() => setRegion(r.code)}
                  aria-pressed={r.code === active}
                  className={`rounded-lg border p-3.5 text-left ${r.code === active ? 'border-cyan-400/50 bg-cyan-500/[0.07]' : 'border-[var(--border-bright)] bg-[var(--surface-1)]'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-[var(--foreground)]">{r.code} · {r.name}</span>
                    {r.code === active && <Badge tone="cyan">ACTIVE</Badge>}
                  </span>
                  <span className="mt-2 flex justify-between text-xs text-[var(--fg-dim)]"><span>Currency</span><Mono>{r.default_currency}</Mono></span>
                  <span className="mt-1 flex justify-between text-xs text-[var(--fg-dim)]"><span>Roads</span><Mono>{r.roads}</Mono></span>
                  <span className="mt-1 flex justify-between text-xs text-[var(--fg-dim)]"><span>Authorities</span><Mono>{r.authorities}</Mono></span>
                </button>
              ))}
            </div>
            <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
              <Card title="Data import pipeline" flush>
                <Table rows={imports} rowKey={i => i.id} empty="No imports recorded." columns={[
                  { head: 'IMPORT', cell: i => <Mono tone="cyan">IMP-{String(i.id).padStart(4, '0')}</Mono> },
                  { head: 'REGION', cell: i => i.region_code },
                  { head: 'SOURCE', cell: i => i.source },
                  { head: 'ROWS', cell: i => <Mono>{i.roads_imported}</Mono> },
                  { head: 'FINISHED', cell: i => <Mono>{shortDate(i.finished_at)}</Mono> },
                  { head: 'STATUS', cell: i => <Badge tone={i.roads_errors > 0 ? 'amber' : 'emerald'}>{i.roads_errors > 0 ? `${i.roads_errors} ERRORS` : 'LOADED'}</Badge> },
                ]} />
              </Card>
              <Card title="CPI normalisation" flush>
                <Table rows={regions} rowKey={r => r.code} columns={[
                  { head: 'REGION', cell: r => r.name },
                  ...years.map(y => ({ head: String(y), cell: (r: Regions['regions'][number]) => <Mono>{value(r.code, y)}</Mono> })),
                ]} />
              </Card>
            </div>
          </div>
        );
      }}
    </Loadable>
  );
}
