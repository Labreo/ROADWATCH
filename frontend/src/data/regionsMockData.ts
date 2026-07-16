import { Road, Authority, Contractor, Project, Complaint } from '@/types';

// =========================================================================
// REGION-SPECIFIC MOCK DATA
// Each region has distinct road naming, authorities, and terminology
// =========================================================================

// --- INDIA (existing data consolidated) ---
export const indiaRoads: Road[] = [
  { id: 1, name: 'Western Express Highway', roadCode: 'WEH-NH8', roadType: 'NH', status: 'under_construction', lengthKm: 25.50, authorityId: 101, lastRelayingDate: '2025-06-01', geometry: { type: 'LineString', coordinates: [[72.8524, 19.1012], [72.8530, 19.1340], [72.8590, 19.1860], [72.8610, 19.2300]] } },
  { id: 2, name: 'S.V. Road', roadCode: 'SV-RD-01', roadType: 'MDR', status: 'poor', lengthKm: 16.80, authorityId: 102, lastRelayingDate: '2023-10-05', geometry: { type: 'LineString', coordinates: [[72.8354, 19.0601], [72.8360, 19.1020], [72.8398, 19.1620], [72.8450, 19.2080]] } },
  { id: 3, name: 'Eastern Express Highway', roadCode: 'EEH-SH3', roadType: 'SH', status: 'fair', lengthKm: 22.10, authorityId: 103, lastRelayingDate: '2025-11-12', geometry: { type: 'LineString', coordinates: [[72.9210, 19.0410], [72.9340, 19.1020], [72.9460, 19.1680], [72.9610, 19.2150]] } },
  { id: 4, name: 'Ghodbunder Road', roadCode: 'GB-SH42', roadType: 'SH', status: 'good', lengthKm: 20.00, authorityId: 103, lastRelayingDate: '2024-12-25', geometry: { type: 'LineString', coordinates: [[72.9550, 19.2220], [72.9310, 19.2520], [72.8990, 19.2680], [72.8680, 19.2810]] } },
  { id: 5, name: 'Linking Road', roadCode: 'LNK-RD-04', roadType: 'MDR', status: 'fair', lengthKm: 8.40, authorityId: 102, lastRelayingDate: '2024-03-18', geometry: { type: 'LineString', coordinates: [[72.8330, 19.0540], [72.8355, 19.0720], [72.8375, 19.0910], [72.8390, 19.1080]] } },
  { id: 6, name: 'Sion-Panvel Expressway', roadCode: 'SPE-SH54', roadType: 'SH', status: 'good', lengthKm: 24.30, authorityId: 103, lastRelayingDate: '2025-02-22', geometry: { type: 'LineString', coordinates: [[73.0180, 19.0430], [73.0450, 19.0080], [73.0820, 18.9720], [73.1100, 18.9910]] } },
  { id: 7, name: 'LBS Marg', roadCode: 'LBS-MDR-07', roadType: 'MDR', status: 'poor', lengthKm: 14.60, authorityId: 102, lastRelayingDate: '2022-07-30', geometry: { type: 'LineString', coordinates: [[72.8790, 19.0680], [72.8880, 19.1050], [72.8990, 19.1440], [72.9080, 19.1810]] } },
  { id: 8, name: 'Jogeshwari-Vikhroli Link Road', roadCode: 'JVLR-MDR-12', roadType: 'MDR', status: 'fair', lengthKm: 10.70, authorityId: 102, lastRelayingDate: '2024-09-14', geometry: { type: 'LineString', coordinates: [[72.8480, 19.1360], [72.8730, 19.1290], [72.9020, 19.1240], [72.9310, 19.1200]] } },
  { id: 9, name: 'Mumbai-Pune Expressway', roadCode: 'MPEW-NH48', roadType: 'NH', status: 'good', lengthKm: 94.50, authorityId: 101, lastRelayingDate: '2025-05-10', geometry: { type: 'LineString', coordinates: [[73.1200, 18.9500], [73.3500, 18.8200], [73.5800, 18.7400], [73.8200, 18.6100]] } },
  { id: 10, name: 'Bandra-Worli Sea Link', roadCode: 'BWSL-NH8', roadType: 'NH', status: 'good', lengthKm: 5.60, authorityId: 101, lastRelayingDate: '2025-08-01', geometry: { type: 'LineString', coordinates: [[72.8180, 19.0430], [72.8210, 19.0290], [72.8250, 19.0150], [72.8280, 19.0010]] } },
  { id: 11, name: 'Marine Drive', roadCode: 'MD-RD-02', roadType: 'MDR', status: 'good', lengthKm: 3.60, authorityId: 102, lastRelayingDate: '2025-01-05', geometry: { type: 'LineString', coordinates: [[72.8230, 18.9440], [72.8210, 18.9310], [72.8195, 18.9180], [72.8185, 18.9080]] } },
  { id: 12, name: 'Andheri-Kurla Road', roadCode: 'AKR-MDR-09', roadType: 'MDR', status: 'poor', lengthKm: 9.20, authorityId: 102, lastRelayingDate: '2023-06-11', geometry: { type: 'LineString', coordinates: [[72.8450, 19.1180], [72.8620, 19.1040], [72.8790, 19.0900], [72.8880, 19.0730]] } },
  { id: 13, name: 'Palm Beach Road', roadCode: 'PBR-SH61', roadType: 'SH', status: 'good', lengthKm: 10.30, authorityId: 103, lastRelayingDate: '2025-04-19', geometry: { type: 'LineString', coordinates: [[73.0000, 19.0300], [73.0080, 19.0080], [73.0150, 18.9860], [73.0210, 18.9640]] } },
  { id: 14, name: 'Aarey Road', roadCode: 'ARY-MDR-15', roadType: 'MDR', status: 'fair', lengthKm: 7.80, authorityId: 102, lastRelayingDate: '2024-11-28', geometry: { type: 'LineString', coordinates: [[72.8680, 19.1500], [72.8720, 19.1680], [72.8770, 19.1860], [72.8810, 19.2040]] } },
];

export const indiaAuthorities: Authority[] = [
  { id: 101, name: 'National Highways Authority of India (NHAI) - Mumbai', departmentCode: 'NHAI-MUM', contactEmail: 'mumbai@nhai.org', contactPhone: '+91-22-2756-0100', boundaryGeoJSON: { type: 'Polygon', coordinates: [[[72.60, 18.70], [73.15, 18.70], [73.15, 19.45], [72.60, 19.45], [72.60, 18.70]]] }, regionCode: 'IN' },
  { id: 102, name: 'BMC Ward H-East Roads & Traffic', departmentCode: 'BMC-HE', contactEmail: 'ee.roads.he@mcgm.gov.in', contactPhone: '+91-22-2618-2222', boundaryGeoJSON: { type: 'Polygon', coordinates: [[[72.80, 19.00], [72.95, 19.00], [72.95, 19.22], [72.80, 19.22], [72.80, 19.00]]] }, regionCode: 'IN' },
  { id: 103, name: 'Maharashtra PWD - Mumbai Division', departmentCode: 'PWD-MUM', contactEmail: 'se.mumbai@pwd.gov.in', contactPhone: '+91-22-2202-3333', boundaryGeoJSON: { type: 'Polygon', coordinates: [[[72.70, 18.80], [73.05, 18.80], [73.05, 19.30], [72.70, 19.30], [72.70, 18.80]]] }, regionCode: 'IN' },
];

export const indiaContractors: Contractor[] = [
  { id: 101, name: 'Apex Infrastructure Ltd', licenseNumber: 'LIC-2015-1102', registrationDate: '2015-04-12', contactEmail: 'contact@apexinfra.com', contactPhone: '+91-22-6123-4567', rating: 4.25, projectsCompleted: 24, projectsDelayed: 2, blacklisted: false },
  { id: 102, name: 'Omega Infrastructure Ltd', licenseNumber: 'LIC-2020-8812', registrationDate: '2020-06-30', contactEmail: 'omega.engg@rediffmail.com', contactPhone: '+91-98200-11223', rating: 1.85, projectsCompleted: 12, projectsDelayed: 8, blacklisted: true, blacklistedReason: 'Substandard aggregate substitution on SV Road drainage project' },
  { id: 103, name: 'Bharat Roads & Highways Ltd', licenseNumber: 'LIC-2010-0010', registrationDate: '2010-05-05', contactEmail: 'contact@bharatroads.co.in', contactPhone: '+91-22-2651-1234', rating: 4.75, projectsCompleted: 85, projectsDelayed: 3, blacklisted: false },
  { id: 104, name: 'Konkan Constructions Pvt Ltd', licenseNumber: 'LIC-2013-3345', registrationDate: '2013-08-19', contactEmail: 'projects@konkancon.in', contactPhone: '+91-22-2841-5566', rating: 3.95, projectsCompleted: 41, projectsDelayed: 5, blacklisted: false },
  { id: 105, name: 'Sahyadri Infra Developers', licenseNumber: 'LIC-2018-7789', registrationDate: '2018-02-14', contactEmail: 'info@sahyadriinfra.in', contactPhone: '+91-98330-44556', rating: 2.40, projectsCompleted: 16, projectsDelayed: 7, blacklisted: true, blacklistedReason: 'Cost overruns and abandoned LBS Marg widening midway through phase 2' },
  { id: 106, name: 'Maratha Roadways Corp', licenseNumber: 'LIC-2011-0456', registrationDate: '2011-11-02', contactEmail: 'contact@maratharoadways.co.in', contactPhone: '+91-22-2789-3344', rating: 4.55, projectsCompleted: 63, projectsDelayed: 2, blacklisted: false },
];

export const indiaProjects: Project[] = [
  { id: 101, title: 'WEH Flyover Resurfacing & Structural Grouting', roadId: 1, contractorId: 101, authorityId: 101, budgetAllocated: 240000000, budgetSpent: 185000000, status: 'in_progress', startDate: '2025-06-01', targetEndDate: '2026-06-30', delayDays: 0, fundSources: [{ source: 'Central Road Infrastructure Fund', amount: 140000000 }, { source: 'Taxpayer Distribution Ratios', amount: 100000000 }] },
  { id: 102, title: 'SV Road Drainage Trenching and Microtunnelling', roadId: 2, contractorId: 102, authorityId: 102, budgetAllocated: 95000000, budgetSpent: 45000000, status: 'halted', startDate: '2024-05-10', targetEndDate: '2025-05-10', delayDays: 378, fundSources: [{ source: 'Municipal General Portfolios', amount: 95000000 }] },
  { id: 103, title: 'EEH Pothole Remediation Campaign', roadId: 3, contractorId: 103, authorityId: 103, budgetAllocated: 18000000, budgetSpent: 19200000, status: 'completed', startDate: '2025-09-01', targetEndDate: '2025-10-31', actualEndDate: '2025-11-12', delayDays: 12, fundSources: [{ source: 'State PWD Capital Tiers', amount: 18000000 }] },
  { id: 104, title: 'Linking Road Resurfacing & Footpath Renewal', roadId: 5, contractorId: 104, authorityId: 102, budgetAllocated: 62000000, budgetSpent: 41000000, status: 'in_progress', startDate: '2025-03-18', targetEndDate: '2026-01-31', delayDays: 0, fundSources: [{ source: 'Municipal General Portfolios', amount: 62000000 }] },
  { id: 105, title: 'Sion-Panvel Expressway Concrete Overlay', roadId: 6, contractorId: 103, authorityId: 103, budgetAllocated: 310000000, budgetSpent: 298000000, status: 'completed', startDate: '2024-01-10', targetEndDate: '2025-02-28', actualEndDate: '2025-02-22', delayDays: 0, fundSources: [{ source: 'State PWD Capital Tiers', amount: 200000000 }, { source: 'Central Road Infrastructure Fund', amount: 110000000 }] },
  { id: 106, title: 'LBS Marg Widening Phase 2', roadId: 7, contractorId: 105, authorityId: 102, budgetAllocated: 128000000, budgetSpent: 74000000, status: 'halted', startDate: '2022-08-01', targetEndDate: '2024-08-01', delayDays: 715, fundSources: [{ source: 'Municipal General Portfolios', amount: 128000000 }] },
  { id: 107, title: 'JVLR Signal-Free Corridor Upgrade', roadId: 8, contractorId: 106, authorityId: 102, budgetAllocated: 210000000, budgetSpent: 156000000, status: 'in_progress', startDate: '2024-09-14', targetEndDate: '2026-03-31', delayDays: 30, fundSources: [{ source: 'Municipal General Portfolios', amount: 120000000 }, { source: 'State PWD Capital Tiers', amount: 90000000 }] },
  { id: 108, title: 'Mumbai-Pune Expressway Missing Link Tunnel', roadId: 9, contractorId: 103, authorityId: 101, budgetAllocated: 6800000000, budgetSpent: 5200000000, status: 'in_progress', startDate: '2023-04-01', targetEndDate: '2027-06-30', delayDays: 0, fundSources: [{ source: 'Central Road Infrastructure Fund', amount: 4000000000 }, { source: 'International Multilateral Loans', amount: 2800000000 }] },
  { id: 109, title: 'Bandra-Worli Sea Link Expansion Joint Retrofit', roadId: 10, contractorId: 101, authorityId: 101, budgetAllocated: 145000000, budgetSpent: 142000000, status: 'completed', startDate: '2025-01-15', targetEndDate: '2025-08-15', actualEndDate: '2025-08-01', delayDays: 0, fundSources: [{ source: 'Central Road Infrastructure Fund', amount: 145000000 }] },
  { id: 110, title: 'Andheri-Kurla Road Drainage & Repaving', roadId: 12, contractorId: 105, authorityId: 102, budgetAllocated: 58000000, budgetSpent: 33000000, status: 'halted', startDate: '2023-06-11', targetEndDate: '2024-06-11', delayDays: 400, fundSources: [{ source: 'Municipal General Portfolios', amount: 58000000 }] },
  { id: 111, title: 'Palm Beach Road Median & Lighting Upgrade', roadId: 13, contractorId: 104, authorityId: 103, budgetAllocated: 84000000, budgetSpent: 81000000, status: 'completed', startDate: '2024-06-01', targetEndDate: '2025-04-30', actualEndDate: '2025-04-19', delayDays: 0, fundSources: [{ source: 'State PWD Capital Tiers', amount: 84000000 }] },
];

// --- UNITED KINGDOM ---
export const ukRoads: Road[] = [
  { id: 201, name: 'M25 Orbital Motorway', roadCode: 'M25', roadType: 'Motorway', status: 'fair', lengthKm: 188.50, authorityId: 201, lastRelayingDate: '2024-08-15', geometry: { type: 'LineString', coordinates: [[-0.3500, 51.6500], [-0.3100, 51.6200], [-0.2500, 51.5800], [-0.1800, 51.5400]] } },
  { id: 202, name: 'A406 North Circular Road', roadCode: 'A406', roadType: 'A-Road', status: 'poor', lengthKm: 25.70, authorityId: 202, lastRelayingDate: '2022-11-03', geometry: { type: 'LineString', coordinates: [[-0.2800, 51.5550], [-0.2400, 51.5700], [-0.1900, 51.5850], [-0.1400, 51.6000]] } },
  { id: 203, name: 'A1 Great North Road', roadCode: 'A1', roadType: 'A-Road', status: 'good', lengthKm: 410.00, authorityId: 201, lastRelayingDate: '2025-03-20', geometry: { type: 'LineString', coordinates: [[-0.1200, 51.5200], [-0.1000, 51.5800], [-0.0800, 51.6500], [-0.0500, 51.7200]] } },
  { id: 204, name: 'M1 Motorway', roadCode: 'M1', roadType: 'Motorway', status: 'fair', lengthKm: 310.00, authorityId: 201, lastRelayingDate: '2024-12-01', geometry: { type: 'LineString', coordinates: [[-0.2800, 51.6100], [-0.3500, 51.7000], [-0.4200, 51.8000], [-0.5000, 51.9000]] } },
];

export const ukAuthorities: Authority[] = [
  { id: 201, name: 'National Highways (England) - London Region', departmentCode: 'NH-LON', contactEmail: 'london@nationalhighways.co.uk', contactPhone: '+44-20-7946-0100', boundaryGeoJSON: { type: 'Polygon', coordinates: [[[-1.0, 51.0], [0.5, 51.0], [0.5, 52.0], [-1.0, 52.0], [-1.0, 51.0]]] }, regionCode: 'GB' },
  { id: 202, name: 'London Borough of Barnet Highways Division', departmentCode: 'BAR-HW', contactEmail: 'highways@barnet.gov.uk', contactPhone: '+44-20-8359-2000', boundaryGeoJSON: { type: 'Polygon', coordinates: [[[-0.30, 51.55], [-0.15, 51.55], [-0.15, 51.65], [-0.30, 51.65], [-0.30, 51.55]]] }, regionCode: 'GB' },
  { id: 203, name: 'Transport for London (TfL) Road Network', departmentCode: 'TFL-RN', contactEmail: 'roadnet@tfl.gov.uk', contactPhone: '+44-20-3054-7000', boundaryGeoJSON: { type: 'Polygon', coordinates: [[[-0.35, 51.40], [0.10, 51.40], [0.10, 51.65], [-0.35, 51.65], [-0.35, 51.40]]] }, regionCode: 'GB' },
];

export const ukContractors: Contractor[] = [
  { id: 201, name: 'Balfour Beatty Civil Engineering', licenseNumber: 'UK-LIC-2010-4481', registrationDate: '2010-03-15', contactEmail: 'projects@balfourbeatty.co.uk', contactPhone: '+44-20-7216-6800', rating: 4.30, projectsCompleted: 156, projectsDelayed: 12, blacklisted: false },
  { id: 202, name: 'Tarmac Road Services Ltd', licenseNumber: 'UK-LIC-2012-7723', registrationDate: '2012-07-22', contactEmail: 'roads@tarmac.com', contactPhone: '+44-1902-382-600', rating: 3.90, projectsCompleted: 98, projectsDelayed: 8, blacklisted: false },
  { id: 203, name: 'Ringway Infrastructure Ltd', licenseNumber: 'UK-LIC-2015-2290', registrationDate: '2015-01-10', contactEmail: 'info@ringway.co.uk', contactPhone: '+44-1372-743-000', rating: 2.10, projectsCompleted: 45, projectsDelayed: 14, blacklisted: true, blacklistedReason: 'Failed M25 resurfacing contract — asphalt delamination within 6 months of completion' },
];

export const ukProjects: Project[] = [
  { id: 201, title: 'M25 Junction 10-16 Smart Motorway Upgrade', roadId: 201, contractorId: 201, authorityId: 201, budgetAllocated: 324000000, budgetSpent: 298000000, status: 'in_progress', startDate: '2024-01-15', targetEndDate: '2026-12-31', delayDays: 0, fundSources: [{ source: 'Central Road Fund', amount: 324000000 }] },
  { id: 202, title: 'A406 North Circular Pothole Repair Programme', roadId: 202, contractorId: 202, authorityId: 202, budgetAllocated: 42000000, budgetSpent: 38500000, status: 'in_progress', startDate: '2025-04-01', targetEndDate: '2025-09-30', delayDays: 45, fundSources: [{ source: 'Municipal General Tier', amount: 28000000 }, { source: 'State PWD Allocations', amount: 14000000 }] },
  { id: 203, title: 'A1 Safety Barrier & Surface Renewal', roadId: 203, contractorId: 201, authorityId: 201, budgetAllocated: 156000000, budgetSpent: 152000000, status: 'completed', startDate: '2024-06-01', targetEndDate: '2025-03-31', actualEndDate: '2025-03-20', delayDays: 0, fundSources: [{ source: 'Central Road Fund', amount: 156000000 }] },
];

// --- UNITED STATES ---
export const usRoads: Road[] = [
  { id: 301, name: 'I-94 Edsel Ford Freeway', roadCode: 'I-94', roadType: 'Interstate', status: 'fair', lengthKm: 45.20, authorityId: 301, lastRelayingDate: '2024-06-10', geometry: { type: 'LineString', coordinates: [[-83.1000, 42.3200], [-83.0400, 42.3500], [-82.9600, 42.3800], [-82.8800, 42.4100]] } },
  { id: 302, name: 'M-1 Woodward Avenue', roadCode: 'M-1', roadType: 'State-Highway', status: 'poor', lengthKm: 21.30, authorityId: 302, lastRelayingDate: '2022-04-22', geometry: { type: 'LineString', coordinates: [[-83.0600, 42.3400], [-83.0680, 42.3800], [-83.0800, 42.4200], [-83.0900, 42.4600]] } },
  { id: 303, name: 'I-75 Fisher Freeway', roadCode: 'I-75', roadType: 'Interstate', status: 'good', lengthKm: 62.80, authorityId: 301, lastRelayingDate: '2025-09-05', geometry: { type: 'LineString', coordinates: [[-83.0500, 42.2500], [-83.0700, 42.3100], [-83.1000, 42.3700], [-83.1300, 42.4300]] } },
  { id: 304, name: 'US-12 Michigan Avenue', roadCode: 'US-12', roadType: 'US-Highway', status: 'fair', lengthKm: 28.60, authorityId: 302, lastRelayingDate: '2024-11-15', geometry: { type: 'LineString', coordinates: [[-83.1500, 42.3000], [-83.1000, 42.3150], [-83.0400, 42.3300], [-82.9800, 42.3450]] } },
];

export const usAuthorities: Authority[] = [
  { id: 301, name: 'Michigan Department of Transportation (MDOT) - Metro Region', departmentCode: 'MDOT-METRO', contactEmail: 'mdot-metro@michigan.gov', contactPhone: '+1-313-375-2400', boundaryGeoJSON: { type: 'Polygon', coordinates: [[[-83.50, 42.00], [-82.80, 42.00], [-82.80, 42.60], [-83.50, 42.60], [-83.50, 42.00]]] }, regionCode: 'US' },
  { id: 302, name: 'City of Detroit Department of Public Works', departmentCode: 'DET-DPW', contactEmail: 'dpw@detroitmi.gov', contactPhone: '+1-313-224-3900', boundaryGeoJSON: { type: 'Polygon', coordinates: [[[-83.20, 42.30], [-82.90, 42.30], [-82.90, 42.45], [-83.20, 42.45], [-83.20, 42.30]]] }, regionCode: 'US' },
  { id: 303, name: 'Wayne County Road Commission', departmentCode: 'WCRC', contactEmail: 'roads@waynecounty.com', contactPhone: '+1-734-662-2500', boundaryGeoJSON: { type: 'Polygon', coordinates: [[[-83.50, 42.10], [-82.90, 42.10], [-82.90, 42.40], [-83.50, 42.40], [-83.50, 42.10]]] }, regionCode: 'US' },
];

export const usContractors: Contractor[] = [
  { id: 301, name: 'Pulte Road Construction Inc', licenseNumber: 'US-LIC-2013-0012', registrationDate: '2013-05-20', contactEmail: 'roads@pulte.com', contactPhone: '+1-248-433-4500', rating: 4.10, projectsCompleted: 67, projectsDelayed: 5, blacklisted: false },
  { id: 302, name: 'Michigan Paving & Materials Co', licenseNumber: 'US-LIC-2016-8812', registrationDate: '2016-09-15', contactEmail: 'info@michiganpaving.com', contactPhone: '+1-313-841-2600', rating: 3.40, projectsCompleted: 34, projectsDelayed: 7, blacklisted: false },
  { id: 303, name: 'Detroit Asphalt Specialists LLC', licenseNumber: 'US-LIC-2018-4490', registrationDate: '2018-02-01', contactEmail: 'bids@detroitasphalt.com', contactPhone: '+1-313-555-0199', rating: 1.95, projectsCompleted: 11, projectsDelayed: 6, blacklisted: true, blacklistedReason: 'Repeated failure to meet I-94 joint density specifications — 3 separate breach notices issued' },
];

export const usProjects: Project[] = [
  { id: 301, title: 'I-94 Rehabilitation & Bridge Replacement', roadId: 301, contractorId: 301, authorityId: 301, budgetAllocated: 185000000, budgetSpent: 142000000, status: 'in_progress', startDate: '2024-03-01', targetEndDate: '2026-08-31', delayDays: 0, fundSources: [{ source: 'Central Road Fund', amount: 120000000 }, { source: 'State PWD Allocations', amount: 65000000 }] },
  { id: 302, title: 'Woodward Avenue Streetcar Track & Road Repair', roadId: 302, contractorId: 302, authorityId: 302, budgetAllocated: 52000000, budgetSpent: 55000000, status: 'in_progress', startDate: '2024-10-01', targetEndDate: '2025-12-31', delayDays: 120, fundSources: [{ source: 'Municipal General Tier', amount: 52000000 }] },
  { id: 303, title: 'I-75 Express Lane Expansion', roadId: 303, contractorId: 301, authorityId: 301, budgetAllocated: 420000000, budgetSpent: 415000000, status: 'completed', startDate: '2022-01-15', targetEndDate: '2025-09-30', actualEndDate: '2025-09-05', delayDays: 0, fundSources: [{ source: 'Central Road Fund', amount: 300000000 }, { source: 'International Multilateral Loans', amount: 120000000 }] },
];

// --- KENYA ---
export const keRoads: Road[] = [
  { id: 401, name: 'A104 Nairobi-Nakuru Highway', roadCode: 'A104', roadType: 'A-Road', status: 'poor', lengthKm: 160.00, authorityId: 401, lastRelayingDate: '2021-08-20', geometry: { type: 'LineString', coordinates: [[36.8200, -1.2800], [36.7500, -1.1000], [36.6500, -0.8500], [36.5500, -0.6000]] } },
  { id: 402, name: 'A109 Mombasa Road', roadCode: 'A109', roadType: 'A-Road', status: 'fair', lengthKm: 480.00, authorityId: 401, lastRelayingDate: '2024-02-10', geometry: { type: 'LineString', coordinates: [[36.8300, -1.3200], [36.9000, -1.3500], [37.0000, -1.4000], [37.1500, -1.4500]] } },
  { id: 403, name: 'B3 Thika Road', roadCode: 'B3', roadType: 'B-Road', status: 'good', lengthKm: 45.00, authorityId: 402, lastRelayingDate: '2025-07-01', geometry: { type: 'LineString', coordinates: [[36.8600, -1.2300], [36.9100, -1.1800], [36.9700, -1.1200], [37.0200, -1.0600]] } },
  { id: 404, name: 'C62 Kiambu Road', roadCode: 'C62', roadType: 'C-Road', status: 'fair', lengthKm: 22.50, authorityId: 403, lastRelayingDate: '2024-10-05', geometry: { type: 'LineString', coordinates: [[36.8000, -1.2200], [36.7900, -1.1700], [36.7800, -1.1200], [36.7700, -1.0700]] } },
];

export const keAuthorities: Authority[] = [
  { id: 401, name: 'Kenya National Highways Authority (KeNHA) - Nairobi Region', departmentCode: 'KeNHA-NBI', contactEmail: 'nairobi@kenha.co.ke', contactPhone: '+254-20-272-5700', boundaryGeoJSON: { type: 'Polygon', coordinates: [[[36.50, -1.50], [37.20, -1.50], [37.20, -0.80], [36.50, -0.80], [36.50, -1.50]]] }, regionCode: 'KE' },
  { id: 402, name: 'Kenya Urban Roads Authority (KURA) - Nairobi', departmentCode: 'KURA-NBI', contactEmail: 'nairobi@kura.go.ke', contactPhone: '+254-20-272-5800', boundaryGeoJSON: { type: 'Polygon', coordinates: [[[36.70, -1.35], [36.95, -1.35], [36.95, -1.15], [36.70, -1.15], [36.70, -1.35]]] }, regionCode: 'KE' },
  { id: 403, name: 'Kiambu County Department of Infrastructure', departmentCode: 'KIA-INFRA', contactEmail: 'infrastructure@kiambu.go.ke', contactPhone: '+254-20-262-5000', boundaryGeoJSON: { type: 'Polygon', coordinates: [[[36.70, -1.30], [37.00, -1.30], [37.00, -1.00], [36.70, -1.00], [36.70, -1.30]]] }, regionCode: 'KE' },
];

export const keContractors: Contractor[] = [
  { id: 401, name: 'Haji & Sons Road Contractors Ltd', licenseNumber: 'KE-LIC-2014-3351', registrationDate: '2014-08-11', contactEmail: 'info@hajiroads.co.ke', contactPhone: '+254-20-234-5678', rating: 3.80, projectsCompleted: 42, projectsDelayed: 6, blacklisted: false },
  { id: 402, name: 'Buzeki Roadworks & Quarry Ltd', licenseNumber: 'KE-LIC-2016-7721', registrationDate: '2016-03-22', contactEmail: 'tenders@buzekiroads.co.ke', contactPhone: '+254-722-200-300', rating: 4.20, projectsCompleted: 28, projectsDelayed: 2, blacklisted: false },
  { id: 403, name: 'Kenya Rural Roads Constructions Ltd', licenseNumber: 'KE-LIC-2017-1190', registrationDate: '2017-11-05', contactEmail: 'info@kenyaruralroads.co.ke', contactPhone: '+254-41-231-9000', rating: 2.50, projectsCompleted: 19, projectsDelayed: 9, blacklisted: true, blacklistedReason: 'Substandard materials on A104 upgrade — gravelling thickness below specification by 40%' },
];

export const keProjects: Project[] = [
  { id: 401, title: 'A104 Nairobi-Nakuru Dual Carriageway Upgrade', roadId: 401, contractorId: 401, authorityId: 401, budgetAllocated: 8200000000, budgetSpent: 4800000000, status: 'in_progress', startDate: '2023-06-01', targetEndDate: '2027-12-31', delayDays: 0, fundSources: [{ source: 'Central Road Fund', amount: 5000000000 }, { source: 'International Multilateral Loans', amount: 3200000000 }] },
  { id: 402, title: 'Mombasa Road Emergency Pothole Patching', roadId: 402, contractorId: 402, authorityId: 401, budgetAllocated: 450000000, budgetSpent: 380000000, status: 'in_progress', startDate: '2025-01-15', targetEndDate: '2025-06-30', delayDays: 30, fundSources: [{ source: 'State PWD Allocations', amount: 450000000 }] },
  { id: 403, title: 'Thika Road Corridor Maintenance', roadId: 403, contractorId: 402, authorityId: 402, budgetAllocated: 280000000, budgetSpent: 275000000, status: 'completed', startDate: '2024-07-01', targetEndDate: '2025-07-01', actualEndDate: '2025-07-01', delayDays: 0, fundSources: [{ source: 'Municipal General Tier', amount: 280000000 }] },
];

// Region boundary polygons for GPS detection
export const getRegionBoundary = (regionCode: string): [number, number][] => {
  const boundaries: Record<string, [number, number][]> = {
    IN: [[68.1, 6.8], [97.4, 6.8], [97.4, 35.7], [68.1, 35.7], [68.1, 6.8]],
    GB: [[-8.6, 49.8], [1.8, 49.8], [1.8, 60.9], [-8.6, 60.9], [-8.6, 49.8]],
    US: [[-125.0, 24.5], [-66.9, 24.5], [-66.9, 49.4], [-125.0, 49.4], [-125.0, 24.5]],
    KE: [[33.8, -4.7], [41.9, -4.7], [41.9, 5.5], [33.8, 5.5], [33.8, -4.7]],
  };
  return boundaries[regionCode] || boundaries.IN;
};

// Region metadata for display
export const regionInfo = {
  IN: { code: 'IN', name: 'India', flag: '🇮🇳', capital: 'New Delhi', roadNaming: 'NH {number} / SH {number}', population: '1.4B', currency: '₹ INR', timezone: 'Asia/Kolkata (+05:30)' },
  GB: { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', capital: 'London', roadNaming: 'M{number} / A{number} / B{number}', population: '67M', currency: '£ GBP', timezone: 'Europe/London (+00:00)' },
  US: { code: 'US', name: 'United States', flag: '🇺🇸', capital: 'Washington DC', roadNaming: 'I-{number} / US {number} / SR {number}', population: '331M', currency: '$ USD', timezone: 'America/Detroit (-05:00)' },
  KE: { code: 'KE', name: 'Kenya', flag: '🇰🇪', capital: 'Nairobi', roadNaming: 'A{number} / B{number} / C{number}', population: '54M', currency: 'KSh KES', timezone: 'Africa/Nairobi (+03:00)' },
};

// Get all data for a region
export function getRegionData(regionCode: string) {
  const map: Record<string, { roads: Road[]; authorities: Authority[]; contractors: Contractor[]; projects: Project[] }> = {
    IN: { roads: indiaRoads, authorities: indiaAuthorities, contractors: indiaContractors, projects: indiaProjects },
    GB: { roads: ukRoads, authorities: ukAuthorities, contractors: ukContractors, projects: ukProjects },
    US: { roads: usRoads, authorities: usAuthorities, contractors: usContractors, projects: usProjects },
    KE: { roads: keRoads, authorities: keAuthorities, contractors: keContractors, projects: keProjects },
  };
  return map[regionCode] || map.IN;
}