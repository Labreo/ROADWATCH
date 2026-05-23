import React from 'react';
import dynamic from 'next/dynamic';

interface JurisdictionMapWrapperProps {
  selectedComplaintId: number | null;
  onSelectComplaint: (id: number | null) => void;
}

const DynamicJurisdictionMap = dynamic(
  () => import('./JurisdictionMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[350px] flex flex-col items-center justify-center bg-slate-950 rounded-xl border border-border/80 shadow-2xl relative overflow-hidden">
        {/* Mock grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        <div className="flex flex-col items-center gap-3 relative z-10 animate-pulse">
          <div className="w-9 h-9 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-400">Loading Jurisdiction Map Coordinates...</p>
        </div>
      </div>
    )
  }
);

export default function JurisdictionMapWrapper({
  selectedComplaintId,
  onSelectComplaint
}: JurisdictionMapWrapperProps) {
  return (
    <div className="w-full h-full min-h-[350px] transition-all duration-300">
      <DynamicJurisdictionMap
        selectedComplaintId={selectedComplaintId}
        onSelectComplaint={onSelectComplaint}
      />
    </div>
  );
}
