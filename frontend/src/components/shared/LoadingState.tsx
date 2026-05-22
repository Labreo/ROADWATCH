import { MapPin } from 'lucide-react';

// 1. Stat Counter Skeletons (4 cards)
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 shrink-0">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="glass-panel rounded-xl p-4 flex items-center gap-3 border border-border/50 animate-pulse">
          <div className="w-10 h-10 rounded-lg bg-slate-900 border border-border/60 shrink-0"></div>
          <div className="space-y-2 flex-1">
            <div className="h-3 w-16 bg-slate-900 rounded"></div>
            <div className="h-5 w-24 bg-slate-900 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 2. Road registry list items skeletons
export function RoadCardSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-3 rounded-lg border border-border/30 bg-slate-950/40 space-y-3 animate-pulse">
          <div className="flex justify-between items-center">
            <div className="h-3 w-16 bg-slate-900 rounded"></div>
            <div className="h-3 w-14 bg-slate-900 rounded-full"></div>
          </div>
          <div className="h-4 w-40 bg-slate-900 rounded"></div>
          <div className="flex justify-between items-center border-t border-border/20 pt-2">
            <div className="h-3 w-12 bg-slate-900 rounded"></div>
            <div className="h-3 w-20 bg-slate-900 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 3. Side Panel / Drawer Detailed view loader skeleton
export function DetailPanelSkeleton() {
  return (
    <div className="w-full h-full flex flex-col bg-slate-950/95 border-l border-border/80 overflow-hidden animate-pulse">
      {/* Header */}
      <div className="p-5 border-b border-border/60 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-12 bg-slate-900 rounded"></div>
          <div className="h-4 w-20 bg-slate-900 rounded-full"></div>
        </div>
        <div className="h-6 w-48 bg-slate-900 rounded"></div>
        <div className="h-3.5 w-32 bg-slate-900 rounded"></div>
      </div>

      {/* Body Content */}
      <div className="flex-1 p-5 space-y-6">
        {/* Authority & Date Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 bg-slate-900 border border-border/40 rounded-lg"></div>
          <div className="h-20 bg-slate-900 border border-border/40 rounded-lg"></div>
        </div>

        {/* Budget Audit Card */}
        <div className="space-y-3 border border-border/40 p-4 rounded-xl">
          <div className="h-4 w-28 bg-slate-900 rounded"></div>
          <div className="h-3 w-40 bg-slate-900 rounded"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-slate-900 rounded"></div>
            <div className="h-10 bg-slate-900 rounded"></div>
          </div>
          <div className="h-2 w-full bg-slate-900 rounded"></div>
        </div>

        {/* Contractor Card */}
        <div className="space-y-3 border border-border/40 p-4 rounded-xl">
          <div className="h-4 w-36 bg-slate-900 rounded"></div>
          <div className="h-5 w-48 bg-slate-900 rounded"></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-10 bg-slate-900 rounded"></div>
            <div className="h-10 bg-slate-900 rounded"></div>
            <div className="h-10 bg-slate-900 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
