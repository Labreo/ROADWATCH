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

async function fetchWithCache<T>(url: string, cacheKey: string): Promise<T> {
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { ...cached, rate: cached.rate } as unknown as T;
  }
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  const data = await resp.json();
  if (data.rate) {
    rateCache.set(cacheKey, { rate: data.rate, ts: Date.now() });
  }
  return data;
}

export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<ExchangeRate> {
  const url = `${API_BASE}/exchange/rate?from=${fromCurrency}&to=${toCurrency}`;
  return fetchWithCache<ExchangeRate>(url, `${fromCurrency}_${toCurrency}`);
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<ConversionResult> {
  const url = `${API_BASE}/exchange/convert?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Conversion failed: ${resp.status}`);
  return resp.json();
}

export async function compareProjectCost(
  projectId: number,
  toCurrency: string = 'USD'
): Promise<ProjectCostComparison> {
  const url = `${API_BASE}/exchange/compare/${projectId}?to_currency=${toCurrency}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Comparison failed: ${resp.status}`);
  return resp.json();
}

export async function getGlobalSpend(
  currency: string = 'USD'
): Promise<GlobalSpendResult> {
  const url = `${API_BASE}/exchange/global-spend?currency=${currency}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Global spend fetch failed: ${resp.status}`);
  return resp.json();
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
