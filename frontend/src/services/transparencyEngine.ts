import { Road, Project, Contractor, Complaint, RoadTransparencyData, YearlyAllocation, FinancialAnomaly, ScoreDeduction } from '@/types';

// Format currency inside the service helper
export const formatINR = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value).replace('INR', '₹');
};

/**
 * Calculates transparency details and flags anomalies for a single road segment.
 */
export function calculateRoadTransparency(
  road: Road,
  projects: Project[],
  contractors: Contractor[],
  complaints: Complaint[]
): RoadTransparencyData {
  const roadProjects = projects.filter(p => p.roadId === road.id);
  const roadComplaints = complaints.filter(c => c.roadId === road.id);

  // 1. Calculate yearly allocations (Years 2023 - 2026)
  const yearlyAllocationsMap: { [year: number]: YearlyAllocation } = {
    2023: { year: 2023, sanctioned: 0, spent: 0 },
    2024: { year: 2024, sanctioned: 0, spent: 0 },
    2025: { year: 2025, sanctioned: 0, spent: 0 },
    2026: { year: 2026, sanctioned: 0, spent: 0 }
  };

  roadProjects.forEach(p => {
    const year = new Date(p.startDate).getFullYear();
    if (yearlyAllocationsMap[year]) {
      yearlyAllocationsMap[year].sanctioned += p.budgetAllocated;
      yearlyAllocationsMap[year].spent += p.budgetSpent;
    } else if (!isNaN(year)) {
      // Dynamic fallback for other years
      yearlyAllocationsMap[year] = {
        year,
        sanctioned: p.budgetAllocated,
        spent: p.budgetSpent
      };
    }
  });

  const yearlyAllocations = Object.values(yearlyAllocationsMap).sort((a, b) => a.year - b.year);

  // 2. Sum overall totals
  const totalSanctioned = roadProjects.reduce((sum, p) => sum + p.budgetAllocated, 0);
  const totalSpent = roadProjects.reduce((sum, p) => sum + p.budgetSpent, 0);

  // 3. Maintenance frequency (projects per 3 year period)
  const yearsSpan = 3;
  const freq = roadProjects.length / yearsSpan;
  const maintenanceFrequency = roadProjects.length === 0 
    ? '0 repairs/yr'
    : `${freq.toFixed(1)} repairs/yr`;

  // 4. Anomaly detection & deductions
  const anomalies: FinancialAnomaly[] = [];
  const scoreDeductions: ScoreDeduction[] = [];
  let baseScore = 100;

  // Anomaly A: Budget Overruns
  roadProjects.forEach(p => {
    if (p.budgetSpent > p.budgetAllocated) {
      const excess = p.budgetSpent - p.budgetAllocated;
      const pct = Math.round((excess / p.budgetAllocated) * 100);
      anomalies.push({
        id: `anomaly-overrun-${p.id}`,
        type: 'budget_overrun',
        severity: pct > 15 ? 'high' : 'medium',
        description: `Project "${p.title}" exceeded budget by ${formatINR(excess)} (${pct}% overrun).`,
        detectedAt: p.actualEndDate || p.startDate
      });

      const deductionPoints = pct > 20 ? 25 : 15;
      scoreDeductions.push({
        points: deductionPoints,
        reason: `${pct}% cost overrun on project: ${p.title}`,
        category: 'budget'
      });
    }

    // Anomaly Check: Contractor Variance (deviations past 15%)
    if (p.budgetAllocated > 0) {
      const varianceRatio = Math.abs((p.budgetSpent / p.budgetAllocated) - 1);
      if (varianceRatio > 0.15) {
        const pct = Math.round(varianceRatio * 100);
        anomalies.push({
          id: `anomaly-variance-${p.id}`,
          type: 'contractor_variance',
          severity: 'high',
          description: `High contractor variance risk: Spend-to-allocation ratio deviates by ${pct}% (Allocated: ${formatINR(p.budgetAllocated)}, Spent: ${formatINR(p.budgetSpent)}).`,
          detectedAt: p.actualEndDate || p.startDate
        });

        scoreDeductions.push({
          points: 15,
          reason: `High contractor variance deviation (${pct}%) on project: ${p.title}`,
          category: 'budget'
        });
      }
    }

    // Delay penalty
    if (p.delayDays > 0) {
      scoreDeductions.push({
        points: 15,
        reason: `Contract delay of ${p.delayDays} days on project: ${p.title}`,
        category: 'delay'
      });
    }

    // Contractor checking
    const c = contractors.find(cont => cont.id === p.contractorId);
    if (c) {
      if (c.blacklisted) {
        anomalies.push({
          id: `anomaly-blacklist-${p.id}-${c.id}`,
          type: 'low_contractor_rating',
          severity: 'high',
          description: `Project assigned to blacklisted contractor: ${c.name}. Reason: ${c.blacklistedReason || 'Unknown'}`,
          detectedAt: p.startDate
        });
        scoreDeductions.push({
          points: 30,
          reason: `Work awarded to blacklisted contractor: ${c.name}`,
          category: 'quality'
        });
      } else if (c.rating < 3.0) {
        anomalies.push({
          id: `anomaly-lowrating-${p.id}-${c.id}`,
          type: 'low_contractor_rating',
          severity: 'medium',
          description: `Project assigned to contractor "${c.name}" with critically low rating: ${c.rating.toFixed(2)}/5.00`,
          detectedAt: p.startDate
        });
        scoreDeductions.push({
          points: 15,
          reason: `Work awarded to low-rated contractor: ${c.name} (${c.rating.toFixed(2)}/5)`,
          category: 'quality'
        });
      }
    }
  });

  // Anomaly B: Repeated Repairs (Early surface failures)
  // Sort projects chronologically by start date
  const sortedProjects = [...roadProjects].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  for (let i = 0; i < sortedProjects.length - 1; i++) {
    const p1 = sortedProjects[i];
    const p2 = sortedProjects[i + 1];
    const diffMs = new Date(p2.startDate).getTime() - new Date(p1.startDate).getTime();
    const diffMonths = diffMs / (30 * 24 * 60 * 60 * 1000);

    if (diffMonths < 18) {
      anomalies.push({
        id: `anomaly-rep-${p1.id}-${p2.id}`,
        type: 'repeated_repair',
        severity: 'high',
        description: `Early surface failure warning: Repeated repair on same segment within ${diffMonths.toFixed(1)} months.`,
        detectedAt: p2.startDate
      });
      scoreDeductions.push({
        points: 25,
        reason: `Repeated repair within ${diffMonths.toFixed(0)} months: "${p1.title}" and "${p2.title}"`,
        category: 'anomaly'
      });
    }
  }

  // Anomaly C: High Repair Frequency
  if (roadProjects.length >= 3) {
    anomalies.push({
      id: `anomaly-freq-${road.id}`,
      type: 'high_maintenance_frequency',
      severity: 'medium',
      description: `High maintenance density: ${roadProjects.length} major civil projects logged within a 36-month timeline.`,
      detectedAt: new Date().toISOString()
    });
    scoreDeductions.push({
      points: 15,
      reason: `High maintenance frequency (${roadProjects.length} projects in 3 years)`,
      category: 'anomaly'
    });
  }

  // Active citizen complaints deduction
  const activeComplaints = roadComplaints.filter(c => c.status !== 'resolved' && c.status !== 'rejected');
  if (activeComplaints.length > 0) {
    const pts = Math.min(20, activeComplaints.length * 5);
    scoreDeductions.push({
      points: pts,
      reason: `${activeComplaints.length} unresolved citizen road defect reports`,
      category: 'complaints'
    });
  }

  // 5. Calculate final score (deduct from 100)
  const totalDeductions = scoreDeductions.reduce((sum, d) => sum + d.points, 0);
  const transparencyScore = Math.max(10, baseScore - totalDeductions);

  // 6. Contractor Spending Breakdown
  const contractorBreakdownMap: { [id: number]: { contractorId: number; contractorName: string; totalReceived: number; projectsCount: number } } = {};
  roadProjects.forEach(p => {
    const c = contractors.find(cont => cont.id === p.contractorId);
    const contractorName = c ? c.name : 'Unknown Contractor';
    if (!contractorBreakdownMap[p.contractorId]) {
      contractorBreakdownMap[p.contractorId] = {
        contractorId: p.contractorId,
        contractorName,
        totalReceived: 0,
        projectsCount: 0
      };
    }
    contractorBreakdownMap[p.contractorId].totalReceived += p.budgetSpent;
    contractorBreakdownMap[p.contractorId].projectsCount += 1;
  });

  const contractorSpendingBreakdown = Object.values(contractorBreakdownMap).sort((a, b) => b.totalReceived - a.totalReceived);

  return {
    roadId: road.id,
    transparencyScore,
    scoreDeductions,
    yearlyAllocations,
    totalSanctioned,
    totalSpent,
    maintenanceFrequency,
    anomalies,
    contractorSpendingBreakdown
  };
}

/**
 * Returns letter grade based on transparency score
 */
export function getScoreGrade(score: number): { grade: string; color: string; bg: string } {
  if (score >= 90) return { grade: 'A', color: 'text-emerald-400', bg: 'bg-emerald-950/60 border-emerald-800/40' };
  if (score >= 80) return { grade: 'B', color: 'text-cyan-400', bg: 'bg-cyan-950/60 border-cyan-800/40' };
  if (score >= 65) return { grade: 'C', color: 'text-amber-400', bg: 'bg-amber-950/60 border-amber-800/40' };
  if (score >= 50) return { grade: 'D', color: 'text-orange-400', bg: 'bg-orange-950/60 border-orange-800/40' };
  return { grade: 'F', color: 'text-red-400', bg: 'bg-red-950/60 border-red-800/40' };
}

/**
 * Aggregates city-wide statistics for the dashboard landing view.
 */
export function getCitywideTransparencyData(
  roads: Road[],
  projects: Project[],
  contractors: Contractor[],
  complaints: Complaint[]
) {
  const roadTransparencyList = roads.map(r => calculateRoadTransparency(r, projects, contractors, complaints));
  
  const totalSanctioned = projects.reduce((sum, p) => sum + p.budgetAllocated, 0);
  const totalSpent = projects.reduce((sum, p) => sum + p.budgetSpent, 0);
  const averageScore = Math.round(roadTransparencyList.reduce((sum, r) => sum + r.transparencyScore, 0) / roads.length);
  
  // Total anomalies
  const allAnomalies = roadTransparencyList.flatMap(r => r.anomalies);
  const highSeverityAnomalies = allAnomalies.filter(a => a.severity === 'high');

  // Contractor breakdown city-wide
  const contractorTotalsMap: { [id: number]: { name: string; totalReceived: number; rating: number; projects: number; blacklisted: boolean } } = {};
  
  projects.forEach(p => {
    const c = contractors.find(cont => cont.id === p.contractorId);
    if (!c) return;
    if (!contractorTotalsMap[p.contractorId]) {
      contractorTotalsMap[p.contractorId] = {
        name: c.name,
        totalReceived: 0,
        rating: c.rating,
        projects: 0,
        blacklisted: c.blacklisted
      };
    }
    contractorTotalsMap[p.contractorId].totalReceived += p.budgetSpent;
    contractorTotalsMap[p.contractorId].projects += 1;
  });

  const contractorLeaderboard = Object.values(contractorTotalsMap).sort((a, b) => b.totalReceived - a.totalReceived);

  return {
    totalSanctioned,
    totalSpent,
    averageScore,
    allAnomalies,
    highSeverityAnomaliesCount: highSeverityAnomalies.length,
    contractorLeaderboard,
    roadTransparencyList
  };
}
