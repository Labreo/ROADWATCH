'use client';

import React, { useEffect, useState } from 'react';
import { Play, ArrowRight, ArrowLeft, X, Sparkles, Activity, ShieldCheck, Coins, HardHat, AlertCircle } from 'lucide-react';
import { useStore, AppView } from '@/store/useStore';

interface DemoTourGuideProps {
  currentStep: number;
  setStep: (step: number) => void;
  onExit: () => void;
  onLaunchDemo?: () => void;
}

interface TourStep {
  title: string;
  description: string;
  view: AppView;
  roadId: number | null;
  complaintId: number | null;
  highlightSelector?: string;
  viewport: { center: [number, number]; zoom: number };
}

const steps: TourStep[] = [
  {
    title: "1. Recurring Road Failure Scenario",
    description: "Centering map on **S.V. Road** (poor condition). The **Infrastructure Diagnostics** system has isolated drainage defects and short repair cycles. Click **Inspect Sub-Base** below to run a compaction audit.",
    view: 'roads',
    roadId: 3,
    complaintId: null,
    highlightSelector: '.glass-panel',
    viewport: { center: [19.1020, 72.8360], zoom: 13.5 }
  },
  {
    title: "2. Budget Transparency Scenario",
    description: "Opening **Budget Audits**. S.V. Road shows high overruns and blacklisted contractor warnings (Omega Infrastructure). Click **Audit Paving Mix** below to review core density logs.",
    view: 'budgets',
    roadId: 3,
    complaintId: null,
    highlightSelector: '.glass-panel',
    viewport: { center: [19.1020, 72.8360], zoom: 13.5 }
  },
  {
    title: "3. Citizen Complaint Routing Scenario",
    description: "Zooming to Bandra West. Click **Simulate Waterlogging Report** to trigger a citizen filing. Watch it queue locally (simulating offline synchronization) and auto-route to supervising ward gates.",
    view: 'roads',
    roadId: 3,
    complaintId: null,
    highlightSelector: '.leaflet-container',
    viewport: { center: [19.0980, 72.8362], zoom: 16 }
  },
  {
    title: "4. Authority Triage & Dispatch Scenario",
    description: "Inside the **Operations Center** triage desk. We see our routed waterlogging complaint. Click **Dispatch Zenith Construction** to immediately issue a work order and resolve the hazard.",
    view: 'admin',
    roadId: null,
    complaintId: 3, // Paver block caving on S.V. Road
    highlightSelector: '[aria-label="Main Navigation Sidebar"]',
    viewport: { center: [19.1020, 72.8360], zoom: 13.5 }
  }
];

export default function DemoTourGuide({ currentStep, setStep, onExit, onLaunchDemo }: DemoTourGuideProps) {
  const { 
    setActiveView, 
    setSelectedRoadId, 
    setSelectedComplaintId,
    setMapViewport,
    addComplaint,
    complaintsList,
    updateComplaint
  } = useStore();

  const [demoActionStatus, setDemoActionStatus] = useState<string>('');
  const [soundPulse, setSoundPulse] = useState(false);

  const stepData = steps[currentStep - 1];

  // Sync store state and trigger camera motion when step changes
  useEffect(() => {
    if (stepData) {
      setActiveView(stepData.view);
      setSelectedRoadId(stepData.roadId);
      
      // If we simulated a complaint, select it in step 4
      if (currentStep === 4 && complaintsList.some(c => c.id === 8899)) {
        setSelectedComplaintId(8899);
      } else {
        setSelectedComplaintId(stepData.complaintId);
      }

      setMapViewport(stepData.viewport);
      
      // Clean up previous highlights
      document.querySelectorAll('.tour-highlight-active').forEach(el => {
        el.classList.remove('tour-highlight-active');
      });

      // Apply highlight class to element selector
      if (stepData.highlightSelector) {
        setTimeout(() => {
          const target = document.querySelector(stepData.highlightSelector!);
          if (target) {
            target.classList.add('tour-highlight-active');
          }
        }, 400);
      }
    }
  }, [currentStep, stepData, setActiveView, setSelectedRoadId, setSelectedComplaintId, setMapViewport, complaintsList]);

  // Cleanup highlights on unmount
  useEffect(() => {
    return () => {
      document.querySelectorAll('.tour-highlight-active').forEach(el => {
        el.classList.remove('tour-highlight-active');
      });
      setMapViewport(null);
    };
  }, [setMapViewport]);

  const triggerAudioTick = () => {
    // Subtle audio-ready visual microinteraction
    setSoundPulse(true);
    setTimeout(() => setSoundPulse(false), 300);
  };

  const handleNext = () => {
    triggerAudioTick();
    if (currentStep < steps.length) {
      setStep(currentStep + 1);
    } else {
      // Cleanup simulated complaint if any on exit
      onExit();
    }
  };

  const handleBack = () => {
    triggerAudioTick();
    if (currentStep > 1) {
      setStep(currentStep - 1);
    }
  };

  // Clickable scenario simulations
  const runScenarioAction = () => {
    triggerAudioTick();
    if (currentStep === 1) {
      setDemoActionStatus('compaction_audited');
    } else if (currentStep === 2) {
      setDemoActionStatus('aggregate_audited');
    } else if (currentStep === 3) {
      // Simulate Citizen Waterlogging complaint filing on S.V. Road
      const simulatedTicket = {
        id: 8899,
        title: '[Simulated] Waterlogging outside Bandra Station',
        description: 'Heavy precipitation is backing up water near station entrance. Clogged drain grates observed. S.V. Road base compromised.',
        category: 'waterlogging' as const,
        geometry: { type: 'Point' as const, coordinates: [72.8362, 19.0980] as [number, number] },
        status: 'routed' as const,
        assignedAuthorityId: 1,
        roadId: 3,
        createdAt: new Date().toISOString()
      };
      
      // Only add if not already in list
      if (!complaintsList.some(c => c.id === 8899)) {
        addComplaint(simulatedTicket);
      }
      setSelectedRoadId(3);
      setSelectedComplaintId(8899);
      setDemoActionStatus('complaint_submitted');
    } else if (currentStep === 4) {
      // Dispatch Zenith contractor to repair waterlogging caving
      // If we added simulated ticket 8899, update it, otherwise update ticket 3
      const targetId = complaintsList.some(c => c.id === 8899) ? 8899 : 3;
      updateComplaint(targetId, { status: 'in_progress' });
      setDemoActionStatus('contractor_dispatched');
    }
  };

  return (
    <div className={`fixed bottom-6 left-6 right-6 lg:left-72 z-[1050] bg-zinc-950/95 border border-zinc-800/80 p-5 rounded-2xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all duration-300 ${
      soundPulse ? 'scale-[1.01] border-zinc-700 shadow-zinc-950/65' : 'shadow-zinc-950/50'
    }`}>
      
      {/* Dynamic Scenario HUD */}
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div className="p-2.5 rounded-xl bg-zinc-900 text-zinc-100 shrink-0 mt-0.5 border border-zinc-800 relative shadow-inner">
          <Sparkles className="w-4 h-4" />
          {soundPulse && (
            <span className="absolute inset-0 rounded-xl border border-zinc-500 animate-ping opacity-30"></span>
          )}
        </div>

        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[8px] font-extrabold uppercase text-zinc-400 bg-zinc-900/60 px-2 py-0.5 rounded border border-zinc-800/60 tracking-wider">
              Guided Demo Step {currentStep} of {steps.length}
            </span>
            <span className="text-xs font-bold text-slate-100 uppercase tracking-wide">
              {stepData?.title}
            </span>
          </div>

          <p className="text-[11px] leading-relaxed text-zinc-300 font-medium max-w-3xl">
            {stepData?.description.split('**').map((txt, idx) => 
              idx % 2 === 1 ? <strong key={idx} className="text-zinc-100 font-semibold border-b border-zinc-800">{txt}</strong> : txt
            )}
          </p>

          {/* Action Simulation Controls */}
          <div className="pt-2 flex items-center gap-3">
            {currentStep === 1 && (
              demoActionStatus !== 'compaction_audited' ? (
                <button
                  onClick={runScenarioAction}
                  className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white cursor-pointer active:scale-95 transition-all"
                >
                  Inspect Sub-Base
                </button>
              ) : (
                <span className="text-[9.5px] font-extrabold text-emerald-400 flex items-center gap-1 bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-1 rounded-lg">
                  <ShieldCheck className="w-3.5 h-3.5" /> Core compaction audited: 94.2% compaction index (Good)
                </span>
              )
            )}

            {currentStep === 2 && (
              demoActionStatus !== 'aggregate_audited' ? (
                <button
                  onClick={runScenarioAction}
                  className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white cursor-pointer active:scale-95 transition-all"
                >
                  Audit Paving Mix
                </button>
              ) : (
                <span className="text-[9.5px] font-extrabold text-emerald-400 flex items-center gap-1 bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-1 rounded-lg">
                  <Coins className="w-3.5 h-3.5" /> Core samples scanned: Bitumen content 5.4% (Compliance: 100%)
                </span>
              )
            )}

            {currentStep === 3 && (
              demoActionStatus !== 'complaint_submitted' ? (
                <button
                  onClick={runScenarioAction}
                  className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white cursor-pointer active:scale-95 transition-all"
                >
                  Simulate Waterlogging Report
                </button>
              ) : (
                <span className="text-[9.5px] font-extrabold text-emerald-400 flex items-center gap-1 bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-1 rounded-lg">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" /> Ticket #RW-2026-8899 Synced & Auto-Routed to Ward K-West!
                </span>
              )
            )}

            {currentStep === 4 && (
              demoActionStatus !== 'contractor_dispatched' ? (
                <button
                  onClick={runScenarioAction}
                  className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white cursor-pointer active:scale-95 transition-all"
                >
                  Dispatch Zenith Construction
                </button>
              ) : (
                <span className="text-[9.5px] font-extrabold text-emerald-400 flex items-center gap-1 bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-1 rounded-lg">
                  <HardHat className="w-3.5 h-3.5" /> Zenith Group Dispatched. Work order: WO-KW-8921. GPS Active.
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* Presentation Controller */}
      <div className="flex items-center justify-end gap-2.5 shrink-0 border-t border-border/20 pt-3 md:pt-0 md:border-t-0">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className={`p-2.5 rounded-xl border border-zinc-850 text-slate-300 hover:text-white bg-zinc-900/40 hover:bg-zinc-900 transition-all flex items-center gap-1 text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 ${
            currentStep === 1 ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <button
          onClick={handleNext}
          className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold transition-all flex items-center gap-1.5 text-[10px] uppercase tracking-wider shadow-sm cursor-pointer active:scale-95"
        >
          {currentStep === steps.length ? 'Finish Tour' : 'Next Step'}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {currentStep === steps.length && onLaunchDemo && (
          <button
            onClick={onLaunchDemo}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition-all flex items-center gap-1.5 text-[10px] uppercase tracking-wider shadow-sm cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Try Demo Mode
          </button>
        )}

        <div className="h-6 w-[1px] bg-border/40 mx-1 hidden md:block" />

        <button
          onClick={onExit}
          className="p-2.5 rounded-xl border border-zinc-800/80 hover:bg-zinc-900/60 text-muted-foreground hover:text-red-400 transition-all flex items-center justify-center shrink-0 cursor-pointer"
          title="Exit Tour"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
