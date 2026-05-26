'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Activity, Radio, Gauge, Droplets, Wrench } from 'lucide-react';
import {
  generateSensorsForRoads,
  SENSOR_COLORS,
  SENSOR_LEVEL_COLORS,
  type SensorReading,
  type SensorType,
  type SensorLevel,
} from '@/data/sensorData';
import { roads } from '@/data/mockData';
import StressIndicator from '@/components/sensors/StressIndicator';

// ── Constants ──────────────────────────────────────────────

const TYPE_META: Record<SensorType, { label: string; shortLabel: string; icon: React.FC<{ className?: string; style?: React.CSSProperties }> }> = {
  vibration:        { label: 'Vibration',       shortLabel: 'VIB',  icon: Radio     },
  stress:           { label: 'Struct. Stress',  shortLabel: 'STR',  icon: Gauge     },
  drainage:         { label: 'Drainage',        shortLabel: 'DRN',  icon: Droplets  },
  traffic:          { label: 'Traffic Load',    shortLabel: 'TRF',  icon: Activity  },
  repair_integrity: { label: 'Repair Int.',     shortLabel: 'RPI',  icon: Wrench    },
};

const SENSOR_TYPES: SensorType[] = ['vibration', 'stress', 'drainage', 'traffic', 'repair_integrity'];

// Stable polar positions for sensor nodes around the radar circle
const NODE_ANGLES: Record<SensorType, number> = {
  vibration:        0,
  stress:           72,
  drainage:         144,
  traffic:          216,
  repair_integrity: 288,
};

// ── Helpers ────────────────────────────────────────────────

function polarToXY(angleDeg: number, r: number, cx: number, cy: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function avgValueForType(sensors: SensorReading[], type: SensorType): number {
  const filtered = sensors.filter(s => s.type === type);
  if (!filtered.length) return 0;
  return Math.round(filtered.reduce((a, b) => a + b.value, 0) / filtered.length);
}

function dominantLevel(sensors: SensorReading[], type: SensorType): SensorLevel {
  const filtered = sensors.filter(s => s.type === type);
  if (filtered.some(s => s.level === 'critical'))  return 'critical';
  if (filtered.some(s => s.level === 'elevated'))  return 'elevated';
  return 'nominal';
}

// ── Radar Canvas ──────────────────────────────────────────

interface RadarProps {
  sensors: SensorReading[];
}

function SensorRadar({ sensors }: RadarProps) {
  const sweepRef = useRef<SVGLineElement>(null);
  const animRef  = useRef<number>(0);
  const angleRef = useRef(0);

  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      angleRef.current = (angleRef.current + dt * 0.06) % 360; // ~1 RPM
      if (sweepRef.current) {
        sweepRef.current.setAttribute('transform', `rotate(${angleRef.current}, 80, 80)`);
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const cx = 80, cy = 80, R = 66;

  return (
    <svg width={160} height={160} viewBox="0 0 160 160" className="block">
      <defs>
        {/* Radar sweep gradient */}
        <linearGradient id="sweep-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#22d3ee" stopOpacity="0" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id="radar-bg" cx="50%" cy="50%">
          <stop offset="0%"   stopColor="#0d1f2d" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#050507" stopOpacity="0.98" />
        </radialGradient>
        <clipPath id="radar-clip">
          <circle cx={cx} cy={cy} r={R} />
        </clipPath>
      </defs>

      {/* Background */}
      <circle cx={cx} cy={cy} r={R} fill="url(#radar-bg)" />

      {/* Concentric range rings */}
      {[0.33, 0.66, 1].map((scale, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={R * scale}
          fill="none"
          stroke="rgba(34,211,238,0.08)"
          strokeWidth={0.75}
        />
      ))}

      {/* Cross-hair lines */}
      <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke="rgba(34,211,238,0.06)" strokeWidth={0.5} />
      <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke="rgba(34,211,238,0.06)" strokeWidth={0.5} />

      {/* Sensor spoke lines */}
      {SENSOR_TYPES.map(type => {
        const angle = NODE_ANGLES[type];
        const end = polarToXY(angle, R, cx, cy);
        return (
          <line
            key={type}
            x1={cx} y1={cy} x2={end.x} y2={end.y}
            stroke={`${SENSOR_COLORS[type]}22`}
            strokeWidth={0.75}
            strokeDasharray="3 3"
          />
        );
      })}

      {/* Radar sweep wedge */}
      <g clipPath="url(#radar-clip)">
        {/* Trailing glow wedge — rendered as a wide line from center */}
        <line
          ref={sweepRef}
          x1={cx} y1={cy} x2={cx} y2={cy - R}
          stroke="url(#sweep-grad)"
          strokeWidth={R * 2}
          strokeLinecap="butt"
          opacity={0.18}
        />
        {/* Sharp leading edge */}
        <line
          ref={sweepRef as React.RefObject<SVGLineElement>}
          x1={cx} y1={cy} x2={cx} y2={cy - R}
          stroke="#22d3ee"
          strokeWidth={1.2}
          opacity={0.65}
        />
      </g>

      {/* Sensor nodes */}
      {SENSOR_TYPES.map(type => {
        const angle = NODE_ANGLES[type];
        const avg   = avgValueForType(sensors, type);
        const level = dominantLevel(sensors, type);
        const pos   = polarToXY(angle, R * 0.72, cx, cy);
        const color = SENSOR_LEVEL_COLORS[level];

        return (
          <g key={type}>
            {/* Ping ring (SVG animation) */}
            <circle cx={pos.x} cy={pos.y} r={4} fill="none" stroke={color} strokeWidth={0.75} opacity={0.5}>
              <animate attributeName="r"       from="4"   to="13"  dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.5" to="0"   dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Core node dot */}
            <circle cx={pos.x} cy={pos.y} r={4} fill={color} opacity={0.9}>
              <animate attributeName="r" values="3.5;4.5;3.5" dur="2.4s" repeatCount="indefinite" />
            </circle>
            {/* Value label */}
            <text
              x={pos.x} y={pos.y + 13}
              textAnchor="middle"
              fill={color}
              fontSize={5.5}
              fontFamily="'SF Mono', monospace"
              fontWeight="bold"
              opacity={0.85}
            >
              {avg}
            </text>
          </g>
        );
      })}

      {/* Center badge */}
      <circle cx={cx} cy={cy} r={10} fill="rgba(34,211,238,0.07)" stroke="rgba(34,211,238,0.25)" strokeWidth={0.75} />
      <text x={cx} y={cy + 4} textAnchor="middle" fill="#22d3ee" fontSize={6} fontFamily="monospace" fontWeight="bold">NET</text>
    </svg>
  );
}

// ── KPI Tile ─────────────────────────────────────────────

function KPITile({ type, sensors }: { type: SensorType; sensors: SensorReading[] }) {
  const Icon  = TYPE_META[type].icon;
  const avg   = avgValueForType(sensors, type);
  const level = dominantLevel(sensors, type);
  const color = SENSOR_COLORS[type];
  const lvlColor = SENSOR_LEVEL_COLORS[level];

  return (
    <div
      className="flex flex-col gap-1 p-2.5 rounded-xl border transition-all duration-200 hover:scale-[1.02] cursor-default"
      style={{ borderColor: `${color}25`, backgroundColor: `${color}08` }}
    >
      <div className="flex items-center justify-between">
        <Icon className="w-3 h-3" style={{ color }} />
        <span
          className="text-[7px] font-black uppercase px-1 py-0.5 rounded"
          style={{ color: lvlColor, backgroundColor: `${lvlColor}15`, border: `1px solid ${lvlColor}30` }}
        >
          {level.slice(0, 3).toUpperCase()}
        </span>
      </div>
      <div className="mono-readout text-sm font-black leading-none" style={{ color }}>{avg}</div>
      <div className="mono-label text-[7px] truncate">{TYPE_META[type].shortLabel}</div>
      {/* Mini bar */}
      <div className="h-0.5 rounded-full bg-white/5 overflow-hidden mt-0.5">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${avg}%`, background: color, opacity: 0.7 }}
        />
      </div>
    </div>
  );
}

// ── Network Health Bar ───────────────────────────────────

function NetworkHealthBar({ sensors }: { sensors: SensorReading[] }) {
  const crit = sensors.filter(s => s.level === 'critical').length;
  const elev = sensors.filter(s => s.level === 'elevated').length;
  const nom  = sensors.filter(s => s.level === 'nominal').length;
  const total = sensors.length || 1;
  const critPct = (crit / total) * 100;
  const elevPct = (elev / total) * 100;
  const nomPct  = (nom  / total) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="mono-label text-[8px]">NETWORK HEALTH</span>
        <span className="mono-readout text-[9px]">{total} NODES</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden flex bg-white/[0.04]">
        <div className="h-full transition-all duration-700" style={{ width: `${critPct}%`, background: '#f43f5e' }} />
        <div className="h-full transition-all duration-700" style={{ width: `${elevPct}%`, background: '#f59e0b' }} />
        <div className="h-full transition-all duration-700" style={{ width: `${nomPct}%`,  background: '#34d399' }} />
      </div>
      <div className="flex justify-between text-[8px]">
        <span className="text-rose-400 font-black">{crit} CRIT</span>
        <span className="text-amber-400 font-black">{elev} ELEV</span>
        <span className="text-emerald-400 font-black">{nom} NOM</span>
      </div>
    </div>
  );
}

// ── Live Telemetry Ticker ─────────────────────────────────

function TelemetryTicker({ sensors }: { sensors: SensorReading[] }) {
  // Show a rolling feed of the most critical sensors
  const urgent = [...sensors]
    .sort((a, b) => {
      const o = { critical: 0, elevated: 1, nominal: 2 };
      return o[a.level] - o[b.level];
    })
    .slice(0, 12);

  return (
    <div className="relative overflow-hidden h-6 flex items-center">
      <div className="flex gap-6 animate-[telemetry-scroll_22s_linear_infinite] whitespace-nowrap">
        {[...urgent, ...urgent].map((s, i) => {
          const color = SENSOR_LEVEL_COLORS[s.level];
          return (
            <span key={i} className="inline-flex items-center gap-1.5 text-[8px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
              <span className="font-black uppercase" style={{ color }}>
                {s.type.split('_')[0].slice(0, 3).toUpperCase()}
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">{s.value}</span>
              <span className="text-slate-600 text-[7px]">{s.unit}</span>
            </span>
          );
        })}
      </div>
      {/* Fade masks */}
      <div className="absolute left-0 inset-y-0 w-8 bg-gradient-to-r from-[#050507] to-transparent pointer-events-none" />
      <div className="absolute right-0 inset-y-0 w-8 bg-gradient-to-l from-[#050507] to-transparent pointer-events-none" />
    </div>
  );
}

// ── Waveform Strip ────────────────────────────────────────

function WaveformStrip({ sensor }: { sensor: SensorReading }) {
  return (
    <div className="flex items-center gap-2">
      <span className="mono-label text-[7px] w-6 text-right flex-shrink-0" style={{ color: SENSOR_COLORS[sensor.type] }}>
        {TYPE_META[sensor.type].shortLabel}
      </span>
      <StressIndicator
        value={sensor.value}
        level={sensor.level}
        width={130}
        height={14}
        showLabel={false}
        animated={true}
      />
      <span className="mono-readout text-[8px] flex-shrink-0">{sensor.value}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────

export default function SensorNetworkHUD() {
  const sensors = useMemo(() => generateSensorsForRoads(roads as any), []);

  // One representative sensor per type for the waveform strip
  const perType: SensorReading[] = useMemo(() =>
    SENSOR_TYPES.map(t => {
      const matches = sensors.filter(s => s.type === t);
      // Pick the most critical one
      return matches.sort((a, b) => {
        const o = { critical: 0, elevated: 1, nominal: 2 };
        return o[a.level] - o[b.level];
      })[0];
    }).filter(Boolean),
  [sensors]);

  return (
    <div className="flex flex-col h-full overflow-hidden glass-command rounded-xl border border-white/[0.05]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.04] shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="status-beacon live" />
          <span className="mono-label text-[9px] tracking-[0.18em]">SENSOR NETWORK // LIVE</span>
        </div>
        <span className="mono-readout text-[8px]">{sensors.length} FEEDS</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Radar + KPI grid */}
        <div className="flex gap-3 items-start">
          <div className="flex-shrink-0">
            <SensorRadar sensors={sensors} />
          </div>
          <div className="flex-1 grid grid-cols-2 gap-1.5 min-w-0">
            {SENSOR_TYPES.map(t => (
              <KPITile key={t} type={t} sensors={sensors} />
            ))}
          </div>
        </div>

        {/* Network health */}
        <NetworkHealthBar sensors={sensors} />

        {/* Live waveform feeds */}
        <div className="space-y-2">
          <div className="mono-label text-[9px]">OSCILLOSCOPE FEEDS</div>
          <div className="space-y-1.5 telemetry-grid p-2 rounded-lg border border-white/[0.03]">
            {perType.map(s => (
              <WaveformStrip key={s.id} sensor={s} />
            ))}
          </div>
        </div>

        {/* Live telemetry ticker */}
        <div className="space-y-1.5">
          <div className="mono-label text-[9px]">LIVE TELEMETRY STREAM</div>
          <div className="border border-white/[0.04] rounded-lg px-2 py-1 bg-black/30">
            <TelemetryTicker sensors={sensors} />
          </div>
        </div>
      </div>
    </div>
  );
}
