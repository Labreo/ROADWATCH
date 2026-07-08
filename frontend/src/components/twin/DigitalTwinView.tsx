'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  Activity, Cpu, Radio, Layers, AlertTriangle,
  MapPin, TrendingUp, TrendingDown, Minus, ChevronRight,
  Wifi, Shield, Clock, Zap, Database
} from 'lucide-react';
import { roads, projects, contractors } from '@/data/mockData';
import { generateSensorsForRoads, generateStressZones, SENSOR_LEVEL_COLORS } from '@/data/sensorData';
import StressIndicator from '@/components/sensors/StressIndicator';
import RoadInspectionScene from '@/components/3d/RoadInspectionScene';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@/services/regionAwareFormat';

// ── Types
type Road = typeof roads[0];

// ── Deterministic underground cross-section per road
const UTILITY_TYPES = [
  { key: 'water',    label: 'Water Main',         color: '#38bdf8', depth: '0.9m' },
  { key: 'electric', label: 'Electrical Conduit', color: '#fbbf24', depth: '1.1m' },
  { key: 'fiber',    label: 'Fiber Optic',         color: '#a78bfa', depth: '1.4m' },
  { key: 'storm',    label: 'Storm Drain',         color: '#34d399', depth: '1.8m' },
];

// Seeded 0-1 value
function seeded(id: number, i: number): number {
  return ((id * 31 + i * 17) % 97) / 97;
}

// Mission clock
function useClock() {
  const [t, setT] = useState('');
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setT(`${String(n.getUTCHours()).padStart(2,'0')}:${String(n.getUTCMinutes()).padStart(2,'0')}:${String(n.getUTCSeconds()).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

// Terrain profile SVG path from road metadata
function buildTerrainPath(road: Road, w: number, h: number): string {
  const pts: string[] = [];
  const segs = road.geometry.coordinates.length;
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const t = (i / steps) * (segs - 1);
    const seg = Math.floor(t);
    const frac = t - seg;
    const c0 = road.geometry.coordinates[Math.min(seg, segs - 1)];
    const c1 = road.geometry.coordinates[Math.min(seg + 1, segs - 1)];
    const latDelta = (c1[1] - c0[1]) * frac + c0[1];
    // Map lat variation to height
    const baseline = h * 0.62;
    const noise = seeded(road.id, i) * 14 - 7;
    const elevation = baseline - (latDelta - 19.0) * 60 + noise;
    pts.push(`${x.toFixed(1)},${Math.max(4, Math.min(h - 4, elevation)).toFixed(1)}`);
  }
  return `M${pts.join(' L')}`;
}

// ── Sub-components ──────────────────────────────────────────

function HUDStrip({ clock }: { clock: string }) {
  const allSensors = useMemo(() => generateSensorsForRoads(roads as any), []);
  const critCount = allSensors.filter(s => s.level === 'critical').length;
  const elevCount = allSensors.filter(s => s.level === 'elevated').length;
  const nomCount  = allSensors.filter(s => s.level === 'nominal').length;

  return (
    <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 border-b border-white/[0.04] bg-black/60 backdrop-blur-md pointer-events-auto">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="status-beacon live" />
          <span className="mono-label text-[9px]">DIGITAL TWIN // LIVE</span>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span className="mono-label text-[9px]">{critCount} CRITICAL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="mono-label text-[9px]">{elevCount} ELEVATED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="mono-label text-[9px]">{nomCount} NOMINAL</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-1.5">
          <Wifi className="w-3 h-3 text-cyan-500/60" />
          <span className="mono-label text-[9px]">RELAY: CONNECTED</span>
        </div>
        <span className="mono-readout text-[10px] tabular-nums">{clock} UTC</span>
      </div>
    </div>
  );
}

function RoadListPanel({
  selected,
  onSelect,
}: {
  selected: Road | null;
  onSelect: (r: Road) => void;
}) {
  const allSensors = useMemo(() => generateSensorsForRoads(roads as any), []);

  return (
    <div className="flex flex-col h-full overflow-hidden glass-command rounded-xl border border-white/[0.04]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.04] shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-3.5 h-3.5 text-cyan-400/70" />
          <span className="mono-label text-[9px] tracking-[0.18em]">SEGMENT REGISTRY</span>
        </div>
        <p className="mono-readout text-[10px]">{roads.length} <span className="text-[#55555f]">segments indexed</span></p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {roads.map(road => {
          const roadSensors = allSensors.filter(s => s.roadId === road.id);
          const critSensors = roadSensors.filter(s => s.level === 'critical').length;
          const isActive = selected?.id === road.id;
          const alertLevel = critSensors > 2 ? 'critical' : critSensors > 0 ? 'elevated' : 'nominal';

          return (
            <button
              key={road.id}
              onClick={() => onSelect(road)}
              className={`w-full text-left px-4 py-3 border-b border-white/[0.03] transition-all duration-200 ${
                isActive
                  ? 'bg-cyan-500/[0.06] border-l-2 border-l-cyan-500/40'
                  : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`status-beacon ${alertLevel}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-slate-200 truncate">{road.name}</span>
                    {critSensors > 0 && (
                      <span className="shrink-0 text-[8px] font-black text-rose-400">{critSensors}▲</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="mono-label text-[8px]">{road.roadCode}</span>
                    <span className="mono-label text-[8px] opacity-50">·</span>
                    <span className="mono-label text-[8px]">{road.lengthKm}km</span>
                  </div>
                </div>
                {isActive && <ChevronRight className="w-3 h-3 text-cyan-400/60 shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UtilityCrossSection({ road }: { road: Road }) {
  const depthW = 200;
  const depthH = 80;

  return (
    <div className="space-y-2">
      <div className="mono-label text-[9px]">SUBSURFACE CROSS-SECTION // {road.roadCode}</div>

      {/* Visual cross-section SVG */}
      <svg width="100%" height={depthH} viewBox={`0 0 ${depthW} ${depthH}`} className="w-full">
        {/* Ground surface */}
        <rect x={0} y={0} width={depthW} height={10} fill="rgba(255,255,255,0.04)" rx={1} />
        <text x={4} y={8} fill="rgba(255,255,255,0.2)" fontSize={5} fontFamily="monospace">SURFACE</text>

        {/* Utility pipes */}
        {UTILITY_TYPES.map((u, i) => {
          const yPos = 14 + i * 16;
          const active = seeded(road.id, i + 5) > 0.25;
          const pressure = Math.round(seeded(road.id, i * 7) * 100);

          return (
            <g key={u.key}>
              {/* Depth indicator line */}
              <line x1={2} y1={yPos + 4} x2={depthW - 2} y2={yPos + 4}
                stroke={`${u.color}15`} strokeWidth={0.5} strokeDasharray="3 4" />

              {/* Pipe */}
              <rect
                x={6} y={yPos} width={depthW - 14} height={8}
                rx={4}
                fill={active ? `${u.color}18` : 'rgba(255,255,255,0.02)'}
                stroke={active ? `${u.color}50` : 'rgba(255,255,255,0.06)'}
                strokeWidth={0.75}
              />

              {/* Flow indicator */}
              {active && (
                <rect x={10} y={yPos + 2} width={`${pressure}%`} height={4}
                  rx={2} fill={u.color} opacity={0.35} />
              )}

              {/* Labels */}
              <text x={10} y={yPos + 6.5} fill={u.color} fontSize={4.5} fontFamily="monospace" opacity={0.7}>
                {u.label}
              </text>
              <text x={depthW - 8} y={yPos + 6.5} fill="rgba(255,255,255,0.25)" fontSize={4.5} fontFamily="monospace" textAnchor="end">
                {u.depth}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function TerrainProfile({ road }: { road: Road }) {
  const w = 220, h = 56;
  const path = useMemo(() => buildTerrainPath(road, w, h), [road]);
  const fillPath = `${path} L${w},${h} L0,${h} Z`;

  // Get road status color
  const statusColor: Record<string, string> = {
    good: '#34d399', fair: '#f59e0b', poor: '#f43f5e', under_construction: '#71717a'
  };
  const color = statusColor[road.status] ?? '#52525b';

  return (
    <div className="space-y-1.5">
      <div className="mono-label text-[9px]">ELEVATION PROFILE // {road.lengthKm}km</div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="w-full">
        <defs>
          <linearGradient id={`terrain-grad-${road.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {/* Fill */}
        <path d={fillPath} fill={`url(#terrain-grad-${road.id})`} />
        {/* Terrain line */}
        <path d={path} stroke={color} strokeWidth={1.2} fill="none" strokeOpacity={0.8}
          strokeLinecap="round" strokeLinejoin="round" />
        {/* Start / End markers */}
        <circle cx={0} cy={h * 0.62} r={2} fill={color} opacity={0.6} />
        <circle cx={w} cy={h * 0.62} r={2} fill={color} opacity={0.6} />
        <text x={2} y={h - 2} fill="rgba(255,255,255,0.2)" fontSize={4.5} fontFamily="monospace">START</text>
        <text x={w - 2} y={h - 2} fill="rgba(255,255,255,0.2)" fontSize={4.5} fontFamily="monospace" textAnchor="end">END</text>
      </svg>
    </div>
  );
}

function IntelligencePanel({
  road,
  canvasAction,
  setCanvasAction
}: {
  road: Road;
  canvasAction: any;
  setCanvasAction: (action: any) => void;
}) {
  const allSensors = useMemo(() => generateSensorsForRoads(roads as any), []);
  const zones = useMemo(() => generateStressZones(roads as any), []);
  const roadSensors = allSensors.filter(s => s.roadId === road.id);
  const zone = zones.find(z => z.roadId === road.id);
  const roadProjects = projects.filter(p => p.roadId === road.id);
  const primaryProject = roadProjects[0];
  const contractor = primaryProject
    ? contractors.find(c => c.id === primaryProject.contractorId)
    : null;

  const critCount = roadSensors.filter(s => s.level === 'critical').length;
  const elevCount = roadSensors.filter(s => s.level === 'elevated').length;

  const alertLevel = critCount > 2 ? 'critical' : critCount > 0 || elevCount > 2 ? 'elevated' : 'nominal';
  const statusLabel = alertLevel === 'critical' ? 'CRITICAL' : alertLevel === 'elevated' ? 'ELEVATED' : 'NOMINAL';
  const statusColor = SENSOR_LEVEL_COLORS[alertLevel];



  const budgetPct = primaryProject
    ? Math.min(100, Math.round((primaryProject.budgetSpent / primaryProject.budgetAllocated) * 100))
    : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden glass-command rounded-xl border border-white/[0.04]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.04] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`status-beacon ${alertLevel}`} />
            <span className="mono-label text-[9px] tracking-[0.18em]">SEGMENT INTELLIGENCE</span>
          </div>
          <span
            className="text-[8px] font-black px-2 py-0.5 rounded-sm"
            style={{ color: statusColor, backgroundColor: `${statusColor}15`, border: `1px solid ${statusColor}30` }}
          >
            {statusLabel}
          </span>
        </div>
        <h3 className="text-xs font-black text-slate-100 leading-tight">{road.name}</h3>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="mono-label text-[8px]">{road.roadCode}</span>
          <span className="mono-label opacity-40">·</span>
          <span className="mono-label text-[8px]">{road.lengthKm}km</span>
          <span className="mono-label opacity-40">·</span>
          <span className="mono-label text-[8px] capitalize">{road.status.replace('_', ' ')}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Stress waveform */}
        {zone && (
          <div className="space-y-1.5">
            <div className="mono-label text-[9px]">STRUCTURAL STRESS WAVE</div>
            <StressIndicator
              value={zone.stressIndex}
              level={alertLevel}
              width={240}
              height={40}
              showLabel
              animated
            />
          </div>
        )}

        {/* 3D Telemetry Relays (Camera focusing) */}
        <div className="space-y-2">
          <div className="mono-label text-[9px]">WebGL CAMERA TELEMETRY RELAYS</div>
          <div className="grid grid-cols-1 gap-1">
            {[
              { label: "Telemetry Node A-01", coords: [-1.1, 0.25, 0.6] as [number,number,number] },
              { label: "Telemetry Node B-04", coords: [0.1, 0.35, -0.8] as [number,number,number] },
              { label: "Telemetry Node C-02", coords: [1.2, 0.15, 0.3] as [number,number,number] },
              { label: "Pothole Wave Alpha", coords: [0.3, 0.0, 0.5] as [number,number,number] },
              { label: "Stress Zone Beta", coords: [-0.5, 0.02, 0.1] as [number,number,number] }
            ].map((anomaly, idx) => {
              const active = canvasAction && canvasAction.coordinates && 
                             Math.abs(canvasAction.coordinates[0] - anomaly.coords[0]) < 0.01 &&
                             Math.abs(canvasAction.coordinates[1] - anomaly.coords[1]) < 0.01 &&
                             Math.abs(canvasAction.coordinates[2] - anomaly.coords[2]) < 0.01;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (active) {
                      setCanvasAction(null);
                    } else {
                      setCanvasAction({ type: 'FOCUS_ANOMALY', coordinates: anomaly.coords });
                    }
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded border text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${
                    active 
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 font-bold'
                      : 'bg-white/[0.01] border-white/[0.04] text-slate-400 hover:bg-white/[0.03] hover:border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{anomaly.label}</span>
                    <span className="text-[7px] text-[#55555f] font-normal">{anomaly.coords.map(c => c.toFixed(1)).join(', ')}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Terrain profile */}
        <TerrainProfile road={road} />

        {/* Underground cross-section */}
        <UtilityCrossSection road={road} />

        {/* Sensor summary grid */}
        <div className="space-y-2">
          <div className="mono-label text-[9px]">SENSOR COVERAGE // {roadSensors.length} FEEDS</div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: 'Critical', count: critCount, color: '#f43f5e' },
              { label: 'Elevated', count: elevCount, color: '#f59e0b' },
              { label: 'Nominal',  count: roadSensors.filter(s => s.level === 'nominal').length, color: '#34d399' },
            ].map(({ label, count, color }) => (
              <div key={label} className="p-2 rounded-sm border border-white/[0.04] bg-white/[0.02] text-center">
                <div className="mono-readout text-sm" style={{ color }}>{count}</div>
                <div className="mono-label text-[8px] mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Budget intelligence */}
        {primaryProject && (
          <div className="space-y-2">
            <div className="mono-label text-[9px]">BUDGET INTELLIGENCE</div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="mono-label text-[8px]">ALLOCATED</span>
                <span className="mono-readout text-[10px]">{formatCurrency(primaryProject.budgetAllocated)}</span>
              </div>
              <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${budgetPct}%`,
                    background: budgetPct > 90 ? '#f43f5e' : budgetPct > 70 ? '#f59e0b' : '#34d399',
                  }}
                />
              </div>
              <div className="flex justify-between">
                <span className="mono-label text-[8px]">UTILIZED: {budgetPct}%</span>
                <span className="mono-readout text-[9px]">{formatCurrency(primaryProject.budgetSpent)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Contractor */}
        {contractor && (
          <div className="p-3 rounded-sm border border-white/[0.04] bg-white/[0.02] space-y-1.5">
            <div className="mono-label text-[9px]">CONTRACTOR</div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-200 leading-tight">{contractor.name}</span>
              {contractor.blacklisted ? (
                <span className="mono-label text-[8px] text-rose-400 border border-rose-500/30 px-1.5 py-0.5">BLACKLISTED</span>
              ) : (
                <span className="mono-readout text-[9px]">{contractor.rating.toFixed(2)}★</span>
              )}
            </div>
            <div className="flex gap-3 text-[9px] text-[#55555f]">
              <span>{contractor.projectsCompleted} completed</span>
              <span className={contractor.projectsDelayed > 3 ? 'text-rose-400' : ''}>
                {contractor.projectsDelayed} delayed
              </span>
            </div>
          </div>
        )}

        {/* Last scan */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
          <Clock className="w-3 h-3 text-[#55555f]" />
          <span className="mono-label text-[8px]">
            LAST SCAN: {new Date(Date.now() - road.id * 180000).toUTCString().slice(0, 25)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Camera Orchestration Hook ────────────────────────────────
export function useCameraInterpolation(controlsRef: React.RefObject<any>) {
  const { camera } = useThree();
  const canvasAction = useStore(state => state.canvasAction);

  // Default camera target & position parameters
  const defaultTarget = useMemo(() => new THREE.Vector3(0, -0.25, 0), []);
  const defaultCamPos = useMemo(() => new THREE.Vector3(0, 3.2, 4), []);

  const targetLookAt = useRef(new THREE.Vector3().copy(defaultTarget));
  const targetCamPos = useRef(new THREE.Vector3().copy(defaultCamPos));

  useEffect(() => {
    if (canvasAction && canvasAction.coordinates) {
      const [cx, cy, cz] = canvasAction.coordinates;
      targetLookAt.current.set(cx, cy, cz);
      // Place camera offset relative to target to cleanly frame the anomaly
      targetCamPos.current.set(cx, cy + 1.5, cz + 2.2);
    } else {
      targetLookAt.current.copy(defaultTarget);
      targetCamPos.current.copy(defaultCamPos);
    }
  }, [canvasAction, defaultTarget, defaultCamPos]);

  useFrame(() => {
    const lerpSpeed = 0.05;

    // Smoothly pan camera position
    camera.position.lerp(targetCamPos.current, lerpSpeed);

    // Smoothly focus/orient camera using Quaternion.slerp
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.lookAt(camera.position, targetLookAt.current, camera.up);
    const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(tempMatrix);
    camera.quaternion.slerp(targetQuaternion, lerpSpeed);

    // Smoothly focus OrbitControls target
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, lerpSpeed);
      controlsRef.current.update();
    }
  });
}

// ── Main View ────────────────────────────────────────────────

export default function DigitalTwinView() {
  const { setSelectedRoadId, canvasAction, setCanvasAction } = useStore();
  const [selectedRoad, setSelectedRoad] = useState<Road>(roads[0]);
  const clock = useClock();
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Sync local selection to global store for map
  const handleSelectRoad = (road: Road) => {
    setSelectedRoad(road);
    setSelectedRoadId(road.id);
  };

  // Initialize map to first road and clean up canvas actions & release WebGL memory on unmount
  useEffect(() => {
    setSelectedRoadId(roads[0].id);
    return () => {
      setCanvasAction(null);
      
      const scene = sceneRef.current;
      if (scene) {
        console.log("DigitalTwinView unmount: executing absolute explicit memory disposal cycle...");
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            // Dispose Geometry
            if (object.geometry) {
              console.log(`DigitalTwinView dispose: releasing geometry for ${object.name || 'mesh'}`);
              object.geometry.dispose();
            }

            // Dispose Materials & custom shaders
            if (object.material) {
              const disposeMaterial = (mat: THREE.Material) => {
                console.log(`DigitalTwinView dispose: releasing material ${mat.name || mat.type}`);
                mat.dispose();

                // Dispose associated textures
                for (const key in mat) {
                  const prop = (mat as any)[key];
                  if (prop && typeof prop === 'object' && prop.isTexture) {
                    console.log(`DigitalTwinView dispose: releasing texture ${key}`);
                    prop.dispose();
                  }
                }
              };

              if (Array.isArray(object.material)) {
                object.material.forEach(disposeMaterial);
              } else {
                disposeMaterial(object.material);
              }
            }
          }
        });
      }
    };
  }, [setSelectedRoadId, setCanvasAction]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-300 relative">

      {/* ── HUD Top Strip (absolute over map) ── */}
      <HUDStrip clock={clock} />

      {/* ── Main content area: map + panels ── */}
      <div className="flex-1 relative lg:pointer-events-none min-h-0">

        {/* ── Center: 3D Road Inspection Scene ── */}
        <div className="absolute inset-0 pointer-events-auto z-0">
          <ErrorBoundary>
            <RoadInspectionScene sceneRef={sceneRef} />
          </ErrorBoundary>
        </div>

        {/* ── Corner scan decorators ── */}
        <div className="absolute top-[44px] left-0 w-4 h-4 border-t border-l border-cyan-500/20 pointer-events-none z-10" />
        <div className="absolute top-[44px] right-0 w-4 h-4 border-t border-r border-cyan-500/20 pointer-events-none z-10" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-cyan-500/20 pointer-events-none z-10" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-cyan-500/20 pointer-events-none z-10" />

        {/* ── Left panel: Road list ── */}
        <section className="absolute left-4 top-[52px] bottom-4 w-[260px] z-10 flex flex-col pointer-events-auto hidden lg:flex">
          <RoadListPanel selected={selectedRoad} onSelect={handleSelectRoad} />
        </section>

        {/* ── Right panel: Intelligence ── */}
        <section className="absolute right-4 top-[52px] bottom-4 w-[300px] z-10 flex flex-col pointer-events-auto hidden lg:flex">
          <IntelligencePanel 
            road={selectedRoad}
            canvasAction={canvasAction}
            setCanvasAction={setCanvasAction}
          />
        </section>

        {/* ── Mobile: stacked panels below map ── */}
        <div className="lg:hidden absolute bottom-0 left-0 right-0 z-10 max-h-[45vh] overflow-y-auto glass-command border-t border-white/[0.05] pointer-events-auto">
          <div className="p-4 space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {roads.slice(0, 6).map(r => (
                <button
                  key={r.id}
                  onClick={() => handleSelectRoad(r)}
                  className={`shrink-0 px-3 py-1.5 rounded-sm text-[9px] font-black border transition-all ${
                    selectedRoad.id === r.id
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                      : 'border-white/[0.06] text-[#55555f] hover:border-white/[0.12]'
                  }`}
                >
                  {r.roadCode}
                </button>
              ))}
            </div>
            <div className="text-xs font-bold text-slate-200">{selectedRoad.name}</div>
            
            {/* Mobile focus controls */}
            <div className="space-y-1.5">
              <div className="mono-label text-[8px] text-cyan-400">CAMERA TELEMETRY FOCUS RELAYS</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Node A-01", coords: [-1.1, 0.25, 0.6] as [number,number,number] },
                  { label: "Node B-04", coords: [0.1, 0.35, -0.8] as [number,number,number] },
                  { label: "Node C-02", coords: [1.2, 0.15, 0.3] as [number,number,number] },
                  { label: "Pothole", coords: [0.3, 0.0, 0.5] as [number,number,number] }
                ].map((anomaly, idx) => {
                  const active = canvasAction && canvasAction.coordinates && 
                                 Math.abs(canvasAction.coordinates[0] - anomaly.coords[0]) < 0.01 &&
                                 Math.abs(canvasAction.coordinates[1] - anomaly.coords[1]) < 0.01 &&
                                 Math.abs(canvasAction.coordinates[2] - anomaly.coords[2]) < 0.01;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (active) {
                          setCanvasAction(null);
                        } else {
                          setCanvasAction({ type: 'FOCUS_ANOMALY', coordinates: anomaly.coords });
                        }
                      }}
                      className={`px-2.5 py-1 rounded text-[8px] font-black uppercase transition-all ${
                        active
                          ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                          : 'border-white/[0.06] text-[#55555f] hover:border-white/[0.12]'
                      }`}
                    >
                      {anomaly.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <TerrainProfile road={selectedRoad} />
          </div>
        </div>
      </div>
    </div>
  );
}
