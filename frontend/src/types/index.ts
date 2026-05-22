export type RoadStatus = 'good' | 'fair' | 'poor' | 'under_construction';
export type ComplaintCategory = 'pothole' | 'paving_defect' | 'waterlogging' | 'debris' | 'missing_signage';
export type ComplaintStatus = 'pending' | 'routed' | 'in_progress' | 'resolved' | 'rejected';
export type ProjectStatus = 'planned' | 'in_progress' | 'completed' | 'halted' | 'cancelled';

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
  assignedAuthorityId: number;
  roadId?: number;
  createdAt: string;
  imageUrl?: string;
  imagePreview?: string;
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
  type: 'repeated_repair' | 'budget_overrun' | 'high_maintenance_frequency' | 'low_contractor_rating';
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
}
