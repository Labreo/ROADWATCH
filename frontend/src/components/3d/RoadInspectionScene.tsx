'use client';

import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';

// Pre-load model to prevent latency spikes during view activation
useGLTF.preload('/3d/roadInspection.glb');

// ── Types ────────────────────────────────────────────────────

interface LayerState {
  sensors: boolean;
  drainage: boolean;
  repair: boolean;
  potholes: boolean;
  stress: boolean;
}

interface SensorPointProps {
  position: [number, number, number];
  label: string;
  details: string;
  status: 'active' | 'warning' | 'critical';
}

// ── Utilities ────────────────────────────────────────────────

function statusColor(status: 'active' | 'warning' | 'critical' | 'nominal'): string {
  switch (status) {
    case 'active':   return '#10b981'; // Emerald 500
    case 'warning':  return '#f59e0b'; // Amber 500
    case 'critical': return '#f43f5e'; // Rose 500
    default:         return '#71717a';
  }
}

// ── Sensor Points ────────────────────────────────────────────

function SensorPoint({ position, label, details, status }: SensorPointProps) {
  const [hovered, setHovered] = useState(false);
  const haloRef = useRef<THREE.Mesh>(null);
  const color = statusColor(status);

  useFrame((state) => {
    if (haloRef.current) {
      const pulse = 1.0 + Math.sin(state.clock.getElapsedTime() * 6.5) * 0.25;
      haloRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group position={position}>
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={hovered ? 0.35 : 0.15} />
      </mesh>
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={(e)  => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshBasicMaterial color={hovered ? '#ffffff' : color} toneMapped={false} />
      </mesh>
      {hovered && (
        <Html distanceFactor={4.5} center>
          <div className="glass-panel p-3 rounded-xl border border-white/5 shadow-2xl text-left text-[9px] w-48 text-slate-100 pointer-events-none select-none z-50 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-1.5 border-b border-border/40 pb-1">
              <span className="font-extrabold uppercase tracking-widest text-[8px] text-cyan-400">{label}</span>
              <span className={`text-[7px] font-black uppercase px-1.5 py-0.2 rounded border ${
                status === 'active'   ? 'text-emerald-400 border-emerald-950/60 bg-emerald-950/20' :
                status === 'warning'  ? 'text-amber-400 border-amber-950/60 bg-amber-950/20' :
                                        'text-rose-400 border-rose-900/60 bg-rose-950/20'
              }`}>{status}</span>
            </div>
            <p className="font-medium leading-relaxed text-slate-350">{details}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Drainage Layer ───────────────────────────────────────────

const PIPE_CONFIGS = [
  { start: [-1.8, -0.35, -0.6] as [number,number,number], end: [1.8, -0.35, -0.6] as [number,number,number], color: '#38bdf8', label: 'WATER MAIN' },
  { start: [-1.8, -0.55,  0.0] as [number,number,number], end: [1.8, -0.55,  0.0] as [number,number,number], color: '#fbbf24', label: 'STORM DRAIN' },
  { start: [-1.8, -0.75,  0.6] as [number,number,number], end: [1.8, -0.75,  0.6] as [number,number,number], color: '#a78bfa', label: 'FIBER OPTIC' },
];

function DrainagePipe({ start, end, color }: { start: [number,number,number]; end: [number,number,number]; color: string }) {
  const dx = end[0] - start[0];
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;
  const midZ = (start[2] + end[2]) / 2;
  const length = Math.sqrt(dx * dx);

  return (
    <mesh position={[midX, midY, midZ]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.035, 0.035, length, 8]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.55}
        emissive={color}
        emissiveIntensity={0.4}
        roughness={0.3}
        metalness={0.6}
      />
    </mesh>
  );
}

function FlowParticle({ pipe, color, offset }: { pipe: typeof PIPE_CONFIGS[0]; color: string; offset: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = ((state.clock.getElapsedTime() * 0.4 + offset) % 1);
    ref.current.position.x = pipe.start[0] + (pipe.end[0] - pipe.start[0]) * t;
    ref.current.position.y = pipe.start[1];
    ref.current.position.z = pipe.start[2];
    // Fade in/out at ends
    const alpha = t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1;
    (ref.current.material as THREE.MeshBasicMaterial).opacity = alpha * 0.8;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.028, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} toneMapped={false} />
    </mesh>
  );
}

function DrainageLayer() {
  const particles = useMemo(() =>
    PIPE_CONFIGS.flatMap((pipe, pi) =>
      Array.from({ length: 5 }, (_, i) => ({ pipe, color: pipe.color, offset: (pi * 5 + i) / 5 * 0.2 + i * 0.2, key: `${pi}-${i}` }))
    ), []);

  return (
    <group>
      {PIPE_CONFIGS.map((p, i) => <DrainagePipe key={i} {...p} />)}
      {particles.map(({ pipe, color, offset, key }) => (
        <FlowParticle key={key} pipe={pipe} color={color} offset={offset} />
      ))}
    </group>
  );
}

// ── Asphalt Repair Layer ─────────────────────────────────────

const REPAIR_PATCHES = [
  { position: [-0.6, 0.04, 0.2] as [number,number,number], size: [0.7, 0.02, 0.5] as [number,number,number] },
  { position: [ 0.8, 0.04, -0.3] as [number,number,number], size: [0.55, 0.02, 0.4] as [number,number,number] },
  { position: [-1.1, 0.04, -0.5] as [number,number,number], size: [0.45, 0.02, 0.35] as [number,number,number] },
];

function RepairLayer() {
  const pulseRef = useRef(0);

  useFrame((state) => {
    pulseRef.current = 0.15 + Math.sin(state.clock.getElapsedTime() * 1.8) * 0.05;
  });

  return (
    <group>
      {REPAIR_PATCHES.map((patch, i) => (
        <mesh key={i} position={patch.position}>
          <boxGeometry args={patch.size} />
          <meshStandardMaterial
            color="#34d399"
            transparent
            opacity={0.18}
            emissive="#34d399"
            emissiveIntensity={0.25}
            roughness={0.7}
            wireframe={false}
          />
        </mesh>
      ))}
      {/* Repair patch wireframe outlines for visual clarity */}
      {REPAIR_PATCHES.map((patch, i) => (
        <mesh key={`wf-${i}`} position={patch.position}>
          <boxGeometry args={[patch.size[0] + 0.01, patch.size[1] + 0.01, patch.size[2] + 0.01]} />
          <meshBasicMaterial color="#34d399" transparent opacity={0.35} wireframe />
        </mesh>
      ))}
    </group>
  );
}

// ── Pothole Layer ────────────────────────────────────────────

const POTHOLE_POSITIONS: [number, number, number][] = [
  [0.3,  0.0, 0.5],
  [-0.9, 0.0, -0.2],
  [1.2,  0.0, 0.0],
];

function PotholeRing({ position, delay }: { position: [number,number,number]; delay: number }) {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = (state.clock.getElapsedTime() + delay) % 2;
    const scale = 0.3 + t * 0.8;
    const opacity = Math.max(0, 0.6 - t * 0.3);
    if (ring1Ref.current) {
      ring1Ref.current.scale.set(scale, scale, scale);
      (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
    if (ring2Ref.current) {
      const t2 = ((state.clock.getElapsedTime() + delay + 1) % 2);
      const scale2 = 0.3 + t2 * 0.8;
      ring2Ref.current.scale.set(scale2, scale2, scale2);
      (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.6 - t2 * 0.3);
    }
  });

  return (
    <group position={position}>
      {/* Pothole cavity (depressed dark area) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[0.18, 16]} />
        <meshStandardMaterial color="#0a0a0a" roughness={1} transparent opacity={0.85} />
      </mesh>
      {/* Crack ring 1 */}
      <mesh ref={ring1Ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.17, 0.21, 24]} />
        <meshBasicMaterial color="#f43f5e" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Crack ring 2 (staggered) */}
      <mesh ref={ring2Ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.17, 0.21, 24]} />
        <meshBasicMaterial color="#f43f5e" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Central glowing core */}
      <mesh position={[0, 0.01, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial color="#f43f5e" transparent opacity={0.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

function PotholeLayer() {
  return (
    <group>
      {POTHOLE_POSITIONS.map((pos, i) => (
        <PotholeRing key={i} position={pos} delay={i * 0.65} />
      ))}
    </group>
  );
}

// ── Stress Wave Layer ────────────────────────────────────────

const STRESS_ZONES: [number, number, number][] = [
  [-0.5, 0.02, 0.1],
  [0.9,  0.02, -0.5],
];

function StressWave({ position, delay }: { position: [number,number,number]; delay: number }) {
  const refs = [
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
  ];

  useFrame((state) => {
    refs.forEach((ref, i) => {
      if (!ref.current) return;
      const t = ((state.clock.getElapsedTime() * 0.5 + delay + i * 0.5) % 1.5);
      const scale = 0.2 + t * 1.4;
      const opacity = Math.max(0, 0.5 - t * 0.33);
      ref.current.scale.set(scale, scale, scale);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = opacity;
    });
  });

  return (
    <group position={position}>
      {refs.map((ref, i) => (
        <mesh key={i} ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.36, 32]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function StressLayer() {
  return (
    <group>
      {STRESS_ZONES.map((pos, i) => (
        <StressWave key={i} position={pos} delay={i * 0.9} />
      ))}
    </group>
  );
}

// ── Main Pavement Model ──────────────────────────────────────

function PavementModel({ layers }: { layers: LayerState }) {
  const { scene } = useGLTF('/3d/roadInspection.glb');
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 1.1) * 0.12 - 0.3;
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.08;
    }
  });

  useEffect(() => {
    scene.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        if (node.material && 'color' in node.material) {
          const mat = node.material as THREE.MeshStandardMaterial;
          mat.roughness = 0.88;
          mat.metalness = 0.15;
        }
      }
    });
  }, [scene]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={0.9} position={[0, -0.4, 0]} />

      {/* Diagnostic Overlay Layers */}
      {layers.drainage && <DrainageLayer />}
      {layers.repair    && <RepairLayer />}
      {layers.potholes  && <PotholeLayer />}
      {layers.stress    && <StressLayer />}

      {/* Sensor nodes */}
      {layers.sensors && (
        <>
          <SensorPoint
            position={[-1.1, 0.25, 0.6]}
            label="Telemetry Node A-01"
            details="Structural deflection index: 0.24mm. Sub-base structural stress: NORMAL."
            status="active"
          />
          <SensorPoint
            position={[0.1, 0.35, -0.8]}
            label="Telemetry Node B-04"
            details="Moisture infiltration ratio: 42%. Water logging risk: ELEVATED."
            status="warning"
          />
          <SensorPoint
            position={[1.2, 0.15, 0.3]}
            label="Telemetry Node C-02"
            details="Surface shear crack detected. Asphalt integrity: CRITICAL FAULT."
            status="critical"
          />
        </>
      )}
    </group>
  );
}

// ── Cinematic Camera ─────────────────────────────────────────

function CinematicCamera() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame(() => {
    camera.position.x += (mouse.current.x * 1.8 - camera.position.x) * 0.04;
    camera.position.y += (mouse.current.y * 1.2 + 3.2 - camera.position.y) * 0.04;
    camera.lookAt(0, -0.25, 0);
  });

  return null;
}

// ── Loader Fallback ──────────────────────────────────────────

function SceneLoader() {
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center gap-3 select-none pointer-events-none w-36">
        <div className="w-8 h-8 rounded-full border-2 border-border border-t-cyan-500 animate-spin" />
        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground animate-pulse">
          Loading GIS Scene...
        </span>
      </div>
    </Html>
  );
}

// ── Layer Toggle HUD ─────────────────────────────────────────

interface LayerToggleProps {
  layers: LayerState;
  onToggle: (key: keyof LayerState) => void;
}

const LAYER_DEFS: { key: keyof LayerState; label: string; color: string; shortLabel: string }[] = [
  { key: 'sensors',  label: 'Sensor Nodes',    color: '#22d3ee', shortLabel: 'SENSORS'  },
  { key: 'drainage', label: 'Drainage Flow',   color: '#38bdf8', shortLabel: 'DRAIN'    },
  { key: 'repair',   label: 'Repair Patches',  color: '#34d399', shortLabel: 'REPAIR'   },
  { key: 'potholes', label: 'Pothole Map',     color: '#f43f5e', shortLabel: 'POTHOLES' },
  { key: 'stress',   label: 'Stress Zones',    color: '#f59e0b', shortLabel: 'STRESS'   },
];

function LayerToggleHUD({ layers, onToggle }: LayerToggleProps) {
  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 pointer-events-auto">
      <div className="mb-1 px-2">
        <span className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-400/70">
          Diagnostic Layers
        </span>
      </div>
      {LAYER_DEFS.map(({ key, label, color, shortLabel }) => {
        const active = layers[key];
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all duration-200 backdrop-blur-md ${
              active
                ? 'bg-black/60 border-white/10 text-slate-200'
                : 'bg-black/30 border-white/[0.04] text-[#55555f]'
            }`}
            style={active ? { borderColor: `${color}40`, boxShadow: `0 0 8px ${color}15` } : {}}
          >
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-200 ${active ? 'opacity-100' : 'opacity-30'}`}
              style={{ backgroundColor: color, boxShadow: active ? `0 0 6px ${color}` : 'none' }}
            />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Root Export ──────────────────────────────────────────────

export default function RoadInspectionScene() {
  const [layers, setLayers] = useState<LayerState>({
    sensors:  true,
    drainage: true,
    repair:   false,
    potholes: true,
    stress:   false,
  });

  const toggleLayer = (key: keyof LayerState) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="w-full h-full relative select-none">
      {/* Layer toggle HUD */}
      <LayerToggleHUD layers={layers} onToggle={toggleLayer} />

      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 3.2, 4], fov: 45 }}
        className="w-full h-full"
      >
        {/* Lighting */}
        <ambientLight intensity={0.22} />
        <hemisphereLight color="#1e1b4b" groundColor="#09090b" intensity={0.4} />
        <directionalLight
          position={[6, 8, 4]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0001}
        />
        <pointLight position={[-4, 4, -4]} intensity={0.6} color="#38bdf8" />
        {/* Warm accent from below */}
        <pointLight position={[0, -2, 0]} intensity={0.3} color="#7c3aed" />

        <Suspense fallback={<SceneLoader />}>
          <PavementModel layers={layers} />
        </Suspense>

        <CinematicCamera />

        <OrbitControls
          enableZoom={true}
          enablePan={false}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={2.5}
          maxDistance={8}
        />
      </Canvas>

      {/* Live HUD badge */}
      <div className="absolute bottom-4 right-4 bg-slate-950/80 backdrop-blur-md border border-white/5 py-1.5 px-3 rounded-lg pointer-events-none select-none">
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-350 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
          Interactive HUD Active
        </span>
      </div>
    </div>
  );
}
