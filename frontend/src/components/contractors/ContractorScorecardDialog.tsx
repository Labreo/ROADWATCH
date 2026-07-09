'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  motion,
  AnimatePresence,
} from 'framer-motion';
import {
  X,
  HardHat,
  Phone,
  Mail,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Star,
  FileText,
  ExternalLink,
  Building2,
  Percent,
  TrendingUp,
  Award,
  Ban,
} from 'lucide-react';
import type { Contractor, Project } from '@/types';
import { contractors, projects } from '@/data/mockData';

/* ───────────────────────────────────────────────────────
   Types
   ─────────────────────────────────────────────────────── */

export interface ScorecardMetrics {
  onTimeRate: number;       // 0-100
  budgetAdherence: number;  // 0-100
  qualityScore: number;     // 0-100
  overallGrade: string;     // A+ through F
  letterGradeColor: string; // tailwind class
  overruns: number;
  haltedProjects: number;
  avgDelayDays: number;
}

interface ContractorScorecardDialogProps {
  open: boolean;
  onClose: () => void;
  contractorId?: number;
  contractor?: Contractor | null;
  onViewOnMap?: (contractorId: number) => void;
}

/* ───────────────────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────────────────── */

function getContractorById(id: number): Contractor | undefined {
  return contractors.find((c) => c.id === id);
}

function getProjectsForContractor(contractorId: number): Project[] {
  return projects.filter((p) => p.contractorId === contractorId);
}

function computeMetrics(contractor: Contractor, contractorProjects: Project[]): ScorecardMetrics {
  const total = contractor.projectsCompleted + contractor.projectsDelayed;
  const onTimeRate = total > 0 ? ((contractor.projectsCompleted) / total) * 100 : 0;

  // Budget adherence: average of budgetSpent/budgetAllocated (clamped at 100)
  let budgetSum = 0;
  let budgetCount = 0;
  let overruns = 0;
  let haltedProjects = 0;
  let delaySum = 0;

  for (const p of contractorProjects) {
    if (p.budgetAllocated > 0) {
      const ratio = p.budgetSpent / p.budgetAllocated;
      budgetSum += Math.min(ratio, 1.5); // cap at 150% so it doesn't wreck the avg
      budgetCount++;
      if (ratio > 1.0) overruns++;
    }
    if (p.status === 'halted' || p.status === 'cancelled') haltedProjects++;
    delaySum += p.delayDays;
  }

  const budgetAdherence = budgetCount > 0
    ? Math.max(0, 100 - (1 - (budgetSum / budgetCount)) * 100)
    : 100;

  // Quality score from rating (0-5) mapped to 0-100
  const qualityScore = Math.min(100, (contractor.rating / 5) * 100);

  // Penalties for overruns, halted projects, blacklist
  let gradePenalty = 0;
  if (overruns > 1) gradePenalty += 5 * overruns;
  if (haltedProjects > 0) gradePenalty += 15 * haltedProjects;
  if (contractor.blacklisted) gradePenalty += 25;

  const rawScore = (onTimeRate * 0.35 + budgetAdherence * 0.25 + qualityScore * 0.40) - gradePenalty;
  const clamped = Math.max(0, Math.min(100, rawScore));
  const avgDelayDays = contractorProjects.length > 0 ? delaySum / contractorProjects.length : 0;

  let letterGrade: string;
  let letterGradeColor: string;

  if (clamped >= 95)       { letterGrade = 'A+'; letterGradeColor = 'text-emerald-400'; }
  else if (clamped >= 85)  { letterGrade = 'A';  letterGradeColor = 'text-emerald-400'; }
  else if (clamped >= 75)  { letterGrade = 'B+'; letterGradeColor = 'text-cyan-400'; }
  else if (clamped >= 65)  { letterGrade = 'B';  letterGradeColor = 'text-cyan-400'; }
  else if (clamped >= 55)  { letterGrade = 'C+'; letterGradeColor = 'text-amber-400'; }
  else if (clamped >= 45)  { letterGrade = 'C';  letterGradeColor = 'text-amber-400'; }
  else if (clamped >= 35)  { letterGrade = 'D';  letterGradeColor = 'text-orange-400'; }
  else if (clamped >= 20)  { letterGrade = 'E';  letterGradeColor = 'text-red-400'; }
  else                     { letterGrade = 'F';  letterGradeColor = 'text-rose-400'; }

  return {
    onTimeRate: Math.round(onTimeRate),
    budgetAdherence: Math.round(budgetAdherence),
    qualityScore: Math.round(qualityScore),
    overallGrade: letterGrade,
    letterGradeColor,
    overruns,
    haltedProjects,
    avgDelayDays: Math.round(avgDelayDays * 10) / 10,
  };
}

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let s = '';
  for (let i = 0; i < full; i++) s += '★';
  if (half) s += '½';
  const empty = 5 - full - (half ? 1 : 0);
  for (let i = 0; i < empty; i++) s += '☆';
  return s;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_00_00_000) return '₹' + (amount / 1_00_00_000).toFixed(1) + ' Cr';
  if (amount >= 1_00_000) return '₹' + (amount / 1_00_000).toFixed(1) + ' L';
  return '₹' + amount.toLocaleString('en-IN');
}

/* ───────────────────────────────────────────────────────
   Status badge color
   ─────────────────────────────────────────────────────── */

function projectStatusColor(status: string): string {
  switch (status) {
    case 'completed':       return 'text-emerald-400 border-emerald-950/60 bg-emerald-950/30';
    case 'in_progress':     return 'text-cyan-400 border-cyan-950/60 bg-cyan-950/30';
    case 'planned':         return 'text-blue-400 border-blue-950/60 bg-blue-950/30';
    case 'halted':          return 'text-amber-400 border-amber-950/60 bg-amber-950/30';
    case 'cancelled':       return 'text-rose-400 border-rose-950/60 bg-rose-950/30';
    default:                return 'text-slate-400 border-slate-800/60 bg-slate-900/30';
  }
}

/* ───────────────────────────────────────────────────────
   Metric bar
   ─────────────────────────────────────────────────────── */

function MetricBar({ label, value, icon, color }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1 text-slate-300 font-semibold">
          {icon}
          {label}
        </span>
        <span className={`font-extrabold ${color}`}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color.replace('text-', 'bg-')}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────
   Main Component
   ─────────────────────────────────────────────────────── */

export default function ContractorScorecardDialog({
  open,
  onClose,
  contractorId,
  contractor: contractorProp,
  onViewOnMap,
}: ContractorScorecardDialogProps) {
  const [data, setData] = useState<Contractor | null>(null);

  // Resolve the contractor from id or prop
  useEffect(() => {
    if (contractorProp) {
      setData(contractorProp);
    } else if (contractorId != null) {
      setData(getContractorById(contractorId) ?? null);
    } else {
      setData(null);
    }
  }, [contractorId, contractorProp]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  const contractorProjects = useMemo(
    () => (data ? getProjectsForContractor(data.id) : []),
    [data],
  );

  const metrics = useMemo(
    () => (data ? computeMetrics(data, contractorProjects) : null),
    [data, contractorProjects],
  );

  if (!data) return null;

  const stars = renderStars(data.rating);
  const registrationYear = data.registrationDate
    ? new Date(data.registrationDate).getFullYear()
    : 'N/A';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            key="scorecard-backdrop"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            key="scorecard-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`Contractor scorecard: ${data.name}`}
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto glass-panel rounded-2xl border border-border/60 shadow-2xl shadow-black/50"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.8 }}
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/3 to-transparent pointer-events-none" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-slate-900/80 border border-border/60 text-slate-400 hover:text-slate-200 hover:border-slate-700/60 transition-colors cursor-pointer"
              aria-label="Close scorecard"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative z-0 p-5 sm:p-6 space-y-5">

              {/* ── Header ── */}
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-900/60 text-indigo-400 shrink-0">
                  <HardHat className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-100 truncate">
                      {data.name}
                    </h2>
                    {data.blacklisted && (
                      <span className="text-[9px] font-black text-red-500 border border-red-950/60 bg-red-950/30 px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider shrink-0">
                        <Ban className="w-2.5 h-2.5" /> Blacklisted
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {data.licenseNumber}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Est. {registrationYear}
                    </span>
                  </div>
                </div>

                {/* Grade badge */}
                {metrics && (
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`text-2xl font-black leading-none ${metrics.letterGradeColor}`}>
                      {metrics.overallGrade}
                    </div>
                    <span className="text-[7px] uppercase tracking-widest text-slate-500 mt-0.5">
                      Grade
                    </span>
                  </div>
                )}
              </div>

              {/* ── Rating stars ── */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-0.5 text-amber-500 text-sm tracking-wider">
                  {stars.split('').map((ch, i) => (
                    <span key={i} className={ch === '☆' ? 'text-slate-700' : ''}>
                      {ch}
                    </span>
                  ))}
                </div>
                <span className="text-[11px] font-bold text-amber-400/80">
                  {data.rating.toFixed(2)}
                </span>
                <span className="text-[9px] text-slate-500">
                  / 5.00
                </span>
              </div>

              {/* ── Compliance Scorecard ── */}
              {metrics && (
                <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-border/60">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-400" />
                    Compliance Scorecard
                  </h3>
                  <div className="space-y-3">
                    <MetricBar
                      label="On-Time Delivery"
                      value={metrics.onTimeRate}
                      icon={<Clock className="w-3 h-3 text-cyan-400" />}
                      color="text-cyan-400"
                    />
                    <MetricBar
                      label="Budget Adherence"
                      value={metrics.budgetAdherence}
                      icon={<DollarSign className="w-3 h-3 text-emerald-400" />}
                      color="text-emerald-400"
                    />
                    <MetricBar
                      label="Quality Score"
                      value={metrics.qualityScore}
                      icon={<Star className="w-3 h-3 text-amber-400" />}
                      color="text-amber-400"
                    />
                  </div>
                </div>
              )}

              {/* ── Stats row ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Projects Done', value: data.projectsCompleted, icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />, color: 'text-emerald-400' },
                  { label: 'Delayed', value: data.projectsDelayed, icon: <Clock className="w-3.5 h-3.5 text-amber-400" />, color: 'text-amber-400' },
                  { label: 'Budget Overruns', value: metrics?.overruns ?? 0, icon: <TrendingUp className="w-3.5 h-3.5 text-rose-400" />, color: 'text-rose-400' },
                  { label: 'Halted', value: metrics?.haltedProjects ?? 0, icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />, color: 'text-orange-400' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="p-2.5 rounded-xl bg-slate-950/50 border border-border/50 text-center"
                  >
                    <div className="flex justify-center mb-1">{stat.icon}</div>
                    <div className={`text-sm font-black ${stat.color}`}>{stat.value}</div>
                    <div className="text-[8px] text-slate-500 uppercase tracking-wider mt-0.5">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Contact ── */}
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/40 border border-border/50">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  Contact Information
                </h3>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    {data.contactEmail}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    {data.contactPhone}
                  </span>
                </div>
                {data.blacklisted && data.blacklistedReason && (
                  <div className="mt-2 p-2.5 rounded-lg bg-rose-950/20 border border-rose-950/40 flex items-start gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[8px] font-black uppercase text-rose-400 tracking-wider block">
                        Blacklisted Reason
                      </span>
                      <p className="text-[10px] text-slate-300 mt-0.5 leading-relaxed">
                        {data.blacklistedReason}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Project Table ── */}
              <div className="space-y-2">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-slate-400" />
                  Projects ({contractorProjects.length})
                </h3>

                {contractorProjects.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-border/60 text-center">
                    <span className="text-[10px] text-slate-500">No projects assigned to this contractor.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[9px] border-collapse">
                      <thead>
                        <tr className="text-slate-500 uppercase tracking-wider border-b border-border/40">
                          <th className="text-left py-2 pr-3 font-semibold">Project</th>
                          <th className="text-left py-2 pr-3 font-semibold">Status</th>
                          <th className="text-right py-2 pr-3 font-semibold">Budget</th>
                          <th className="text-right py-2 pr-3 font-semibold">Spent</th>
                          <th className="text-right py-2 font-semibold">Delay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contractorProjects.map((p) => (
                          <tr
                            key={p.id}
                            className="border-b border-border/20 hover:bg-slate-900/40 transition-colors"
                          >
                            <td className="py-2 pr-3 text-slate-200 font-semibold truncate max-w-[160px]">
                              {p.title}
                            </td>
                            <td className="py-2 pr-3">
                              <span className={`text-[7px] font-extrabold px-1 rounded border uppercase ${projectStatusColor(p.status)}`}>
                                {p.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-2 pr-3 text-right text-slate-300 font-mono">
                              {formatCurrency(p.budgetAllocated)}
                            </td>
                            <td className="py-2 pr-3 text-right font-mono">
                              <span className={p.budgetSpent > p.budgetAllocated ? 'text-rose-400' : 'text-emerald-400'}>
                                {formatCurrency(p.budgetSpent)}
                              </span>
                            </td>
                            <td className="py-2 text-right font-mono">
                              <span className={p.delayDays > 0 ? 'text-amber-400' : 'text-slate-500'}>
                                {p.delayDays > 0 ? `+${p.delayDays}d` : '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── View on Map ── */}
              {onViewOnMap && (
                <button
                  onClick={() => onViewOnMap(data.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900/80 border border-border/60 text-[10px] font-extrabold uppercase tracking-wider text-slate-300 hover:text-cyan-400 hover:border-cyan-900/60 transition-all cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  View {data.name} on Map
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}