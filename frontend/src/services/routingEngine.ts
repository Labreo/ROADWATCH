import { authorities, getAuthority, roads } from '@/data/mockData';
import { Authority } from '@/types';
import { globalTemplates, globalPolygonRecords } from '@/data/globalTemplates';

export interface RoutingResult {
  authorityId: number;
  authorityName: string;
  departmentCode: string;
  executiveEngineer: string;
  contactEmail: string;
  contactPhone: string;
  jurisdictionType: 'municipal' | 'state_highway' | 'national_highway' | 'pwd_default';
  routingTrail: string[];
  regionCode: string;
  regionName: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  classificationNetwork: string;
  competentAgency: string;
  fieldManagerTitle: string;
}

// Ray-casting point-in-polygon algorithm (kept for offline fallback)
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [lng, lat] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > lat) !== (yj > lat))
        && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

// Executive Engineer contact information
const executiveEngineers: Record<number, { name: string; email: string; phone: string }> = {
  1: { name: 'Er. Ramesh Sawant', email: 'ee.kw@mcgm.gov.in', phone: '+91-22-2623-0101' },
  2: { name: 'Er. Anil Deshmukh', email: 'ee.fn@mcgm.gov.in', phone: '+91-22-2402-1102' },
  3: { name: 'Er. Sandeep Patil', email: 'ee.he@mcgm.gov.in', phone: '+91-22-2618-2203' },
  4: { name: 'Er. Vijay Kadam (Division Chief)', email: 'se.mumbai@pwd.gov.in', phone: '+91-22-2202-3304' },
  5: { name: 'Er. Yashwant Rao (Project Director)', email: 'romumbai@nhai.org', phone: '+91-22-2756-4405' }
};

// Offline fallback authorities (used when backend API is unavailable)
const fallbackAuthorities: Record<string, Record<string, { id: number; name: string; departmentCode: string; contactEmail: string; contactPhone: string; executiveEngineer: string }>> = {
  US: {
    municipal: { id: 11, name: "Detroit Department of Public Works (DPW)", departmentCode: "DPW-DET", contactEmail: "dpw.dispatch@detroitmi.gov", contactPhone: "+1-313-224-3901", executiveEngineer: "James Carter" },
    state_highway: { id: 12, name: "Michigan Department of Transportation (MDOT)", departmentCode: "MDOT-LAN", contactEmail: "mdot-info@michigan.gov", contactPhone: "+1-517-373-2064", executiveEngineer: "Sarah Jenkins" },
    national_highway: { id: 13, name: "Federal Highway Administration (FHWA) - Michigan Division", departmentCode: "FHWA-MI", contactEmail: "michigan.fhwa@dot.gov", contactPhone: "+1-517-706-3100", executiveEngineer: "Robert Davis" },
    pwd_default: { id: 14, name: "Michigan County Road Commission Association", departmentCode: "CRCA-MI", contactEmail: "info@crcami.org", contactPhone: "+1-517-484-9355", executiveEngineer: "David Miller" }
  },
  GB: {
    municipal: { id: 21, name: "Camden Borough Council - Highways Division", departmentCode: "CBC-HIGHWAYS", contactEmail: "highways@camden.gov.uk", contactPhone: "+44-20-7974-4444", executiveEngineer: "Oliver Smith" },
    state_highway: { id: 22, name: "London Highways Joint Committee", departmentCode: "LHJC-LON", contactEmail: "enquiries@lhjc.org.uk", contactPhone: "+44-20-7934-9999", executiveEngineer: "Charlotte Jones" },
    national_highway: { id: 23, name: "National Highways - South East Division", departmentCode: "NH-SE", contactEmail: "info@nationalhighways.co.uk", contactPhone: "+44-300-123-5000", executiveEngineer: "William Brown" },
    pwd_default: { id: 24, name: "Local Highway Authority Default", departmentCode: "LHA-UK", contactEmail: "enquiries@lha.gov.uk", contactPhone: "+44-20-7000-0000", executiveEngineer: "Thomas Wilson" }
  },
  KE: {
    municipal: { id: 31, name: "Nairobi City County - Department of Roads & Transport", departmentCode: "NCC-ROADS", contactEmail: "roads@nairobi.go.ke", contactPhone: "+254-20-2224281", executiveEngineer: "Moses Kiprop" },
    state_highway: { id: 32, name: "Kenya Urban Roads Authority (KURA)", departmentCode: "KURA-HQ", contactEmail: "info@kura.go.ke", contactPhone: "+254-20-8013844", executiveEngineer: "Florence Wanjiku" },
    national_highway: { id: 33, name: "Kenya National Highways Authority (KeNHA)", departmentCode: "KeNHA-HQ", contactEmail: "dg@kenha.co.ke", contactPhone: "+254-20-4971200", executiveEngineer: "David Mwangi" },
    pwd_default: { id: 34, name: "County Department of Infrastructure", departmentCode: "CDI-KE", contactEmail: "infrastructure@county.go.ke", contactPhone: "+254-20-1111111", executiveEngineer: "Grace Omwamba" }
  }
};

async function resolveViaBackend(longitude: number, latitude: number): Promise<RoutingResult | null> {
  try {
    const resp = await fetch('http://localhost:8000/api/v1/regions/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude }),
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const auth = data.authority;
    if (!auth) return null;

    const template = globalTemplates[data.region_code] || globalTemplates.IN;
    const regionCode = data.region_code || 'IN';
    const timezone = data.timezone || template.timezone;

    const jurisdictionMap: Record<string, 'municipal' | 'state_highway' | 'national_highway' | 'pwd_default'> = {
      'MCGM-KW': 'municipal', 'MCGM-FN': 'municipal', 'MCGM-HE': 'municipal',
      'PWD-MUM': 'state_highway', 'NHAI-ROM': 'national_highway',
      'DPW-DET': 'municipal', 'MDOT-LAN': 'state_highway', 'FHWA-MI': 'national_highway',
      'CBC-HIGHWAYS': 'municipal', 'LHJC-LON': 'state_highway', 'NH-SE': 'national_highway',
      'NCC-ROADS': 'municipal', 'KURA-HQ': 'state_highway', 'KeNHA-HQ': 'national_highway',
    };

    const deptCode = auth.department_code || '';
    const jt = jurisdictionMap[deptCode] || 'pwd_default';
    const tierTemplate = template.tiers[jt] || template.tiers.pwd_default;

    return {
      authorityId: auth.id,
      authorityName: auth.name,
      departmentCode: deptCode,
      executiveEngineer: template.formatManagerName(auth.name),
      contactEmail: auth.contact_email || '',
      contactPhone: auth.contact_phone || '',
      jurisdictionType: jt,
      routingTrail: [`Resolved via backend: ${data.region_name || regionCode}`],
      regionCode,
      regionName: data.region_name || template.regionName,
      currency: template.currency,
      currencySymbol: template.currencySymbol,
      timezone,
      classificationNetwork: tierTemplate.classification,
      competentAgency: tierTemplate.agency,
      fieldManagerTitle: tierTemplate.managerTitle,
    };
  } catch {
    return null;
  }
}

export function resolveRegionByCoordinates(longitude: number, latitude: number): string {
  const point: [number, number] = [longitude, latitude];
  if (isPointInPolygon(point, globalPolygonRecords.US.coordinates[0])) return 'US';
  if (isPointInPolygon(point, globalPolygonRecords.GB.coordinates[0])) return 'GB';
  if (isPointInPolygon(point, globalPolygonRecords.KE.coordinates[0])) return 'KE';
  if (isPointInPolygon(point, globalPolygonRecords.IN.coordinates[0])) return 'IN';
  return 'IN';
}

function offlineRoute(longitude: number, latitude: number, resolvedRoadId: number | null): RoutingResult {
  const point: [number, number] = [longitude, latitude];
  const trail: string[] = ['Initiating geo-routing query (offline)...'];

  const isInsideMumbai = longitude >= 72.60 && longitude <= 73.15 && latitude >= 18.70 && latitude <= 19.45;
  const isInsideIndia = isPointInPolygon(point, globalPolygonRecords.IN.coordinates[0]);

  let regionCode = 'IN';
  if (!isInsideMumbai || !isInsideIndia) {
    if (isPointInPolygon(point, globalPolygonRecords.US.coordinates[0])) regionCode = 'US';
    else if (isPointInPolygon(point, globalPolygonRecords.GB.coordinates[0])) regionCode = 'GB';
    else if (isPointInPolygon(point, globalPolygonRecords.KE.coordinates[0])) regionCode = 'KE';
  }

  if (regionCode !== 'IN') {
    trail.push(`Coordinates outside domestic boundaries. Region: ${regionCode}`);

    const bounds = globalPolygonRecords[regionCode as keyof typeof globalPolygonRecords].coordinates[0];
    const lngs = bounds.map(c => c[0]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const range = maxLng - minLng;
    const fraction = range > 0 ? (longitude - minLng) / range : 0.5;

    let tier: 'municipal' | 'state_highway' | 'national_highway' = 'state_highway';
    if (fraction < 0.33) tier = 'municipal';
    else if (fraction >= 0.66) tier = 'national_highway';

    trail.push(`Offline fallback tier: ${tier}`);

    const mockAuth = fallbackAuthorities[regionCode][tier];
    const template = globalTemplates[regionCode];
    const tierTemplate = template.tiers[tier];

    return {
      authorityId: mockAuth.id,
      authorityName: mockAuth.name,
      departmentCode: mockAuth.departmentCode,
      executiveEngineer: template.formatManagerName(mockAuth.executiveEngineer),
      contactEmail: mockAuth.contactEmail,
      contactPhone: mockAuth.contactPhone,
      jurisdictionType: tier,
      routingTrail: trail,
      regionCode,
      regionName: template.regionName,
      currency: template.currency,
      currencySymbol: template.currencySymbol,
      timezone: template.timezone,
      classificationNetwork: tierTemplate.classification,
      competentAgency: tierTemplate.agency,
      fieldManagerTitle: tierTemplate.managerTitle,
    };
  }

  // Domestic Route Assignment (India) — unchanged
  if (resolvedRoadId) {
    const road = roads.find(r => r.id === resolvedRoadId);
    if (road) {
      trail.push(`Identified road segment: ${road.name} (${road.roadCode})`);
      if (road.roadCode.includes('NH')) {
        trail.push('Classification: National Highway.');
        const auth = getAuthority(5);
        if (auth) return createOfflineResult(auth, 'national_highway', [...trail, 'Routed to NHAI RO Mumbai.']);
      }
      if (road.roadCode.includes('SH') || road.roadCode.includes('JVLR') || road.roadCode.includes('SCLR')) {
        trail.push('Classification: State Highway.');
        const auth = getAuthority(4);
        if (auth) return createOfflineResult(auth, 'state_highway', [...trail, 'Routed to State PWD Mumbai.']);
      }
    }
  }

  trail.push('Running ray-casting on municipal ward polygons...');
  const kw = authorities.find(a => a.id === 1);
  if (kw && isPointInPolygon(point, kw.boundaryGeoJSON.coordinates[0])) {
    return createOfflineResult(kw, 'municipal', [...trail, 'Routed to MCGM Ward K-West.']);
  }
  const fn = authorities.find(a => a.id === 2);
  if (fn && isPointInPolygon(point, fn.boundaryGeoJSON.coordinates[0])) {
    return createOfflineResult(fn, 'municipal', [...trail, 'Routed to MCGM Ward F-North.']);
  }
  const he = authorities.find(a => a.id === 3);
  if (he && isPointInPolygon(point, he.boundaryGeoJSON.coordinates[0])) {
    return createOfflineResult(he, 'municipal', [...trail, 'Routed to MCGM Ward H-East.']);
  }

  trail.push('Outside ward limits. PWD fallback.');
  const defaultAuth = getAuthority(4);
  return createOfflineResult(defaultAuth || authorities[3], 'pwd_default', [...trail, 'Default PWD Mumbai.']);
}

function createOfflineResult(authority: Authority, type: RoutingResult['jurisdictionType'], trail: string[]): RoutingResult {
  const template = globalTemplates.IN;
  const tierTemplate = template.tiers[type] || template.tiers.pwd_default;
  const engineer = executiveEngineers[authority.id] || { name: 'Commissioner Office', email: 'commissioner@mcgm.gov.in', phone: '+91-22-2262-0251' };

  return {
    authorityId: authority.id,
    authorityName: authority.name,
    departmentCode: authority.departmentCode,
    executiveEngineer: template.formatManagerName(engineer.name),
    contactEmail: engineer.email,
    contactPhone: engineer.phone,
    jurisdictionType: type,
    routingTrail: trail,
    regionCode: 'IN',
    regionName: template.regionName,
    currency: template.currency,
    currencySymbol: template.currencySymbol,
    timezone: template.timezone,
    classificationNetwork: tierTemplate.classification,
    competentAgency: tierTemplate.agency,
    fieldManagerTitle: tierTemplate.managerTitle,
  };
}

export async function routeComplaintAsync(
  longitudeOrCoords: number | number[] | [number, number],
  latitudeOrRoadId?: number | null,
  roadId?: number | null
): Promise<RoutingResult> {
  let longitude: number;
  let latitude: number;
  let resolvedRoadId: number | null = null;

  if (Array.isArray(longitudeOrCoords)) {
    longitude = longitudeOrCoords[0];
    latitude = longitudeOrCoords[1];
    resolvedRoadId = (latitudeOrRoadId as number | null) ?? null;
  } else {
    longitude = longitudeOrCoords;
    latitude = latitudeOrRoadId as number;
    resolvedRoadId = roadId ?? null;
  }

  const backendResult = await resolveViaBackend(longitude, latitude);
  if (backendResult) return backendResult;

  return offlineRoute(longitude, latitude, resolvedRoadId);
}

// Synchronous wrapper for backward compatibility
export function routeComplaint(
  longitudeOrCoords: number | number[] | [number, number],
  latitudeOrRoadId?: number | null,
  roadId?: number | null
): RoutingResult {
  let longitude: number;
  let latitude: number;
  let resolvedRoadId: number | null = null;

  if (Array.isArray(longitudeOrCoords)) {
    longitude = longitudeOrCoords[0];
    latitude = longitudeOrCoords[1];
    resolvedRoadId = (latitudeOrRoadId as number | null) ?? null;
  } else {
    longitude = longitudeOrCoords;
    latitude = latitudeOrRoadId as number;
    resolvedRoadId = roadId ?? null;
  }

  return offlineRoute(longitude, latitude, resolvedRoadId);
}
