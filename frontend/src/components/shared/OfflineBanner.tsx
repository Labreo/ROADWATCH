'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { useNetworkStatus } from '@/providers/NetworkStatusProvider';
import { WifiOff, RefreshCw, AlertTriangle, Wifi, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineBanner() {
  const { isOnline: networkOnline, effectiveType, downlink } = useNetworkStatus();
  // We sync Zustand online state as well
  const storeOnline = useStore(state => state.isOnline);
  const syncQueueCount = useStore(state => state.syncQueueCount);
  const processSyncQueue = useStore(state => state.processSyncQueue);
  const isSyncing = useStore(state => state.isSyncing);

  const activeOnline = networkOnline && storeOnline;
  const showBanner = !activeOnline || syncQueueCount > 0;

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden shrink-0 z-[999] relative"
      >
        <div 
          className={`w-full py-2.5 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-b transition-colors duration-300 ${
            !activeOnline
              ? 'bg-red-500/10 border-red-500/20 text-red-200 backdrop-blur-md'
              : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-200 backdrop-blur-md'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {!activeOnline ? (
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-400">
                <WifiOff className="w-3.5 h-3.5" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400">
                <Wifi className="w-3.5 h-3.5 animate-pulse" />
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="font-bold tracking-wide">
                {!activeOnline 
                  ? 'OFFLINE MODE ACTIVE' 
                  : 'READY TO SYNCHRONIZE'}
              </span>
              <span className="hidden sm:inline text-slate-500 font-bold">•</span>
              <span className="text-slate-400">
                {!activeOnline 
                  ? 'Browsing cached roads database. Reports will be queued locally.' 
                  : `Submissions saved offline are ready to upload.`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end shrink-0">
            {/* Network speed pill */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-950/40 border border-slate-800/80 text-[10px] text-slate-400 font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${!activeOnline ? 'bg-red-500' : 'bg-green-500'}`} />
              <span className="uppercase tracking-wider">
                {!activeOnline ? 'Offline' : `Speed: ${effectiveType || 'Stable'} (${downlink ? `${downlink} Mbps` : 'Direct'})`}
              </span>
            </div>

            {/* Queue Counter & Sync button */}
            <div className="flex items-center gap-3">
              {syncQueueCount > 0 && (
                <span className="font-black bg-slate-900 border border-slate-700/60 px-2 py-0.5 rounded text-[10px]">
                  {syncQueueCount} pending report{syncQueueCount > 1 ? 's' : ''}
                </span>
              )}

              {syncQueueCount > 0 && (
                <button
                  onClick={processSyncQueue}
                  disabled={!activeOnline || isSyncing}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black tracking-wider uppercase border transition-all ${
                    !activeOnline
                      ? 'bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-slate-950 border-cyan-400 hover:scale-105 active:scale-95 shadow-md shadow-cyan-500/10 font-bold'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
