'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Gauge,
  Coins,
  DollarSign,
  User,
  AlertTriangle,
  CalendarClock,
  Route,
  ChevronDown,
  Globe,
  ArrowUpDown,
  Award,
  Zap,
} from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { formatCurrency } from '@/services/regionAwareFormat';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CrossRegionMetricKey =
  | 'transparency_score'
  | 'budget_allocated'
  | 'budget_spent'
  | 'utilization_rate'
  | 'avg_contractor_rating'
  | 'active_complaints'
  | 'avg_delay_days'
  | 'cost_per_km';

export interface RegionMetric {
  code: string;
  name: string;
  flag: string;
  value: number;
}

export interface MetricDefinition {
  key: CrossRegionMetricKey;
  label: string;
  unit: string;
  higherIsBetter: boolean;
  decimalPlaces: number;
  icon: React.ReactNode;
  formatValue: (value: number) => string;
}

export interface CrossRegionData {
  metrics: CrossRegionMetricKey[];
  regions: RegionMetric[];
}

/* ------------------------------------------------------------------ */
/*  Metric definitions                                                 */
/* ------------------------------------------------------------------ */

const METRIC_DEFINITIONS: Record<CrossRegionMetricKey, MetricDefinition> = {
  transparency_score: {
    key: 'transparency_score',
    label: 'Avg Transparency Score',
    unit: '/100',
    higherIsBetter: true,
    decimalPlaces: 0,
    icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />,
    formatValue: (v) => `${Math.round(v)}/100`,
  },
  budget_allocated: {
    key: 'budget_allocated',
    label: 'Total Budget Allocated',
    unit: '',
    higherIsBetter: false,
    decimalPlaces: 0,
    icon: <Coins className="w-3.5 h-3.5 text-amber-400" />,
    formatValue: (v) => formatCurrency(v, true),
  },
  budget_spent: {
    key: 'budget_spent',
    label: 'Total Budget Spent',
    unit: '',
    higherIsBetter: false,
    decimalPlaces: 0,
    icon: <DollarSign className="w-3.5 h-3.5 text-cyan-400" />,
    formatValue: (v) => formatCurrency(v, true),
  },
  utilization_rate: {
    key: 'utilization_rate',
    label: 'Budget Utilization Rate',
    unit: '%',
    higherIsBetter: false,
    decimalPlaces: 1,
    icon: <Gauge className="w-3.5 h-3.5 text-emerald-400" />,
    formatValue: (v) => `${v.toFixed(1)}%`,
  },
  avg_contractor_rating: {
    key: 'avg_contractor_rating',
    label: 'Avg Contractor Rating',
    unit: '/5',
    higherIsBetter: true,
    decimalPlaces: 2,
    icon: <User className="w-3.5 h-3.5 text-blue-400" />,
    formatValue: (v) => `${v.toFixed(2)}/5`,
  },
  active_complaints: {
    key: 'active_complaints',
    label: 'Active Complaints',
    unit: '',
    higherIsBetter: false,
    decimalPlaces: 0,
    icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />,
    formatValue: (v) => `${Math.round(v)}`,
  },
  avg_delay_days: {
    key: 'avg_delay_days',
    label: 'Avg Project Delay',
    unit: 'days',
    higherIsBetter: false,
    decimalPlaces: 0,
    icon: <CalendarClock className="w-3.5 h-3.5 text-red-400" />,
    formatValue: (v) => `${Math.round(v)} days`,
  },
  cost_per_km: {
    key: 'cost_per_km',
    label: 'Cost per km',
    unit: '',
    higherIsBetter: false,
    decimalPlaces: 0,
    icon: <Route className="w-3.5 h-3.5 text-slate-400" />,
    formatValue: (v) => formatCurrency(v, true),
  },
};

/* ------------------------------------------------------------------ */
/*  Default mock data (used when no data prop is passed)               */
/* ------------------------------------------------------------------ */

const DEFAULT_REGIONS: RegionMetric[] = [
  { code: 'IN', name: 'India', flag: '🇮🇳', value: 0 },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', value: 0 },
  { code: 'US', name: 'United States', flag: '🇺🇸', value: 0 },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', value: 0 },
];

const DEFAULT_METRICS_DATA: Record<CrossRegionMetricKey, RegionMetric[]> = {
  transparency_score: [
    { code: 'IN', name: 'India', flag: '🇮🇳', value: 72 },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', value: 88 },
    { code: 'US', name: 'United States', flag: '🇺🇸', value: 81 },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', value: 58 },
  ],
  budget_allocated: [
    { code: 'IN', name: 'India', flag: '🇮🇳', value: 4200000000 },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', value: 6200000000 },
    { code: 'US', name: 'United States', flag: '🇺🇸', value: 11000000000 },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', value: 850000000 },
  ],
  budget_spent: [
    { code: 'IN', name: 'India', flag: '🇮🇳', value: 3800000000 },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', value: 5500000000 },
    { code: 'US', name: 'United States', flag: '🇺🇸', value: 10200000000 },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', value: 720000000 },
  ],
  utilization_rate: [
    { code: 'IN', name: 'India', flag: '🇮🇳', value: 90.5 },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', value: 88.7 },
    { code: 'US', name: 'United States', flag: '🇺🇸', value: 92.7 },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', value: 84.7 },
  ],
  avg_contractor_rating: [
    { code: 'IN', name: 'India', flag: '🇮🇳', value: 4.1 },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', value: 4.5 },
    { code: 'US', name: 'United States', flag: '🇺🇸', value: 4.3 },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', value: 3.6 },
  ],
  active_complaints: [
    { code: 'IN', name: 'India', flag: '🇮🇳', value: 142 },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', value: 58 },
    { code: 'US', name: 'United States', flag: '🇺🇸', value: 87 },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', value: 203 },
  ],
  avg_delay_days: [
    { code: 'IN', name: 'India', flag: '🇮🇳', value: 45 },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', value: 22 },
    { code: 'US', name: 'United States', flag: '🇺🇸', value: 34 },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', value: 67 },
  ],
  cost_per_km: [
    { code: 'IN', name: 'India', flag: '🇮🇳', value: 8500000 },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', value: 15000000 },
    { code: 'US', name: 'United States', flag: '🇺🇸', value: 18000000 },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', value: 6200000 },
  ],
};

/* ------------------------------------------------------------------ */
/*  Helper: ShieldCheck icon (not in lucide by default under this name)*/
/* ------------------------------------------------------------------ */

function ShieldCheck({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Metric selector dropdown                                           */
/* ------------------------------------------------------------------ */

interface MetricSelectorProps {
  metrics: CrossRegionMetricKey[];
  value: CrossRegionMetricKey;
  onChange: (key: CrossRegionMetricKey) => void;
}

function MetricSelector({ metrics, value, onChange }: MetricSelectorProps) {
  const [open, setOpen] = useState(false);
  const activeDef = METRIC_DEFINITIONS[value];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-slate-900/60 border border-border/40 text-xs text-left transition-colors hover:border-cyan-700/50"
        aria-label={`Metric: ${activeDef.label}`}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 truncate">
          {activeDef.icon}
          <span className="font-medium text-slate-100 truncate">{activeDef.label}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scaleY: 0.97 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-xl bg-slate-900/95 backdrop-blur-xl border border-border/60 shadow-2xl"
          >
            {metrics.map((key) => {
              const def = METRIC_DEFINITIONS[key];
              const isActive = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-slate-800/80 ${
                    isActive ? 'bg-cyan-950/40 text-cyan-300' : 'text-slate-300'
                  }`}
                >
                  {def.icon}
                  <span className="truncate">{def.label}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                    {def.unit}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Region card with CSS bar                                           */
/* ------------------------------------------------------------------ */

interface RegionCardProps {
  region: RegionMetric;
  metricDef: MetricDefinition;
  maxValue: number;
  isBest: boolean;
  isWorst: boolean;
}

function RegionCard({ region, metricDef, maxValue, isBest, isWorst }: RegionCardProps) {
  // Calculate bar width as percentage of max value
  const barWidth = maxValue > 0 ? (region.value / maxValue) * 100 : 0;

  const barColor = isBest
    ? 'bg-gradient-to-r from-emerald-500/80 to-emerald-400/60'
    : isWorst
      ? 'bg-gradient-to-r from-red-500/80 to-red-400/60'
      : 'bg-gradient-to-r from-cyan-500/60 to-cyan-400/40';

  const valueColor = isBest
    ? 'text-emerald-400'
    : isWorst
      ? 'text-red-400'
      : 'text-slate-100';

  const badgeColor = isBest
    ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-400'
    : isWorst
      ? 'bg-red-950/60 border-red-800/40 text-red-400'
    : 'bg-slate-800/60 border-slate-700/40 text-slate-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="p-4 rounded-xl border border-border/40 bg-slate-900/40 backdrop-blur-sm space-y-3"
    >
      {/* Header: flag + name + badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl leading-none shrink-0">{region.flag}</span>
          <span className="text-xs font-bold text-slate-200 truncate">{region.name}</span>
        </div>
        {(isBest || isWorst) && (
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeColor}`}>
            {isBest ? 'Best' : 'Worst'}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-black tracking-tight ${valueColor}`}>
          {metricDef.formatValue(region.value)}
        </span>
        {metricDef.unit && !metricDef.label.includes('Score') && !metricDef.label.includes('Rating') && (
          <span className="text-[10px] text-muted-foreground font-medium">{metricDef.unit}</span>
        )}
      </div>

      {/* CSS Bar */}
      <div className="relative h-2.5 rounded-full bg-slate-800/60 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${barWidth}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          className={`h-full rounded-full ${barColor}`}
        />
      </div>

      {/* Min/max indicator */}
      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1">
          {metricDef.higherIsBetter ? (
            <TrendingUp className="w-2.5 h-2.5" />
          ) : (
            <TrendingDown className="w-2.5 h-2.5" />
          )}
          {metricDef.higherIsBetter ? 'Higher is better' : 'Lower is better'}
        </span>
        {isBest && (
          <span className="flex items-center gap-1 text-emerald-400/70">
            <Award className="w-2.5 h-2.5" />
            Top performer
          </span>
        )}
        {isWorst && (
          <span className="flex items-center gap-1 text-red-400/70">
            <Zap className="w-2.5 h-2.5" />
            Needs attention
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton loader                                                    */
/* ------------------------------------------------------------------ */

function CrossRegionSkeleton() {
  return (
    <div className="space-y-4 select-none" role="status" aria-busy="true" aria-label="Loading cross-region data">
      {/* Metric selector skeleton */}
      <div className="skeleton rounded-xl h-10 w-full" />

      {/* 4 region cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] space-y-3"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between gap-2">
              <SkeletonBlock className="w-6 h-6 rounded-full" />
              <SkeletonBlock className="h-2.5 w-24 rounded-full" />
            </div>
            <SkeletonBlock className="h-7 w-28 rounded-md" />
            <SkeletonBlock className="h-2.5 w-full rounded-full" />
            <SkeletonBlock className="h-2 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`skeleton rounded ${className}`} />;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export interface CrossRegionComparisonProps {
  /** Optional custom data. Falls back to internal mock data if omitted. */
  data?: CrossRegionData;
  /** Loading state */
  loading?: boolean;
  /** Error state (component will show error fallback) */
  error?: string | null;
  /** Title override */
  title?: string;
  /** Show the region selector dropdown */
  showDropdown?: boolean;
}

export default function CrossRegionComparison({
  data,
  loading = false,
  title = 'Cross-Region Comparison',
  showDropdown = true,
}: CrossRegionComparisonProps) {
  // Determine available metrics
  const availableMetrics = useMemo<CrossRegionMetricKey[]>(() => {
    if (data?.metrics && data.metrics.length > 0) {
      return data.metrics;
    }
    // Default: all metrics
    return Object.keys(METRIC_DEFINITIONS) as CrossRegionMetricKey[];
  }, [data]);

  const [selectedMetric, setSelectedMetric] = useState<CrossRegionMetricKey>(() => availableMetrics[0]);

  // Derive safe metric: if the user's selection is no longer in the available set, fall back to the first option
  const activeMetric = availableMetrics.includes(selectedMetric) ? selectedMetric : availableMetrics[0];

  // Resolve region data for the active metric
  const regionData = useMemo<RegionMetric[]>(() => {
    if (data?.regions && data.regions.length > 0) {
      // If data is provided directly, use it
      return data.regions;
    }
    // Fall back to default mock data
    return DEFAULT_METRICS_DATA[activeMetric] ?? DEFAULT_REGIONS;
  }, [data, activeMetric]);

  // Compute best/worst
  const { maxValue, bestIndices, worstIndices } = useMemo(() => {
    if (regionData.length === 0) {
      return { maxValue: 0, bestIndices: new Set<number>(), worstIndices: new Set<number>() };
    }

    const def = METRIC_DEFINITIONS[activeMetric];
    const values = regionData.map((r) => r.value);

    const max = Math.max(...values);
    const min = Math.min(...values);

    const bestSet = new Set<number>();
    const worstSet = new Set<number>();

    values.forEach((v, i) => {
      if (v === max) bestSet.add(i);
      if (v === min) worstSet.add(i);
    });

    // If higher is better, best = max, worst = min
    // If lower is better, best = min, worst = max
    let actualBest = bestSet;
    let actualWorst = worstSet;

    if (!def.higherIsBetter) {
      actualBest = worstSet;
      actualWorst = bestSet;
    }

    return {
      maxValue: max,
      bestIndices: actualBest,
      worstIndices: actualWorst,
    };
  }, [regionData, activeMetric]);

  const metricDef = METRIC_DEFINITIONS[activeMetric];

  // Reset selected metric when available metrics change
  // (derived via activeMetric above, no effect needed)

  /* ---- Empty state ---- */
  if (!loading && regionData.length === 0) {
    return (
      <EmptyState
        type="no-data"
        title="No Cross-Region Data"
        description="No comparison data is available for the selected metric. Try selecting a different metric or check back later."
      />
    );
  }

  /* ---- Render ---- */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">{title}</h2>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <ArrowUpDown className="w-3 h-3" />
          <span>Comparing {regionData.length} regions</span>
        </div>
      </div>

      {/* Metric selector */}
      {showDropdown && availableMetrics.length > 1 && (
        <div className="w-full sm:w-72">
          <MetricSelector
            metrics={availableMetrics}
            value={selectedMetric}
            onChange={setSelectedMetric}
          />
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <CrossRegionSkeleton />
      ) : (
        /* Region cards grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {regionData.map((region, index) => (
            <RegionCard
              key={region.code}
              region={region}
              metricDef={metricDef}
              maxValue={maxValue}
              isBest={bestIndices.has(index)}
              isWorst={worstIndices.has(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}