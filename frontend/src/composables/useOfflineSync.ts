'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import type { SyncQueueItem, Complaint } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SyncConflict {
  id: string;
  localItem: SyncQueueItem;
  serverItem: Complaint;
}

export interface UseOfflineSyncReturn {
  /** True when the sync engine is actively processing the queue */
  isSyncing: boolean;
  /** Sync progress as a 0-1 ratio (items processed / items at sync start) */
  syncProgress: number;
  /** Total number of items currently in the offline queue */
  queueLength: number;
  /** Active conflicts (409) awaiting user resolution */
  conflicts: SyncConflict[];
  /**
   * Resolve a sync conflict.
   * @param id - The conflict/sync-item id
   * @param resolution - 'keep_local' submits the user's version; 'keep_server' accepts the server version; 'discard' discards both
   */
  resolveConflict: (id: string, resolution: 'keep_local' | 'keep_server' | 'discard') => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * useOfflineSync — watches `isOnline` and provides sync engine state.
 *
 * Derives `syncProgress` by comparing the number of items that were in the
 * queue when a sync cycle started against the number still pending/syncing.
 */
export function useOfflineSync(): UseOfflineSyncReturn {
  const isOnline = useStore((s) => s.isOnline);
  const isSyncingStore = useStore((s) => s.isSyncing);
  const offlineQueue = useStore((s) => s.offlineQueue);
  const storeConflicts = useStore((s) => s.conflicts);
  const storeResolveConflict = useStore((s) => s.resolveConflict);

  // Track progress across a single sync cycle
  const initialQueueLen = useRef(0);
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    // Sync just started
    if (isSyncingStore && initialQueueLen.current === 0) {
      initialQueueLen.current = offlineQueue.length;
    }

    // Sync just finished
    if (!isSyncingStore && initialQueueLen.current > 0) {
      initialQueueLen.current = 0;
      setSyncProgress(1);

      // Hold at 1 briefly so the UI can show completion, then reset
      const timer = setTimeout(() => setSyncProgress(0), 800);
      return () => clearTimeout(timer);
    }

    // While sync is running, compute progress
    if (isSyncingStore && initialQueueLen.current > 0) {
      const pendingOrSyncing = offlineQueue.filter(
        (q) => q.status === 'pending' || q.status === 'syncing' || !q.status
      ).length;
      const processed = initialQueueLen.current - pendingOrSyncing;
      setSyncProgress(Math.min(processed / initialQueueLen.current, 1));
    }
  }, [isSyncingStore, offlineQueue]);

  const resolveConflict = useCallback<UseOfflineSyncReturn['resolveConflict']>(
    async (id, resolution) => {
      await storeResolveConflict(id, resolution);
    },
    [storeResolveConflict]
  );

  return {
    isSyncing: isSyncingStore,
    syncProgress,
    queueLength: offlineQueue.length,
    conflicts: storeConflicts,
    resolveConflict,
  };
}