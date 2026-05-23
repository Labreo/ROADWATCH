import React from 'react';
import { Shield, Sparkles, Map, HardHat, Coins, Play, Layout } from 'lucide-react';

interface LandingHeroProps {
  onStartTour: () => void;
  onEnterDirect: () => void;
}

export default function LandingHero({ onStartTour, onEnterDirect }: LandingHeroProps) {
  return (
    <div className="fixed inset-0 z-[2000] bg-[#090b11] flex flex-col items-center justify-center p-6 overflow-y-auto select-none">
      
      {/* Cinematic Glowing Background circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
      
      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b08_1px,transparent_1px),linear-gradient(to_bottom,#1e293b08_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] pointer-events-none" />

      {/* Main Content Box */}
      <div className="max-w-3xl w-full space-y-8 relative z-10 animate-fade-in-up">
        
        {/* Top Badge */}
        <div className="flex justify-center">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 text-[10px] font-black uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            National Innovation Initiative Funded
          </div>
        </div>

        {/* Portal Branding */}
        <div className="space-y-3.5 text-center">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-xl shadow-cyan-500/15 border border-cyan-400/20">
              <Shield className="w-9 h-9 text-slate-950" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-widest text-slate-100 uppercase font-sans">
            ROAD<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">WATCH</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 tracking-wider max-w-xl mx-auto leading-relaxed font-semibold">
            Next-Generation Civil Infrastructure Transparency & Integrity Audit System. Designed to map road quality, track contractor delay variances, and route defect repairs.
          </p>
        </div>

        {/* Core Capabilities Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left pt-4">
          <div className="glass-panel p-4 rounded-2xl border border-border bg-slate-950/45 space-y-2">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-900/60 text-cyan-400 w-fit">
              <Map className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-black uppercase text-slate-200">GIS Spatial Audit</h3>
            <p className="text-[10px] text-muted-foreground leading-normal font-semibold">
              Plot road segments, active works, and routing boundaries overlaying ward jurisdictions.
            </p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-border bg-slate-950/45 space-y-2">
            <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-900/60 text-indigo-400 w-fit">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-black uppercase text-slate-200">RAG Chatbot Assistant</h3>
            <p className="text-[10px] text-muted-foreground leading-normal font-semibold">
              Deterministic, non-hallucinated natural language Q&A driven by backend SQLite schemas.
            </p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-border bg-slate-950/45 space-y-2">
            <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-900/60 text-amber-500 w-fit">
              <HardHat className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-black uppercase text-slate-200">Contractor Scorecard</h3>
            <p className="text-[10px] text-muted-foreground leading-normal font-semibold">
              Dynamic delay metrics, reliability rankings, and public funding audit transparency scores.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4 max-w-md mx-auto">
          <button
            onClick={onStartTour}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            Guided Interactive Tour
          </button>
          
          <button
            onClick={onEnterDirect}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-900 border border-border/80 text-slate-200 hover:text-white hover:border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <Layout className="w-4 h-4" />
            Launch Platform Direct
          </button>
        </div>

        {/* Footer info */}
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider text-center select-none pt-4">
          Ministry of Urban Development & Infrastructure Oversight © 2026
        </p>

      </div>
    </div>
  );
}
