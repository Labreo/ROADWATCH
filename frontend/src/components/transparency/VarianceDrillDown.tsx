'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BudgetVariance } from '@/types';
import { formatINR } from '@/services/transparencyEngine';
import {
  ChevronDown,
  ChevronUp,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  User,
  Calendar,
  FileText,
  ExternalLink,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

type SortField = 'varianceAmount' | 'originalBudget' | 'revisedBudget' | 'variancePct' | 'approvalDate';
type SortDir = 'asc' | 'desc';

interface VarianceDrillDownProps {
  variances: BudgetVariance[];
}

export default function VarianceDrillDown({ variances }: VarianceDrillDownProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('varianceAmount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-600" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-cyan-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-cyan-400" />
    );
  };

  const filteredAndSorted = useMemo(() => {
    let list = [...variances];

    // Search filter by project name (we don't have project name on the type, so use reason/id)
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.reason.toLowerCase().includes(q) ||
          v.approvedBy?.toLowerCase().includes(q) ||
          String(v.projectId).includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'varianceAmount':
          cmp = a.varianceAmount - b.varianceAmount;
          break;
        case 'originalBudget':
          cmp = (a.originalBudget ?? 0) - (b.originalBudget ?? 0);
          break;
        case 'revisedBudget':
          cmp = (a.revisedBudget ?? 0) - (b.revisedBudget ?? 0);
          break;
        case 'variancePct':
          cmp = (a.variancePct ?? 0) - (b.variancePct ?? 0);
          break;
        case 'approvalDate':
          cmp = (a.approvalDate ?? '').localeCompare(b.approvalDate ?? '');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [variances, search, sortField, sortDir]);

  // Summary totals (visible rows only)
  const summaryTotals = useMemo(() => {
    return filteredAndSorted.reduce(
      (acc, v) => ({
        original: acc.original + (v.originalBudget ?? 0),
        revised: acc.revised + (v.revisedBudget ?? 0),
      }),
      { original: 0, revised: 0 }
    );
  }, [filteredAndSorted]);

  const isOver = summaryTotals.revised > summaryTotals.original;
  const totalVariancePct =
    summaryTotals.original > 0
      ? ((summaryTotals.revised - summaryTotals.original) / summaryTotals.original) * 100
      : 0;

  if (variances.length === 0) {
    return (
      <div className="glass-panel p-5 rounded-xl border border-border/60 bg-slate-950/10">
        <div className="flex items-center justify-center border border-dashed border-border/40 rounded-xl p-8 text-xs text-muted-foreground">
          No budget variance records available.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-xl border border-border/60 bg-slate-950/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <h4 className="text-[10px] text-slate-200 uppercase font-black tracking-widest">
            Budget Variance Drill-Down
          </h4>
          <span className="text-[9px] text-muted-foreground bg-slate-900 border border-border/40 px-2 py-0.5 rounded-full font-bold">
            {filteredAndSorted.length} record{filteredAndSorted.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reason, project, or approver..."
            className="w-full bg-slate-900/60 border border-border/40 rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-800/60 transition-colors font-medium"
          />
        </div>
      </div>

      {/* Summary Bar */}
      <div className="mx-4 mt-4 p-3 rounded-lg bg-slate-900/40 border border-border/30 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="text-center">
          <span className="text-[8px] text-muted-foreground uppercase font-black tracking-wider block">
            Total Original Budget
          </span>
          <span className="text-xs font-extrabold text-emerald-400">
            {formatINR(summaryTotals.original)}
          </span>
        </div>
        <div className="text-center">
          <span className="text-[8px] text-muted-foreground uppercase font-black tracking-wider block">
            Total Revised Budget
          </span>
          <span className={`text-xs font-extrabold ${isOver ? 'text-red-400' : 'text-cyan-400'}`}>
            {formatINR(summaryTotals.revised)}
          </span>
        </div>
        <div className="text-center">
          <span className="text-[8px] text-muted-foreground uppercase font-black tracking-wider block">
            Net Variance
          </span>
          <span
            className={`text-xs font-extrabold flex items-center justify-center gap-1 ${
              isOver ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {isOver ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {totalVariancePct >= 0 ? '+' : ''}
            {totalVariancePct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mt-3">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-border/30 text-muted-foreground">
              <th className="text-left py-2.5 px-4 font-black uppercase tracking-wider">
                Project
              </th>
              <th
                className="text-right py-2.5 px-3 font-black uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none"
                onClick={() => handleSort('originalBudget')}
              >
                <span className="inline-flex items-center gap-1">
                  Original Budget {getSortIcon('originalBudget')}
                </span>
              </th>
              <th
                className="text-right py-2.5 px-3 font-black uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none"
                onClick={() => handleSort('revisedBudget')}
              >
                <span className="inline-flex items-center gap-1">
                  Revised Budget {getSortIcon('revisedBudget')}
                </span>
              </th>
              <th
                className="text-right py-2.5 px-3 font-black uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none"
                onClick={() => handleSort('variancePct')}
              >
                <span className="inline-flex items-center gap-1">
                  Variance % {getSortIcon('variancePct')}
                </span>
              </th>
              <th className="text-left py-2.5 px-3 font-black uppercase tracking-wider max-w-[200px]">
                Reason
              </th>
              <th className="text-left py-2.5 px-3 font-black uppercase tracking-wider">
                Approved By
              </th>
              <th
                className="text-left py-2.5 px-4 font-black uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none"
                onClick={() => handleSort('approvalDate')}
              >
                <span className="inline-flex items-center gap-1">
                  Date {getSortIcon('approvalDate')}
                </span>
              </th>
              <th className="text-right py-2.5 px-3 font-black uppercase tracking-wider">
                Variance Amount
              </th>
              <th className="w-8 py-2.5 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((variance) => {
              const isExpanded = expandedId === variance.id;
              const isOverBudget = variance.varianceAmount > 0;
              const absVariancePct = variance.variancePct != null ? Math.abs(variance.variancePct) : 0;
              const severityClass =
                isOverBudget
                  ? absVariancePct > 15
                    ? 'text-red-400 bg-red-950/30'
                    : absVariancePct > 5
                      ? 'text-amber-400 bg-amber-950/30'
                      : 'text-slate-400 bg-slate-900/30'
                  : 'text-emerald-400 bg-emerald-950/30';

              return (
                <React.Fragment key={variance.id}>
                  <tr
                    className={`border-b border-border/20 hover:bg-slate-900/30 transition-colors cursor-pointer ${
                      isExpanded ? 'bg-slate-900/40' : ''
                    }`}
                    onClick={() => setExpandedId(isExpanded ? null : variance.id)}
                  >
                    <td className="py-2.5 px-4">
                      <span className="font-bold text-slate-300">
                        Project #{variance.projectId}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-300">
                      {formatINR(variance.originalBudget)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      {variance.revisedBudget != null ? (
                        <span className={isOverBudget ? 'text-red-400' : 'text-emerald-400'}>
                          {formatINR(variance.revisedBudget)}
                        </span>
                      ) : (
                        <span className="text-slate-600">--</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {variance.variancePct != null ? (
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold ${severityClass}`}
                        >
                          {isOverBudget ? (
                            <TrendingUp className="w-2.5 h-2.5" />
                          ) : (
                            <TrendingDown className="w-2.5 h-2.5" />
                          )}
                          {isOverBudget ? '+' : ''}
                          {variance.variancePct.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-600">--</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 max-w-[200px]">
                      <p className="truncate text-slate-400 font-medium">
                        {variance.reason}
                      </p>
                    </td>
                    <td className="py-2.5 px-3">
                      {variance.approvedBy ? (
                        <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                          <User className="w-3 h-3 text-slate-500" />
                          {variance.approvedBy}
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {variance.approvalDate ? (
                        <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {new Date(variance.approvalDate).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">Pending</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-extrabold ${
                          isOverBudget ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {isOverBudget ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {isOverBudget ? '+' : ''}
                        {formatINR(variance.varianceAmount)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-500 inline-block" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-600 inline-block" />
                      )}
                    </td>
                  </tr>

                  {/* Expandable row */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.tr
                        key={`expanded-${variance.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <td colSpan={9} className="p-0">
                          <motion.div
                            initial={{ paddingTop: 0, paddingBottom: 0 }}
                            animate={{ paddingTop: 12, paddingBottom: 12 }}
                            exit={{ paddingTop: 0, paddingBottom: 0 }}
                            className="bg-slate-900/50 border-b border-border/20"
                          >
                            <div className="px-4 space-y-3">
                              {/* Full reason text */}
                              <div className="flex gap-2">
                                <FileText className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-[8px] text-muted-foreground uppercase font-black tracking-wider block mb-0.5">
                                    Reason Details
                                  </span>
                                  <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                                    {variance.reason}
                                  </p>
                                </div>
                              </div>

                              {/* Approval document link */}
                              {variance.approvalDocumentUrl && (
                                <div className="flex items-center gap-2">
                                  <ExternalLink className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                                  <a
                                    href={variance.approvalDocumentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-cyan-400 font-bold underline hover:text-cyan-300 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    View Approval Document
                                  </a>
                                </div>
                              )}

                              {/* Financial breakdown */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/20">
                                <div>
                                  <span className="text-[8px] text-muted-foreground uppercase font-black tracking-wider block">
                                    Original
                                  </span>
                                  <span className="text-[10px] font-extrabold text-emerald-400">
                                    {formatINR(variance.originalBudget)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-muted-foreground uppercase font-black tracking-wider block">
                                    Revised
                                  </span>
                                  <span
                                    className={`text-[10px] font-extrabold ${
                                      isOverBudget ? 'text-red-400' : 'text-emerald-400'
                                    }`}
                                  >
                                    {variance.revisedBudget != null
                                      ? formatINR(variance.revisedBudget)
                                      : '--'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-muted-foreground uppercase font-black tracking-wider block">
                                    Variance
                                  </span>
                                  <span
                                    className={`text-[10px] font-extrabold ${
                                      isOverBudget ? 'text-red-400' : 'text-emerald-400'
                                    }`}
                                  >
                                    {isOverBudget ? '+' : ''}
                                    {formatINR(variance.varianceAmount)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-muted-foreground uppercase font-black tracking-wider block">
                                    Variance %
                                  </span>
                                  <span
                                    className={`text-[10px] font-extrabold ${
                                      isOverBudget ? 'text-red-400' : 'text-emerald-400'
                                    }`}
                                  >
                                    {variance.variancePct != null
                                      ? `${isOverBudget ? '+' : ''}${variance.variancePct.toFixed(2)}%`
                                      : '--'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty search state */}
      {filteredAndSorted.length === 0 && (
        <div className="p-8 text-center">
          <Search className="w-5 h-5 text-slate-600 mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground font-medium">
            No variance records match your search.
          </p>
          <button
            onClick={() => setSearch('')}
            className="mt-2 text-[9px] text-cyan-400 font-bold hover:text-cyan-300 transition-colors underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/30 flex justify-between items-center text-[9px] text-muted-foreground">
        <span className="font-medium">
          Showing {filteredAndSorted.length} of {variances.length} records
        </span>
        <span className="font-medium">
          Overspend items: {filteredAndSorted.filter((v) => v.varianceAmount > 0).length}
        </span>
      </div>
    </div>
  );
}