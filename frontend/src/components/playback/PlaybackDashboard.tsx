'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { roads } from '@/data/mockData';
import { getHistoricalRoadState } from '@/data/historicalData';
import MapWrapper from '@/components/map/MapWrapper';
import TimelineSlider from './TimelineSlider';
import PlaybackEventPanel from './PlaybackEventPanel';
import { Search, SlidersHorizontal, History, MapPin, Activity } from 'lucide-react';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

export default function PlaybackDashboard({ embedded = false }: { embedded?: boolean } = {}) {
  const {
    selectedRoadId,
    setSelectedRoadId,
    currentPlaybackStepId
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');

  // Auto-select SV Road (ID: 3) on mount if nothing is selected, for seed showcase
  useEffect(() => {
    if (!selectedRoadId) {
      setSelectedRoadId(3);
    }
  }, [selectedRoadId, setSelectedRoadId]);

  // Filter roads based on search query
  const filteredRoads = useMemo(() => {
    return roads.filter(road => {
      const matchesSearch = road.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            road.roadCode.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [searchQuery]);

  const getStatusColorBadge = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40';
      case 'fair':
        return 'bg-amber-950/80 text-amber-400 border border-amber-800/40';
      case 'poor':
        return 'bg-red-950/80 text-red-400 border border-red-800/40';
      case 'under_construction':
        return 'bg-zinc-900 border border-zinc-800 text-zinc-350 animate-pulse';
      default:
        return 'bg-slate-900 text-slate-400 border border-border';
    }
  };

  return (
    <div className={embedded
      ? 'w-full flex flex-col gap-4 p-4 animate-in fade-in duration-300'
      : 'flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden animate-in fade-in duration-300 relative lg:pointer-events-none'
    }>
      {/* Left Column: Historical Registry list */}
      <section className={embedded
        ? 'w-full flex flex-col glass-panel rounded-xl pointer-events-auto p-4 space-y-4'
        : 'w-full lg:w-[320px] lg:absolute lg:left-4 lg:top-4 lg:bottom-4 lg:z-10 lg:h-auto flex flex-col glass-panel rounded-xl pointer-events-auto p-4 space-y-4 relative z-10'
      }>
        <div>
          <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 block">Timeline filter</label>
          <div className="relative">
            <Search className="absolute top-2.5 left-3 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search roads by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-border/80 rounded-lg placeholder-muted-foreground text-slate-100 focus:outline-none focus:border-zinc-700/60 focus:ring-1 focus:ring-zinc-800 transition-all"
            />
          </div>
        </div>

        {/* Info header */}
        <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold tracking-widest text-slate-350 border-b border-border/40 pb-2">
          <History className="w-4 h-4 text-zinc-500" />
          <span>Road Chronology Registry</span>
        </div>

        {/* Scrollable list */}
        <div className={embedded ? 'max-h-[300px] overflow-y-auto space-y-2 pr-1' : 'flex-1 overflow-y-auto space-y-2 pr-1'}>
          {filteredRoads.map((road) => {
            const isSelected = selectedRoadId === road.id;
            const histState = getHistoricalRoadState(road.id, currentPlaybackStepId);

            return (
              <button
                key={road.id}
                onClick={() => setSelectedRoadId(road.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected 
                    ? 'bg-slate-900 border-zinc-500/80 shadow-sm shadow-zinc-950/45' 
                    : 'bg-slate-955/20 border-border/45 hover:border-slate-800'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-border/20">
                      {road.roadCode}
                    </span>
                    <span className={`text-[8.5px] font-bold uppercase px-1.5 py-0.2 rounded capitalize ${getStatusColorBadge(histState.status)}`}>
                      {histState.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 truncate leading-snug">{road.name}</h4>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Length: {road.lengthKm} km</p>
                </div>
                
                {/* Visual health score circle indicator */}
                <div className="flex flex-col items-center shrink-0">
                  <span className="text-[8px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Health</span>
                  <span className="text-xs font-black text-slate-100">{histState.healthScore}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Center Column: Leaflet Map view with timeline scrubber */}
      <section className={embedded
        ? 'w-full h-[340px] pointer-events-auto relative rounded-xl overflow-hidden'
        : 'w-full h-[350px] lg:h-auto lg:absolute lg:inset-0 lg:z-0 pointer-events-auto'
      }>
        <ErrorBoundary>
          <MapWrapper />
        </ErrorBoundary>

        {/* Cinematic Timeline Slider Floating Panel */}
        <TimelineSlider />
      </section>

      {/* Right Column: Historical Playback Event Panel */}
      <section className={embedded
        ? 'w-full flex flex-col glass-panel rounded-xl overflow-hidden shadow-2xl pointer-events-auto'
        : 'w-full lg:w-[350px] lg:absolute lg:right-4 lg:top-4 lg:bottom-4 lg:z-10 lg:h-auto flex flex-col glass-panel rounded-xl overflow-hidden shadow-2xl pointer-events-auto relative z-10 transition-all duration-300 animate-in slide-in-from-bottom lg:slide-in-from-right'
      }>
        <PlaybackEventPanel />
      </section>
    </div>
  );
}
