'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContingencyReserve } from '@/types';
import { formatINR } from '@/services/transparencyEngine';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  Sparkles,
  CheckCircle2,
  Lock,
  Unlock,
  ExternalLink,
  Gauge,
  Clock,
  Ban,
} from 'lucide-react';

interface ContingencyReservesPanelProps {
  reserves: ContingencyReserve[];
}

export default function ContingencyReservesPanel({ reserves }: ContingencyReservesPanelProps) {
  const [tooltipId, setTooltipId] = useState<number | null>(null);

  if (reserves.length === 0) {
    return (
      <div className="glass-panel p-5 rounded-xl border border-border/60 bg-slate-950/10">
        <div className="flex items-center justify-center border border-dashed border-border/40 rounded-xl p-8 text-xs text-muted-foreground">
          No contingency reserve records available.
        </div>
      </div>
    );
  }

  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'available':
        return {
          icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
          label: 'Available',
          color: 'text-emerald-400',
          barColor: 'bg-emerald-500',
          bg: 'bg-emerald-950/20 border-emerald-900/30',
        };
      case 'partially_utilized':
        return {
          icon: <Gauge className="w-4 h-4 text-amber-400" />,
          label: 'Partially Utilized',
          color: 'text-amber-400',
          barColor: 'bg-amber-500',
          bg: 'bg-amber-950/20 border-amber-900/30',
        };
      case 'fully_utilized':
        return {
          icon: <ShieldAlert className="w-4 h-4 text-orange-400" />,
          label: 'Fully Utilized',
          color: 'text-orange-400',
          barColor: 'bg-orange-500',
          bg: 'bg-orange-950/20 border-orange-900/30',
        };
      case 'exhausted':
        return {
          icon: <Ban className="w-4 h-4 text-red-400" />,
          label: 'Exhausted',
          color: 'text-red-400',
          barColor: 'bg-red-500',
          bg: 'bg-red-950/20 border-red-900/30',
        };
      default:
        return {
          icon: <Info className="w-4 h-4 text-slate-400" />,
          label: 'Unknown',
          color: 'text-slate-400',
          barColor: 'bg-slate-500',
          bg: 'bg-slate-950/20 border-slate-800/30',
        };
    }
  };

  // Aggregate totals
  const totalAllocated = reserves.reduce((s, r) => s + r.allocatedAmount, 0);
  const totalUtilized = reserves.reduce((s, r) => s + r.utilizedAmount, 0);
  const totalUtilizationPct = totalAllocated > 0 ? (totalUtilized / totalAllocated) * 100 : 0;
  const aggregateStatus =
    totalUtilizationPct >= 100
      ? 'exhausted'
      : totalUtilizationPct >= 75
        ? 'fully_utilized'
        : totalUtilizationPct >= 25
          ? 'partially_utilized'
          : 'available';

  return (
    <div className="glass-panel rounded-xl border border-border/60 bg-slate-950/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/40 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-cyan-400" />
        <h4 className="text-[10px] text-slate-200 uppercase font-black tracking-widest">
          Contingency Reserve Status
        </h4>
        <span className="text-[9px] text-muted-foreground bg-slate-900 border border-border/40 px-2 py-0.5 rounded-full font-bold">
          {reserves.length} project{reserves.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Aggregate Summary Bar */}
      <div className="mx-4 mt-4 p-3 rounded-lg bg-slate-900/40 border border-border/30 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[8px] text-muted-foreground uppercase font-black tracking-wider">
            Aggregate Contingency Pool
          </span>
          <span
            className={`text-[9px] font-extrabold uppercase flex items-center gap-1 ${
              totalUtilizationPct >= 75 ? 'text-red-400' : totalUtilizationPct >= 25 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {totalUtilizationPct >= 100 ? (
              <Ban className="w-3 h-3" />
            ) : (
              <Gauge className="w-3 h-3" />
            )}
            {totalUtilizationPct.toFixed(1)}% utilized
          </span>
        </div>
        <div className="flex justify-between text-[10px] font-bold">
          <span className="text-emerald-400">{formatINR(totalUtilized)}</span>
          <span className="text-slate-400">of {formatINR(totalAllocated)}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-border/10">
          <motion.div
            className={`h-full rounded-full ${
              totalUtilizationPct >= 100
                ? 'bg-red-500'
                : totalUtilizationPct >= 75
                  ? 'bg-orange-500'
                  : totalUtilizationPct >= 25
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, totalUtilizationPct)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Project Cards */}
      <div className="p-4 space-y-3">
        {reserves.map((reserve) => {
          const meta = getStatusMeta(reserve.status);
          const utilizationPct =
            reserve.allocatedAmount > 0
              ? (reserve.utilizedAmount / reserve.allocatedAmount) * 100
              : 0;
          const remaining = reserve.allocatedAmount - reserve.utilizedAmount;
          const isExhausted = utilizationPct >= 100;
          const isCriticallyLow = utilizationPct >= 85 && !isExhausted;

          return (
            <div
              key={reserve.id}
              className={`rounded-lg border p-3.5 transition-all ${meta.bg} hover:border-slate-700/60`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  {meta.icon}
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold text-slate-200 block truncate">
                      Project #{reserve.projectId}
                    </span>
                    <span className={`text-[8px] font-black uppercase tracking-wider ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Approval Required Indicator */}
                  {reserve.approvalRequired && (
                    <div className="relative group">
                      <div className="flex items-center gap-1 text-[8px] font-extrabold uppercase text-amber-400 bg-amber-950/40 border border-amber-900/50 px-1.5 py-0.5 rounded">
                        <Lock className="w-2.5 h-2.5" />
                        Approval
                      </div>
                      <div className="absolute bottom-full right-0 mb-1.5 w-48 p-2 rounded bg-slate-900 border border-border shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <p className="text-[8px] text-slate-300 font-medium leading-relaxed">
                          Release requires authorized approval. Additional sign-off is needed to access these contingency funds.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Status indicator */}
                  {isExhausted && (
                    <span className="text-[8px] font-extrabold uppercase text-red-400 bg-red-950/40 border border-red-900/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Ban className="w-2.5 h-2.5" />
                      Exhausted
                    </span>
                  )}
                  {isCriticallyLow && !isExhausted && (
                    <span className="text-[8px] font-extrabold uppercase text-orange-400 bg-orange-950/40 border border-orange-900/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Critical
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 mb-2.5">
                <div className="flex justify-between text-[9px] font-bold">
                  <span className="text-muted-foreground">Utilization</span>
                  <span className={meta.color}>{utilizationPct.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900/80 overflow-hidden border border-border/10">
                  <motion.div
                    className={`h-full rounded-full ${meta.barColor}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, utilizationPct)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                  />
                </div>
              </div>

              {/* Amount breakdown */}
              <div className="grid grid-cols-3 gap-3 text-[9px]">
                <div>
                  <span className="text-muted-foreground uppercase font-black tracking-wider block text-[7px]">
                    Allocated
                  </span>
                  <span className="font-extrabold text-slate-200">
                    {formatINR(reserve.allocatedAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground uppercase font-black tracking-wider block text-[7px]">
                    Utilized
                  </span>
                  <span className="font-extrabold text-slate-200">
                    {formatINR(reserve.utilizedAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground uppercase font-black tracking-wider block text-[7px]">
                    Remaining
                  </span>
                  <span
                    className={`font-extrabold ${
                      remaining <= 0 ? 'text-red-400' : remaining < reserve.allocatedAmount * 0.15 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {formatINR(Math.max(0, remaining))}
                  </span>
                </div>
              </div>

              {/* Release Notes — tooltip trigger */}
              {reserve.releaseNotes && (
                <div className="mt-2.5 pt-2.5 border-t border-border/20 relative">
                  <button
                    onClick={() => setTooltipId(tooltipId === reserve.id ? null : reserve.id)}
                    className="flex items-center gap-1.5 text-[8px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider"
                  >
                    <Sparkles className="w-3 h-3" />
                    Release Notes
                    <Info className="w-2.5 h-2.5 text-slate-500" />
                  </button>

                  <AnimatePresence>
                    {tooltipId === reserve.id && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="mt-2 p-3 rounded-lg bg-slate-900 border border-border/60 shadow-xl"
                      >
                        <div className="flex gap-2">
                          <Sparkles className="w-3 h-3 text-cyan-500 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[8px] text-muted-foreground uppercase font-black tracking-wider block mb-0.5">
                              Release Notes
                            </span>
                            <p className="text-[10px] text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">
                              {reserve.releaseNotes}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/30 flex justify-between items-center text-[9px] text-muted-foreground">
        <span className="font-medium">
          Approval required: {reserves.filter((r) => r.approvalRequired).length} project
          {reserves.filter((r) => r.approvalRequired).length !== 1 ? 's' : ''}
        </span>
        <span className="font-medium">
          Exhausted: {reserves.filter((r) => r.status === 'exhausted').length}
        </span>
      </div>
    </div>
  );
}