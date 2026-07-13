import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Info, X, ChevronDown } from 'lucide-react';

const USSD_SHORTCODE = '*762392824#';

export default function USSDInfoBadge() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative">
      {/* Collapsed badge */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-cyan-700/30 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 hover:text-cyan-200 transition-all shrink-0 cursor-pointer text-[10px] font-semibold tracking-wide"
        title="Simulated USSD gateway for feature phones (demo)"
        aria-label={`Simulated USSD shortcode: ${USSD_SHORTCODE}. Click for details.`}
        aria-expanded={expanded}
      >
        <Phone className="w-3 h-3" />
        <span className="hidden sm:inline">{USSD_SHORTCODE}</span>
        <span className="sm:hidden">USSD</span>
        <span className="text-[7px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1 rounded-full tracking-wider ml-0.5">SIM</span>
        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded info panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 right-0 z-50 w-72 rounded-xl border border-cyan-800/40 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-cyan-900/20 overflow-hidden"
          >
            <div className="p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-cyan-950/60 border border-cyan-800/30 text-cyan-400">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-cyan-300 tracking-wider uppercase">
                    No Internet? <span className="text-[8px] text-amber-400 font-black ml-1">SIMULATED</span>
                  </span>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  aria-label="Close USSD info"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong className="text-amber-400">Demo simulation:</strong> Dial <code className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px] font-bold">{USSD_SHORTCODE}</code>{' '}
                from any phone to access ROADWATCH (in production, a telecom gateway would handle this):
              </p>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold mt-0.5 shrink-0">1.</span>
                  <span className="text-slate-300">Report a road issue</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold mt-0.5 shrink-0">2.</span>
                  <span className="text-slate-300">Check complaint status</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold mt-0.5 shrink-0">3.</span>
                  <span className="text-slate-300">Track public spending</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold mt-0.5 shrink-0">4.</span>
                  <span className="text-slate-300">Find responsible authority</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/60">
                <Info className="w-3 h-3 text-slate-500 shrink-0" />
                <p className="text-[10px] text-slate-500">
                  Works on any phone. Standard SMS rates apply.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}