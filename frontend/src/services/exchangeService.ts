import { projects as defaultProjects, roads as defaultRoads } from '@/data/mockData';

const API_BASE = 'http://localhost:8000/api/v1';

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
}

interface ConversionResult {
  amountFrom: number;
  currencyFrom: string;
  amountTo: number;
  currencyTo: string;
  rate: number;
  timestamp: string;
}

interface ProjectCostComparison {
  projectId: number;
  projectTitle: string;
  sourceCurrency: string;
  targetCurrency: string;
  budgetAllocatedLocal: number;
  budgetAllocatedConverted: number | null;
  budgetSpentLocal: number;
  budgetSpentConverted: number | null;
  rateUsed: number | null;
  rateTimestamp: string | null;
}

interface GlobalSpendResult {
  totalAllocated: number;
  totalSpent: number;
  targetCurrency: string;
  projectCount: number;
  projects: {
    projectId: number;
    title: string;
    regionCode: string;
    currency: string;
    budgetAllocatedLocal: number;
    budgetAllocatedConverted: number | null;
    budgetSpentLocal: number;
    budgetSpentConverted: number | null;
  }[];
}

// In-memory cache
const rateCache: Map<string, { rate: number; ts: number }> = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const MOCK_EXCHANGE_RATES: Record<string, number> = {
  'USD_INR': 83.5, 'INR_USD': 1 / 83.5,
  'GBP_INR': 106.0, 'INR_GBP': 1 / 106.0,
  'KES_INR': 0.65, 'INR_KES': 1 / 0.65,
  'USD_GBP': 0.79, 'GBP_USD': 1.27,
  'USD_KES': 129.5, 'KES_USD': 1 / 129.5,
  'GBP_KES': 164.5, 'KES_GBP': 1 / 164.5,
  'INR_INR': 1.0, 'USD_USD': 1.0, 'GBP_GBP': 1.0, 'KES_KES': 1.0,
};

function getOfflineRate(from: string, to: string): number {
  const key = `${from.toUpperCase()}_${to.toUpperCase()}`;
  if (MOCK_EXCHANGE_RATES[key] !== undefined) {
    return MOCK_EXCHANGE_RATES[key];
  }
  // Try cross rate through INR
  const toInrKey = `${from.toUpperCase()}_INR`;
  const fromInrKey = `INR_${to.toUpperCase()}`;
  if (MOCK_EXCHANGE_RATES[toInrKey] !== undefined && MOCK_EXCHANGE_RATES[fromInrKey] !== undefined) {
    return MOCK_EXCHANGE_RATES[toInrKey] * MOCK_EXCHANGE_RATES[fromInrKey];
  }
  return 1.0;
}

async function fetchWithCache<T>(url: string, cacheKey: string): Promise<T> {
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { ...cached, rate: cached.rate } as unknown as T;
  }
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`API error: ${resp.status}`);
    const data = await resp.json();
    if (data.rate) {
      rateCache.set(cacheKey, { rate: data.rate, ts: Date.now() });
    }
    return data;
  } catch (error) {
    console.warn(`Exchange rate API down, returning offline rate for ${cacheKey}:`, error);
    const parts = cacheKey.split('_');
    const from = parts[0] || 'USD';
    const to = parts[1] || 'INR';
    const rate = getOfflineRate(from, to);
    return { from, to, rate } as unknown as T;
  }
}

export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<ExchangeRate> {
  const url = `${API_BASE}/exchange/rate?from=${fromCurrency}&to=${toCurrency}`;
  return fetchWithCache<ExchangeRate>(url, `${fromCurrency.toUpperCase()}_${toCurrency.toUpperCase()}`);
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<ConversionResult> {
  try {
    const url = `${API_BASE}/exchange/convert?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Conversion failed: ${resp.status}`);
    return await resp.json();
  } catch (error) {
    console.warn(`Conversion API down, returning offline conversion:`, error);
    const rate = getOfflineRate(fromCurrency, toCurrency);
    return {
      amountFrom: amount,
      currencyFrom: fromCurrency.toUpperCase(),
      amountTo: Math.round(amount * rate * 100) / 100,
      currencyTo: toCurrency.toUpperCase(),
      rate,
      timestamp: new Date().toISOString(),
    };
  }
}

export async function compareProjectCost(
  projectId: number,
  toCurrency: string = 'USD'
): Promise<ProjectCostComparison> {
  try {
    const url = `${API_BASE}/exchange/compare/${projectId}?to_currency=${toCurrency}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Comparison failed: ${resp.status}`);
    return await resp.json();
  } catch (error) {
    console.warn("Project cost comparison API down, using offline fallback:", error);
    const project = defaultProjects.find(p => p.id === projectId);
    const budgetAllocatedLocal = project?.budgetAllocated || 0;
    const budgetSpentLocal = project?.budgetSpent || 0;
    
    // Default project currency is INR
    const sourceCurrency = 'INR';
    const rate = getOfflineRate(sourceCurrency, toCurrency);
    
    return {
      projectId,
      projectTitle: project?.title || "Unknown Project",
      sourceCurrency,
      targetCurrency: toCurrency.toUpperCase(),
      budgetAllocatedLocal,
      budgetAllocatedConverted: Math.round(budgetAllocatedLocal * rate * 100) / 100,
      budgetSpentLocal,
      budgetSpentConverted: Math.round(budgetSpentLocal * rate * 100) / 100,
      rateUsed: rate,
      rateTimestamp: new Date().toISOString()
    };
  }
}

export async function getGlobalSpend(
  currency: string = 'USD'
): Promise<GlobalSpendResult> {
  try {
    const url = `${API_BASE}/exchange/global-spend?currency=${currency}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Global spend fetch failed: ${resp.status}`);
    return await resp.json();
  } catch (error) {
    console.warn("Global spend API down, using offline fallback:", error);
    
    const target = currency.toUpperCase();
    
    const mappedProjects = defaultProjects.map(p => {
      // Find source currency from region of project's road
      const road = defaultRoads.find(r => r.id === p.roadId);
      const region = road?.regionCode || 'IN';
      const regionToCurr: Record<string, string> = { US: 'USD', GB: 'GBP', KE: 'KES', IN: 'INR' };
      const source = regionToCurr[region] || 'INR';
      const rate = getOfflineRate(source, target);
      
      return {
        projectId: p.id,
        title: p.title,
        regionCode: region,
        currency: source,
        budgetAllocatedLocal: p.budgetAllocated,
        budgetAllocatedConverted: Math.round(p.budgetAllocated * rate * 100) / 100,
        budgetSpentLocal: p.budgetSpent,
        budgetSpentConverted: Math.round(p.budgetSpent * rate * 100) / 100
      };
    });
    
    const totalAllocated = mappedProjects.reduce((sum, p) => sum + (p.budgetAllocatedConverted || 0), 0);
    const totalSpent = mappedProjects.reduce((sum, p) => sum + (p.budgetSpentConverted || 0), 0);
    
    return {
      totalAllocated,
      totalSpent,
      targetCurrency: target,
      projectCount: defaultProjects.length,
      projects: mappedProjects
    };
  }
}

// CPI data for frontend inflation calculations (mirrors backend)
const CPI_DATA: Record<string, Record<number, number>> = {
  IN: { 2020: 100, 2021: 105.1, 2022: 111.6, 2023: 118.4, 2024: 124.8, 2025: 131, 2026: 136.5 },
  US: { 2020: 100, 2021: 104.7, 2022: 112, 2023: 115.8, 2024: 119, 2025: 121.5, 2026: 123.8 },
  GB: { 2020: 100, 2021: 102.6, 2022: 109.1, 2023: 115.4, 2024: 118.2, 2025: 120.8, 2026: 123 },
  KE: { 2020: 100, 2021: 106.2, 2022: 113.8, 2023: 121.5, 2024: 128.1, 2025: 133.6, 2026: 138.2 },
};

export function getInflationData(region: string): Record<number, number> | null {
  return CPI_DATA[region] || null;
}

export function adjustForInflation(
  amount: number,
  fromYear: number,
  toYear: number = 2026,
  region: string = 'IN'
): number | null {
  const regionData = CPI_DATA[region];
  if (!regionData) return null;
  const fromCpi = regionData[fromYear];
  const toCpi = regionData[toYear];
  if (!fromCpi || !toCpi) return null;
  return Math.round(amount * (toCpi / fromCpi) * 100) / 100;
}

const REGION_CURRENCY: Record<string, string> = {
  IN: 'INR', US: 'USD', GB: 'GBP', KE: 'KES',
};

export function formatInflationAdjustment(
  amount: number,
  fromYear: number,
  toYear: number = 2026,
  region: string = 'IN'
): string {
  const adjusted = adjustForInflation(amount, fromYear, toYear, region);
  const currency = REGION_CURRENCY[region] || 'INR';
  if (adjusted === null) return `${formatConvertedAmount(amount, currency)} (no CPI data)`;
  return `${formatConvertedAmount(amount, currency)} (${fromYear}) → ${formatConvertedAmount(adjusted, currency)} (${toYear})`;
}

export function formatConvertedAmount(
  amount: number | null | undefined,
  currency: string,
  locale: string = 'en-US'
): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
