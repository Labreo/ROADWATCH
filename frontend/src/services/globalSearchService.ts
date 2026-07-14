import { roads as defaultRoads, authorities as defaultAuthorities } from '@/data/mockData';

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
  try {
    const url = `${API_BASE}/roads/global-search?q=${encodeURIComponent(query)}&min_similarity=${minSimilarity}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Search failed: ${resp.status}`);
    return await resp.json();
  } catch (error) {
    console.warn("Global search API down, performing client-side mock search:", error);
    const lowercaseQuery = query.toLowerCase();
    
    // Filter roads locally
    const filteredRoads = defaultRoads.filter(r => 
      r.name.toLowerCase().includes(lowercaseQuery) || 
      r.roadCode.toLowerCase().includes(lowercaseQuery)
    );
    
    // Group by region
    const regionNames: Record<string, string> = {
      IN: 'India (Mumbai)',
      US: 'United States (Michigan)',
      GB: 'United Kingdom (London)',
      KE: 'Kenya (Nairobi)'
    };
    
    const groupsMap: Record<string, RoadResult[]> = {};
    
    filteredRoads.forEach(r => {
      const region = r.regionCode || 'IN';
      const authName = defaultAuthorities.find(a => a.id === r.authorityId)?.name || 'Unknown Authority';
      
      if (!groupsMap[region]) {
        groupsMap[region] = [];
      }
      
      groupsMap[region].push({
        id: r.id,
        name: r.name,
        road_code: r.roadCode,
        status: r.status,
        length_km: r.lengthKm,
        authority_id: r.authorityId,
        authority_name: authName,
        region_code: region,
        region_name: regionNames[region] || region,
        sim: 0.85
      });
    });
    
    const results: RegionGroup[] = Object.keys(groupsMap).map(region => ({
      region_code: region,
      region_name: regionNames[region] || region,
      roads: groupsMap[region]
    }));
    
    const total = filteredRoads.length;
    
    return {
      query,
      total,
      results
    };
  }
}

export async function getCrossRegionMatches(
  roadId: number
): Promise<CrossRegionMatchResponse> {
  try {
    const url = `${API_BASE}/roads/${roadId}/cross-region-match`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Cross-region match failed: ${resp.status}`);
    return await resp.json();
  } catch (error) {
    console.warn("Cross-region matching API down, using client-side mock matches:", error);
    
    const sourceRoad = defaultRoads.find(r => r.id === roadId);
    if (!sourceRoad) {
      return {
        source_road_id: roadId,
        source_road_name: 'Unknown Road',
        source_region: 'IN',
        matches: []
      };
    }
    
    const regionNames: Record<string, string> = {
      IN: 'India (Mumbai)',
      US: 'United States (Michigan)',
      GB: 'United Kingdom (London)',
      KE: 'Kenya (Nairobi)'
    };
    
    // Find roads in other regions that share keywords in name
    const sourceKeywords = sourceRoad.name.toLowerCase().split(' ').filter(w => w.length > 3);
    
    const matches: CrossRegionMatch[] = [];
    defaultRoads.forEach(r => {
      if (r.id === roadId || r.regionCode === sourceRoad.regionCode) return;
      
      // Calculate intersection of keywords
      const rKeywords = r.name.toLowerCase().split(' ');
      const matchCount = sourceKeywords.filter(w => rKeywords.includes(w)).length;
      
      if (matchCount > 0) {
        matches.push({
          matched_road_id: r.id,
          matched_road_name: r.name,
          matched_road_code: r.roadCode,
          region_code: r.regionCode || 'IN',
          region_name: regionNames[r.regionCode || 'IN'] || 'Unknown Region',
          similarity: 0.5 + (matchCount / sourceKeywords.length) * 0.4,
          match_type: "SEMANTIC_NAME_MATCH"
        });
      }
    });
    
    // If no matching road names, provide a fallback mock match in another region for demo purposes
    if (matches.length === 0) {
      const fallbackRegion = sourceRoad.regionCode === 'IN' ? 'US' : 'IN';
      const fallbackRoad = defaultRoads.find(r => r.regionCode === fallbackRegion) || defaultRoads[0];
      
      matches.push({
        matched_road_id: fallbackRoad.id,
        matched_road_name: `[Analog] ${sourceRoad.name}`,
        matched_road_code: fallbackRoad.roadCode,
        region_code: fallbackRegion,
        region_name: regionNames[fallbackRegion],
        similarity: 0.65,
        match_type: "LOCAL_CORRELATION_FALLBACK"
      });
    }
    
    return {
      source_road_id: roadId,
      source_road_name: sourceRoad.name,
      source_region: sourceRoad.regionCode || 'IN',
      matches
    };
  }
}
