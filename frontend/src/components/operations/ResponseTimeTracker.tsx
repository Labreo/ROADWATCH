import React from 'react';
import { Clock, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function ResponseTimeTracker() {
  const { complaintsList } = useStore();

  const totalComplaints = complaintsList.length;
  const resolvedComplaints = complaintsList.filter(c => c.status === 'resolved').length;
  const unresolvedComplaints = totalComplaints - resolvedComplaints;

  // Mock Category Resolution Speed metrics (hours)
  const categorySpeeds = [
    { category: 'pothole', label: 'Pothole Repairs', speed: 28, maxSla: 48, count: complaintsList.filter(c => c.category === 'pothole').length },
    { category: 'waterlogging', label: 'Clogged Drains', speed: 14, maxSla: 24, count: complaintsList.filter(c => c.category === 'waterlogging').length },
    { category: 'debris', label: 'Debris Removal', speed: 36, maxSla: 72, count: complaintsList.filter(c => c.category === 'debris').length },
    { category: 'paving_defect', label: 'Paving Defects', speed: 58, maxSla: 96, count: complaintsList.filter(c => c.category === 'paving_defect').length },
    { category: 'missing_signage', label: 'Signage/Reflectors', speed: 20, maxSla: 48, count: complaintsList.filter(c => c.category === 'missing_signage').length }
  ];

  // Calculate compliance rate (percentage under SLA)
  // Let's mock a high-compliance representation
  const slaCompliance = totalComplaints > 0 
    ? Math.round(((resolvedComplaints + unresolvedComplaints * 0.7) / totalComplaints) * 100)
    : 100;

  return (
    <div className="glass-panel border border-border/80 rounded-xl p-5 bg-slate-950/40 space-y-4">
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <Clock className="w-4 h-4 text-cyan-400" />
        <h3 className="text-xs uppercase font-black tracking-widest text-slate-200">
          Response-Time & SLA Analytics
        </h3>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/40 border border-border/50 rounded-lg p-3">
          <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider block">Average Resolution</span>
          <span className="text-lg font-black text-slate-200 mt-1 block">31.2 hrs</span>
          <span className="text-[7px] text-emerald-400 font-semibold block mt-0.5">▼ 4.5% vs last week</span>
        </div>
        <div className="bg-slate-900/40 border border-border/50 rounded-lg p-3">
          <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider block">SLA Compliance Rate</span>
          <span className={`text-lg font-black mt-1 block ${slaCompliance >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {slaCompliance}%
          </span>
          <span className="text-[7px] text-muted-foreground font-medium block mt-0.5">Threshold Target: 85%</span>
        </div>
      </div>

      {/* Speed by Category */}
      <div className="space-y-3">
        <h4 className="text-[9px] uppercase font-black tracking-wider text-muted-foreground">
          Average Hours to Close by Category
        </h4>
        <div className="space-y-2">
          {categorySpeeds.map(c => {
            const pct = Math.round((c.speed / c.maxSla) * 100);
            return (
              <div key={c.category} className="space-y-1">
                <div className="flex justify-between text-[9px] font-semibold text-slate-300">
                  <span className="capitalize">{c.label} ({c.count} items)</span>
                  <span>
                    <strong>{c.speed}h</strong> / <span className="text-slate-500">{c.maxSla}h SLA</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-cyan-500'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unresolved Trends Log */}
      <div className="pt-1.5 border-t border-border/20">
        <div className="flex justify-between text-[9px] font-bold text-muted-foreground">
          <span>Unresolved Trend (Last 5 Days)</span>
          <span className="text-amber-400 font-extrabold">{unresolvedComplaints} Pending Total</span>
        </div>
        <div className="flex justify-between items-end h-8 gap-1.5 mt-2.5 px-2">
          {[12, 16, 15, unresolvedComplaints + 2, unresolvedComplaints].map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div 
                className="w-full bg-cyan-950/60 border border-cyan-850 rounded-t-sm group-hover:bg-cyan-500/30 transition-colors"
                style={{ height: `${Math.max(20, (val / 25) * 100)}%` }}
              />
              <span className="text-[7px] font-mono text-slate-500">Day {i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
