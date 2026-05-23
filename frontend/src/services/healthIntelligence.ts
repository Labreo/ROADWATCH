import { Road, Project, Contractor, Complaint } from '@/types';

export interface HealthDeduction {
  points: number;
  reason: string;
  category: 'complaint' | 'gap' | 'frequency';
}

export interface TransparencyDeduction {
  points: number;
  reason: string;
  category: 'overrun' | 'delay' | 'contractor' | 'repeat';
}

export interface ReliabilityFactor {
  contractorName: string;
  score: number;
  reason: string;
  isBlacklisted: boolean;
}

export interface DamageRiskFactor {
  percentage: number;
  reason: string;
  type: 'waterlogging' | 'pothole' | 'defect' | 'repeat' | 'gap';
}

export interface RoadHealthIntelligence {
  roadId: number;
  
  // 1. Road Health Score
  healthScore: number;
  healthDeductions: HealthDeduction[];
  
  // 2. Transparency Score
  transparencyScore: number;
  transparencyDeductions: TransparencyDeduction[];
  
  // 3. Contractor Reliability Score
  contractorReliabilityScore: number;
  reliabilityFactors: ReliabilityFactor[];
  
  // 4. Recurring Damage Risk
  recurringDamageRisk: number; // 0 - 100
  damageRiskFactors: DamageRiskFactor[];
  damageRiskCategory: 'Low' | 'Medium' | 'High';
  
  // 5. Confidence Score
  confidenceScore: number; // 0 - 100
  confidenceLevel: string;
  confidenceReasons: string[];
}

/**
 * Calculates road health intelligence details based on explainable, deterministic scoring logic.
 */
export function calculateRoadHealthIntelligence(
  road: Road,
  projects: Project[],
  contractors: Contractor[],
  complaints: Complaint[]
): RoadHealthIntelligence {
  const roadProjects = projects.filter(p => p.roadId === road.id);
  const roadComplaints = complaints.filter(c => c.roadId === road.id);

  // Parse current system date (simulated as May 23, 2026)
  const currentDate = new Date('2026-05-23');
  const relayDate = new Date(road.lastRelayingDate);
  const diffTime = Math.abs(currentDate.getTime() - relayDate.getTime());
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

  // ==========================================
  // 1. ROAD HEALTH SCORE CALCULATIONS
  // ==========================================
  let healthScore = 100;
  const healthDeductions: HealthDeduction[] = [];

  // Active Complaints deductions
  const activeComplaints = roadComplaints.filter(c => c.status !== 'resolved' && c.status !== 'rejected');
  let complaintsDeductionSum = 0;
  
  activeComplaints.forEach(c => {
    let pts = 5;
    let category: 'complaint' = 'complaint';
    if (c.category === 'pothole') pts = 10;
    else if (c.category === 'waterlogging') pts = 12;
    else if (c.category === 'paving_defect') pts = 8;
    else if (c.category === 'debris') pts = 5;
    else if (c.category === 'missing_signage') pts = 3;

    complaintsDeductionSum += pts;
    healthDeductions.push({
      points: pts,
      reason: `Active ${c.category.replace('_', ' ')}: "${c.title}"`,
      category
    });
  });

  // Cap complaint deductions at -40 to prevent negative overflows, but detail all deductions
  if (complaintsDeductionSum > 40) {
    const overflowDiff = complaintsDeductionSum - 40;
    healthDeductions.push({
      points: -overflowDiff,
      reason: `Deduction adjustment (complaints cap at -40 points)`,
      category: 'complaint'
    });
    healthScore -= 40;
  } else {
    healthScore -= complaintsDeductionSum;
  }

  // Maintenance gap deductions
  if (diffYears > 2.5) {
    healthDeductions.push({
      points: 20,
      reason: `Critical maintenance gap: Last paved ${diffYears.toFixed(1)} years ago (Interval limit: 2.5 years)`,
      category: 'gap'
    });
    healthScore -= 20;
  } else if (diffYears > 1.5) {
    healthDeductions.push({
      points: 10,
      reason: `Moderate maintenance gap: Last paved ${diffYears.toFixed(1)} years ago`,
      category: 'gap'
    });
    healthScore -= 10;
  } else if (diffYears > 1.0) {
    healthDeductions.push({
      points: 5,
      reason: `Minor maintenance gap: Last paved ${diffYears.toFixed(1)} years ago`,
      category: 'gap'
    });
    healthScore -= 5;
  }

  // Repair frequency deductions
  if (roadProjects.length >= 3) {
    healthDeductions.push({
      points: 15,
      reason: `High repair frequency: ${roadProjects.length} major civil projects logged within 3 years`,
      category: 'frequency'
    });
    healthScore -= 15;
  } else if (roadProjects.length === 2) {
    healthDeductions.push({
      points: 5,
      reason: `Moderate repair frequency: 2 projects logged on segment`,
      category: 'frequency'
    });
    healthScore -= 5;
  }

  healthScore = Math.max(10, healthScore);

  // ==========================================
  // 2. TRANSPARENCY SCORE CALCULATIONS
  // ==========================================
  let transparencyScore = 100;
  const transparencyDeductions: TransparencyDeduction[] = [];

  roadProjects.forEach(p => {
    // Budget overruns
    if (p.budgetSpent > p.budgetAllocated) {
      const excess = p.budgetSpent - p.budgetAllocated;
      const pct = Math.round((excess / p.budgetAllocated) * 100);
      const pts = pct > 15 ? 25 : 15;
      transparencyDeductions.push({
        points: pts,
        reason: `Budget overrun of ${pct}% on project: "${p.title}"`,
        category: 'overrun'
      });
      transparencyScore -= pts;
    }

    // Project delays
    if (p.delayDays > 0) {
      const pts = p.delayDays > 180 ? 25 : 15;
      transparencyDeductions.push({
        points: pts,
        reason: `Contract delay of ${p.delayDays} days on project: "${p.title}"`,
        category: 'delay'
      });
      transparencyScore -= pts;
    }

    // Contractor checking
    const c = contractors.find(cont => cont.id === p.contractorId);
    if (c) {
      if (c.blacklisted) {
        transparencyDeductions.push({
          points: 30,
          reason: `Contract awarded to blacklisted contractor: ${c.name}`,
          category: 'contractor'
        });
        transparencyScore -= 30;
      } else if (c.rating < 3.0) {
        transparencyDeductions.push({
          points: 15,
          reason: `Contract awarded to low-rated contractor: ${c.name} (${c.rating.toFixed(2)}/5)`,
          category: 'contractor'
        });
        transparencyScore -= 15;
      }
    }
  });

  // Repeated repairs within 18 months
  const sortedProjects = [...roadProjects].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  for (let i = 0; i < sortedProjects.length - 1; i++) {
    const p1 = sortedProjects[i];
    const p2 = sortedProjects[i + 1];
    const diffMs = new Date(p2.startDate).getTime() - new Date(p1.startDate).getTime();
    const diffMonths = diffMs / (30 * 24 * 60 * 60 * 1000);

    if (diffMonths < 18) {
      transparencyDeductions.push({
        points: 20,
        reason: `Early surface failure: Repeat repair project within ${diffMonths.toFixed(1)} months`,
        category: 'repeat'
      });
      transparencyScore -= 20;
    }
  }

  transparencyScore = Math.max(10, transparencyScore);

  // ==========================================
  // 3. CONTRACTOR RELIABILITY SCORE
  // ==========================================
  const reliabilityFactors: ReliabilityFactor[] = [];
  let contractorReliabilityScore = 100;

  if (roadProjects.length === 0) {
    contractorReliabilityScore = 85;
    reliabilityFactors.push({
      contractorName: 'N/A',
      score: 85,
      reason: 'No historical contractor records logged. Evaluated against regional sector baseline (85%).',
      isBlacklisted: false
    });
  } else {
    // Unique contractors on this road
    const roadContractorIds = Array.from(new Set(roadProjects.map(p => p.contractorId)));
    let sumReliability = 0;
    let validContractorsCount = 0;

    roadContractorIds.forEach(cid => {
      const c = contractors.find(cont => cont.id === cid);
      if (!c) return;

      let score = 100;
      let reason = '';
      if (c.blacklisted) {
        score = 10;
        reason = `${c.name} is currently blacklisted due to historical failures.`;
      } else {
        const total = c.projectsCompleted + c.projectsDelayed;
        if (total > 0) {
          const completionRate = c.projectsCompleted / total;
          score = Math.round((completionRate * 60) + (c.rating * 8));
          score = Math.max(15, Math.min(100, score));
          reason = `${c.name} holds a rating of ${c.rating.toFixed(2)}/5.0 with ${(completionRate * 100).toFixed(0)}% on-time delivery.`;
        } else {
          score = c.rating * 20;
          reason = `${c.name} rating: ${c.rating.toFixed(2)} (no delay statistics recorded).`;
        }
      }

      reliabilityFactors.push({
        contractorName: c.name,
        score,
        reason,
        isBlacklisted: c.blacklisted
      });

      sumReliability += score;
      validContractorsCount++;
    });

    if (validContractorsCount > 0) {
      contractorReliabilityScore = Math.round(sumReliability / validContractorsCount);
    }
  }

  // ==========================================
  // 4. RECURRING DAMAGE RISK
  // ==========================================
  let recurringDamageRisk = 10; // Baseline risk
  const damageRiskFactors: DamageRiskFactor[] = [];

  // Waterlogging issues (both resolved and active highlight drainage issues)
  const waterloggingComplaints = roadComplaints.filter(c => c.category === 'waterlogging');
  if (waterloggingComplaints.length > 0) {
    const riskPct = Math.min(50, waterloggingComplaints.length * 25);
    recurringDamageRisk += riskPct;
    damageRiskFactors.push({
      percentage: riskPct,
      reason: `${waterloggingComplaints.length} waterlogging report(s) indicate chronic drainage vulnerabilities.`,
      type: 'waterlogging'
    });
  }

  // Short interval repeated repairs
  let repeatRepairAnomalyDetected = false;
  for (let i = 0; i < sortedProjects.length - 1; i++) {
    const p1 = sortedProjects[i];
    const p2 = sortedProjects[i + 1];
    const diffMs = new Date(p2.startDate).getTime() - new Date(p1.startDate).getTime();
    const diffMonths = diffMs / (30 * 24 * 60 * 60 * 1000);

    if (diffMonths < 18) {
      repeatRepairAnomalyDetected = true;
      break;
    }
  }

  if (repeatRepairAnomalyDetected) {
    recurringDamageRisk += 25;
    damageRiskFactors.push({
      percentage: 25,
      reason: 'Repeated asphalt relaying within 18 months indicates structural substrate damage.',
      type: 'repeat'
    });
  }

  // Active Potholes
  const activePotholes = activeComplaints.filter(c => c.category === 'pothole');
  if (activePotholes.length > 0) {
    const riskPct = Math.min(30, activePotholes.length * 15);
    recurringDamageRisk += riskPct;
    damageRiskFactors.push({
      percentage: riskPct,
      reason: `${activePotholes.length} unresolved pothole(s) accelerate local surface stripping.`,
      type: 'pothole'
    });
  }

  // Active Paving Defects
  const activeDefects = activeComplaints.filter(c => c.category === 'paving_defect');
  if (activeDefects.length > 0) {
    const riskPct = Math.min(20, activeDefects.length * 10);
    recurringDamageRisk += riskPct;
    damageRiskFactors.push({
      percentage: riskPct,
      reason: `${activeDefects.length} paving defect report(s) highlight structural block shifting.`,
      type: 'defect'
    });
  }

  // Maintenance gap
  if (diffYears > 2.5) {
    recurringDamageRisk += 15;
    damageRiskFactors.push({
      percentage: 15,
      reason: `Outdated paving lifetime cycle: Last paved > 2.5 years ago (+15% wear-risk).`,
      type: 'gap'
    });
  }

  recurringDamageRisk = Math.min(95, recurringDamageRisk); // Max risk 95%

  let damageRiskCategory: 'Low' | 'Medium' | 'High' = 'Low';
  if (recurringDamageRisk > 65) damageRiskCategory = 'High';
  else if (recurringDamageRisk > 30) damageRiskCategory = 'Medium';

  // ==========================================
  // 5. CONFIDENCE INDICATOR
  // ==========================================
  let confidenceScore = 30; // Baseline confidence from default street registers
  const confidenceReasons: string[] = ['Standard municipality street registry mapping.'];

  if (roadProjects.length >= 1) {
    const added = roadProjects.length >= 2 ? 50 : 30;
    confidenceScore += added;
    confidenceReasons.push(`${roadProjects.length} historical project contract audit records linked.`);
  }

  if (roadComplaints.length >= 1) {
    confidenceScore += 20;
    confidenceReasons.push(`${roadComplaints.length} citizen defect report logs associated.`);
  }

  // Cap confidence at 100%
  confidenceScore = Math.min(100, confidenceScore);

  let confidenceLevel = 'Sparse Historical Records';
  if (confidenceScore >= 80) confidenceLevel = 'High Data Density (Verified Audits)';
  else if (confidenceScore >= 50) confidenceLevel = 'Moderate Data Density';

  return {
    roadId: road.id,
    healthScore,
    healthDeductions,
    transparencyScore,
    transparencyDeductions,
    contractorReliabilityScore,
    reliabilityFactors,
    recurringDamageRisk,
    damageRiskFactors,
    damageRiskCategory,
    confidenceScore,
    confidenceLevel,
    confidenceReasons
  };
}
