import { authorities, getAuthority, roads } from '@/data/mockData';
import { Authority } from '@/types';

export interface RoutingResult {
  authorityId: number;
  authorityName: string;
  departmentCode: string;
  executiveEngineer: string;
  contactEmail: string;
  contactPhone: string;
  jurisdictionType: 'municipal' | 'state_highway' | 'national_highway' | 'pwd_default';
  routingTrail: string[];
}

// Ray-casting point-in-polygon algorithm
// Coordinates in GeoJSON coordinates represent [longitude, latitude]
function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
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

export function routeComplaint(longitude: number, latitude: number, roadId?: number | null): RoutingResult {
  const point: [number, number] = [longitude, latitude];
  const trail: string[] = ['Initiating geo-routing query...'];

  // Rule 1: Check if road is explicitly selected and classified
  if (roadId) {
    const road = roads.find(r => r.id === roadId);
    if (road) {
      trail.push(`Identified road segment: ${road.name} (${road.roadCode})`);
      
      if (road.roadCode.includes('NH')) {
        trail.push('Classification: National Highway route matching NHAI boundary.');
        const auth = getAuthority(5);
        if (auth) {
          return createResult(auth, 'national_highway', [
            ...trail,
            'Routed to National Highways Authority of India RO Mumbai.'
          ]);
        }
      }
      
      if (road.roadCode.includes('SH') || road.roadCode.includes('JVLR') || road.roadCode.includes('SCLR')) {
        trail.push('Classification: State Highway arterial route matching PWD boundary.');
        const auth = getAuthority(4);
        if (auth) {
          return createResult(auth, 'state_highway', [
            ...trail,
            'Routed to State Public Works Department Mumbai Division.'
          ]);
        }
      }
    }
  }

  // Rule 2: Perform spatial boundary check across municipal ward polygons
  trail.push('Running ray-casting spatial checks on local municipal ward polygons...');
  
  // Check Ward K-West (ID 1)
  const kw = authorities.find(a => a.id === 1);
  if (kw && isPointInPolygon(point, kw.boundaryGeoJSON.coordinates[0])) {
    trail.push('Coordinates match: Ward K-West boundary polygon.');
    return createResult(kw, 'municipal', [
      ...trail,
      'Routed to City Municipal Corporation - Ward K-West (MCGM-KW).'
    ]);
  }

  // Check Ward F-North (ID 2)
  const fn = authorities.find(a => a.id === 2);
  if (fn && isPointInPolygon(point, fn.boundaryGeoJSON.coordinates[0])) {
    trail.push('Coordinates match: Ward F-North boundary polygon.');
    return createResult(fn, 'municipal', [
      ...trail,
      'Routed to City Municipal Corporation - Ward F-North (MCGM-FN).'
    ]);
  }

  // Check Ward H-East (ID 3)
  const he = authorities.find(a => a.id === 3);
  if (he && isPointInPolygon(point, he.boundaryGeoJSON.coordinates[0])) {
    trail.push('Coordinates match: Ward H-East boundary polygon.');
    return createResult(he, 'municipal', [
      ...trail,
      'Routed to City Municipal Corporation - Ward H-East (MCGM-HE).'
    ]);
  }

  // Rule 3: Default fallback to State PWD if coordinates do not fall inside any specific ward
  trail.push('Outside municipal ward limits. Mapping fallback coordination...');
  const defaultAuth = getAuthority(4); // PWD
  return createResult(defaultAuth || authorities[3], 'pwd_default', [
    ...trail,
    'Default assignment routed to PWD Mumbai Division.'
  ]);
}

function createResult(
  authority: Authority, 
  type: RoutingResult['jurisdictionType'], 
  trail: string[]
): RoutingResult {
  const engineer = executiveEngineers[authority.id] || {
    name: 'Municipal Commissioner Office',
    email: 'commissioner@mcgm.gov.in',
    phone: '+91-22-2262-0251'
  };

  return {
    authorityId: authority.id,
    authorityName: authority.name,
    departmentCode: authority.departmentCode,
    executiveEngineer: engineer.name,
    contactEmail: engineer.email,
    contactPhone: engineer.phone,
    jurisdictionType: type,
    routingTrail: trail
  };
}
