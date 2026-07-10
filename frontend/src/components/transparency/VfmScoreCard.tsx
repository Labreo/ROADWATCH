'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { ValueForMoneyData } from '@/types';
import { formatCurrency } from '@/services/regionAwareFormat';

interface VfmScoreCardProps {
  data: ValueForMoneyData;
  showDetails?: boolean;
}

function getVfmGrade(vfm: number): { grade: string; color: string; label: string } {
  if (vfm >= 80) return { grade: 'A', color: 'text-emerald-400', label: 'Excellent Value' };
  if (vfm >= 65) return { grade: 'B', color: 'text-cyan-400', label: 'Good Value' };
  if (vfm >= 50) return { grade: 'C', color: 'text-amber-400', label: 'Average Value' };
  if (vfm >= 35) return { grade: 'D', color: 'text-orange-400', label: 'Below Average' };
  return { grade: 'F', color: 'text-red-400', label: 'Poor Value' };
}

function VfmGauge({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (value / 100) * circumference;
  const grade = getVfmGrade(value);

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8"
          className="text-slate-800/60" />
        <motion.circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={grade.color.replace('text-', 'text-').replace('text-', 'stroke-')}
          style={{ stroke: `var(--${grade.color.replace('text-', '')})` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-black ${grade.color}`}>{value}</span>
        <span className="text-[10px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

export default function VfmScoreCard({ data, showDetails = true }: VfmScoreCardProps) {
  const grade = getVfmGrade(data.vfmIndex);

  if (data.vfmIndex === 0) {
    return (
      <div className="p-4 rounded-xl border border-border/40 bg-slate-900/40 backdrop-blur-sm text-center">
        <Award className="w-8 h-8 mx-auto text-slate-500 mb-2" />
        <p className="text-xs text-muted-foreground">Insufficient data to calculate VfM index.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border border-border/40 bg-slate-900/40 backdrop-blur-sm space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-100">Value-for-Money</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${grade.color} border-current/30 bg-current/10`}>
            {grade.grade}
          </span>
        </div>
      </div>

      <VfmGauge value={data.vfmIndex} />

      <div className="text-center">
        <p className="text-xs font-medium text-slate-300">{data.roadName}</p>
        <p className={`text-xs ${grade.color}`}>{grade.label}</p>
      </div>

      {data.vfmNormalized !== undefined && (
        <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          <span>Normalized: {data.vfmNormalized}/100 ({data.regionCode})</span>
        </div>
      )}

      {showDetails && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/20">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <DollarSign className="w-3 h-3" />
              <span>Cost per km</span>
            </div>
            <p className="text-sm font-bold text-slate-200">{formatCurrency(data.costPerKm)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              <span>Quality Score</span>
            </div>
            <p className="text-sm font-bold text-slate-200">{data.qualityScore}/100</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>Projects</span>
            </div>
            <p className="text-sm font-bold text-slate-200">{data.projectCount}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <AlertTriangle className="w-3 h-3" />
              <span>Active Complaints</span>
            </div>
            <p className="text-sm font-bold text-slate-200">{data.activeComplaints}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
