const API_BASE = 'http://localhost:8000/api/v1';

interface RoadResult {
  id: number;
  name: string;
  road_code: string;
  status: string;
  length_km: number;
  authority_id: number;
  authority_name: string;
  region_code: string;
  region_name: string;
  sim: number;
}

interface RegionGroup {
  region_code: string;
  region_name: string;
  roads: RoadResult[];
}

interface GlobalSearchResponse {
  query: string;
  total: number;
  results: RegionGroup[];
}

interface CrossRegionMatch {
  matched_road_id: number;
  matched_road_name: string;
  matched_road_code: string | null;
  region_code: string;
  region_name: string;
  similarity: number;
  match_type: string;
}

interface CrossRegionMatchResponse {
  source_road_id: number;
  source_road_name: string;
  source_region: string;
  matches: CrossRegionMatch[];
}

export async function searchRoadsGlobally(
  query: string,
  minSimilarity: number = 0.2
): Promise<GlobalSearchResponse> {
  const url = `${API_BASE}/roads/global-search?q=${encodeURIComponent(query)}&min_similarity=${minSimilarity}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Search failed: ${resp.status}`);
  return resp.json();
}

export async function getCrossRegionMatches(
  roadId: number
): Promise<CrossRegionMatchResponse> {
  const url = `${API_BASE}/roads/${roadId}/cross-region-match`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Cross-region match failed: ${resp.status}`);
  return resp.json();
}
