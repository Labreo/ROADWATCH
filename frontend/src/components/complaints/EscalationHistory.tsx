'use client';

import { useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  ChevronUp,
  CheckCircle2,
  UserCheck,
  ShieldAlert,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { Complaint, EscalationLevel } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EscalationHistoryProps {
  /** The complaint whose escalation history to render */
  complaint: Pick<
    Complaint,
    | 'id'
    | 'escalationLevel'
    | 'slaBreachedAt'
    | 'lastEscalatedAt'
    | 'createdAt'
    | 'status'
    | 'targetResolutionHours'
  >;
}

export interface EscalationEvent {
  level: number; // 0 | 1 | 2 | 99 (terminal)
  label: string;
  description: string;
  /** Icon component for the event */
  icon: React.ComponentType<{ className?: string }>;
  /** ISO timestamp when this escalation level was reached */
  timestamp: string | null;
  /** Whether this event is in the past (settled) */
  settled: boolean;
  /** Whether this is the current active level */
  active: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format an ISO string to a locale-friendly display */
function formatTimestamp(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Build a deterministic array of escalation events from a complaint object.
 *
 * Escalation timeline:
 *  - Level 0: always starts at createdAt
 *  - Level 1: lastEscalatedAt if escalationLevel >= 1; otherwise computed
 *  - Level 2: slaBreachedAt if escalationLevel >= 2; otherwise computed
 *  - Breach / resolution: separate terminal events
 */
function buildEvents(complaint: EscalationHistoryProps['complaint']): EscalationEvent[] {
  const currentLevel = (complaint.escalationLevel ?? 0) as EscalationLevel;
  const isResolved = complaint.status === 'resolved';
  const isBreached = currentLevel >= 2 || !!complaint.slaBreachedAt;

  const events: EscalationEvent[] = [];

  // Level 0 — always present
  events.push({
    level: 0,
    label: 'Assigned Engineer',
    description: 'Defect logged and assigned to field engineer for initial inspection and action.',
    icon: UserCheck,
    timestamp: complaint.createdAt,
    settled: true,
    active: currentLevel === 0 && !isResolved,
  });

  // Level 1 — present if escalated
  if (currentLevel >= 1) {
    const l1Timestamp = complaint.lastEscalatedAt
      ? complaint.lastEscalatedAt
      : complaint.createdAt; // fallback
    events.push({
      level: 1,
      label: 'Executive Engineer',
      description: 'Escalated to section-level executive engineer for review and resource allocation.',
      icon: ShieldAlert,
      timestamp: l1Timestamp,
      settled: currentLevel > 1 || isResolved,
      active: currentLevel === 1 && !isResolved,
    });
  }

  // Level 2 — present if escalated to commissioner level
  if (currentLevel >= 2) {
    const l2Timestamp = complaint.slaBreachedAt
      ? complaint.slaBreachedAt
      : complaint.lastEscalatedAt
        ? complaint.lastEscalatedAt
        : complaint.createdAt;
    events.push({
      level: 2,
      label: 'Municipal Commissioner',
      description: 'Escalated to department-head level. SLA breach protocol active.',
      icon: Building2,
      timestamp: l2Timestamp,
      settled: isResolved,
      active: currentLevel === 2 && !isResolved,
    });
  }

  // Breach event (if not already resolved)
  if (isBreached && !isResolved) {
    events.push({
      level: 2,
      label: 'SLA Breach',
      description: 'Complaint exceeded target resolution SLA. Immediate escalation required.',
      icon: AlertTriangle,
      timestamp: complaint.slaBreachedAt ?? null,
      settled: false,
      active: false,
    });
  }

  // Resolution event
  if (isResolved) {
    events.push({
      level: 99,
      label: 'Resolved',
      description: 'Defect rectified and verified. Escalation chain closed.',
      icon: CheckCircle2,
      timestamp: null, // no field on Complaint for resolution time
      settled: true,
      active: false,
    });
  }

  return events;
}

// ---------------------------------------------------------------------------
// Level colour tokens
// ---------------------------------------------------------------------------

const LEVEL_COLORS: Record<
  EscalationLevel | 99,
  {
    dot: string;
    line: string;
    border: string;
    background: string;
    text: string;
    icon: string;
  }
> = {
  0: {
    dot: 'border-emerald-500/50 bg-emerald-950/40',
    line: 'bg-emerald-500/30',
    border: 'border-emerald-500/20',
    background: 'bg-emerald-950/10',
    text: 'text-emerald-400',
    icon: 'text-emerald-400',
  },
  1: {
    dot: 'border-amber-500/50 bg-amber-950/40',
    line: 'bg-amber-500/30',
    border: 'border-amber-500/20',
    background: 'bg-amber-950/10',
    text: 'text-amber-400',
    icon: 'text-amber-400',
  },
  2: {
    dot: 'border-rose-500/50 bg-rose-950/40',
    line: 'bg-rose-500/30',
    border: 'border-rose-500/20',
    background: 'bg-rose-950/10',
    text: 'text-rose-400',
    icon: 'text-rose-400',
  },
  99: {
    // resolution / terminal
    dot: 'border-sky-500/50 bg-sky-950/40',
    line: 'bg-sky-500/30',
    border: 'border-sky-500/20',
    background: 'bg-sky-950/10',
    text: 'text-sky-400',
    icon: 'text-sky-400',
  },
};

/** Get colour tokens for a given escalation level or terminal event */
function colorForLevel(level: number): (typeof LEVEL_COLORS)[0] {
  if (level === 0) return LEVEL_COLORS[0];
  if (level === 1) return LEVEL_COLORS[1];
  if (level === 2) return LEVEL_COLORS[2];
  return LEVEL_COLORS[99];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EscalationHistory({
  complaint,
}: EscalationHistoryProps) {
  const events = useMemo(() => buildEvents(complaint), [complaint]);

  return (
    <div className="rounded-xl border border-border/60 bg-slate-900/30 p-5 space-y-4">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-slate-400" />
        <span className="mono-label text-[9px] tracking-wider text-slate-400 font-black uppercase">
          Escalation History
        </span>
        {events.length > 0 && (
          <span className="text-[8px] font-mono text-slate-600 ml-auto">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ─── Empty state ─────────────────────────────────────────── */}
      {events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-slate-600">
          <Clock className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-[10px] font-medium">No escalation events recorded</p>
          <p className="text-[8px] mt-1">Escalation history will appear as the complaint progresses.</p>
        </div>
      )}

      {/* ─── Timeline ────────────────────────────────────────────── */}
      {events.length > 0 && (
        <div className="relative pl-5 space-y-0">
          {/* Vertical connecting line */}
          <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-800" />

          {events.map((event, idx) => {
            const colors =
              event.level === 99
                ? LEVEL_COLORS[99]
                : colorForLevel(event.level);
            const Icon = event.icon;

            return (
              <div
                key={`${event.level}-${event.label}-${idx}`}
                className="relative pb-6 last:pb-0"
              >
                {/* ── Dot ─────────────────────────────────────────── */}
                <span
                  className={`absolute -left-[17px] top-0 w-3.5 h-3.5 rounded-full border-2 ${colors.dot} flex items-center justify-center ${
                    event.active
                      ? 'ring-2 ring-offset-2 ring-offset-slate-950 ring-white/20'
                      : ''
                  }`}
                />

                {/* ── Card ────────────────────────────────────────── */}
                <div
                  className={`rounded-lg border p-3 space-y-1.5 transition-all ${
                    event.active
                      ? `${colors.border} ${colors.background}`
                      : event.settled
                        ? 'border-slate-800 bg-slate-950/30'
                        : 'border-slate-800 bg-slate-950/20'
                  }`}
                >
                  {/* Title row */}
                  <div className="flex items-center gap-1.5">
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        event.active
                          ? colors.icon
                          : event.settled
                            ? 'text-slate-500'
                            : 'text-slate-600'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider ${
                        event.active
                          ? colors.text
                          : event.settled
                            ? 'text-slate-300'
                            : 'text-slate-500'
                      }`}
                    >
                      {event.label}
                    </span>

                    {/* Level badge */}
                    {event.level <= 2 && (
                      <span
                        className={`text-[7px] font-black px-1 py-0.5 rounded border ${
                          event.active
                            ? `${colors.border} ${colors.text}`
                            : 'border-slate-800 text-slate-600'
                        }`}
                      >
                        L{event.level}
                      </span>
                    )}

                    {/* Active indicator */}
                    {event.active && (
                      <span className="ml-auto flex items-center gap-1 text-[7px] font-black uppercase tracking-wider text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p
                    className={`text-[9px] leading-relaxed ${
                      event.settled ? 'text-slate-500' : 'text-slate-600'
                    }`}
                  >
                    {event.description}
                  </p>

                  {/* Timestamp */}
                  {event.timestamp && (
                    <span className="text-[8px] font-mono text-slate-600 block">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  )}

                  {/* Arrow connector to next event (except last) */}
                  {idx < events.length - 1 && (
                    <div className="flex justify-center pt-1">
                      <ArrowRight className="w-3 h-3 text-slate-700" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Summary footer ──────────────────────────────────────── */}
      {events.length > 0 && (
        <div className="border-t border-border/30 pt-3 mt-1 flex items-center justify-between text-[8px] text-slate-600 font-mono">
          <span>
            Created: {formatTimestamp(complaint.createdAt)}
          </span>
          {complaint.lastEscalatedAt && (
            <span>
              Last escalated: {formatTimestamp(complaint.lastEscalatedAt)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}