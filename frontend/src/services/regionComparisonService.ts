import { getRegionData, regionInfo } from '@/data/regionsMockData';
import { globalTemplates, RegionTemplate } from '@/data/globalTemplates';
import { roads as defaultRoads, contractors as defaultContractors, projects as defaultProjects, authorities as defaultAuthorities } from '@/data/mockData';

export interface RegionComparisonEntry {
  regionCode: string;
  regionName: string;
  flag: string;
  template: RegionTemplate;
  roadCount: number;
  totalBudgetAllocated: number;
  totalBudgetSpent: number;
  avgContractorRating: number;
  blacklistedContractors: number;
  poorRoads: number;
  nationalHighwayCount: number;
}

export interface ComparisonResult {
  entries: RegionComparisonEntry[];
  bestSpending: { regionCode: string; label: string };
  bestContractors: { regionCode: string; label: string };
  mostInfrastructure: { regionCode: string; label: string };
}

/**
 * Build comparison data across all regions
 */
export function getCrossRegionComparison(): ComparisonResult {
  const regionCodes = ['IN', 'GB', 'US', 'KE'];
  const entries: RegionComparisonEntry[] = regionCodes.map(code => {
    const regionData = getRegionData(code);
    const template = globalTemplates[code];
    const info = regionInfo[code as keyof typeof regionInfo];
    const roads = regionData.roads;
    const projects = regionData.projects;
    const contractors = regionData.contractors;

    const totalAllocated = projects.reduce((sum, p) => sum + p.budgetAllocated, 0);
    const totalSpent = projects.reduce((sum, p) => sum + p.budgetSpent, 0);
    const avgRating = contractors.length > 0
      ? contractors.reduce((sum, c) => sum + c.rating, 0) / contractors.length
      : 0;
    const blacklisted = contractors.filter(c => c.blacklisted).length;
    const poorRoads = roads.filter(r => r.status === 'poor').length;
    const nationalHighways = roads.filter(r =>
      r.roadCode.match(/^(NH|M\d|I-|A\d)/)
    ).length;

    return {
      regionCode: code,
      regionName: template.regionName,
      flag: info?.flag || '',
      template,
      roadCount: roads.length,
      totalBudgetAllocated: totalAllocated,
      totalBudgetSpent: totalSpent,
      avgContractorRating: Math.round(avgRating * 100) / 100,
      blacklistedContractors: blacklisted,
      poorRoads,
      nationalHighwayCount: nationalHighways,
    };
  });

  // Find best in each category
  const bestSpending = entries.reduce((best, e) =>
    e.totalBudgetSpent > best.totalBudgetSpent ? e : best
  );
  const bestContractors = entries.reduce((best, e) =>
    e.avgContractorRating > best.avgContractorRating ? e : best
  );
  const mostInfrastructure = entries.reduce((best, e) =>
    e.roadCount > best.roadCount ? e : best
  );

  return {
    entries,
    bestSpending: { regionCode: bestSpending.regionCode, label: bestSpending.regionName },
    bestContractors: { regionCode: bestContractors.regionCode, label: bestContractors.regionName },
    mostInfrastructure: { regionCode: mostInfrastructure.regionCode, label: mostInfrastructure.regionName },
  };
}

/**
 * Format a comparison line with region-aware currency
 */
export function formatComparisonLine(
  entry: RegionComparisonEntry,
  field: 'totalBudgetAllocated' | 'totalBudgetSpent',
  label: string
): string {
  const value = entry[field] as number;
  const formatted = entry.template.formatCurrency(value);
  return `${entry.flag} **${entry.regionName}**: ${label} ${formatted}`;
}

/**
 * Generate comparison text for a specific query
 */
export function generateComparisonResponse(query: string, comparison: ComparisonResult): string {
  const lower = query.toLowerCase();
  const lines: string[] = [];

  // Compare budgets
  if (lower.includes('budget') || lower.includes('spend') || lower.includes('money') || lower.includes('fund')) {
    lines.push(`**Cross-Region Budget Comparison**`);
    comparison.entries.forEach(e => {
      lines.push(`- ${e.flag} **${e.regionName}**: Allocated ${e.template.formatCurrency(e.totalBudgetAllocated)} | Spent ${e.template.formatCurrency(e.totalBudgetSpent)}`);
    });
    lines.push(`\nHighest spending: **${comparison.bestSpending.label}**`);
  }

  // Compare roads
  if (lower.includes('road') || lower.includes('highway') || lower.includes('infrastructure')) {
    lines.push(`**Cross-Region Road Network Comparison**`);
    comparison.entries.forEach(e => {
      const pct = e.roadCount > 0 ? Math.round((e.poorRoads / e.roadCount) * 100) : 0;
      lines.push(`- ${e.flag} **${e.regionName}**: ${e.roadCount} roads (${e.nationalHighwayCount} national), ${e.poorRoads} poor (${pct}%)`);
    });
    lines.push(`\nLargest network: **${comparison.mostInfrastructure.label}**`);
  }

  // Compare contractors
  if (lower.includes('contractor') || lower.includes('rating') || lower.includes('company')) {
    lines.push(`**Cross-Region Contractor Quality Comparison**`);
    comparison.entries.forEach(e => {
      lines.push(`- ${e.flag} **${e.regionName}**: Avg rating ${e.avgContractorRating.toFixed(2)}/5 | ${e.blacklistedContractors} blacklisted`);
    });
    lines.push(`\nBest contractor ratings: **${comparison.bestContractors.label}**`);
  }

  // Fallback — full comparison
  if (lines.length === 0) {
    lines.push(`**Cross-Region Infrastructure Comparison**`);
    comparison.entries.forEach(e => {
      lines.push(`- ${e.flag} **${e.regionName}**: ${e.roadCount} roads, ${e.template.formatCurrency(e.totalBudgetAllocated)} budget, ${e.avgContractorRating.toFixed(2)} avg contractor rating`);
    });
  }

  return lines.join('\n');
}

/**
 * Detect if a query is asking for cross-region comparison
 */
export function isComparisonQuery(text: string): boolean {
  const lower = text.toLowerCase();
  const patterns = [
    /compare.*region/i,
    /cross.?region/i,
    /how.*(?:india|uk|usa|kenya).*(?:uk|india|usa|kenya)/i,
    /(?:india|uk|usa|kenya).*vs/i,
    /vs.*(?:india|uk|usa|kenya)/i,
    /all region/i,
    /global/i,
    /worldwide/i,
    /every region/i,
    /show.*region/i,
    /region.*compar/i,
    /difference.*country/i,
    /country.*difference/i,
  ];
  return patterns.some(p => p.test(lower));
}

/**
 * Detect which regions are being compared
 */
export function extractComparisonRegions(text: string): string[] {
  const lower = text.toLowerCase();
  const regionMap: Record<string, string> = {
    india: 'IN', indian: 'IN', mumbai: 'IN', delhi: 'IN',
    uk: 'GB', britain: 'GB', england: 'GB', london: 'GB',
    us: 'US', usa: 'US', america: 'US', 'united states': 'US', detroit: 'US',
    kenya: 'KE', nairobi: 'KE', mombasa: 'KE',
  };

  const found: string[] = [];
  for (const [name, code] of Object.entries(regionMap)) {
    if (lower.includes(name)) {
      if (!found.includes(code)) found.push(code);
    }
  }
  return found.length > 0 ? found : ['IN', 'GB', 'US', 'KE'];
}