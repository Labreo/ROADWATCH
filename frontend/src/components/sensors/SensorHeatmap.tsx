'use client';

import React, { useMemo } from 'react';
import {
  generateSensorsForRoads,
  SENSOR_COLORS,
  SENSOR_LEVEL_COLORS,
  type SensorType,
  type SensorLevel,
} from '@/data/sensorData';
import { roads } from '@/data/mockData';

const SENSOR_TYPES: SensorType[] = ['vibration', 'stress', 'drainage', 'traffic', 'repair_integrity'];
const SHORT_LABELS: Record<SensorType, string> = {
  vibration:        'VIB',
  stress:           'STR',
  drainage:         'DRN',
  traffic:          'TRF',
  repair_integrity: 'RPI',
};

function seededSparkline(roadId: number, type: SensorType, baseValue: number, points = 28): number[] {
  const seed = roadId * 7 + type.length * 3;
  return Array.from({ length: points }, (_, i) => {
    const noise = ((seed * i * 13 + i * 31) % 97) / 97 * 22 - 11;
    return Math.min(100, Math.max(0, baseValue + noise));
  });
}

// ── Sparkline ────────────────────────────────────────────

interface SparklineProps {
  values: number[];
  color: string;
  w?: number;
  h?: number;
}

export function Sparkline({ values, color, w = 80, h = 22 }: SparklineProps) {
  const max = Math.max(...values, 1);
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - (v / 100) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' L');

  const fillPath = `M0,${h} L${pts.replace('M', '')} L${w},${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`spark-fill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={`M${pts}`} stroke={color} strokeWidth={1.2} fill="none" strokeLinecap="round" strokeOpacity={0.9} />
      <path d={`M0,${h} L${pts} L${w},${h} Z`} fill={`url(#spark-fill-${color.replace('#', '')})`} />
      {/* Last point dot */}
      <circle
        cx={(values.length - 1) / (values.length - 1) * w}
        cy={h - (values[values.length - 1] / 100) * h}
        r={2.5}
        fill={color}
        opacity={0.9}
      />
    </svg>
  );
}

// ── Heatmap Cell ─────────────────────────────────────────

interface HeatmapCellProps {
  value: number;
  level: SensorLevel;
  type: SensorType;
  roadName: string;
  isSelected: boolean;
  onClick: () => void;
}

function HeatmapCell({ value, level, type, roadName, isSelected, onClick }: HeatmapCellProps) {
  const color = SENSOR_LEVEL_COLORS[level];
  const typeColor = SENSOR_COLORS[type];

  return (
    <button
      onClick={onClick}
      title={`${roadName} · ${SHORT_LABELS[type]}: ${value}`}
      className={`sensor-heatmap-cell relative aspect-square rounded-md border flex items-center justify-center transition-all ${
        isSelected ? 'ring-1 ring-cyan-400/60 z-10' : ''
      }`}
      style={{
        backgroundColor: `${color}${Math.round(10 + (value / 100) * 35).toString(16).padStart(2, '0')}`,
        borderColor: `${color}30`,
        boxShadow: isSelected ? `0 0 8px ${color}40` : undefined,
      }}
    >
      {/* Level beacon dot */}
      {level !== 'nominal' && (
        <span
          className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 3px ${color}` }}
        />
      )}
      <span className="mono-label text-[6px]" style={{ color: `${color}cc` }}>
        {value}
      </span>
    </button>
  );
}

// ── Main Heatmap Grid ─────────────────────────────────────

interface SensorHeatmapProps {
  onCellClick?: (roadId: number, type: SensorType) => void;
  selectedRoadId?: number | null;
}

export default function SensorHeatmap({ onCellClick, selectedRoadId }: SensorHeatmapProps) {
  const allSensors = useMemo(() => generateSensorsForRoads(roads as any), []);

  // Build a Map: roadId → { type → first sensor }
  const sensorMatrix = useMemo(() => {
    const m = new Map<number, Map<SensorType, { value: number; level: SensorLevel }>>();
    allSensors.forEach(s => {
      if (!m.has(s.roadId)) m.set(s.roadId, new Map());
      const inner = m.get(s.roadId)!;
      if (!inner.has(s.type)) {
        inner.set(s.type, { value: s.value, level: s.level });
      }
    });
    return m;
  }, [allSensors]);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Column headers */}
      <div className="flex items-center gap-1 pl-[72px]">
        {SENSOR_TYPES.map(t => (
          <div key={t} className="flex-1 text-center">
            <span
              className="mono-label text-[7px]"
              style={{ color: SENSOR_COLORS[t] }}
            >
              {SHORT_LABELS[t]}
            </span>
          </div>
        ))}
      </div>

      {/* Rows */}
      {roads.map(road => {
        const row = sensorMatrix.get(road.id);
        const isSelected = selectedRoadId === road.id;

        return (
          <div key={road.id} className={`flex items-center gap-1 ${isSelected ? 'opacity-100' : 'opacity-80 hover:opacity-100'} transition-opacity`}>
            {/* Road label */}
            <div className="w-[72px] flex-shrink-0 pr-2">
              <div className={`text-[8px] font-bold truncate ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`}>
                {road.roadCode}
              </div>
              <div className="text-[7px] text-slate-600 truncate">{road.name.split(' ')[0]}</div>
            </div>

            {/* Cells */}
            {SENSOR_TYPES.map(type => {
              const cell = row?.get(type) ?? { value: 0, level: 'nominal' as SensorLevel };
              return (
                <div key={type} className="flex-1">
                  <HeatmapCell
                    value={cell.value}
                    level={cell.level}
                    type={type}
                    roadName={road.name}
                    isSelected={isSelected}
                    onClick={() => onCellClick?.(road.id, type)}
                  />
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Gradient legend */}
      <div className="flex items-center gap-3 pt-1 border-t border-white/[0.04]">
        <span className="mono-label text-[7px]">LOW</span>
        <div className="flex-1 h-1 rounded-full"
          style={{ background: 'linear-gradient(to right, #34d39940, #f59e0b60, #f43f5e80)' }}
        />
        <span className="mono-label text-[7px]">HIGH</span>
      </div>
    </div>
  );
}

// ── Telemetry Sparkline Panel ─────────────────────────────

interface TelemetrySparklineProps {
  roadId: number;
  sensorType: SensorType;
  baseValue: number;
}

export function TelemetrySparklinePanel({ roadId, sensorType, baseValue }: TelemetrySparklineProps) {
  const values = useMemo(() => seededSparkline(roadId, sensorType, baseValue), [roadId, sensorType, baseValue]);
  const color = SENSOR_COLORS[sensorType];
  const latest = values[values.length - 1];
  const prev   = values[values.length - 2];
  const delta  = latest - prev;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="mono-label text-[9px]">30-POINT TELEMETRY HISTORY</span>
        <div className="flex items-center gap-1">
          <span
            className="text-[8px] font-black"
            style={{ color: delta >= 0 ? '#f43f5e' : '#34d399' }}
          >
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(0)}
          </span>
          <span className="mono-readout text-[9px]">{latest.toFixed(0)}</span>
        </div>
      </div>
      <div className="relative telemetry-grid rounded-lg p-2 border border-white/[0.04]">
        <Sparkline values={values} color={color} w={240} h={36} />
        {/* Threshold line */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: `${(45 / 100) * 36 + 8}px`,
            left: 8, right: 8,
            borderTop: '1px dashed rgba(245,158,11,0.2)',
          }}
        />
      </div>
      <div className="flex justify-between text-[7px] text-slate-600 font-mono">
        <span>−30 readings</span>
        <span>NOW</span>
      </div>
    </div>
  );
}
