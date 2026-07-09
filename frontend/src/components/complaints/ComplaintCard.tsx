'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Construction,
  Droplets,
  ExternalLink,
  HardHat,
  MapPin,
  Maximize2,
  Minimize2,
  ShieldAlert,
  Trash2,
  TriangleAlert
} from 'lucide-react';
import type { Complaint, ComplaintCategory, ComplaintStatus, EscalationLevel } from '@/types';

// ─── Category config ────────────────────────────────────────────────────────

const CATEGORY_META: Record<ComplaintCategory, { icon: typeof MapPin; label: string; color: string }> = {
  pothole: { icon: TriangleAlert, label: 'Pothole', color: 'text-amber-400' },
  paving_defect: { icon: Construction, label: 'Paving Defect', color: 'text-slate-400' },
  waterlogging: { icon: Droplets, label: 'Waterlogging', color: 'text-cyan-400' },
  debris: { icon: Trash2, label: 'Debris', color: 'text-orange-400' },
  missing_signage: { icon: MapPin, label: 'Missing Signage', color: 'text-rose-400' },
};

// ─── Status config ──────────────────────────────────────────────────────────

const STATUS_BADGE: Record<ComplaintStatus, { bg: string; border: string; text: string; label: string }> = {
  pending: {
    bg: 'bg-slate-900',
    border: 'border-slate-700',
    text: 'text-slate-400',
    label: 'Pending',
  },
  routed: {
    bg: 'bg-cyan-950/40',
    border: 'border-cyan-800',
    text: 'text-cyan-400',
    label: 'Routed',
  },
  in_progress: {
    bg: 'bg-indigo-950/40',
    border: 'border-indigo-800',
    text: 'text-indigo-400',
    label: 'In Progress',
  },
  resolved: {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-800',
    text: 'text-emerald-400',
    label: 'Resolved',
  },
  rejected: {
    bg: 'bg-red-950/40',
    border: 'border-red-800',
    text: 'text-red-400',
    label: 'Rejected',
  },
};

// ─── Escalation config ──────────────────────────────────────────────────────

const ESCALATION_LEVEL: Record<EscalationLevel, { icon: typeof ShieldAlert; label: string; color: string }> = {
  0: { icon: Clock, label: 'Normal', color: 'text-slate-500' },
  1: { icon: AlertTriangle, label: 'Escalated (L1)', color: 'text-amber-400' },
  2: { icon: ShieldAlert, label: 'Escalated (L2)', color: 'text-red-400' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function ageLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ComplaintCardProps {
  complaint: Complaint;
  /** Called when user clicks "View Full Details" — defaults to no-op */
  onLink?: (id: number) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ComplaintCard({ complaint, onLink }: ComplaintCardProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => setExpanded((p) => !p), []);

  const categoryMeta = CATEGORY_META[complaint.category];
  const statusBadge = STATUS_BADGE[complaint.status];
  const escalationMeta =
    complaint.escalationLevel != null && complaint.escalationLevel > 0
      ? ESCALATION_LEVEL[complaint.escalationLevel]
      : null;

  const CategoryIcon = categoryMeta.icon;
  const EscalationIcon = escalationMeta?.icon;

  // Only render escalation section when we have a valid escalation level and icon
  const showEscalation = escalationMeta != null && EscalationIcon != null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="group relative overflow-hidden rounded-xl border border-slate-800/60 bg-slate-950/60 backdrop-blur-md transition-all duration-200 hover:border-slate-700/60"
    >
      {/* Gradient accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700" />

      <div className="relative z-10 p-3.5 space-y-2.5">
        {/* ── Row 1: Category icon + Title + Status badge + Expand toggle ── */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border border-white/[0.06] ${categoryMeta.color} bg-slate-950/80`}
            >
              <CategoryIcon className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <h4 className="text-[11px] font-extrabold text-slate-200 leading-tight truncate">
                {complaint.title}
              </h4>
              <span className="text-[8px] text-slate-500 font-mono uppercase tracking-wider">
                {categoryMeta.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Status badge */}
            <span
              className={`text-[8px] font-black uppercase border px-1.5 py-0.5 rounded ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text}`}
            >
              {statusBadge.label}
            </span>

            {/* Expand button */}
            <button
              type="button"
              onClick={toggleExpanded}
              className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-900/80 border border-slate-800/60 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors"
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
            >
              {expanded ? (
                <Minimize2 className="w-3 h-3" />
              ) : (
                <Maximize2 className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* ── Row 2: Description (truncated) ── */}
        <p className="text-[9.5px] text-slate-400 leading-relaxed line-clamp-2">
          {complaint.description}
        </p>

        {/* ── Row 3: Meta bar ── */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[8.5px] text-slate-500 font-mono">
          {/* Age */}
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {ageLabel(complaint.createdAt)}
          </span>

          {/* Priority */}
          <span
            className={`flex items-center gap-1 ${
              (complaint.priority ?? 3) >= 4
                ? 'text-rose-400'
                : (complaint.priority ?? 3) >= 3
                  ? 'text-cyan-400'
                  : 'text-slate-500'
            }`}
          >
            <AlertTriangle className="w-2.5 h-2.5" />
            P{complaint.priority ?? 3}
          </span>

          {/* VIA ID */}
          <span className="truncate max-w-[120px]">
            #{complaint.clientTempId || `RW-2026-${complaint.id}`}
          </span>
        </div>

        {/* ── Expanded section: full details ── */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="expanded"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="pt-2 border-t border-slate-800/40 space-y-2.5">
                {/* Full description */}
                <p className="text-[9.5px] text-slate-400 leading-relaxed">
                  {complaint.description}
                </p>

                {/* Coordinates */}
                <div className="flex items-center gap-1.5 text-[8.5px] text-slate-500 font-mono">
                  <MapPin className="w-2.5 h-2.5 text-slate-600" />
                  <span>
                    {complaint.geometry.coordinates[1].toFixed(5)},{' '}
                    {complaint.geometry.coordinates[0].toFixed(5)}
                  </span>
                </div>

                {/* Created at */}
                <div className="flex items-center gap-1.5 text-[8.5px] text-slate-500 font-mono">
                  <Clock className="w-2.5 h-2.5 text-slate-600" />
                  <span>Created: {formatDate(complaint.createdAt)}</span>
                </div>

                {/* Escalation info */}
                {showEscalation && escalationMeta && EscalationIcon && (
                  <div
                    className={`flex items-center gap-1.5 text-[8.5px] font-medium ${escalationMeta.color} bg-slate-950/80 border border-current/20 rounded px-2 py-1`}
                  >
                    <EscalationIcon className="w-3 h-3" />
                    <span>{escalationMeta.label}</span>
                    {complaint.lastEscalatedAt && (
                      <span className="ml-auto text-slate-500 font-mono text-[8px]">
                        {formatDate(complaint.lastEscalatedAt)}
                      </span>
                    )}
                  </div>
                )}

                {/* SLA breach */}
                {complaint.slaBreachedAt && (
                  <div className="flex items-center gap-1.5 text-[8.5px] font-medium text-red-400 bg-red-950/20 border border-red-800/30 rounded px-2 py-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span>SLA Breached</span>
                    <span className="ml-auto font-mono text-[8px] text-red-400/70">
                      {formatDate(complaint.slaBreachedAt)}
                    </span>
                  </div>
                )}

                {/* Target resolution hours */}
                {complaint.targetResolutionHours && (
                  <div className="flex items-center gap-1.5 text-[8.5px] text-slate-500 font-mono">
                    <HardHat className="w-2.5 h-2.5 text-slate-600" />
                    <span>Resolution target: {complaint.targetResolutionHours}h</span>
                  </div>
                )}

                {/* Parent complaint link */}
                {complaint.parentComplaintId && (
                  <div className="flex items-center gap-1.5 text-[8.5px] text-cyan-400/80 font-medium">
                    <ExternalLink className="w-2.5 h-2.5" />
                    <span>Linked to parent complaint #{complaint.parentComplaintId}</span>
                  </div>
                )}

                {/* View Full Details button */}
                {onLink && (
                  <button
                    type="button"
                    onClick={() => onLink(complaint.id)}
                    className="w-full mt-1 flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/30 border border-cyan-800/40 rounded-lg py-2 hover:bg-cyan-950/50 hover:border-cyan-700/60 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Full Details
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Re-export helpers for external use ─────────────────────────────────────

export { ageLabel, formatDate, CATEGORY_META, STATUS_BADGE, ESCALATION_LEVEL };