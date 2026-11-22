'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  Box,
  Camera,
  Code2,
  Database,
  Droplets,
  Scissors,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import {
  IMG2THREE_PASSES,
  PAVEMENT_STRATA,
  POTHOLE_PRESETS,
  Pothole3DSpec,
  buildProceduralHeightmap,
  computeVolumetricBoQ,
  generateImg2ThreeTypeScriptCode,
  reconstructPotholeFromImage,
  synthesizePotholePhotoDataUrl,
} from '@/services/img2threeEngine';
import { apiPost, useLive } from '@/services/api';

export type ShaderViewMode = 'strata' | 'heatmap' | 'wireframe' | 'patched';

interface SavedScanRow {
  id: number;
  complaint_id: number | null;
  road_id: number | null;
  scan_title: string;
  width_m: number;
  length_m: number;
  depth_cm: number;
  volume_liters: number;
  asphalt_kg: number;
  tack_coat_liters: number;
  estimated_cost_inr: number;
  exposed_layer: string;
  irc_severity: string;
  water_pooling_pct: number;
  spalling_index: number;
  road_name: string | null;
  road_code: string | null;
  authority: string | null;
  scanned_at: string;
}

interface CandidateRow {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: number;
  status: string;
  road_id: number | null;
  road_name: string | null;
  road_code: string | null;
  authority: string | null;
}

interface Pothole3DApiData {
  scans: SavedScanRow[];
  candidates: CandidateRow[];
  totals: {
    total_scans: number;
    total_volume_liters: number;
    total_asphalt_kg: number;
    total_boq_inr: number;
  };
}

/**
 * 8-Pass Procedural Three.js Mesh Group rendered inside React Three Fiber
 */
function ProceduralCraterGroup({
  spec,
  viewMode,
  slicePct,
  activePasses,
}: {
  spec: Pothole3DSpec;
  viewMode: ShaderViewMode;
  slicePct: number; // -100 to +100 (100 = full model, < 100 = cross-section sliced)
  activePasses: Record<string, boolean>;
}) {
  const laserRef = useRef<THREE.Mesh>(null);
  const gridSize = spec.gridSize || 32;
  const maxDepthUnits = Math.min(0.62, (spec.depthCm / 22) * 0.52);
  const scaleX = Math.min(1.35, Math.max(0.55, spec.widthM * 0.85));
  const scaleZ = Math.min(1.25, Math.max(0.55, spec.lengthM * 0.85));
  const sliceZWorld = (slicePct / 100) * 1.15;

  // Build displaced BufferGeometry from the 2D heightmap
  const craterGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(2.8, 2.1, gridSize - 1, gridSize - 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const cAsphalt = new THREE.Color('#27272a');
    const cDbm = new THREE.Color('#52525b');
    const cWmm = new THREE.Color('#92400e');
    const cGsb = new THREE.Color('#dc2626');
    const cHeatLow = new THREE.Color('#10b981');
    const cHeatMid = new THREE.Color('#f59e0b');
    const cHeatHigh = new THREE.Color('#f43f5e');

    for (let i = 0; i < pos.count; i++) {
      const colIdx = i % gridSize;
      const rowIdx = Math.floor(i / gridSize);
      const rawD = spec.heightmap[rowIdx]?.[colIdx] ?? 0;

      // Cross-section slicer: if z > sliceZWorld, flatten or clip for cutaway visibility
      const zCoord = pos.getZ(i);
      const isSlicedOut = slicePct < 98 && zCoord > sliceZWorld;

      const yDisp = isSlicedOut ? -rawD * maxDepthUnits * 0.12 : -rawD * maxDepthUnits;
      pos.setY(i, yDisp);

      const physicalDepthCm = rawD * spec.depthCm;
      let vertColor = cAsphalt;

      if (viewMode === 'heatmap') {
        if (rawD < 0.08) vertColor = cAsphalt;
        else if (rawD < 0.4) vertColor = cHeatLow.clone().lerp(cHeatMid, (rawD - 0.08) / 0.32);
        else vertColor = cHeatMid.clone().lerp(cHeatHigh, Math.min(1, (rawD - 0.4) / 0.55));
      } else {
        if (physicalDepthCm < 1.2) vertColor = cAsphalt;
        else if (physicalDepthCm < 4.5) vertColor = cDbm;
        else if (physicalDepthCm < 10.0) vertColor = cWmm;
        else vertColor = cGsb;
      }

      if (isSlicedOut) {
        vertColor = vertColor.clone().multiplyScalar(0.38);
      }

      colors[i * 3] = vertColor.r;
      colors[i * 3 + 1] = vertColor.g;
      colors[i * 3 + 2] = vertColor.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [spec.heightmap, spec.depthCm, gridSize, maxDepthUnits, viewMode, slicePct, sliceZWorld]);

  // Spalled rim stones (Pass 5)
  const spalledStones = useMemo(() => {
    const list: { pos: [number, number, number]; scale: number; rot: [number, number, number] }[] = [];
    const count = Math.round(14 + spec.spallingIndex * 18);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const jitter = 0.72 + ((i * 19) % 11) * 0.03;
      const rx = Math.cos(a) * scaleX * jitter;
      const rz = Math.sin(a) * scaleZ * jitter;
      const s = 0.022 + ((i * 7) % 5) * 0.008;
      list.push({
        pos: [rx, -0.025 - ((i % 3) * 0.02), rz],
        scale: s,
        rot: [i * 0.5, i * 0.8, i * 0.3],
      });
    }
    return list;
  }, [spec.spallingIndex, scaleX, scaleZ]);

  useFrame((state) => {
    if (laserRef.current && activePasses.lighting) {
      const t = state.clock.getElapsedTime();
      laserRef.current.position.z = Math.sin(t * 1.4) * 0.85;
    }
  });

  const waterY = -maxDepthUnits * (1 - Math.min(92, spec.waterPoolingPct) / 115);

  return (
    <group>
      {/* PASS 1: BLOCKOUT (Outer lane markings & dimensional reference grid) */}
      {activePasses.blockout && (
        <group>
          <gridHelper args={[3.4, 18, '#0ea5e9', '#1e293b']} position={[0, -0.58, 0]} />
          {/* Yellow lane stripes */}
          <mesh position={[-0.85, 0.006, -0.92]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.75, 0.09]} />
            <meshBasicMaterial color="#eab308" transparent opacity={0.75} />
          </mesh>
          <mesh position={[0.45, 0.006, -0.92]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.75, 0.09]} />
            <meshBasicMaterial color="#eab308" transparent opacity={0.75} />
          </mesh>
        </group>
      )}

      {/* PASS 2: STRUCTURAL (4-Layer Subsurface IRC:37 Strata Cutaway) */}
      {activePasses.structural && (
        <group position={[0, 0, 0]}>
          {[
            { label: 'BC Wearing Course (50mm)', h: 0.08, y: -0.05, color: '#27272a' },
            { label: 'DBM Binder Base (100mm)', h: 0.13, y: -0.155, color: '#3f3f46' },
            { label: 'WMM Sub-Base (150mm)', h: 0.16, y: -0.30, color: '#78350f' },
            { label: 'GSB Granular Base (200mm)', h: 0.17, y: -0.465, color: '#9a3412' },
          ].map((layer) => (
            <mesh key={layer.label} position={[0, layer.y, 0]}>
              <boxGeometry args={[2.78, layer.h, 2.08]} />
              <meshStandardMaterial
                color={layer.color}
                roughness={0.9}
                metalness={0.08}
                wireframe={viewMode === 'wireframe'}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* PASS 3 & 4: FORM & MATERIAL (Displaced Crater Heightmap Mesh) */}
      {activePasses.form && (
        <mesh geometry={craterGeometry} position={[0, 0.01, 0]}>
          <meshStandardMaterial
            vertexColors
            roughness={activePasses.material ? 0.82 : 1.0}
            metalness={activePasses.material ? 0.16 : 0.0}
            wireframe={viewMode === 'wireframe'}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* PASS 5: SURFACE (Spalled Aggregate Stones & Rim Fracture Ring) */}
      {activePasses.surface && (
        <group>
          {spalledStones.map((stone, idx) => (
            <mesh key={idx} position={stone.pos} rotation={stone.rot}>
              <dodecahedronGeometry args={[stone.scale, 0]} />
              <meshStandardMaterial color={idx % 2 === 0 ? '#a16207' : '#57534e'} roughness={0.92} />
            </mesh>
          ))}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]}>
            <ringGeometry args={[scaleX * 0.68, scaleX * 0.73, 36]} />
            <meshBasicMaterial color="#f43f5e" transparent opacity={0.45} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* PASS 6: LIGHTING & LASER PROFILOMETER RIG */}
      {activePasses.lighting && (
        <group>
          <mesh ref={laserRef} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2.75, 0.025]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.85} side={THREE.DoubleSide} />
          </mesh>
          {/* Center Depth Pin */}
          <mesh position={[0, -maxDepthUnits / 2, 0]}>
            <cylinderGeometry args={[0.012, 0.012, maxDepthUnits, 12]} />
            <meshBasicMaterial color="#f43f5e" />
          </mesh>
          <Html position={[0, 0.24, 0]} center distanceFactor={5}>
            <div className="rounded-md border border-cyan-400/50 bg-slate-950/90 px-2 py-1 text-[10px] font-mono text-cyan-300 whitespace-nowrap shadow-lg pointer-events-none">
              Max Depth: {spec.depthCm} cm · Vol: {spec.volumeLiters} L · HMA: {spec.asphaltKg} kg
            </div>
          </Html>
        </group>
      )}

      {/* PASS 7: INTERACTION (Cross-section Laser Plane, Monsoon Water Pool & HMA Repair Patch) */}
      {activePasses.interaction && (
        <group>
          {/* Active Cross-Section Slicer Plane */}
          {slicePct < 98 && (
            <mesh position={[0, -0.22, sliceZWorld]}>
              <planeGeometry args={[2.86, 0.68]} />
              <meshBasicMaterial color="#22d3ee" transparent opacity={0.22} side={THREE.DoubleSide} />
            </mesh>
          )}

          {/* Monsoon Water Pooling inside Crater */}
          {spec.waterPoolingPct > 2 && viewMode !== 'patched' && (
            <mesh position={[0, waterY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[scaleX * 0.58 * (0.4 + spec.waterPoolingPct / 160), 32]} />
              <meshStandardMaterial
                color="#0284c7"
                transparent
                opacity={0.62}
                roughness={0.15}
                metalness={0.35}
              />
            </mesh>
          )}

          {/* Hot-Mix Asphalt (HMA) Compacted Repair Patch Simulation */}
          {viewMode === 'patched' && (
            <group position={[0, 0.018, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[scaleX * 1.55, scaleZ * 1.55]} />
                <meshStandardMaterial color="#10b981" transparent opacity={0.42} roughness={0.6} />
              </mesh>
              <mesh position={[0, 0.005, 0]}>
                <boxGeometry args={[scaleX * 1.56, 0.02, scaleZ * 1.56]} />
                <meshBasicMaterial color="#34d399" wireframe />
              </mesh>
            </group>
          )}
        </group>
      )}
    </group>
  );
}

/**
 * 2D SVG Cross-Section Depth Profile along the active Laser Slicer plane
 */
function CrossSectionProfileChart({ spec, slicePct }: { spec: Pothole3DSpec; slicePct: number }) {
  const gridSize = spec.gridSize || 32;
  const rowIdx = Math.min(
    gridSize - 1,
    Math.max(0, Math.floor(((slicePct + 100) / 200) * (gridSize - 1)))
  );
  const row = spec.heightmap[rowIdx] || spec.heightmap[Math.floor(gridSize / 2)] || [];
  const W = 420;
  const H = 118;
  const padX = 28;
  const padY = 18;
  const plotW = W - padX * 2;
  const plotH = H - padY * 2;

  const pts = row
    .map((d, i) => {
      const x = padX + (i / Math.max(1, row.length - 1)) * plotW;
      const y = padY + d * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const areaPts = `${padX},${padY} ${pts} ${padX + plotW},${padY} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28 rounded-lg bg-slate-950 border border-white/[0.07]">
      {/* Strata depth bands */}
      {PAVEMENT_STRATA.map((st) => {
        const y0 = padY + Math.min(1, st.fromCm / Math.max(12, spec.depthCm * 1.15)) * plotH;
        const y1 = padY + Math.min(1, st.toCm / Math.max(12, spec.depthCm * 1.15)) * plotH;
        return (
          <g key={st.name}>
            <rect x={padX} y={y0} width={plotW} height={Math.max(2, y1 - y0)} fill={st.color} opacity={0.28} />
            <line x1={padX} y1={y1} x2={padX + plotW} y2={y1} stroke="#334155" strokeDasharray="3 3" strokeWidth={0.6} />
          </g>
        );
      })}
      {/* Water fill line */}
      {spec.waterPoolingPct > 2 && (
        <rect
          x={padX + plotW * 0.22}
          y={padY + (1 - spec.waterPoolingPct / 100) * plotH * 0.85}
          width={plotW * 0.56}
          height={plotH * 0.85 * (spec.waterPoolingPct / 100)}
          fill="#0284c7"
          opacity={0.25}
        />
      )}
      <path d={`M${areaPts}`} fill="rgba(244, 63, 94, 0.24)" />
      <polyline fill="none" stroke="#22d3ee" strokeWidth={2} points={pts} />
      <text x={padX + 4} y={13} fill="#94a3b8" fontSize={9} fontFamily="monospace">
        LASER CROSS-SECTION PROFILE (Row {rowIdx + 1}/{gridSize}) · Max Depth: -{spec.depthCm} cm
      </text>
      <text x={padX + 4} y={H - 5} fill="#f43f5e" fontSize={8.5} fontFamily="monospace">
        Exposed: {spec.exposedLayer}
      </text>
    </svg>
  );
}

export interface Img2ThreePotholeModalProps {
  open?: boolean;
  onClose?: () => void;
  initialComplaintId?: number | null;
  initialRoadId?: number | null;
  initialTitle?: string;
  initialPhotoUrl?: string | null;
  embedded?: boolean; // When true, renders inline (e.g. inside Showcase Mode or Digital Twin)
}

export default function Img2ThreePotholeModal({
  open = true,
  onClose,
  initialComplaintId = null,
  initialRoadId = null,
  initialTitle,
  initialPhotoUrl = null,
  embedded = false,
}: Img2ThreePotholeModalProps) {
  const apiState = useLive<Pothole3DApiData>('/screens/pothole-3d');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(POTHOLE_PRESETS[0].id);
  const [viewMode, setViewMode] = useState<ShaderViewMode>('strata');
  const [slicePct, setSlicePct] = useState<number>(100);
  const [rightTab, setRightTab] = useState<'boq' | 'code' | 'db'>('boq');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [activePasses, setActivePasses] = useState<Record<string, boolean>>({
    blockout: true,
    structural: true,
    form: true,
    material: true,
    surface: true,
    lighting: true,
    interaction: true,
    optimization: true,
  });

  // Initial procedural spec
  const [spec, setSpec] = useState<Pothole3DSpec>(() => {
    const p = POTHOLE_PRESETS[0];
    const hm = buildProceduralHeightmap(32, p.seed, p.spallingIndex);
    const photo = typeof document !== 'undefined' ? synthesizePotholePhotoDataUrl(p.seed, p.roadCode, p.waterPoolingPct) : '';
    return computeVolumetricBoQ(hm, p.widthM, p.lengthM, p.depthCm, p.spallingIndex, p.waterPoolingPct, {
      complaintId: initialComplaintId ?? 142,
      roadId: initialRoadId ?? p.roadId,
      title: initialTitle || p.label,
      roadName: p.roadName,
      roadCode: p.roadCode,
      authority: p.authority,
      imageDataUrl: initialPhotoUrl || photo,
    });
  });

  // Reconstruct if initialPhotoUrl or initialComplaintId changes
  useEffect(() => {
    if (initialPhotoUrl) {
      reconstructPotholeFromImage(initialPhotoUrl, {
        complaintId: initialComplaintId,
        roadId: initialRoadId,
        title: initialTitle || 'Citizen Camera Pothole Scan',
      }).then(setSpec);
    }
  }, [initialPhotoUrl, initialComplaintId, initialRoadId, initialTitle]);

  const applyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = POTHOLE_PRESETS.find((x) => x.id === presetId) ?? POTHOLE_PRESETS[0];
    const photo = synthesizePotholePhotoDataUrl(p.seed, p.roadCode, p.waterPoolingPct);
    const hm = buildProceduralHeightmap(32, p.seed, p.spallingIndex);
    setSpec(
      computeVolumetricBoQ(hm, p.widthM, p.lengthM, p.depthCm, p.spallingIndex, p.waterPoolingPct, {
        complaintId: initialComplaintId,
        roadId: p.roadId,
        title: p.label,
        roadName: p.roadName,
        roadCode: p.roadCode,
        authority: p.authority,
        imageDataUrl: photo,
      })
    );
    setSaveMsg(null);
  };

  const applyCandidateComplaint = (c: CandidateRow) => {
    const seed = (c.id % 7) + 1;
    const widthM = Math.round((0.75 + (c.priority || 3) * 0.22) * 100) / 100;
    const lengthM = Math.round(widthM * 0.82 * 100) / 100;
    const depthCm = Math.round((3.8 + (c.priority || 3) * 2.4) * 10) / 10;
    const spalling = Math.min(0.92, 0.35 + (c.priority || 3) * 0.11);
    const water = c.category === 'waterlogging' ? 75 : 30;
    const photo = synthesizePotholePhotoDataUrl(seed, c.road_code || `CMP-${c.id}`, water);
    const hm = buildProceduralHeightmap(32, seed, spalling);
    setSpec(
      computeVolumetricBoQ(hm, widthM, lengthM, depthCm, spalling, water, {
        complaintId: c.id,
        roadId: c.road_id ?? 3,
        title: `#CMP-${String(c.id).padStart(5, '0')}: ${c.title}`,
        roadName: c.road_name || 'Mumbai Arterial Corridor',
        roadCode: c.road_code || 'SV-RD-01',
        authority: c.authority || 'MCGM-KW',
        imageDataUrl: photo,
      })
    );
    setSaveMsg(null);
  };

  const handlePhotoUpload = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const rebuilt = await reconstructPotholeFromImage(dataUrl, {
      complaintId: spec.complaintId,
      roadId: spec.roadId,
      title: `Uploaded 2D Photo Scan (${file.name})`,
      roadName: spec.roadName,
      roadCode: spec.roadCode,
      authority: spec.authority,
    });
    setSpec(rebuilt);
    setSaveMsg('✓ Reconstructed 3D vertex mesh directly from uploaded 2D image luminance & edge gradients!');
  };

  const updateDimension = (
    field: 'widthM' | 'lengthM' | 'depthCm' | 'spallingIndex' | 'waterPoolingPct',
    value: number
  ) => {
    const next = { ...spec, [field]: value };
    const hm =
      field === 'spallingIndex'
        ? buildProceduralHeightmap(32, (spec.complaintId || 1) % 9, value)
        : spec.heightmap;
    setSpec(
      computeVolumetricBoQ(
        hm,
        next.widthM,
        next.lengthM,
        next.depthCm,
        next.spallingIndex,
        next.waterPoolingPct,
        next
      )
    );
  };

  const tsCode = useMemo(() => generateImg2ThreeTypeScriptCode(spec), [spec]);

  const saveScanToDatabase = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await apiPost<{ id: number }>('/screens/pothole-3d', {
        complaint_id: spec.complaintId,
        road_id: spec.roadId,
        scan_title: spec.title.slice(0, 195),
        width_m: spec.widthM,
        length_m: spec.lengthM,
        depth_cm: spec.depthCm,
        volume_liters: spec.volumeLiters,
        asphalt_kg: spec.asphaltKg,
        tack_coat_liters: spec.tackCoatLiters,
        estimated_cost_inr: spec.estimatedCostInr,
        exposed_layer: spec.exposedLayer,
        irc_severity: spec.ircSeverity,
        water_pooling_pct: spec.waterPoolingPct,
        spalling_index: spec.spallingIndex,
        heightmap_json: {
          grid_size: spec.gridSize,
          max_depth_cm: spec.depthCm,
          center_row: spec.heightmap[Math.floor(spec.gridSize / 2)]?.slice(0, 16) ?? [],
          passes: Object.keys(activePasses).filter((k) => activePasses[k]),
        },
        threejs_code: tsCode,
      });
      setSaveMsg(`✓ Saved 3D volumetric scan #${res.id} (${spec.volumeLiters} L / ${spec.asphaltKg} kg HMA) to PostgreSQL pothole_3d_scans!`);
      apiState.reload();
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Could not save 3D scan');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const content = (
    <div
      className={`flex flex-col rounded-2xl border border-cyan-500/30 bg-slate-950 text-slate-100 shadow-2xl overflow-hidden ${
        embedded ? 'w-full' : 'w-full max-w-6xl max-h-[92vh]'
      }`}
    >
      {/* Top Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-slate-900/90 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-400">
            <Box className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                IMG2THREEJS PROCEDURAL 3D ENGINE // 8-PASS PIPELINE
              </span>
              <span className="rounded bg-emerald-500/15 border border-emerald-400/30 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-300">
                LIVE WEBGL + POSTGIS BOQ
              </span>
            </div>
            <h2 className="text-sm font-bold text-white">{spec.title}</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Upload any 2D photo to convert to 3D */}
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25 transition-colors">
            <Upload className="h-3.5 w-3.5" />
            2D Photo → 3D Mesh
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePhotoUpload(f);
                e.target.value = '';
              }}
            />
          </label>

          {/* Save to PostgreSQL button */}
          <button
            type="button"
            onClick={saveScanToDatabase}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Database className="h-3.5 w-3.5" />
            {saving ? 'Saving to PostGIS…' : 'Save 3D Scan & BoQ to DB'}
          </button>

          {onClose && !embedded && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/[0.1] bg-slate-900 p-1.5 text-slate-400 hover:text-white"
              aria-label="Close 3D Pothole Studio"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Preset & Live DB Pothole Selector Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-slate-900/50 px-5 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase text-slate-400 mr-1">Sample Craters:</span>
          {POTHOLE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                selectedPresetId === p.id
                  ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300'
                  : 'border-white/[0.08] bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.roadCode} ({p.depthCm}cm)
            </button>
          ))}
        </div>

        {(apiState.data?.candidates?.length ?? 0) > 0 && (
          <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Or load live DB complaint:</span>
            <select
              onChange={(e) => {
                const found = apiState.data?.candidates.find((c) => c.id === Number(e.target.value));
                if (found) applyCandidateComplaint(found);
              }}
              className="rounded-md border border-white/[0.12] bg-slate-950 px-2 py-1 text-[11px] text-slate-200"
              defaultValue=""
            >
              <option value="" disabled>
                Choose from {apiState.data?.candidates.length} open potholes…
              </option>
              {apiState.data?.candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  #CMP-{String(c.id).padStart(5, '0')} · {c.road_code || 'WARD'} · {c.title.slice(0, 38)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {saveMsg && (
        <div className="border-b border-emerald-500/30 bg-emerald-950/40 px-5 py-2 text-xs text-emerald-200 flex items-center justify-between">
          <span>{saveMsg}</span>
          <button onClick={() => setSaveMsg(null)} className="text-emerald-400 underline text-[11px]">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Studio Grid: Left/Center 3D Viewport + Controls, Right Engineering BoQ & Code */}
      <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[1fr_430px] overflow-y-auto">
        {/* LEFT COLUMN: 3D WebGL Canvas + 8-Pass Pipeline Toggles + Interactive Sliders */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-white/[0.08]">
          {/* Shader Mode Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-slate-950 px-4 py-2">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['strata', '1. Pavement Strata PBR'],
                  ['heatmap', '2. Laser Depth Heatmap'],
                  ['wireframe', '3. Procedural Wireframe'],
                  ['patched', '4. Simulate HMA Patch Repair'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                    viewMode === mode
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                      : 'border-white/[0.07] bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="font-mono text-[10px] text-slate-400">
              Drag to Orbit · Scroll to Zoom
            </span>
          </div>

          {/* 3D Canvas + 2D Source Photo PiP Preview */}
          <div className="relative h-[350px] sm:h-[400px] w-full bg-[#060911]">
            <Canvas
              camera={{ position: [0, 1.85, 2.45], fov: 42 }}
              gl={{ antialias: true, powerPreference: 'high-performance' }}
            >
              <ambientLight intensity={0.55} />
              <directionalLight position={[4, 6, 3]} intensity={1.35} />
              <pointLight position={[-3, 3, -2]} intensity={0.7} color="#38bdf8" />
              <pointLight position={[0, -1.5, 0]} intensity={0.4} color="#f43f5e" />

              <ProceduralCraterGroup
                spec={spec}
                viewMode={viewMode}
                slicePct={slicePct}
                activePasses={activePasses}
              />

              <OrbitControls
                enablePan={true}
                enableZoom={true}
                minDistance={1.1}
                maxDistance={5.5}
                maxPolarAngle={Math.PI / 2 - 0.02}
              />
            </Canvas>

            {/* 2D Reference Image Picture-in-Picture Card */}
            {spec.imageDataUrl && (
              <div className="absolute top-3 left-3 z-10 w-36 rounded-xl border border-white/[0.15] bg-slate-950/90 p-1.5 shadow-xl">
                <div className="flex items-center justify-between px-1 pb-1">
                  <span className="font-mono text-[8px] font-bold uppercase text-cyan-400">
                    2D Reference Input
                  </span>
                  <Camera className="h-2.5 w-2.5 text-cyan-400" />
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={spec.imageDataUrl}
                  alt="2D Pothole source reference"
                  className="h-20 w-full rounded-lg object-cover border border-white/[0.08]"
                />
              </div>
            )}

            {/* Live IRC Severity Badge overlay */}
            <div className="absolute top-3 right-3 z-10 rounded-lg border border-rose-500/40 bg-slate-950/90 px-3 py-1.5 text-right shadow-lg">
              <span className="block font-mono text-[8px] uppercase text-slate-400">IRC:82 CLASSIFICATION</span>
              <span className="font-mono text-[10px] font-bold text-rose-400">{spec.ircSeverity}</span>
            </div>

            {/* Strata Legend Pill at bottom-left */}
            <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2 rounded-lg border border-white/[0.08] bg-slate-950/85 px-2.5 py-1.5 text-[9px] font-mono">
              {PAVEMENT_STRATA.map((s) => (
                <span key={s.name} className="inline-flex items-center gap-1 text-slate-300">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name.split(' ')[0]}
                </span>
              ))}
            </div>
          </div>

          {/* 8-Stage img2threejs Pass Toggles */}
          <div className="border-t border-white/[0.07] bg-slate-900/70 px-4 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                img2threejs Quality-Gated Sculpting Passes (Click to Toggle Layer)
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                {Object.values(activePasses).filter(Boolean).length} / 8 Passes Active
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {IMG2THREE_PASSES.map((p) => {
                const on = activePasses[p.id] ?? true;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePasses((prev) => ({ ...prev, [p.id]: !on }))}
                    title={p.desc}
                    className={`rounded-md border px-2 py-1 text-left transition-all cursor-pointer ${
                      on
                        ? 'border-cyan-500/40 bg-cyan-500/10 text-slate-100'
                        : 'border-white/[0.05] bg-slate-950/60 text-slate-500'
                    }`}
                  >
                    <div className="font-mono text-[10px] font-bold">{p.label}</div>
                    <div className="truncate text-[9px] text-slate-400">{p.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Parametric & Slicer Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-white/[0.07] bg-slate-950 p-4 text-xs">
            <label className="flex flex-col gap-1 rounded-lg border border-white/[0.06] bg-slate-900/50 p-2.5">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="flex items-center gap-1 text-cyan-300">
                  <Scissors className="h-3 w-3" /> Cross-Section Slicer
                </span>
                <span>{slicePct === 100 ? 'Full Mesh' : `${slicePct}% Cut`}</span>
              </div>
              <input
                type="range"
                min={-80}
                max={100}
                value={slicePct}
                onChange={(e) => setSlicePct(Number(e.target.value))}
                className="accent-cyan-400"
              />
            </label>

            <label className="flex flex-col gap-1 rounded-lg border border-white/[0.06] bg-slate-900/50 p-2.5">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-rose-300">Crater Max Depth</span>
                <span>{spec.depthCm} cm</span>
              </div>
              <input
                type="range"
                min={2.0}
                max={28.0}
                step={0.5}
                value={spec.depthCm}
                onChange={(e) => updateDimension('depthCm', Number(e.target.value))}
                className="accent-rose-400"
              />
            </label>

            <label className="flex flex-col gap-1 rounded-lg border border-white/[0.06] bg-slate-900/50 p-2.5">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="flex items-center gap-1 text-sky-300">
                  <Droplets className="h-3 w-3" /> Monsoon Water Pool
                </span>
                <span>{spec.waterPoolingPct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={95}
                step={5}
                value={spec.waterPoolingPct}
                onChange={(e) => updateDimension('waterPoolingPct', Number(e.target.value))}
                className="accent-sky-400"
              />
            </label>

            <label className="flex flex-col gap-1 rounded-lg border border-white/[0.06] bg-slate-900/50 p-2.5">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-slate-300">Crater Width (X)</span>
                <span>{spec.widthM} m</span>
              </div>
              <input
                type="range"
                min={0.35}
                max={2.8}
                step={0.05}
                value={spec.widthM}
                onChange={(e) => updateDimension('widthM', Number(e.target.value))}
                className="accent-cyan-400"
              />
            </label>

            <label className="flex flex-col gap-1 rounded-lg border border-white/[0.06] bg-slate-900/50 p-2.5">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-slate-300">Crater Length (Z)</span>
                <span>{spec.lengthM} m</span>
              </div>
              <input
                type="range"
                min={0.35}
                max={2.4}
                step={0.05}
                value={spec.lengthM}
                onChange={(e) => updateDimension('lengthM', Number(e.target.value))}
                className="accent-cyan-400"
              />
            </label>

            <label className="flex flex-col gap-1 rounded-lg border border-white/[0.06] bg-slate-900/50 p-2.5">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-amber-300">Rim Spalling Roughness</span>
                <span>{Math.round(spec.spallingIndex * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.15}
                max={0.95}
                step={0.05}
                value={spec.spallingIndex}
                onChange={(e) => updateDimension('spallingIndex', Number(e.target.value))}
                className="accent-amber-400"
              />
            </label>
          </div>
        </div>

        {/* RIGHT COLUMN: Volumetric BoQ, Cross-Section Chart, img2threejs TypeScript Code & DB Ledger */}
        <div className="flex flex-col bg-slate-900/40 p-4 gap-3.5 overflow-y-auto">
          {/* Right Sub-Tabs */}
          <div className="flex gap-1.5 border-b border-white/[0.08] pb-2.5">
            {(
              [
                ['boq', 'Volumetric BoQ & Profile', Wrench],
                ['code', 'img2threejs TS Code', Code2],
                ['db', `Saved DB Scans (${apiState.data?.scans.length ?? 0})`, Database],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRightTab(key)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
                  rightTab === key
                    ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                    : 'border-white/[0.07] bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {rightTab === 'boq' && (
            <div className="flex flex-col gap-3.5">
              {/* 4 Volumetric KPI Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-white/[0.07] bg-slate-950 p-3">
                  <span className="font-mono text-[10px] uppercase text-slate-400">CRATER CAVITY VOLUME</span>
                  <div className="mt-1 font-mono text-xl font-bold text-cyan-300">{spec.volumeLiters} L</div>
                  <span className="text-[11px] text-slate-400">
                    {spec.widthM}m × {spec.lengthM}m × {spec.depthCm}cm
                  </span>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-slate-950 p-3">
                  <span className="font-mono text-[10px] uppercase text-slate-400">HOT-MIX ASPHALT (HMA)</span>
                  <div className="mt-1 font-mono text-xl font-bold text-amber-300">{spec.asphaltKg} kg</div>
                  <span className="text-[11px] text-slate-400">
                    +{spec.tackCoatLiters} L RS-1 Tack Coat
                  </span>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-slate-950 p-3">
                  <span className="font-mono text-[10px] uppercase text-slate-400">ESTIMATED REPAIR BOQ</span>
                  <div className="mt-1 font-mono text-xl font-bold text-emerald-300">
                    ₹{spec.estimatedCostInr.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-slate-400">Material + Plant + Compaction</span>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-slate-950 p-3">
                  <span className="font-mono text-[10px] uppercase text-slate-400">EXPOSED STRATUM</span>
                  <div className="mt-1 text-xs font-bold text-rose-300 leading-snug">{spec.exposedLayer}</div>
                  <span className="font-mono text-[10px] text-slate-400">{spec.roadCode} · {spec.authority}</span>
                </div>
              </div>

              {/* 2D Cross-Section Laser Depth Profile */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-200">2D Laser Profilometer Cross-Section</span>
                  <span className="font-mono text-[10px] text-cyan-400">Syncs with Slicer Slider</span>
                </div>
                <CrossSectionProfileChart spec={spec} slicePct={slicePct} />
              </div>

              {/* Engineering Repair Specification Breakdown */}
              <div className="rounded-xl border border-white/[0.07] bg-slate-950 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                  <span className="font-semibold text-slate-200">MoRTH / IRC:82 Rectification Protocol</span>
                  <span className="font-mono text-[10px] text-emerald-400">AUTO-COMPUTED</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">1. Saw-Cut & Square Boxing:</span>
                    <span className="font-mono">{(spec.widthM * 1.15).toFixed(2)}m × {(spec.lengthM * 1.15).toFixed(2)}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">2. Sub-Base WMM Re-Compaction:</span>
                    <span className="font-mono">{spec.depthCm >= 8 ? 'Required (≥98% Proctor)' : 'Surface Layer Only'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">3. Bitumen Emulsion Tack Coat:</span>
                    <span className="font-mono">{spec.tackCoatLiters} Liters (0.5 kg/m²)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">4. VG-30 Bituminous Concrete (145°C):</span>
                    <span className="font-mono font-bold text-amber-300">{spec.asphaltKg} kg (Vibratory Roller)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {rightTab === 'code' && (
            <div className="flex flex-col gap-2.5 flex-1 min-h-0">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">
                  Procedural TypeScript Three.js model (<code className="text-cyan-300">THREE.Group</code>)
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(tsCode)}
                    className="rounded border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 cursor-pointer"
                  >
                    Copy .TS Code
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([tsCode], { type: 'text/typescript' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `pothole_${spec.roadCode.toLowerCase()}.ts`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="rounded border border-white/[0.12] bg-slate-950 px-2.5 py-1 text-[11px] text-slate-200 cursor-pointer"
                  >
                    Download .ts
                  </button>
                </div>
              </div>
              <pre className="flex-1 max-h-[380px] overflow-auto rounded-xl border border-white/[0.08] bg-slate-950 p-3 font-mono text-[10.5px] leading-relaxed text-cyan-200">
                {tsCode}
              </pre>
            </div>
          )}

          {rightTab === 'db' && (
            <div className="flex flex-col gap-2.5">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-white/[0.07] bg-slate-950 p-2">
                  <span className="block font-mono text-[9px] text-slate-400">SAVED 3D SCANS</span>
                  <span className="font-mono text-sm font-bold text-cyan-300">
                    {apiState.data?.totals.total_scans ?? 0}
                  </span>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-slate-950 p-2">
                  <span className="block font-mono text-[9px] text-slate-400">TOTAL HMA MASS</span>
                  <span className="font-mono text-sm font-bold text-amber-300">
                    {apiState.data?.totals.total_asphalt_kg ?? 0} kg
                  </span>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-slate-950 p-2">
                  <span className="block font-mono text-[9px] text-slate-400">TOTAL BOQ VALUE</span>
                  <span className="font-mono text-sm font-bold text-emerald-300">
                    ₹{Number(apiState.data?.totals.total_boq_inr ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
                {(apiState.data?.scans ?? []).map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      const hm = buildProceduralHeightmap(32, s.id, Number(s.spalling_index));
                      setSpec(
                        computeVolumetricBoQ(
                          hm,
                          Number(s.width_m),
                          Number(s.length_m),
                          Number(s.depth_cm),
                          Number(s.spalling_index),
                          Number(s.water_pooling_pct),
                          {
                            complaintId: s.complaint_id,
                            roadId: s.road_id,
                            title: s.scan_title,
                            roadName: s.road_name || 'S.V. Road',
                            roadCode: s.road_code || 'SV-RD-01',
                            authority: s.authority || 'MCGM-KW',
                            imageDataUrl: synthesizePotholePhotoDataUrl(s.id, s.road_code || 'SCAN', Number(s.water_pooling_pct)),
                          }
                        )
                      );
                      setRightTab('boq');
                    }}
                    className="cursor-pointer rounded-xl border border-white/[0.08] bg-slate-950 p-3 hover:border-cyan-400/50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold text-cyan-300">
                        SCAN #{s.id} {s.complaint_id ? `· #CMP-${String(s.complaint_id).padStart(5, '0')}` : ''}
                      </span>
                      <span className="font-mono text-emerald-300">
                        ₹{Number(s.estimated_cost_inr).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-200 truncate">{s.scan_title}</p>
                    <p className="mt-1 font-mono text-[10px] text-slate-400">
                      {s.width_m}m × {s.length_m}m · Depth {s.depth_cm}cm · {s.volume_liters}L · {s.asphalt_kg}kg HMA
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div
      className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Img2ThreeJS 3D Pothole Reconstruction Studio"
    >
      {content}
    </div>
  );
}
