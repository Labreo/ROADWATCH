import { useStore } from '@/store/useStore';
import { globalTemplates } from '@/data/globalTemplates';
import { getRegionBoundary } from '@/data/regionsMockData';

// Region detection patterns
const REGION_PATTERNS: Record<string, { roads: RegExp[]; landmarks: RegExp[]; coordinates: [number, number][] }> = {
  IN: {
    roads: [
      /NH\s*\d+/i,           // NH-8, NH48
      /SH\s*\d+/i,           // SH-42
      /MDR\s*\d+/i,          // Major District Road
      /National Highway/i,
      /State Highway/i,
      /Express Highway/i,
      /Marg$/i,              // Indian road suffix
      /Road\s*(?:Bandra|Andheri|Dadar|Malad|Goregaon|Thane|Mumbai)/i,
    ],
    landmarks: [
      /Mumbai|Maharashtra|Delhi|India/i,
      /MCGM|BMC|PWD|NHAI/i,
      /Brihanmumbai/i,
    ],
    coordinates: [[68.1, 6.8], [97.4, 35.7]],
  },
  GB: {
    roads: [
      /\bM\s*\d+\b/i,        // M1, M25 (motorways)
      /\bA\d+\b/i,           // A1, A406
      /\bB\d+\b/i,           // B1234
      /\b(Motorway|Trunk Road)\b/i,
      /\b(A-Road|B-Road)\b/i,
      /Road\s*(?:Birmingham|Manchester|London|Leeds|Glasgow|Edinburgh|Bristol)/i,
    ],
    landmarks: [
      /London|Manchester|Birmingham|UK|United Kingdom|Britain|England/i,
      /National Highways|Borough Council|County Council/i,
    ],
    coordinates: [[-8.6, 49.8], [1.8, 60.9]],
  },
  US: {
    roads: [
      /\bI-\s*\d+\b/i,       // I-95, I-5
      /\bUS\s*\d+\b/i,       // US-101
      /\bSR\s*\d+\b/i,       // State Route
      /\b(Interstate|State Route|County Route|US Highway)\b/i,
      /Road\s*(?:Detroit|Michigan|New York|Los Angeles|Chicago|Dallas|Atlanta)/i,
    ],
    landmarks: [
      /New York|Detroit|Chicago|Los Angeles|USA|United States|America|Michigan|California/i,
      /DOT|FHWA|DPW|Department of Transportation/i,
    ],
    coordinates: [[-125.0, 24.5], [-66.9, 49.4]],
  },
  KE: {
    roads: [
      /\bA\d+\b/i,            // A104, A2
      /\bB\d+\b/i,            // B roads
      /\bC\d+\b/i,            // C roads
      /\b(Class A|Class B|Class C|National Trunk|Primary Road)\b/i,
      /Road\s*(?:Nairobi|Mombasa|Kisumu|Nakuru|Eldoret|Thika)/i,
    ],
    landmarks: [
      /Nairobi|Mombasa|Kisumu|Kenya|KeRRA|KURA|KeNHA/i,
      /Kenya (National|Rural|Urban) Highways/i,
    ],
    coordinates: [[33.8, -4.7], [41.9, 5.5]],
  },
};

const EXPLICIT_SWITCH_PATTERN = /switch\s+to\s+([a-z ]+?)(?:\s+region)?$|change\s+(?:to\s+)?region\s+([a-z ]+?)$|(?:^|\s)region\s+([a-z ]+?)$|go\s+to\s+([a-z ]+?)(?:\s+region)?$/i;
const REGION_CODE_MAP: Record<string, string> = {
  india: 'IN',
  indian: 'IN',
  mumbai: 'IN',
  uk: 'GB',
  britain: 'GB',
  england: 'GB',
  london: 'GB',
  'united kingdom': 'GB',
  us: 'US',
  usa: 'US',
  america: 'US',
  'united states': 'US',
  kenya: 'KE',
  nairobi: 'KE',
};

export interface RegionDetectionResult {
  regionCode: string;
  confidence: 'explicit' | 'high' | 'medium' | 'low';
  reason: string;
  matchedPattern?: string;
}

/**
 * Detect region from explicit switch commands
 */
export function detectRegionSwitch(text: string): RegionDetectionResult | null {
  const match = text.match(EXPLICIT_SWITCH_PATTERN);
  if (!match) return null;

  const rawName = (match[1] || match[2] || match[3] || match[4]).toLowerCase().trim();
  const regionCode = REGION_CODE_MAP[rawName];

  if (regionCode) {
    return {
      regionCode,
      confidence: 'explicit',
      reason: `User explicitly switched to ${globalTemplates[regionCode]?.regionName || regionCode}`,
      matchedPattern: match[0],
    };
  }
  return null;
}

/**
 * Detect region from road names, landmarks, or GPS coordinates in text
 */
export function detectRegionFromText(text: string): RegionDetectionResult {
  const normalized = text.toLowerCase();

  for (const [regionCode, patterns] of Object.entries(REGION_PATTERNS)) {
    for (const roadPat of patterns.roads) {
      if (roadPat.test(normalized)) {
        return {
          regionCode,
          confidence: 'high',
          reason: `Road naming pattern matched: ${roadPat.source}`,
          matchedPattern: roadPat.source,
        };
      }
    }
  }

  for (const [regionCode, patterns] of Object.entries(REGION_PATTERNS)) {
    for (const lmPat of patterns.landmarks) {
      if (lmPat.test(normalized)) {
        return {
          regionCode,
          confidence: 'medium',
          reason: `Landmark/location matched: ${lmPat.source}`,
          matchedPattern: lmPat.source,
        };
      }
    }
  }

  // Default to current region
  const currentRegion = useStore.getState().regionCode || 'IN';
  return {
    regionCode: currentRegion,
    confidence: 'low',
    reason: 'No region-specific patterns detected, using current region',
  };
}

/**
 * Detect region from GPS coordinates
 */
export function detectRegionFromGps(lat: number, lng: number): string {
  const boundaries: Record<string, [number, number, number, number]> = {
    IN: [68.1, 6.8, 97.4, 35.7],
    GB: [-8.6, 49.8, 1.8, 60.9],
    US: [-125.0, 24.5, -66.9, 49.4],
    KE: [33.8, -4.7, 41.9, 5.5],
  };

  for (const [code, [w, s, e, n]] of Object.entries(boundaries)) {
    if (lng >= w && lng <= e && lat >= s && lat <= n) {
      return code;
    }
  }

  return useStore.getState().regionCode || 'IN';
}

/**
 * Get all available regions for comparison
 */
export function getAvailableRegions(): { code: string; name: string; template: typeof globalTemplates[string] }[] {
  return Object.entries(globalTemplates).map(([code, template]) => ({
    code,
    name: template.regionName,
    template,
  }));
}