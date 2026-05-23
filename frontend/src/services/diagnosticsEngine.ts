import { Road, Project, Contractor, Complaint } from '@/types';

export interface DiagnosticFactor {
  id: string;
  factorType: 'repair_cycle' | 'complaint_density' | 'contractor_reliability' | 'weather_degradation' | 'drainage_failure' | 'budget_inconsistency';
  title: string;
  severity: 'low' | 'medium' | 'high';
  summary: string;
  evidence: string[]; // Evidence chips
  recommendation: string;
}

export interface RoadDiagnosis {
  roadId: number;
  overallSummary: string;
  confidenceScore: number;
  confidenceLevel: string;
  factors: DiagnosticFactor[];
}

/**
 * Deterministically analyzes road metadata to isolate pavement degradation failure factors.
 */
export function diagnoseRoadSegment(
  road: Road,
  projects: Project[],
  contractors: Contractor[],
  complaints: Complaint[]
): RoadDiagnosis {
  const roadProjects = projects.filter(p => p.roadId === road.id);
  const roadComplaints = complaints.filter(c => c.roadId === road.id);
  const activeComplaints = roadComplaints.filter(c => c.status !== 'resolved' && c.status !== 'rejected');

  const factors: DiagnosticFactor[] = [];

  // ==========================================
  // 1. DRAINAGE FAILURE DETECTION
  // ==========================================
  const waterloggingCount = roadComplaints.filter(c => c.category === 'waterlogging').length;
  const activeWaterlogging = activeComplaints.filter(c => c.category === 'waterlogging').length;

  if (waterloggingCount > 0) {
    factors.push({
      id: 'diag-drainage',
      factorType: 'drainage_failure',
      title: 'Stormwater Drainage Clogging',
      severity: activeWaterlogging > 0 ? 'high' : 'medium',
      summary: 'Sub-surface waterlogging saturates the granular road base. Under dynamic vehicular loads, this trapped moisture generates high pore pressures, stripping the bitumen coating from aggregates and causing road caving.',
      evidence: [
        `${waterloggingCount} waterlogging incident(s) logged`,
        activeWaterlogging > 0 ? 'Active drain blockage reported' : 'History of pooling issues'
      ],
      recommendation: 'Perform mechanical desilting of cross-drain conduits, reconstruct side gutters, and re-grade the transverse pavement slope.'
    });
  }

  // ==========================================
  // 2. REPEATED SHORT REPAIR CYCLES
  // ==========================================
  const sortedProjects = [...roadProjects].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  let hasShortCycle = false;
  const shortCycleProjects: string[] = [];

  for (let i = 0; i < sortedProjects.length - 1; i++) {
    const p1 = sortedProjects[i];
    const p2 = sortedProjects[i + 1];
    const diffMs = new Date(p2.startDate).getTime() - new Date(p1.startDate).getTime();
    const diffMonths = diffMs / (30 * 24 * 60 * 60 * 1000);

    if (diffMonths < 18) {
      hasShortCycle = true;
      if (!shortCycleProjects.includes(p1.title)) shortCycleProjects.push(p1.title);
      if (!shortCycleProjects.includes(p2.title)) shortCycleProjects.push(p2.title);
    }
  }

  if (hasShortCycle) {
    factors.push({
      id: 'diag-cycle',
      factorType: 'repair_cycle',
      title: 'Sub-Base Structural Deficit',
      severity: 'high',
      summary: 'Resurfacing or pothole repair campaigns recurring in intervals of less than 18 months highlight that the pavement distress is a symptom of deep subgrade failure rather than simple surface wear.',
      evidence: [
        'Repairs spaced < 18 months apart',
        `${shortCycleProjects.length} overlapping contracts logged`
      ],
      recommendation: 'Halt cosmetic asphalt overlays. Order soil compaction and core-drilling tests to check sub-base CBR (California Bearing Ratio) ratings.'
    });
  }

  // ==========================================
  // 3. CONTRACTOR RELIABILITY CONCERNS
  // ==========================================
  let hasContractorRisk = false;
  const contractorEvidences: string[] = [];
  let isBlacklistedAssigned = false;

  roadProjects.forEach(p => {
    const c = contractors.find(cont => cont.id === p.contractorId);
    if (c) {
      if (c.blacklisted) {
        hasContractorRisk = true;
        isBlacklistedAssigned = true;
        contractorEvidences.push(`Blacklisted firm assigned: ${c.name}`);
      } else if (c.rating < 3.0) {
        hasContractorRisk = true;
        contractorEvidences.push(`Low-rated contractor: ${c.name} (${c.rating.toFixed(1)}/5)`);
      } else if (p.delayDays > 120) {
        hasContractorRisk = true;
        contractorEvidences.push(`Severe contract delay: ${c.name} (+${p.delayDays} days)`);
      }
    }
  });

  if (hasContractorRisk) {
    factors.push({
      id: 'diag-contractor',
      factorType: 'contractor_reliability',
      title: 'Contractor Execution Deficiencies',
      severity: isBlacklistedAssigned ? 'high' : 'medium',
      summary: 'Projects assigned to contractors with low ratings, active delay logs, or blacklisting reports show high correlation with early asphalt peeling, aggregate segregation, and delayed drainage slab casting.',
      evidence: contractorEvidences,
      recommendation: 'Enforce contract liquidation damage penalties, institute daily quality inspection logs, and ban blacklisted bidders from subcontracting.'
    });
  }

  // ==========================================
  // 4. WEATHER-RELATED MONSOON WEAR
  // ==========================================
  // Monsoon in Mumbai is typically June - September (months 5, 6, 7, 8 in JS Date getMonth())
  const monsoonComplaints = roadComplaints.filter(c => {
    const month = new Date(c.createdAt).getMonth();
    return month >= 5 && month <= 8 && (c.category === 'pothole' || c.category === 'paving_defect');
  });

  if (monsoonComplaints.length >= 2) {
    factors.push({
      id: 'diag-weather',
      factorType: 'weather_degradation',
      title: 'Hydraulic Pavement Pumping',
      severity: monsoonComplaints.length >= 5 ? 'high' : 'medium',
      summary: 'Heavy rainfall combined with heavy commercial axle loads forces water into pavement micro-cracks. Passing tires create extreme hydraulic pressures that blow out aggregate fines, leading to rapid pothole expansion.',
      evidence: [
        `${monsoonComplaints.length} defect reports logged during monsoons`,
        'Water-aggregate adhesion failure'
      ],
      recommendation: 'Apply asphalt crack sealing prior to the monsoon season. Use mastic asphalt or polymer-modified binders (PMB) for waterproofing.'
    });
  }

  // ==========================================
  // 5. BUDGET INCONSISTENCIES
  // ==========================================
  const overrunningProjects = roadProjects.filter(p => p.budgetSpent > p.budgetAllocated);
  if (overrunningProjects.length > 0) {
    const worstOverrun = overrunningProjects.reduce((worst, p) => {
      const pct = (p.budgetSpent - p.budgetAllocated) / p.budgetAllocated;
      return pct > worst.pct ? { title: p.title, pct } : worst;
    }, { title: '', pct: 0 });

    factors.push({
      id: 'diag-budget',
      factorType: 'budget_inconsistency',
      title: 'Financial Oversight Deficit',
      severity: worstOverrun.pct > 0.15 ? 'high' : 'medium',
      summary: 'Unplanned budget increases and cost overruns reflect poor initial engineering estimation, unauthorized alterations in scope, or billing discrepancies.',
      evidence: [
        `${overrunningProjects.length} cost overrun project(s)`,
        `Max overrun: +${(worstOverrun.pct * 100).toFixed(0)}% on "${worstOverrun.title.split(' ')[0]}..."`
      ],
      recommendation: 'Order a detailed bill-of-quantities (BOQ) audit by a third-party agency and implement biometric-linked site progress verification.'
    });
  }

  // ==========================================
  // 6. COMPLAINT DENSITY BACKLOG
  // ==========================================
  if (activeComplaints.length >= 2) {
    factors.push({
      id: 'diag-complaints',
      factorType: 'complaint_density',
      title: 'Pavement Maintenance Backlog',
      severity: activeComplaints.length >= 5 ? 'high' : 'medium',
      summary: 'High density of active citizen defect reports indicates a breakdown in municipal grievance routing, material supply chains, or localized contractor dispatch.',
      evidence: [
        `${activeComplaints.length} unresolved citizen reports`,
        'Average response threshold exceeded'
      ],
      recommendation: 'Direct the ward supervisor to dispatch rapid-response mobile cold-mix patch crews within 24 hours.'
    });
  }

  // ==========================================
  // COMPUTE CONFIDENCE SCORE & OVERALL SUMMARY
  // ==========================================
  let confidenceScore = 40; // Base confidence
  if (roadProjects.length > 0) confidenceScore += 20;
  if (roadComplaints.length > 0) confidenceScore += 20;
  const uniqueContractors = Array.from(new Set(roadProjects.map(p => p.contractorId)));
  if (uniqueContractors.length > 0) confidenceScore += 20;
  confidenceScore = Math.min(100, confidenceScore);

  let confidenceLevel = 'Low Data Density (Sparse History)';
  if (confidenceScore >= 80) confidenceLevel = 'High Data Density (Verified Audits)';
  else if (confidenceScore >= 50) confidenceLevel = 'Moderate Data Density';

  // Overall deterministic summary builder
  let overallSummary = '';
  const highSeverityCount = factors.filter(f => f.severity === 'high').length;
  
  if (factors.length === 0) {
    overallSummary = 'No structural distress vectors isolated. Pavement sub-base and drainage structures are operating within standard performance limits.';
  } else {
    const factorTitles = factors.map(f => f.title.toLowerCase());
    
    if (highSeverityCount >= 2) {
      overallSummary = `Critical multi-vector distress isolated: Segment suffers from compound failures including ${factorTitles[0]} and ${factorTitles[1]}. Comprehensive structural remediation is advised.`;
    } else {
      overallSummary = `Isolated failure vector: Segment degradation is primarily driven by ${factorTitles[0]}. Target repairs to this cause to prevent recurring surface breakdown.`;
    }
  }

  return {
    roadId: road.id,
    overallSummary,
    confidenceScore,
    confidenceLevel,
    factors
  };
}
