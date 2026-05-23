// ============================================================
// ROADWATCH — Smart Infrastructure Sensor Simulation Engine
// Deterministic, believable sensor feeds per road segment.
// No fake AI — every value is derived from road metadata.
// ============================================================

export type SensorType = 'vibration' | 'stress' | 'drainage' | 'traffic' | 'repair_integrity';
export type SensorLevel = 'nominal' | 'elevated' | 'critical';

export interface SensorReading {
  id: string;
  roadId: number;
  type: SensorType;
  label: string;
  value: number;       // 0–100 index
  unit: string;
  level: SensorLevel;
  trend: 'stable' | 'rising' | 'falling';
  lastUpdated: string; // ISO string
  lat: number;
  lng: number;
  depth?: string;      // for underground overlay context
  description: string;
}

export interface SensorZone {
  roadId: number;
  zoneLabel: string;
  stressIndex: number;     // 0–100
  heatIntensity: number;   // 0–1 (for map overlay opacity)
  dominantAlert: SensorLevel;
  lat: number;
  lng: number;
  radiusMeters: number;
}

// Deterministic noise — same seed = same value every render
function seededValue(roadId: number, sensorIndex: number, offset: number): number {
  const seed = (roadId * 31 + sensorIndex * 17 + offset) % 97;
  return Math.round(seed * 1.03);
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, v));
}

function getLevel(value: number): SensorLevel {
  if (value >= 75) return 'critical';
  if (value >= 45) return 'elevated';
  return 'nominal';
}

function getTrend(roadId: number, type: SensorType): 'stable' | 'rising' | 'falling' {
  const hash = (roadId * 13 + type.length) % 3;
  return hash === 0 ? 'rising' : hash === 1 ? 'stable' : 'falling';
}

// Road status → base stress multiplier
const STATUS_MULTIPLIER: Record<string, number> = {
  poor: 1.75,
  fair: 1.2,
  good: 0.5,
  under_construction: 1.4,
};

interface RoadMeta {
  id: number;
  status: string;
  geometry: { coordinates: [number, number][] };
}

export function generateSensorsForRoads(roads: RoadMeta[]): SensorReading[] {
  const readings: SensorReading[] = [];

  roads.forEach((road) => {
    const mult = STATUS_MULTIPLIER[road.status] ?? 1.0;
    const coords = road.geometry.coordinates;
    // Place sensors at different fractional positions along the road
    const positions = [0.2, 0.5, 0.8];

    positions.forEach((frac, posIdx) => {
      const coordIdx = Math.min(Math.floor(frac * (coords.length - 1)), coords.length - 2);
      const c0 = coords[coordIdx];
      const c1 = coords[coordIdx + 1];
      const t = (frac * (coords.length - 1)) - coordIdx;
      const lng = c0[0] + (c1[0] - c0[0]) * t;
      const lat = c0[1] + (c1[1] - c0[1]) * t;

      const sensorTypes: { type: SensorType; label: string; unit: string; depthHint: string }[] = [
        { type: 'vibration',        label: 'Vibration Sensor',          unit: 'mm/s²',  depthHint: 'Surface mount' },
        { type: 'stress',           label: 'Structural Stress',         unit: 'MPa',    depthHint: '~0.8m sub-base' },
        { type: 'drainage',         label: 'Drainage Saturation',       unit: '% sat.', depthHint: '~1.5m below kerb' },
        { type: 'traffic',          label: 'Traffic Load Index',        unit: 'ESALs',  depthHint: 'In-pavement loop' },
        { type: 'repair_integrity', label: 'Repair Integrity Score',    unit: 'RCI',    depthHint: 'Core sample depth' },
      ];

      sensorTypes.forEach((def, typeIdx) => {
        const raw = clamp(Math.round(seededValue(road.id, typeIdx + posIdx * 10, 42) * mult));
        // Repair integrity is inverse — lower raw = worse integrity when status is poor
        const value = def.type === 'repair_integrity'
          ? clamp(100 - raw)
          : raw;

        readings.push({
          id: `${road.id}-${def.type}-${posIdx}`,
          roadId: road.id,
          type: def.type,
          label: def.label,
          value,
          unit: def.unit,
          level: getLevel(value),
          trend: getTrend(road.id + posIdx, def.type),
          lastUpdated: new Date(Date.now() - (road.id * 300000 + posIdx * 60000)).toISOString(),
          lat,
          lng,
          depth: def.depthHint,
          description: buildDescription(def.type, value, road.status),
        });
      });
    });
  });

  return readings;
}

function buildDescription(type: SensorType, value: number, status: string): string {
  const level = getLevel(value);
  switch (type) {
    case 'vibration':
      if (level === 'critical') return 'Excessive surface oscillation. Indicates sub-base delamination or heavy vehicle resonance.';
      if (level === 'elevated') return 'Moderate vibration. Monitor for progressive pavement fatigue cracking.';
      return 'Surface vibration within design tolerances. No action required.';
    case 'stress':
      if (level === 'critical') return 'Structural overload detected. Risk of bearing failure. Restrict heavy axle loads.';
      if (level === 'elevated') return 'Elevated compressive stress. Schedule granular layer inspection.';
      return 'Structural stress nominal. Pavement load distribution optimal.';
    case 'drainage':
      if (level === 'critical') return 'Drainage lines at saturation. Risk of hydrostatic uplift and pothole nucleation.';
      if (level === 'elevated') return 'Reduced drainage velocity. Sediment accumulation likely in culverts.';
      return 'Drainage flow nominal. Stormwater runoff within design capacity.';
    case 'traffic':
      if (level === 'critical') return 'Traffic load exceeding pavement design ESALs. Accelerated fatigue expected.';
      if (level === 'elevated') return 'Above-average load cycles. Recommend overlay schedule review.';
      return 'Traffic loading within structural design limits.';
    case 'repair_integrity':
      if (level === 'critical') return 'Repair patch showing early failure. Bond loss between patch and substrate detected.';
      if (level === 'elevated') return 'Repair integrity degrading. Surface crack propagation into patch boundary.';
      return 'Repair patch integrity verified. Bond strength satisfactory.';
  }
}

export function generateStressZones(roads: RoadMeta[]): SensorZone[] {
  return roads.map((road) => {
    const mult = STATUS_MULTIPLIER[road.status] ?? 1.0;
    const coords = road.geometry.coordinates;
    const midIdx = Math.floor(coords.length / 2);
    const [lng, lat] = coords[midIdx];
    const stressIndex = clamp(Math.round(seededValue(road.id, 0, 7) * mult));

    return {
      roadId: road.id,
      zoneLabel: `Stress Zone — Road #${road.id}`,
      stressIndex,
      heatIntensity: stressIndex / 100,
      dominantAlert: getLevel(stressIndex),
      lat,
      lng,
      radiusMeters: 300 + road.id * 30,
    };
  });
}

export const SENSOR_COLORS: Record<SensorType, string> = {
  vibration:        '#f59e0b', // amber
  stress:           '#f43f5e', // rose
  drainage:         '#38bdf8', // sky blue
  traffic:          '#a78bfa', // violet
  repair_integrity: '#34d399', // emerald
};

export const SENSOR_LEVEL_COLORS: Record<SensorLevel, string> = {
  nominal:  '#34d399',
  elevated: '#f59e0b',
  critical: '#f43f5e',
};

export const SENSOR_TYPE_ICONS: Record<SensorType, string> = {
  vibration:        '〰',
  stress:           '⬛',
  drainage:         '💧',
  traffic:          '🚦',
  repair_integrity: '🔩',
};
