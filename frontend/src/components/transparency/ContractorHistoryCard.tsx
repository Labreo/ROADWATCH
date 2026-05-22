'use client';

import React from 'react';
import { Contractor } from '@/types';
import { User, ShieldAlert, Award, Star, StarHalf } from 'lucide-react';
import { formatINR } from '@/services/transparencyEngine';

interface ContractorBreakdownItem {
  contractorId: number;
  contractorName: string;
  totalReceived: number;
  projectsCount: number;
}

interface ContractorHistoryCardProps {
  breakdown: ContractorBreakdownItem[];
  contractors: Contractor[];
}

export default function ContractorHistoryCard({ breakdown, contractors }: ContractorHistoryCardProps) {
  if (breakdown.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground bg-slate-950/20 rounded-xl border border-dashed border-border/40 p-4">
        No contractor engagements logged for this segment.
      </div>
    );
  }

  // Render stars helper
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Star key={i} className="w-3 h-3 fill-amber-450 text-amber-450 shrink-0" />);
      } else if (i === fullStars + 1 && hasHalf) {
        stars.push(<StarHalf key={i} className="w-3 h-3 fill-amber-450 text-amber-450 shrink-0" />);
      } else {
        stars.push(<Star key={i} className="w-3 h-3 text-slate-700 shrink-0" />);
      }
    }
    return <div className="flex gap-0.5">{stars}</div>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <h4 className="text-[10px] text-slate-200 uppercase font-black tracking-widest">Public Contractor Ledgers</h4>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {breakdown.map((item) => {
          const contractor = contractors.find(c => c.id === item.contractorId);
          if (!contractor) return null;

          return (
            <div 
              key={item.contractorId}
              className={`p-4 rounded-xl border bg-slate-950/20 space-y-3.5 transition-all hover:border-cyan-500/30 ${
                contractor.blacklisted 
                  ? 'border-red-900/50 bg-red-950/5' 
                  : 'border-border/60'
              }`}
            >
              {/* Header */}
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-cyan-400" />
                    <h5 className="text-xs font-black text-slate-100 leading-tight">{contractor.name}</h5>
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    License: <span className="text-slate-350 font-bold">{contractor.licenseNumber}</span>
                  </div>
                </div>

                {contractor.blacklisted && (
                  <span className="flex items-center gap-1 text-[8px] font-black text-red-500 bg-red-950/60 border border-red-900/60 px-2 py-0.5 rounded uppercase tracking-wider">
                    <ShieldAlert className="w-3.5 h-3.5" /> Blacklisted
                  </span>
                )}
              </div>

              {/* Blacklist details banner */}
              {contractor.blacklisted && contractor.blacklistedReason && (
                <div className="p-2.5 rounded bg-red-950/30 border border-red-900/50 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-red-400 leading-normal font-semibold">
                    <strong>Blacklist Reason:</strong> {contractor.blacklistedReason}
                  </p>
                </div>
              )}

              {/* Performance ratings row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
                <div className="bg-slate-950/40 p-2 rounded-lg border border-border/30 flex flex-col justify-between items-center">
                  <span className="text-[8px] text-muted-foreground block uppercase font-bold tracking-wider mb-1">Contractor Rating</span>
                  <div className="flex flex-col items-center gap-1">
                    {renderStars(contractor.rating)}
                    <span className="text-[9px] font-extrabold text-slate-300 mt-0.5">{contractor.rating.toFixed(2)}/5.00</span>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-2 rounded-lg border border-border/30 flex flex-col justify-between items-center">
                  <span className="text-[8px] text-muted-foreground block uppercase font-bold tracking-wider mb-1">Total Public Funding</span>
                  <span className="text-xs font-black text-slate-100">{formatINR(item.totalReceived)}</span>
                </div>

                <div className="bg-slate-950/40 p-2 rounded-lg border border-border/30 flex flex-col justify-between items-center">
                  <span className="text-[8px] text-muted-foreground block uppercase font-bold tracking-wider mb-1">Projects Completed</span>
                  <span className="text-xs font-black text-slate-100">{contractor.projectsCompleted}</span>
                </div>

                <div className="bg-slate-950/40 p-2 rounded-lg border border-border/30 flex flex-col justify-between items-center">
                  <span className="text-[8px] text-muted-foreground block uppercase font-bold tracking-wider mb-1">Delayed Rate</span>
                  <span className={`text-xs font-black ${contractor.projectsDelayed > 3 ? 'text-red-400 animate-pulse' : 'text-slate-100'}`}>
                    {contractor.projectsDelayed} {contractor.projectsDelayed === 1 ? 'project' : 'projects'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
