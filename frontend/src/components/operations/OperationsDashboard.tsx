import React, { useState, useMemo } from 'react';
import { Shield, Sparkles, Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import JurisdictionMapWrapper from './JurisdictionMapWrapper';
import ComplaintOperationsPanel from './ComplaintOperationsPanel';
import ContractorAnalytics from './ContractorAnalytics';
import ResponseTimeTracker from './ResponseTimeTracker';
import RepairScheduler from './RepairScheduler';
import LiveSystemLog from './LiveSystemLog';

export default function OperationsDashboard() {
  const { complaintsList } = useStore();
  const [selectedComplaintId, setSelectedComplaintId] = useState<number | null>(null);

  // Statistics counters
  const stats = useMemo(() => {
    const total = complaintsList.length;
    const pending = complaintsList.filter(c => c.status === 'pending').length;
    const progress = complaintsList.filter(c => c.status === 'in_progress').length;
    const resolved = complaintsList.filter(c => c.status === 'resolved').length;
    
    return {
      total,
      pending,
      progress,
      resolved
    };
  }, [complaintsList]);

  const activeComplaintObj = useMemo(() => {
    return complaintsList.find(c => c.id === selectedComplaintId) || null;
  }, [complaintsList, selectedComplaintId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 flex flex-col min-h-0 h-full">
      
      {/* Header Banner */}
      <header className="flex justify-between items-center flex-wrap gap-4 border-b border-border/40 pb-4 shrink-0 select-none">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 shadow-sm">
              <Shield className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              Authority Operations Center
            </h2>
          </div>
          <p className="text-[10px] text-muted-foreground leading-normal font-semibold">
            Real-time municipal triage, GIS jurisdiction routing, contractor dispatching, and response tracking.
          </p>
        </div>

        {/* Live system health status */}
        <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-wider text-slate-350">
          <div className="flex items-center gap-1.5 bg-zinc-900/40 border border-zinc-800/60 px-3 py-1.5 rounded-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>GIS Nodes Active</span>
          </div>
        </div>
      </header>

      {/* Summary KPI Counters Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 select-none">
        <div className="glass-panel rounded-xl p-4 flex items-center gap-3 bg-zinc-950/25 border border-border/40">
          <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800/80 text-zinc-400 shadow-inner">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Total Reports logged</span>
            <span className="text-base font-black text-slate-200">{stats.total} Incidents</span>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 flex items-center gap-3 bg-zinc-950/25 border border-border/40">
          <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/30 text-amber-400/90 shadow-inner animate-pulse">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Pending Triage</span>
            <span className="text-base font-black text-slate-200">{stats.pending} Tickets</span>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 flex items-center gap-3 bg-zinc-950/25 border border-border/40">
          <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800/80 text-zinc-400 shadow-inner">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Active Dispatches</span>
            <span className="text-base font-black text-slate-200">{stats.progress} Repairing</span>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 flex items-center gap-3 bg-zinc-950/25 border border-border/40">
          <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-emerald-400/90 shadow-inner">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Resolved Tickets</span>
            <span className="text-base font-black text-slate-200">{stats.resolved} Closed</span>
          </div>
        </div>
      </section>

      {/* Main Operations Split Section */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[500px]">
        {/* Interactive map representing ward boundaries and complaint hotspots */}
        <div className="xl:col-span-7 h-[500px] xl:h-auto min-h-[400px]">
          <JurisdictionMapWrapper 
            selectedComplaintId={selectedComplaintId}
            onSelectComplaint={setSelectedComplaintId}
          />
        </div>

        {/* Detailed Operations Queue & Action Triage */}
        <div className="xl:col-span-5 h-[500px] xl:h-auto min-h-[400px]">
          <ComplaintOperationsPanel 
            selectedComplaintId={selectedComplaintId}
            onSelectComplaint={setSelectedComplaintId}
          />
        </div>
      </section>

      {/* Analytics & Scheduling Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 shrink-0">
        {/* Dispatch scheduler */}
        <div className="min-h-[300px]">
          <RepairScheduler 
            selectedComplaint={activeComplaintObj}
            onClearSelection={() => setSelectedComplaintId(null)}
          />
        </div>

        {/* Contractor performance leaderboard */}
        <div className="min-h-[300px]">
          <ContractorAnalytics />
        </div>

        {/* Average SLA speed analytics */}
        <div className="min-h-[300px]">
          <ResponseTimeTracker />
        </div>

        {/* Terminal logs showing live updates */}
        <div className="min-h-[300px]">
          <LiveSystemLog />
        </div>
      </section>

    </div>
  );
}
