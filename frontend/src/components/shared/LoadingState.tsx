'use client';

import React from 'react';

// Shimmer skeleton base — uses the .skeleton CSS class for the gradient sweep animation

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`skeleton rounded ${className}`} />;
}

// ── 1. Dashboard stat card skeletons ─────────────────────────
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 select-none">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="glass-panel rounded-2xl p-5 flex items-center gap-4 border border-white/[0.05]"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {/* Icon placeholder */}
          <SkeletonBlock className="w-11 h-11 rounded-xl flex-shrink-0" />
          <div className="space-y-2.5 flex-1 min-w-0">
            <SkeletonBlock className="h-2 w-14 rounded-full" />
            <SkeletonBlock className="h-6 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 2. Road list skeletons ────────────────────────────────────
export function RoadCardSkeleton() {
  return (
    <div className="space-y-2 select-none">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01] space-y-3"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="flex justify-between items-center gap-2">
            <SkeletonBlock className="h-2.5 w-14 rounded-full" />
            <SkeletonBlock className="h-2.5 w-12 rounded-full" />
          </div>
          <SkeletonBlock className="h-3.5 w-40 rounded" />
          <div className="flex justify-between items-center border-t border-white/[0.03] pt-2.5">
            <SkeletonBlock className="h-2 w-10 rounded-full" />
            <SkeletonBlock className="h-2 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 3. Detail panel skeleton ──────────────────────────────────
export function DetailPanelSkeleton() {
  return (
    <div className="w-full h-full flex flex-col bg-slate-950/95 border-l border-white/[0.04] overflow-hidden select-none">
      {/* Header */}
      <div className="p-5 border-b border-white/[0.04] space-y-3.5">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-2.5 w-10 rounded-full" />
          <SkeletonBlock className="h-3 w-16 rounded-full" />
        </div>
        <SkeletonBlock className="h-6 w-48 rounded-md" />
        <SkeletonBlock className="h-2.5 w-32 rounded-full" />
      </div>

      <div className="flex-1 p-5 space-y-6 overflow-y-auto">
        {/* Grid */}
        <div className="grid grid-cols-2 gap-4">
          <SkeletonBlock className="h-20 rounded-xl" />
          <SkeletonBlock className="h-20 rounded-xl" />
        </div>

        {/* Budget card */}
        <div className="space-y-3 border border-white/[0.04] p-4 rounded-xl">
          <SkeletonBlock className="h-3 w-28 rounded-full" />
          <SkeletonBlock className="h-2.5 w-40 rounded-full" />
          <div className="grid grid-cols-2 gap-4 pt-1">
            <SkeletonBlock className="h-9 rounded-lg" />
            <SkeletonBlock className="h-9 rounded-lg" />
          </div>
          <SkeletonBlock className="h-1.5 w-full rounded-full mt-1" />
        </div>

        {/* Contractor card */}
        <div className="space-y-3 border border-white/[0.04] p-4 rounded-xl">
          <SkeletonBlock className="h-3 w-36 rounded-full" />
          <SkeletonBlock className="h-4.5 w-48 rounded" />
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <SkeletonBlock className="h-8 rounded-lg" />
            <SkeletonBlock className="h-8 rounded-lg" />
            <SkeletonBlock className="h-8 rounded-lg" />
          </div>
        </div>

        {/* Timeline skeleton */}
        <div className="space-y-3">
          <SkeletonBlock className="h-2.5 w-24 rounded-full" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3 items-start">
              <SkeletonBlock className="w-6 h-6 rounded-full flex-shrink-0 mt-1" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-2.5 w-full rounded-full" />
                <SkeletonBlock className="h-2 w-3/4 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 4. Map overlay skeleton ───────────────────────────────────
export function MapOverlaySkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center select-none pointer-events-none">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
        <span className="text-[9px] font-black uppercase tracking-widest text-[#45455a] animate-pulse">
          Loading Map Layer…
        </span>
      </div>
    </div>
  );
}
