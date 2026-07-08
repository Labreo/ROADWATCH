'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { getHistoricalRoadState, getEventsUpToStep, TimelineEvent } from '@/data/historicalData';
import { getRoad } from '@/data/mockData';
import { formatCurrency } from '@/services/regionAwareFormat';
import { 
  X,
  Calendar,
  Landmark,
  Coins,
  HardHat,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Activity,
  FileText
} from 'lucide-react';

export default function PlaybackEventPanel() {
  const { selectedRoadId, setSelectedRoadId, currentPlaybackStepId } = useStore();
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  if (!selectedRoadId) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center text-center p-6 bg-slate-950/95 border-l border-border/80 text-foreground">
        <Clock className="w-10 h-10 text-cyan-500/40 animate-pulse mb-3" />
        <h3 className="text-sm font-bold text-slate-300">No Road Selected</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
          Select a road segment on the map or left list to activate the timeline audit ledger.
        </p>
      </div>
    );
  }

  const road = getRoad(selectedRoadId);
  if (!road) return null;

  // Retrieve historical state and events up to the selected step
  const histState = getHistoricalRoadState(selectedRoadId, currentPlaybackStepId);
  const events = getEventsUpToStep(selectedRoadId, currentPlaybackStepId);



  const getEventIcon = (type: string) => {
    switch (type) {
      case 'repair_start':
        return <Activity className="w-4 h-4 text-cyan-400" />;
      case 'repair_complete':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'budget_allocation':
        return <Coins className="w-4 h-4 text-amber-400" />;
      case 'contractor_change':
        return <HardHat className="w-4 h-4 text-indigo-400" />;
      case 'complaint_spike':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case 'audit_flag':
        return <ShieldAlert className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-950/40 border-red-900/60 text-red-400';
      case 'medium':
        return 'bg-amber-950/40 border-amber-900/60 text-amber-400';
      default:
        return 'bg-cyan-950/40 border-cyan-900/60 text-cyan-400';
    }
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'good': return 'text-emerald-400';
      case 'fair': return 'text-amber-400';
      case 'poor': return 'text-red-400';
      case 'under_construction': return 'text-cyan-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950/95 border-l border-border/80 text-foreground overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-border/60">
        <div>
          <span className="text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded bg-slate-900 border border-border text-slate-400">
            Audit Ledger
          </span>
          <h2 className="text-base font-black text-slate-100 uppercase tracking-wide mt-1.5 line-clamp-1">{road.name}</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Code: {road.roadCode} | Length: {road.lengthKm} km</p>
        </div>
        <button 
          onClick={() => setSelectedRoadId(null)} 
          className="p-1.5 rounded-lg border border-border/60 hover:border-cyan-500/50 hover:bg-slate-900 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Step Performance Snapshot */}
        <div className="glass-panel p-4 rounded-xl border border-border/60 space-y-4">
          <div className="flex items-center gap-1.5 border-b border-border/40 pb-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">Historical Status Card</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-slate-950/50 p-2.5 rounded border border-border/40 flex flex-col justify-center">
              <span className="text-[8px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Road Health</span>
              <span className={`text-base font-black ${getStatusColorClass(histState.status)}`}>
                {histState.healthScore}%
              </span>
              <span className="text-[7.5px] text-muted-foreground mt-0.5 italic capitalize">
                {histState.status.replace('_', ' ')}
              </span>
            </div>

            <div className="bg-slate-950/50 p-2.5 rounded border border-border/40 flex flex-col justify-center">
              <span className="text-[8px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Transparency</span>
              <span className="text-base font-black text-amber-400">
                {histState.transparencyScore}%
              </span>
              <span className="text-[7.5px] text-muted-foreground mt-0.5 italic">
                Integrity Grade
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[10px] border-b border-slate-900 pb-1.5">
              <span className="text-muted-foreground flex items-center gap-1">
                <HardHat className="w-3.5 h-3.5 text-cyan-450 shrink-0" />
                <span>Contractor:</span>
              </span>
              <span className="font-bold text-slate-200 truncate max-w-[150px]">{histState.contractorName}</span>
            </div>

            <div className="flex items-center justify-between text-[10px] border-b border-slate-900 pb-1.5">
              <span className="text-muted-foreground flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-cyan-450 shrink-0" />
                <span>Budget Spent:</span>
              </span>
              <span className="font-bold text-slate-200">
                {histState.budgetSpent > 0 ? formatCurrency(histState.budgetSpent) : '₹0'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-cyan-450 shrink-0" />
                <span>Active Complaints:</span>
              </span>
              <span className={`font-bold ${histState.activeComplaintsCount > 5 ? 'text-red-400 animate-pulse' : 'text-slate-200'}`}>
                {histState.activeComplaintsCount} Reports
              </span>
            </div>
          </div>
        </div>

        {/* Audit Log Chronology */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 border-b border-border/40 pb-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">Timeline Event Ledger</h3>
          </div>

          {events.length > 0 ? (
            <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-900">
              {events.map((e) => {
                const isExpanded = expandedEventId === e.id;
                
                return (
                  <div key={e.id} className="relative pl-9 text-left">
                    {/* Timeline Node dot */}
                    <div className="absolute left-[10.5px] top-1.5 w-3 h-3 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center z-10">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                    </div>

                    {/* Card container */}
                    <div className="glass-panel rounded-xl border border-border/40 overflow-hidden shadow-sm">
                      {/* Header toggle click */}
                      <button
                        onClick={() => setExpandedEventId(isExpanded ? null : e.id)}
                        className="w-full p-3 flex items-start gap-2.5 text-left cursor-pointer hover:bg-slate-900/30 transition-colors"
                      >
                        <span className="mt-0.5 shrink-0">{getEventIcon(e.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center flex-wrap gap-1.5">
                            <span className="text-[8px] font-black uppercase tracking-wider text-cyan-400">
                              {e.stepId.replace('-', ' ')}
                            </span>
                            <span className={`text-[7px] font-black uppercase px-1 py-0.2 rounded border shrink-0 ${getSeverityStyles(e.severity)}`}>
                              {e.severity}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-200 mt-1 leading-tight">{e.title}</h4>
                        </div>
                      </button>

                      {/* Expandable details content */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="border-t border-slate-900 bg-slate-950/60"
                          >
                            <div className="p-3 text-[10px] text-muted-foreground leading-normal space-y-2.5">
                              <p>{e.description}</p>
                              
                              {/* Metadata grid */}
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900 text-[9px]">
                                {e.contractorName && (
                                  <div>
                                    <span className="text-slate-400 block font-semibold mb-0.5">Linked Contractor</span>
                                    <span className="text-slate-300 font-bold">{e.contractorName}</span>
                                  </div>
                                )}
                                {e.budgetAllocated && (
                                  <div>
                                    <span className="text-slate-400 block font-semibold mb-0.5">Budget Action</span>
                                    <span className="text-emerald-400 font-bold">{formatCurrency(e.budgetAllocated)}</span>
                                  </div>
                                )}
                                {e.complaintsCount && (
                                  <div>
                                    <span className="text-slate-400 block font-semibold mb-0.5">Incident Density</span>
                                    <span className="text-rose-400 font-bold">{e.complaintsCount} Reports</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-muted-foreground bg-slate-950/20 rounded-lg border border-dashed border-border/40">
              No timeline events recorded yet. Scrub the timeline forward to trigger historical events.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
