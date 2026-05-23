export interface PlaybackStep {
  id: string;
  label: string;
  date: string;
  cutoffDate: string; // ISO date format for complaint filtering
}

export interface HistoricalRoadState {
  roadId: number;
  stepId: string;
  status: 'good' | 'fair' | 'poor' | 'under_construction';
  healthScore: number;
  transparencyScore: number;
  contractorName: string;
  budgetSpent: number;
  activeComplaintsCount: number;
}

export interface TimelineEvent {
  id: string;
  roadId: number;
  stepId: string;
  type: 'repair_start' | 'repair_complete' | 'budget_allocation' | 'contractor_change' | 'complaint_spike' | 'audit_flag';
  title: string;
  description: string;
  contractorName?: string;
  budgetAllocated?: number;
  complaintsCount?: number;
  severity: 'low' | 'medium' | 'high';
}

// 14 Playback steps spanning Q1 2023 - Q2 2026
export const playbackSteps: PlaybackStep[] = [
  { id: '2023-Q1', label: 'Q1 2023', date: 'Jan 2023', cutoffDate: '2023-01-31T23:59:59Z' },
  { id: '2023-Q2', label: 'Q2 2023', date: 'Apr 2023', cutoffDate: '2023-04-30T23:59:59Z' },
  { id: '2023-Q3', label: 'Q3 2023', date: 'Jul 2023', cutoffDate: '2023-07-31T23:59:59Z' },
  { id: '2023-Q4', label: 'Q4 2023', date: 'Oct 2023', cutoffDate: '2023-10-31T23:59:59Z' },
  { id: '2024-Q1', label: 'Q1 2024', date: 'Jan 2024', cutoffDate: '2024-01-31T23:59:59Z' },
  { id: '2024-Q2', label: 'Q2 2024', date: 'Apr 2024', cutoffDate: '2024-04-30T23:59:59Z' },
  { id: '2024-Q3', label: 'Q3 2024', date: 'Jul 2024', cutoffDate: '2024-07-31T23:59:59Z' },
  { id: '2024-Q4', label: 'Q4 2024', date: 'Oct 2024', cutoffDate: '2024-10-31T23:59:59Z' },
  { id: '2025-Q1', label: 'Q1 2025', date: 'Jan 2025', cutoffDate: '2025-01-31T23:59:59Z' },
  { id: '2025-Q2', label: 'Q2 2025', date: 'Apr 2025', cutoffDate: '2025-04-30T23:59:59Z' },
  { id: '2025-Q3', label: 'Q3 2025', date: 'Jul 2025', cutoffDate: '2025-07-31T23:59:59Z' },
  { id: '2025-Q4', label: 'Q4 2025', date: 'Oct 2025', cutoffDate: '2025-10-31T23:59:59Z' },
  { id: '2026-Q1', label: 'Q1 2026', date: 'Jan 2026', cutoffDate: '2026-01-31T23:59:59Z' },
  { id: '2026-Q2', label: 'Q2 2026', date: 'May 2026', cutoffDate: '2026-05-23T23:59:59Z' }
];

// Seed Historical events
export const timelineEvents: TimelineEvent[] = [
  // SV Road
  {
    id: 'e-sv-1',
    roadId: 3,
    stepId: '2023-Q4',
    type: 'complaint_spike',
    title: 'Monsoon Complaint Surge',
    description: '18 citizen reports logged near Bandra Signal indicating deep interlocking brick depression and waterlogging.',
    complaintsCount: 18,
    severity: 'medium'
  },
  {
    id: 'e-sv-2',
    roadId: 3,
    stepId: '2024-Q1',
    type: 'budget_allocation',
    title: 'Drainage Budget Sanctioned',
    description: 'Municipal Corporation approves ₹95,000,000 sanctioned amount for microtunnelling sewer lines to resolve chronic water pooling.',
    budgetAllocated: 95000000,
    severity: 'low'
  },
  {
    id: 'e-sv-3',
    roadId: 3,
    stepId: '2024-Q2',
    type: 'repair_start',
    title: 'Drainage Paving Works Begin',
    description: 'Contract awarded to Omega Infrastructure Inc. Excavation and microtunnelling commence, closing two lanes.',
    contractorName: 'Omega Infrastructure Inc',
    severity: 'low'
  },
  {
    id: 'e-sv-4',
    roadId: 3,
    stepId: '2025-Q1',
    type: 'audit_flag',
    title: 'Project Delay & Budget Audit',
    description: 'Automatic system detects 180+ days contract delay with budget utilization exceeding 47% despite less than 15% physical progress.',
    severity: 'high'
  },
  {
    id: 'e-sv-5',
    roadId: 3,
    stepId: '2025-Q2',
    type: 'contractor_change',
    title: 'Omega Terminated & Blacklisted',
    description: 'City terminates the contract due to gross negligence and timeline breach. Omega Infrastructure Inc added to regional blacklist.',
    contractorName: 'Omega Infrastructure Inc',
    severity: 'high'
  },
  {
    id: 'e-sv-6',
    roadId: 3,
    stepId: '2026-Q1',
    type: 'repair_start',
    title: 'Emergency Paving Re-awarded',
    description: 'Emergency patch lay contract (₹35,000,000) fast-tracked and awarded to Zenith Construction Group to restore surface safety.',
    contractorName: 'Zenith Construction Group',
    budgetAllocated: 35000000,
    severity: 'medium'
  },

  // Western Express Highway
  {
    id: 'e-weh-1',
    roadId: 1,
    stepId: '2025-Q2',
    type: 'budget_allocation',
    title: 'Flyover Resurfacing Approved',
    description: 'National Highway Board sanctions ₹240,000,000 for flyover resurfacing, structural joint grouting, and expansion barrier replacement.',
    budgetAllocated: 240000000,
    severity: 'low'
  },
  {
    id: 'e-weh-2',
    roadId: 1,
    stepId: '2025-Q2',
    type: 'repair_start',
    title: 'Resurfacing Project Commences',
    description: 'Apex Infrastructure Ltd moves heavy asphalt machinery to the segment. Night closures introduced.',
    contractorName: 'Apex Infrastructure Ltd',
    severity: 'low'
  },
  {
    id: 'e-weh-3',
    roadId: 1,
    stepId: '2026-Q1',
    type: 'audit_flag',
    title: 'Traffic Congestion Outcry',
    description: 'Playback maps indicate active work zones slowing evening peak hour speeds down to 8 km/h. Citizen alerts spike.',
    severity: 'medium'
  },

  // Eastern Express Highway
  {
    id: 'e-eeh-1',
    roadId: 2,
    stepId: '2025-Q3',
    type: 'complaint_spike',
    title: 'Pothole Alert Spike',
    description: 'Heavy rainfall results in early asphalt surface peeling. 15 active pothole alerts logged within 14 days.',
    complaintsCount: 15,
    severity: 'medium'
  },
  {
    id: 'e-eeh-2',
    roadId: 2,
    stepId: '2025-Q3',
    type: 'repair_start',
    title: 'Pothole Remediation Campaign',
    description: 'Emergency campaign (₹18,000,000) awarded to BuildWell Roadways Corp to patch potholed sections.',
    contractorName: 'BuildWell Roadways Corp',
    budgetAllocated: 18000000,
    severity: 'low'
  },
  {
    id: 'e-eeh-3',
    roadId: 2,
    stepId: '2025-Q4',
    type: 'repair_complete',
    title: 'Remediation Campaign Complete',
    description: 'BuildWell Roadways reports completion. 12-day contract delay and ₹1.2M budget overrun logged.',
    contractorName: 'BuildWell Roadways Corp',
    severity: 'medium'
  },

  // Senapati Bapat Marg
  {
    id: 'e-sbm-1',
    roadId: 6,
    stepId: '2023-Q1',
    type: 'repair_start',
    title: 'Micro-Silica Concreting Begins',
    description: 'Major reconstruction project starts: replacing asphalt with micro-silica concrete topping (₹85,000,000).',
    contractorName: 'Zenith Construction Group',
    budgetAllocated: 85000000,
    severity: 'low'
  },
  {
    id: 'e-sbm-2',
    roadId: 6,
    stepId: '2023-Q4',
    type: 'repair_complete',
    title: 'Concrete Upgrade Completed',
    description: 'Upgrade finished ahead of schedule. Road opens fully. Structural rating upgraded to Good.',
    contractorName: 'Zenith Construction Group',
    severity: 'low'
  }
];

// Helper to generate dynamic historical states for all 12 roads
export function getHistoricalRoadState(roadId: number, stepId: string): HistoricalRoadState {
  // Find step index
  const stepIndex = playbackSteps.findIndex(s => s.id === stepId);
  const safeStepIndex = stepIndex === -1 ? playbackSteps.length - 1 : stepIndex;

  // Defaults
  let status: 'good' | 'fair' | 'poor' | 'under_construction' = 'good';
  let healthScore = 95;
  let transparencyScore = 98;
  let contractorName = 'N/A';
  let budgetSpent = 0;
  let activeComplaintsCount = 0;

  // Custom curves for SV Road (ID: 3)
  if (roadId === 3) {
    if (safeStepIndex <= 2) { // 2023-Q1 to Q3
      status = safeStepIndex === 2 ? 'fair' : 'good';
      healthScore = safeStepIndex === 2 ? 78 : 90;
      transparencyScore = 95;
      activeComplaintsCount = safeStepIndex * 3;
    } else if (safeStepIndex === 3) { // 2023-Q4: Complaint spike
      status = 'poor';
      healthScore = 55;
      transparencyScore = 90;
      activeComplaintsCount = 18;
    } else if (safeStepIndex === 4) { // 2024-Q1: Budget allocated
      status = 'poor';
      healthScore = 48;
      transparencyScore = 88;
      activeComplaintsCount = 12;
    } else if (safeStepIndex >= 5 && safeStepIndex <= 9) { // 2024-Q2 to 2025-Q2: Construction under Omega
      status = 'under_construction';
      contractorName = 'Omega Infrastructure Inc';
      budgetSpent = Math.round(95000000 * (0.1 + (safeStepIndex - 5) * 0.08));
      healthScore = 60 - (safeStepIndex - 5) * 6; // Drops due to delays
      transparencyScore = 80 - (safeStepIndex - 5) * 10; // Major deductions
      activeComplaintsCount = 6;
    } else if (safeStepIndex >= 10 && safeStepIndex <= 11) { // 2025-Q3 to Q4: Terminated and halted
      status = 'poor';
      contractorName = 'Omega Infrastructure Inc (Halted)';
      budgetSpent = 45000000;
      healthScore = 25 + (safeStepIndex - 10) * 5;
      transparencyScore = 30;
      activeComplaintsCount = 15;
    } else { // 2026-Q1 to Q2: Emergency Paving Zenith
      status = safeStepIndex === 12 ? 'under_construction' : 'poor';
      contractorName = 'Zenith Construction Group';
      budgetSpent = 45000000 + Math.round(35000000 * ((safeStepIndex - 12) + 0.35));
      healthScore = 42;
      transparencyScore = 50;
      activeComplaintsCount = 4;
    }
  } 
  // Custom curve for WEH (ID: 1)
  else if (roadId === 1) {
    if (safeStepIndex <= 8) { // 2023-Q1 to 2025-Q1: Good status
      status = 'good';
      healthScore = 92;
      transparencyScore = 96;
    } else if (safeStepIndex >= 9) { // 2025-Q2 to Present: Active resurfacing
      status = 'under_construction';
      contractorName = 'Apex Infrastructure Ltd';
      budgetSpent = Math.round(185000000 * ((safeStepIndex - 9) + 0.2) / 4);
      healthScore = 80 - (safeStepIndex - 9) * 2;
      transparencyScore = 90;
      activeComplaintsCount = safeStepIndex >= 12 ? 3 : 1;
    }
  }
  // Custom curve for EEH (ID: 2)
  else if (roadId === 2) {
    if (safeStepIndex <= 9) { // 2023-Q1 to 2025-Q2: Good/Fair
      status = safeStepIndex >= 6 ? 'fair' : 'good';
      healthScore = safeStepIndex >= 6 ? 80 : 92;
      transparencyScore = 98;
    } else if (safeStepIndex === 10) { // 2025-Q3: Pothole spike & start
      status = 'poor';
      healthScore = 45;
      transparencyScore = 90;
      activeComplaintsCount = 15;
      contractorName = 'BuildWell Roadways Corp';
    } else if (safeStepIndex === 11) { // 2025-Q4: Campaign active
      status = 'under_construction';
      healthScore = 65;
      transparencyScore = 85;
      budgetSpent = 19200000;
      contractorName = 'BuildWell Roadways Corp';
    } else { // 2026-Q1 to Q2: Completed
      status = 'fair';
      healthScore = 78;
      transparencyScore = 75; // Delay and overrun penalties
      budgetSpent = 19200000;
      activeComplaintsCount = 1;
    }
  }
  // Custom curve for Senapati Bapat Marg (ID: 6)
  else if (roadId === 6) {
    if (safeStepIndex <= 2) { // 2023-Q1 to Q3: Under construction
      status = 'under_construction';
      contractorName = 'Zenith Construction Group';
      budgetSpent = Math.round(85000000 * (safeStepIndex + 1) / 3);
      healthScore = 70;
      transparencyScore = 95;
    } else { // 2023-Q4 to Present: Good concrete road
      status = 'good';
      healthScore = 98;
      transparencyScore = 95;
      budgetSpent = 84200000;
    }
  }
  // Default values for other stable roads
  else {
    const isStableGood = [7, 10, 11].includes(roadId); // Dr. Ambedkar, Ghodbunder, Marine Drive
    if (isStableGood) {
      status = 'good';
      healthScore = 94;
      transparencyScore = 95;
    } else {
      status = 'fair';
      healthScore = 80;
      transparencyScore = 85;
      activeComplaintsCount = (safeStepIndex % 3) === 0 ? 2 : 0;
    }
  }

  return {
    roadId,
    stepId,
    status,
    healthScore,
    transparencyScore,
    contractorName,
    budgetSpent,
    activeComplaintsCount
  };
}

// Retrieves all timeline events that happened up to a certain step for a road
export function getEventsUpToStep(roadId: number, stepId: string): TimelineEvent[] {
  const stepIndex = playbackSteps.findIndex(s => s.id === stepId);
  if (stepIndex === -1) return [];

  // Filter events matching the roadId and occurring at or before the step index
  return timelineEvents.filter(e => {
    if (e.roadId !== roadId) return false;
    const eventStepIndex = playbackSteps.findIndex(s => s.id === e.stepId);
    return eventStepIndex !== -1 && eventStepIndex <= stepIndex;
  }).sort((a, b) => {
    // Sort in reverse chronological order (newest first)
    const idxA = playbackSteps.findIndex(s => s.id === a.stepId);
    const idxB = playbackSteps.findIndex(s => s.id === b.stepId);
    return idxB - idxA;
  });
}
