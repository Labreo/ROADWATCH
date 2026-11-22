'use client';

import React, { useState } from 'react';
import { Navigation, Ambulance, Bike, Car } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useLive } from '@/services/api';
import { Badge, Card, Kpi, KpiRow, Loadable, Mono, Table } from './ui';

interface CorridorScore {
  id: number;
  name: string;
  road_code: string;
  status: string;
  length_km: number;
  surface_type: string | null;
  lane_count: number | null;
  authority: string;
  active_hazards: number;
  bump_shocks: number;
  peak_shock_ms2: number;
  stability_score: number;
  est_travel_min: number;
  recommendation: string;
}

interface SafeCorridorData {
  vehicle_type: string;
  recommended_safe_corridor: CorridorScore | null;
  high_hazard_direct_corridor: CorridorScore | null;
  peak_shock_reduction_ms2: number;
  hazards_avoided: number;
  all_corridors: CorridorScore[];
}

export default function SafeCorridorScreen() {
  const region = useStore((s) => s.regionCode);
  const [vehicle, setVehicle] = useState<'ambulance' | 'two_wheeler' | 'commuter'>('ambulance');
  const state = useLive<SafeCorridorData>(
    `/screens/safe-corridor?vehicle_type=${vehicle}&region=${region}`
  );

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-4 lg:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-emerald-400" />
              <h1 className="text-lg font-bold text-white">
                SafeCorridor — Emergency Ambulance &amp; Two-Wheeler Shock-Minimizing PostGIS Router
              </h1>
            </div>
            <p className="max-w-3xl text-xs text-slate-300 leading-relaxed">
              Standard navigation apps only optimize for distance. <strong>SafeCorridor</strong> queries live PostGIS{' '}
              <code className="text-cyan-300">complaints</code> and <code className="text-cyan-300">ride_bumps</code>{' '}
              accelerometer shock clusters (<code className="text-cyan-300">ST_DWithin</code>) to route emergency
              ambulances and two-wheelers away from spinal-shock craters and waterlogged depressions.
            </p>
          </div>

          <div className="flex gap-2">
            {(
              [
                ['ambulance', 'Emergency Ambulance (Patient Trauma)', Ambulance],
                ['two_wheeler', 'Two-Wheeler (Anti-Skid Mode)', Bike],
                ['commuter', 'Daily Car / Bus Convoy', Car],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setVehicle(key)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  vehicle === key
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                    : 'border-white/[0.1] bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <Loadable state={state}>
        {(data) => {
          const safe = data.recommended_safe_corridor;
          const direct = data.high_hazard_direct_corridor;
          return (
            <div className="flex flex-col gap-4">
              <KpiRow>
                <Kpi
                  title="RECOMMENDED SAFE CORRIDOR"
                  value={safe ? safe.road_code : '—'}
                  tone="emerald"
                  note={safe ? `${safe.name} (Stability ${safe.stability_score}/100)` : ''}
                />
                <Kpi
                  title="HIGH-HAZARD ROUTE TO AVOID"
                  value={direct ? direct.road_code : '—'}
                  tone="rose"
                  note={direct ? `${direct.name} (${direct.active_hazards} open craters)` : ''}
                />
                <Kpi
                  title="PEAK SHOCK REDUCTION"
                  value={`-${data.peak_shock_reduction_ms2} m/s²`}
                  tone="cyan"
                  note="Vertical G-shock saved"
                />
                <Kpi
                  title="OPEN CRATERS AVOIDED"
                  value={data.hazards_avoided}
                  tone="amber"
                  note="Active PostGIS defect pins bypassed"
                />
              </KpiRow>

              {/* Side-by-Side Route Comparison Visual Cards */}
              {safe && direct && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge tone="emerald">RECOMMENDED SHOCK-FREE CORRIDOR</Badge>
                      <Mono tone="emerald">Stability Score: {safe.stability_score} / 100</Mono>
                    </div>
                    <h2 className="text-base font-bold text-white">
                      {safe.name} ({safe.road_code})
                    </h2>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-slate-950/80 p-2.5">
                        <span className="block text-[10px] text-slate-400">OPEN POTHOLES</span>
                        <span className="font-mono text-sm font-bold text-emerald-300">
                          {safe.active_hazards} hazards
                        </span>
                      </div>
                      <div className="rounded-lg bg-slate-950/80 p-2.5">
                        <span className="block text-[10px] text-slate-400">PEAK VERTICAL SHOCK</span>
                        <span className="font-mono text-sm font-bold text-emerald-300">
                          {safe.peak_shock_ms2} m/s²
                        </span>
                      </div>
                      <div className="rounded-lg bg-slate-950/80 p-2.5">
                        <span className="block text-[10px] text-slate-400">SURFACE &amp; ETA</span>
                        <span className="font-mono text-sm font-bold text-slate-200">
                          {safe.surface_type || 'Concrete'} · {safe.est_travel_min}m
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge tone="rose">STANDARD DIRECT ROUTE (HIGH CRATER RISK)</Badge>
                      <Mono tone="rose">Stability Score: {direct.stability_score} / 100</Mono>
                    </div>
                    <h2 className="text-base font-bold text-white">
                      {direct.name} ({direct.road_code})
                    </h2>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-slate-950/80 p-2.5">
                        <span className="block text-[10px] text-slate-400">OPEN POTHOLES</span>
                        <span className="font-mono text-sm font-bold text-rose-300">
                          {direct.active_hazards} hazards
                        </span>
                      </div>
                      <div className="rounded-lg bg-slate-950/80 p-2.5">
                        <span className="block text-[10px] text-slate-400">PEAK VERTICAL SHOCK</span>
                        <span className="font-mono text-sm font-bold text-rose-300">
                          {direct.peak_shock_ms2} m/s²
                        </span>
                      </div>
                      <div className="rounded-lg bg-slate-950/80 p-2.5">
                        <span className="block text-[10px] text-slate-400">SURFACE &amp; ETA</span>
                        <span className="font-mono text-sm font-bold text-slate-200">
                          {direct.surface_type || 'Asphalt'} · {direct.est_travel_min}m
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Card title="All Arterial Corridors Ranked by Ride Stability & Patient Safety Index" flush>
                <Table
                  rows={data.all_corridors}
                  rowKey={(r) => r.id}
                  columns={[
                    {
                      head: 'CORRIDOR',
                      cell: (r) => (
                        <div>
                          <span className="font-semibold text-white">{r.name}</span>
                          <br />
                          <Mono tone="cyan">{r.road_code}</Mono> · {r.length_km} km
                        </div>
                      ),
                    },
                    { head: 'SURFACE', cell: (r) => r.surface_type || 'asphalt' },
                    { head: 'ACTIVE HAZARDS', cell: (r) => <Mono tone={r.active_hazards > 3 ? 'rose' : 'emerald'}>{r.active_hazards}</Mono> },
                    { head: 'BUMP RADAR HITS', cell: (r) => <Mono>{r.bump_shocks}</Mono> },
                    { head: 'PEAK SHOCK', cell: (r) => <Mono tone={r.peak_shock_ms2 >= 10 ? 'rose' : 'cyan'}>{r.peak_shock_ms2} m/s²</Mono> },
                    {
                      head: 'STABILITY SCORE',
                      cell: (r) => (
                        <Mono tone={r.stability_score >= 78 ? 'emerald' : r.stability_score >= 55 ? 'amber' : 'rose'}>
                          {r.stability_score} / 100
                        </Mono>
                      ),
                    },
                    {
                      head: 'ROUTING VERDICT',
                      cell: (r) => (
                        <Badge tone={r.stability_score >= 78 ? 'emerald' : r.stability_score >= 55 ? 'amber' : 'rose'}>
                          {r.recommendation}
                        </Badge>
                      ),
                    },
                  ]}
                />
              </Card>
            </div>
          );
        }}
      </Loadable>
    </div>
  );
}
