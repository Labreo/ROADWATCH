import { authorities, getAuthority, roads } from '@/data/mockData';
import { Authority } from '@/types';
import { globalTemplates, globalPolygonRecords, RegionTemplate } from '@/data/globalTemplates';

export interface RoutingResult {
  authorityId: number;
  authorityName: string;
  departmentCode: string;
  executiveEngineer: string;
  contactEmail: string;
  contactPhone: string;
  jurisdictionType: 'municipal' | 'state_highway' | 'national_highway' | 'pwd_default';
  routingTrail: string[];
  // Taxonomy translation engine metadata
  regionCode: string;
  regionName: string;
  currency: string;
  currencySymbol: string;
  classificationNetwork: string;
  competentAgency: string;
  fieldManagerTitle: string;
}

// Ray-casting point-in-polygon algorithm
// Coordinates in GeoJSON coordinates represent [longitude, latitude]
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

const globalMockAuthorities: Record<string, Record<string, { id: number; name: string; departmentCode: string; contactEmail: string; contactPhone: string; executiveEngineer: string }>> = {
  US: {
    municipal: {
      id: 11,
      name: "Detroit Department of Public Works (DPW)",
      departmentCode: "DPW-DET",
      contactEmail: "dpw.dispatch@detroitmi.gov",
      contactPhone: "+1-313-224-3901",
      executiveEngineer: "James Carter"
    },
    state_highway: {
      id: 12,
      name: "Michigan Department of Transportation (MDOT)",
      departmentCode: "MDOT-LAN",
      contactEmail: "mdot-info@michigan.gov",
      contactPhone: "+1-517-373-2064",
      executiveEngineer: "Sarah Jenkins"
    },
    national_highway: {
      id: 13,
      name: "Federal Highway Administration (FHWA) - Michigan Division",
      departmentCode: "FHWA-MI",
      contactEmail: "michigan.fhwa@dot.gov",
      contactPhone: "+1-517-706-3100",
      executiveEngineer: "Robert Davis"
    },
    pwd_default: {
      id: 14,
      name: "Michigan County Road Commission Association",
      departmentCode: "CRCA-MI",
      contactEmail: "info@crcami.org",
      contactPhone: "+1-517-484-9355",
      executiveEngineer: "David Miller"
    }
  },
  GB: {
    municipal: {
      id: 21,
      name: "Camden Borough Council - Highways Division",
      departmentCode: "CBC-HIGHWAYS",
      contactEmail: "highways@camden.gov.uk",
      contactPhone: "+44-20-7974-4444",
      executiveEngineer: "Oliver Smith"
    },
    state_highway: {
      id: 22,
      name: "London Highways Joint Committee",
      departmentCode: "LHJC-LON",
      contactEmail: "enquiries@lhjc.org.uk",
      contactPhone: "+44-20-7934-9999",
      executiveEngineer: "Charlotte Jones"
    },
    national_highway: {
      id: 23,
      name: "National Highways - South East Division",
      departmentCode: "NH-SE",
      contactEmail: "info@nationalhighways.co.uk",
      contactPhone: "+44-300-123-5000",
      executiveEngineer: "William Brown"
    },
    pwd_default: {
      id: 24,
      name: "Local Highway Authority Default",
      departmentCode: "LHA-UK",
      contactEmail: "enquiries@lha.gov.uk",
      contactPhone: "+44-20-7000-0000",
      executiveEngineer: "Thomas Wilson"
    }
  },
  KE: {
    municipal: {
      id: 31,
      name: "Nairobi City County - Department of Roads & Transport",
      departmentCode: "NCC-ROADS",
      contactEmail: "roads@nairobi.go.ke",
      contactPhone: "+254-20-2224281",
      executiveEngineer: "Moses Kiprop"
    },
    state_highway: {
      id: 32,
      name: "Kenya Urban Roads Authority (KURA)",
      departmentCode: "KURA-HQ",
      contactEmail: "info@kura.go.ke",
      contactPhone: "+254-20-8013844",
      executiveEngineer: "Florence Wanjiku"
    },
    national_highway: {
      id: 33,
      name: "Kenya National Highways Authority (KeNHA)",
      departmentCode: "KeNHA-HQ",
      contactEmail: "dg@kenha.co.ke",
      contactPhone: "+254-20-4971200",
      executiveEngineer: "David Mwangi"
    },
    pwd_default: {
      id: 34,
      name: "County Department of Infrastructure",
      departmentCode: "CDI-KE",
      contactEmail: "infrastructure@county.go.ke",
      contactPhone: "+254-20-1111111",
      executiveEngineer: "Grace Omwamba"
    }
  }
};

export function resolveRegionByCoordinates(longitude: number, latitude: number): string {
  const point: [number, number] = [longitude, latitude];
  
  if (isPointInPolygon(point, globalPolygonRecords.US.coordinates[0])) {
    return 'US';
  }
  if (isPointInPolygon(point, globalPolygonRecords.GB.coordinates[0])) {
    return 'GB';
  }
  if (isPointInPolygon(point, globalPolygonRecords.KE.coordinates[0])) {
    return 'KE';
  }
  if (isPointInPolygon(point, globalPolygonRecords.IN.coordinates[0])) {
    return 'IN';
  }
  
  return 'IN'; // Fallback domestic templates
}

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

  const point: [number, number] = [longitude, latitude];
  const trail: string[] = ['Initiating geo-routing query...'];

  // Rule 1: Region Detection & International Routing Check
  const regionCode = resolveRegionByCoordinates(longitude, latitude);

  if (regionCode !== 'IN') {
    trail.push(`Coordinates identified outside domestic boundaries. Active region: ${regionCode}`);
    
    // Determine tier based on longitude fraction of the region's bounding box
    const bounds = globalPolygonRecords[regionCode as keyof typeof globalPolygonRecords].coordinates[0];
    const lngs = bounds.map(c => c[0]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const range = maxLng - minLng;
    const fraction = range > 0 ? (longitude - minLng) / range : 0.5;

    let tier: 'municipal' | 'state_highway' | 'national_highway' = 'state_highway';
    if (fraction < 0.33) {
      tier = 'municipal';
    } else if (fraction >= 0.66) {
      tier = 'national_highway';
    }

    trail.push(`Automated tier resolution wrapper matched. Longitude offset fraction: ${fraction.toFixed(2)} -> Tier: ${tier}`);

    const mockAuth = globalMockAuthorities[regionCode][tier];
    const template = globalTemplates[regionCode];
    const tierTemplate = template.tiers[tier];

    trail.push(`Routed to competent agency: ${tierTemplate.agency} (${mockAuth.departmentCode}).`);

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
      classificationNetwork: tierTemplate.classification,
      competentAgency: tierTemplate.agency,
      fieldManagerTitle: tierTemplate.managerTitle
    };
  }

  // Domestic Route Assignment (India)
  // Rule 1: Check if road is explicitly selected and classified
  if (resolvedRoadId) {
    const road = roads.find(r => r.id === resolvedRoadId);
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
  const template = globalTemplates.IN;
  const tierTemplate = template.tiers[type] || template.tiers.pwd_default;

  const engineer = executiveEngineers[authority.id] || {
    name: 'Municipal Commissioner Office',
    email: 'commissioner@mcgm.gov.in',
    phone: '+91-22-2262-0251'
  };

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
    classificationNetwork: tierTemplate.classification,
    competentAgency: tierTemplate.agency,
    fieldManagerTitle: tierTemplate.managerTitle
  };
}
