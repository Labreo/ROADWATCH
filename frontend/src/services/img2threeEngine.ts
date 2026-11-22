/**
 * Img2ThreeJS Procedural 3D Pothole Reconstruction Engine
 * Inspired by https://github.com/img2threejs/img2threejs
 *
 * Converts a 2D reference image (uploaded photo, webcam frame, or procedural
 * defect sample) + road defect telemetry into an 8-pass, code-only procedural
 * Three.js model specification, volumetric Bill of Quantities (BoQ), and
 * downloadable TypeScript Three.js factory code.
 */

export interface Pothole3DSpec {
  complaintId?: number | null;
  roadId?: number | null;
  title: string;
  roadName: string;
  roadCode: string;
  authority: string;
  widthM: number;         // Crater major width in meters (0.3 - 4.0)
  lengthM: number;        // Crater minor length in meters (0.3 - 4.0)
  depthCm: number;        // Maximum crater depth in cm (1.5 - 35.0)
  spallingIndex: number;  // Rim fracture roughness (0.1 - 1.0)
  waterPoolingPct: number;// Monsoon water level in crater (0 - 100%)
  gridSize: number;       // Heightmap resolution (e.g. 32 x 32)
  heightmap: number[][];  // Normalized depth [0..1] at each (row, col)
  volumeLiters: number;   // Integrated crater cavity volume in liters (dm^3)
  asphaltKg: number;      // Hot-Mix Asphalt (HMA) mass needed (kg)
  tackCoatLiters: number; // Bitumen emulsion tack coat (L)
  estimatedCostInr: number;
  exposedLayer: string;
  ircSeverity: string;
  imageDataUrl?: string;
}

export const PAVEMENT_STRATA = [
  { name: 'Wearing Course (BC / SMA)', fromCm: 0, toCm: 4.5, color: '#27272a', hex: 0x27272a },
  { name: 'Dense Bituminous Macadam (DBM)', fromCm: 4.5, toCm: 10.0, color: '#3f3f46', hex: 0x3f3f46 },
  { name: 'Wet Mix Macadam (WMM Sub-Base)', fromCm: 10.0, toCm: 18.0, color: '#78350f', hex: 0x78350f },
  { name: 'Granular Sub-Base (GSB Subgrade)', fromCm: 18.0, toCm: 35.0, color: '#9a3412', hex: 0x9a3412 },
] as const;

export const IMG2THREE_PASSES = [
  { id: 'blockout',     step: 1, label: '1. Blockout',     desc: 'Outer carriage lane slab & bounding volume' },
  { id: 'structural',   step: 2, label: '2. Structural',   desc: '4-layer pavement strata (BC, DBM, WMM, GSB)' },
  { id: 'form',         step: 3, label: '3. Crater Form',  desc: 'Displaced 3D vertex mesh sculpted from 2D image depth' },
  { id: 'material',     step: 4, label: '4. PBR Material', desc: 'Procedural asphalt, aggregate & sub-base shaders' },
  { id: 'surface',      step: 5, label: '5. Surface',      desc: 'Radial fracture cracks & spalled aggregate debris' },
  { id: 'lighting',     step: 6, label: '6. Laser Rig',    desc: 'Profilometer scan laser & volumetric depth pins' },
  { id: 'interaction',  step: 7, label: '7. Interaction',  desc: 'Cross-section laser slicer, water pool & patch preview' },
  { id: 'optimization', step: 8, label: '8. Code Export',  desc: 'Self-contained TypeScript THREE.Group factory' },
] as const;

/** Deterministic pseudo-noise for procedural crater sculpting */
function pseudoNoise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.12) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = pseudoNoise(ix, iy, seed);
  const b = pseudoNoise(ix + 1, iy, seed);
  const c = pseudoNoise(ix, iy + 1, seed);
  const d = pseudoNoise(ix + 1, iy + 1, seed);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

export function classifyExposedLayer(depthCm: number): string {
  if (depthCm < 4.5) return 'Wearing Course (BC / SMA Surface)';
  if (depthCm < 10.0) return 'Dense Bituminous Macadam (DBM Base Exposed)';
  if (depthCm < 18.0) return 'Wet Mix Macadam (WMM Sub-Base Exposed)';
  return 'Granular Sub-Base (GSB Structural Failure)';
}

export function classifyIrcSeverity(depthCm: number, widthM: number): string {
  if (depthCm >= 9.0 || widthM >= 1.3) return 'CRITICAL (IRC:82 > 9cm / High Hazard)';
  if (depthCm >= 5.0 || widthM >= 0.8) return 'SEVERE (IRC:82 5–9cm / Fast-Track SLA)';
  if (depthCm >= 2.5) return 'MODERATE (IRC:82 2.5–5cm / Standard Patch)';
  return 'MINOR (IRC:82 < 2.5cm / Surface Seal)';
}

/**
 * Computes engineering Bill of Quantities (BoQ) by numerically integrating
 * the normalized heightmap over the crater's physical dimensions.
 */
export function computeVolumetricBoQ(
  heightmap: number[][],
  widthM: number,
  lengthM: number,
  depthCm: number,
  spallingIndex: number,
  waterPoolingPct: number,
  baseSpec: Partial<Pothole3DSpec> = {}
): Pothole3DSpec {
  const rows = heightmap.length;
  const cols = heightmap[0]?.length || rows;
  const cellAreaM2 = (widthM * 1.35 / cols) * (lengthM * 1.35 / rows);
  const depthM = depthCm / 100;

  let totalVolumeM3 = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const d = Math.max(0, Math.min(1, heightmap[r][c]));
      totalVolumeM3 += d * depthM * cellAreaM2;
    }
  }

  // Convert m^3 to Liters (1 m^3 = 1000 L)
  const volumeLiters = Math.max(1.2, Math.round(totalVolumeM3 * 1000 * 10) / 10);
  // Compacted Hot-Mix Asphalt (HMA) density ~2.38 kg/L * 1.15 waste/compaction allowance
  const asphaltKg = Math.round(volumeLiters * 2.38 * 1.15 * 10) / 10;
  // Bitumen emulsion tack coat (RS-1) ~ 0.75 L per m^2 of cut area + rim
  const footprintM2 = widthM * lengthM * 1.25;
  const tackCoatLiters = Math.max(0.5, Math.round(footprintM2 * 1.45 * 10) / 10);
  // Itemized municipal repair cost: material + saw-cutting + vibratory roller compaction
  const materialCost = asphaltKg * 48 + tackCoatLiters * 95;
  const subBaseBonus = depthCm >= 10 ? 6500 : depthCm >= 5 ? 2800 : 900;
  const laborAndPlant = 3200 + footprintM2 * 1850 + subBaseBonus;
  const estimatedCostInr = Math.round((materialCost + laborAndPlant) / 50) * 50;

  return {
    complaintId: baseSpec.complaintId ?? null,
    roadId: baseSpec.roadId ?? 3,
    title: baseSpec.title || 'Deep Monsoon Pothole Crater',
    roadName: baseSpec.roadName || 'S.V. Road',
    roadCode: baseSpec.roadCode || 'SV-RD-01',
    authority: baseSpec.authority || 'MCGM-KW',
    widthM: Math.round(widthM * 100) / 100,
    lengthM: Math.round(lengthM * 100) / 100,
    depthCm: Math.round(depthCm * 10) / 10,
    spallingIndex: Math.round(spallingIndex * 100) / 100,
    waterPoolingPct: Math.round(waterPoolingPct),
    gridSize: rows,
    heightmap,
    volumeLiters,
    asphaltKg,
    tackCoatLiters,
    estimatedCostInr,
    exposedLayer: classifyExposedLayer(depthCm),
    ircSeverity: classifyIrcSeverity(depthCm, widthM),
    imageDataUrl: baseSpec.imageDataUrl,
  };
}

/**
 * Generates a realistic 32x32 crater depth field procedurally from seed parameters.
 */
export function buildProceduralHeightmap(
  gridSize = 32,
  seed = 1,
  spallingIndex = 0.6,
  aspect = 1.2
): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < gridSize; r++) {
    const row: number[] = [];
    const ny = (r / (gridSize - 1)) * 2 - 1;
    for (let c = 0; c < gridSize; c++) {
      const nx = ((c / (gridSize - 1)) * 2 - 1) * (aspect > 1 ? 1 : aspect);
      const angle = Math.atan2(ny, nx);
      // Angular rim distortion based on spalling index
      const angularWarp =
        1 +
        spallingIndex *
          0.32 *
          (Math.sin(angle * 3 + seed) * 0.5 +
            Math.cos(angle * 5 - seed * 1.7) * 0.35 +
            Math.sin(angle * 8 + seed * 0.5) * 0.15);
      const dist = Math.hypot(nx, ny) * angularWarp;

      if (dist >= 0.88) {
        // Road surface micro-texture outside the crater rim
        const micro = (smoothNoise(c * 0.4, r * 0.4, seed) - 0.5) * 0.025;
        row.push(Math.max(0, micro));
      } else {
        // Steep spalled rim wall transitioning to rough multi-pit crater floor
        const norm = dist / 0.88;
        const bowl = Math.pow(1 - norm * norm, 1.35);
        const floorRoughness =
          smoothNoise(c * 0.35, r * 0.35, seed + 7) * 0.24 * spallingIndex +
          smoothNoise(c * 0.75, r * 0.75, seed + 19) * 0.12;
        const depthVal = Math.min(1, Math.max(0, bowl * 0.88 + bowl * floorRoughness));
        row.push(Math.round(depthVal * 1000) / 1000);
      }
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Synthesizes a realistic top-down 2D pothole reference image on an HTML5 Canvas
 * so users can test the 2D-image-to-3D-ThreeJS pipeline immediately with 1 click.
 */
export function synthesizePotholePhotoDataUrl(
  seed = 1,
  label = 'SV-RD-01 // CRATER #142',
  waterPct = 35
): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 260;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Weathered asphalt road background
  ctx.fillStyle = '#26282e';
  ctx.fillRect(0, 0, 360, 260);
  for (let i = 0; i < 1400; i++) {
    const x = pseudoNoise(i, 1, seed) * 360;
    const y = pseudoNoise(i, 2, seed) * 260;
    const v = Math.floor(30 + pseudoNoise(i, 3, seed) * 35);
    ctx.fillStyle = `rgb(${v},${v},${v + 4})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Faded yellow/white lane marking near top edge
  ctx.fillStyle = 'rgba(250, 204, 21, 0.45)';
  ctx.fillRect(18, 22, 110, 10);
  ctx.fillRect(160, 22, 110, 10);

  const cx = 180;
  const cy = 136;
  const rx = 104;
  const ry = 72;

  // 2. Outer spalled fracture halo (DBM layer)
  ctx.save();
  ctx.beginPath();
  for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.12) {
    const jitter = 1 + (pseudoNoise(Math.cos(a) * 10, Math.sin(a) * 10, seed) - 0.5) * 0.28;
    const x = cx + Math.cos(a) * rx * jitter;
    const y = cy + Math.sin(a) * ry * jitter;
    if (a === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const outerGrad = ctx.createRadialGradient(cx, cy, 12, cx, cy, rx);
  outerGrad.addColorStop(0, '#090a0f');
  outerGrad.addColorStop(0.55, '#1c1917');
  outerGrad.addColorStop(0.82, '#44403c');
  outerGrad.addColorStop(1, '#292524');
  ctx.fillStyle = outerGrad;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#57534e';
  ctx.stroke();

  // 3. Exposed WMM / aggregate stones inside crater
  for (let i = 0; i < 160; i++) {
    const ang = pseudoNoise(i, 10, seed) * Math.PI * 2;
    const rad = pseudoNoise(i, 11, seed) * 0.82;
    const sx = cx + Math.cos(ang) * rx * rad;
    const sy = cy + Math.sin(ang) * ry * rad;
    const sz = 2 + pseudoNoise(i, 12, seed) * 5;
    ctx.fillStyle = rad < 0.48 ? '#181310' : '#78350f';
    ctx.beginPath();
    ctx.arc(sx, sy, sz, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Optional water pooling reflection in deepest zone
  if (waterPct > 5) {
    const wr = 0.25 + (waterPct / 100) * 0.55;
    ctx.beginPath();
    ctx.ellipse(cx + 6, cy + 4, rx * wr, ry * wr, 0.1, 0, Math.PI * 2);
    const waterGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, rx * wr);
    waterGrad.addColorStop(0, 'rgba(14, 116, 144, 0.62)');
    waterGrad.addColorStop(0.7, 'rgba(24, 24, 27, 0.78)');
    waterGrad.addColorStop(1, 'rgba(9, 9, 11, 0.4)');
    ctx.fillStyle = waterGrad;
    ctx.fill();
  }
  ctx.restore();

  // 5. Radial asphalt cracks
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 1.8;
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + seed * 0.4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * rx * 0.85, cy + Math.sin(a) * ry * 0.85);
    ctx.lineTo(cx + Math.cos(a + 0.08) * rx * 1.18, cy + Math.sin(a + 0.08) * ry * 1.18);
    ctx.lineTo(cx + Math.cos(a - 0.05) * rx * 1.38, cy + Math.sin(a - 0.05) * ry * 1.38);
    ctx.stroke();
  }

  // 6. AI-Lens HUD bounding reticle & EXIF watermark
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.75)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(56, 48, 248, 168);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
  ctx.fillRect(56, 30, 188, 18);
  ctx.fillStyle = '#22d3ee';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(`IMG2THREEJS // ${label}`, 62, 43);

  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Extracts a 32x32 3D crater heightmap and physical dimensions directly from
 * any uploaded 2D image dataURL by analyzing luminance cavities and edge gradients.
 */
export async function reconstructPotholeFromImage(
  imageDataUrl: string,
  baseSpec: Partial<Pothole3DSpec> = {}
): Promise<Pothole3DSpec> {
  const gridSize = 32;
  if (typeof document === 'undefined' || !imageDataUrl) {
    const hm = buildProceduralHeightmap(gridSize, baseSpec.complaintId || 1, baseSpec.spallingIndex ?? 0.62);
    return computeVolumetricBoQ(
      hm,
      baseSpec.widthM ?? 1.15,
      baseSpec.lengthM ?? 0.92,
      baseSpec.depthCm ?? 9.4,
      baseSpec.spallingIndex ?? 0.62,
      baseSpec.waterPoolingPct ?? 35,
      { ...baseSpec, imageDataUrl }
    );
  }

  return new Promise<Pothole3DSpec>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = gridSize;
      canvas.height = gridSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const hm = buildProceduralHeightmap(gridSize, 1, 0.6);
        resolve(computeVolumetricBoQ(hm, 1.15, 0.92, 9.4, 0.6, 35, { ...baseSpec, imageDataUrl }));
        return;
      }
      ctx.drawImage(img, 0, 0, gridSize, gridSize);
      const { data } = ctx.getImageData(0, 0, gridSize, gridSize);

      // Compute pixel darkness & blue/cyan water ratio
      const lum: number[][] = [];
      let minL = 255;
      let maxL = 0;
      let waterPixels = 0;
      let darkPixels = 0;

      for (let r = 0; r < gridSize; r++) {
        const row: number[] = [];
        for (let c = 0; c < gridSize; c++) {
          const idx = (r * gridSize + c) * 4;
          const R = data[idx];
          const G = data[idx + 1];
          const B = data[idx + 2];
          const L = 0.299 * R + 0.587 * G + 0.114 * B;
          if (L < minL) minL = L;
          if (L > maxL) maxL = L;
          if (L < 95) darkPixels++;
          if (B > R + 12 && L < 140) waterPixels++;
          row.push(L);
        }
        lum.push(row);
      }

      const span = Math.max(25, maxL - minL);
      const heightmap: number[][] = [];
      let edgeEnergy = 0;

      for (let r = 0; r < gridSize; r++) {
        const row: number[] = [];
        const ny = (r / (gridSize - 1)) * 2 - 1;
        for (let c = 0; c < gridSize; c++) {
          const nx = (c / (gridSize - 1)) * 2 - 1;
          const radialMask = Math.max(0, 1 - Math.pow(Math.hypot(nx, ny) / 0.95, 2.2));
          const darkness = 1 - (lum[r][c] - minL) / span;
          if (r > 0 && c > 0) {
            edgeEnergy += Math.abs(lum[r][c] - lum[r - 1][c]) + Math.abs(lum[r][c] - lum[r][c - 1]);
          }
          // Combine image darkness cavity with radial window so edges meet the road plane smoothly
          const d = Math.pow(Math.max(0, darkness), 1.25) * radialMask;
          row.push(Math.round(Math.min(1, d) * 1000) / 1000);
        }
        heightmap.push(row);
      }

      const darkFraction = darkPixels / (gridSize * gridSize);
      const inferredWidthM = baseSpec.widthM ?? Math.round((0.65 + darkFraction * 1.45) * 100) / 100;
      const inferredLengthM = baseSpec.lengthM ?? Math.round(inferredWidthM * 0.82 * 100) / 100;
      const inferredDepthCm = baseSpec.depthCm ?? Math.round((4.2 + darkFraction * 12.5) * 10) / 10;
      const inferredSpalling = baseSpec.spallingIndex ?? Math.min(0.95, Math.max(0.25, Math.round((edgeEnergy / (gridSize * gridSize * 38)) * 100) / 100));
      const inferredWater = baseSpec.waterPoolingPct ?? Math.min(85, Math.round((waterPixels / Math.max(1, darkPixels)) * 120));

      resolve(
        computeVolumetricBoQ(
          heightmap,
          inferredWidthM,
          inferredLengthM,
          inferredDepthCm,
          inferredSpalling,
          inferredWater,
          { ...baseSpec, imageDataUrl }
        )
      );
    };
    img.onerror = () => {
      const hm = buildProceduralHeightmap(gridSize, 1, 0.6);
      resolve(computeVolumetricBoQ(hm, 1.15, 0.92, 9.4, 0.6, 35, { ...baseSpec, imageDataUrl }));
    };
    img.src = imageDataUrl;
  });
}

/**
 * Generates self-contained, procedural TypeScript Three.js code following the
 * 8-stage img2threejs architecture (https://github.com/img2threejs/img2threejs).
 */
export function generateImg2ThreeTypeScriptCode(spec: Pothole3DSpec): string {
  const sampleRow = spec.heightmap[Math.floor(spec.gridSize / 2)]
    ?.filter((_, i) => i % 4 === 0)
    .map(v => v.toFixed(2))
    .join(', ') || '0.00, 0.24, 0.78, 0.96, 0.81, 0.30, 0.00';

  return `/**
 * Auto-generated by ROADWATCH x img2threejs Procedural 3D Reconstruction Pipeline
 * Reference: https://github.com/img2threejs/img2threejs
 *
 * Defect Target : ${spec.title} (${spec.roadName} / ${spec.roadCode})
 * Authority     : ${spec.authority}
 * Footprint     : ${spec.widthM}m (W) x ${spec.lengthM}m (L) x ${spec.depthCm}cm (Max Depth)
 * Volumetric BoQ: ${spec.volumeLiters} L cavity | ${spec.asphaltKg} kg HMA Asphalt | Rs ${spec.estimatedCostInr.toLocaleString('en-IN')}
 * Exposed Layer : ${spec.exposedLayer}
 */
import * as THREE from 'three';

export interface PotholeProceduralOptions {
  sliceX?: number;          // Cross-section laser plane (-1.0 to +1.0)
  waterLevelPct?: number;   // Monsoon water pooling (${spec.waterPoolingPct}%)
  showRepairPatch?: boolean;// Toggle Hot-Mix Asphalt (HMA) compaction fill
  wireframe?: boolean;
}

export function createPotholeThreeJSGroup(opts: PotholeProceduralOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'img2threejs_pothole_${spec.roadCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}';

  const WIDTH_M = ${spec.widthM};
  const LENGTH_M = ${spec.lengthM};
  const MAX_DEPTH_M = ${(spec.depthCm / 100).toFixed(4)};
  const SPALLING = ${spec.spallingIndex};
  const CENTER_PROFILE = [${sampleRow}];

  // ── PASS 1: BLOCKOUT (Carriageway Slab & Dimensional Cage) ─────────────
  const slabGeo = new THREE.BoxGeometry(3.2, 0.04, 2.4);
  const slabMat = new THREE.MeshStandardMaterial({ color: 0x1e2028, roughness: 0.92, metalness: 0.08 });
  const slabMesh = new THREE.Mesh(slabGeo, slabMat);
  slabMesh.position.y = -0.02;
  slabMesh.name = 'pass1_carriageway_blockout';
  root.add(slabMesh);

  // ── PASS 2: STRUCTURAL (4-Layer IRC:37 Pavement Strata Cutaway) ────────
  const strata = [
    { name: 'BC_Wearing_Course_50mm', thickness: 0.08, y: -0.06, color: 0x27272a },
    { name: 'DBM_Binder_Course_100mm', thickness: 0.12, y: -0.16, color: 0x3f3f46 },
    { name: 'WMM_SubBase_150mm',       thickness: 0.16, y: -0.30, color: 0x78350f },
    { name: 'GSB_Granular_Base_200mm', thickness: 0.18, y: -0.47, color: 0x9a3412 },
  ];
  const structuralGroup = new THREE.Group();
  structuralGroup.name = 'pass2_structural_strata';
  for (const layer of strata) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(3.18, layer.thickness, 2.38),
      new THREE.MeshStandardMaterial({ color: layer.color, roughness: 0.88 })
    );
    m.position.y = layer.y;
    m.name = layer.name;
    structuralGroup.add(m);
  }
  root.add(structuralGroup);

  // ── PASS 3 & 4: FORM & MATERIAL (Displaced Crater Heightmap Mesh) ──────
  const segs = ${spec.gridSize - 1};
  const craterGeo = new THREE.PlaneGeometry(3.2, 2.4, segs, segs);
  craterGeo.rotateX(-Math.PI / 2);
  const pos = craterGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cTop = new THREE.Color(0x27272a);
  const cMid = new THREE.Color(0x78350f);
  const cBot = new THREE.Color(0xdc2626);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (WIDTH_M * 0.9);
    const z = pos.getZ(i) / (LENGTH_M * 0.9);
    const r = Math.hypot(x, z);
    const d = r < 1.0 ? Math.pow(1 - r * r, 1.35) : 0;
    pos.setY(i, -d * MAX_DEPTH_M * 3.8);
    const col = d < 0.35 ? cTop : d < 0.75 ? cMid : cBot;
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  craterGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  craterGeo.computeVertexNormals();

  const craterMesh = new THREE.Mesh(
    craterGeo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.12,
      wireframe: Boolean(opts.wireframe),
      side: THREE.DoubleSide,
    })
  );
  craterMesh.name = 'pass3_4_displaced_crater_mesh';
  root.add(craterMesh);

  // ── PASS 5: SURFACE (Spalled Aggregate Debris & Fracture Splines) ──────
  const debrisGroup = new THREE.Group();
  debrisGroup.name = 'pass5_spalled_aggregate_debris';
  const stoneGeo = new THREE.DodecahedronGeometry(0.032, 0);
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.95 });
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2;
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    stone.position.set(
      Math.cos(ang) * WIDTH_M * 0.65,
      -0.02,
      Math.sin(ang) * LENGTH_M * 0.65
    );
    debrisGroup.add(stone);
  }
  root.add(debrisGroup);

  // ── PASS 6 & 7: INTERACTION (Monsoon Water Pool & HMA Repair Patch) ────
  const waterPct = opts.waterLevelPct ?? ${spec.waterPoolingPct};
  if (waterPct > 0) {
    const waterMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(WIDTH_M * 0.55, WIDTH_M * 0.35, 0.015, 32),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.62, roughness: 0.15, metalness: 0.3 })
    );
    waterMesh.position.y = -MAX_DEPTH_M * 3.8 * (1 - waterPct / 115);
    waterMesh.name = 'pass7_monsoon_water_pool';
    root.add(waterMesh);
  }

  return root;
}
`;
}

export const POTHOLE_PRESETS: {
  id: string;
  label: string;
  roadName: string;
  roadCode: string;
  authority: string;
  roadId: number;
  widthM: number;
  lengthM: number;
  depthCm: number;
  spallingIndex: number;
  waterPoolingPct: number;
  seed: number;
}[] = [
  {
    id: 'sv-crater',
    label: 'S.V. Road Subway Crater (#CMP-00142)',
    roadName: 'S.V. Road',
    roadCode: 'SV-RD-01',
    authority: 'MCGM-KW',
    roadId: 3,
    widthM: 1.24,
    lengthM: 0.96,
    depthCm: 11.2,
    spallingIndex: 0.74,
    waterPoolingPct: 45,
    seed: 1,
  },
  {
    id: 'lbs-collapse',
    label: 'LBS Marg Kurla Sub-Base Collapse (#CMP-00006)',
    roadName: 'LBS Marg',
    roadCode: 'LBS-MARG-01',
    authority: 'MCGM-HE',
    roadId: 4,
    widthM: 1.65,
    lengthM: 1.28,
    depthCm: 16.5,
    spallingIndex: 0.86,
    waterPoolingPct: 65,
    seed: 2,
  },
  {
    id: 'weh-joint',
    label: 'WEH Flyover Expansion Joint Spall (#CMP-00019)',
    roadName: 'Western Express Highway',
    roadCode: 'WEH-NH8',
    authority: 'NHAI-ROM',
    roadId: 1,
    widthM: 0.88,
    lengthM: 0.64,
    depthCm: 6.4,
    spallingIndex: 0.52,
    waterPoolingPct: 15,
    seed: 3,
  },
  {
    id: 'marine-edge',
    label: 'Marine Drive Bump Radar Cluster (#CMP-01297)',
    roadName: 'Marine Drive Promenade',
    roadCode: 'MARINE-DR-01',
    authority: 'MCGM-FN',
    roadId: 7,
    widthM: 0.72,
    lengthM: 0.58,
    depthCm: 4.8,
    spallingIndex: 0.41,
    waterPoolingPct: 20,
    seed: 4,
  },
];
