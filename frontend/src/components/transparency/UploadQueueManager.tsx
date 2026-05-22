'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { SyncQueueItem } from '@/types';
import { RefreshCw, Trash2, Clock, CheckCircle2, AlertCircle, FileText, Image as ImageIcon } from 'lucide-react';

export default function UploadQueueManager() {
  const { offlineQueue, retrySyncItem, discardSyncItem, isOnline, isSyncing } = useStore();

  const handleRetry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await retrySyncItem(id);
  };

  const handleDiscard = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to discard this offline report? All local data will be permanently removed.')) {
      await discardSyncItem(id);
    }
  };

  if (offlineQueue.length === 0) {
    return (
      <div className="glass-panel border-border/60 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[220px]">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-1">
          Upload Queue Empty
        </h4>
        <p className="text-xs text-muted-foreground max-w-sm">
          All reports have been successfully routed and synchronized with municipal servers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black tracking-widest text-muted-foreground uppercase">
          Pending Reports Queue ({offlineQueue.length})
        </h3>
        {!isOnline && (
          <span className="text-[10px] text-amber-400/80 font-bold bg-amber-950/40 border border-amber-900/60 px-2 py-0.5 rounded">
            Sync Paused: Offline
          </span>
        )}
      </div>

      <div className="grid gap-3">
        {offlineQueue.map((item: SyncQueueItem) => {
          const complaint = item.payload;
          const status = item.status || 'pending';
          const errorMsg = item.error;

          return (
            <div
              key={item.id}
              className={`glass-panel border-border/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-slate-700/60 ${
                status === 'syncing' ? 'border-cyan-500/30 bg-cyan-950/5' : ''
              } ${status === 'failed' ? 'border-red-500/20 bg-red-950/5' : ''}`}
            >
              <div className="flex items-center gap-3.5 w-full sm:w-auto">
                {/* Thumbnail Preview */}
                <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center relative">
                  {item.imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imagePreview}
                      alt="Cached road complaint preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-slate-600" />
                  )}
                  {/* Category icon indicator */}
                  <span className="absolute bottom-0.5 right-0.5 px-1 py-0.5 bg-slate-950/80 border border-slate-800 rounded text-[7px] text-slate-400 font-bold uppercase">
                    {complaint.category?.substring(0, 4)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-black text-slate-100 truncate max-w-[150px]">
                      {complaint.title || 'Untitled Report'}
                    </span>
                    <span className="text-[9px] bg-slate-800 border border-slate-700 text-slate-300 font-bold px-1.5 py-0.5 rounded capitalize">
                      {complaint.category?.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-[10px] text-muted-foreground line-clamp-1 mb-1">
                    {complaint.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center gap-2 text-[9px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>Queued: {new Date(item.timestamp).toLocaleTimeString()}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-400">{complaint.clientTempId || 'ID Pending'}</span>
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex sm:flex-col items-end gap-3 w-full sm:w-auto justify-between sm:justify-center border-t sm:border-t-0 border-slate-800/60 pt-3 sm:pt-0 shrink-0">
                <div className="flex flex-col items-end gap-1">
                  {status === 'pending' && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300">
                      <Clock className="w-3 h-3" />
                      Queued
                    </span>
                  )}
                  {status === 'syncing' && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/40 text-[10px] font-bold text-cyan-400">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Uploading
                    </span>
                  )}
                  {status === 'failed' && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/50 border border-red-900/40 text-[10px] font-bold text-red-400">
                      <AlertCircle className="w-3 h-3" />
                      Sync Error
                    </span>
                  )}

                  {errorMsg && status === 'failed' && (
                    <span className="text-[8px] text-red-400/80 font-medium max-w-[180px] text-right truncate" title={errorMsg}>
                      {errorMsg}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDiscard(item.id, e)}
                    disabled={status === 'syncing'}
                    className="p-1.5 rounded-lg border border-slate-800/80 hover:border-red-500/40 text-slate-400 hover:text-red-400 bg-slate-950/40 disabled:opacity-40 transition-all"
                    title="Discard Report"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => handleRetry(item.id, e)}
                    disabled={!isOnline || isSyncing || status === 'syncing'}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all ${
                      !isOnline || isSyncing || status === 'syncing'
                        ? 'bg-slate-900/20 border-slate-800/60 text-slate-500 cursor-not-allowed'
                        : 'bg-cyan-500/10 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border-cyan-500/30 hover:scale-105 active:scale-95'
                    }`}
                    title="Manual Upload Retry"
                  >
                    <RefreshCw className={`w-3 h-3 ${status === 'syncing' ? 'animate-spin' : ''}`} />
                    Retry
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
