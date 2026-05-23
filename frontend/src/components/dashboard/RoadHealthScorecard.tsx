'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Coins, 
  HardHat, 
  AlertTriangle, 
  ShieldCheck, 
  Info, 
  Check, 
  Clock, 
  ShieldAlert, 
  MessageSquareCode,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Road, Project, Contractor, Complaint } from '@/types';
import { calculateRoadHealthIntelligence, RoadHealthIntelligence } from '@/services/healthIntelligence';

interface RoadHealthScorecardProps {
  road: Road;
  projects: Project[];
  contractors: Contractor[];
  complaints: Complaint[];
}

type MetricType = 'health' | 'transparency' | 'contractor' | 'risk';

export default function RoadHealthScorecard({
  road,
  projects,
  contractors,
  complaints
}: RoadHealthScorecardProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('health');
  
  // Calculate intelligence metrics on mount/change
  const intel = calculateRoadHealthIntelligence(road, projects, contractors, complaints);

  // SVG Radial Dial config
  const dialSize = 64;
  const strokeWidth = 5;
  const radius = (dialSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const getDialColor = (type: MetricType, value: number) => {
    if (type === 'risk') {
      // For risk, high values are BAD (Red), low are GOOD (Emerald)
      if (value > 65) return '#f87171'; // Desaturated Rose Red
      if (value > 30) return '#fbbf24'; // Desaturated Amber
      return '#34d399'; // Desaturated Emerald Green
    } else {
      // For other scores, high is GOOD (Emerald), low is BAD (Red)
      if (value >= 80) return '#34d399'; // Desaturated Emerald Green
      if (value >= 50) return '#fbbf24'; // Desaturated Amber
      return '#f87171'; // Desaturated Rose Red
    }
  };

  const getDeductionIcon = (category: string) => {
    switch (category) {
      // Health deductions
      case 'complaint':
        return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
      case 'gap':
        return <Calendar className="w-3.5 h-3.5 text-amber-400" />;
      case 'frequency':
        return <Activity className="w-3.5 h-3.5 text-orange-400" />;
      
      // Transparency deductions
      case 'overrun':
        return <Coins className="w-3.5 h-3.5 text-red-400" />;
      case 'delay':
        return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      case 'contractor':
        return <ShieldAlert className="w-3.5 h-3.5 text-red-500" />;
      case 'repeat':
        return <AlertTriangle className="w-3.5 h-3.5 text-orange-450" />;
      default:
        return <Info className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Helper for UI badges
  const getSeverityBadge = (type: MetricType, value: number) => {
    if (type === 'risk') {
      if (value > 65) return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-950/60 text-red-400 border border-red-900/60 uppercase">High Risk</span>;
      if (value > 30) return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-400 border border-amber-900/60 uppercase">Med Risk</span>;
      return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-900/60 uppercase">Low Risk</span>;
    } else {
      if (value >= 80) return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-900/60 uppercase">Good</span>;
      if (value >= 50) return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-400 border border-amber-900/60 uppercase">Fair</span>;
      return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-950/60 text-red-400 border border-red-900/60 uppercase">Poor</span>;
    }
  };

  // Radial indicators data mapping
  const metrics = [
    {
      id: 'health' as MetricType,
      label: 'Road Health',
      value: intel.healthScore,
      unit: '%',
      icon: <Activity className="w-4 h-4 text-zinc-450" />,
      description: 'Based on active complaints, repair counts, and time since last pave.'
    },
    {
      id: 'transparency' as MetricType,
      label: 'Transparency',
      value: intel.transparencyScore,
      unit: '%',
      icon: <Coins className="w-4 h-4 text-zinc-450" />,
      description: 'Based on budget variances, contract delays, and contractor rating audits.'
    },
    {
      id: 'contractor' as MetricType,
      label: 'Contractor IQ',
      value: intel.contractorReliabilityScore,
      unit: '%',
      icon: <HardHat className="w-4 h-4 text-zinc-450" />,
      description: 'Average completion rate and score of contractors assigned to this segment.'
    },
    {
      id: 'risk' as MetricType,
      label: 'Damage Risk',
      value: intel.recurringDamageRisk,
      unit: '%',
      icon: <AlertTriangle className="w-4 h-4 text-zinc-450" />,
      description: 'Forecasted repeat damage based on waterlogging & paving decay records.'
    }
  ];

  return (
    <div className="space-y-4">
      {/* 2x2 Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {metrics.map((m) => {
          const isSelected = selectedMetric === m.id;
          const strokeOffset = circumference - (m.value / 100) * circumference;
          
          return (
            <button
              key={m.id}
              onClick={() => setSelectedMetric(m.id)}
              className={`p-3 rounded-xl border text-left transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between h-[115px] ${
                isSelected 
                  ? 'bg-zinc-900 border-zinc-700/60 shadow-[0_1px_3px_rgba(0,0,0,0.15)]' 
                  : 'bg-zinc-950/20 border-border/40 hover:border-zinc-800'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</span>
                <span className="opacity-80 shrink-0">{m.icon}</span>
              </div>

              {/* Radial Dial Indicator */}
              <div className="flex items-center gap-3 mt-1.5">
                <div className="relative shrink-0" style={{ width: dialSize, height: dialSize }}>
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx={dialSize / 2}
                      cy={dialSize / 2}
                      r={radius}
                      fill="transparent"
                      stroke="#0f172a"
                      strokeWidth={strokeWidth}
                    />
                    <motion.circle
                      cx={dialSize / 2}
                      cy={dialSize / 2}
                      r={radius}
                      fill="transparent"
                      stroke={getDialColor(m.id, m.value)}
                      strokeWidth={strokeWidth}
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset: strokeOffset }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] font-black text-slate-100 leading-tight">
                      {m.value}
                      <span className="text-[8px] text-muted-foreground">{m.unit}</span>
                    </span>
                  </div>
                </div>

                {/* Score Status Badge */}
                <div className="flex flex-col gap-1">
                  {getSeverityBadge(m.id, m.value)}
                  <span className="text-[8px] text-muted-foreground italic">Click to audit</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Explanatory Deterministic Audits Board */}
      <div className="glass-panel p-3.5 rounded-xl border border-border/50 bg-slate-950/20 space-y-3">
        {/* Active Tab Info */}
        <div className="border-b border-border/40 pb-2 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-200">
              {selectedMetric === 'health' && 'Road Health Score Audit'}
              {selectedMetric === 'transparency' && 'Transparency Rating Audit'}
              {selectedMetric === 'contractor' && 'Contractor Reliability Audit'}
              {selectedMetric === 'risk' && 'Recurring Damage Risk Audit'}
            </h4>
            <p className="text-[9px] text-muted-foreground mt-0.5 leading-snug">
              {metrics.find(m => m.id === selectedMetric)?.description}
            </p>
          </div>
        </div>

        {/* Audit Details */}
        <div className="space-y-2">
          {selectedMetric === 'health' && (
            intel.healthDeductions.length > 0 ? (
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {intel.healthDeductions.map((d, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 p-2 rounded bg-zinc-900/40 border border-border/30">
                    <div className="flex gap-2">
                      <span className="mt-0.5 shrink-0">{getDeductionIcon(d.category)}</span>
                      <span className="text-[9.5px] text-slate-350 font-semibold leading-normal">{d.reason}</span>
                    </div>
                    {d.points !== 0 && (
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded shrink-0 ${
                        d.points > 0 ? 'bg-red-955/20 text-red-400 border border-red-900/40' : 'bg-zinc-800 text-zinc-300 border border-border'
                      }`}>
                        {d.points > 0 ? `-${d.points}` : d.points} pts
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded bg-emerald-950/15 border border-emerald-900/30 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Excellent Road Health</h5>
                  <p className="text-[9px] text-emerald-500/80 leading-normal mt-0.5">
                    No active pothole, waterlogging, or pavement damage reports logged on this segment. Last paving is within optimal lifecycle limits.
                  </p>
                </div>
              </div>
            )
          )}

          {selectedMetric === 'transparency' && (
            intel.transparencyDeductions.length > 0 ? (
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {intel.transparencyDeductions.map((d, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 p-2 rounded bg-zinc-900/40 border border-border/30">
                    <div className="flex gap-2">
                      <span className="mt-0.5 shrink-0">{getDeductionIcon(d.category)}</span>
                      <span className="text-[9.5px] text-slate-350 font-semibold leading-normal">{d.reason}</span>
                    </div>
                    <span className="text-[9px] font-extrabold text-red-400 bg-red-955/20 border border-red-900/40 px-1.5 py-0.2 rounded shrink-0">
                      -{d.points} pts
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded bg-emerald-950/15 border border-emerald-900/30 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Flawless Integrity Audit</h5>
                  <p className="text-[9px] text-emerald-500/80 leading-normal mt-0.5">
                    No budget variances, structural delays, low-rated contractors, or repeated repairs logged on this contract ledger.
                  </p>
                </div>
              </div>
            )
          )}

          {selectedMetric === 'contractor' && (
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {intel.reliabilityFactors.map((f, i) => (
                <div key={i} className="p-2 rounded bg-zinc-900/40 border border-border/30 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-200">{f.contractorName}</span>
                    <span className={`text-[9px] font-extrabold border px-1.5 py-0.2 rounded uppercase ${
                      f.isBlacklisted ? 'bg-red-955/20 text-red-400 border border-red-900/40' :
                      f.score >= 80 ? 'bg-emerald-955/20 text-emerald-400 border-emerald-900/45' :
                      f.score >= 50 ? 'bg-amber-955/20 text-amber-400 border-amber-900/45' :
                      'bg-red-955/20 text-red-400 border-red-900/40'
                    }`}>
                      IQ: {f.score}%
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">{f.reason}</p>
                </div>
              ))}
            </div>
          )}

          {selectedMetric === 'risk' && (
            intel.damageRiskFactors.length > 0 ? (
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {intel.damageRiskFactors.map((f, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 p-2 rounded bg-zinc-900/40 border border-border/30">
                    <div className="flex gap-2">
                      <span className="mt-0.5 shrink-0">
                        {f.type === 'waterlogging' ? <AlertCircle className="w-3.5 h-3.5 text-blue-400" /> :
                         f.type === 'pothole' ? <AlertCircle className="w-3.5 h-3.5 text-rose-450" /> :
                         f.type === 'repeat' ? <AlertTriangle className="w-3.5 h-3.5 text-orange-450" /> :
                         <Info className="w-3.5 h-3.5 text-slate-400" />}
                      </span>
                      <span className="text-[9.5px] text-slate-350 font-semibold leading-normal">{f.reason}</span>
                    </div>
                    <span className="text-[9px] font-extrabold text-rose-400 bg-rose-955/20 border border-rose-900/40 px-1.5 py-0.2 rounded shrink-0">
                      +{f.percentage}% Risk
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded bg-emerald-950/15 border border-emerald-900/30 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Minimal Structural Risk</h5>
                  <p className="text-[9px] text-emerald-500/80 leading-normal mt-0.5">
                    Substrate integrity is verified. No repeat repair anomalies, waterlogging hazards, or early asphalt stripping indicators.
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        {/* Confidence Footer */}
        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[9px]">
          <span className="text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-zinc-500" />
            <span>Audit Confidence:</span>
          </span>
          <span className="font-extrabold text-slate-350">
            {intel.confidenceScore}% — <span className="text-zinc-400 font-semibold">{intel.confidenceLevel}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
