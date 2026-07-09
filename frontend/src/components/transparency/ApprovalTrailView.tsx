'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ApprovalRecord, ApprovalStatus } from '@/types';
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
  Filter,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  History,
  Sparkles,
} from 'lucide-react';

interface ApprovalTrailViewProps {
  approvals: ApprovalRecord[];
}

const ENTITY_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'variance', label: 'Variance' },
  { value: 'contingency', label: 'Contingency' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'project', label: 'Project' },
] as const;

const ENTITY_TYPE_LABELS: Record<string, string> = {
  variance: 'Variance',
  contingency: 'Contingency',
  milestone: 'Milestone',
  project: 'Project',
};

function getStatusMeta(status: ApprovalStatus) {
  switch (status) {
    case 'approved':
      return {
        icon: <CheckCircle2 className="w-4 h-4" />,
        label: 'Approved',
        color: 'text-emerald-400',
        bg: 'bg-emerald-950/30 border-emerald-800/40',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-700/40',
        timelineDot: 'bg-emerald-500 ring-4 ring-emerald-900/30',
      };
    case 'rejected':
      return {
        icon: <XCircle className="w-4 h-4" />,
        label: 'Rejected',
        color: 'text-red-400',
        bg: 'bg-red-950/30 border-red-800/40',
        badgeBg: 'bg-red-500/20 text-red-300 border-red-700/40',
        timelineDot: 'bg-red-500 ring-4 ring-red-900/30',
      };
    case 'pending':
      return {
        icon: <Clock className="w-4 h-4" />,
        label: 'Pending',
        color: 'text-amber-400',
        bg: 'bg-amber-950/30 border-amber-800/40',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-700/40',
        timelineDot: 'bg-amber-500 ring-4 ring-amber-900/30',
      };
    default:
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        label: 'Unknown',
        color: 'text-slate-400',
        bg: 'bg-slate-950/30 border-slate-800/40',
        badgeBg: 'bg-slate-500/20 text-slate-300 border-slate-700/40',
        timelineDot: 'bg-slate-500 ring-4 ring-slate-900/30',
      };
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ApprovalTrailView({ approvals }: ApprovalTrailViewProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Derive aggregate stats
  const stats = useMemo(() => {
    const total = approvals.length;
    const approved = approvals.filter((a) => a.status === 'approved').length;
    const rejected = approvals.filter((a) => a.status === 'rejected').length;
    const pending = approvals.filter((a) => a.status === 'pending').length;
    return { total, approved, rejected, pending };
  }, [approvals]);

  // Filter + sort by createdAt descending
  const filtered = useMemo(() => {
    let list =
      filterType === 'all'
        ? [...approvals]
        : approvals.filter((a) => a.entityType === filterType);
    list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return list;
  }, [approvals, filterType]);

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const emptyState = filtered.length === 0;

  return (
    <div className="glass-panel rounded-xl border border-border/60 bg-slate-950/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/40 flex items-center gap-2">
        <History className="w-4 h-4 text-cyan-400" />
        <h4 className="text-[10px] text-slate-200 uppercase font-black tracking-widest">
          Approval Trail
        </h4>
        <span className="text-[9px] text-muted-foreground bg-slate-900 border border-border/40 px-2 py-0.5 rounded-full font-bold">
          {stats.total} record{stats.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Aggregate Summary */}
      {stats.total > 0 && (
        <div className="mx-4 mt-4 grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-0.5" />
            <span className="text-[11px] font-extrabold text-emerald-300 block">
              {stats.approved}
            </span>
            <span className="text-[7px] text-muted-foreground uppercase font-black tracking-wider">
              Approved
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-900/30 text-center">
            <XCircle className="w-3.5 h-3.5 text-red-400 mx-auto mb-0.5" />
            <span className="text-[11px] font-extrabold text-red-300 block">
              {stats.rejected}
            </span>
            <span className="text-[7px] text-muted-foreground uppercase font-black tracking-wider">
              Rejected
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/30 text-center">
            <Clock className="w-3.5 h-3.5 text-amber-400 mx-auto mb-0.5" />
            <span className="text-[11px] font-extrabold text-amber-300 block">
              {stats.pending}
            </span>
            <span className="text-[7px] text-muted-foreground uppercase font-black tracking-wider">
              Pending
            </span>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <Filter className="w-3 h-3 text-slate-500 shrink-0" />
          <div className="flex flex-wrap gap-1.5">
            {ENTITY_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterType(opt.value)}
                className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all ${
                  filterType === opt.value
                    ? 'bg-cyan-950/40 border-cyan-700/50 text-cyan-300'
                    : 'bg-slate-900/40 border-border/40 text-muted-foreground hover:text-slate-300 hover:border-slate-600/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4">
        {emptyState ? (
          <div className="flex items-center justify-center border border-dashed border-border/40 rounded-xl p-8 text-xs text-muted-foreground">
            {filterType === 'all'
              ? 'No approval records available.'
              : `No ${ENTITY_TYPE_LABELS[filterType]?.toLowerCase() ?? filterType} approval records found.`}
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-slate-700/60 via-slate-700/40 to-slate-700/20 rounded-full" />

            <div className="space-y-0">
              {filtered.map((record, idx) => {
                const meta = getStatusMeta(record.status);
                const isExpanded = expandedId === record.id;
                const isLast = idx === filtered.length - 1;

                return (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.03 }}
                    className="relative pl-8 pb-4"
                  >
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-0 top-1.5 w-[22px] h-[22px] rounded-full flex items-center justify-center z-10 ${meta.timelineDot}`}
                    >
                      <div className="w-2 h-2 rounded-full bg-current opacity-80" />
                    </div>

                    {/* Card */}
                    <div
                      className={`rounded-lg border p-3 transition-all hover:border-slate-700/60 cursor-pointer ${
                        record.status === 'approved'
                          ? 'bg-emerald-950/10 border-emerald-900/25'
                          : record.status === 'rejected'
                            ? 'bg-red-950/10 border-red-900/25'
                            : 'bg-amber-950/10 border-amber-900/25'
                      }`}
                      onClick={() => toggleExpand(record.id)}
                    >
                      {/* Top row: entity type badge + status badge + action */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Entity type badge */}
                          <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-900/60 border border-border/40 px-1.5 py-0.5 rounded shrink-0">
                            {ENTITY_TYPE_LABELS[record.entityType] ?? record.entityType}
                          </span>
                          {/* Action text */}
                          <span className="text-[10px] font-bold text-slate-200 truncate">
                            {record.action}
                          </span>
                        </div>

                        {/* Status badge */}
                        <span
                          className={`text-[8px] font-extrabold uppercase flex items-center gap-1 px-1.5 py-0.5 rounded border shrink-0 ${meta.badgeBg}`}
                        >
                          {meta.icon}
                          {meta.label}
                        </span>
                      </div>

                      {/* People row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-muted-foreground">
                        {record.requestedBy && (
                          <span className="flex items-center gap-1">
                            <User className="w-2.5 h-2.5 text-slate-500" />
                            <span className="font-medium text-slate-400">
                              Requested by{' '}
                              <span className="text-slate-300">{record.requestedBy}</span>
                            </span>
                          </span>
                        )}
                        {record.approvedBy && (
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-2.5 h-2.5 text-slate-500" />
                            <span className="font-medium text-slate-400">
                              {record.status === 'approved' ? 'Approved' : 'Reviewed'} by{' '}
                              <span className="text-slate-300">{record.approvedBy}</span>
                            </span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 ml-auto">
                          <Calendar className="w-2.5 h-2.5 text-slate-500" />
                          <span className="font-medium text-slate-500">
                            {record.approvedAt
                              ? formatDateTime(record.approvedAt)
                              : formatDateTime(record.createdAt)}
                          </span>
                        </span>
                      </div>

                      {/* Expandable Comments */}
                      <AnimatePresence initial={false}>
                        {isExpanded && record.comments && (
                          <motion.div
                            key="comments"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2.5 pt-2.5 border-t border-border/20">
                              <div className="flex gap-2">
                                <MessageSquare className="w-3 h-3 text-cyan-500 mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-[8px] text-muted-foreground uppercase font-black tracking-wider block mb-0.5">
                                    Comments
                                  </span>
                                  <p className="text-[10px] text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">
                                    {record.comments}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Expand/collapse indicator */}
                      <div className="flex items-center justify-center mt-1.5">
                        {record.comments ? (
                          <span className="text-[8px] text-muted-foreground/60 font-medium flex items-center gap-0.5">
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-2.5 h-2.5" /> Hide comments
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-2.5 h-2.5" /> Show comments
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="text-[8px] text-muted-foreground/30 font-medium">
                            No comments
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* "Request Approval" Button */}
      <div className="px-4 pb-4">
        <button
          onClick={() => {
            // UI-only: no backend call
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-cyan-700/40 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-950/40 hover:border-cyan-600/60 transition-all text-[10px] font-extrabold uppercase tracking-wider"
        >
          <Send className="w-3.5 h-3.5" />
          Request Approval
        </button>
        <p className="text-[7px] text-muted-foreground/50 text-center mt-1.5 font-medium">
          Submit a new approval request for variance, contingency, milestone, or project changes.
        </p>
      </div>
    </div>
  );
}