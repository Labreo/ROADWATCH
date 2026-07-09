'use client';

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowRight, Ban, CopyPlus, X } from 'lucide-react';
import type { Complaint } from '@/types';
import ComplaintCard from './ComplaintCard';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface DuplicateComplaintDialogProps {
  /** The existing complaint returned by the 409 response */
  existingComplaint: Complaint;
  /** Called when user clicks "Link to existing" */
  onLink: (id: number) => void;
  /** Called when user clicks "Report anyway" */
  onForceSubmit: (existingComplaint: Complaint) => void;
  /** Called when user clicks "Cancel" or backdrop */
  onCancel: () => void;
}

// ─── Animation variants ─────────────────────────────────────────────────────

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const dialogVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', damping: 28, stiffness: 320, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    y: 30,
    scale: 0.97,
    transition: { duration: 0.18, ease: 'easeIn' },
  },
} as const;

// ─── Component ──────────────────────────────────────────────────────────────

export default function DuplicateComplaintDialog({
  existingComplaint,
  onLink,
  onForceSubmit,
  onCancel,
}: DuplicateComplaintDialogProps) {
  const handleLink = useCallback(() => {
    onLink(existingComplaint.id);
  }, [onLink, existingComplaint.id]);

  const handleForceSubmit = useCallback(() => {
    onForceSubmit(existingComplaint);
  }, [onForceSubmit, existingComplaint]);

  return (
    <AnimatePresence>
      <motion.div
        key="duplicate-dialog-backdrop"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4"
        onClick={onCancel}
      >
        {/* Backdrop blur */}
        <div className="absolute inset-0 bg-[#000000]/80 backdrop-blur-sm" />

        {/* Dialog panel */}
        <motion.div
          key="duplicate-dialog-panel"
          variants={dialogVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="relative w-full max-w-md z-10 overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-950/85 backdrop-blur-xl shadow-2xl shadow-amber-900/20"
        >
          {/* Gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

          {/* Close button */}
          <button
            type="button"
            onClick={onCancel}
            className="absolute top-3 right-3 z-20 w-7 h-7 flex items-center justify-center rounded-full bg-slate-900/80 border border-slate-800/60 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="relative z-10 p-5 space-y-4">
            {/* ── Header ── */}
            <div className="flex items-start gap-3 pr-6">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-950/50 border border-amber-800/40 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-slate-100 leading-tight">
                  Duplicate Report Detected
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  A similar complaint has already been filed at these coordinates. Review the
                  details below before proceeding.
                </p>
              </div>
            </div>

            {/* ── Existing complaint card ── */}
            <div className="border border-white/[0.06] rounded-xl bg-slate-950/50">
              <ComplaintCard complaint={existingComplaint} />
            </div>

            {/* ── Action buttons ── */}
            <div className="flex flex-col gap-2 pt-1">
              {/* Link to existing */}
              <button
                type="button"
                onClick={handleLink}
                className="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/30 border border-cyan-800/40 rounded-xl py-2.5 hover:bg-cyan-950/50 hover:border-cyan-700/60 transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Link to Existing Complaint
              </button>

              {/* Report anyway */}
              <button
                type="button"
                onClick={handleForceSubmit}
                className="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/20 border border-amber-800/30 rounded-xl py-2.5 hover:bg-amber-950/40 hover:border-amber-700/50 transition-colors"
              >
                <CopyPlus className="w-3.5 h-3.5" />
                Report Anyway
              </button>

              {/* Cancel */}
              <button
                type="button"
                onClick={onCancel}
                className="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-900/50 border border-slate-800/50 rounded-xl py-2.5 hover:bg-slate-900/80 hover:border-slate-700/60 hover:text-slate-400 transition-colors"
              >
                <Ban className="w-3.5 h-3.5" />
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}