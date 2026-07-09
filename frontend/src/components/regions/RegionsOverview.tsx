'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, MapPin, HardHat, Coins, AlertTriangle, Award, ChevronDown, ChevronRight, Building2, Route, ArrowLeftRight, ExternalLink } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { globalTemplates, RegionTemplate } from '@/data/globalTemplates';
import { getRegionData, regionInfo } from '@/data/regionsMockData';
import { getCrossRegionComparison, RegionComparisonEntry } from '@/services/regionComparisonService';
import { formatInRegionDate } from '@/services/timezoneService';

export default function RegionsOverview() {
  const { regionCode, setRegionCode } = useStore();
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const comparison = useMemo(() => getCrossRegionComparison(), []);

  const handleRegionSwitch = (code: string) => {
    setRegionCode(code);
    setSelectedRegion(code);
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-6 scrollbar-thin">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
            <Globe className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-[12px] font-black uppercase text-slate-100 tracking-wider">Region Hub</h2>
            <p className="text-[9px] text-muted-foreground font-semibold">Manage jurisdictions & compare infrastructure</p>
          </div>
        </div>
        <button
          onClick={() => setShowComparison(!showComparison)}
          className={`text-[9px] font-extrabold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
            showComparison
              ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
              : 'bg-slate-950/80 border-white/[0.06] text-slate-300 hover:border-cyan-500/40'
          }`}
        >
          <ArrowLeftRight className="w-3 h-3" />
          {showComparison ? 'Region Details' : 'Compare Regions'}
        </button>
      </div>

      {showComparison ? (
        /* ── Cross-Region Comparison View ── */
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comparison.entries.map(entry => {
              const active = regionCode === entry.regionCode;
              const info = regionInfo[entry.regionCode as keyof typeof regionInfo];
              return (
                <motion.div
                  key={entry.regionCode}
                  layout
                  className={`relative p-4 rounded-2xl border cursor-pointer transition-all ${
                    active
                      ? 'bg-cyan-950/20 border-cyan-500/50 shadow-lg shadow-cyan-500/5'
                      : 'bg-slate-900/40 border-white/[0.06] hover:border-cyan-500/30 hover:bg-slate-900/60'
                  }`}
                  onClick={() => handleRegionSwitch(entry.regionCode)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{info?.flag || '🌍'}</span>
                      <div>
                        <h3 className="text-xs font-extrabold text-slate-200">{entry.regionName}</h3>
                        <p className="text-[8px] text-muted-foreground font-mono">{info?.roadNaming || ''}</p>
                      </div>
                    </div>
                    {active && (
                      <span className="text-[8px] font-extrabold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                    <div className="p-2 bg-black/20 rounded-lg">
                      <span className="text-muted-foreground block font-semibold">Roads</span>
                      <span className="text-slate-200 font-black">{entry.roadCount} ({entry.nationalHighwayCount} national)</span>
                    </div>
                    <div className="p-2 bg-black/20 rounded-lg">
                      <span className="text-muted-foreground block font-semibold">Budget</span>
                      <span className="text-emerald-400 font-black">{entry.template.formatCurrency(entry.totalBudgetAllocated, true)}</span>
                    </div>
                    <div className="p-2 bg-black/20 rounded-lg">
                      <span className="text-muted-foreground block font-semibold">Contractor Rating</span>
                      <span className="text-amber-400 font-black">{entry.avgContractorRating.toFixed(2)} / 5</span>
                    </div>
                    <div className="p-2 bg-black/20 rounded-lg">
                      <span className="text-muted-foreground block font-semibold">Status</span>
                      <span className={`font-black ${entry.poorRoads > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {entry.poorRoads} poor roads
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Summary Highlights */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 bg-gradient-to-br from-emerald-950/30 to-slate-900/40 border border-emerald-900/40 rounded-2xl">
              <span className="text-[8px] text-emerald-500 uppercase font-black tracking-wider">Highest Spending</span>
              <p className="text-xs font-black text-slate-200 mt-1">{comparison.bestSpending.label}</p>
            </div>
            <div className="p-3.5 bg-gradient-to-br from-amber-950/30 to-slate-900/40 border border-amber-900/40 rounded-2xl">
              <span className="text-[8px] text-amber-500 uppercase font-black tracking-wider">Best Contractors</span>
              <p className="text-xs font-black text-slate-200 mt-1">{comparison.bestContractors.label}</p>
            </div>
            <div className="p-3.5 bg-gradient-to-br from-cyan-950/30 to-slate-900/40 border border-cyan-900/40 rounded-2xl">
              <span className="text-[8px] text-cyan-500 uppercase font-black tracking-wider">Most Roads</span>
              <p className="text-xs font-black text-slate-200 mt-1">{comparison.mostInfrastructure.label}</p>
            </div>
          </div>
        </div>
      ) : (
        /* ── Single Region Detail View ── */
        <div className="space-y-4">
          {/* Region Quick Switch */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {Object.entries(regionInfo).map(([code, info]) => {
              const active = regionCode === code;
              return (
                <button
                  key={code}
                  onClick={() => handleRegionSwitch(code)}
                  className={`shrink-0 flex items-center gap-1.5 text-[9px] font-extrabold px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                    active
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                      : 'bg-slate-950/80 border-white/[0.06] text-slate-300 hover:border-cyan-500/30'
                  }`}
                >
                  <span>{info.flag}</span>
                  {info.name}
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                </button>
              );
            })}
          </div>

          {/* Active Region Details */}
          <RegionDetailView regionCode={regionCode} />
        </div>
      )}
    </div>
  );
}

function RegionDetailView({ regionCode }: { regionCode: string }) {
  const data = getRegionData(regionCode);
  const template = globalTemplates[regionCode];
  const info = regionInfo[regionCode as keyof typeof regionInfo];

  if (!data) return <p className="text-[10px] text-muted-foreground">Region data not available.</p>;

  const totalBudget = data.projects.reduce((sum, p) => sum + p.budgetAllocated, 0);
  const totalSpent = data.projects.reduce((sum, p) => sum + p.budgetSpent, 0);
  const avgRating = data.contractors.length > 0
    ? data.contractors.reduce((sum, c) => sum + c.rating, 0) / data.contractors.length
    : 0;

  return (
    <div className="space-y-5">
      {/* Region Header */}
      <div className="flex items-center gap-3 p-4 bg-slate-900/40 border border-white/[0.05] rounded-2xl">
        <span className="text-4xl">{info?.flag || '🌍'}</span>
        <div className="flex-1">
          <h3 className="text-sm font-black text-slate-100">{info?.name || regionCode}</h3>
          <p className="text-[9px] text-muted-foreground font-mono">
            {info?.roadNaming || ''} &middot; {info?.population || ''} &middot; {info?.currency || ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[8px] text-muted-foreground uppercase font-bold">Timezone</p>
          <p className="text-[9px] text-slate-300 font-mono">{info?.timezone || ''}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900/40 border border-white/[0.05] rounded-xl">
          <div className="flex items-center gap-1.5 text-cyan-400 mb-1">
            <Route className="w-3.5 h-3.5" />
            <span className="text-[8px] font-black uppercase tracking-wider">Roads</span>
          </div>
          <p className="text-sm font-black text-slate-200">{data.roads.length}</p>
          <p className="text-[8px] text-muted-foreground">
            {data.roads.filter(r => r.status === 'good').length} good &middot;
            {data.roads.filter(r => r.status === 'poor').length} poor
          </p>
        </div>
        <div className="p-3 bg-slate-900/40 border border-white/[0.05] rounded-xl">
          <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
            <Coins className="w-3.5 h-3.5" />
            <span className="text-[8px] font-black uppercase tracking-wider">Budget</span>
          </div>
          <p className="text-sm font-black text-slate-200">{template.formatCurrency(totalBudget, true)}</p>
          <p className="text-[8px] text-muted-foreground">Spent: {template.formatCurrency(totalSpent, true)}</p>
        </div>
        <div className="p-3 bg-slate-900/40 border border-white/[0.05] rounded-xl">
          <div className="flex items-center gap-1.5 text-amber-400 mb-1">
            <HardHat className="w-3.5 h-3.5" />
            <span className="text-[8px] font-black uppercase tracking-wider">Contractors</span>
          </div>
          <p className="text-sm font-black text-slate-200">{data.contractors.length}</p>
          <p className="text-[8px] text-muted-foreground">Avg rating: {avgRating.toFixed(2)}/5</p>
        </div>
        <div className="p-3 bg-slate-900/40 border border-white/[0.05] rounded-xl">
          <div className="flex items-center gap-1.5 text-indigo-400 mb-1">
            <Building2 className="w-3.5 h-3.5" />
            <span className="text-[8px] font-black uppercase tracking-wider">Authorities</span>
          </div>
          <p className="text-sm font-black text-slate-200">{data.authorities.length}</p>
          <p className="text-[8px] text-muted-foreground">Agencies managing roads</p>
        </div>
      </div>

      {/* Road List */}
      <div>
        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1.5">
          <Route className="w-3 h-3 text-cyan-400" /> Roads
        </h4>
        <div className="space-y-2">
          {data.roads.map(road => (
            <div
              key={road.id}
              className="p-3 bg-slate-900/30 border border-white/[0.04] rounded-xl flex items-center justify-between text-[10px]"
            >
              <div>
                <span className="font-bold text-slate-200">{road.name}</span>
                <span className="text-muted-foreground ml-2 font-mono">{road.roadCode}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{road.lengthKm} km</span>
                <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                  road.status === 'good' ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-900/40' :
                  road.status === 'fair' ? 'text-amber-400 bg-amber-950/30 border border-amber-900/40' :
                  road.status === 'poor' ? 'text-red-400 bg-red-950/30 border border-red-900/40' :
                  'text-cyan-400 bg-cyan-950/30 border border-cyan-900/40'
                }`}>
                  {road.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contractor List */}
      <div>
        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1.5">
          <HardHat className="w-3 h-3 text-amber-400" /> Contractors
        </h4>
        <div className="space-y-2">
          {data.contractors.map(c => (
            <div
              key={c.id}
              className="p-3 bg-slate-900/30 border border-white/[0.04] rounded-xl flex items-center justify-between text-[10px]"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200">{c.name}</span>
                {c.blacklisted && (
                  <span className="text-[7px] font-extrabold text-red-500 bg-red-950/50 border border-red-900/60 px-1 py-0.5 rounded uppercase">Blacklisted</span>
                )}
              </div>
              <span className="text-amber-400 font-bold">{c.rating.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}