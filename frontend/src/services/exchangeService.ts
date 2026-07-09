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
