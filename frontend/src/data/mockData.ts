import {
  Authority,
  Contractor,
  Road,
  Project,
  Complaint,
  RoadStatus,
  ComplaintCategory,
  ComplaintStatus,
  ProjectStatus
} from '@/types';

// =========================================================================
// MOCK DATASETS
// =========================================================================

// 5 Authorities
export const authorities: Authority[] = [
  {
    id: 1,
    name: 'City Municipal Corporation - Ward K-West',
    departmentCode: 'MCGM-KW',
    contactEmail: 'ward.kw@mcgm.gov.in',
    contactPhone: '+91-22-2623-0000',
    boundaryGeoJSON: {
      type: 'Polygon',
      coordinates: [[[72.80, 19.10], [72.87, 19.10], [72.87, 19.22], [72.80, 19.22], [72.80, 19.10]]]
    }
  },
  {
    id: 2,
    name: 'City Municipal Corporation - Ward F-North',
    departmentCode: 'MCGM-FN',
    contactEmail: 'ward.fn@mcgm.gov.in',
    contactPhone: '+91-22-2402-1111',
    boundaryGeoJSON: {
      type: 'Polygon',
      coordinates: [[[72.80, 18.90], [72.88, 18.90], [72.88, 19.03], [72.80, 19.03], [72.80, 18.90]]]
    }
  },
  {
    id: 3,
    name: 'City Municipal Corporation - Ward H-East',
    departmentCode: 'MCGM-HE',
    contactEmail: 'ward.he@mcgm.gov.in',
    contactPhone: '+91-22-2618-2222',
    boundaryGeoJSON: {
      type: 'Polygon',
      coordinates: [[[72.87, 19.00], [72.95, 19.00], [72.95, 19.10], [72.87, 19.10], [72.87, 19.00]]]
    }
  },
  {
    id: 4,
    name: 'State Public Works Department - Mumbai Division',
    departmentCode: 'PWD-MUM',
    contactEmail: 'se.mumbai@pwd.gov.in',
    contactPhone: '+91-22-2202-3333',
    boundaryGeoJSON: {
      type: 'Polygon',
      coordinates: [[[72.70, 18.80], [73.05, 18.80], [73.05, 19.30], [72.70, 19.30], [72.70, 18.80]]]
    }
  },
  {
    id: 5,
    name: 'National Highways Authority of India - RO Mumbai',
    departmentCode: 'NHAI-ROM',
    contactEmail: 'romumbai@nhai.org',
    contactPhone: '+91-22-2756-4444',
    boundaryGeoJSON: {
      type: 'Polygon',
      coordinates: [[[72.60, 18.70], [73.15, 18.70], [73.15, 19.45], [72.60, 19.45], [72.60, 18.70]]]
    }
  }
];

// 12 Contractors
export const contractors: Contractor[] = [
  { id: 1, name: 'Apex Infrastructure Ltd', licenseNumber: 'LIC-2015-1102', registrationDate: '2015-04-12', contactEmail: 'contact@apexinfra.com', contactPhone: '+91-22-6123-4567', rating: 4.25, projectsCompleted: 24, projectsDelayed: 2, blacklisted: false },
  { id: 2, name: 'BuildWell Roadways Corp', licenseNumber: 'LIC-2018-4903', registrationDate: '2018-09-20', contactEmail: 'gov@buildwellroadways.in', contactPhone: '+91-22-6891-9988', rating: 3.80, projectsCompleted: 18, projectsDelayed: 4, blacklisted: false },
  { id: 3, name: 'Zenith Construction Group', licenseNumber: 'LIC-2012-0051', registrationDate: '2012-01-15', contactEmail: 'tenders@zenithinfra.com', contactPhone: '+91-22-5555-8888', rating: 4.50, projectsCompleted: 42, projectsDelayed: 1, blacklisted: false },
  { id: 4, name: 'Shiva Earthmovers & Paving', licenseNumber: 'LIC-2020-8812', registrationDate: '2020-06-30', contactEmail: 'shiva.earth@gmail.com', contactPhone: '+91-98200-11223', rating: 2.10, projectsCompleted: 8, projectsDelayed: 5, blacklisted: false },
  { id: 5, name: 'Landmark Infra Projects', licenseNumber: 'LIC-2019-3321', registrationDate: '2019-11-05', contactEmail: 'projects@landmarkinfra.in', contactPhone: '+91-22-2591-1020', rating: 3.90, projectsCompleted: 15, projectsDelayed: 2, blacklisted: false },
  { id: 6, name: 'Metro Highway Builders', licenseNumber: 'LIC-2014-9092', registrationDate: '2014-03-22', contactEmail: 'info@metrobuilders.com', contactPhone: '+91-22-4090-0909', rating: 4.60, projectsCompleted: 31, projectsDelayed: 0, blacklisted: false },
  { id: 7, name: 'Coastal Paving Specialists', licenseNumber: 'LIC-2021-0022', registrationDate: '2021-02-18', contactEmail: 'ops@coastalpaving.com', contactPhone: '+91-22-8812-3456', rating: 4.10, projectsCompleted: 6, projectsDelayed: 0, blacklisted: false },
  { id: 8, name: 'Bharat Roads & Highways Ltd', licenseNumber: 'LIC-2010-0010', registrationDate: '2010-05-05', contactEmail: 'contact@bharatroads.co.in', contactPhone: '+91-22-2651-1234', rating: 4.75, projectsCompleted: 85, projectsDelayed: 3, blacklisted: false },
  { id: 9, name: 'Skyline Developers & Civil', licenseNumber: 'LIC-2022-7711', registrationDate: '2022-08-14', contactEmail: 'bids@skylinedevelopers.com', contactPhone: '+91-99300-88899', rating: 3.40, projectsCompleted: 4, projectsDelayed: 1, blacklisted: false },
  { id: 10, name: 'Omega Infrastructure Inc', licenseNumber: 'LIC-2016-5621', registrationDate: '2016-10-10', contactEmail: 'legal@omegacorp.com', contactPhone: '+91-22-6712-9900', rating: 1.80, projectsCompleted: 12, projectsDelayed: 8, blacklisted: true, blacklistedReason: 'Failure to complete SV Road drainage project inside contract timelines and high rate of road surface peeling within 3 months of paving.' },
  { id: 11, name: 'Precision Asphalt Works', licenseNumber: 'LIC-2023-1100', registrationDate: '2023-01-20', contactEmail: 'contact@precisionasphalt.in', contactPhone: '+91-90040-55112', rating: 4.00, projectsCompleted: 3, projectsDelayed: 0, blacklisted: false },
  { id: 12, name: 'Pioneer Engineering Corp', licenseNumber: 'LIC-2017-3829', registrationDate: '2017-07-07', contactEmail: 'pioneer.engg@rediffmail.com', contactPhone: '+91-22-2877-6655', rating: 3.20, projectsCompleted: 14, projectsDelayed: 4, blacklisted: false }
];

// 12 Roads
export const roads: Road[] = [
  {
    id: 1,
    name: 'Western Express Highway',
    roadCode: 'WEH-NH8',
    status: 'under_construction',
    lengthKm: 25.50,
    authorityId: 5,
    lastRelayingDate: '2025-06-01',
    geometry: {
      type: 'LineString',
      coordinates: [[72.8524, 19.1012], [72.8530, 19.1340], [72.8590, 19.1860], [72.8610, 19.2300]]
    }
  },
  {
    id: 2,
    name: 'Eastern Express Highway',
    roadCode: 'EEH-SH3',
    status: 'fair',
    lengthKm: 22.10,
    authorityId: 4,
    lastRelayingDate: '2025-11-12',
    geometry: {
      type: 'LineString',
      coordinates: [[72.9210, 19.0410], [72.9340, 19.1020], [72.9460, 19.1680], [72.9610, 19.2150]]
    }
  },
  {
    id: 3,
    name: 'S.V. Road',
    roadCode: 'SV-RD-01',
    status: 'poor',
    lengthKm: 16.80,
    authorityId: 1,
    lastRelayingDate: '2023-10-05',
    geometry: {
      type: 'LineString',
      coordinates: [[72.8354, 19.0601], [72.8360, 19.1020], [72.8398, 19.1620], [72.8450, 19.2080]]
    }
  },
  {
    id: 4,
    name: 'Link Road',
    roadCode: 'LNK-RD-02',
    status: 'under_construction',
    lengthKm: 18.20,
    authorityId: 1,
    lastRelayingDate: '2024-03-10',
    geometry: {
      type: 'LineString',
      coordinates: [[72.8250, 19.0805], [72.8270, 19.1240], [72.8310, 19.1840], [72.8510, 19.2450]]
    }
  },
  {
    id: 5,
    name: 'LBS Marg',
    roadCode: 'LBS-RD-03',
    status: 'poor',
    lengthKm: 21.00,
    authorityId: 3,
    lastRelayingDate: '2024-05-15',
    geometry: {
      type: 'LineString',
      coordinates: [[72.8890, 19.0305], [72.8980, 19.0840], [72.9120, 19.1360], [72.9350, 19.1980]]
    }
  },
  {
    id: 6,
    name: 'Senapati Bapat Marg',
    roadCode: 'SBM-RD-04',
    status: 'good',
    lengthKm: 7.50,
    authorityId: 2,
    lastRelayingDate: '2023-12-10',
    geometry: {
      type: 'LineString',
      coordinates: [[72.8240, 18.9510], [72.8260, 18.9850], [72.8290, 19.0180]]
    }
  },
  {
    id: 7,
    name: 'Dr. Ambedkar Road',
    roadCode: 'AMB-RD-05',
    status: 'good',
    lengthKm: 8.20,
    authorityId: 2,
    lastRelayingDate: '2025-01-20',
    geometry: {
      type: 'LineString',
      coordinates: [[72.8480, 18.9610], [72.8500, 18.9950], [72.8520, 19.0280]]
    }
  },
  {
    id: 8,
    name: 'Jogeshwari-Vikhroli Link Road',
    roadCode: 'JVLR-SH1',
    status: 'fair',
    lengthKm: 10.80,
    authorityId: 4,
    lastRelayingDate: '2025-06-28',
    geometry: {
      type: 'LineString',
      coordinates: [[72.8520, 19.1320], [72.8810, 19.1290], [72.9050, 19.1240], [72.9230, 19.1200]]
    }
  },
  {
    id: 9,
    name: 'Santa Cruz-Chembur Link Road',
    roadCode: 'SCLR-SH2',
    status: 'fair',
    lengthKm: 6.40,
    authorityId: 4,
    lastRelayingDate: '2025-05-15',
    geometry: {
      type: 'LineString',
      coordinates: [[72.8550, 19.0710], [72.8790, 19.0700], [72.8990, 19.0680], [72.9110, 19.0650]]
    }
  },
  {
    id: 10,
    name: 'Ghodbunder Road',
    roadCode: 'GB-SH42',
    status: 'good',
    lengthKm: 20.00,
    authorityId: 4,
    lastRelayingDate: '2024-12-25',
    geometry: {
      type: 'LineString',
      coordinates: [[72.9550, 19.2220], [72.9310, 19.2520], [72.8990, 19.2680], [72.8680, 19.2810]]
    }
  },
  {
    id: 11,
    name: 'Marine Drive',
    roadCode: 'MD-RD-06',
    status: 'good',
    lengthKm: 3.60,
    authorityId: 2,
    lastRelayingDate: '2023-11-20',
    geometry: {
      type: 'LineString',
      coordinates: [[72.8205, 18.9210], [72.8210, 18.9320], [72.8235, 18.9480]]
    }
  },
  {
    id: 12,
    name: 'Sion-Panvel Highway',
    roadCode: 'SPH-NH4',
    status: 'fair',
    lengthKm: 24.80,
    authorityId: 5,
    lastRelayingDate: '2025-11-30',
    geometry: {
      type: 'LineString',
      coordinates: [[72.9010, 19.0390], [72.9450, 19.0430], [72.9980, 19.0400], [73.0610, 19.0250]]
    }
  }
];

// 12 Projects (budget data, link roads and contractors)
export const projects: Project[] = [
  {
    id: 101,
    title: 'WEH Flyover Resurfacing & Structural Grouting',
    roadId: 1,
    contractorId: 1,
    authorityId: 5,
    budgetAllocated: 240000000.00,
    budgetSpent: 185000000.00,
    status: 'in_progress',
    startDate: '2025-06-01',
    targetEndDate: '2026-06-30',
    delayDays: 0,
    fundSources: [
      { source: 'Central Road Fund', amount: 140000000.00 },
      { source: 'International Multilateral Loans', amount: 100000000.00 }
    ]
  },
  {
    id: 102,
    title: 'EEH Pothole Remediation Campaign 2025',
    roadId: 2,
    contractorId: 2,
    authorityId: 4,
    budgetAllocated: 18000000.00,
    budgetSpent: 19200000.00,
    status: 'completed',
    startDate: '2025-09-01',
    targetEndDate: '2025-10-31',
    actualEndDate: '2025-11-12',
    delayDays: 12,
    fundSources: [
      { source: 'State PWD Allocations', amount: 18000000.00 }
    ]
  },
  {
    id: 103,
    title: 'SV Road Drainage Trenching and Microtunnelling',
    roadId: 3,
    contractorId: 10,
    authorityId: 1,
    budgetAllocated: 95000000.00,
    budgetSpent: 45000000.00,
    status: 'halted',
    startDate: '2024-05-10',
    targetEndDate: '2025-05-10',
    delayDays: 378,
    fundSources: [
      { source: 'Municipal General Tier', amount: 95000000.00 }
    ]
  },
  {
    id: 104,
    title: 'SV Road Emergency Asphalt Laying',
    roadId: 3,
    contractorId: 3,
    authorityId: 1,
    budgetAllocated: 35000000.00,
    budgetSpent: 12000000.00,
    status: 'in_progress',
    startDate: '2026-03-01',
    targetEndDate: '2026-08-31',
    delayDays: 0,
    fundSources: [
      { source: 'Municipal General Tier', amount: 35000000.00 }
    ]
  },
  {
    id: 105,
    title: 'Link Road Concrete Pavement Upgrade Ph. 2',
    roadId: 4,
    contractorId: 6,
    authorityId: 1,
    budgetAllocated: 145000000.00,
    budgetSpent: 75000000.00,
    status: 'in_progress',
    startDate: '2025-10-15',
    targetEndDate: '2026-09-30',
    delayDays: 0,
    fundSources: [
      { source: 'Municipal General Tier', amount: 100000000.00 },
      { source: 'International Multilateral Loans', amount: 45000000.00 }
    ]
  },
  {
    id: 106,
    title: 'LBS Marg Sewer Line Laying and Patching',
    roadId: 5,
    contractorId: 4,
    authorityId: 3,
    budgetAllocated: 62000000.00,
    budgetSpent: 60000000.00,
    status: 'in_progress',
    startDate: '2024-11-01',
    targetEndDate: '2025-11-01',
    delayDays: 203,
    fundSources: [
      { source: 'Municipal General Tier', amount: 62000000.00 }
    ]
  },
  {
    id: 107,
    title: 'Senapati Bapat Marg Micro-silica concrete topping',
    roadId: 6,
    contractorId: 3,
    authorityId: 2,
    budgetAllocated: 85000000.00,
    budgetSpent: 84200000.00,
    status: 'completed',
    startDate: '2023-01-15',
    targetEndDate: '2023-12-15',
    actualEndDate: '2023-12-10',
    delayDays: 0,
    fundSources: [
      { source: 'State PWD Allocations', amount: 85000000.00 }
    ]
  },
  {
    id: 108,
    title: 'Dr. Ambedkar Road Junction Redesign & Lane Widening',
    roadId: 7,
    contractorId: 8,
    authorityId: 2,
    budgetAllocated: 110000000.00,
    budgetSpent: 108000000.00,
    status: 'completed',
    startDate: '2024-02-01',
    targetEndDate: '2025-01-31',
    actualEndDate: '2025-01-20',
    delayDays: 0,
    fundSources: [
      { source: 'Central Road Fund', amount: 50000000.00 },
      { source: 'Municipal General Tier', amount: 60000000.00 }
    ]
  },
  {
    id: 109,
    title: 'JVLR Pothole Repair and Guardrail installation',
    roadId: 8,
    contractorId: 5,
    authorityId: 4,
    budgetAllocated: 12500000.00,
    budgetSpent: 12500000.00,
    status: 'completed',
    startDate: '2025-05-01',
    targetEndDate: '2025-06-30',
    actualEndDate: '2025-06-28',
    delayDays: 0,
    fundSources: [
      { source: 'State PWD Allocations', amount: 12500000.00 }
    ]
  },
  {
    id: 110,
    title: 'SCLR Connector Joint Replacement & Waterproofing',
    roadId: 9,
    contractorId: 7,
    authorityId: 4,
    budgetAllocated: 45000000.00,
    budgetSpent: 22000000.00,
    status: 'in_progress',
    startDate: '2025-11-01',
    targetEndDate: '2026-05-31',
    delayDays: 0,
    fundSources: [
      { source: 'State PWD Allocations', amount: 45000000.00 }
    ]
  },
  {
    id: 111,
    title: 'Ghodbunder Road Mast-Asphalt Overlay',
    roadId: 10,
    contractorId: 8,
    authorityId: 4,
    budgetAllocated: 190000000.00,
    budgetSpent: 187000000.00,
    status: 'completed',
    startDate: '2024-03-01',
    targetEndDate: '2024-12-31',
    actualEndDate: '2024-12-25',
    delayDays: 0,
    fundSources: [
      { source: 'Central Road Fund', amount: 90000000.00 },
      { source: 'International Multilateral Loans', amount: 100000000.00 }
    ]
  },
  {
    id: 112,
    title: 'Sion-Panvel Expressway Maintenance & Repair',
    roadId: 12,
    contractorId: 11,
    authorityId: 5,
    budgetAllocated: 80000000.00,
    budgetSpent: 31000000.00,
    status: 'in_progress',
    startDate: '2025-12-01',
    targetEndDate: '2026-11-30',
    delayDays: 0,
    fundSources: [
      { source: 'Central Road Fund', amount: 80000000.00 }
    ]
  }
];

// 20 Complaints
export const complaints: Complaint[] = [
  { id: 1, title: 'Severe Potholes near Andheri Flyover', description: 'Multiple deep potholes on the southbound main road. Damaging tires and causing sudden braking.', category: 'pothole', geometry: { type: 'Point', coordinates: [72.8531, 19.1190] }, status: 'in_progress', assignedAuthorityId: 5, roadId: 1, createdAt: '2026-05-15T10:30:00Z' },
  { id: 2, title: 'Missing diversion board near Metro work', description: 'The lane closure indicator is missing. Extremely hazardous at night.', category: 'missing_signage', geometry: { type: 'Point', coordinates: [72.8580, 19.1720] }, status: 'resolved', assignedAuthorityId: 5, roadId: 1, createdAt: '2026-05-10T14:15:00Z' },
  { id: 3, title: 'Uneven Paver Blocks at Bandra Signal', description: 'The interlocking bricks have caved in. Creates a massive bump for motorbikes.', category: 'paving_defect', geometry: { type: 'Point', coordinates: [72.8356, 19.0620] }, status: 'pending', assignedAuthorityId: 1, roadId: 3, createdAt: '2026-05-22T08:00:00Z' },
  { id: 4, title: 'Monsoon Waterlogging outside station', description: 'Water level reaches knee height during high tide rains. Drain inlets are fully clogged.', category: 'waterlogging', geometry: { type: 'Point', coordinates: [72.8362, 19.0980] }, status: 'in_progress', assignedAuthorityId: 1, roadId: 3, createdAt: '2026-05-20T17:45:00Z' },
  { id: 5, title: 'Dumping of building debris on left lane', description: 'Truckloads of sand and broken concrete bricks left on the road blocking traffic.', category: 'debris', geometry: { type: 'Point', coordinates: [72.8272, 19.1260] }, status: 'routed', assignedAuthorityId: 1, roadId: 4, createdAt: '2026-05-18T11:20:00Z' },
  { id: 6, title: 'Crater-sized pothole near Kurla junction', description: 'Nearly 1.5 feet deep. Several auto-rickshaws have overturned trying to avoid it.', category: 'pothole', geometry: { type: 'Point', coordinates: [72.8982, 19.0850] }, status: 'in_progress', assignedAuthorityId: 3, roadId: 5, createdAt: '2026-05-19T09:15:00Z' },
  { id: 7, title: 'Stagnant water near Phoenix mall entrance', description: 'Clogged drains from construction are backing up water onto the road.', category: 'waterlogging', geometry: { type: 'Point', coordinates: [72.9030, 19.1020] }, status: 'pending', assignedAuthorityId: 3, roadId: 5, createdAt: '2026-05-21T13:40:00Z' },
  { id: 8, title: 'Potholes on Vikhroli stretch', description: 'Fast-moving traffic is lane-splitting dangerously to avoid three deep potholes.', category: 'pothole', geometry: { type: 'Point', coordinates: [72.9345, 19.1080] }, status: 'resolved', assignedAuthorityId: 4, roadId: 2, createdAt: '2026-05-12T16:00:00Z' },
  { id: 9, title: 'Scraped asphalt piles on side shoulder', description: 'Scraped road surface from roadwork left on the road shoulder. Blowing dust everywhere.', category: 'debris', geometry: { type: 'Point', coordinates: [72.9465, 19.1710] }, status: 'routed', assignedAuthorityId: 4, roadId: 2, createdAt: '2026-05-16T15:30:00Z' },
  { id: 10, title: 'Fallen speed limit board near school zone', description: 'The pole was hit by a truck and is lying flat on the pavement.', category: 'missing_signage', geometry: { type: 'Point', coordinates: [72.8262, 18.9860] }, status: 'resolved', assignedAuthorityId: 2, roadId: 6, createdAt: '2026-05-14T10:00:00Z' },
  { id: 11, title: 'Sinking road surface near Dadar TT flyover base', description: 'The road surface has depressed, forming a deep depression that fills with water.', category: 'paving_defect', geometry: { type: 'Point', coordinates: [72.8502, 18.9960] }, status: 'pending', assignedAuthorityId: 2, roadId: 7, createdAt: '2026-05-22T12:00:00Z' },
  { id: 12, title: 'JVLR Metro Pillar 12 Potholes', description: 'Multiple defects right next to the metro construction barricade.', category: 'pothole', geometry: { type: 'Point', coordinates: [72.8820, 19.1285] }, status: 'in_progress', assignedAuthorityId: 4, roadId: 8, createdAt: '2026-05-17T09:00:00Z' },
  { id: 13, title: 'Expansion joint gaps on SCLR flyover', description: 'The steel bridge expansion joints are misaligned, causing heavy shocks to cars.', category: 'paving_defect', geometry: { type: 'Point', coordinates: [72.8795, 19.0695] }, status: 'pending', assignedAuthorityId: 4, roadId: 9, createdAt: '2026-05-22T14:00:00Z' },
  { id: 14, title: 'Spilled gravel near Ovala junction', description: 'Dumper truck spilled small gravel stones on the fast lane, making it slippery for two-wheelers.', category: 'debris', geometry: { type: 'Point', coordinates: [72.9315, 19.2525] }, status: 'resolved', assignedAuthorityId: 4, roadId: 10, createdAt: '2026-05-11T16:00:00Z' },
  { id: 15, title: 'Loose concrete flags near promenade', description: 'Footpath stones are loose. Pedestrians trip when stepping on them.', category: 'paving_defect', geometry: { type: 'Point', coordinates: [72.8211, 18.9325] }, status: 'resolved', assignedAuthorityId: 2, roadId: 11, createdAt: '2026-05-13T10:00:00Z' },
  { id: 16, title: 'Highway potholes near Mankhurd T-junction', description: 'Large asphalt crater that slows down the highway bottleneck entry.', category: 'pothole', geometry: { type: 'Point', coordinates: [72.9250, 19.0415] }, status: 'in_progress', assignedAuthorityId: 5, roadId: 12, createdAt: '2026-05-18T10:00:00Z' },
  { id: 17, title: 'Pothole on Malad flyover descent', description: 'Located in the middle lane, extremely dangerous due to highway speeds.', category: 'pothole', geometry: { type: 'Point', coordinates: [72.8592, 19.1865] }, status: 'rejected', assignedAuthorityId: 5, roadId: 1, createdAt: '2026-05-20T11:00:00Z' },
  { id: 18, title: 'Water pooling under Oshiwara bridge', description: 'Even short showers result in water accumulating in the lower dip of the road.', category: 'waterlogging', geometry: { type: 'Point', coordinates: [72.8312, 19.1835] }, status: 'pending', assignedAuthorityId: 1, roadId: 4, createdAt: '2026-05-22T09:00:00Z' },
  { id: 19, title: 'Discarded steel pipes near Bhandup station', description: 'Leftover water pipeline project pipes blocking the footpaths and active street lane.', category: 'debris', geometry: { type: 'Point', coordinates: [72.9348, 19.1975] }, status: 'routed', assignedAuthorityId: 3, roadId: 5, createdAt: '2026-05-19T10:00:00Z' },
  { id: 20, title: 'Broken lane divider reflectors near Vashi Bridge', description: 'Cat-eye reflectors have broken off. Hard to see lane markings in heavy rain.', category: 'missing_signage', geometry: { type: 'Point', coordinates: [72.9982, 19.0402] }, status: 'pending', assignedAuthorityId: 5, roadId: 12, createdAt: '2026-05-22T10:00:00Z' }
];

// Helper functions for data aggregation & resolution
export function getAuthority(id: number): Authority | undefined {
  return authorities.find(a => a.id === id);
}

export function getContractor(id: number): Contractor | undefined {
  return contractors.find(c => c.id === id);
}

export function getRoad(id: number): Road | undefined {
  return roads.find(r => r.id === id);
}

export function getProjectsForRoad(roadId: number): Project[] {
  return projects.filter(p => p.roadId === roadId);
}

export function getComplaintsForRoad(roadId: number): Complaint[] {
  return complaints.filter(c => c.roadId === roadId);
}
