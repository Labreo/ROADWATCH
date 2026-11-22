'use client';

import React, { useState } from 'react';
import { CloudRain, Truck } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiPost, useLive } from '@/services/api';
import { Badge, Card, Kpi, KpiRow, Loadable, Mono, Table, money, num, shortDate } from './ui';

interface MonsoonCorridor {
  road_id: number;
  road_name: string;
  road_code: string;
  status: string;
  surface_type: string | null;
  length_km: number;
  authority: string;
  contractor: string | null;
  contractor_blacklisted: boolean | null;
  waterlogging_count: number;
  open_potholes: number;
  moisture_pct: number;
  daily_commuters: number;
  risk_score: number;
  risk_tier: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  predicted_flood_cm: number;
  stripping_probability_pct: number;
  projected_new_potholes_48h: number;
}

interface PreventiveDispatch {
  id: number;
  road_id: number;
  road_name: string;
  road_code: string;
  authority: string | null;
  rainfall_mm_hr: number;
  risk_score: number;
  predicted_flood_cm: number;
  action_type: string;
  crew_assigned: string;
  estimated_cost_inr: number;
  status: string;
  dispatched_by: string;
  dispatched_at: string;
}

interface MonsoonData {
  rainfall_mm_hr: number;
  alert_level: string;
  critical_corridors: number;
  commuters_at_risk: number;
  corridors: MonsoonCorridor[];
  dispatches: PreventiveDispatch[];
}

const tierTone = (tier: MonsoonCorridor['risk_tier']) =>
  tier === 'CRITICAL' ? 'rose' : tier === 'HIGH' ? 'amber' : tier === 'MODERATE' ? 'cyan' : 'emerald';

export default function MonsoonShieldScreen() {
  const region = useStore((s) => s.regionCode);
  const [rainfall, setRainfall] = useState<number>(95);
  const [committedRain, setCommittedRain] = useState<number>(95);
  const [dispatchingId, setDispatchingId] = useState<number | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const state = useLive<MonsoonData>(
    `/screens/monsoon-risk?rainfall_mm_hr=${committedRain}&region=${region}`
  );

  const handleDispatch = async (c: MonsoonCorridor) => {
    setDispatchingId(c.road_id);
    setBanner(null);
    try {
      const res = await apiPost<{ work_order_id: number; road_name: string }>(
        '/screens/monsoon-risk/dispatch',
        {
          road_id: c.road_id,
          rainfall_mm_hr: committedRain,
          action_type:
            c.predicted_flood_cm >= 20
              ? 'High-Volume Dewatering Pump + Storm Drain Desilting + Polymer Cold-Mix'
              : 'Pre-Monsoon Storm-Drain Desilting & Polymer Cold-Mix Patching',
          crew_assigned: `Ward ${c.authority} Monsoon Rapid Response Unit`,
        }
      );
      setBanner(
        `✓ Dispatched Preventive Work Order #PWO-${String(res.work_order_id).padStart(4, '0')} to ${res.road_name} (logged in PostgreSQL preventive_work_orders & audit_log).`
      );
      state.reload();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : 'Could not dispatch crew');
    } finally {
      setDispatchingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Interactive Rainfall Stress-Test Controller */}
      <section className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-4 lg:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CloudRain className="h-5 w-5 text-cyan-400" />
              <h1 className="text-lg font-bold text-white">
                MonsoonShield — Hydrological Submergence &amp; Sub-Base Stripping Predictor
              </h1>
            </div>
            <p className="max-w-3xl text-xs text-slate-300 leading-relaxed">
              Combines PostGIS waterlogging complaints, open pothole density, sub-base moisture telemetry (
              <code className="text-cyan-300">iot_sensors</code>), and surface type (asphalt vs. concrete) to predict
              monsoon water depth, asphalt stripping probability, and 48-hour pothole multiplication.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              [35, '35 mm/hr (Moderate)'],
              [75, '75 mm/hr (Heavy Monsoon)'],
              [125, '125 mm/hr (July 26 Cloudburst)'],
              [165, '165 mm/hr (Extreme Red Alert)'],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setRainfall(Number(val));
                  setCommittedRain(Number(val));
                }}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  committedRain === Number(val)
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                    : 'border-white/[0.1] bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-white/[0.08] bg-slate-950 px-4 py-3">
          <span className="font-mono text-xs font-bold text-cyan-300">
            SIMULATED RAINFALL INTENSITY: {rainfall} mm/hr
          </span>
          <input
            type="range"
            min={15}
            max={180}
            step={5}
            value={rainfall}
            onChange={(e) => setRainfall(Number(e.target.value))}
            onMouseUp={() => setCommittedRain(rainfall)}
            onTouchEnd={() => setCommittedRain(rainfall)}
            onKeyUp={() => setCommittedRain(rainfall)}
            className="flex-1 min-w-[200px] accent-cyan-400"
            aria-label="Simulated rainfall intensity in mm per hour"
          />
          <button
            type="button"
            onClick={() => setCommittedRain(rainfall)}
            className="rounded-md bg-cyan-400 px-3 py-1 text-xs font-bold text-slate-950 hover:bg-cyan-300 cursor-pointer"
          >
            Run Hydrological Model
          </button>
        </div>
      </section>

      {banner && (
        <div
          role="status"
          className="rounded-lg border border-emerald-400/40 bg-emerald-950/40 px-4 py-2.5 text-xs text-emerald-200 flex items-center justify-between"
        >
          <span>{banner}</span>
          <button onClick={() => setBanner(null)} className="text-emerald-300 underline">
            Dismiss
          </button>
        </div>
      )}

      <Loadable state={state}>
        {(data) => (
          <div className="flex flex-col gap-4">
            <KpiRow>
              <Kpi
                title="MONSOON ALERT LEVEL"
                value={`${data.rainfall_mm_hr} mm/hr`}
                tone={data.rainfall_mm_hr >= 110 ? 'rose' : data.rainfall_mm_hr >= 65 ? 'amber' : 'cyan'}
                note={data.alert_level}
              />
              <Kpi
                title="HIGH-RISK CORRIDORS"
                value={data.critical_corridors}
                tone="rose"
                note="Predicted sub-base stripping >= 55%"
              />
              <Kpi
                title="DAILY COMMUTERS AT RISK"
                value={num(data.commuters_at_risk)}
                tone="amber"
                note="From project_beneficiaries & AADT"
              />
              <Kpi
                title="PREVENTIVE CREWS DISPATCHED"
                value={data.dispatches.length}
                tone="emerald"
                note="Logged in preventive_work_orders"
              />
            </KpiRow>

            <Card
              title="Corridor Hydrological Submergence & Asphalt Stripping Forecast"
              flush
              right={<Badge tone="cyan">PostGIS + Sensor Fusion</Badge>}
            >
              <Table
                rows={data.corridors}
                rowKey={(r) => r.road_id}
                columns={[
                  {
                    head: 'CORRIDOR',
                    cell: (r) => (
                      <div>
                        <span className="font-semibold text-white">{r.road_name}</span>
                        <br />
                        <Mono tone="cyan">{r.road_code}</Mono> · <span className="text-xs text-slate-400">{r.surface_type || 'asphalt'}</span>
                      </div>
                    ),
                  },
                  { head: 'WARD', cell: (r) => <Mono>{r.authority}</Mono> },
                  {
                    head: 'DRAIN CHOKES / POTHOLES',
                    cell: (r) => (
                      <Mono>
                        {r.waterlogging_count} flood pts · {r.open_potholes} craters
                      </Mono>
                    ),
                  },
                  {
                    head: 'PREDICTED FLOOD DEPTH',
                    cell: (r) => (
                      <Mono tone={r.predicted_flood_cm >= 25 ? 'rose' : r.predicted_flood_cm >= 12 ? 'amber' : 'cyan'}>
                        {r.predicted_flood_cm} cm
                      </Mono>
                    ),
                  },
                  {
                    head: 'STRIPPING RISK',
                    cell: (r) => (
                      <div className="flex items-center gap-2">
                        <Badge tone={tierTone(r.risk_tier)}>
                          {r.risk_tier} · {r.risk_score}/100
                        </Badge>
                      </div>
                    ),
                  },
                  {
                    head: '48H NEW CRATERS',
                    cell: (r) => <Mono tone="rose">+{r.projected_new_potholes_48h} est.</Mono>,
                  },
                  {
                    head: 'PREVENTIVE ACTION',
                    cell: (r) => (
                      <button
                        type="button"
                        disabled={dispatchingId === r.road_id}
                        onClick={() => handleDispatch(r)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-cyan-400 px-2.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50 cursor-pointer"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        {dispatchingId === r.road_id ? 'Dispatching…' : 'Dispatch Crew'}
                      </button>
                    ),
                  },
                ]}
              />
            </Card>

            <Card
              title="Active Pre-Monsoon Preventive Work Orders (preventive_work_orders table)"
              flush
              right={<Mono>{data.dispatches.length} orders</Mono>}
            >
              <Table
                rows={data.dispatches}
                rowKey={(d) => d.id}
                empty="No preventive crews dispatched yet. Click 'Dispatch Crew' on any corridor above."
                columns={[
                  { head: 'ORDER ID', cell: (d) => <Mono tone="cyan">#PWO-{String(d.id).padStart(4, '0')}</Mono> },
                  { head: 'ROAD', cell: (d) => `${d.road_name} (${d.road_code})` },
                  { head: 'TRIGGER RAIN', cell: (d) => <Mono>{d.rainfall_mm_hr} mm/hr</Mono> },
                  { head: 'INTERVENTION', cell: (d) => d.action_type },
                  { head: 'CREW', cell: (d) => d.crew_assigned },
                  { head: 'EST. COST', cell: (d) => <Mono tone="amber">{money(d.estimated_cost_inr)}</Mono> },
                  { head: 'DISPATCHED', cell: (d) => <Mono>{shortDate(d.dispatched_at)}</Mono> },
                ]}
              />
            </Card>
          </div>
        )}
      </Loadable>
    </div>
  );
}
