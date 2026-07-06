'use client';

import { useEffect, useState } from 'react';
import { Clock, AlertTriangle, ChevronRight, Building2, Phone, Mail, ShieldAlert, UserCheck, Siren } from 'lucide-react';
import { Complaint, EscalationLevel } from '@/types';

interface CommissionerContact {
  title: string;
  name: string;
  email: string;
  phone: string;
  department: string;
}

function getCommissionerContact(authorityId: number): CommissionerContact {
  const registry: Record<number, CommissionerContact> = {
    1: {
      title: 'Municipal Commissioner',
      name: 'Rajesh Kumar Sharma',
      email: 'commiss.kwest@mcgm.gov.in',
      phone: '+91-22-2623-5000',
      department: 'MCGM - Ward K-West'
    },
    2: {
      title: 'Municipal Commissioner',
      name: 'Anita Deshpande',
      email: 'commiss.fnorth@mcgm.gov.in',
      phone: '+91-22-2402-6000',
      department: 'MCGM - Ward F-North'
    },
    3: {
      title: 'Municipal Commissioner',
      name: 'Suresh Patil',
      email: 'commiss.heast@mcgm.gov.in',
      phone: '+91-22-2618-7000',
      department: 'MCGM - Ward H-East'
    },
    4: {
      title: 'Chief Engineer',
      name: 'Vikram Joshi',
      email: 'ce.mumbai@pwd.gov.in',
      phone: '+91-22-2202-8000',
      department: 'State PWD - Mumbai Division'
    },
    5: {
      title: 'Regional Officer',
      name: 'Arun Mehta',
      email: 'ro.mumbai@nhai.org',
      phone: '+91-22-2756-9000',
      department: 'NHAI - RO Mumbai'
    }
  };
  return registry[authorityId] || registry[1];
}

interface EscalationSLAAlertProps {
  complaint: Complaint;
  compact?: boolean;
}

export default function EscalationSLAAlert({ complaint, compact }: EscalationSLAAlertProps) {
  const [deltaHours, setDeltaHours] = useState(0);
  const [currentLevel, setCurrentLevel] = useState<EscalationLevel>(0);

  useEffect(() => {
    const created = new Date(complaint.createdAt).getTime();
    const now = Date.now();
    const dt = Math.max(0, (now - created) / 3600000);
    setDeltaHours(dt);

    if (complaint.status === 'resolved' || complaint.status === 'rejected') {
      setCurrentLevel(0);
      return;
    }

    if (dt > 72) {
      setCurrentLevel(2);
    } else if (dt > 48) {
      setCurrentLevel(1);
    } else {
      setCurrentLevel(0);
    }
  }, [complaint.createdAt, complaint.status]);

  const isBreached = currentLevel === 2;
  const isElevated = currentLevel === 1;

  const hoursDisplay = deltaHours.toFixed(1);
  const daysDisplay = (deltaHours / 24).toFixed(1);
  const progress72 = Math.min(100, (deltaHours / 72) * 100);

  const commissioner = getCommissionerContact(complaint.assignedAuthorityId);

  const levelLabel = (() => {
    if (isBreached) return 'SLA BREACH - LEVEL 2 ESCALATION';
    if (isElevated) return 'ELEVATED - LEVEL 1 ESCALATION';
    return 'LEVEL 0 - ASSIGNED ENGINEER';
  })();

  const levelColor = isBreached
    ? 'text-rose-400 border-rose-500/40 bg-rose-950/30'
    : isElevated
    ? 'text-amber-400 border-amber-500/40 bg-amber-950/30'
    : 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';

  const containerBorder = isBreached
    ? 'border-rose-500/30 shadow-[0_0_24px_-4px_rgba(244,63,94,0.15)]'
    : isElevated
    ? 'border-amber-500/20'
    : 'border-border/60';

  if (compact) {
    return (
      <div className={`rounded-lg border ${containerBorder} bg-slate-950/60 p-2.5 space-y-1.5 ${isBreached ? 'animate-pulse' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className={`w-3 h-3 ${isBreached ? 'text-rose-400' : isElevated ? 'text-amber-400' : 'text-cyan-400'}`} />
            <span className="mono-readout text-[9px] font-bold text-slate-300">{hoursDisplay}h</span>
          </div>
          <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm border ${levelColor}`}>
            {isBreached ? 'BREACH' : isElevated ? 'ELEVATED' : 'ON TRACK'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${containerBorder} bg-slate-900/30 p-4 space-y-3 ${isBreached ? 'animate-pulse' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${isBreached ? 'text-rose-400' : isElevated ? 'text-amber-400' : 'text-cyan-400'}`} />
          <span className="mono-label text-[9px] tracking-wider text-slate-400 font-black uppercase">SLA TRACKING</span>
        </div>
        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm border ${levelColor}`}>
          {levelLabel}
        </span>
      </div>

      {/* Timer & Progress */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="mono-readout text-2xl font-black text-slate-100">{hoursDisplay}</span>
          <span className="mono-label text-[10px] text-slate-500">hours elapsed ({daysDisplay}d)</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-border/20">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isBreached ? 'bg-rose-500' : isElevated ? 'bg-amber-500' : 'bg-cyan-500'
            }`}
            style={{ width: `${Math.min(100, progress72)}%` }}
          />
        </div>
        <div className="flex justify-between text-[8px] text-slate-600 font-mono">
          <span>0h</span>
          <span>24h</span>
          <span>48h</span>
          <span>72h</span>
        </div>
      </div>

      {/* Level Indicators */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { level: 0 as EscalationLevel, label: 'Assigned Engineer', icon: UserCheck },
          { level: 1 as EscalationLevel, label: 'Executive Engineer', icon: ShieldAlert },
          { level: 2 as EscalationLevel, label: 'Municipal Commissioner', icon: Building2 },
        ].map((l) => {
          const active = currentLevel >= l.level;
          const Icon = l.icon;
          return (
            <div
              key={l.level}
              className={`rounded border p-2 text-center transition-all ${
                active && currentLevel === l.level
                  ? isBreached
                    ? 'border-rose-500/40 bg-rose-950/20'
                    : isElevated
                    ? 'border-amber-500/40 bg-amber-950/20'
                    : 'border-emerald-500/30 bg-emerald-950/15'
                  : active
                  ? 'border-cyan-500/20 bg-cyan-950/10'
                  : 'border-border/30 bg-slate-950/30 opacity-40'
              }`}
            >
              <Icon className={`w-3 h-3 mx-auto mb-0.5 ${active ? (isBreached && currentLevel === l.level ? 'text-rose-400' : isElevated && currentLevel === l.level ? 'text-amber-400' : 'text-cyan-400') : 'text-slate-600'}`} />
              <span className="block text-[7px] font-extrabold uppercase tracking-wider text-slate-400">
                {l.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Breach Escalation Card */}
      {isBreached && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-950/15 p-3 space-y-2">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Municipal Commissioner Escalation</span>
          </div>
          <div className="space-y-1.5 pl-6">
            <p className="text-[11px] font-bold text-slate-200">{commissioner.name}</p>
            <p className="text-[9px] text-slate-400">{commissioner.title}</p>
            <div className="flex flex-col gap-1 text-[9px] text-slate-400 font-medium">
              <span className="flex items-center gap-1.5"><Building2 className="w-3 h-3 text-rose-500/70" /> {commissioner.department}</span>
              <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-rose-500/70" /> {commissioner.email}</span>
              <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-rose-500/70" /> {commissioner.phone}</span>
            </div>
          </div>
        </div>
      )}

      {/* Elevated Notice */}
      {isElevated && !isBreached && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-2.5 flex items-start gap-2">
          <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[9px] text-amber-300 leading-relaxed font-medium">
            SLA approaching breach threshold. Complaint has been active for over 48 hours. Escalation to Executive Engineer is recommended if not resolved within 24 hours.
          </p>
        </div>
      )}
    </div>
  );
}
