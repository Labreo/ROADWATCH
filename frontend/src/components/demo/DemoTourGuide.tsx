import React, { useEffect } from 'react';
import { Play, ArrowRight, ArrowLeft, X, Sparkles, AlertCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { AppView } from '@/store/useStore';

interface DemoTourGuideProps {
  currentStep: number;
  setStep: (step: number) => void;
  onExit: () => void;
}

interface TourStep {
  title: string;
  description: string;
  view: AppView;
  roadId: number | null;
  complaintId: number | null;
  highlightSelector?: string; // CSS selector to highlight if any
}

const steps: TourStep[] = [
  {
    title: "1. Interactive Spatial Audit Map",
    description: "We are starting in the **Road Registry**. We have selected **S.V. Road** which is currently flagged in **poor (red)** condition. Click 'Next Step' to ask the chatbot about it.",
    view: 'roads',
    roadId: 3,
    complaintId: null,
    highlightSelector: '.leaflet-container'
  },
  {
    title: "2. Non-Hallucinating RAG Chatbot",
    description: "Click the **Ask AI** button in the bottom right corner, and click the suggested prompt: *'Why is S.V. Road damaged again?'* to see the chatbot fetch SQLite facts deterministically.",
    view: 'roads',
    roadId: 3,
    complaintId: null,
    highlightSelector: '.custom-marker-wrapper'
  },
  {
    title: "3. Real-Time Operations Control Center",
    description: "Let's check the **Operations Center** using the Sidebar. Here, we selected the *'Uneven Paver Blocks'* complaint. Go ahead and dispatch a repair contractor!",
    view: 'admin',
    roadId: null,
    complaintId: 3,
    highlightSelector: '[aria-label="Main Navigation Sidebar"]'
  },
  {
    title: "4. Budget Audits & Transparency Ledgers",
    description: "Finally, let's verify the **Budget Audits** tab. S.V. Road's Transparency Scorecard lists active budget variances, audit deduction details, and project delayed trends.",
    view: 'budgets',
    roadId: 3,
    complaintId: null,
    highlightSelector: '.glass-panel'
  }
];

export default function DemoTourGuide({ currentStep, setStep, onExit }: DemoTourGuideProps) {
  const { 
    setActiveView, 
    setSelectedRoadId, 
    setSelectedComplaintId 
  } = useStore();

  const stepData = steps[currentStep - 1];

  // Sync store state when step changes
  useEffect(() => {
    if (stepData) {
      setActiveView(stepData.view);
      setSelectedRoadId(stepData.roadId);
      setSelectedComplaintId(stepData.complaintId);
      
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
        }, 300);
      }
    }
  }, [currentStep, stepData, setActiveView, setSelectedRoadId, setSelectedComplaintId]);

  // Cleanup highlights on unmount
  useEffect(() => {
    return () => {
      document.querySelectorAll('.tour-highlight-active').forEach(el => {
        el.classList.remove('tour-highlight-active');
      });
    };
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length) {
      setStep(currentStep + 1);
    } else {
      onExit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 right-6 lg:left-72 z-[1050] bg-gradient-to-r from-slate-900 via-cyan-950/90 to-indigo-950/90 border border-cyan-500/80 p-4 rounded-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-bottom duration-300 select-none">
      
      {/* Step Info */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="p-2 rounded-lg bg-cyan-500 text-slate-950 shrink-0 mt-0.5 shadow-md shadow-cyan-500/25">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-black uppercase text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40 tracking-wider">
              Guided Tour step {currentStep} of {steps.length}
            </span>
            <span className="text-[10px] font-bold text-slate-200">
              {stepData?.title}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-300 font-medium max-w-3xl">
            {stepData?.description.split('**').map((txt, idx) => 
              idx % 2 === 1 ? <strong key={idx} className="text-cyan-400 font-extrabold">{txt}</strong> : txt
            )}
          </p>
        </div>
      </div>

      {/* Navigation actions */}
      <div className="flex items-center justify-end gap-2.5 shrink-0 border-t border-border/20 pt-3 md:pt-0 md:border-t-0">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className={`p-2.5 rounded-xl border border-border/80 text-slate-200 hover:text-white bg-slate-950/50 hover:bg-slate-900 transition-all flex items-center gap-1 text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 ${
            currentStep === 1 ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <button
          onClick={handleNext}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-black hover:bg-cyan-400 transition-all flex items-center gap-1.5 text-[10px] uppercase tracking-widest shadow-md shadow-cyan-500/20 cursor-pointer active:scale-95"
        >
          {currentStep === steps.length ? 'Finish Tour' : 'Next Step'}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <div className="h-6 w-[1px] bg-border/40 mx-1 hidden md:block" />

        <button
          onClick={onExit}
          className="p-2.5 rounded-xl border border-border/60 hover:bg-red-950/20 text-muted-foreground hover:text-red-400 transition-all flex items-center justify-center shrink-0 cursor-pointer"
          title="Exit Tour"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
