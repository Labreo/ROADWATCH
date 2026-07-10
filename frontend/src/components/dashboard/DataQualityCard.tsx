'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoadDataQuality, DataQualityDimension } from '@/types';
import {
  AlertTriangle, CheckCircle, ChevronDown, Clock, Cpu, Database,
  FileText, Globe, HelpCircle, Shield, Wifi
} from 'lucide-react';

interface DataQualityCardProps {
  roadId: number;
  initialData?: RoadDataQuality;
}

export default function DataQualityCard({ roadId, initialData }: DataQualityCardProps) {
  const [data, setData] = useState<RoadDataQuality | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [expandedDim, setExpandedDim] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/data-quality/road/${roadId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [roadId, initialData]);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return { ring: 'stroke-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-950/30', border: 'border-emerald-900/40' };
      case 'B': return { ring: 'stroke-lime-400', text: 'text-lime-400', bg: 'bg-lime-950/30', border: 'border-lime-900/40' };
      case 'C': return { ring: 'stroke-amber-400', text: 'text-amber-400', bg: 'bg-amber-950/30', border: 'border-amber-900/40' };
      case 'D': return { ring: 'stroke-orange-400', text: 'text-orange-400', bg: 'bg-orange-950/30', border: 'border-orange-900/40' };
      default:  return { ring: 'stroke-red-400', text: 'text-red-400', bg: 'bg-red-950/30', border: 'border-red-900/40' };
    }
  };

  const getDimIcon = (dim: string) => {
    switch (dim) {
      case 'completeness':   return <Database className="w-3.5 h-3.5" />;
      case 'freshness':      return <Clock className="w-3.5 h-3.5" />;
      case 'consistency':    return <Shield className="w-3.5 h-3.5" />;
      case 'spatial_validity': return <Globe className="w-3.5 h-3.5" />;
      default:               return <Cpu className="w-3.5 h-3.5" />;
    }
  };

  const getDimLabel = (dim: string) => {
    switch (dim) {
      case 'completeness':   return 'Completeness';
      case 'freshness':      return 'Freshness';
      case 'consistency':    return 'Consistency';
      case 'spatial_validity': return 'Spatial Validity';
      default:               return dim;
    }
  };

  const renderDimBar = (dimKey: string, dim: DataQualityDimension) => {
    const isExpanded = expandedDim === dimKey;
    const pct = Math.min(dim.score / 25 * 100, 100);

    return (
      <div key={dimKey} className="space-y-1">
        <button
          onClick={() => setExpandedDim(isExpanded ? null : dimKey)}
          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-900/40 transition-colors cursor-pointer"
        >
          <span className="text-zinc-400 shrink-0">{getDimIcon(dimKey)}</span>
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider min-w-20">
            {getDimLabel(dimKey)}
          </span>
          <div className="flex-1 h-2 bg-slate-800/60 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
            />
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400 min-w-8 text-right">{dim.score.toFixed(1)}</span>
          <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="pl-8 pr-2 overflow-hidden"
            >
              <div className="p-2 rounded-lg bg-slate-950/40 border border-border/30 space-y-1.5 text-[9.5px]">
                {dim.missing && dim.missing.length > 0 && (
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-amber-300 font-bold">Missing fields: </span>
                      <span className="text-slate-400">{dim.missing.join(', ')}</span>
                    </div>
                  </div>
                )}
                {dim.missing && dim.missing.length === 0 && (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-emerald-400 font-bold">All fields populated</span>
                  </div>
                )}
                {dim.issues && dim.issues.length > 0 && dim.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <HelpCircle className="w-3 h-3 text-zinc-500 shrink-0 mt-0.5" />
                    <span className="text-slate-400">{issue}</span>
                  </div>
                ))}
                {dim.issues && dim.issues.length === 0 && dimKey !== 'completeness' && (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-emerald-400 font-bold">No issues detected</span>
                  </div>
                )}
                {dimKey === 'freshness' && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-zinc-500 shrink-0" />
                    <span className="text-slate-400">
                      Last data: {dim.lastDate || 'never'} ({dim.ageDays !== null ? `${dim.ageDays} days ago` : 'N/A'})
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="glass-panel p-4 rounded-xl border border-border/60 bg-slate-950/15 space-y-3 animate-pulse">
        <div className="flex items-center gap-1.5 border-b border-border/40 pb-2">
          <Cpu className="w-4 h-4 text-zinc-600" />
          <div className="h-3 w-32 bg-slate-800/60 rounded" />
        </div>
        <div className="flex justify-center py-4">
          <div className="h-20 w-20 rounded-full bg-slate-800/40" />
        </div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-4 bg-slate-800/40 rounded" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-panel p-4 rounded-xl border border-red-900/40 bg-red-950/15">
        <div className="flex items-center gap-2 text-red-400 text-xs">
          <AlertTriangle className="w-4 h-4" />
          <span className="font-bold">Data quality unavailable</span>
        </div>
        <p className="text-[10px] text-red-400/70 mt-1">{error || 'No data returned'}</p>
      </div>
    );
  }

  const gc = getGradeColor(data.grade);

  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (data.overall_score / 100) * circumference;

  return (
    <div className="glass-panel p-4 rounded-xl border border-border/60 bg-slate-950/15 space-y-3">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-zinc-400" />
          <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">
            Data Quality
          </h3>
        </div>
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${gc.border} ${gc.bg} ${gc.text}`}>
          Grade {data.grade}
        </span>
      </div>

      <div className="flex items-center justify-center py-2">
        <div className="relative">
          <svg width="100" height="100" className="transform -rotate-90">
            <circle cx="50" cy="50" r="36" fill="none" stroke="rgb(30 41 59)" strokeWidth="6" />
            <motion.circle
              cx="50" cy="50" r="36" fill="none"
              className={gc.ring}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-black ${gc.text}`}>{data.overall_score}</span>
            <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">/ 100</span>
          </div>
        </div>
      </div>

      <div className="text-center">
        <span className="text-[10px] font-bold text-slate-400">{data.road_name}</span>
        <span className="text-[9px] text-zinc-600 ml-1.5 font-mono">{data.road_code}</span>
      </div>

      <div className="space-y-0.5">
        {Object.entries(data.dimensions).map(([key, dim]) => renderDimBar(key, dim as DataQualityDimension))}
      </div>

      <div className="pt-1 border-t border-border/40 flex items-center justify-between text-[8.5px] text-zinc-500">
        <span className="flex items-center gap-1">
          <Wifi className="w-3 h-3" />
          Evaluated
        </span>
        <span className="font-mono">{new Date(data.evaluated_at).toLocaleString()}</span>
      </div>
    </div>
  );
}
