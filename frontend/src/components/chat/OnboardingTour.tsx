import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, ArrowRight, ArrowLeft, SkipForward, Sparkles, Search, DollarSign, Flag, Smartphone } from 'lucide-react';

const TOUR_STEPS = [
  {
    title: 'Welcome to ROADWATCH',
    description: 'AI-powered civic chatbot for road infrastructure accountability. Ask about any road, track spending, or report issues.',
    icon: <Sparkles className="w-5 h-5" />,
    highlight: 'chat-header',
  },
  {
    title: 'Road Quality Monitoring',
    description: 'Type a road name like "Show me NH-48" or "What is the status of SV Road?" Get road type, contractor, last relay date, and condition.',
    icon: <Search className="w-5 h-5" />,
    highlight: 'chat-input',
  },
  {
    title: 'Track Public Spending',
    description: 'Ask "How much budget was spent on WEH?" to see sanctioned vs spent amounts, funding sources, and transparency scores.',
    icon: <DollarSign className="w-5 h-5" />,
    highlight: 'budget-area',
  },
  {
    title: 'Report Issues + Stay Updated',
    description: 'File a complaint via chat or the wizard. Reports queue locally when offline and sync automatically once you reconnect — no data lost on a weak connection.',
    icon: <Smartphone className="w-5 h-5" />,
    highlight: 'offline-area',
  },
];

const STORAGE_KEY = 'rw_onboarding_complete';

export default function OnboardingTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  // Check if already completed
  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (done === 'true') {
      setVisible(false);
      onClose();
    }
  }, [onClose]);

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      complete();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const complete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
    onClose();
  };

  const skip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
    onClose();
  };

  if (!visible) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={skip} />

          {/* Tour card */}
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-cyan-800/40 bg-gradient-to-br from-slate-900/95 via-slate-900 to-slate-950/95 backdrop-blur-2xl shadow-2xl shadow-cyan-900/30 overflow-hidden"
          >
            {/* Glow accent */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="p-5 space-y-4">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-600/20 to-indigo-600/20 border border-cyan-700/30 text-cyan-400">
                    {current.icon}
                  </div>
                  <h2 className="text-sm font-bold text-slate-100">{current.title}</h2>
                </div>
                <button
                  onClick={skip}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  aria-label="Skip tour"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed">
                {current.description}
              </p>

              {/* Example queries */}
              {step === 0 && (
                <div className="bg-slate-800/50 rounded-lg p-2.5 space-y-1">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Try asking:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['"Who repaired SV Road?"', '"Show me the budget"', '"Report a pothole"'].map((q, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-cyan-950/40 border border-cyan-800/30 text-[10px] text-cyan-300 font-mono">
                        {q}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="bg-slate-800/50 rounded-lg p-2.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Data You Get:</p>
                  <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-slate-300">
                    <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-cyan-400" /> Road Type</span>
                    <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-cyan-400" /> Last Relay Date</span>
                    <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-cyan-400" /> Contractor Name</span>
                    <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-cyan-400" /> Current Status</span>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="bg-slate-800/50 rounded-lg p-2.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Budget Transparency Includes:</p>
                  <div className="mt-1 space-y-1 text-[10px] text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400">✓</span> Sanctioned vs Spent
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400">✓</span> Funding Source Breakdown
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400">✓</span> Variance Reasons + Approval Trail
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400">✓</span> Value-for-Money Score
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="bg-slate-800/50 rounded-lg p-2.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Low-Bandwidth Ready:</p>
                  <div className="mt-1.5 space-y-1.5 text-[10px] text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <span className="text-cyan-400">🌐</span> Works in any modern mobile browser — no install
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-cyan-400">📴</span> Full offline capture — reports queue locally
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-cyan-400">🔄</span> Auto-sync the moment the connection returns
                    </div>
                  </div>
                </div>
              )}

              {/* Progress dots */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5">
                  {TOUR_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                        i === step
                          ? 'bg-cyan-400 w-4'
                          : i < step
                          ? 'bg-cyan-700'
                          : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={skip}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <SkipForward className="w-3 h-3" />
                    Skip
                  </button>

                  {step > 0 && (
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700/50 text-[10px] font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Back
                    </button>
                  )}

                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 text-[10px] font-bold text-white hover:from-cyan-500 hover:to-indigo-500 transition-all cursor-pointer shadow-lg shadow-cyan-900/30"
                  >
                    {isLast ? 'Done' : 'Next'}
                    {!isLast && <ArrowRight className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useOnboarding() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (done !== 'true') {
      // Auto-show after a short delay on first visit
      const timer = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  return {
    showTour,
    setShowTour,
    isFirstVisit: typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) !== 'true',
  };
}