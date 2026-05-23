'use client';

import { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  MapPin,
  Radio,
  Cpu,
  Droplets,
  Gauge,
  Wrench,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Eye,
  type LucideProps
} from 'lucide-react';

import { roads } from '@/data/mockData';
import {
  generateSensorsForRoads,
  generateStressZones,
  SENSOR_COLORS,
  SENSOR_LEVEL_COLORS,
  type SensorReading,
  type SensorType,
  type SensorLevel
} from '@/data/sensorData';
import MapWrapper from '@/components/map/MapWrapper';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { useStore } from '@/store/useStore';

// ──────────────────────────────────────────────
// Helper icons and labels
// ──────────────────────────────────────────────
type LucideIcon = React.FC<LucideProps>;

const TYPE_ICONS: Record<SensorType, LucideIcon> = {
  vibration:        Radio,
  stress:           Gauge,
  drainage:         Droplets,
  traffic:          Activity,
  repair_integrity: Wrench
};

const TYPE_LABELS: Record<SensorType, string> = {
  vibration:        'Vibration',
  stress:           'Structural Stress',
  drainage:         'Drainage',
  traffic:          'Traffic Load',
  repair_integrity: 'Repair Integrity'
};

const LEVEL_LABELS: Record<SensorLevel, string> = {
  critical: 'Critical',
  elevated: 'Elevated',
  nominal:  'Nominal'
};

const TREND_ICON: Record<SensorReading['trend'], LucideIcon> = {
  rising:  TrendingUp,
  falling: TrendingDown,
  stable:  Minus
};

const TREND_COLOR: Record<SensorReading['trend'], string> = {
  rising:  'text-rose-400',
  falling: 'text-emerald-400',
  stable:  'text-slate-400'
};

function timeSince(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────
function StatPill({ label, count, level }: { label: string; count: number; level: SensorLevel }) {
  const colors: Record<SensorLevel, string> = {
    critical: 'bg-rose-950/60 border-rose-800/60 text-rose-400',
    elevated: 'bg-amber-950/60 border-amber-800/60 text-amber-400',
    nominal:  'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
  };
  const dots: Record<SensorLevel, string> = {
    critical: 'bg-rose-500 animate-pulse',
    elevated: 'bg-amber-500',
    nominal:  'bg-emerald-500'
  };
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${colors[level]}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${dots[level]}`} />
      <span className="text-[10px] uppercase font-black tracking-widest">{label}</span>
      <span className="ml-auto text-lg font-black tabular-nums">{count}</span>
    </div>
  );
}

function ValueBar({ value }: { value: number }) {
  const color = value >= 75 ? '#f43f5e' : value >= 45 ? '#f59e0b' : '#34d399';
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  );
}

function SensorCard({
  sensor,
  isSelected,
  onClick
}: {
  sensor: SensorReading;
  isSelected: boolean;
  onClick: () => void;
}) {
  const Icon = TYPE_ICONS[sensor.type];
  const TrendIcon = TREND_ICON[sensor.trend];
  const road = roads.find(r => r.id === sensor.roadId);
  const levelColor = SENSOR_LEVEL_COLORS[sensor.level];
  const typeColor = SENSOR_COLORS[sensor.type];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 group ${
        isSelected
          ? 'bg-zinc-900 border-zinc-600 shadow-lg'
          : 'bg-slate-950/60 border-border/50 hover:bg-slate-900/60 hover:border-border'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className="p-1.5 rounded-lg border"
            style={{ borderColor: `${typeColor}30`, backgroundColor: `${typeColor}12` }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: typeColor }} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-300 leading-none">
              {TYPE_LABELS[sensor.type]}
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5" />
              {road?.name ?? `Road #${sensor.roadId}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border"
            style={{
              color: levelColor,
              borderColor: `${levelColor}40`,
              backgroundColor: `${levelColor}10`
            }}
          >
            {LEVEL_LABELS[sensor.level]}
          </span>
          <div className={`flex items-center gap-0.5 ${TREND_COLOR[sensor.trend]}`}>
            <TrendIcon className="w-3 h-3" />
            <span className="text-[8px] font-semibold capitalize">{sensor.trend}</span>
          </div>
        </div>
      </div>

      {/* Value bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[9px]">
          <span className="text-muted-foreground">Reading</span>
          <span className="font-black text-slate-200">{sensor.value} {sensor.unit}</span>
        </div>
        <ValueBar value={sensor.value} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 text-[8px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Cpu className="w-2.5 h-2.5" />
          {sensor.depth}
        </span>
        <span>{timeSince(sensor.lastUpdated)}</span>
      </div>
    </button>
  );
}

function DetailPanel({ sensor, onClose }: { sensor: SensorReading; onClose: () => void }) {
  const Icon = TYPE_ICONS[sensor.type];
  const TrendIcon = TREND_ICON[sensor.trend];
  const road = roads.find(r => r.id === sensor.roadId);
  const levelColor = SENSOR_LEVEL_COLORS[sensor.level];
  const typeColor = SENSOR_COLORS[sensor.type];
  const zone = generateStressZones(roads as any).find(z => z.roadId === sensor.roadId);

  // Nearby sensors on same road
  const allSensors = generateSensorsForRoads(roads as any);
  const sameRoadSensors = allSensors.filter(
    s => s.roadId === sensor.roadId && s.id !== sensor.id
  );
  const critCount = sameRoadSensors.filter(s => s.level === 'critical').length;
  const elevCount = sameRoadSensors.filter(s => s.level === 'elevated').length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl border"
            style={{ borderColor: `${typeColor}40`, backgroundColor: `${typeColor}15` }}
          >
            <Icon className="w-5 h-5" style={{ color: typeColor }} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-100 leading-tight">{sensor.label}</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-cyan-500" />
              {road?.name ?? `Road #${sensor.roadId}`}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg border border-border hover:bg-slate-900 text-muted-foreground transition-all"
          aria-label="Close sensor detail"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Alert Level Banner */}
        <div
          className="p-3.5 rounded-xl border"
          style={{
            borderColor: `${levelColor}40`,
            backgroundColor: `${levelColor}10`
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: levelColor }}
            >
              {LEVEL_LABELS[sensor.level]} Alert
            </span>
            <span className="flex items-center gap-1 text-[8px] text-muted-foreground">
              <TrendIcon className={`w-3 h-3 ${TREND_COLOR[sensor.trend]}`} />
              <span className={`capitalize font-semibold ${TREND_COLOR[sensor.trend]}`}>{sensor.trend}</span>
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{sensor.description}</p>
        </div>

        {/* Reading Gauge */}
        <div className="glass-panel rounded-xl p-4 border border-border/60">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Current Reading</span>
            <span className="text-2xl font-black text-slate-100">
              {sensor.value}
              <span className="text-xs font-semibold text-muted-foreground ml-1">{sensor.unit}</span>
            </span>
          </div>
          <ValueBar value={sensor.value} />
          <div className="flex justify-between text-[9px] text-muted-foreground mt-1.5">
            <span>0 — Nominal threshold: 45</span>
            <span>Critical: 75+</span>
          </div>
        </div>

        {/* Technical Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Sensor Type', value: TYPE_LABELS[sensor.type] },
            { label: 'Deploy Depth', value: sensor.depth ?? '—' },
            { label: 'Trend', value: sensor.trend },
            { label: 'Last Update', value: timeSince(sensor.lastUpdated) },
            { label: 'Road Status', value: road?.status?.replace('_', ' ') ?? '—' },
            { label: 'Road Code', value: road?.roadCode ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-950/60 rounded-lg border border-border/40 p-2.5">
              <span className="block text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-1">{label}</span>
              <span className="text-[11px] font-bold text-slate-200 capitalize">{value}</span>
            </div>
          ))}
        </div>

        {/* Zone Context */}
        {zone && (
          <div className="rounded-xl border border-border/60 bg-slate-950/40 p-4 space-y-3">
            <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Infrastructure Stress Zone</h4>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Zone Stress Index</span>
              <span
                className="text-sm font-black"
                style={{ color: SENSOR_LEVEL_COLORS[zone.dominantAlert] }}
              >
                {zone.stressIndex}/100
              </span>
            </div>
            <ValueBar value={zone.stressIndex} />
            <div className="grid grid-cols-2 gap-2 text-[9px]">
              <span className="text-muted-foreground">
                Critical sensors nearby: <strong className="text-rose-400">{critCount}</strong>
              </span>
              <span className="text-muted-foreground">
                Elevated sensors: <strong className="text-amber-400">{elevCount}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Co-located sensors on same road */}
        {sameRoadSensors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Other Sensors — Same Segment</h4>
            {sameRoadSensors.slice(0, 4).map(s => {
              const SIcon = TYPE_ICONS[s.type];
              const sc = SENSOR_LEVEL_COLORS[s.level];
              return (
                <div key={s.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border/40 bg-slate-950/40">
                  <SIcon className="w-3.5 h-3.5 shrink-0" style={{ color: SENSOR_COLORS[s.type] }} />
                  <span className="flex-1 text-[10px] text-slate-300 font-semibold truncate">{TYPE_LABELS[s.type]}</span>
                  <span className="text-xs font-black" style={{ color: sc }}>{s.value}</span>
                  <span
                    className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                    style={{ color: sc, backgroundColor: `${sc}15`, border: `1px solid ${sc}30` }}
                  >
                    {s.level}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Dashboard
// ──────────────────────────────────────────────
const ALL_TYPES: SensorType[] = ['vibration', 'stress', 'drainage', 'traffic', 'repair_integrity'];
const ALL_LEVELS: SensorLevel[] = ['critical', 'elevated', 'nominal'];

export default function SensorDashboard() {
  const allSensors = useMemo(() => generateSensorsForRoads(roads as any), []);
  const stressZones = useMemo(() => generateStressZones(roads as any), []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<SensorType | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<SensorLevel | 'all'>('all');
  const [roadFilter, setRoadFilter] = useState<number | 'all'>('all');

  const criticalCount  = useMemo(() => allSensors.filter(s => s.level === 'critical').length,  [allSensors]);
  const elevatedCount  = useMemo(() => allSensors.filter(s => s.level === 'elevated').length,  [allSensors]);
  const nominalCount   = useMemo(() => allSensors.filter(s => s.level === 'nominal').length,   [allSensors]);

  const filteredSensors = useMemo(() => {
    return allSensors
      .filter(s =>
        (typeFilter  === 'all' || s.type    === typeFilter)  &&
        (levelFilter === 'all' || s.level   === levelFilter) &&
        (roadFilter  === 'all' || s.roadId  === roadFilter)
      )
      .sort((a, b) => {
        const order = { critical: 0, elevated: 1, nominal: 2 };
        return order[a.level] - order[b.level];
      });
  }, [allSensors, typeFilter, levelFilter, roadFilter]);

  const selectedSensor = allSensors.find(s => s.id === selectedId) ?? null;

  // Clear detail panel if it's filtered out
  const handleSelect = (id: string) => setSelectedId(prev => prev === id ? null : id);

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-0 min-h-0 overflow-hidden animate-in fade-in duration-300 relative lg:pointer-events-none">

      {/* ── LEFT PANEL: Filters + Sensor List ── */}
      <section className="w-full lg:w-[340px] lg:absolute lg:left-4 lg:top-4 lg:bottom-4 lg:z-10 flex flex-col glass-panel rounded-xl pointer-events-auto overflow-hidden">

        {/* Header */}
        <div className="p-4 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/40">
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-100 uppercase tracking-widest">Sensor Monitor</h2>
              <p className="text-[9px] text-muted-foreground">{allSensors.length} active feeds across {roads.length} segments</p>
            </div>
          </div>

          {/* Summary pills */}
          <div className="grid grid-cols-3 gap-1.5">
            <StatPill label="Critical" count={criticalCount}  level="critical" />
            <StatPill label="Elevated" count={elevatedCount}  level="elevated" />
            <StatPill label="Nominal"  count={nominalCount}   level="nominal"  />
          </div>
        </div>

        {/* Filters */}
        <div className="p-3 border-b border-border/40 shrink-0 space-y-2.5">
          {/* Sensor type filter */}
          <div>
            <label className="text-[9px] uppercase font-black text-muted-foreground tracking-wider mb-1.5 block flex items-center gap-1">
              <Filter className="w-2.5 h-2.5" /> Sensor Type
            </label>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setTypeFilter('all')}
                className={`text-[8px] font-black uppercase px-2 py-1 rounded border transition-all ${
                  typeFilter === 'all'
                    ? 'bg-zinc-100 border-zinc-100 text-zinc-950'
                    : 'bg-slate-900 border-border text-slate-400 hover:border-slate-600'
                }`}
              >
                All
              </button>
              {ALL_TYPES.map(t => {
                const Icon = TYPE_ICONS[t];
                const isActive = typeFilter === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(isActive ? 'all' : t)}
                    className={`text-[8px] font-black uppercase px-2 py-1 rounded border transition-all flex items-center gap-1 ${
                      isActive
                        ? 'text-slate-950 border-transparent'
                        : 'bg-slate-900 border-border text-slate-400 hover:border-slate-600'
                    }`}
                    style={isActive ? {
                      backgroundColor: SENSOR_COLORS[t],
                      borderColor: SENSOR_COLORS[t]
                    } : {}}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {TYPE_LABELS[t].split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alert level filter */}
          <div>
            <label className="text-[9px] uppercase font-black text-muted-foreground tracking-wider mb-1.5 block">Alert Level</label>
            <div className="flex gap-1">
              {(['all', ...ALL_LEVELS] as const).map(lv => (
                <button
                  key={lv}
                  onClick={() => setLevelFilter(lv as SensorLevel | 'all')}
                  className={`flex-1 text-[8px] font-black uppercase py-1 rounded border transition-all ${
                    levelFilter === lv
                      ? 'text-slate-950 bg-zinc-100 border-zinc-100'
                      : 'bg-slate-900 border-border text-slate-400 hover:border-slate-600'
                  }`}
                  style={levelFilter === lv && lv !== 'all' ? {
                    backgroundColor: SENSOR_LEVEL_COLORS[lv],
                    borderColor: SENSOR_LEVEL_COLORS[lv]
                  } : {}}
                >
                  {lv === 'all' ? 'All' : LEVEL_LABELS[lv]}
                </button>
              ))}
            </div>
          </div>

          {/* Road filter */}
          <div>
            <label className="text-[9px] uppercase font-black text-muted-foreground tracking-wider mb-1 block">Road Segment</label>
            <select
              value={roadFilter === 'all' ? 'all' : String(roadFilter)}
              onChange={e => setRoadFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full bg-slate-900 border border-border text-slate-200 text-[10px] py-1.5 px-2 rounded-lg focus:outline-none focus:border-cyan-500 transition-all"
            >
              <option value="all">All Segments ({roads.length})</option>
              {roads.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sensor list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="flex justify-between items-center text-[9px] text-muted-foreground uppercase tracking-wider font-bold px-0.5 pb-1">
            <span>Live Feeds</span>
            <span>{filteredSensors.length} showing</span>
          </div>

          {filteredSensors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Eye className="w-8 h-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-semibold text-muted-foreground">No sensors match filters</p>
            </div>
          ) : (
            filteredSensors.map(sensor => (
              <SensorCard
                key={sensor.id}
                sensor={sensor}
                isSelected={selectedId === sensor.id}
                onClick={() => handleSelect(sensor.id)}
              />
            ))
          )}
        </div>
      </section>

      {/* ── CENTER: Leaflet Map with sensor overlays ── */}
      <section className="w-full h-[400px] lg:h-auto lg:absolute lg:inset-0 lg:z-0 pointer-events-auto">
        <ErrorBoundary>
          <MapWrapper />
        </ErrorBoundary>
      </section>

      {/* ── RIGHT PANEL: Sensor Detail ── */}
      {selectedSensor ? (
        <section className="w-full lg:w-[360px] lg:absolute lg:right-4 lg:top-4 lg:bottom-4 lg:z-10 flex flex-col glass-panel rounded-xl overflow-hidden shadow-2xl pointer-events-auto animate-in slide-in-from-bottom lg:slide-in-from-right duration-250">
          <DetailPanel sensor={selectedSensor} onClose={() => setSelectedId(null)} />
        </section>
      ) : (
        /* Map Legend for sensor view */
        <div className="hidden lg:flex lg:absolute lg:right-4 lg:top-4 lg:z-10 pointer-events-auto">
          <div className="glass-panel rounded-xl border border-border/60 p-4 w-64 space-y-3">
            <h4 className="text-[10px] uppercase font-black text-slate-300 tracking-widest">Sensor Legend</h4>

            <div className="space-y-1.5">
              {ALL_LEVELS.map(lv => (
                <div key={lv} className="flex items-center gap-2 text-[10px]">
                  <div
                    className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: SENSOR_LEVEL_COLORS[lv], boxShadow: `0 0 6px ${SENSOR_LEVEL_COLORS[lv]}80` }}
                  />
                  <span className="text-slate-400 capitalize font-semibold">{LEVEL_LABELS[lv]}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border/40 pt-3 space-y-1.5">
              <p className="text-[9px] uppercase font-black text-slate-500 tracking-wider mb-1">Sensor Types</p>
              {ALL_TYPES.map(t => {
                const Icon = TYPE_ICONS[t];
                return (
                  <div key={t} className="flex items-center gap-2 text-[10px]">
                    <Icon className="w-3 h-3 shrink-0" style={{ color: SENSOR_COLORS[t] }} />
                    <span className="text-slate-400 font-semibold">{TYPE_LABELS[t]}</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border/40 pt-3">
              <p className="text-[9px] text-muted-foreground leading-relaxed">
                Select any sensor node on the map or from the list to view engineering diagnostics.
              </p>
            </div>

            {/* Stress zone summary */}
            <div className="border-t border-border/40 pt-3 space-y-2">
              <p className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Stress Zones</p>
              {stressZones.filter(z => z.dominantAlert !== 'nominal').slice(0, 4).map(z => {
                const road = roads.find(r => r.id === z.roadId);
                return (
                  <div key={z.roadId} className="flex items-center gap-2 text-[9px]">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: SENSOR_LEVEL_COLORS[z.dominantAlert] }}
                    />
                    <span className="text-slate-400 truncate">{road?.name ?? `Road #${z.roadId}`}</span>
                    <span className="ml-auto font-black" style={{ color: SENSOR_LEVEL_COLORS[z.dominantAlert] }}>
                      {z.stressIndex}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
