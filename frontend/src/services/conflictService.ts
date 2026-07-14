import { roads as defaultRoads, authorities as defaultAuthorities } from '@/data/mockData';

const API_BASE = 'http://localhost:8000/api/v1';

interface ConflictGroup {
  id: number;
  conflict_key: string;
  primary_road_id?: number;
  primary_authority_id?: number;
  primary_road_name?: string;
  primary_authority_name?: string;
  merged_metadata: Record<string, unknown>;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

interface DuplicateResult {
  id: number;
  name: string;
  road_code?: string;
  department_code?: string;
  region_code?: string;
  similarity: number;
  match_type: string;
  geom_wkt?: string;
  distance?: number;
}

interface ConflictListResponse {
  conflicts: ConflictGroup[];
  total: number;
}

interface DetectResponse {
  duplicates: DuplicateResult[];
  total: number;
}

export async function listRoadConflicts(
  resolved?: boolean
): Promise<ConflictListResponse> {
  try {
    const params = resolved !== undefined ? `?resolved=${resolved}` : '';
    const resp = await fetch(`${API_BASE}/conflicts/roads${params}`);
    if (!resp.ok) throw new Error(`Failed to list road conflicts: ${resp.status}`);
    return await resp.json();
  } catch (error) {
    console.warn("Conflicts API down, returning offline road conflicts:", error);
    
    // Simulate one unresolved conflict group for SV Road
    const isResolved = resolved || false;
    const conflicts: ConflictGroup[] = isResolved ? [] : [
      {
        id: 101,
        conflict_key: "SVR-MUMBAI-DUPL",
        primary_road_id: 1,
        primary_road_name: "Swami Vivekananda Road (S.V. Road)",
        merged_metadata: {
          duplicate_codes: ["SVR-LD01", "SVR-MUM"],
          conflicting_fields: ["contractor_id", "status"]
        },
        resolved: false,
        resolved_at: null,
        resolved_by: null,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ];
    
    return {
      conflicts,
      total: conflicts.length
    };
  }
}

export async function listAuthorityConflicts(
  resolved?: boolean
): Promise<ConflictListResponse> {
  try {
    const params = resolved !== undefined ? `?resolved=${resolved}` : '';
    const resp = await fetch(`${API_BASE}/conflicts/authorities${params}`);
    if (!resp.ok) throw new Error(`Failed to list authority conflicts: ${resp.status}`);
    return await resp.json();
  } catch (error) {
    console.warn("Conflicts API down, returning offline authority conflicts:", error);
    
    const isResolved = resolved || false;
    const conflicts: ConflictGroup[] = isResolved ? [] : [
      {
        id: 202,
        conflict_key: "MCGM-KWEST-NAME-CONF",
        primary_authority_id: 1,
        primary_authority_name: "City Municipal Corporation - Ward K-West",
        merged_metadata: {
          duplicate_departments: ["MCGM-KW", "BMC-KW"],
          conflicting_fields: ["contact_email"]
        },
        resolved: false,
        resolved_at: null,
        resolved_by: null,
        created_at: new Date(Date.now() - 86400000 * 4).toISOString()
      }
    ];
    
    return {
      conflicts,
      total: conflicts.length
    };
  }
}

export async function detectRoadDuplicates(
  name: string,
  roadCode?: string,
  geomWkt?: string
): Promise<DetectResponse> {
  try {
    const resp = await fetch(`${API_BASE}/conflicts/roads/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        road_code: roadCode,
        geom_wkt: geomWkt,
      }),
    });
    if (!resp.ok) throw new Error(`Failed to detect road duplicates: ${resp.status}`);
    return await resp.json();
  } catch (error) {
    console.warn("Conflicts API down, performing offline duplicate detection:", error);
    
    // Simple text search in mockData
    const query = name.toLowerCase();
    const matches = defaultRoads.filter(r => 
      r.name.toLowerCase().includes(query) || 
      (roadCode && r.roadCode.toLowerCase().includes(roadCode.toLowerCase()))
    );
    
    const duplicates: DuplicateResult[] = matches.map(m => ({
      id: m.id,
      name: m.name,
      road_code: m.roadCode,
      region_code: m.regionCode,
      similarity: m.name.toLowerCase() === query ? 0.95 : 0.75,
      match_type: m.roadCode === roadCode ? "EXACT_CODE" : "FUZZY_NAME"
    }));
    
    return {
      duplicates,
      total: duplicates.length
    };
  }
}

export async function detectAuthorityDuplicates(
  name: string,
  departmentCode?: string
): Promise<DetectResponse> {
  try {
    const resp = await fetch(`${API_BASE}/conflicts/authorities/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        department_code: departmentCode,
      }),
    });
    if (!resp.ok) throw new Error(`Failed to detect authority duplicates: ${resp.status}`);
    return await resp.json();
  } catch (error) {
    console.warn("Conflicts API down, performing offline duplicate detection:", error);
    
    const query = name.toLowerCase();
    const matches = defaultAuthorities.filter(a => 
      a.name.toLowerCase().includes(query) || 
      (departmentCode && a.departmentCode.toLowerCase().includes(departmentCode.toLowerCase()))
    );
    
    const duplicates: DuplicateResult[] = matches.map(m => ({
      id: m.id,
      name: m.name,
      department_code: m.departmentCode,
      similarity: m.name.toLowerCase() === query ? 0.98 : 0.72,
      match_type: m.departmentCode === departmentCode ? "EXACT_DEPT" : "FUZZY_NAME"
    }));
    
    return {
      duplicates,
      total: duplicates.length
    };
  }
}

export async function createRoadConflictGroup(
  conflictKey: string,
  entityIds: number[]
): Promise<{ group_id: number; status: string }> {
  try {
    const resp = await fetch(`${API_BASE}/conflicts/roads/create-group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conflict_key: conflictKey,
        entity_ids: entityIds,
      }),
    });
    if (!resp.ok) throw new Error(`Failed to create conflict group: ${resp.status}`);
    return await resp.json();
  } catch (error) {
    console.warn("Conflicts API down, creating offline road conflict group:", error);
    return {
      group_id: Math.floor(100 + Math.random() * 900),
      status: "created_offline"
    };
  }
}

export async function createAuthorityConflictGroup(
  conflictKey: string,
  entityIds: number[]
): Promise<{ group_id: number; status: string }> {
  try {
    const resp = await fetch(`${API_BASE}/conflicts/authorities/create-group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conflict_key: conflictKey,
        entity_ids: entityIds,
      }),
    });
    if (!resp.ok) throw new Error(`Failed to create conflict group: ${resp.status}`);
    return await resp.json();
  } catch (error) {
    console.warn("Conflicts API down, creating offline authority conflict group:", error);
    return {
      group_id: Math.floor(100 + Math.random() * 900),
      status: "created_offline"
    };
  }
}

export async function resolveRoadConflict(
  groupId: number,
  resolution: 'merge' | 'link' | 'dismiss',
  resolvedBy: string = 'system'
): Promise<{ status: string; resolution: string; group_id: number }> {
  try {
    const resp = await fetch(`${API_BASE}/conflicts/roads/${groupId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resolution,
        resolved_by: resolvedBy,
      }),
    });
    if (!resp.ok) throw new Error(`Failed to resolve road conflict: ${resp.status}`);
    return await resp.json();
  } catch (error) {
    console.warn("Conflicts API down, resolving road conflict locally:", error);
    return {
      status: "resolved",
      resolution,
      group_id: groupId
    };
  }
}

export async function resolveAuthorityConflict(
  groupId: number,
  resolution: 'merge' | 'link' | 'dismiss',
  resolvedBy: string = 'system'
): Promise<{ status: string; resolution: string; group_id: number }> {
  try {
    const resp = await fetch(`${API_BASE}/conflicts/authorities/${groupId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resolution,
        resolved_by: resolvedBy,
      }),
    });
    if (!resp.ok) throw new Error(`Failed to resolve authority conflict: ${resp.status}`);
    return await resp.json();
  } catch (error) {
    console.warn("Conflicts API down, resolving authority conflict locally:", error);
    return {
      status: "resolved",
      resolution,
      group_id: groupId
    };
  }
}
