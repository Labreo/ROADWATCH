'use client';

import { useEffect, useState, useMemo } from 'react';
import { Clock, AlertTriangle, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Complaint, EscalationLevel } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EscalationStatusProps {
  /** The complaint object whose escalation state to render */
  complaint: Pick<
    Complaint,
    | 'id'
    | 'escalationLevel'
    | 'slaBreachedAt'
    | 'targetResolutionHours'
    | 'lastEscalatedAt'
    | 'createdAt'
    | 'status'
  >;
  /** When true renders a compact card suitable for sidebars or overlays */
  compact?: boolean;
}

type StatusVariant = 'on_track' | 'at_risk' | 'breached';

interface EscalationStage {
  level: EscalationLevel;
  label: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ESCALATION_STAGES: EscalationStage[] = [
  {
    level: 0,
    label: 'Assigned Engineer',
    description: 'Field engineer assigned for inspection',
  },
  {
    level: 1,
    label: 'Executive Engineer',
    description: 'Section-level escalation for review',
  },
  {
    level: 2,
    label: 'Municipal Commissioner',
    description: 'Department-head level oversight',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute the status variant based on elapsed vs target hours */
function computeStatus(
  elapsedHours: number,
  targetHours: number,
  activeLevel: EscalationLevel,
  isBreachedField: boolean,
): StatusVariant {
  if (activeLevel >= 2 || isBreachedField) return 'breached';
  if (elapsedHours >= targetHours) return 'breached';
  const remaining = targetHours - elapsedHours;
  const remainingPct = remaining / targetHours;
  if (remainingPct < 0.25) return 'at_risk';
  return 'on_track';
}

/** Format hours into a human-readable "Xh Ym" string */
function formatHours(totalHours: number): string {
  if (totalHours < 0) return '0h 0m';
  const h = Math.floor(totalHours);
  const m = Math.round((totalHours - h) * 60);
  return `${h}h ${m}m`;
}

/** Format a remaining-time string with colour guidance */
function remainingLabel(remainingHours: number): string {
  if (remainingHours <= 0) return 'OVERDUE';
  if (remainingHours < 1) return `${Math.round(remainingHours * 60)}m remaining`;
  return `${remainingHours.toFixed(1)}h remaining`;
}

// ---------------------------------------------------------------------------
// Variant → colour tokens
// ---------------------------------------------------------------------------

const VARIANT_STYLES: Record<
  StatusVariant,
  {
    accent: string;
    background: string;
    border: string;
    progress: string;
    text: string;
    badge: string;
    glow: string;
  }
> = {
  on_track: {
    accent: 'text-emerald-400',
    background: 'bg-emerald-950/20',
    border: 'border-emerald-500/30',
    progress: 'bg-emerald-500',
    text: 'text-emerald-400',
    badge: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20',
    glow: 'shadow-[0_0_16px_-4px_rgba(52,211,153,0.12)]',
  },
  at_risk: {
    accent: 'text-amber-400',
    background: 'bg-amber-950/20',
    border: 'border-amber-500/30',
    progress: 'bg-amber-500',
    text: 'text-amber-400',
    badge: 'text-amber-400 border-amber-500/30 bg-amber-950/20',
    glow: 'shadow-[0_0_16px_-4px_rgba(251,191,36,0.15)]',
  },
  breached: {
    accent: 'text-rose-400',
    background: 'bg-rose-950/20',
    border: 'border-rose-500/40',
    progress: 'bg-rose-500',
    text: 'text-rose-400',
    badge: 'text-rose-400 border-rose-500/40 bg-rose-950/30',
    glow: 'shadow-[0_0_20px_-4px_rgba(244,63,94,0.2)]',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EscalationStatus({
  complaint,
  compact = false,
}: EscalationStatusProps) {
  // ── Derived state ──────────────────────────────────────────────────
  const currentLevel = (complaint.escalationLevel ?? 0) as EscalationLevel;
  const targetHours = complaint.targetResolutionHours ?? 48;
  const isBreachedField = !!complaint.slaBreachedAt;

  // ── Live elapsed counter ───────────────────────────────────────────
  const [elapsedHours, setElapsedHours] = useState(0);

  useEffect(() => {
    const created = new Date(complaint.createdAt).getTime();
    const tick = () => {
      setElapsedHours(Math.max(0, (Date.now() - created) / 3_600_000));
    };
    tick();
    const id = setInterval(tick, 30_000); // every 30 s
    return () => clearInterval(id);
  }, [complaint.createdAt]);

  // ── Derived values ─────────────────────────────────────────────────
  const status = useMemo(
    () => computeStatus(elapsedHours, targetHours, currentLevel, isBreachedField),
    [elapsedHours, targetHours, currentLevel, isBreachedField],
  );

  const remainingHours = Math.max(0, targetHours - elapsedHours);
  const progressPct = Math.min(100, (elapsedHours / targetHours) * 100);
  const styles = VARIANT_STYLES[status];

  // Next escalation level prediction
  const nextLevel = useMemo(() => {
    if (currentLevel >= 2) return null;
    return (currentLevel + 1) as EscalationLevel;
  }, [currentLevel]);

  const nextEscalationLabel = useMemo(() => {
    if (status === 'breached' || currentLevel >= 2) return 'Fully escalated';
    if (nextLevel === null) return null;
    const stage = ESCALATION_STAGES.find((s) => s.level === nextLevel);
    return stage?.label ?? `Level ${nextLevel}`;
  }, [nextLevel, status, currentLevel]);

  const predictedTimeToNext = useMemo(() => {
    if (status === 'breached' || currentLevel >= 2) return null;
    // If at-risk, next escalation is imminent (< 25% time left means ~12.5% threshold)
    // Show a rough prediction based on the 25% threshold for the next level
    const nextThresholdHours = targetHours * 0.75; // 75% elapsed = 25% remaining = at_risk
    const remainingToNext = Math.max(0, nextThresholdHours - elapsedHours);
    return remainingToNext;
  }, [status, currentLevel, targetHours, elapsedHours]);

  // ── Compact variant ────────────────────────────────────────────────
  if (compact) {
    return (
      <div
        className={`rounded-lg border ${styles.border} ${styles.background} p-2.5 space-y-1.5 ${
          status === 'breached' ? 'animate-pulse' : ''
        } ${styles.glow}`}
      >
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className={`w-3 h-3 ${styles.accent}`} />
            <span className="mono-readout text-[9px] font-bold text-slate-300">
              {formatHours(elapsedHours)}
            </span>
          </div>
          <span
            className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm border ${styles.badge}`}
          >
            {status === 'on_track'
              ? 'ON TRACK'
              : status === 'at_risk'
                ? 'AT RISK'
                : 'BREACHED'}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 rounded-full bg-slate-900 overflow-hidden border border-border/20">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${styles.progress}`}
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>

        {/* Remaining label */}
        <p className={`text-[8px] font-mono ${styles.accent} text-right`}>
          {remainingLabel(remainingHours)}
        </p>
      </div>
    );
  }

  // ── Full variant ───────────────────────────────────────────────────
  return (
    <div
      className={`rounded-xl border ${styles.border} bg-slate-900/30 p-5 space-y-4 ${
        status === 'breached' ? 'animate-pulse' : ''
      } ${styles.glow}`}
    >
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${styles.accent}`} />
          <span className="mono-label text-[9px] tracking-wider text-slate-400 font-black uppercase">
            SLA Status
          </span>
        </div>
        <span
          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm border ${styles.badge}`}
        >
          {status === 'on_track'
            ? 'On Track'
            : status === 'at_risk'
              ? 'At Risk'
              : 'SLA Breached'}
        </span>
      </div>

      {/* ─── Timer display ──────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="mono-readout text-2xl font-black text-slate-100">
            {formatHours(elapsedHours)}
          </span>
          <span className="mono-label text-[10px] text-slate-500">
            elapsed / {targetHours}h target
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-border/20">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${styles.progress}`}
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>
        <div className="flex justify-between text-[8px] text-slate-600 font-mono">
          <span>0h</span>
          <span>{Math.round(targetHours * 0.25)}h</span>
          <span>{Math.round(targetHours * 0.5)}h</span>
          <span>{Math.round(targetHours * 0.75)}h</span>
          <span>{targetHours}h</span>
        </div>
      </div>

      {/* ─── Remaining / overdue ────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {status === 'breached' ? (
          <>
            <AlertTriangle className={`w-4 h-4 ${styles.accent}`} />
            <span className="mono-readout text-sm font-black text-rose-300">
              Overdue by {formatHours(Math.abs(targetHours - elapsedHours))}
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 className={`w-3.5 h-3.5 ${styles.accent}`} />
            <span className="mono-readout text-sm font-black text-slate-200">
              {remainingLabel(remainingHours)}
            </span>
          </>
        )}
      </div>

      {/* ─── Escalation level ladder ────────────────────────────── */}
      <div className="space-y-1.5">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
          Escalation Level
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {ESCALATION_STAGES.map((stage) => {
            const isActive = currentLevel >= stage.level;
            const isCurrent = currentLevel === stage.level;
            return (
              <div
                key={stage.level}
                className={`rounded border p-2.5 text-center transition-all ${
                  isCurrent
                    ? `${styles.border} ${styles.background}`
                    : isActive
                      ? 'border-cyan-500/20 bg-cyan-950/10'
                      : 'border-border/30 bg-slate-950/30 opacity-40'
                }`}
              >
                <span
                  className={`block text-[10px] font-extrabold uppercase tracking-wider ${
                    isCurrent
                      ? styles.text
                      : isActive
                        ? 'text-cyan-400'
                        : 'text-slate-600'
                  }`}
                >
                  L{stage.level}
                </span>
                <span className="block text-[7px] text-slate-500 mt-0.5 font-medium">
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Next escalation prediction ─────────────────────────── */}
      {nextLevel !== null && predictedTimeToNext !== null && (
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <ChevronUp className={`w-3.5 h-3.5 ${styles.accent}`} />
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              Next Escalation Prediction
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-300 font-bold">{nextEscalationLabel}</span>
            <span className="text-slate-500 font-mono">
              {predictedTimeToNext > 0
                ? `~${formatHours(predictedTimeToNext)}`
                : 'Imminent'}
            </span>
          </div>
          <p className="text-[8px] text-slate-600 leading-relaxed">
            Auto-escalation triggers when {Math.round(targetHours * 0.75)}h of{' '}
            {targetHours}h SLA has elapsed without resolution.
          </p>
        </div>
      )}

      {/* ─── Breached notice ────────────────────────────────────── */}
      {status === 'breached' && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-950/15 p-3 space-y-2">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">
              SLA Breach — Escalation Required
            </span>
          </div>
          <p className="text-[9px] text-slate-400 leading-relaxed pl-6">
            Complaint #{complaint.id} has exceeded its {targetHours}h resolution
            SLA. Immediate escalation to the next authority level is required.
            {isBreachedField &&
              ` Breached at ${new Date(complaint.slaBreachedAt!).toLocaleString()}.`}
          </p>
        </div>
      )}

      {/* ─── At-risk notice ─────────────────────────────────────── */}
      {status === 'at_risk' && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-2.5 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[9px] text-amber-300 leading-relaxed font-medium">
            Less than 25% of SLA time remaining. Escalation to Level{' '}
            {nextLevel ?? 1} will trigger automatically if the complaint is not
            resolved.
          </p>
        </div>
      )}
    </div>
  );
}