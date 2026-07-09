import React from 'react';
import { motion } from 'framer-motion';
import { Landmark, Phone, Mail, MapPin, ArrowRightCircle, User } from 'lucide-react';
import type { RoutingDetail } from '@/types';

interface RoutedToCardProps {
  routing: RoutingDetail;
}

// Fallback avatar colors per authority
const AVATAR_COLORS: Record<number, { bg: string; ring: string; initials: string }> = {
  1: { bg: 'from-cyan-600 to-cyan-800', ring: 'ring-cyan-500/40', initials: 'KW' },
  2: { bg: 'from-indigo-600 to-indigo-800', ring: 'ring-indigo-500/40', initials: 'FN' },
  3: { bg: 'from-violet-600 to-violet-800', ring: 'ring-violet-500/40', initials: 'HE' },
  4: { bg: 'from-amber-600 to-amber-800', ring: 'ring-amber-500/40', initials: 'PW' },
  5: { bg: 'from-emerald-600 to-emerald-800', ring: 'ring-emerald-500/40', initials: 'NH' },
};

function getInitials(name: string): string {
  return name
    .replace(/^(Er|Mr|Ms|Mrs|Dr)\.?\s*/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function getAvatarColors(authId: number) {
  return AVATAR_COLORS[authId] || { bg: 'from-slate-600 to-slate-800', ring: 'ring-slate-500/40', initials: 'NA' };
}

export default function RoutedToCard({ routing }: RoutedToCardProps) {
  const colors = getAvatarColors(routing.authority_id);
  const initials = getInitials(routing.executive_engineer_name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mt-4 pt-3 border-t border-border/40"
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <ArrowRightCircle className="w-3 h-3 text-cyan-400" />
        <span className="text-[10px] text-cyan-400/80 uppercase font-black tracking-widest">
          Routed To
        </span>
      </div>

      <div className="relative overflow-hidden glass-panel rounded-xl border border-cyan-500/30 bg-slate-950/50">
        {/* Gradient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-cyan-500" />

        <div className="p-3.5 space-y-3 relative z-10">
          {/* Authority Name + Region */}
          <div className="flex items-start gap-3">
            {/* Engineer Avatar */}
            <div className={`shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${colors.bg} ring-2 ${colors.ring} flex items-center justify-center shadow-lg`}>
              <span className="text-[10px] font-black text-slate-100">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h5 className="text-[11px] font-bold text-slate-200 leading-tight">
                {routing.authority_name}
              </h5>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-2.5 h-2.5 text-cyan-500/70 shrink-0" />
                <span className="text-[9px] text-slate-400 truncate">{routing.region}</span>
              </div>
            </div>
          </div>

          {/* Executive Engineer Details */}
          <div className="bg-slate-950/60 rounded-lg border border-slate-800/60 p-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-3 h-3 text-cyan-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-200 block leading-tight">
                  {routing.executive_engineer_name}
                </span>
                <span className="text-[8px] text-slate-400 block">
                  {routing.designation}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[9px] text-slate-400">
              <a
                href={`tel:${routing.contact}`}
                className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
              >
                <Phone className="w-2.5 h-2.5" />
                {routing.contact}
              </a>
              <a
                href={`mailto:${routing.email}`}
                className="flex items-center gap-1 hover:text-cyan-400 transition-colors min-w-0"
              >
                <Mail className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{routing.email}</span>
              </a>
            </div>
          </div>

          {/* Routing Reason */}
          <div className="text-[9px] text-slate-400 leading-relaxed italic border-t border-slate-800/40 pt-2">
            {routing.reason_for_routing}
          </div>
        </div>
      </div>
    </motion.div>
  );
}