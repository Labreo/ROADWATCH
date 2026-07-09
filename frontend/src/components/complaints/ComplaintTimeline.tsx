'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardHat,
  MapPin,
  Sparkles,
  UserCheck
} from 'lucide-react';
import type { Complaint, ComplaintStatus } from '@/types';
import { getAuthority } from '@/data/mockData';

// ─── Step config ─────────────────────────────────────────────────────────────

interface StepDef {
  key: string;
  label: string;
  verb: string;
  icon: typeof Clock;
  /** Which complaint statuses count this step as "done" */
  doneStatuses: ComplaintStatus[];
  /** Which complaint statuses count this step as "active" (pulsing) */
  activeStatuses: ComplaintStatus[];
  description: (c: Complaint) => string;
  timestamp: (c: Complaint) => string | null;
}

const STEPS: StepDef[] = [
  {
    key: 'submitted',
    label: 'Submitted',
    verb: 'Defect Log Submitted',
    icon: CheckCircle2,
    doneStatuses: ['pending', 'routed', 'in_progress', 'resolved', 'rejected'],
    activeStatuses: [],
    description: () => 'Your report has been registered in the system. A tracking ID has been assigned.',
    timestamp: (c) => c.createdAt,
  },
  {
    key: 'routed',
    label: 'Routed',
    verb: 'Jurisdiction Routed',
    icon: MapPin,
    doneStatuses: ['routed', 'in_progress', 'resolved', 'rejected'],
    activeStatuses: ['pending'],
    description: (c) => {
      const authority = getAuthority(c.assignedAuthorityId);
      const name = authority?.name ?? `Authority #${c.assignedAuthorityId}`;
      return `Assigned to ${name} for processing.`;
    },
    timestamp: (c) => {
      // For pending, no timestamp yet; for others, use createdAt (real data would use routedAt)
      if (c.status === 'pending') return null;
      return c.createdAt;
    },
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    verb: 'Work Commenced',
    icon: HardHat,
    doneStatuses: ['in_progress', 'resolved'],
    activeStatuses: ['routed', 'pending'],
    description: (c) => {
      if (c.status === 'in_progress' || c.status === 'resolved') {
        const name = getAuthority(c.assignedAuthorityId)?.name ?? `Authority #${c.assignedAuthorityId}`;
        return `Work order issued. ${name} has commenced repair operations.`;
      }
      return 'Awaiting assignment and scheduling by the responsible authority.';
    },
    timestamp: (c) => {
      if (c.status === 'in_progress' || c.status === 'resolved') {
        // Offset by 1 day from created as approximation; real data would have startedAt
        const d = new Date(c.createdAt);
        d.setDate(d.getDate() + 1);
        return d.toISOString();
      }
      return null;
    },
  },
  {
    key: 'terminal',
    label: 'Terminal',
    verb: '',
    icon: CheckCircle2,
    doneStatuses: ['resolved', 'rejected'],
    activeStatuses: ['pending', 'routed', 'in_progress'],
    description: (c) => {
      if (c.status === 'resolved') {
        return 'Defect has been rectified and verified. The road is safe for use.';
      }
      if (c.status === 'rejected') {
        return 'The authority has reviewed and rejected this report. Possible duplicate or out-of-jurisdiction issue.';
      }
      return 'SLA target pending — awaiting authority action.';
    },
    timestamp: (c) => {
      if (c.status === 'resolved' || c.status === 'rejected') {
        // Offset by 3 days from created as approximation
        const d = new Date(c.createdAt);
        d.setDate(d.getDate() + 3);
        return d.toISOString();
      }
      return null;
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Step node colors ────────────────────────────────────────────────────────

const STEP_COLORS = {
  done: {
    line: 'bg-emerald-500/40',
    dot: 'border-emerald-500/40 bg-emerald-950',
    icon: 'text-emerald-400',
    label: 'text-slate-200',
    time: 'text-slate-500',
  },
  active: {
    line: 'bg-indigo-500/30',
    dot: 'border-indigo-500/50 bg-indigo-950',
    icon: 'text-indigo-400',
    label: 'text-indigo-300',
    time: 'text-slate-500',
  },
  pending: {
    line: 'bg-slate-800',
    dot: 'border-slate-700 bg-slate-950',
    icon: 'text-slate-600',
    label: 'text-slate-500',
    time: 'text-slate-600',
  },
  rejected: {
    line: 'bg-red-500/40',
    dot: 'border-red-500/40 bg-red-950',
    icon: 'text-red-400',
    label: 'text-red-400',
    time: 'text-slate-500',
  },
};

function stepState(
  step: StepDef,
  status: ComplaintStatus,
): 'done' | 'active' | 'pending' | 'rejected' {
  if (status === 'rejected') {
    // For rejected complaints, the "submitted" and "routed" steps are done, "terminal" is rejected
    if (step.key === 'terminal') return 'rejected';
    if (step.doneStatuses.includes(status)) return 'done';
    return 'pending';
  }
  if (step.doneStatuses.includes(status)) return 'done';
  if (step.activeStatuses.includes(status)) return 'active';
  return 'pending';
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ComplaintTimelineProps {
  complaint: Complaint;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ComplaintTimeline({ complaint }: ComplaintTimelineProps) {
  const { status, createdAt } = complaint;

  const authorityName = useMemo(() => {
    const a = getAuthority(complaint.assignedAuthorityId);
    return a?.name ?? `Authority #${complaint.assignedAuthorityId}`;
  }, [complaint.assignedAuthorityId]);

  const isRejected = status === 'rejected';
  const isResolved = status === 'resolved';

  return (
    <div className="space-y-4">
      {/* Overview card */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-slate-800/60 bg-slate-950/60 p-3.5 space-y-2"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[8px] font-black uppercase text-slate-300 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded tracking-wider">
                {complaint.category.replace(/_/g, ' ')}
              </span>
              {(complaint.priority ?? 3) >= 4 && (
                <span className="text-[8px] font-black uppercase text-rose-400 border border-rose-800 bg-rose-950/40 px-1.5 py-0.5 rounded">
                  P{complaint.priority ?? 3}
                </span>
              )}
            </div>
            <h4 className="text-[11px] font-extrabold text-slate-200 leading-tight truncate">
              {complaint.title}
            </h4>
          </div>

          {/* Terminal badge */}
          {isResolved && (
            <span className="shrink-0 text-[8px] font-black uppercase border border-emerald-800 bg-emerald-950/40 text-emerald-400 px-1.5 py-0.5 rounded">
              Resolved
            </span>
          )}
          {isRejected && (
            <span className="shrink-0 text-[8px] font-black uppercase border border-red-800 bg-red-950/40 text-red-400 px-1.5 py-0.5 rounded">
              Rejected
            </span>
          )}
        </div>

        <div className="text-[9px] text-slate-400 leading-relaxed line-clamp-2">
          {complaint.description}
        </div>

        <div className="flex items-center gap-3 text-[8px] text-slate-500 font-mono border-t border-slate-800/40 pt-2">
          <span>
            #{complaint.clientTempId || `RW-2026-${complaint.id}`}
          </span>
          <span>Responsible: {authorityName}</span>
        </div>
      </motion.div>

      {/* ── Vertical timeline ─────────────────────────────────────────────── */}
      <div className="relative pl-6 space-y-0">
        {/* Vertical line — extends the full height */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-800" />

        {STEPS.map((step, idx) => {
          const state = stepState(step, status);
          const colors = STEP_COLORS[state as keyof typeof STEP_COLORS] ?? STEP_COLORS.pending;
          const Icon = step.icon;

          // For the terminal step, swap icon based on rejection
          const DisplayIcon =
            step.key === 'terminal' && isRejected ? AlertTriangle : Icon;

          const ts = step.timestamp(complaint);
          const desc = step.description(complaint);
          const isLast = idx === STEPS.length - 1;

          return (
            <div key={step.key} className="relative pb-5 last:pb-0">
              {/* Dot */}
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: idx * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
                className={`absolute -left-[21px] top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  state === 'active' ? 'animate-pulse shadow-lg shadow-indigo-500/20' : ''
                } ${colors.dot} ${colors.icon}`}
              >
                <DisplayIcon className="w-3 h-3" />
              </motion.span>

              {/* Content */}
              <div className="space-y-0.5">
                <h5
                  className={`text-[10px] font-extrabold uppercase tracking-wider ${
                    step.key === 'terminal' && isRejected ? 'text-red-400' : colors.label
                  }`}
                >
                  {step.key === 'terminal'
                    ? isResolved
                      ? 'Defect Rectified and Verified'
                      : isRejected
                        ? 'Report Rejected'
                        : 'SLA Target Pending'
                    : step.verb}
                </h5>

                <p className="text-[9px] text-slate-400 leading-relaxed">
                  {desc}
                </p>

                {ts && (
                  <span className={`text-[8px] font-mono ${colors.time} block`}>
                    {formatDate(ts)}
                  </span>
                )}

                {state === 'active' && step.key !== 'terminal' && (
                  <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-indigo-400 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    In Progress
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Escalation info ────────────────────────────────────────────────── */}
      {complaint.escalationLevel != null && complaint.escalationLevel > 0 && (
        <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-2.5 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div className="text-[9px] text-slate-400">
            <span className="font-bold text-amber-400">
              Escalated (L{complaint.escalationLevel})
            </span>
            {complaint.lastEscalatedAt && (
              <span className="ml-2 font-mono text-slate-500">
                {formatDate(complaint.lastEscalatedAt)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── SLA breach ─────────────────────────────────────────────────────── */}
      {complaint.slaBreachedAt && (
        <div className="rounded-lg border border-red-800/40 bg-red-950/20 p-2.5 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <div className="text-[9px] text-slate-400">
            <span className="font-bold text-red-400">SLA Breached</span>
            <span className="ml-2 font-mono text-slate-500">
              {formatDate(complaint.slaBreachedAt)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}