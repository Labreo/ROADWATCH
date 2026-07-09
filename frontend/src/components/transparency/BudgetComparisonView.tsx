'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Road,
  Project,
  Contractor,
  Complaint,
} from '@/types';
import {
  calculateRoadTransparency,
  formatINR,
  getScoreGrade,
} from '@/services/transparencyEngine';
import Card from '@/components/shared/Card';
import EmptyState from '@/components/shared/EmptyState';
import {
  ArrowLeftRight,
  ChevronDown,
  Building2,
  Coins,
  TrendingUp,
  Route,
  CalendarClock,
  ShieldCheck,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Printer,
  User,
  BarChart3,
  DollarSign,
  Search,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BudgetComparisonViewProps {
  /** Full list of roads for the dropdown selectors. */
  roads: Road[];
  /** Optional: pre-select two roads by ID. */
  roadIds?: [number, number];
  projects: Project[];
  contractors: Contractor[];
  complaints: Complaint[];
}

/* ------------------------------------------------------------------ */
/*  Colour palette for fund-source bars                                */
/* ------------------------------------------------------------------ */

const FUND_SOURCE_COLORS: Record<string, string> = {
  'Central Road Infrastructure Fund': '#10b981',
  'State PWD Capital Tiers': '#06b6d4',
  'Municipal General Portfolios': '#f59e0b',
  'Taxpayer Distribution Ratios': '#8b5cf6',
};

/* ------------------------------------------------------------------ */
/*  Helper: simple icon picker per fund source                         */
/* ------------------------------------------------------------------ */

function fundSourceIcon(source: string) {
  switch (source) {
    case 'Central Road Infrastructure Fund':
      return <Building2 className="w-3 h-3 text-emerald-400" />;
    case 'State PWD Capital Tiers':
      return <BarChart3 className="w-3 h-3 text-cyan-400" />;
    case 'Municipal General Portfolios':
      return <Coins className="w-3 h-3 text-amber-400" />;
    case 'Taxpayer Distribution Ratios':
      return <TrendingUp className="w-3 h-3 text-purple-400" />;
    default:
      return <DollarSign className="w-3 h-3 text-slate-400" />;
  }
}

/* ------------------------------------------------------------------ */
/*  Road selector dropdown                                             */
/* ------------------------------------------------------------------ */

interface RoadSelectorProps {
  label: string;
  roads: Road[];
  value: number | null;
  onChange: (id: number) => void;
}

function RoadSelector({ label, roads, value, onChange }: RoadSelectorProps) {
  const [open, setOpen] = useState(false);

  const selected = roads.find((r) => r.id === value);

  return (
    <div className="relative">
      <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-slate-900/60 border border-border/40 text-xs text-left transition-colors hover:border-cyan-700/50"
      >
        {selected ? (
          <span className="flex items-center gap-2 truncate">
            <Route className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-medium text-slate-100 truncate">{selected.name}</span>
          </span>
        ) : (
          <span className="text-slate-500 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 shrink-0" />
            Select a road...
          </span>
        )}
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
            className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-xl bg-slate-900/95 backdrop-blur-xl border border-border/60 shadow-2xl"
          >
            {roads.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onChange(r.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-slate-800/80 ${
                  r.id === value ? 'bg-cyan-950/40 text-cyan-300' : 'text-slate-300'
                }`}
              >
                <Route className="w-3 h-3 shrink-0" />
                <span className="truncate">{r.name}</span>
                <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                  {r.lengthKm} km
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat row for side-by-side                                          */
/* ------------------------------------------------------------------ */

interface StatRowProps {
  label: string;
  left: string;
  right: string;
  leftColor?: string;
  rightColor?: string;
  winner?: 'left' | 'right' | 'tie';
  icon?: React.ReactNode;
}

function StatRow({ label, left, right, leftColor, rightColor, winner, icon }: StatRowProps) {
  const leftCls = leftColor ?? (winner === 'left' ? 'text-emerald-400' : winner === 'right' ? 'text-red-400' : 'text-slate-100');
  const rightCls = rightColor ?? (winner === 'right' ? 'text-emerald-400' : winner === 'left' ? 'text-red-400' : 'text-slate-100');

  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center py-2 border-b border-border/10 last:border-0">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
        {icon}
        {label}
      </div>
      <span className={`text-xs font-bold text-right ${leftCls}`}>{left}</span>
      <span className={`text-xs font-bold text-right ${rightCls} min-w-[80px]`}>{right}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function BudgetComparisonView({
  roads,
  roadIds,
  projects,
  contractors,
  complaints,
}: BudgetComparisonViewProps) {
  const [roadIdA, setRoadIdA] = useState<number | null>(roadIds?.[0] ?? null);
  const [roadIdB, setRoadIdB] = useState<number | null>(roadIds?.[1] ?? null);
  const [showFundingDetail, setShowFundingDetail] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  /* ---- derive road objects ---- */
  const roadA = useMemo(() => roads.find((r) => r.id === roadIdA) ?? null, [roads, roadIdA]);
  const roadB = useMemo(() => roads.find((r) => r.id === roadIdB) ?? null, [roads, roadIdB]);

  /* ---- derive transparency data ---- */
  const dataA = useMemo(
    () => (roadA ? calculateRoadTransparency(roadA, projects, contractors, complaints) : null),
    [roadA, projects, contractors, complaints],
  );
  const dataB = useMemo(
    () => (roadB ? calculateRoadTransparency(roadB, projects, contractors, complaints) : null),
    [roadB, projects, contractors, complaints],
  );

  /* ---- handle print ---- */
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  /* ---- derive per-km costs ---- */
  const perKmAllocatedA = roadA && dataA ? dataA.totalSanctioned / roadA.lengthKm : 0;
  const perKmSpentA = roadA && dataA ? dataA.totalSpent / roadA.lengthKm : 0;
  const perKmAllocatedB = roadB && dataB ? dataB.totalSanctioned / roadB.lengthKm : 0;
  const perKmSpentB = roadB && dataB ? dataB.totalSpent / roadB.lengthKm : 0;

  /* ---- delay days ---- */
  const delayDaysA = useMemo(
    () =>
      projects
        .filter((p) => p.roadId === roadIdA)
        .reduce((s, p) => s + p.delayDays, 0),
    [projects, roadIdA],
  );
  const delayDaysB = useMemo(
    () =>
      projects
        .filter((p) => p.roadId === roadIdB)
        .reduce((s, p) => s + p.delayDays, 0),
    [projects, roadIdB],
  );

  /* ---- spending rate ---- */
  const spendRateA = dataA && dataA.totalSanctioned > 0 ? dataA.totalSpent / dataA.totalSanctioned : 0;
  const spendRateB = dataB && dataB.totalSanctioned > 0 ? dataB.totalSpent / dataB.totalSanctioned : 0;

  /* ---- all fund sources (union of both) ---- */
  const allFundSources = useMemo(() => {
    const set = new Set<string>();
    dataA?.fundSources?.forEach((fs) => set.add(fs.source));
    dataB?.fundSources?.forEach((fs) => set.add(fs.source));
    return Array.from(set);
  }, [dataA, dataB]);

  /* ---- max fund source amount for bar scaling ---- */
  const maxFundAmount = useMemo(() => {
    let m = 0;
    dataA?.fundSources?.forEach((fs) => { if (fs.amount > m) m = fs.amount; });
    dataB?.fundSources?.forEach((fs) => { if (fs.amount > m) m = fs.amount; });
    return m || 1;
  }, [dataA, dataB]);

  /* ---- contractor sets ---- */
  const contractorNamesA = dataA?.contractorSpendingBreakdown ?? [];
  const contractorNamesB = dataB?.contractorSpendingBreakdown ?? [];

  /* ---- combined contractor list for comparison ---- */
  const allContractorIds = useMemo(() => {
    const ids = new Set<number>();
    contractorNamesA.forEach((c) => ids.add(c.contractorId));
    contractorNamesB.forEach((c) => ids.add(c.contractorId));
    return Array.from(ids);
  }, [contractorNamesA, contractorNamesB]);

  /* ---- both selected guard ---- */
  const bothReady = roadA && roadB && dataA && dataB;

  /* ---- grades ---- */
  const gradeA = dataA ? getScoreGrade(dataA.transparencyScore) : null;
  const gradeB = dataB ? getScoreGrade(dataB.transparencyScore) : null;

  /* ---- score comparison winner ---- */
  const scoreWinner: 'left' | 'right' | 'tie' | null =
    bothReady
      ? dataA.transparencyScore > dataB.transparencyScore
        ? 'left'
        : dataA.transparencyScore < dataB.transparencyScore
          ? 'right'
          : 'tie'
      : null;

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div ref={printRef} className="space-y-5">
      {/* ---- Header + Print button ---- */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Budget Comparison
          </h2>
        </div>
        {bothReady && (
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-border/40 text-[10px] font-bold text-slate-300 uppercase tracking-wider hover:bg-slate-700/80 transition-colors print:hidden"
          >
            <Printer className="w-3.5 h-3.5" />
            Export PDF
          </button>
        )}
      </div>

      {/* ---- Road selectors ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RoadSelector
          label="Road A"
          roads={roads}
          value={roadIdA}
          onChange={setRoadIdA}
        />
        <RoadSelector
          label="Road B"
          roads={roads}
          value={roadIdB}
          onChange={setRoadIdB}
        />
      </div>

      {/* ---- Empty state ---- */}
      {!bothReady && (
        <EmptyState
          type="unselected"
          title="Select two roads to compare"
          description="Use the dropdowns above to pick two roads for a side-by-side budget comparison."
        />
      )}

      {/* ---- Comparison cards ---- */}
      {bothReady && (
        <>
          {/* ============================================================ */}
          {/*  OVERVIEW METRICS                                            */}
          {/* ============================================================ */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Overview
              </span>
              <div className="flex items-center gap-3 text-[10px] font-bold">
                <span className="text-cyan-300">{roadA!.name}</span>
                <span className="text-slate-600">vs</span>
                <span className="text-cyan-300">{roadB!.name}</span>
              </div>
            </div>

            <div className="space-y-0">
              <StatRow
                label="Total Sanctioned"
                left={formatINR(dataA!.totalSanctioned)}
                right={formatINR(dataB!.totalSanctioned)}
                winner={
                  dataA!.totalSanctioned > dataB!.totalSanctioned ? 'left' : 'right'
                }
                icon={<Coins className="w-3.5 h-3.5 text-amber-400/70" />}
              />
              <StatRow
                label="Total Spent"
                left={formatINR(dataA!.totalSpent)}
                right={formatINR(dataB!.totalSpent)}
                winner={
                  dataA!.totalSpent > dataB!.totalSpent ? 'left' : 'right'
                }
                icon={<TrendingUp className="w-3.5 h-3.5 text-cyan-400/70" />}
              />
              <StatRow
                label="Spend Rate"
                left={`${(spendRateA * 100).toFixed(1)}%`}
                right={`${(spendRateB * 100).toFixed(1)}%`}
                winner={
                  Math.abs(spendRateA - 1) < Math.abs(spendRateB - 1)
                    ? 'left'
                    : Math.abs(spendRateA - 1) > Math.abs(spendRateB - 1)
                      ? 'right'
                      : 'tie'
                }
                icon={<Gauge className="w-3.5 h-3.5 text-emerald-400/70" />}
              />
              <StatRow
                label="Sanctioned / km"
                left={formatINR(perKmAllocatedA)}
                right={formatINR(perKmAllocatedB)}
                winner={
                  perKmAllocatedA > perKmAllocatedB ? 'left' : 'right'
                }
                icon={<Route className="w-3.5 h-3.5 text-slate-400/70" />}
              />
              <StatRow
                label="Spent / km"
                left={formatINR(perKmSpentA)}
                right={formatINR(perKmSpentB)}
                winner={
                  perKmSpentA > perKmSpentB ? 'left' : 'right'
                }
                icon={<Route className="w-3.5 h-3.5 text-slate-400/70" />}
              />
              <StatRow
                label="Total Delay"
                left={`${delayDaysA} days`}
                right={`${delayDaysB} days`}
                winner={
                  delayDaysA < delayDaysB ? 'left' : delayDaysA > delayDaysB ? 'right' : 'tie'
                }
                icon={<CalendarClock className="w-3.5 h-3.5 text-red-400/70" />}
              />
              <StatRow
                label="Transparency Score"
                left={`${dataA!.transparencyScore}/100`}
                right={`${dataB!.transparencyScore}/100`}
                leftColor={gradeA?.color}
                rightColor={gradeB?.color}
                winner={scoreWinner ?? 'tie'}
                icon={<ShieldCheck className="w-3.5 h-3.5 text-purple-400/70" />}
              />
            </div>
          </Card>

          {/* ============================================================ */}
          {/*  FUNDING SOURCE BREAKDOWN (side-by-side bar chart)           */}
          {/* ============================================================ */}
          <Card className="p-4">
            <button
              type="button"
              onClick={() => setShowFundingDetail((p) => !p)}
              className="flex items-center gap-2 mb-4 w-full text-left"
            >
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex-1">
                Funding Source Breakdown
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                  showFundingDetail ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {showFundingDetail && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {/* Column headers */}
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 mb-3 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Source</span>
                    <span className="text-right">{roadA!.name}</span>
                    <span className="text-right">{roadB!.name}</span>
                  </div>

                  <div className="space-y-3">
                    {allFundSources.map((source) => {
                      const a = dataA?.fundSources?.find((f) => f.source === source);
                      const b = dataB?.fundSources?.find((f) => f.source === source);
                      const aAmt = a?.amount ?? 0;
                      const bAmt = b?.amount ?? 0;
                      const color = FUND_SOURCE_COLORS[source] ?? '#64748b';

                      return (
                        <div key={source} className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            {fundSourceIcon(source)}
                            <span className="text-[10px] font-medium text-slate-300 truncate">
                              {source}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-muted-foreground w-5 shrink-0">A</span>
                              <div className="flex-1 h-2.5 rounded-full bg-slate-800/60 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{
                                    width: `${maxFundAmount > 0 ? (aAmt / maxFundAmount) * 100 : 0}%`,
                                  }}
                                  transition={{ duration: 0.5, ease: 'easeOut' }}
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: color, opacity: aAmt > 0 ? 0.85 : 0.15 }}
                                />
                              </div>
                              <span className="text-[9px] font-bold text-slate-300 w-16 text-right">
                                {formatINR(aAmt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-muted-foreground w-5 shrink-0">B</span>
                              <div className="flex-1 h-2.5 rounded-full bg-slate-800/60 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{
                                    width: `${maxFundAmount > 0 ? (bAmt / maxFundAmount) * 100 : 0}%`,
                                  }}
                                  transition={{ duration: 0.5, ease: 'easeOut' }}
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: color, opacity: bAmt > 0 ? 0.85 : 0.15 }}
                                />
                              </div>
                              <span className="text-[9px] font-bold text-slate-300 w-16 text-right">
                                {formatINR(bAmt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* ============================================================ */}
          {/*  CONTRACTOR COMPARISON                                       */}
          {/* ============================================================ */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Contractor Comparison
              </span>
            </div>

            {allContractorIds.length === 0 ? (
              <div className="text-center py-4 text-[11px] text-muted-foreground">
                No contractor data available for either road.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/20">
                  <span>Contractor</span>
                  <span className="text-right">A</span>
                  <span className="text-right">B</span>
                  <span className="text-right">Diff</span>
                </div>
                {allContractorIds.map((cid) => {
                  const cA = contractorNamesA.find((c) => c.contractorId === cid);
                  const cB = contractorNamesB.find((c) => c.contractorId === cid);
                  const aVal = cA?.totalReceived ?? 0;
                  const bVal = cB?.totalReceived ?? 0;
                  const diff = aVal - bVal;
                  const diffStr = diff >= 0 ? `+${formatINR(diff)}` : formatINR(diff);
                  const diffColor = diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-slate-500';

                  // Find contractor name from the breakdown or from the full list
                  const name = cA?.contractorName ?? cB?.contractorName ?? `Contractor #${cid}`;

                  return (
                    <div
                      key={cid}
                      className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center py-1.5 border-b border-border/5 last:border-0"
                    >
                      <span className="text-[11px] text-slate-300 truncate">{name}</span>
                      <span className={`text-[11px] font-bold text-right ${aVal > 0 ? 'text-slate-100' : 'text-slate-600'}`}>
                        {aVal > 0 ? formatINR(aVal) : '--'}
                      </span>
                      <span className={`text-[11px] font-bold text-right ${bVal > 0 ? 'text-slate-100' : 'text-slate-600'}`}>
                        {bVal > 0 ? formatINR(bVal) : '--'}
                      </span>
                      <span className={`text-[10px] font-bold text-right ${diffColor}`}>
                        {diffStr}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* ============================================================ */}
          {/*  DELAY & TRANSPARENCY SCORE SIDE-BY-SIDE                     */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Delay */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarClock className="w-4 h-4 text-red-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Delay Days
                </span>
              </div>
              <div className="flex items-center justify-center gap-6 py-3">
                <div className="text-center">
                  <div className="text-[9px] text-muted-foreground mb-1">{roadA!.name}</div>
                  <div
                    className={`text-2xl font-black ${
                      delayDaysA > 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {delayDaysA}
                  </div>
                  <div className="text-[10px] text-muted-foreground">days</div>
                </div>
                <div className="text-lg font-bold text-slate-600">vs</div>
                <div className="text-center">
                  <div className="text-[9px] text-muted-foreground mb-1">{roadB!.name}</div>
                  <div
                    className={`text-2xl font-black ${
                      delayDaysB > 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {delayDaysB}
                  </div>
                  <div className="text-[10px] text-muted-foreground">days</div>
                </div>
              </div>
              {delayDaysA > 0 || delayDaysB > 0 ? (
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-amber-400">
                  <AlertTriangle className="w-3 h-3" />
                  <span>
                    {delayDaysA > delayDaysB
                      ? `${roadA!.name} has ${delayDaysA - delayDaysB} more delay days`
                      : delayDaysB > delayDaysA
                        ? `${roadB!.name} has ${delayDaysB - delayDaysA} more delay days`
                        : 'Both roads have the same delay count'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>No delays recorded for either road</span>
                </div>
              )}
            </Card>

            {/* Transparency Score */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Transparency Score
                </span>
              </div>
              <div className="flex items-center justify-center gap-6 py-3">
                <div className="text-center">
                  <div className="text-[9px] text-muted-foreground mb-1">{roadA!.name}</div>
                  <div className={`text-2xl font-black ${gradeA?.color ?? 'text-slate-100'}`}>
                    {dataA!.transparencyScore}
                  </div>
                  <div
                    className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-black ${
                      gradeA?.bg ?? ''
                    } ${gradeA?.color ?? ''}`}
                  >
                    {gradeA?.grade ?? '--'}
                  </div>
                </div>
                <div className="text-lg font-bold text-slate-600">vs</div>
                <div className="text-center">
                  <div className="text-[9px] text-muted-foreground mb-1">{roadB!.name}</div>
                  <div className={`text-2xl font-black ${gradeB?.color ?? 'text-slate-100'}`}>
                    {dataB!.transparencyScore}
                  </div>
                  <div
                    className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-black ${
                      gradeB?.bg ?? ''
                    } ${gradeB?.color ?? ''}`}
                  >
                    {gradeB?.grade ?? '--'}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                {scoreWinner === 'left' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">{roadA!.name} scores higher</span>
                  </>
                ) : scoreWinner === 'right' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">{roadB!.name} scores higher</span>
                  </>
                ) : (
                  <span className="text-slate-500">Tied score</span>
                )}
              </div>
            </Card>
          </div>

          {/* ============================================================ */}
          {/*  YEARLY ALLOCATION CHART (pure CSS)                          */}
          {/* ============================================================ */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Yearly Allocation Trend
              </span>
            </div>

            <div className="space-y-4">
              {dataA!.yearlyAllocations.map((ya) => {
                const yb = dataB!.yearlyAllocations.find((y) => y.year === ya.year);
                const maxYear = Math.max(
                  ya.sanctioned,
                  ya.spent,
                  yb?.sanctioned ?? 0,
                  yb?.spent ?? 0,
                  1,
                );

                return (
                  <div key={ya.year} className="space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-400">{ya.year}</div>

                    {/* Road A */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                        <span className="w-4 shrink-0 text-cyan-400">A</span>
                        <span className="w-12 shrink-0">Sanctioned</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-800/60 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(ya.sanctioned / maxYear) * 100}%`,
                            }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: '#10b981', opacity: 0.7 }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-slate-300 w-16 text-right">
                          {formatINR(ya.sanctioned)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                        <span className="w-4 shrink-0 text-cyan-400">A</span>
                        <span className="w-12 shrink-0">Spent</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-800/60 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(ya.spent / maxYear) * 100}%`,
                            }}
                            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: '#06b6d4', opacity: 0.7 }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-slate-300 w-16 text-right">
                          {formatINR(ya.spent)}
                        </span>
                      </div>
                    </div>

                    {/* Road B */}
                    {yb && (
                      <div className="space-y-0.5 pl-6 border-l border-border/20 ml-2">
                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                          <span className="w-4 shrink-0 text-purple-400">B</span>
                          <span className="w-12 shrink-0">Sanctioned</span>
                          <div className="flex-1 h-2 rounded-full bg-slate-800/60 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(yb.sanctioned / maxYear) * 100}%`,
                              }}
                              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: '#10b981', opacity: 0.45 }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-slate-300 w-16 text-right">
                            {formatINR(yb.sanctioned)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                          <span className="w-4 shrink-0 text-purple-400">B</span>
                          <span className="w-12 shrink-0">Spent</span>
                          <div className="flex-1 h-2 rounded-full bg-slate-800/60 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(yb.spent / maxYear) * 100}%`,
                              }}
                              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: '#06b6d4', opacity: 0.45 }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-slate-300 w-16 text-right">
                            {formatINR(yb.spent)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ============================================================ */}
          {/*  ANOMALIES / DEDUCTIONS COMPARISON                           */}
          {/* ============================================================ */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Anomalies & Score Deductions
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Road A */}
              <div>
                <div className="text-[10px] font-bold text-cyan-300 mb-2">{roadA!.name}</div>
                {dataA!.anomalies.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    No anomalies detected
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {dataA!.anomalies.slice(0, 5).map((a) => (
                      <li
                        key={a.id}
                        className="text-[10px] text-slate-300 flex items-start gap-1.5"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                            a.severity === 'high'
                              ? 'bg-red-500'
                              : a.severity === 'medium'
                                ? 'bg-amber-500'
                                : 'bg-slate-500'
                          }`}
                        />
                        <span className="truncate">{a.description}</span>
                      </li>
                    ))}
                    {dataA!.anomalies.length > 5 && (
                      <li className="text-[9px] text-muted-foreground">
                        +{dataA!.anomalies.length - 5} more
                      </li>
                    )}
                  </ul>
                )}
                <div className="mt-2 text-[9px] text-muted-foreground">
                  {dataA!.scoreDeductions.length} deduction{dataA!.scoreDeductions.length !== 1 ? 's' : ''} applied
                </div>
              </div>

              {/* Road B */}
              <div>
                <div className="text-[10px] font-bold text-purple-300 mb-2">{roadB!.name}</div>
                {dataB!.anomalies.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    No anomalies detected
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {dataB!.anomalies.slice(0, 5).map((a) => (
                      <li
                        key={a.id}
                        className="text-[10px] text-slate-300 flex items-start gap-1.5"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                            a.severity === 'high'
                              ? 'bg-red-500'
                              : a.severity === 'medium'
                                ? 'bg-amber-500'
                                : 'bg-slate-500'
                          }`}
                        />
                        <span className="truncate">{a.description}</span>
                      </li>
                    ))}
                    {dataB!.anomalies.length > 5 && (
                      <li className="text-[9px] text-muted-foreground">
                        +{dataB!.anomalies.length - 5} more
                      </li>
                    )}
                  </ul>
                )}
                <div className="mt-2 text-[9px] text-muted-foreground">
                  {dataB!.scoreDeductions.length} deduction{dataB!.scoreDeductions.length !== 1 ? 's' : ''} applied
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* ---- Print-only styles ---- */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}