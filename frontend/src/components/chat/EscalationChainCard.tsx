import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import type { EscalationChain } from '@/types';

interface EscalationChainCardProps {
  chain: EscalationChain;
}

const LEVEL_COLORS: Record<number, { dot: string; line: string; bg: string; label: string }> = {
  0: { dot: 'bg-emerald-500', line: 'bg-emerald-500/30', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Initial Assignment' },
  1: { dot: 'bg-amber-500', line: 'bg-amber-500/30', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Level 1 Escalation' },
  2: { dot: 'bg-red-500', line: 'bg-red-500/30', bg: 'bg-red-500/10 border-red-500/20', label: 'Level 2 Escalation' },
};

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function EscalationChainCard({ chain }: EscalationChainCardProps) {
  const steps = chain.chain;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mt-4 pt-3 border-t border-border/40"
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <AlertTriangle className="w-3 h-3 text-amber-400" />
        <span className="text-[10px] text-amber-400/80 uppercase font-black tracking-widest">
          Escalation Chain
        </span>
        <span className="text-[8px] text-slate-500 ml-auto">
          #{chain.complaintId} · {chain.currentStatus}
        </span>
      </div>

      <div className="relative overflow-hidden glass-panel rounded-xl border border-amber-500/20 bg-slate-950/50">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/60 via-red-500/60 to-amber-500/60" />

        <div className="p-3.5 relative z-10">
          {/* Complaint Title */}
          <div className="mb-3 pb-2 border-b border-slate-800/40">
            <h5 className="text-[10px] font-bold text-slate-200 leading-tight">
              {chain.title}
            </h5>
            <div className="flex items-center gap-2 mt-1 text-[8px] text-slate-500">
              <span className="flex items-center gap-0.5">
                Current: <span className="text-slate-300 font-semibold capitalize">{chain.currentStatus}</span>
              </span>
              <span className="flex items-center gap-0.5">
                Level: <span className="text-slate-300 font-semibold">{chain.currentLevel}</span>
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            {steps.length === 0 ? (
              <p className="text-[9px] text-slate-500 italic text-center py-4">
                No escalation history available.
              </p>
            ) : (
              <div className="space-y-0">
                {steps.map((step, idx) => {
                  const colors = LEVEL_COLORS[step.level] || LEVEL_COLORS[0];
                  const isLast = idx === steps.length - 1;

                  return (
                    <div key={idx} className="flex gap-3">
                      {/* Timeline bar */}
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full ${colors.dot} ring-2 ring-slate-900 z-10 shrink-0`} />
                        {!isLast && (
                          <div className={`w-0.5 flex-1 min-h-[24px] ${colors.line}`} />
                        )}
                      </div>

                      {/* Step content */}
                      <div className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
                        <div className={`rounded-lg border px-2.5 py-2 ${colors.bg}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[9px] font-black uppercase tracking-wider ${
                              step.level === 0 ? 'text-emerald-400' : step.level === 1 ? 'text-amber-400' : 'text-red-400'
                            }`}>
                              {colors.label}
                            </span>
                            {step.escalatedAt && (
                              <span className="text-[7px] text-slate-500 flex items-center gap-0.5">
                                <Clock className="w-2 h-2" />
                                {formatDate(step.escalatedAt)}
                              </span>
                            )}
                          </div>

                          {step.authority && (
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-300">
                              <Building2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              <span className="font-semibold">{step.authority.name}</span>
                            </div>
                          )}

                          {step.escalatedBy && (
                            <div className="flex items-center gap-1.5 mt-0.5 text-[8px] text-slate-500">
                              <User className="w-2 h-2 shrink-0" />
                              <span>Escalated by: {step.escalatedBy}</span>
                            </div>
                          )}

                          {step.fromLevel !== undefined && step.toLevel !== undefined && step.toLevel > step.fromLevel && (
                            <div className="flex items-center gap-1 mt-0.5 text-[8px] text-slate-500">
                              <ArrowRight className="w-2 h-2 text-amber-400" />
                              <span>Level {step.fromLevel} → Level {step.toLevel}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Current status indicator */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 ring-2 ring-slate-900 z-10 shrink-0 animate-pulse" />
              </div>
              <div className="flex-1 pb-0">
                <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400">
                    Current Status
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-slate-300">
                    <CheckCircle2 className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                    <span className="font-semibold capitalize">{chain.currentStatus}</span>
                    <span className="text-slate-500">· Level {chain.currentLevel}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
