'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { regionInfo } from '@/data/regionsMockData';

// ---------------------------------------------------------------------------
// Road classification definitions per region
// ---------------------------------------------------------------------------
const REGION_CLASSIFICATIONS: Record<string, { code: string; name: string; color: string; description: string }[]> = {
  IN: [
    { code: 'NH',   name: 'National Highway',   color: '#22d3ee', description: 'Major inter-state arterial roads under NHAI jurisdiction' },
    { code: 'SH',   name: 'State Highway',       color: '#10b981', description: 'Intra-state primary connectors under State PWD' },
    { code: 'RD',   name: 'District Road',       color: '#f59e0b', description: 'Local municipal roads under ward corporations' },
  ],
  GB: [
    { code: 'M',    name: 'Motorway',            color: '#22d3ee', description: 'High-speed dual carriageway, National Highways managed' },
    { code: 'A',    name: 'A-Road',              color: '#10b981', description: 'Primary route, trunk or principal road network' },
    { code: 'B',    name: 'B-Road',              color: '#f59e0b', description: 'Secondary distributor road connecting smaller settlements' },
  ],
  US: [
    { code: 'I',    name: 'Interstate Highway',  color: '#22d3ee', description: 'Limited-access national highway system, FHWA oversight' },
    { code: 'US',   name: 'US Highway',          color: '#10b981', description: 'Pre-interstate numbered routes, state-maintained' },
    { code: 'SR',   name: 'State Route',         color: '#f59e0b', description: 'State-level maintained roads, numbered by state DOT' },
  ],
  KE: [
    { code: 'A',    name: 'Highway',             color: '#22d3ee', description: 'National trunk road, KeNHA managed network' },
    { code: 'B',    name: 'Primary Road',        color: '#f59e0b', description: 'Primary county connector, KURA or KeRRA managed' },
    { code: 'C',    name: 'Secondary Road',      color: '#a78bfa', description: 'Rural feeder road, county government maintained' },
  ],
};

// ---------------------------------------------------------------------------
// Status color key shown at the bottom of the legend
// ---------------------------------------------------------------------------
const STATUS_COLORS: Record<string, string> = {
  good:               '#10b981',
  fair:               '#f59e0b',
  poor:               '#f43f5e',
  under_construction: '#71717a',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function RoadClassificationLegend() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeRegion, setActiveRegion] = useState<string>('IN');

  const regions = Object.entries(regionInfo);
  const classifications = REGION_CLASSIFICATIONS[activeRegion] ?? [];
  const info = regionInfo[activeRegion as keyof typeof regionInfo];

  return (
    <div className="absolute bottom-4 left-4 z-[1005] flex flex-col gap-2">

      {/* ---- Toggle button ---- */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="glass-depth-2 border border-border/80 rounded-xl px-3 py-2 shadow-2xl flex items-center gap-2 hover:bg-white/[0.06] transition-all duration-200 cursor-pointer"
        aria-label={isOpen ? 'Close road classification legend' : 'Open road classification legend'}
        aria-expanded={isOpen}
      >
        {/* Map layers icon */}
        <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Classifications</span>
        <svg
          className={`w-3 h-3 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ---- Legend panel ---- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="glass-depth-2 border border-border/80 rounded-2xl shadow-2xl overflow-hidden w-[340px] max-w-[calc(100vw-2rem)]"
            role="region"
            aria-label="Road classification legend"
          >
            {/* Header */}
            <div className="px-4 pt-3 pb-2 border-b border-white/[0.06]">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Road Classification by Region
              </h3>
            </div>

            {/* ---- Region tabs ---- */}
            <div
              className="flex gap-1 px-3 pt-3 pb-2 overflow-x-auto"
              role="tablist"
              aria-label="Select region"
            >
              {regions.map(([code, info]) => (
                <button
                  key={code}
                  role="tab"
                  aria-selected={activeRegion === code}
                  onClick={() => setActiveRegion(code)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all duration-150 whitespace-nowrap cursor-pointer ${
                    activeRegion === code
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <span className="text-xs leading-none" aria-hidden="true">{info.flag}</span>
                  <span>{code}</span>
                </button>
              ))}
            </div>

            {/* ---- Classification table for active region ---- */}
            <div className="px-3 pb-3 pt-1" role="tabpanel" aria-label={`${info?.name ?? activeRegion} road classifications`}>
              {/* Region identifier row */}
              {info && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-[10px]" aria-hidden="true">{info.flag}</span>
                  <span className="text-[10px] font-bold text-slate-200">{info.name}</span>
                  <span className="text-[8px] text-muted-foreground ml-auto font-mono">{info.roadNaming}</span>
                </div>
              )}

              <div className="space-y-0.5">
                {classifications.map((entry) => (
                  <div
                    key={entry.code}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                  >
                    {/* Color swatch */}
                    <span
                      className="w-3 h-3 rounded-sm shrink-0 shadow-sm ring-1 ring-white/[0.1]"
                      style={{ backgroundColor: entry.color }}
                      aria-hidden="true"
                    />

                    {/* Code badge */}
                    <span className="text-[9px] font-mono font-bold text-slate-300 bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.06] min-w-[30px] text-center shrink-0">
                      {entry.code}
                    </span>

                    {/* Classification name */}
                    <span className="text-[10px] font-semibold text-slate-200 min-w-[80px] shrink-0">
                      {entry.name}
                    </span>

                    {/* Description */}
                    <span className="text-[8px] text-muted-foreground leading-tight">
                      {entry.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ---- Status color key footer ---- */}
            <div className="px-4 py-2.5 border-t border-white/[0.06] bg-white/[0.02]">
              <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">
                Road Status Key
              </span>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <span className="w-2 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[8px] font-semibold text-slate-300 capitalize">
                      {status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}