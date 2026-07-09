export type RoadStatus = 'good' | 'fair' | 'poor' | 'under_construction';
export type ComplaintCategory = 'pothole' | 'paving_defect' | 'waterlogging' | 'debris' | 'missing_signage';
export type ComplaintStatus = 'pending' | 'routed' | 'in_progress' | 'resolved' | 'rejected';
export type EscalationLevel = 0 | 1 | 2;
export type ProjectStatus = 'planned' | 'in_progress' | 'completed' | 'halted' | 'cancelled';

// Accessibility types
export type { FontSizeLevel, ContrastMode, Locale, A11yState } from './a11y';

export interface Authority {
  id: number;
  name: string;
  departmentCode: string;
  contactEmail: string;
  contactPhone: string;
  boundaryGeoJSON: {
    type: 'Polygon';
    coordinates: [number, number][][]; // [[longitude, latitude], ...]
  };
  conflictGroupId?: number;
  regionCode?: string;
  timezone?: string;
}

export interface Contractor {
  id: number;
  name: string;
  licenseNumber: string;
  registrationDate: string;
  contactEmail: string;
  contactPhone: string;
  rating: number;
  projectsCompleted: number;
  projectsDelayed: number;
  blacklisted: boolean;
  blacklistedReason?: string | null;
}

export interface Road {
  id: number;
  name: string;
  roadCode: string;
  status: RoadStatus;
  lengthKm: number;
  authorityId: number;
  lastRelayingDate: string;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [longitude, latitude][]
  };
  conflictGroupId?: number;
  regionCode?: string;
}

export interface FundSourceAllocation {
  id?: number;
  source: 'Central Road Infrastructure Fund' | 'State PWD Capital Tiers' | 'Municipal General Portfolios' | 'Taxpayer Distribution Ratios' | 'Central Road Fund' | 'State PWD Allocations' | 'Municipal General Tier' | 'International Multilateral Loans';
  amount: number;
}

export interface Project {
  id: number;
  title: string;
  roadId: number;
  contractorId: number;
  authorityId: number;
  budgetAllocated: number;
  budgetSpent: number;
  status: ProjectStatus;
  startDate: string;
  targetEndDate: string;
  actualEndDate?: string | null;
  delayDays: number;
  fundSources?: FundSourceAllocation[];
}

export interface FundSource {
  id: number;
  projectId: number;
  sourceName: string;
  amount: number;
  createdAt: string;
}

export interface BudgetVariance {
  id: number;
  projectId: number;
  originalBudget: number;
  revisedBudget?: number | null;
  varianceAmount: number;
  variancePct?: number | null;
  reason: string;
  approvedBy?: string | null;
  approvalDate?: string | null;
  approvalDocumentUrl?: string | null;
  createdAt: string;
}

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface ProjectMilestone {
  id: number;
  projectId: number;
  title: string;
  description?: string | null;
  amount: number;
  status: MilestoneStatus;
  dueDate?: string | null;
  completionDate?: string | null;
  verifiedBy?: string | null;
  paymentReleaseDate?: string | null;
  notes?: string | null;
  createdAt: string;
}

export type ContingencyStatus = 'available' | 'partially_utilized' | 'fully_utilized' | 'exhausted';

export interface ContingencyReserve {
  id: number;
  projectId: number;
  allocatedAmount: number;
  utilizedAmount: number;
  status: ContingencyStatus;
  approvalRequired: boolean;
  releaseNotes?: string | null;
  createdAt: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRecord {
  id: number;
  entityType: 'variance' | 'contingency' | 'milestone' | 'project';
  entityId: number;
  action: string;
  requestedBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  status: ApprovalStatus;
  comments?: string | null;
  createdAt: string;
}

export interface CostPerKmRow {
  projectId: number;
  title: string;
  roadId: number;
  roadName: string;
  lengthKm: number;
  budgetAllocated: number;
  budgetSpent: number;
  allocatedPerKm: number;
  spentPerKm: number;
  overrunPerKm: number;
  status: ProjectStatus;
  contractorId: number;
  contractorName: string;
  flagReason?: string;
}

export interface Complaint {
  id: number;
  clientTempId?: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  status: ComplaintStatus;
  escalationLevel?: EscalationLevel;
  priority?: number;          // 1 (low) - 5 (high)
  slaBreachedAt?: string;     // ISO timestamp when SLA was breached
  lastEscalatedAt?: string;   // ISO timestamp of last escalation
  targetResolutionHours?: number;  // Default 48
  declinedAuthorityIds?: number[]; // Track declined reassignments
  assignedAuthorityId: number;
  roadId?: number;
  createdAt: string;
  imageUrl?: string;
  imagePreview?: string;
  parentComplaintId?: number;
  regionOverride?: string;
  regionCode?: string;
}

// Routing detail returned by backend in metadata events
export interface RoutingDetail {
  authority_name: string;
  authority_id: number;
  executive_engineer_name: string;
  designation: string;
  contact: string;
  email: string;
  region: string;
  reason_for_routing: string;
}

// UI/Layout related types
export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  badge?: string | number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'warning' | 'alert' | 'success';
  eventType?: 'complaint.assigned' | 'complaint.escalated' | 'complaint.declined' | 'sla.breach';
  complaintId?: number;
}

export interface SyncQueueItem {
  id: string;
  action: 'create_complaint' | 'update_complaint';
  payload: any;
  timestamp: string;
  status?: 'pending' | 'syncing' | 'failed';
  error?: string;
  imagePreview?: string;
}

export interface YearlyAllocation {
  year: number;
  sanctioned: number;
  spent: number;
}

export interface FinancialAnomaly {
  id: string;
  type: 'repeated_repair' | 'budget_overrun' | 'high_maintenance_frequency' | 'low_contractor_rating' | 'contractor_variance';
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: string;
}

export interface ScoreDeduction {
  points: number;
  reason: string;
  category: 'budget' | 'delay' | 'quality' | 'anomaly' | 'complaints';
}

export interface RoadTransparencyData {
  roadId: number;
  transparencyScore: number;
  scoreDeductions: ScoreDeduction[];
  yearlyAllocations: YearlyAllocation[];
  totalSanctioned: number;
  totalSpent: number;
  maintenanceFrequency: string;
  anomalies: FinancialAnomaly[];
  contractorSpendingBreakdown: {
    contractorId: number;
    contractorName: string;
    totalReceived: number;
    projectsCount: number;
  }[];
  fundSources?: FundSourceAllocation[];
}
