'use client';

import dynamic from 'next/dynamic';

// Dynamically load the Leaflet Map component with SSR disabled
const LeafletMap = dynamic(
  () => import('./LeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[350px] md:min-h-[500px] flex flex-col items-center justify-center bg-slate-950 rounded-xl border border-border/80 shadow-2xl relative overflow-hidden">
        {/* Animated grid lines mimicking map loading */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing GIS Mapping Engine...</p>
        </div>
      </div>
    )
  }
);

export default function MapWrapper() {
  return (
    <div className="w-full h-full min-h-[350px] md:min-h-[500px] transition-all duration-300">
      <LeafletMap />
    </div>
  );
}
