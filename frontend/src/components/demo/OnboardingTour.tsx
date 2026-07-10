'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, MessageSquare, Map, Coins, FileText, Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface Step {
  title: string;
  description: string;
  highlightSelector: string;
  placement: 'bottom' | 'top' | 'left' | 'right';
  exampleQuery?: string;
  icon: React.ReactNode;
}

const steps: Step[] = [
  {
    title: 'Chat Assistant',
    description:
      'This is your AI-powered assistant. Ask questions about roads, budgets, contractors, or file complaints — all in natural language.',
    highlightSelector: '[aria-label="Main Navigation Sidebar"]',
    placement: 'right',
    icon: <MessageSquare className="w-4 h-4" />,
    exampleQuery: "How is Western Express Highway doing?",
  },
  {
    title: 'Geospatial Map',
    description:
      'Explore road conditions on an interactive map. Click any road segment to see details, complaints, and contractor history.',
    highlightSelector: '[aria-label="Main Navigation Sidebar"]',
    placement: 'right',
    icon: <Map className="w-4 h-4" />,
  },
  {
    title: 'Budget Compliance',
    description:
      'Track how tax money is spent on road infrastructure. View budget allocations, spending variances, and project delays.',
    highlightSelector: '[aria-label="Main Navigation Sidebar"]',
    placement: 'right',
    icon: <Coins className="w-4 h-4" />,
  },
  {
    title: 'Complaints',
    description:
      'Report road defects like potholes, broken footpaths, or waterlogging. Track the status of your reports and see how they are routed.',
    highlightSelector: '[aria-label="Main Navigation Sidebar"]',
    placement: 'right',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    title: 'Try Asking the AI',
    description:
      'Tap the chip below to ask about a specific road. The AI will query real infrastructure data and show you maps, budgets, and contractor scores.',
    highlightSelector: '[aria-label="Main Navigation Sidebar"]',
    placement: 'right',
    icon: <Sparkles className="w-4 h-4" />,
    exampleQuery: "How is Western Express Highway doing?",
  },
];

export default function OnboardingTour() {
  const { setActiveView, setHasSeenOnboarding, setSearchQuery } = useStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  const step = steps[currentStep];

  const repositionTooltip = useCallback(() => {
    const target = document.querySelector(step.highlightSelector);
    if (!target) {
      setTooltipStyle({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
      return;
    }
    const rect = target.getBoundingClientRect();
    const baseStyle: React.CSSProperties = { position: 'fixed', zIndex: 1060 };

    switch (step.placement) {
      case 'right':
        baseStyle.left = `${rect.right + 16}px`;
        baseStyle.top = `${rect.top + rect.height / 2}px`;
        baseStyle.transform = 'translateY(-50%)';
        break;
      case 'bottom':
        baseStyle.left = `${rect.left + rect.width / 2}px`;
        baseStyle.top = `${rect.bottom + 16}px`;
        baseStyle.transform = 'translateX(-50%)';
        break;
      case 'top':
        baseStyle.left = `${rect.left + rect.width / 2}px`;
        baseStyle.top = `${rect.top - 16}px`;
        baseStyle.transform = 'translate(-50%, -100%)';
        break;
      case 'left':
        baseStyle.left = `${rect.left - 16}px`;
        baseStyle.top = `${rect.top + rect.height / 2}px`;
        baseStyle.transform = 'translate(-100%, -50%)';
        break;
    }
    setTooltipStyle(baseStyle);
  }, [currentStep, step]);

  useEffect(() => {
    repositionTooltip();
    const handleResize = () => repositionTooltip();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [repositionTooltip]);

  useEffect(() => {
    // Apply highlight to target element
    const target = document.querySelector(step.highlightSelector);
    document.querySelectorAll('.onboarding-highlight').forEach(el => el.classList.remove('onboarding-highlight'));
    if (target) {
      target.classList.add('onboarding-highlight');
    }
    return () => {
      document.querySelectorAll('.onboarding-highlight').forEach(el => el.classList.remove('onboarding-highlight'));
    };
  }, [currentStep, step.highlightSelector]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    setHasSeenOnboarding(true);
    setActiveView('chat');
  };

  const handleSkip = () => {
    setHasSeenOnboarding(true);
    setActiveView('chat');
  };

  const handleExampleQuery = () => {
    setActiveView('chat');
    handleFinish();
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 z-[1050] bg-black/60 backdrop-blur-sm" />

      {/* Tooltip card */}
      <div style={tooltipStyle} className="max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="glass-panel rounded-2xl p-4 border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {step.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[11px] font-black text-slate-100 uppercase tracking-wider">
                {step.title}
              </h3>
              <span className="text-[8px] text-cyan-500/60 font-bold">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-[10.5px] text-slate-300 leading-relaxed font-medium">
            {step.description}
          </p>

          {/* Example query chip */}
          {step.exampleQuery && (
            <button
              onClick={handleExampleQuery}
              className="w-full text-left px-3 py-2 rounded-xl bg-cyan-950/30 border border-cyan-700/30 hover:border-cyan-500/50 text-cyan-400 text-[10px] font-bold transition-all flex items-center gap-2"
            >
              <Sparkles className="w-3 h-3 shrink-0" />
              <span className="truncate">{step.exampleQuery}</span>
            </button>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep ? 'bg-cyan-400 w-3' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSkip}
                className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold text-slate-500 hover:text-slate-300 transition-colors"
              >
                Skip
              </button>
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="p-1.5 rounded-lg border border-white/[0.06] hover:border-cyan-500/30 text-slate-400 hover:text-cyan-400 transition-all"
                  aria-label="Previous step"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-[9px] font-black hover:bg-cyan-400 transition-all flex items-center gap-1"
              >
                {currentStep < steps.length - 1 ? (
                  <>Next <ChevronRight className="w-3 h-3" /></>
                ) : (
                  'Done'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
