'use client';

import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';

// Pre-load model to prevent latency spikes during view activation
useGLTF.preload('/3d/roadInspection.glb');

interface SensorPointProps {
  position: [number, number, number];
  label: string;
  details: string;
  status: 'active' | 'warning' | 'critical';
}

function SensorPoint({ position, label, details, status }: SensorPointProps) {
  const [hovered, setHovered] = useState(false);
  const haloRef = useRef<THREE.Mesh>(null);

  // Set colors matching our zinc/desaturated platform theme
  const getStatusColor = () => {
    switch (status) {
      case 'active': return '#10b981'; // Emerald 500
      case 'warning': return '#f59e0b'; // Amber 500
      case 'critical': return '#f43f5e'; // Rose 500
      default: return '#71717a';
    }
  };

  const statusColor = getStatusColor();

  // Pulse effect animation for the outer halo circle
  useFrame((state) => {
    if (haloRef.current) {
      const pulse = 1.0 + Math.sin(state.clock.getElapsedTime() * 6.5) * 0.25;
      haloRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group position={position}>
      {/* Outer pulsing visual halo indicator */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshBasicMaterial 
          color={statusColor} 
          transparent 
          opacity={hovered ? 0.35 : 0.15} 
        />
      </mesh>

      {/* Center solid core interactive target */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshBasicMaterial 
          color={hovered ? '#ffffff' : statusColor} 
          toneMapped={false}
        />
      </mesh>

      {/* Interactive Tooltip HUD Panel */}
      {hovered && (
        <Html distanceFactor={4.5} center>
          <div className="glass-panel p-3 rounded-xl border border-white/5 shadow-2xl text-left text-[9px] w-48 text-slate-100 pointer-events-none select-none z-50 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-1.5 border-b border-border/40 pb-1">
              <span className="font-extrabold uppercase tracking-widest text-[8px] text-cyan-400">{label}</span>
              <span className={`text-[7px] font-black uppercase px-1.5 py-0.2 rounded border ${
                status === 'active' ? 'text-emerald-400 border-emerald-950/60 bg-emerald-950/20' :
                status === 'warning' ? 'text-amber-400 border-amber-950/60 bg-amber-950/20' :
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

function PavementModel() {
  const { scene } = useGLTF('/3d/roadInspection.glb');
  const groupRef = useRef<THREE.Group>(null);

  // Apply continuous float and auto-rotate physics loops
  useFrame((state) => {
    if (groupRef.current) {
      // Gentle vertical hover float
      groupRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 1.1) * 0.15 - 0.3;
      // Slow orbital rotate
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.1;
    }
  });

  // Deep clone geometries to prevent sharing material mutations across page lifecycles
  useEffect(() => {
    scene.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        // Desaturate texture materials to align with Matte Carbon platform design
        if (node.material && 'color' in node.material) {
          const mat = node.material as THREE.MeshStandardMaterial;
          mat.roughness = 0.85;
          mat.metalness = 0.2;
        }
      }
    });
  }, [scene]);

  return (
    <group ref={groupRef}>
      {/* Primitive Loader */}
      <primitive 
        object={scene} 
        scale={0.9} 
        position={[0, -0.4, 0]} 
      />

      {/* Sensor Point Nodes Overlay on the GLB Surface */}
      <SensorPoint 
        position={[-1.1, 0.25, 0.6]} 
        label="Telemetry Node A-01" 
        details="Structural deflection index: 0.24mm. Sub-base structural stress level: NORMAL." 
        status="active" 
      />
      <SensorPoint 
        position={[0.1, 0.35, -0.8]} 
        label="Telemetry Node B-04" 
        details="Moisture infiltration ratio: 42%. Water logging danger risk: ELEVATED." 
        status="warning" 
      />
      <SensorPoint 
        position={[1.2, 0.15, 0.3]} 
        label="Telemetry Node C-02" 
        details="Surface shear crack detected. Local asphalt integrity: CRITICAL FAULT." 
        status="critical" 
      />
    </group>
  );
}

function CinematicCamera() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates [-1, 1]
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame(() => {
    // Parallax interpolation towards cursor to create next-gen GIS feel
    camera.position.x += (mouse.current.x * 1.8 - camera.position.x) * 0.04;
    camera.position.y += (mouse.current.y * 1.2 + 3.2 - camera.position.y) * 0.04;
    camera.lookAt(0, -0.25, 0);
  });

  return null;
}

function SceneLoader() {
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center gap-3 select-none pointer-events-none w-36">
        {/* Blinking loader ring */}
        <div className="w-8 h-8 rounded-full border-2 border-border border-t-cyan-500 animate-spin"></div>
        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground animate-pulse">
          Loading GIS Scene...
        </span>
      </div>
    </Html>
  );
}

export default function RoadInspectionScene() {
  return (
    <div className="w-full h-full relative select-none">
      {/* 3D R3F Canvas view */}
      <Canvas
        shadows
        camera={{ position: [0, 3.2, 4], fov: 45 }}
        className="w-full h-full"
      >
        {/* Soft Ambient Fill Light */}
        <ambientLight intensity={0.25} />
        
        {/* Sky Fill Light */}
        <hemisphereLight 
          color="#1e1b4b" 
          groundColor="#09090b" 
          intensity={0.4} 
        />
        
        {/* Cinematic Main Directional Shadow Caster */}
        <directionalLight
          position={[6, 8, 4]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0001}
        />
        
        {/* Glowing Accent Point Light */}
        <pointLight 
          position={[-4, 4, -4]} 
          intensity={0.6} 
          color="#38bdf8" 
        />

        <Suspense fallback={<SceneLoader />}>
          <PavementModel />
        </Suspense>

        <CinematicCamera />
        
        <OrbitControls 
          enableZoom={true} 
          enablePan={false}
          maxPolarAngle={Math.PI / 2 - 0.05} // Restrain angle to stay above road plane
          minDistance={2.5}
          maxDistance={7}
        />
      </Canvas>

      {/* UI overlay badge for aesthetics */}
      <div className="absolute bottom-4 right-4 bg-slate-950/80 backdrop-blur-md border border-white/5 py-1.5 px-3 rounded-lg pointer-events-none select-none">
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-350 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping"></span>
          Interactive HUD Active
        </span>
      </div>
    </div>
  );
}
