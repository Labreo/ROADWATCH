'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useNetworkStatus } from '@/providers/NetworkStatusProvider';
import UploadQueueManager from './UploadQueueManager';
import { 
  Wifi, 
  WifiOff, 
  Database, 
  History, 
  AlertTriangle, 
  HelpCircle, 
  RefreshCw, 
  Trash2, 
  CheckCircle, 
  XCircle,
  FileCheck,
  Compass,
  Download,
  AlertCircle
} from 'lucide-react';

export default function SyncCenter() {
  const { isOnline: networkOnline, effectiveType, downlink, rtt } = useNetworkStatus();
  const storeOnline = useStore(state => state.isOnline);
  const isOnline = networkOnline && storeOnline;

  const {
    cachedRoads,
    cacheAllRoadsOffline,
    clearCachedRoads,
    syncLogs,
    conflicts,
    resolveConflict,
    offlineQueue,
    isSyncing,
    processSyncQueue
  } = useStore();

  const [isCaching, setIsCaching] = useState(false);

  const handleCacheRoads = async () => {
    setIsCaching(true);
    // Simulate caching delay to provide a micro-animation state
    await new Promise(resolve => setTimeout(resolve, 800));
    await cacheAllRoadsOffline();
    setIsCaching(false);
  };

  const handleClearCache = async () => {
    if (confirm('Clear all cached road metadata from IndexedDB? You will not be able to view these roads offline.')) {
      await clearCachedRoads();
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Network Telemetry Card */}
      <div className="glass-panel border-border/80 rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/10 to-transparent pointer-events-none rounded-bl-full" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-sm ${
              isOnline 
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {isOnline ? <Wifi className="w-5 h-5 animate-pulse" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Network Connectivity
                </h4>
                <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isOnline 
                  ? `Active connection detected via ${effectiveType?.toUpperCase() || 'stable link'}.` 
                  : 'Disconnected. Using localized databases and offline routing policies.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-300 font-mono bg-slate-950/40 border border-slate-900 px-4 py-2.5 rounded-xl self-start md:self-auto">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Latency</span>
              <span>{isOnline && rtt ? `${rtt} ms` : 'N/A'}</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Throughput</span>
              <span>{isOnline && downlink ? `${downlink} Mbps` : 'N/A'}</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Sync Queue</span>
              <span className="text-cyan-400 font-bold">{offlineQueue.length} pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Map Caching Controls */}
      <div className="glass-panel border-border/80 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Offline Map Asset Caching
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
                Pre-download and store road segment profiles, geographic shapes, and contractor budget audits inside IndexedDB for disconnected navigation.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            {cachedRoads.length > 0 && (
              <button
                onClick={handleClearCache}
                className="px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-red-400 hover:border-red-500/25 bg-slate-950/20 active:scale-95 transition-all"
              >
                Clear Cache
              </button>
            )}
            <button
              onClick={handleCacheRoads}
              disabled={isCaching}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${
                isCaching
                  ? 'bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 border-cyan-400 active:scale-95 hover:scale-105 shadow-md shadow-cyan-500/10 font-bold'
              }`}
            >
              {isCaching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Caching...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  {cachedRoads.length > 0 ? 'Update Cache' : 'Cache All Roads'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Caching status bar */}
        <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Roads cached locally:</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
              <div 
                className="h-full bg-cyan-500 rounded-full transition-all duration-500" 
                style={{ width: `${(cachedRoads.length / 12) * 100}%` }}
              />
            </div>
            <span className="font-mono text-slate-300 font-bold">
              {cachedRoads.length} / 12 segments
            </span>
          </div>
        </div>
      </div>

      {/* 3. Conflict Resolution Section */}
      {conflicts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-black tracking-widest text-amber-400 uppercase">
              Conflict Resolution Required ({conflicts.length})
            </h3>
          </div>
          
          <div className="grid gap-4">
            {conflicts.map((conflict) => (
              <div 
                key={conflict.id} 
                className="glass-panel border-amber-500/20 bg-amber-950/5 rounded-2xl p-5 border shadow-lg"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">
                    Duplicate Report Flagged: "{conflict.localItem.payload.title}"
                  </span>
                </div>
                
                <p className="text-xs text-muted-foreground mb-4">
                  The civic backend has identified an existing ticket matching this category and segment. Choose which ticket version to keep.
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {/* Local Version Card */}
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold px-1.5 py-0.5 rounded">
                        Your Local Submission
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">
                        {conflict.localItem.payload.clientTempId}
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-slate-200 mb-1">
                      {conflict.localItem.payload.title}
                    </h5>
                    <p className="text-[10px] text-muted-foreground line-clamp-3">
                      {conflict.localItem.payload.description}
                    </p>
                    <div className="mt-2 text-[9px] text-slate-500 font-mono">
                      Category: {conflict.localItem.payload.category}
                    </div>
                  </div>

                  {/* Server Version Card */}
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold px-1.5 py-0.5 rounded">
                        Active Server Ticket
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">
                        RW-2026-ACTIVE
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-slate-200 mb-1">
                      {conflict.serverItem.title}
                    </h5>
                    <p className="text-[10px] text-muted-foreground line-clamp-3">
                      {conflict.serverItem.description}
                    </p>
                    <div className="mt-2 text-[9px] text-slate-500 font-mono">
                      Status: <span className="text-amber-400 capitalize">{conflict.serverItem.status}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    onClick={() => resolveConflict(conflict.id, 'discard')}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-800 text-[10px] font-bold text-slate-400 hover:text-red-400 hover:border-red-500/25 bg-slate-950/20 active:scale-95 transition-all"
                  >
                    Discard Local
                  </button>
                  <button
                    onClick={() => resolveConflict(conflict.id, 'keep_server')}
                    className="px-3.5 py-1.5 rounded-xl border border-amber-500/30 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all"
                  >
                    Accept Server Copy
                  </button>
                  <button
                    onClick={() => resolveConflict(conflict.id, 'keep_local')}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 border border-cyan-400 text-[10px] font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all"
                  >
                    Force Local Upload
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Pending Upload Queue */}
      <UploadQueueManager />

      {/* 5. Sync History Logs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-xs font-black tracking-widest text-muted-foreground uppercase">
              Synchronization Logs
            </h3>
          </div>
          {syncLogs.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear sync logs history from IndexedDB?')) {
                  // We can create a simple action or just do it via repo
                  const { loadCachedData } = useStore.getState();
                  import('@/services/cachedRoadRepository').then(({ CachedRoadRepository }) => {
                    CachedRoadRepository.clearSyncLogs().then(() => loadCachedData());
                  });
                }
              }}
              className="text-[10px] text-muted-foreground hover:text-red-400 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear Logs
            </button>
          )}
        </div>

        {syncLogs.length === 0 ? (
          <div className="glass-panel border-border/40 rounded-2xl p-6 text-center text-xs text-muted-foreground">
            No synchronization history recorded on this device yet.
          </div>
        ) : (
          <div className="space-y-2">
            {syncLogs.map((log) => (
              <div 
                key={log.id}
                className="bg-slate-900/30 border border-slate-900 rounded-xl p-3.5 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {log.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span className="text-[11px] font-bold text-slate-200">
                      Sync completed - {log.count} item{log.count > 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>

                {log.error && (
                  <div className="text-[9px] bg-red-950/20 border border-red-950 text-red-300/90 rounded px-2.5 py-1">
                    Error: {log.error}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mt-1">
                  {log.items.map((item, idx) => (
                    <span 
                      key={idx}
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                        item.result === 'synced' 
                          ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-300' 
                          : item.result === 'conflict_resolved'
                          ? 'bg-cyan-500/5 border-cyan-500/10 text-cyan-300'
                          : 'bg-red-500/5 border-red-500/10 text-red-300'
                      }`}
                    >
                      {item.title} ({item.result === 'conflict_resolved' ? 'resolved' : item.result})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
