'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Globe, Database, Route, AlertTriangle, HardHat, Building2,
  CalendarDays, ArrowUpDown, Search, CheckCircle2, XCircle,
  Clock, BarChart3,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getRegionData, regionInfo } from '@/data/regionsMockData';

interface RegionInventory {
  regionCode: string;
  regionName: string;
  flag: string;
  roadCount: number;
  complaintCount: number;
  contractorCount: number;
  authorityCount: number;
  projectCount: number;
  totalRoadKm: number;
  avgRoadRating: number;
  lastImportDate: string;
  dataFreshness: 'fresh' | 'moderate' | 'stale';
  blacklistedContractors: number;
  roadStatusBreakdown: { good: number; fair: number; poor: number; under_construction: number };
}

function computeInventory(regionCode: string): RegionInventory {
  const data = getRegionData(regionCode);
  const info = regionInfo[regionCode as keyof typeof regionInfo] || { flag: '🌍' };
  const roads = data.roads;
  const totalKm = roads.reduce((s, r) => s + r.lengthKm, 0);
  const statusBreakdown = { good: 0, fair: 0, poor: 0, under_construction: 0 };
  for (const r of roads) {
    if (r.status === 'good') statusBreakdown.good++;
    else if (r.status === 'fair') statusBreakdown.fair++;
    else if (r.status === 'poor') statusBreakdown.poor++;
    else statusBreakdown.under_construction++;
  }

  const blacklisted = data.contractors.filter(c => c.blacklisted).length;
  const avgRating = data.contractors.length
    ? data.contractors.reduce((s, c) => s + c.rating, 0) / data.contractors.length
    : 0;

  const mockComplaintCount: Record<string, number> = { IN: 142, GB: 89, US: 67, KE: 203 };
  const mockLastImport: Record<string, string> = {
    IN: '2025-06-15',
    GB: '2025-07-01',
    US: '2025-06-28',
    KE: '2025-05-10',
  };

  const lastImport = mockLastImport[regionCode] || 'N/A';
  const daysSince = lastImport !== 'N/A'
    ? Math.floor((Date.now() - new Date(lastImport).getTime()) / 86400000)
    : 999;
  const dataFreshness: 'fresh' | 'moderate' | 'stale' =
    daysSince <= 30 ? 'fresh' : daysSince <= 90 ? 'moderate' : 'stale';

  return {
    regionCode,
    regionName: info.name,
    flag: info.flag,
    roadCount: roads.length,
    complaintCount: mockComplaintCount[regionCode] || 0,
    contractorCount: data.contractors.length,
    authorityCount: data.authorities.length,
    projectCount: data.projects.length,
    totalRoadKm: Math.round(totalKm),
    avgRoadRating: Math.round(avgRating * 10) / 10,
    lastImportDate: lastImport,
    dataFreshness,
    blacklistedContractors: blacklisted,
    roadStatusBreakdown: statusBreakdown,
  };
}

const freshnessConfig = {
  fresh: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-950/30', border: 'border-emerald-900/40', label: 'Fresh' },
  moderate: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-950/30', border: 'border-amber-900/40', label: 'Moderate' },
  stale: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-950/30', border: 'border-red-900/40', label: 'Stale' },
};

function FreshnessBadge({ freshness }: { freshness: 'fresh' | 'moderate' | 'stale' }) {
  const cfg = freshnessConfig[freshness];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.border} border ${cfg.color}`}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

export default function DataCatalog() {
  const { regionCode } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'roads' | 'complaints' | 'freshness' | 'name'>('roads');
  const [sortAsc, setSortAsc] = useState(false);

  const allRegions = useMemo(() => {
    const codes = Object.keys(regionInfo);
    return codes.map(computeInventory);
  }, []);

  const filtered = useMemo(() => {
    let items = allRegions;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(r =>
        r.regionName.toLowerCase().includes(q) ||
        r.regionCode.toLowerCase().includes(q)
      );
    }
    items = [...items].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'roads') cmp = a.roadCount - b.roadCount;
      else if (sortBy === 'complaints') cmp = a.complaintCount - b.complaintCount;
      else if (sortBy === 'freshness') cmp = a.lastImportDate.localeCompare(b.lastImportDate);
      else cmp = a.regionName.localeCompare(b.regionName);
      return sortAsc ? cmp : -cmp;
    });
    return items;
  }, [allRegions, searchQuery, sortBy, sortAsc]);

  const totalStats = useMemo(() => ({
    totalRoads: allRegions.reduce((s, r) => s + r.roadCount, 0),
    totalComplaints: allRegions.reduce((s, r) => s + r.complaintCount, 0),
    totalContractors: allRegions.reduce((s, r) => s + r.contractorCount, 0),
    totalKm: allRegions.reduce((s, r) => s + r.totalRoadKm, 0),
    totalRegions: allRegions.length,
  }), [allRegions]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-6 scrollbar-thin">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
            <Database className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-[12px] font-black uppercase text-slate-100 tracking-wider">Data Catalog</h2>
            <p className="text-[9px] text-muted-foreground font-semibold">
              {totalStats.totalRegions} regions &middot; {totalStats.totalRoads} roads &middot; {totalStats.totalKm} km &middot; {totalStats.totalComplaints} complaints
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search regions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-40 text-[9px] bg-slate-950/80 border border-white/[0.06] rounded-xl pl-7 pr-3 py-1.5 text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40"
            />
          </div>
        </div>
      </div>

      {/* Global Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-gradient-to-br from-indigo-950/30 to-slate-900/40 border border-indigo-900/40 rounded-2xl">
          <div className="flex items-center gap-1.5 text-indigo-400 mb-1">
            <Globe className="w-3.5 h-3.5" />
            <span className="text-[8px] font-black uppercase tracking-wider">Regions</span>
          </div>
          <p className="text-sm font-black text-slate-200">{totalStats.totalRegions}</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-cyan-950/30 to-slate-900/40 border border-cyan-900/40 rounded-2xl">
          <div className="flex items-center gap-1.5 text-cyan-400 mb-1">
            <Route className="w-3.5 h-3.5" />
            <span className="text-[8px] font-black uppercase tracking-wider">Total Roads</span>
          </div>
          <p className="text-sm font-black text-slate-200">{totalStats.totalRoads}</p>
          <p className="text-[8px] text-muted-foreground">{totalStats.totalKm} km</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-amber-950/30 to-slate-900/40 border border-amber-900/40 rounded-2xl">
          <div className="flex items-center gap-1.5 text-amber-400 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-[8px] font-black uppercase tracking-wider">Complaints</span>
          </div>
          <p className="text-sm font-black text-slate-200">{totalStats.totalComplaints}</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-emerald-950/30 to-slate-900/40 border border-emerald-900/40 rounded-2xl">
          <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
            <HardHat className="w-3.5 h-3.5" />
            <span className="text-[8px] font-black uppercase tracking-wider">Contractors</span>
          </div>
          <p className="text-sm font-black text-slate-200">{totalStats.totalContractors}</p>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 text-[8px] font-extrabold uppercase tracking-wider text-slate-500">
        <span>Sort by:</span>
        {(['name', 'roads', 'complaints', 'freshness'] as const).map(field => (
          <button
            key={field}
            onClick={() => toggleSort(field)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
              sortBy === field
                ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400'
                : 'bg-slate-950/80 border-white/[0.06] text-slate-400 hover:border-indigo-500/30'
            }`}
          >
            {field === 'name' ? 'Name' : field === 'roads' ? 'Roads' : field === 'complaints' ? 'Complaints' : 'Freshness'}
            {sortBy === field && (
              <ArrowUpDown className={`w-2.5 h-2.5 transition-transform ${sortAsc ? 'rotate-180' : ''}`} />
            )}
          </button>
        ))}
      </div>

      {/* Region Inventory Cards */}
      <div className="space-y-3">
        {filtered.map((inv, idx) => {
          const fc = freshnessConfig[inv.dataFreshness];
          const FreshIcon = fc.icon;
          return (
            <motion.div
              key={inv.regionCode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-4 rounded-2xl border transition-all ${
                regionCode === inv.regionCode
                  ? 'bg-indigo-950/20 border-indigo-500/50 shadow-lg shadow-indigo-500/5'
                  : 'bg-slate-900/40 border-white/[0.06] hover:border-indigo-500/30 hover:bg-slate-900/60'
              }`}
            >
              {/* Region Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{inv.flag}</span>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-200">{inv.regionName}</h3>
                    <p className="text-[8px] text-muted-foreground font-mono">{inv.regionCode}</p>
                  </div>
                </div>
                <FreshnessBadge freshness={inv.dataFreshness} />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[9.5px]">
                <div className="p-2 bg-black/20 rounded-lg">
                  <span className="text-muted-foreground block font-semibold flex items-center gap-1">
                    <Route className="w-2.5 h-2.5" /> Roads
                  </span>
                  <span className="text-slate-200 font-black">{inv.roadCount}</span>
                  <span className="text-[7px] text-muted-foreground ml-1">({inv.totalRoadKm} km)</span>
                  <div className="flex gap-1 mt-1">
                    <span className="text-[7px] text-emerald-400">{inv.roadStatusBreakdown.good}G</span>
                    <span className="text-[7px] text-amber-400">{inv.roadStatusBreakdown.fair}F</span>
                    <span className="text-[7px] text-red-400">{inv.roadStatusBreakdown.poor}P</span>
                  </div>
                </div>
                <div className="p-2 bg-black/20 rounded-lg">
                  <span className="text-muted-foreground block font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> Complaints
                  </span>
                  <span className="text-amber-400 font-black">{inv.complaintCount}</span>
                </div>
                <div className="p-2 bg-black/20 rounded-lg">
                  <span className="text-muted-foreground block font-semibold flex items-center gap-1">
                    <HardHat className="w-2.5 h-2.5" /> Contractors
                  </span>
                  <span className="text-slate-200 font-black">{inv.contractorCount}</span>
                  {inv.blacklistedContractors > 0 && (
                    <span className="text-[7px] text-red-400 ml-1">({inv.blacklistedContractors} flagged)</span>
                  )}
                </div>
                <div className="p-2 bg-black/20 rounded-lg">
                  <span className="text-muted-foreground block font-semibold flex items-center gap-1">
                    <Building2 className="w-2.5 h-2.5" /> Authorities
                  </span>
                  <span className="text-slate-200 font-black">{inv.authorityCount}</span>
                </div>
              </div>

              {/* Footer: Projects, Freshness, Avg Rating */}
              <div className="mt-3 flex items-center justify-between text-[8px] text-muted-foreground border-t border-white/[0.04] pt-3">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="w-2.5 h-2.5" />
                    {inv.projectCount} projects
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-2.5 h-2.5" />
                    Last import: {inv.lastImportDate}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 ${fc.color}`}>
                    <FreshIcon className="w-2.5 h-2.5" />
                    {fc.label}
                  </span>
                  <span className="text-indigo-400">★ {inv.avgRoadRating}/5</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Database className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-[10px] font-semibold">No regions match your search</p>
        </div>
      )}
    </div>
  );
}
