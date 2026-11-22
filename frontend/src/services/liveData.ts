/**
 * Loads the database's authorities, contractors, projects, roads and complaints
 * into the shared arrays that the map, road panel, report wizard, timeline and
 * chat panels read. Those arrays start with bundled sample rows so the app still
 * renders offline; once the backend answers they hold live PostgreSQL data.
 */
import { authorities, complaints, contractors, projects, roads } from '@/data/mockData';
import { useStore } from '@/store/useStore';
import type { Authority, Complaint, Contractor, FundSourceAllocation, Project, Road } from '@/types';
import { apiGet } from './api';

interface LiveRoad {
  id: number; name: string; road_code: string; road_type: Road['roadType']; status: Road['status'];
  length_km: number; last_relaying_date: string | null; coordinates: [number, number][]; authority_id: number | null;
  surface_type: Road['surfaceType'] | null; lane_count: number | null; width_m: number | null; aadt: number | null;
}

interface LiveComplaint {
  id: number; client_temp_id: string | null; title: string; description: string; category: Complaint['category'];
  status: Complaint['status']; priority: number; escalation_level: Complaint['escalationLevel']; created_at: string;
  assigned_authority_id: number | null; road_id: number | null; image_url: string | null;
  target_resolution_hours: number; sla_breached_at: string | null; last_escalated_at: string | null;
  road_name: string | null; coordinates: [number, number];
}

interface Reference {
  authorities: {
    id: number; name: string; department_code: string; contact_email: string; contact_phone: string | null;
    region_code: string; conflict_group_id: number | null;
    boundary: { type: 'Polygon'; coordinates: [number, number][][] } | null; engineer: string | null;
  }[];
  contractors: {
    id: number; name: string; license_number: string; registration_date: string; contact_email: string;
    contact_phone: string | null; rating: number; projects_completed: number; projects_delayed: number;
    blacklisted: boolean; blacklisted_reason: string | null;
  }[];
  projects: {
    id: number; title: string; road_id: number; contractor_id: number; authority_id: number;
    budget_allocated: number; budget_spent: number; status: Project['status']; start_date: string;
    target_end_date: string; actual_end_date: string | null; delay_days: number;
    fund_sources: { sourceName: string; amount: number }[];
  }[];
}

const toRoad = (row: LiveRoad): Road => ({
  id: row.id,
  name: row.name,
  roadCode: row.road_code,
  roadType: row.road_type,
  status: row.status,
  lengthKm: Number(row.length_km),
  authorityId: row.authority_id ?? 0,
  lastRelayingDate: row.last_relaying_date ?? '',
  geometry: { type: 'LineString', coordinates: row.coordinates },
  surfaceType: row.surface_type ?? undefined,
  laneCount: row.lane_count ?? undefined,
  widthM: row.width_m === null ? undefined : Number(row.width_m),
  aadt: row.aadt ?? undefined,
});

export const toComplaint = (row: LiveComplaint): Complaint => ({
  id: row.id,
  clientTempId: row.client_temp_id ?? undefined,
  title: row.title,
  description: row.description,
  category: row.category,
  geometry: { type: 'Point', coordinates: row.coordinates },
  status: row.status,
  escalationLevel: row.escalation_level,
  priority: row.priority,
  slaBreachedAt: row.sla_breached_at ?? undefined,
  lastEscalatedAt: row.last_escalated_at ?? undefined,
  targetResolutionHours: row.target_resolution_hours,
  assignedAuthorityId: row.assigned_authority_id ?? 0,
  roadId: row.road_id ?? undefined,
  roadName: row.road_name ?? undefined,
  createdAt: row.created_at,
  imageUrl: row.image_url ?? undefined,
});

const toAuthority = (row: Reference['authorities'][number]): Authority => ({
  id: row.id,
  name: row.name,
  departmentCode: row.department_code,
  contactEmail: row.contact_email,
  contactPhone: row.contact_phone ?? '',
  boundaryGeoJSON: row.boundary ?? { type: 'Polygon', coordinates: [] },
  conflictGroupId: row.conflict_group_id ?? undefined,
  regionCode: row.region_code,
  officerName: row.engineer ?? undefined,
});

const toContractor = (row: Reference['contractors'][number]): Contractor => ({
  id: row.id,
  name: row.name,
  licenseNumber: row.license_number,
  registrationDate: row.registration_date,
  contactEmail: row.contact_email,
  contactPhone: row.contact_phone ?? '',
  rating: Number(row.rating),
  projectsCompleted: row.projects_completed,
  projectsDelayed: row.projects_delayed,
  blacklisted: row.blacklisted,
  blacklistedReason: row.blacklisted_reason,
});

const toProject = (row: Reference['projects'][number]): Project => ({
  id: row.id,
  title: row.title,
  roadId: row.road_id,
  contractorId: row.contractor_id,
  authorityId: row.authority_id,
  budgetAllocated: Number(row.budget_allocated),
  budgetSpent: Number(row.budget_spent),
  status: row.status,
  startDate: row.start_date,
  targetEndDate: row.target_end_date,
  actualEndDate: row.actual_end_date,
  delayDays: row.delay_days,
  fundSources: row.fund_sources.map(f => ({ source: f.sourceName as FundSourceAllocation['source'], amount: Number(f.amount) })),
});

function replace<T>(target: T[], next: T[]) {
  target.splice(0, target.length, ...next);
}

/** Fetch every shared collection for a region. Rejects when the backend is unreachable. */
export async function loadLiveData(region: string): Promise<void> {
  const [reference, liveRoads, liveComplaints] = await Promise.all([
    apiGet<Reference>(`/screens/reference?region=${region}`),
    apiGet<LiveRoad[]>(`/screens/roads?region=${region}&major=true`),
    apiGet<LiveComplaint[]>(`/screens/complaints?region=${region}`),
  ]);
  replace(authorities, reference.authorities.map(toAuthority));
  replace(contractors, reference.contractors.map(toContractor));
  replace(projects, reference.projects.map(toProject));
  if (liveRoads.length > 0) replace(roads, liveRoads.map(toRoad));
  const live = liveComplaints.map(toComplaint);
  replace(complaints, live);

  // Keep reports still queued on this device until the server has them.
  const saved = new Set(liveComplaints.map(row => row.client_temp_id));
  const queued = useStore.getState().complaintsList.filter(c => c.clientTempId && c.id >= 100000 && !saved.has(c.clientTempId));
  useStore.setState(state => ({ complaintsList: [...queued, ...live], liveDataVersion: state.liveDataVersion + 1 }));
}

/** Reload after an action that changes shared data (a new report, a status change). */
export function refreshLiveData() {
  return loadLiveData(useStore.getState().regionCode || 'IN').catch(() => undefined);
}
