'use client';

import React, { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Transient confirmation toast shown after the offline sync queue is pushed to
 * the server (Flow E / KA-5). Auto-dismisses after a few seconds; the store
 * holds the current toast so any surface can trigger it.
 */
export default function SyncToast() {
  const syncToast = useStore(state => state.syncToast);
  const dismissSyncToast = useStore(state => state.dismissSyncToast);

  useEffect(() => {
    if (!syncToast) return;
    const timer = setTimeout(() => dismissSyncToast(), 5000);
    return () => clearTimeout(timer);
  }, [syncToast, dismissSyncToast]);

  const isSuccess = syncToast?.tone === 'success';

  return (
    <div className="fixed bottom-6 right-6 z-[2000] pointer-events-none">
      <AnimatePresence>
        {syncToast && (
          <motion.div
            key={syncToast.id}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md max-w-sm ${
              isSuccess
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-100'
            }`}
          >
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-xl shrink-0 ${
                isSuccess
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {isSuccess ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wider">
                {isSuccess ? 'Sync complete' : 'Sync partial'}
              </p>
              <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">{syncToast.message}</p>
            </div>
            <button
              onClick={dismissSyncToast}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-100 transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
