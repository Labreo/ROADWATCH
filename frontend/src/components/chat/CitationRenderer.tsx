import React from 'react';
import { 
  MapPin, 
  HardHat, 
  Landmark, 
  ShieldAlert, 
  ShieldCheck, 
  ExternalLink,
  Mail,
  Phone
} from 'lucide-react';

export interface Citation {
  type: 'road' | 'contractor' | 'authority';
  id: number;
  name: string;
  code?: string;
  status?: string;
  length?: number;
  rating?: number;
  blacklisted?: boolean;
}

interface CitationRendererProps {
  citations: Citation[];
  onSelectRoad?: (id: number) => void;
  onSelectContractor?: (id: number) => void;
}

export default function CitationRenderer({ 
  citations, 
  onSelectRoad, 
  onSelectContractor 
}: CitationRendererProps) {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-border/40 space-y-2.5">
      <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest block">
        Source Records Verified
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {citations.map((cite, idx) => {
          if (cite.type === 'road') {
            return (
              <div 
                key={`cite-road-${cite.id}-${idx}`}
                onClick={() => onSelectRoad?.(cite.id)}
                className="group relative overflow-hidden glass-panel p-3 rounded-xl border border-border/60 hover:border-cyan-500/50 bg-slate-950/40 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 select-none"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start gap-2.5 relative z-10">
                  <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-900/60 text-cyan-400">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-1.5">
                      <span className="text-[8px] font-black uppercase text-cyan-500/80 tracking-wider truncate">
                        {cite.code || 'Road ID: ' + cite.id}
                      </span>
                      <ExternalLink className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <h5 className="text-[11px] font-bold text-slate-200 line-clamp-1 group-hover:text-cyan-455 transition-colors">
                      {cite.name}
                    </h5>
                    <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-1">
                      <span>{cite.length} km</span>
                      <span className={`text-[8px] font-extrabold px-1 rounded border uppercase ${
                        cite.status === 'good' ? 'text-emerald-400 border-emerald-950/60 bg-emerald-950/30' :
                        cite.status === 'poor' ? 'text-red-400 border-red-950/60 bg-red-950/30' :
                        'text-amber-400 border-amber-950/60 bg-amber-950/30'
                      }`}>
                        {cite.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          if (cite.type === 'contractor') {
            return (
              <div 
                key={`cite-contractor-${cite.id}-${idx}`}
                onClick={() => onSelectContractor?.(cite.id)}
                className="group relative overflow-hidden glass-panel p-3 rounded-xl border border-border/60 hover:border-indigo-500/50 bg-slate-950/40 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 select-none"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start gap-2.5 relative z-10">
                  <div className="p-1.5 rounded-lg bg-indigo-950/60 border border-indigo-900/60 text-indigo-400">
                    <HardHat className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-1.5">
                      <span className="text-[8px] font-black uppercase text-indigo-500/80 tracking-wider">
                        Contractor Scorecard
                      </span>
                      <ExternalLink className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <h5 className="text-[11px] font-bold text-slate-200 line-clamp-1 group-hover:text-indigo-455 transition-colors">
                      {cite.name}
                    </h5>
                    <div className="flex items-center justify-between text-[9px] mt-1.5">
                      {cite.blacklisted ? (
                        <span className="text-[8px] font-black text-red-500 border border-red-950/60 bg-red-950/30 px-1 rounded flex items-center gap-0.5 uppercase tracking-wider shrink-0">
                          <ShieldAlert className="w-2.5 h-2.5" /> Blacklisted
                        </span>
                      ) : (
                        <span className="text-[8px] font-black text-emerald-400 border border-emerald-955/60 bg-emerald-955/20 px-1 rounded flex items-center gap-0.5 uppercase tracking-wider shrink-0">
                          <ShieldCheck className="w-2.5 h-2.5" /> Active
                        </span>
                      )}
                      <span className="text-amber-500 font-extrabold text-[10px] shrink-0">
                        ★ {cite.rating?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          if (cite.type === 'authority') {
            return (
              <div 
                key={`cite-auth-${cite.id}-${idx}`}
                className="relative overflow-hidden glass-panel p-3 rounded-xl border border-border/60 bg-slate-950/40 select-none sm:col-span-2"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
                    <Landmark className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">
                      Supervising Department
                    </span>
                    <h5 className="text-[11px] font-bold text-slate-200 truncate">
                      {cite.name}
                    </h5>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[9px] text-muted-foreground mt-1.5 border-t border-border/10 pt-1.5">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-cyan-500" />
                        {cite.code ? cite.code.toLowerCase() : 'contact'}@mcgm.gov.in
                      </span>
                      {cite.id === 5 && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-cyan-500" />
                          +91-22-2756-4444
                        </span>
                      )}
                      {cite.id === 1 && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-cyan-500" />
                          +91-22-2623-0000
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
