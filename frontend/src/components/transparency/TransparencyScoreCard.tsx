'use client';

import React, { useState } from 'react';
import { ScoreDeduction } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { getScoreGrade } from '@/services/transparencyEngine';
import { X, Check, ShieldAlert, Coins, Clock, AlertTriangle, MessageSquareCode, Wrench, TrendingUp, Route, Users, HelpCircle } from 'lucide-react';

interface TransparencyScoreCardProps {
  score: number;
  deductions: ScoreDeduction[];
}

// Category metadata: display name, description, fix suggestion
const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; description: string; fixSuggestion: string }> = {
  budget: {
    label: 'Budget Overrun',
    icon: <Coins className="w-4 h-4 text-red-400" />,
    description: 'Project spending exceeded the allocated budget, indicating poor financial planning or uncontrolled cost escalation.',
    fixSuggestion: 'Implement strict milestone-based budget checkpoints. Require approval for any expenditure above 90% of allocation. Conduct quarterly forensic audits.',
  },
  delay: {
    label: 'Project Delay',
    icon: <Clock className="w-4 h-4 text-amber-400" />,
    description: 'Contract timelines were not met, causing cascading disruptions to road availability and public inconvenience.',
    fixSuggestion: 'Enforce penalty clauses for delayed milestones. Require weekly progress reporting with Gantt chart tracking. Set buffer time of 10% in every contract.',
  },
  quality: {
    label: 'Contractor / Quality Issue',
    icon: <ShieldAlert className="w-4 h-4 text-red-500" />,
    description: 'Work was assigned to a low-rated or blacklisted contractor, compromising road quality and public safety.',
    fixSuggestion: 'Enforce minimum rating threshold (3.5/5) for all awarded contracts. Maintain a public blacklist. Mandate third-party quality audits for every project.',
  },
  anomaly: {
    label: 'Repeated Repair / Anomaly',
    icon: <AlertTriangle className="w-4 h-4 text-orange-400" />,
    description: 'The same segment required repairs within a short period, suggesting substandard materials or construction methods.',
    fixSuggestion: 'Require contractors to guarantee work for 24 months. Use material testing labs before approval. Flag any segment repaired twice within 18 months for structural review.',
  },
  complaints: {
    label: 'Unresolved Citizen Complaints',
    icon: <MessageSquareCode className="w-4 h-4 text-cyan-400" />,
    description: 'Citizens have reported defects that remain unresolved, eroding public trust and indicating poor grievance management.',
    fixSuggestion: 'Set a 48-hour SLA for initial response. Notify the responsible authority automatically. Escalate unresolved complaints after 7 days. Publish resolution timelines publicly.',
  },
};

const DEFAULT_FIX = 'Review procurement and project management processes for this road segment.';

function getCategoryMeta(category: string) {
  return CATEGORY_META[category] || {
    label: category.charAt(0).toUpperCase() + category.slice(1),
    icon: <HelpCircle className="w-4 h-4 text-slate-400" />,
    description: 'An issue was detected in this area during the integrity audit.',
    fixSuggestion: DEFAULT_FIX,
  };
}

function getDeductionIcon(category: string) {
  const meta = getCategoryMeta(category);
  return meta.icon;
}

function getDialColor(val: number) {
  if (val >= 80) return '#10b981'; // Emerald
  if (val >= 65) return '#06b6d4'; // Cyan/Teal
  if (val >= 50) return '#f59e0b'; // Amber
  return '#ef4444'; // Red
}

function getScoreGlow(val: number) {
  if (val >= 80) return 'shadow-[0_0_20px_rgba(16,185,129,0.3)]';
  if (val >= 65) return 'shadow-[0_0_20px_rgba(6,182,212,0.3)]';
  if (val >= 50) return 'shadow-[0_0_20px_rgba(245,158,11,0.3)]';
  return 'shadow-[0_0_20px_rgba(239,68,68,0.3)]';
}

export default function TransparencyScoreCard({ score, deductions }: TransparencyScoreCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { grade, color, bg } = getScoreGrade(score);

  // SVG Gauge calculations
  const size = 110;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Group deductions by category
  const deductionsByCategory = deductions.reduce<Record<string, ScoreDeduction[]>>((acc, d) => {
    if (!acc[d.category]) acc[d.category] = [];
    acc[d.category].push(d);
    return acc;
  }, {});

  return (
    <>
      <div className="glass-panel p-5 rounded-xl border border-border/60 bg-slate-950/10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Dial Gauge — clickable to open modal */}
        <div className="md:col-span-4 flex flex-col items-center justify-center space-y-2">
          <button
            onClick={() => setModalOpen(true)}
            className={`relative cursor-pointer rounded-full p-1 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-slate-400/60 ${getScoreGlow(score)}`}
            style={{ width: size + 8, height: size + 8 }}
            aria-label="Click for detailed score breakdown"
            title="Click for score breakdown"
          >
            <div className="relative" style={{ width: size, height: size }}>
              <svg className="w-full h-full transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="#0f172a"
                  strokeWidth={strokeWidth}
                />
                {/* Filled circle */}
                <motion.circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={getDialColor(score)}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  strokeLinecap="round"
                />
              </svg>

              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider leading-none">Score</span>
                <span className="text-xl font-black text-slate-100 leading-tight mt-0.5">{score}</span>
                <span className="text-[8px] text-muted-foreground leading-none">/ 100</span>
              </div>
            </div>
          </button>

          {/* Grade Badge */}
          <div className={`text-[10px] font-black px-3 py-1 border rounded-full uppercase tracking-wider ${bg} ${color}`}>
            Audit Grade {grade}
          </div>

          {/* Tap hint */}
          <span className="text-[7px] text-slate-600 uppercase tracking-widest font-semibold">Tap score for details</span>
        </div>

        {/* Audit Logs */}
        <div className="md:col-span-8 space-y-3">
          <div>
            <h4 className="text-[10px] text-slate-200 uppercase font-black tracking-widest">Acoustic Audit &amp; Infraction Ledger</h4>
            <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">
              Automatic integrity and delay tracking calculations. Points are deducted for cost variances, contract halts, repeated repaving, and active alerts.
            </p>
          </div>

          {deductions.length > 0 ? (
            <div className="space-y-2 max-h-[145px] overflow-y-auto pr-1">
              {deductions.map((d, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-3 p-2 rounded bg-slate-950/40 border border-border/30 hover:border-slate-800 transition-colors"
                >
                  <div className="flex gap-2">
                    <span className="mt-0.5 shrink-0">{getDeductionIcon(d.category)}</span>
                    <span className="text-[9px] text-slate-300 font-bold leading-normal">{d.reason}</span>
                  </div>
                  <span className="text-[9px] font-extrabold text-red-400 bg-red-950/40 border border-red-900/60 px-1.5 py-0.2 rounded shrink-0">
                    -{d.points}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3.5 rounded bg-emerald-950/20 border border-emerald-900/40 flex items-start gap-2.5">
              <div className="p-1 rounded-full bg-emerald-500 text-slate-950 mt-0.5 shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <h5 className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">Perfect Account Record</h5>
                <p className="text-[9px] text-emerald-500/80 leading-normal font-medium">
                  No budget variances, structural delays, low-rated contractors, or unresolved citizen complaints logged on this segment.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== MODAL ========== */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />

            {/* Modal panel */}
            <motion.div
              className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border/60 bg-slate-950/95 backdrop-blur-xl shadow-2xl p-6"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {/* Close button */}
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 p-1 rounded-full bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
                aria-label="Close breakdown"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                {/* Mini gauge */}
                <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="24" fill="transparent" stroke="#0f172a" strokeWidth="6" />
                    <motion.circle
                      cx="32" cy="32" r="24" fill="transparent"
                      stroke={getDialColor(score)}
                      strokeWidth="6"
                      strokeDasharray={24 * 2 * Math.PI}
                      initial={{ strokeDashoffset: 24 * 2 * Math.PI }}
                      animate={{ strokeDashoffset: (24 * 2 * Math.PI) - (score / 100) * (24 * 2 * Math.PI) }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className={`text-lg font-black leading-none ${color}`}>{grade}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">Score Breakdown</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {score}/100 &middot; {deductions.length} deduction{deductions.length !== 1 ? 's' : ''} &middot; {Object.keys(deductionsByCategory).length} categor{Object.keys(deductionsByCategory).length !== 1 ? 'ies' : 'y'}
                  </p>
                </div>
              </div>

              {deductions.length === 0 ? (
                <div className="p-5 rounded-xl bg-emerald-950/20 border border-emerald-900/30 text-center">
                  <div className="inline-flex p-2 rounded-full bg-emerald-500/20 mb-3">
                    <Check className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h4 className="text-sm font-extrabold text-emerald-400 uppercase tracking-wider">Clean Audit</h4>
                  <p className="text-[11px] text-emerald-500/70 mt-1 leading-relaxed max-w-sm mx-auto">
                    No deductions were applied. All budget, timeline, contractor, and complaint metrics are within acceptable thresholds.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(deductionsByCategory).map(([category, items]) => {
                    const meta = getCategoryMeta(category);
                    const categoryTotal = items.reduce((s, d) => s + d.points, 0);
                    return (
                      <div key={category} className="rounded-xl border border-border/40 bg-slate-900/40 overflow-hidden">
                        {/* Category header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-border/30">
                          <div className="flex items-center gap-2">
                            {meta.icon}
                            <span className="text-[11px] font-extrabold text-slate-200 uppercase tracking-wider">{meta.label}</span>
                          </div>
                          <span className="text-[11px] font-extrabold text-red-400 bg-red-950/40 border border-red-900/50 px-2 py-0.5 rounded">
                            -{categoryTotal} pts
                          </span>
                        </div>

                        {/* Category description */}
                        <div className="px-4 pt-3 pb-1">
                          <p className="text-[10px] text-slate-400 leading-relaxed">{meta.description}</p>
                        </div>

                        {/* Individual deduction items */}
                        <div className="px-4 pb-2 space-y-1.5">
                          {items.map((d, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-slate-950/50 border border-border/20">
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-[10px] text-slate-300 font-semibold leading-snug flex-1">{d.reason}</span>
                                <span className="text-[10px] font-extrabold text-red-400 shrink-0 bg-red-950/30 border border-red-900/40 px-1.5 py-0.5 rounded">
                                  -{d.points}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Fix suggestion */}
                        <div className="px-4 pb-3 pt-1">
                          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-900/30">
                            <Wrench className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                            <div>
                              <span className="text-[9px] font-extrabold text-cyan-400 uppercase tracking-wider">What would fix this</span>
                              <p className="text-[9px] text-cyan-300/70 leading-relaxed mt-0.5">{meta.fixSuggestion}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Total summary at bottom */}
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900/60 border border-border/40">
                    <span className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">Total Deductions</span>
                    <span className="text-sm font-black text-red-400">
                      -{deductions.reduce((s, d) => s + d.points, 0)}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}