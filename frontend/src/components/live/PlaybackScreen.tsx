'use client';

import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useLive } from '@/services/api';
import { Badge, Card, Loadable, Mono, StatusBadge, Table, shortDate } from './ui';
import { LineChart } from './charts';

interface Point {
  snapshot_date: string; status_at_time: string; complaint_count: number; project_count: number;
  avg_depth_cm: number | null; source: string; health_score: number;
}

interface RoadOption { id: number; name: string; road_code: string }

export default function PlaybackScreen() {
  const region = useStore(s => s.regionCode);
  const roads = useLive<RoadOption[]>(`/screens/roads?region=${region}&major=true`);
  const [roadId, setRoadId] = useState<number | null>(null);
  const activeRoad = roadId ?? roads.data?.[0]?.id ?? null;
  const state = useLive<{ road: RoadOption & { status: string }; history: Point[] }>(activeRoad ? `/screens/playback/${activeRoad}` : null);
  const [step, setStep] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const length = state.data?.history.length ?? 0;

  useEffect(() => {
    if (!playing || !length) return;
    const timer = setInterval(() => {
      setStep(current => {
        const next = (current ?? -1) + 1;
        if (next >= length - 1) setPlaying(false);
        return Math.min(next, length - 1);
      });
    }, 900);
    return () => clearInterval(timer);
  }, [playing, length]);

  return (
    <Loadable state={{ ...state, data: state.data, loading: state.loading || roads.loading, error: state.error ?? roads.error }}>
      {({ road, history }) => {
        const index = Math.min(step ?? history.length - 1, history.length - 1);
        const current = history[index];
        return (
          <div className="flex flex-col gap-4">
            <section className="flex flex-col gap-3 rounded-lg border border-[var(--border-bright)] bg-[var(--surface-1)] p-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => { if (!playing && index >= history.length - 1) setStep(0); setPlaying(p => !p); }}
                  aria-label={playing ? 'Pause playback' : 'Play history'}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--signal-cyan)] text-[#04161a]"
                >
                  {playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
                </button>
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{current ? shortDate(current.snapshot_date) : 'No history yet'}</h2>
                <span className="flex-1" />
                <label className="flex items-center gap-2 text-xs text-[var(--fg-dim)]">
                  Road
                  <select
                    value={road.id}
                    onChange={e => { setRoadId(Number(e.target.value)); setStep(null); setPlaying(false); }}
                    className="rounded-md border border-[var(--border-bright)] bg-[var(--surface-2)] px-2 py-1.5 text-[13px] text-[var(--foreground)]"
                  >
                    {roads.data?.map(r => <option key={r.id} value={r.id}>{r.road_code} · {r.name}</option>)}
                  </select>
                </label>
              </div>
              {history.length > 1 && (
                <input
                  aria-label="Timeline"
                  type="range"
                  min={0}
                  max={history.length - 1}
                  value={index}
                  onChange={e => { setPlaying(false); setStep(Number(e.target.value)); }}
                  className="w-full accent-[var(--signal-cyan)]"
                />
              )}
            </section>
            <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
              <Card title="Road at this date" right={current && <StatusBadge status={current.status_at_time} />}>
                {current ? (
                  <dl className="flex flex-col gap-2 text-[13px] text-[var(--foreground)]">
                    {[['Health score', current.health_score], ['Open complaints', current.complaint_count], ['Projects', current.project_count], ['Average defect depth', current.avg_depth_cm === null ? '—' : `${current.avg_depth_cm} cm`], ['Snapshot source', current.source]].map(([k, v]) => (
                      <div key={String(k)} className="flex justify-between gap-3"><dt className="text-[var(--fg-dim)]">{k}</dt><dd>{v}</dd></div>
                    ))}
                  </dl>
                ) : <p className="text-[13px] text-[var(--fg-dim)]">No snapshots for this road.</p>}
              </Card>
              <Card title="Health over time">
                <LineChart
                  label={`Health score history for ${road.name}`}
                  points={history.slice(0, index + 1).map(h => h.health_score)}
                  min={0}
                  max={100}
                  threshold={50}
                  xLabels={history.length > 1 ? [shortDate(history[0].snapshot_date), shortDate(current.snapshot_date)] : undefined}
                />
              </Card>
            </div>
            <Card title="Recurring defect ledger" flush right={<Badge>{history.length} SNAPSHOTS</Badge>}>
              <Table rows={history.map((h, order) => ({ ...h, order })).reverse().slice(0, 8)} rowKey={h => h.order} columns={[
                { head: 'SNAPSHOT', cell: h => <Mono>{shortDate(h.snapshot_date)}</Mono> },
                { head: 'STATUS', cell: h => <StatusBadge status={h.status_at_time} /> },
                { head: 'COMPLAINTS', cell: h => <Mono>{h.complaint_count}</Mono> },
                { head: 'PROJECTS', cell: h => <Mono>{h.project_count}</Mono> },
                { head: 'SOURCE', cell: h => h.source },
              ]} />
            </Card>
          </div>
        );
      }}
    </Loadable>
  );
}
