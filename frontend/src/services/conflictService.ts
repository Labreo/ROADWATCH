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
  const params = resolved !== undefined ? `?resolved=${resolved}` : '';
  const resp = await fetch(`${API_BASE}/conflicts/roads${params}`);
  if (!resp.ok) throw new Error(`Failed to list road conflicts: ${resp.status}`);
  return resp.json();
}

export async function listAuthorityConflicts(
  resolved?: boolean
): Promise<ConflictListResponse> {
  const params = resolved !== undefined ? `?resolved=${resolved}` : '';
  const resp = await fetch(`${API_BASE}/conflicts/authorities${params}`);
  if (!resp.ok) throw new Error(`Failed to list authority conflicts: ${resp.status}`);
  return resp.json();
}

export async function detectRoadDuplicates(
  name: string,
  roadCode?: string,
  geomWkt?: string
): Promise<DetectResponse> {
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
  return resp.json();
}

export async function detectAuthorityDuplicates(
  name: string,
  departmentCode?: string
): Promise<DetectResponse> {
  const resp = await fetch(`${API_BASE}/conflicts/authorities/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      department_code: departmentCode,
    }),
  });
  if (!resp.ok) throw new Error(`Failed to detect authority duplicates: ${resp.status}`);
  return resp.json();
}

export async function createRoadConflictGroup(
  conflictKey: string,
  entityIds: number[]
): Promise<{ group_id: number; status: string }> {
  const resp = await fetch(`${API_BASE}/conflicts/roads/create-group`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conflict_key: conflictKey,
      entity_ids: entityIds,
    }),
  });
  if (!resp.ok) throw new Error(`Failed to create conflict group: ${resp.status}`);
  return resp.json();
}

export async function createAuthorityConflictGroup(
  conflictKey: string,
  entityIds: number[]
): Promise<{ group_id: number; status: string }> {
  const resp = await fetch(`${API_BASE}/conflicts/authorities/create-group`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conflict_key: conflictKey,
      entity_ids: entityIds,
    }),
  });
  if (!resp.ok) throw new Error(`Failed to create conflict group: ${resp.status}`);
  return resp.json();
}

export async function resolveRoadConflict(
  groupId: number,
  resolution: 'merge' | 'link' | 'dismiss',
  resolvedBy: string = 'system'
): Promise<{ status: string; resolution: string; group_id: number }> {
  const resp = await fetch(`${API_BASE}/conflicts/roads/${groupId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resolution,
      resolved_by: resolvedBy,
    }),
  });
  if (!resp.ok) throw new Error(`Failed to resolve road conflict: ${resp.status}`);
  return resp.json();
}

export async function resolveAuthorityConflict(
  groupId: number,
  resolution: 'merge' | 'link' | 'dismiss',
  resolvedBy: string = 'system'
): Promise<{ status: string; resolution: string; group_id: number }> {
  const resp = await fetch(`${API_BASE}/conflicts/authorities/${groupId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resolution,
      resolved_by: resolvedBy,
    }),
  });
  if (!resp.ok) throw new Error(`Failed to resolve authority conflict: ${resp.status}`);
  return resp.json();
}
