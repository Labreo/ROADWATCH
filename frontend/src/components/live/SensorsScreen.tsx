'use client';

import { useState } from 'react';
import { useLive } from '@/services/api';
import { Badge, Card, Kpi, KpiRow, Loadable, Mono, Table, shortDate } from './ui';
import { LineChart } from './charts';

interface Sensor {
  id: number; sensor_code: string; sensor_type: string; chainage_km: number; depth_mm: number; unit: string;
  alert_threshold: number | null; battery_pct: number; last_calibrated: string | null; road_code: string;
  latest: number | null; peak: number | null; series: { recorded_at: string; reading: number }[];
}

const inAlert = (s: Sensor) => s.alert_threshold !== null && Number(s.latest) > Number(s.alert_threshold);

const LAYERS = [
  { name: 'Wearing course', from: 0, to: 50, fill: '#2a2b36' },
  { name: 'Dense bituminous base', from: 50, to: 150, fill: '#23242e' },
  { name: 'Wet mix macadam', from: 150, to: 400, fill: '#1f1c16' },
  { name: 'Granular sub-base', from: 400, to: 600, fill: '#161410' },
];

/** Standard pavement profile with each sensor drawn at its stored chainage and depth. */
function CrossSection({ sensors, selectedId, onSelect }: { sensors: Sensor[]; selectedId: number; onSelect: (id: number) => void }) {
  const W = 800, H = 240;
  const y = (mm: number) => (mm / 600) * H;
  const kms = sensors.map(s => Number(s.chainage_km));
  const [low, high] = [Math.min(...kms), Math.max(...kms)];
  const x = (km: number) => 190 + ((km - low) / (high - low || 1)) * (W - 300);
  return (
    <svg role="img" aria-label="Pavement layers with embedded sensors placed by depth" viewBox={`0 0 ${W} ${H}`} className="w-full">
      {LAYERS.map(l => (
        <g key={l.name}>
          <rect x={0} y={y(l.from)} width={W} height={y(l.to) - y(l.from)} fill={l.fill} />
          <text x={10} y={y(l.from) + 15} fontSize="10" fill="var(--fg-dim)" fontFamily="monospace">{l.name.toUpperCase()} · {l.to - l.from} MM</text>
        </g>
      ))}
      {sensors.map(s => {
        const cx = x(Number(s.chainage_km)), cy = Math.max(y(s.depth_mm), 8);
        const color = inAlert(s) ? 'var(--signal-rose)' : s.battery_pct < 40 ? 'var(--signal-amber)' : 'var(--signal-cyan)';
        return (
          <g key={s.id} onClick={() => onSelect(s.id)} className="cursor-pointer">
            <circle cx={cx} cy={cy} r={s.id === selectedId ? 9 : 7} fill={color} stroke="var(--foreground)" strokeWidth={2} />
            <text x={cx + 13} y={cy + 4} fontSize="11" fill={color} fontFamily="monospace">{s.sensor_code}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function SensorsScreen() {
  const state = useLive<Sensor[]>('/screens/sensors', 30000);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  return (
    <Loadable state={state}>
      {sensors => {
        const sensor = sensors.find(s => s.id === selectedId) ?? sensors.find(inAlert) ?? sensors[0];
        if (!sensor) return <p className="text-sm text-[var(--fg-dim)]">No sensors registered.</p>;
        const values = sensor.series.map(p => Number(p.reading));
        const top = Math.max(...values, Number(sensor.alert_threshold ?? 0)) * 1.1;
        const low = Math.min(...values) * 0.9;
        const alerts = sensors.filter(inAlert);
        const lowBattery = sensors.filter(s => s.battery_pct < 40);
        return (
          <div className="flex flex-col gap-4">
            <KpiRow>
              <Kpi title="EMBEDDED NODES" value={sensors.length} note={`On ${[...new Set(sensors.map(s => s.road_code))].join(', ')}`} />
              <Kpi title="ACTIVE ALERTS" value={alerts.length} tone="rose" note="Latest reading above threshold" />
              <Kpi title="LOW BATTERY" value={lowBattery.length} tone="amber" note="Below 40%" />
              <Kpi title="READINGS, 24 H" value={sensors.reduce((acc, s) => acc + s.series.length, 0)} tone="emerald" note="Stored in sensor_readings" />
            </KpiRow>
            <Card title="Underground cross-section" flush>
              <CrossSection sensors={sensors} selectedId={sensor.id} onSelect={setSelectedId} />
            </Card>
            <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
              <Card title={`${sensor.sensor_type} over the last 24 hours`} right={<Mono tone="cyan">{sensor.sensor_code}</Mono>}>
                <LineChart
                  label={`${sensor.sensor_type} readings for ${sensor.sensor_code}`}
                  points={values}
                  min={low}
                  max={top}
                  threshold={sensor.alert_threshold === null ? undefined : Number(sensor.alert_threshold)}
                  color="var(--signal-rose)"
                  xLabels={['24h ago', '18h', '12h', '6h', 'Now']}
                  height={280}
                />
                <p className="mt-2 text-xs text-[var(--fg-dim)]">Unit {sensor.unit}, chainage km {sensor.chainage_km}, depth {sensor.depth_mm} mm. Calibrated {shortDate(sensor.last_calibrated)}.</p>
              </Card>
              <Card title="Sensor registry" flush>
                <Table rows={sensors} rowKey={s => s.id} selected={sensor.id} onRowClick={s => setSelectedId(s.id)} columns={[
                  { head: 'NODE', cell: s => <Mono tone="cyan">{s.sensor_code}</Mono> },
                  { head: 'TYPE', cell: s => s.sensor_type },
                  { head: 'BATTERY', cell: s => <Mono tone={s.battery_pct < 40 ? 'amber' : undefined}>{s.battery_pct}%</Mono> },
                  { head: 'STATE', cell: s => <Badge tone={inAlert(s) ? 'rose' : s.battery_pct < 40 ? 'amber' : 'emerald'}>{inAlert(s) ? 'ALERT' : s.battery_pct < 40 ? 'LOW' : 'OK'}</Badge> },
                ]} />
              </Card>
            </div>
          </div>
        );
      }}
    </Loadable>
  );
}
