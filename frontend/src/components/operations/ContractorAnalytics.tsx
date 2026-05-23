import React from 'react';
import { HardHat, Award, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { contractors, projects } from '@/data/mockData';

export default function ContractorAnalytics() {
  // Calculate dynamic reliability score for each contractor
  const contractorMetrics = contractors.map(c => {
    const totalJobs = c.projectsCompleted + c.projectsDelayed;
    let reliabilityScore = 100;
    
    if (totalJobs > 0) {
      // Deduct score for delayed projects, weighted
      reliabilityScore = Math.max(
        10,
        Math.round(((c.projectsCompleted) / (c.projectsCompleted + c.projectsDelayed * 1.5)) * 100)
      );
    }
    
    if (c.blacklisted) {
      reliabilityScore = 0;
    }

    return {
      ...c,
      reliabilityScore,
      totalJobs
    };
  }).sort((a, b) => b.reliabilityScore - a.reliabilityScore);

  const delayedContracts = projects.filter(p => p.delayDays > 0 || p.status === 'halted');

  return (
    <div className="glass-panel border border-border/80 rounded-xl p-5 bg-slate-950/40 space-y-4">
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <HardHat className="w-4 h-4 text-cyan-400" />
        <h3 className="text-xs uppercase font-black tracking-widest text-slate-200">
          Contractor Reliability Scorecard
        </h3>
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto max-h-[220px] scrollbar-thin">
        <table className="w-full text-left text-[10px] border-collapse">
          <thead>
            <tr className="border-b border-border/40 text-muted-foreground font-black uppercase tracking-wider">
              <th className="pb-2">Contractor</th>
              <th className="pb-2 text-center">Jobs (C/D)</th>
              <th className="pb-2 text-center">Rating</th>
              <th className="pb-2 text-right">Reliability</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/10">
            {contractorMetrics.map((c, idx) => (
              <tr key={c.id} className="hover:bg-slate-900/30">
                <td className="py-2 pr-2 font-bold text-slate-250 flex items-center gap-1.5">
                  <span className="text-muted-foreground">#{idx + 1}</span>
                  <span className="truncate max-w-[120px]">{c.name}</span>
                </td>
                <td className="py-2 text-center font-semibold text-slate-350">
                  {c.projectsCompleted} / <span className={c.projectsDelayed > 2 ? 'text-red-400' : 'text-slate-400'}>{c.projectsDelayed}</span>
                </td>
                <td className="py-2 text-center">
                  <span className="flex items-center justify-center gap-0.5 text-amber-500 font-extrabold">
                    ★ {c.rating.toFixed(2)}
                  </span>
                </td>
                <td className="py-2 text-right">
                  {c.blacklisted ? (
                    <span className="text-[8px] bg-red-950/60 border border-red-900 text-red-500 font-black px-1.5 py-0.2 rounded uppercase shrink-0">
                      Blacklisted
                    </span>
                  ) : (
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={`font-black ${
                        c.reliabilityScore >= 85 ? 'text-emerald-400' :
                        c.reliabilityScore >= 60 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {c.reliabilityScore}%
                      </span>
                      <div className="w-12 h-1 bg-slate-900 rounded-full overflow-hidden hidden sm:block">
                        <div 
                          className={`h-full rounded-full ${
                            c.reliabilityScore >= 85 ? 'bg-emerald-500' :
                            c.reliabilityScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${c.reliabilityScore}%` }}
                        />
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Warnings & Anomalies Banner */}
      <div className="space-y-2">
        <h4 className="text-[9px] uppercase font-black tracking-wider text-muted-foreground">
          Active Budget & Delay Warnings
        </h4>
        <div className="space-y-1.5 overflow-y-auto max-h-[120px] pr-1 scrollbar-thin">
          {delayedContracts.map(p => (
            <div 
              key={p.id}
              className="p-2 rounded-lg border border-red-950 bg-red-950/10 text-[9px] flex items-start gap-2 text-red-400"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-extrabold uppercase flex justify-between gap-2">
                  <span className="truncate">{p.title}</span>
                  <span className="shrink-0 font-black text-red-500">{p.delayDays}d Delayed</span>
                </div>
                <p className="text-[8px] text-slate-400 font-medium mt-0.5">
                  Contractor ID: {p.contractorId} | Budget Utilization: {Math.round((p.budgetSpent / p.budgetAllocated) * 100)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
