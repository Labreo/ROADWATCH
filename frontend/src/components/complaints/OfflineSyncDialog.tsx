'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Ban,
  CopyCheck,
  ChevronDown,
  Server,
  Smartphone,
  Loader2,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useOfflineSync } from '@/composables/useOfflineSync';
import type { SyncQueueItem } from '@/types';

// ─── Status colours & labels ────────────────────────────────────────────────

const STATUS_META = {
  pending: {
    icon: Clock,
    label: 'Pending',
    iconClass: 'text-slate-400',
    dotClass: 'bg-slate-500',
    rowClass: 'border-slate-800/40',
  },
  syncing: {
    icon: Loader2,
    label: 'Syncing',
    iconClass: 'text-cyan-400',
    dotClass: 'bg-cyan-500',
    rowClass: 'border-cyan-800/40',
  },
  synced: {
    icon: CheckCircle2,
    label: 'Synced',
    iconClass: 'text-green-400',
    dotClass: 'bg-green-500',
    rowClass: 'border-green-800/20',
  },
  failed: {
    icon: AlertTriangle,
    label: 'Failed',
    iconClass: 'text-red-400',
    dotClass: 'bg-red-500',
    rowClass: 'border-red-800/30',
  },
} as const;

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
    transition: { type: 'spring' as const, damping: 28, stiffness: 320, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    y: 30,
    scale: 0.97,
    transition: { duration: 0.18, ease: 'easeIn' as const },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -16, height: 0 },
  visible: {
    opacity: 1,
    x: 0,
    height: 'auto',
    transition: { type: 'spring' as const, damping: 24, stiffness: 280, mass: 0.6 },
  },
  exit: {
    opacity: 0,
    x: 16,
    height: 0,
    transition: { duration: 0.15, ease: 'easeIn' as const },
  },
};

// ─── Conflict card variants ─────────────────────────────────────────────────

const conflictBackdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const conflictPanelVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 26, stiffness: 300, mass: 0.7 },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 10,
    transition: { duration: 0.15 },
  },
};

// ─── Props ──────────────────────────────────────────────────────────────────

export interface OfflineSyncDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog is dismissed (backdrop click, X, Cancel) */
  onClose: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function countByStatus(items: SyncQueueItem[]) {
  let pending = 0,
    syncing = 0,
    synced = 0,
    failed = 0;
  for (const item of items) {
    switch (item.status) {
      case 'syncing':
        syncing++;
        break;
      case 'failed':
        failed++;
        break;
      default:
        pending++;
        break;
    }
  }
  return { pending, syncing, synced, failed };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function OfflineSyncDialog({ open, onClose }: OfflineSyncDialogProps) {
  const offlineQueue = useStore((s) => s.offlineQueue);
  const isOnline = useStore((s) => s.isOnline);
  const processSyncQueue = useStore((s) => s.processSyncQueue);
  const retrySyncItem = useStore((s) => s.retrySyncItem);
  const discardSyncItem = useStore((s) => s.discardSyncItem);

  const { isSyncing, syncProgress, conflicts, resolveConflict } = useOfflineSync();
  const [activeConflictId, setActiveConflictId] = useState<string | null>(null);
  const [resolvingConflictId, setResolvingConflictId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  // ── Derived ───────────────────────────────────────────────────────────

  const counts = useMemo(() => countByStatus(offlineQueue), [offlineQueue]);
  const hasItems = offlineQueue.length > 0;
  const hasFailed = counts.failed > 0;
  const hasConflicts = conflicts.length > 0;

  const sortedQueue = useMemo(() => {
    const sortOrder: ReadonlyArray<string | undefined> = ['syncing', 'pending', 'failed', 'synced'];
    return [...offlineQueue].sort((a, b) => {
      const aIdx = sortOrder.indexOf(a.status);
      const bIdx = sortOrder.indexOf(b.status);
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
    });
  }, [offlineQueue]);

  const activeConflict = useMemo(
    () => conflicts.find((c) => c.id === activeConflictId) ?? null,
    [conflicts, activeConflictId]
  );

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleSyncAll = useCallback(() => {
    if (isOnline && !isSyncing) {
      processSyncQueue();
    }
  }, [isOnline, isSyncing, processSyncQueue]);

  const handleRetry = useCallback(
    async (id: string) => {
      setRetryingId(id);
      try {
        await retrySyncItem(id);
      } finally {
        setRetryingId(null);
      }
    },
    [retrySyncItem]
  );

  const handleDiscard = useCallback(
    async (id: string) => {
      await discardSyncItem(id);
    },
    [discardSyncItem]
  );

  const handleDiscardAll = useCallback(async () => {
    if (clearingAll) return;
    setClearingAll(true);
    try {
      for (const item of offlineQueue) {
        await discardSyncItem(item.id);
      }
    } finally {
      setClearingAll(false);
    }
  }, [clearingAll, offlineQueue, discardSyncItem]);

  const handleResolveConflict = useCallback(
    async (resolution: 'keep_local' | 'keep_server' | 'discard') => {
      if (!activeConflict || resolvingConflictId) return;
      setResolvingConflictId(activeConflict.id);
      try {
        await resolveConflict(activeConflict.id, resolution);
        setActiveConflictId(null);
      } finally {
        setResolvingConflictId(null);
      }
    },
    [activeConflict, resolvingConflictId, resolveConflict]
  );

  // ── Empty state ───────────────────────────────────────────────────────

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex items-center justify-center w-12 h-12 rounded-full bg-green-950/40 border border-green-800/30">
        <CheckCircle2 className="w-6 h-6 text-green-400" />
      </div>
      <p className="text-sm font-bold text-slate-300">All Caught Up</p>
      <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">
        Your offline queue is empty. No pending sync items.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-4 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-900/60 border border-slate-800/60 rounded-xl hover:bg-slate-900/80 hover:text-slate-300 transition-colors"
      >
        Close
      </button>
    </div>
  );

  // ── Conflict dialog overlay ───────────────────────────────────────────

  const renderConflictOverlay = () => (
    <AnimatePresence>
      {activeConflict && (
        <motion.div
          key="conflict-backdrop"
          variants={conflictBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.15 }}
          className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-4"
          onClick={() => {
            if (!resolvingConflictId) setActiveConflictId(null);
          }}
        >
          {/* Sub-backdrop */}
          <div className="absolute inset-0 bg-[#000000]/70 backdrop-blur-sm rounded-2xl" />

          <motion.div
            key="conflict-panel"
            variants={conflictPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-xl border border-amber-500/25 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-amber-900/20"
          >
            {/* Accent */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

            <div className="relative z-10 p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start gap-2.5 pr-5">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-950/50 border border-amber-800/40 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-extrabold text-slate-100">
                    Sync Conflict
                  </h4>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
                    A similar report already exists on the server. Choose how to resolve.
                  </p>
                </div>
              </div>

              {/* Diff preview */}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 text-[10px]">
                {/* Local */}
                <div className="p-2 rounded-lg border border-cyan-800/30 bg-cyan-950/20 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Smartphone className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="font-bold text-cyan-300 uppercase tracking-wider">Local</span>
                  </div>
                  <p className="text-slate-300 truncate font-medium">
                    {activeConflict.localItem.payload?.title ?? 'Untitled'}
                  </p>
                  <p className="text-slate-500 truncate">
                    {activeConflict.localItem.payload?.category ?? 'General'}
                  </p>
                </div>

                {/* VS Badge */}
                <div className="flex items-center justify-center">
                  <span className="text-[9px] font-black text-slate-600 bg-slate-800/60 px-1.5 py-0.5 rounded">
                    VS
                  </span>
                </div>

                {/* Server */}
                <div className="p-2 rounded-lg border border-amber-800/30 bg-amber-950/20 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Server className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="font-bold text-amber-300 uppercase tracking-wider">Server</span>
                  </div>
                  <p className="text-slate-300 truncate font-medium">
                    {activeConflict.serverItem?.title ?? 'Existing'}
                  </p>
                  <p className="text-slate-500 truncate">
                    {activeConflict.serverItem?.category ?? 'General'}
                  </p>
                </div>
              </div>

              {/* Resolution Buttons */}
              <div className="flex flex-col gap-1.5 pt-1">
                <button
                  type="button"
                  disabled={!!resolvingConflictId}
                  onClick={() => handleResolveConflict('keep_local')}
                  className="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/30 border border-cyan-800/40 rounded-xl py-2 hover:bg-cyan-950/50 hover:border-cyan-700/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {resolvingConflictId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Smartphone className="w-3.5 h-3.5" />
                  )}
                  Keep My Version
                </button>

                <button
                  type="button"
                  disabled={!!resolvingConflictId}
                  onClick={() => handleResolveConflict('keep_server')}
                  className="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/20 border border-amber-800/30 rounded-xl py-2 hover:bg-amber-950/40 hover:border-amber-700/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {resolvingConflictId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Server className="w-3.5 h-3.5" />
                  )}
                  Keep Server Version
                </button>

                <button
                  type="button"
                  disabled={!!resolvingConflictId}
                  onClick={() => handleResolveConflict('discard')}
                  className="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-900/50 border border-slate-800/50 rounded-xl py-2 hover:bg-slate-900/80 hover:border-slate-700/60 hover:text-slate-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Discard Both
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── Queue item row ────────────────────────────────────────────────────

  const renderQueueItem = (item: SyncQueueItem) => {
    const status = item.status ?? 'pending';
    const meta = STATUS_META[status] ?? STATUS_META.pending;
    const Icon = meta.icon;
    const isCurrentStatusRetrying = retryingId === item.id;

    return (
      <motion.div
        key={item.id}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        layout
        className={`flex items-start gap-2.5 p-3 rounded-xl border bg-slate-950/40 backdrop-blur-sm transition-colors ${meta.rowClass}`}
      >
        {/* Status icon */}
        <div
          className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border ${
            status === 'failed'
              ? 'bg-red-950/30 border-red-800/30'
              : status === 'syncing'
                ? 'bg-cyan-950/30 border-cyan-800/30'
                : 'bg-slate-900/60 border-slate-800/40'
          }`}
        >
          <Icon
            className={`w-3.5 h-3.5 ${meta.iconClass} ${status === 'syncing' || isCurrentStatusRetrying ? 'animate-spin' : ''}`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-200 truncate">
              {item.payload?.title ?? 'Untitled Report'}
            </span>
            {status === 'syncing' && (
              <span className="shrink-0 text-[8px] font-black uppercase tracking-wider text-cyan-500 bg-cyan-950/40 border border-cyan-800/40 px-1.5 py-0.5 rounded-full">
                Syncing
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
            <span className="text-[9px] text-slate-500 font-medium">
              {item.payload?.category ?? 'General'} — {new Date(item.timestamp).toLocaleString()}
            </span>
          </div>

          {/* Error message for failed items */}
          {status === 'failed' && item.error && (
            <p className="mt-1 text-[9px] text-red-400/80 leading-tight">{item.error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-1">
          {status === 'failed' && (
            <button
              type="button"
              disabled={!isOnline || isCurrentStatusRetrying}
              onClick={() => handleRetry(item.id)}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-cyan-400 hover:bg-cyan-950/50 hover:border-cyan-700/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={`Retry sync for ${item.payload?.title ?? 'item'}`}
            >
              {isCurrentStatusRetrying ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleDiscard(item.id)}
            disabled={status === 'syncing'}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-950/20 border border-red-800/20 text-red-400 hover:bg-red-950/40 hover:border-red-700/40 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            aria-label={`Discard ${item.payload?.title ?? 'item'}`}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    );
  };

  // ── Summary bar ───────────────────────────────────────────────────────

  const renderSummaryBar = () => {
    const progressPct = Math.round(syncProgress * 100);

    return (
      <div className="flex flex-wrap items-center gap-2 px-1">
        {/* Total badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800/50">
          <Clock className="w-3 h-3 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-300">
            {offlineQueue.length} total
          </span>
        </div>

        {/* Status pills */}
        {counts.pending > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/40 border border-slate-700/40">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            <span className="text-[9px] font-bold text-slate-400">{counts.pending} pending</span>
          </div>
        )}
        {counts.syncing > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-950/30 border border-cyan-800/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-[9px] font-bold text-cyan-400">{counts.syncing} syncing</span>
          </div>
        )}
        {counts.failed > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-950/30 border border-red-800/30">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-[9px] font-bold text-red-400">{counts.failed} failed</span>
          </div>
        )}
        {counts.synced > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-950/30 border border-green-800/30">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[9px] font-bold text-green-400">{counts.synced} synced</span>
          </div>
        )}

        {/* Progress bar (visible only during sync) */}
        {isSyncing && syncProgress > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[9px] font-bold text-cyan-400 tabular-nums">{progressPct}%</span>
          </div>
        )}
      </div>
    );
  };

  // ── Conflicts bar (shown below summary when conflicts exist) ──────────

  const renderConflictsBar = () => {
    if (!hasConflicts) return null;

    return (
      <div className="flex items-center gap-2 px-1">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/30 border border-amber-800/30">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-bold text-amber-300">
            {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} need{conflicts.length === 1 ? 's' : ''} resolution
          </span>
        </div>

        {conflicts.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveConflictId(c.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-950/20 border border-amber-800/20 text-amber-400 hover:bg-amber-950/40 hover:border-amber-700/40 transition-colors text-[9px] font-bold"
          >
            {c.localItem.payload?.title ?? 'Item'}
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
        ))}
      </div>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="offline-sync-dialog-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4"
          onClick={(e) => {
            // Close only when clicking the backdrop directly, not its children
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Backdrop blur */}
          <div className="absolute inset-0 bg-[#000000]/80 backdrop-blur-sm" />

          {/* Dialog panel */}
          <motion.div
            key="offline-sync-dialog-panel"
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="relative w-full max-w-lg z-10 overflow-hidden rounded-2xl border border-slate-700/30 bg-slate-950/85 backdrop-blur-xl shadow-2xl shadow-slate-900/30 flex flex-col max-h-[85vh]"
          >
            {/* Gradient accent bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600" />

            {/* ── Header ── */}
            <div className="relative z-10 p-4 pb-3 border-b border-white/[0.06]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-slate-900/60 border border-slate-800/50 flex items-center justify-center">
                    <RefreshCw className="w-4.5 h-4.5 text-slate-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-100">
                      Offline Sync Queue
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {isOnline ? 'Online — queue processes automatically' : 'Offline — items stored locally'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-slate-900/80 border border-slate-800/60 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Summary bar */}
              {hasItems && (
                <div className="mt-3">{renderSummaryBar()}</div>
              )}
            </div>

            {/* ── Conflicts bar ── */}
            {hasItems && hasConflicts && (
              <div className="relative z-10 px-4 py-2 border-b border-white/[0.06] bg-amber-950/10">
                {renderConflictsBar()}
              </div>
            )}

            {/* ── Toolbar (Sync All / Clear All) ── */}
            {hasItems && (
              <div className="relative z-10 px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncAll}
                    disabled={!isOnline || isSyncing || !hasItems}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase border transition-all bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-slate-950 border-cyan-400 hover:scale-105 active:scale-95 shadow-md shadow-cyan-500/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync All'}
                  </button>

                  {isSyncing && (
                    <span className="text-[9px] text-cyan-500 font-medium tabular-nums">
                      {Math.round(syncProgress * 100)}%
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleDiscardAll}
                  disabled={clearingAll || isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase border transition-all bg-red-950/30 text-red-400 border-red-800/40 hover:bg-red-950/50 hover:border-red-700/60 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <Trash2 className={`w-3 h-3`} />
                  {clearingAll ? 'Clearing...' : 'Clear All'}
                </button>
              </div>
            )}

            {/* ── Scrollable queue list ── */}
            <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-2 min-h-[120px]">
              {!hasItems && renderEmptyState()}

              <AnimatePresence mode="popLayout">
                {sortedQueue.map(renderQueueItem)}
              </AnimatePresence>

              {/* Conflict resolution overlay (rendered inside scroll container so it can overlap) */}
              {renderConflictOverlay()}
            </div>

            {/* ── Footer ── */}
            <div className="relative z-10 px-4 py-3 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[9px] text-slate-600">
                Items persist across sessions via IndexedDB
              </span>
              <button
                type="button"
                onClick={onClose}
                className="text-[10px] font-medium text-slate-500 hover:text-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}