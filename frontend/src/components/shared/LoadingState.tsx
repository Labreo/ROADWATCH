'use client';

import React from 'react';

// 1. Stat Counter Skeletons (matches the new 2x2 / 1x4 layout)
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 select-none">
      {[...Array(4)].map((_, i) => (
        <div 
          key={i} 
          className="glass-panel rounded-2xl p-5 flex items-center gap-4 border border-border/50 animate-pulse"
        >
          {/* Pulsing Icon placeholder */}
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-border/60 shrink-0 opacity-80" />
          <div className="space-y-2.5 flex-1 min-w-0">
            <div className="h-2.5 w-16 bg-slate-900 rounded opacity-60" />
            <div className="h-5 w-24 bg-slate-900 rounded opacity-90" />
          </div>
        </div>
      ))}
    </div>
  );
}

// 2. Road registry list items skeletons
export function RoadCardSkeleton() {
  return (
    <div className="space-y-2.5 select-none">
      {[...Array(5)].map((_, i) => (
        <div 
          key={i} 
          className="p-3.5 rounded-xl border border-border/60 bg-slate-950/40 space-y-3.5 animate-pulse"
        >
          <div className="flex justify-between items-center gap-2">
            <div className="h-3 w-16 bg-slate-900 rounded opacity-75" />
            <div className="h-3 w-14 bg-slate-900 rounded-full opacity-60" />
          </div>
          <div className="h-4 w-40 bg-slate-900 rounded opacity-90" />
          <div className="flex justify-between items-center border-t border-border/30 pt-2.5">
            <div className="h-2.5 w-12 bg-slate-900 rounded opacity-65" />
            <div className="h-2.5 w-20 bg-slate-900 rounded opacity-65" />
          </div>
        </div>
      ))}
    </div>
  );
}

// 3. Side Panel / Drawer Detailed view loader skeleton
export function DetailPanelSkeleton() {
  return (
    <div className="w-full h-full flex flex-col bg-slate-950/95 border-l border-border/80 overflow-hidden animate-pulse select-none">
      {/* Header */}
      <div className="p-5 border-b border-border/60 space-y-3.5">
        <div className="flex items-center gap-2">
          <div className="h-3 w-12 bg-slate-900 rounded opacity-75" />
          <div className="h-3.5 w-20 bg-slate-900 rounded-full opacity-65" />
        </div>
        <div className="h-6 w-48 bg-slate-900 rounded opacity-95" />
        <div className="h-3 w-32 bg-slate-900 rounded opacity-60" />
      </div>

      {/* Body Content */}
      <div className="flex-1 p-5 space-y-6 overflow-y-auto">
        {/* Authority & Date Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-slate-900/60 border border-border/40 rounded-xl" />
          <div className="h-20 bg-slate-900/60 border border-border/40 rounded-xl" />
        </div>

        {/* Budget Audit Card */}
        <div className="space-y-3.5 border border-border/40 p-5 rounded-xl bg-slate-950/30">
          <div className="h-3.5 w-28 bg-slate-900 rounded opacity-80" />
          <div className="h-3 w-40 bg-slate-900 rounded opacity-60" />
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="h-9 bg-slate-900 rounded opacity-75" />
            <div className="h-9 bg-slate-900 rounded opacity-75" />
          </div>
          <div className="h-1.5 w-full bg-slate-900 rounded-full opacity-50 mt-1" />
        </div>

        {/* Contractor Card */}
        <div className="space-y-3.5 border border-border/40 p-5 rounded-xl bg-slate-950/30">
          <div className="h-3.5 w-36 bg-slate-900 rounded opacity-80" />
          <div className="h-5 w-48 bg-slate-900 rounded opacity-90" />
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="h-8 bg-slate-900 rounded opacity-70" />
            <div className="h-8 bg-slate-900 rounded opacity-70" />
            <div className="h-8 bg-slate-900 rounded opacity-70" />
          </div>
        </div>
      </div>
    </div>
  );
}
