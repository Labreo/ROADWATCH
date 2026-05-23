'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Road, Project, Contractor, Complaint } from '@/types';
import { diagnoseRoadSegment, DiagnosticFactor } from '@/services/diagnosticsEngine';
import { 
  Activity,
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle,
  Clock,
  Coins,
  Cpu,
  FileText,
  HardHat,
  HelpCircle,
  Info,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';

interface InfrastructureDiagnosticsProps {
  road: Road;
  projects: Project[];
  contractors: Contractor[];
  complaints: Complaint[];
}

export default function InfrastructureDiagnostics({
  road,
  projects,
  contractors,
  complaints
}: InfrastructureDiagnosticsProps) {
  const [expandedFactorId, setExpandedFactorId] = useState<string | null>(null);

  // Compute road diagnostics
  const diagnosis = diagnoseRoadSegment(road, projects, contractors, complaints);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-400 bg-red-950/50 border-red-900/60';
      case 'medium':
        return 'text-amber-400 bg-amber-950/50 border-amber-900/60';
      default:
        return 'text-cyan-400 bg-cyan-950/50 border-cyan-900/60';
    }
  };

  const getFactorIcon = (type: string) => {
    switch (type) {
      case 'drainage_failure':
        return <AlertTriangle className="w-4 h-4 text-blue-400" />;
      case 'repair_cycle':
        return <Activity className="w-4 h-4 text-orange-400" />;
      case 'contractor_reliability':
        return <HardHat className="w-4 h-4 text-indigo-400" />;
      case 'weather_degradation':
        return <Info className="w-4 h-4 text-cyan-400" />;
      case 'budget_inconsistency':
        return <Coins className="w-4 h-4 text-rose-400" />;
      case 'complaint_density':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return <Cpu className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="glass-panel p-4 rounded-xl border border-border/60 bg-slate-950/15 space-y-4">
      {/* Header section with scanning animation */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">
            Infrastructure Diagnostics
          </h3>
        </div>
        
        {/* Blinking telemetry pulse */}
        <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-2 py-0.5 rounded-lg select-none">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </div>
          <span className="text-[8px] uppercase font-bold tracking-wider text-cyan-400">Scan Active</span>
        </div>
      </div>

      {/* Dynamic Summary Card */}
      <div className="p-3 rounded-lg bg-slate-950/40 border border-border/30 text-[10.5px] leading-relaxed text-slate-350">
        <strong className="text-slate-200 block text-[9.5px] uppercase font-bold tracking-wider mb-1">
          Isolated Failure Summary
        </strong>
        <p className="font-medium text-slate-300">{diagnosis.overallSummary}</p>
      </div>

      {/* Contributing Factors Accordion list */}
      <div className="space-y-2.5">
        <h4 className="text-[9.5px] text-muted-foreground uppercase font-bold tracking-wider">
          Isolated Distress Drivers ({diagnosis.factors.length})
        </h4>

        {diagnosis.factors.length > 0 ? (
          <div className="space-y-2">
            {diagnosis.factors.map((f) => {
              const isExpanded = expandedFactorId === f.id;
              
              return (
                <div 
                  key={f.id} 
                  className={`border rounded-xl transition-all duration-300 overflow-hidden ${
                    isExpanded 
                      ? 'bg-slate-900/40 border-slate-700/60 shadow-md' 
                      : 'bg-slate-950/20 border-border/40 hover:border-slate-850'
                  }`}
                >
                  {/* Collapsed Header Clickable row */}
                  <button
                    onClick={() => setExpandedFactorId(isExpanded ? null : f.id)}
                    className="w-full p-3 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="shrink-0">{getFactorIcon(f.factorType)}</span>
                      <span className="text-xs font-bold text-slate-250 truncate">{f.title}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.2 border rounded ${getSeverityColor(f.severity)}`}>
                        {f.severity}
                      </span>
                    </div>
                  </button>

                  {/* Expandable Details container */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="border-t border-slate-900/60 bg-slate-950/60"
                      >
                        <div className="p-3.5 space-y-3.5 text-[10px] leading-relaxed">
                          {/* Failure Description */}
                          <div>
                            <span className="text-[8.5px] text-slate-400 block font-bold uppercase tracking-wider mb-1">
                              Structural Mechanics
                            </span>
                            <p className="text-slate-350">{f.summary}</p>
                          </div>

                          {/* Engineering Recommendation */}
                          <div>
                            <span className="text-[8.5px] text-cyan-450 block font-bold uppercase tracking-wider mb-1">
                              Recommended Mitigation Action
                            </span>
                            <p className="text-slate-300 font-semibold">{f.recommendation}</p>
                          </div>

                          {/* Supporting Evidence Chips */}
                          <div className="space-y-1.5 pt-1.5 border-t border-slate-900/80">
                            <span className="text-[8.5px] text-slate-450 block font-bold uppercase tracking-wider">
                              Supporting Telemetry Evidence
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {f.evidence.map((ev, idx) => (
                                <span 
                                  key={idx}
                                  className="inline-flex items-center gap-1 text-[8.5px] font-semibold bg-slate-900 hover:bg-slate-850 transition-colors text-slate-300 border border-slate-800 px-2 py-0.5 rounded-full"
                                >
                                  <FileText className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                                  <span>{ev}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-emerald-950/15 border border-emerald-900/30 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                Optimal Structural Integrity
              </h5>
              <p className="text-[9px] text-emerald-500/80 leading-normal mt-0.5">
                No active sub-base, contractor failure, drainage blockages, or monsoon damage cycles isolated. System monitors show normal wear curves.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Diagnostics telemetry confidence badge footer */}
      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[9px] text-muted-foreground select-none">
        <span className="flex items-center gap-1.5 font-medium">
          <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
          <span>Diagnostic Confidence:</span>
        </span>
        <span className="font-extrabold text-slate-300">
          {diagnosis.confidenceScore}% — <span className="text-cyan-400 font-medium">{diagnosis.confidenceLevel.split(' ')[0]}</span>
        </span>
      </div>
    </div>
  );
}
