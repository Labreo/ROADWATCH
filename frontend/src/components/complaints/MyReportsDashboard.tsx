'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FilePlus,
  Filter,
  HardHat,
  Inbox,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  SortAsc,
  SortDesc,
  X
} from 'lucide-react';
import type { Complaint, ComplaintCategory, ComplaintStatus } from '@/types';
import ComplaintCard, { ageLabel, CATEGORY_META, STATUS_BADGE } from './ComplaintCard';

// ─── Tab config ──────────────────────────────────────────────────────────────

type TabKey = 'all' | ComplaintStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'routed', label: 'Routed' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'rejected', label: 'Rejected' },
];

const CATEGORY_OPTIONS: { key: ComplaintCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All Categories' },
  { key: 'pothole', label: 'Pothole' },
  { key: 'paving_defect', label: 'Paving Defect' },
  { key: 'waterlogging', label: 'Waterlogging' },
  { key: 'debris', label: 'Debris' },
  { key: 'missing_signage', label: 'Missing Signage' },
];

// ─── Props ───────────────────────────────────────────────────────────────────

export interface MyReportsDashboardProps {
  complaints: Complaint[];
  /** Called when user clicks "View Full Details" on a card */
  onViewComplaint?: (id: number) => void;
  /** Called when user clicks "File New Complaint" */
  onFileNew?: () => void;
  /** True while initial data is loading */
  isLoading?: boolean;
}

// ─── Status summary card ─────────────────────────────────────────────────────

function StatusSummaryBar({ complaints }: { complaints: Complaint[] }) {
  const counts = useMemo(() => {
    const map: Record<ComplaintStatus | 'all', number> = {
      all: complaints.length,
      pending: 0,
      routed: 0,
      in_progress: 0,
      resolved: 0,
      rejected: 0,
    };
    for (const c of complaints) {
      map[c.status] = (map[c.status] ?? 0) + 1;
    }
    return map;
  }, [complaints]);

  const items: { key: ComplaintStatus; icon: typeof Clock; color: string }[] = [
    { key: 'pending', icon: Clock, color: 'text-slate-400' },
    { key: 'routed', icon: MapPin, color: 'text-cyan-400' },
    { key: 'in_progress', icon: HardHat, color: 'text-indigo-400' },
    { key: 'resolved', icon: CheckCircle2, color: 'text-emerald-400' },
    { key: 'rejected', icon: AlertTriangle, color: 'text-red-400' },
  ];

  return (
    <div className="grid grid-cols-5 gap-2">
      {items.map(({ key, icon: Icon, color }) => (
        <div
          key={key}
          className="flex flex-col items-center justify-center gap-1 rounded-lg border border-slate-800/60 bg-slate-950/60 p-2.5"
        >
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className={`text-[10px] font-black ${color}`}>
            {counts[key]}
          </span>
          <span className="text-[7px] uppercase tracking-wider text-slate-500 font-mono">
            {STATUS_BADGE[key].label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({
  hasActiveFilters,
  onClearFilters,
}: {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="w-14 h-14 rounded-2xl border border-slate-800 bg-slate-950/80 flex items-center justify-center mb-4">
        <Inbox className="w-6 h-6 text-slate-600" />
      </div>
      <h3 className="text-sm font-bold text-slate-300 mb-1">
        {hasActiveFilters ? 'No matching reports' : 'No reports yet'}
      </h3>
      <p className="text-[10px] text-slate-500 max-w-[240px] leading-relaxed mb-4">
        {hasActiveFilters
          ? 'Try adjusting your filters or category selection to find what you are looking for.'
          : 'Your submitted road defect reports will appear here once you file your first complaint.'}
      </p>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/30 border border-cyan-800/40 rounded-lg py-2 px-4 hover:bg-cyan-950/50 hover:border-cyan-700/60 transition-colors"
        >
          <X className="w-3 h-3" />
          Clear Filters
        </button>
      )}
    </motion.div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-slate-800/60 bg-slate-950/60 p-3.5 space-y-2.5"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-800/60" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 w-3/5 rounded bg-slate-800/60" />
              <div className="h-2 w-1/4 rounded bg-slate-800/40" />
            </div>
            <div className="h-4 w-16 rounded bg-slate-800/60" />
          </div>
          <div className="h-2.5 w-full rounded bg-slate-800/40" />
          <div className="h-2.5 w-4/5 rounded bg-slate-800/40" />
          <div className="flex gap-3">
            <div className="h-2 w-12 rounded bg-slate-800/30" />
            <div className="h-2 w-16 rounded bg-slate-800/30" />
            <div className="h-2 w-14 rounded bg-slate-800/30" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function MyReportsDashboard({
  complaints,
  onViewComplaint,
  onFileNew,
  isLoading = false,
}: MyReportsDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [categoryFilter, setCategoryFilter] = useState<ComplaintCategory | 'all'>('all');
  const [sortNewest, setSortNewest] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // ── Derived: filtered + sorted complaint list ──────────────────────────
  const visibleComplaints = useMemo(() => {
    let list = [...complaints];

    // Tab filter (status)
    if (activeTab !== 'all') {
      list = list.filter((c) => c.status === activeTab);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      list = list.filter((c) => c.category === categoryFilter);
    }

    // Sort by created date
    list.sort((a, b) => {
      const d = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortNewest ? -d : d;
    });

    return list;
  }, [complaints, activeTab, categoryFilter, sortNewest]);

  const hasActiveFilters = activeTab !== 'all' || categoryFilter !== 'all';

  const clearFilters = useCallback(() => {
    setActiveTab('all');
    setCategoryFilter('all');
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-black text-slate-200 uppercase tracking-wider">
            My Reports
          </h2>
          <p className="text-[9px] text-slate-500 font-mono mt-0.5">
            {complaints.length} total
          </p>
        </div>

        {onFileNew && (
          <button
            type="button"
            onClick={onFileNew}
            className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 rounded-lg py-2 px-3.5 hover:bg-emerald-950/50 hover:border-emerald-700/60 transition-colors"
          >
            <FilePlus className="w-3.5 h-3.5" />
            File New
          </button>
        )}
      </div>

      {/* ── Status summary ──────────────────────────────────────────────── */}
      {!isLoading && complaints.length > 0 && (
        <div className="mb-3">
          <StatusSummaryBar complaints={complaints} />
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-0.5 scrollbar-none">
        {TABS.map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`shrink-0 text-[8.5px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-colors ${
                isActive
                  ? 'bg-cyan-950/40 border-cyan-800 text-cyan-400'
                  : 'bg-slate-950/60 border-slate-800/60 text-slate-500 hover:text-slate-300 hover:border-slate-700/60'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3">
        {/* Category filter */}
        <div className="relative flex-1">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as ComplaintCategory | 'all')}
            className="w-full appearance-none bg-slate-950/80 border border-slate-800/60 rounded-lg text-[9px] font-mono text-slate-400 py-1.5 pl-7 pr-7 focus:outline-none focus:border-cyan-700/60 transition-colors cursor-pointer"
            aria-label="Filter by category"
          >
            {CATEGORY_OPTIONS.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <SlidersHorizontal className="w-2.5 h-2.5 text-slate-600" />
          </div>
        </div>

        {/* Sort toggle */}
        <button
          type="button"
          onClick={() => setSortNewest((p) => !p)}
          className="flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-wider text-slate-500 bg-slate-950/80 border border-slate-800/60 rounded-lg px-2.5 py-1.5 hover:text-slate-300 hover:border-slate-700/60 transition-colors shrink-0"
          aria-label={sortNewest ? 'Sorted by newest first' : 'Sorted by oldest first'}
        >
          {sortNewest ? (
            <SortDesc className="w-3 h-3" />
          ) : (
            <SortAsc className="w-3 h-3" />
          )}
          <span>{sortNewest ? 'Newest' : 'Oldest'}</span>
        </button>
      </div>

      {/* ── Complaints list ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
        {isLoading ? (
          <LoadingSkeleton />
        ) : visibleComplaints.length === 0 ? (
          <EmptyState hasActiveFilters={hasActiveFilters} onClearFilters={clearFilters} />
        ) : (
          <AnimatePresence mode="popLayout">
            {visibleComplaints.map((complaint) => (
              <motion.div
                key={complaint.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
              >
                <ComplaintCard
                  complaint={complaint}
                  onLink={onViewComplaint}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}