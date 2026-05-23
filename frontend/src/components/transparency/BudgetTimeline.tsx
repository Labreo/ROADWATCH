'use client';

import React from 'react';
import { Project, Contractor } from '@/types';
import { Calendar, User, Clock, AlertCircle, CheckCircle2, Pause, ArrowUpRight } from 'lucide-react';
import { formatINR } from '@/services/transparencyEngine';

interface BudgetTimelineProps {
  projects: Project[];
  contractors: Contractor[];
}

export default function BudgetTimeline({ projects, contractors }: BudgetTimelineProps) {
  // Sort projects in descending order of start date
  const sortedProjects = [...projects].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  if (sortedProjects.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-muted-foreground bg-slate-950/20 rounded-xl border border-dashed border-border/40 p-4">
        No budget projects or maintenance operations logged on this segment.
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-450" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-zinc-400 animate-pulse" />;
      case 'halted':
        return <Pause className="w-4 h-4 text-red-400" />;
      default:
        return <Calendar className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-[8px] bg-emerald-950/60 text-emerald-400/90 border border-emerald-900/60 px-1.5 py-0.2 rounded font-extrabold uppercase">Completed</span>;
      case 'in_progress':
        return <span className="text-[8px] bg-zinc-900 border border-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded font-extrabold uppercase animate-pulse">In Progress</span>;
      case 'halted':
        return <span className="text-[8px] bg-red-950/60 text-red-400 border border-red-900/65 px-1.5 py-0.2 rounded font-extrabold uppercase">Halted</span>;
      default:
        return <span className="text-[8px] bg-slate-900 text-slate-400 border border-border px-1.5 py-0.2 rounded font-extrabold uppercase">Planned</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <h4 className="text-[10px] text-slate-200 uppercase font-black tracking-widest">Budget Ledgers & Audit History</h4>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/40">
        {sortedProjects.map((p, idx) => {
          const contractor = contractors.find(c => c.id === p.contractorId);
          const utilization = Math.round((p.budgetSpent / p.budgetAllocated) * 100);
          const isOver = p.budgetSpent > p.budgetAllocated;
          const excess = p.budgetSpent - p.budgetAllocated;

          const startLabel = new Date(p.startDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
          const endLabel = p.actualEndDate 
            ? new Date(p.actualEndDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })
            : p.status === 'completed' 
              ? new Date(p.targetEndDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })
              : 'Present';

          return (
            <div key={p.id} className="relative group">
              {/* Chronological Bullet Dot */}
              <span className={`absolute -left-[23px] top-1.5 w-4.5 h-4.5 rounded-full border bg-slate-950 flex items-center justify-center transition-all ${
                p.status === 'completed' ? 'border-emerald-500/50' : 
                p.status === 'in_progress' ? 'border-zinc-500/50 shadow-sm shadow-zinc-500/5' : 'border-red-500/50'
              }`}>
                {getStatusIcon(p.status)}
              </span>

              {/* Event Content Card */}
              <div className="glass-panel p-4 rounded-xl border border-border/60 bg-slate-950/20 hover:border-border transition-colors space-y-3">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <div className="text-[9px] font-black text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-zinc-500" /> {startLabel} – {endLabel}
                      <span className="text-slate-600">|</span>
                      <span>ID: #{p.id}</span>
                    </div>
                    <h5 className="text-xs font-black text-slate-200 leading-snug">{p.title}</h5>
                  </div>
                  <div>
                    {getStatusBadge(p.status)}
                  </div>
                </div>

                {/* Financial overview */}
                <div className="grid grid-cols-2 gap-4 border-t border-b border-border/30 py-2.5 my-2">
                  <div>
                    <span className="text-[8px] text-muted-foreground block uppercase font-bold tracking-wider">Sanctioned Budget</span>
                    <span className="text-xs font-extrabold text-emerald-400">{formatINR(p.budgetAllocated)}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-muted-foreground block uppercase font-bold tracking-wider">Spent To Date</span>
                    <span className={`text-xs font-extrabold ${isOver ? 'text-red-400' : 'text-slate-200'}`}>{formatINR(p.budgetSpent)}</span>
                  </div>
                </div>

                {/* Utilization gauge */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] font-bold">
                    <span className="text-muted-foreground">Allocation Spent:</span>
                    <span className={isOver ? 'text-red-400' : 'text-zinc-400'}>{utilization}%</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-slate-900 overflow-hidden border border-border/10">
                    <div 
                      className={`h-full rounded-full ${isOver ? 'bg-red-500' : 'bg-zinc-500'}`}
                      style={{ width: `${Math.min(100, utilization)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Contractor Link */}
                {contractor && (
                  <div className="flex justify-between items-center text-[9px] text-muted-foreground pt-1 flex-wrap gap-2">
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Contractor: <strong className="text-slate-300 font-bold">{contractor.name}</strong></span>
                    </div>
                    {contractor.blacklisted && (
                      <span className="text-[8px] bg-red-950/60 border border-red-900/60 text-red-500 px-1 rounded uppercase font-extrabold tracking-wider">
                        Blacklisted
                      </span>
                    )}
                  </div>
                )}

                {/* Overrun/Delay Warnings */}
                {(isOver || p.delayDays > 0) && (
                  <div className="p-2.5 rounded bg-red-950/15 border border-red-900/40 space-y-1">
                    {isOver && (
                      <div className="flex items-center gap-1.5 text-[9px] text-red-400 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>Budget overrun of <strong className="font-extrabold text-red-300">{formatINR(excess)}</strong> ({utilization - 100}% over).</span>
                      </div>
                    )}
                    {p.delayDays > 0 && (
                      <div className="flex items-center gap-1.5 text-[9px] text-amber-405 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Completion delay of <strong className="font-extrabold text-amber-300">{p.delayDays} days</strong> against contract terms.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
