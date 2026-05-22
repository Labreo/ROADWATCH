'use client';

import React from 'react';
import { ScoreDeduction } from '@/types';
import { motion } from 'framer-motion';
import { getScoreGrade } from '@/services/transparencyEngine';
import { Check, ShieldAlert, Coins, Clock, AlertTriangle, MessageSquareCode } from 'lucide-react';

interface TransparencyScoreCardProps {
  score: number;
  deductions: ScoreDeduction[];
}

export default function TransparencyScoreCard({ score, deductions }: TransparencyScoreCardProps) {
  const { grade, color, bg } = getScoreGrade(score);

  // SVG Gauge calculations
  const size = 110;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getDeductionIcon = (category: string) => {
    switch (category) {
      case 'budget':
        return <Coins className="w-3.5 h-3.5 text-red-400" />;
      case 'delay':
        return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      case 'quality':
        return <ShieldAlert className="w-3.5 h-3.5 text-red-500" />;
      case 'anomaly':
        return <AlertTriangle className="w-3.5 h-3.5 text-orange-450" />;
      case 'complaints':
        return <MessageSquareCode className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getDialColor = (val: number) => {
    if (val >= 80) return '#10b981'; // Emerald
    if (val >= 65) return '#06b6d4'; // Cyan/Teal
    if (val >= 50) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  return (
    <div className="glass-panel p-5 rounded-xl border border-border/60 bg-slate-950/10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
      {/* Dial Gauge */}
      <div className="md:col-span-4 flex flex-col items-center justify-center space-y-2">
        <div className="relative" style={{ width: size, height: size }}>
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#0f172a"
              strokeWidth={strokeWidth}
            />
            {/* Filled circle */}
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={getDialColor(score)}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: 'easeOut' }}
              strokeLinecap="round"
            />
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider leading-none">Score</span>
            <span className="text-xl font-black text-slate-100 leading-tight mt-0.5">{score}</span>
            <span className="text-[8px] text-muted-foreground leading-none">/ 100</span>
          </div>
        </div>

        {/* Grade Badge */}
        <div className={`text-[10px] font-black px-3 py-1 border rounded-full uppercase tracking-wider ${bg} ${color}`}>
          Audit Grade {grade}
        </div>
      </div>

      {/* Audit Logs */}
      <div className="md:col-span-8 space-y-3">
        <div>
          <h4 className="text-[10px] text-slate-200 uppercase font-black tracking-widest">Acoustic Audit & Infraction Ledger</h4>
          <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">
            Automatic integrity and delay tracking calculations. Points are deducted for cost variances, contract halts, repeated repaving, and active alerts.
          </p>
        </div>

        {deductions.length > 0 ? (
          <div className="space-y-2 max-h-[145px] overflow-y-auto pr-1">
            {deductions.map((d, index) => (
              <div 
                key={index} 
                className="flex items-start justify-between gap-3 p-2 rounded bg-slate-950/40 border border-border/30 hover:border-slate-800 transition-colors"
              >
                <div className="flex gap-2">
                  <span className="mt-0.5 shrink-0">{getDeductionIcon(d.category)}</span>
                  <span className="text-[9px] text-slate-300 font-bold leading-normal">{d.reason}</span>
                </div>
                <span className="text-[9px] font-extrabold text-red-400 bg-red-950/40 border border-red-900/60 px-1.5 py-0.2 rounded shrink-0">
                  -{d.points} pts
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3.5 rounded bg-emerald-950/20 border border-emerald-900/40 flex items-start gap-2.5">
            <div className="p-1 rounded-full bg-emerald-500 text-slate-950 mt-0.5 shrink-0">
              <Check className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-0.5">
              <h5 className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">Perfect Account Record</h5>
              <p className="text-[9px] text-emerald-500/80 leading-normal font-medium">
                No budget variances, structural delays, low-rated contractors, or unresolved citizen complaints logged on this segment.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
