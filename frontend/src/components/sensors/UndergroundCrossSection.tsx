'use client';

import React, { useMemo } from 'react';
import { generateSensorsForRoads, generateStressZones } from '@/data/sensorData';
import { roads } from '@/data/mockData';

// ── Layer definitions ──────────────────────────────────────

interface UtilityLayer {
  key:   string;
  label: string;
  color: string;
  depth: number; // fraction 0–1 top-to-bottom within view
  flowSpeed: string; // CSS animation duration
  isDrainage: boolean;
}

const UTILITY_LAYERS: UtilityLayer[] = [
  { key: 'asphalt',  label: 'Asphalt Surface', color: '#52525b', depth: 0.08, flowSpeed: '0s',   isDrainage: false },
  { key: 'base',     label: 'Granular Base',   color: '#78716c', depth: 0.22, flowSpeed: '0s',   isDrainage: false },
  { key: 'water',    label: 'Water Main',      color: '#38bdf8', depth: 0.38, flowSpeed: '1.4s', isDrainage: false },
  { key: 'electric', label: 'Elec. Conduit',   color: '#fbbf24', depth: 0.52, flowSpeed: '2.2s', isDrainage: false },
  { key: 'fiber',    label: 'Fiber Optic',     color: '#a78bfa', depth: 0.65, flowSpeed: '0.9s', isDrainage: false },
  { key: 'storm',    label: 'Storm Drain',     color: '#34d399', depth: 0.80, flowSpeed: '1.8s', isDrainage: true  },
  { key: 'soil',     label: 'Sub-soil',        color: '#92400e', depth: 0.93, flowSpeed: '0s',   isDrainage: false },
];

// Seeded value 0–1
function sv(seed: number, i: number): number {
  return ((seed * 31 + i * 17) % 97) / 97;
}

// ── Animated flow line for a pipe ─────────────────────────

interface PipeProps {
  x1: number; y: number; x2: number;
  color: string;
  flowSpeed: string;
  pipeH: number;
  saturation?: number; // 0–1 for drainage
  isDrainage: boolean;
}

function PipeLine({ x1, y, x2, color, flowSpeed, pipeH, saturation, isDrainage }: PipeProps) {
  const L = x2 - x1;
  const uniqueId = `pipe-${color.replace('#', '')}-${y.toFixed(0)}`;
  const hasFlow = flowSpeed !== '0s';

  return (
    <g>
      {/* Pipe outer shell */}
      <rect x={x1} y={y - pipeH / 2} width={L} height={pipeH} rx={pipeH / 2}
        fill={`${color}14`} stroke={`${color}55`} strokeWidth={0.75}
      />
      {/* Saturation fill for drainage */}
      {isDrainage && saturation !== undefined && (
        <rect
          x={x1 + 1} y={y - pipeH / 2 + 1}
          width={(L - 2) * saturation} height={pipeH - 2}
          rx={(pipeH - 2) / 2}
          fill={`${color}30`}
          className="animate-sat-rise"
        />
      )}
      {/* Flow animation particles */}
      {hasFlow && (
        <>
          <defs>
            <linearGradient id={`${uniqueId}-grad`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor={color} stopOpacity="0" />
              <stop offset="40%"  stopColor={color} stopOpacity="0.9" />
              <stop offset="60%"  stopColor={color} stopOpacity="0.9" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect
            x={x1} y={y - 1} width={L} height={2}
            fill={`url(#${uniqueId}-grad)`}
            style={{
              animation: `pipe-flow ${flowSpeed} linear infinite`,
            }}
          />
        </>
      )}
      {/* End caps */}
      <circle cx={x1}  cy={y} r={pipeH / 2} fill={`${color}22`} stroke={`${color}55`} strokeWidth={0.5} />
      <circle cx={x2}  cy={y} r={pipeH / 2} fill={`${color}22`} stroke={`${color}55`} strokeWidth={0.5} />
    </g>
  );
}

// ── Stress heatmap overlay ────────────────────────────────

interface StressHeatmapProps {
  stressIndex: number; // 0–100
  w: number;
  h: number;
}

function StressHeatmapOverlay({ stressIndex, w, h }: StressHeatmapProps) {
  const intensity = stressIndex / 100;
  const color = stressIndex >= 75 ? '#f43f5e' : stressIndex >= 45 ? '#f59e0b' : '#34d399';

  return (
    <rect
      x={0} y={0} width={w} height={h}
      fill={color}
      opacity={intensity * 0.07}
      rx={3}
    />
  );
}

// ── Vibration Wave Overlay ────────────────────────────────

function VibrationWave({ w, h, value }: { w: number; h: number; value: number }) {
  const amplitude = (value / 100) * 5;
  const pts: [number, number][] = [];
  for (let x = 0; x <= w; x += 4) {
    const t = (x / w) * Math.PI * 8;
    pts.push([x, h / 2 + Math.sin(t) * amplitude]);
  }
  const d = `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L')}`;

  return (
    <g>
      <path d={d} stroke="#f59e0b" strokeWidth={1} fill="none" opacity={0.22} />
      <path d={d} stroke="#f59e0b" strokeWidth={0.5} fill="none" opacity={0.45}
        style={{ animation: 'stress-wave 2s linear infinite', strokeDasharray: 60 }}
      />
    </g>
  );
}

// ── Depth ruler ──────────────────────────────────────────

function DepthRuler({ h, pipeH }: { h: number; pipeH: number }) {
  const DEPTHS = [
    { label: '0m',    frac: 0.08 },
    { label: '0.5m',  frac: 0.25 },
    { label: '1.0m',  frac: 0.45 },
    { label: '1.5m',  frac: 0.65 },
    { label: '2.0m',  frac: 0.82 },
    { label: '3.0m',  frac: 0.95 },
  ];
  return (
    <g>
      {DEPTHS.map(({ label, frac }) => (
        <g key={label}>
          <line x1={0} y1={h * frac} x2={6} y2={h * frac}
            stroke="rgba(255,255,255,0.12)" strokeWidth={0.5}
          />
          <text x={8} y={h * frac + 2} fill="rgba(255,255,255,0.2)"
            fontSize={5} fontFamily="monospace">
            {label}
          </text>
        </g>
      ))}
      {/* Ruler tick marks */}
      <line x1={3} y1={0} x2={3} y2={h}
        stroke="rgba(255,255,255,0.07)" strokeWidth={0.5}
      />
    </g>
  );
}

// ── Main Component ────────────────────────────────────────

interface UndergroundCrossSectionProps {
  roadId?: number; // optional — if omitted, uses averaged values
}

export default function UndergroundCrossSection({ roadId }: UndergroundCrossSectionProps) {
  const allSensors = useMemo(() => generateSensorsForRoads(roads as any), []);
  const stressZones = useMemo(() => generateStressZones(roads as any), []);

  const targetRoad = roads.find(r => r.id === roadId) ?? roads[0];
  const roadSensors = allSensors.filter(s => s.roadId === targetRoad.id);
  const zone = stressZones.find(z => z.roadId === targetRoad.id) ?? stressZones[0];

  const drainageSensor = roadSensors.find(s => s.type === 'drainage');
  const vibSensor      = roadSensors.find(s => s.type === 'vibration');
  const stressSensor   = roadSensors.find(s => s.type === 'stress');

  const saturation = drainageSensor ? drainageSensor.value / 100 : 0.4;
  const vibValue   = vibSensor      ? vibSensor.value      : 40;
  const stressVal  = stressSensor   ? stressSensor.value   : 50;

  const W = 280, H = 180;
  const pipeH = 9;
  const x1 = 28, x2 = W - 12;

  return (
    <div className="flex flex-col h-full overflow-hidden glass-command rounded-xl border border-white/[0.05]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.04] shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="mono-label text-[9px] tracking-[0.18em]">SUBSURFACE DIAGNOSTIC</span>
          <span
            className="text-[8px] font-black px-2 py-0.5 rounded border"
            style={{
              color: zone.dominantAlert === 'critical' ? '#f43f5e' : zone.dominantAlert === 'elevated' ? '#f59e0b' : '#34d399',
              borderColor: zone.dominantAlert === 'critical' ? '#f43f5e40' : zone.dominantAlert === 'elevated' ? '#f59e0b40' : '#34d39940',
              backgroundColor: zone.dominantAlert === 'critical' ? '#f43f5e10' : zone.dominantAlert === 'elevated' ? '#f59e0b10' : '#34d39910',
            }}
          >
            {zone.dominantAlert.toUpperCase()}
          </span>
        </div>
        <p className="text-[10px] font-bold text-slate-300 leading-tight truncate">{targetRoad.name}</p>
        <p className="text-[9px] text-muted-foreground">{targetRoad.roadCode} · Cross-Section View</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* SVG cross-section */}
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          className="w-full rounded-lg overflow-hidden"
          style={{ background: 'rgba(5,5,7,0.8)', border: '1px solid rgba(255,255,255,0.04)' }}
        >
          {/* Stress heatmap overlay */}
          <StressHeatmapOverlay stressIndex={zone.stressIndex} w={W} h={H} />

          {/* Depth ruler */}
          <DepthRuler h={H} pipeH={pipeH} />

          {/* Ground surface label */}
          <rect x={x1} y={2} width={x2 - x1} height={12} rx={2} fill="rgba(255,255,255,0.04)" />
          <text x={x1 + 4} y={11} fill="rgba(255,255,255,0.3)" fontSize={5.5} fontFamily="monospace" fontWeight="bold">
            ROAD SURFACE — {targetRoad.roadCode}
          </text>

          {/* Pipe layers */}
          {UTILITY_LAYERS.filter(l => l.flowSpeed !== '0s').map((layer) => (
            <PipeLine
              key={layer.key}
              x1={x1} x2={x2}
              y={H * layer.depth}
              color={layer.color}
              flowSpeed={layer.flowSpeed}
              pipeH={pipeH}
              saturation={layer.isDrainage ? saturation : undefined}
              isDrainage={layer.isDrainage}
            />
          ))}

          {/* Asphalt + base layer fills */}
          {UTILITY_LAYERS.filter(l => l.flowSpeed === '0s' && l.key !== 'soil').map(layer => (
            <rect
              key={layer.key}
              x={x1} y={H * layer.depth - 4}
              width={x2 - x1} height={8}
              rx={1}
              fill={`${layer.color}18`}
              stroke={`${layer.color}30`}
              strokeWidth={0.5}
            />
          ))}

          {/* Sub-soil bottom */}
          <rect
            x={x1} y={H * 0.89} width={x2 - x1} height={H * 0.1}
            rx={2}
            fill="rgba(146,64,14,0.12)"
            stroke="rgba(146,64,14,0.2)"
            strokeWidth={0.5}
          />
          <text x={x1 + 4} y={H * 0.895 + 6} fill="rgba(146,64,14,0.5)" fontSize={4.5} fontFamily="monospace">
            SUB-SOIL STRATUM
          </text>

          {/* Vibration wave overlay at surface */}
          <g transform={`translate(${x1}, 14)`}>
            <VibrationWave w={x2 - x1} h={16} value={vibValue} />
          </g>

          {/* Layer labels on right side */}
          {UTILITY_LAYERS.filter(l => l.key !== 'soil' && l.key !== 'asphalt' && l.key !== 'base').map(layer => (
            <text
              key={layer.key}
              x={x2 + 3} y={H * layer.depth + 2}
              fill={layer.color} fontSize={4.5}
              fontFamily="monospace" opacity={0.75}
            >
              {layer.label}
            </text>
          ))}

          {/* Stress crack indicators at surface */}
          {stressVal >= 45 && (
            <>
              {[0.25, 0.5, 0.75].map((frac, i) => (
                <g key={i}>
                  <line
                    x1={x1 + (x2 - x1) * frac} y1={14}
                    x2={x1 + (x2 - x1) * frac + (i % 2 === 0 ? 3 : -3)} y2={22}
                    stroke="#f43f5e" strokeWidth={0.75} opacity={stressVal / 150}
                    strokeDasharray="2 1"
                  />
                  <circle
                    cx={x1 + (x2 - x1) * frac} cy={14}
                    r={2} fill="#f43f5e" opacity={stressVal / 200}
                  >
                    <animate attributeName="opacity"
                      values={`${stressVal / 200};${stressVal / 100};${stressVal / 200}`}
                      dur="1.8s" repeatCount="indefinite"
                    />
                  </circle>
                </g>
              ))}
            </>
          )}
        </svg>

        {/* Layer legend */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {UTILITY_LAYERS.filter(l => l.key !== 'asphalt' && l.key !== 'base' && l.key !== 'soil').map(layer => (
            <div key={layer.key} className="flex items-center gap-2 text-[8px]">
              <div
                className="w-2.5 h-1.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: layer.color, opacity: 0.8 }}
              />
              <span className="text-slate-400 truncate">{layer.label}</span>
              {layer.isDrainage && (
                <span className="text-[7px] font-black ml-auto" style={{ color: layer.color }}>
                  {Math.round(saturation * 100)}%
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Sensor quick-read row */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'Stress Index', value: zone.stressIndex, color: '#f43f5e', unit: '/100' },
            { label: 'Drainage Sat.', value: Math.round(saturation * 100), color: '#38bdf8', unit: '%' },
            { label: 'Vibration', value: vibValue, color: '#f59e0b', unit: 'mm/s²' },
          ].map(({ label, value, color, unit }) => (
            <div key={label} className="p-2 rounded-lg border border-white/[0.04] bg-white/[0.02] text-center">
              <div className="mono-readout text-sm font-black" style={{ color }}>{value}</div>
              <div className="mono-label text-[6px] mt-0.5">{unit}</div>
              <div className="mono-label text-[6px] opacity-60 mt-0.5 truncate">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
