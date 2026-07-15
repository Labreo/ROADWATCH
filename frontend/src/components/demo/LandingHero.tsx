import React, { useEffect, useState } from 'react';
import { Shield, ArrowRight, Activity, Radio, Cpu, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import ErrorBoundary from '../shared/ErrorBoundary';

const RoadInspectionScene = dynamic(
  () => import('../3d/RoadInspectionScene'),
  { ssr: false }
);

interface LandingHeroProps {
  onStartTour: () => void;
  onEnterDirect: () => void;
  onStartDemo: () => void;
}

const TICKER_DATA = [
  'WEH-NH8 highway: unusual vibration detected',
  'All 12 roads — 180 sensors — running normally',
  'Omega Infrastructure: flagged for poor performance',
  'S.V. Road: road foundation damage detected',
  'LBS Marg: ₹14.2Cr used, 87% of budget spent',
  'JVLR-SH1: 14 complaints in 3 days',
  'WEH-NH8: repair patch 7 showing wear',
  'SCLR: drainage at 91% capacity — critical',
  'NHAI-ROM: budget overrun of ₹2.1Cr flagged',
  '12 zones monitored — 4 urgent issues',
];

// Fake mission clock
function useMissionClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        `${String(now.getUTCHours()).padStart(2, '0')}:` +
        `${String(now.getUTCMinutes()).padStart(2, '0')}:` +
        `${String(now.getUTCSeconds()).padStart(2, '0')} UTC`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export default function LandingHero({ onStartTour, onEnterDirect, onStartDemo }: LandingHeroProps) {
  const clock = useMissionClock();
  const [tickerPos, setTickerPos] = useState(0);

  // Animate ticker every 4s
  useEffect(() => {
    const id = setInterval(() => setTickerPos(p => (p + 1) % TICKER_DATA.length), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-[2000] bg-[#050507] flex flex-col overflow-hidden select-none">

      {/* ── Command Grid Background ── */}
      <div className="absolute inset-0 command-grid pointer-events-none" />

      {/* ── Ambient Depth Glow ── */}
      <div className="absolute top-1/3 left-1/4 w-[600px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[350px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* ── Scanline overlay ── */}
      <div
        className="absolute inset-x-0 h-32 pointer-events-none z-[1] opacity-[0.025]"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(34,211,238,0.4), transparent)',
          animation: 'scanline 8s linear infinite',
        }}
      />

      {/* ══════════════ TOP SYSTEM HEADER STRIP ══════════════ */}
      <header className="relative z-10 flex items-center justify-between px-6 py-2.5 border-b border-white/[0.04] bg-black/30 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="status-beacon live" />
          <span className="mono-label text-[9px]">ROADWATCH // ACTIVE</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="mono-label hidden sm:block">
            <span className="text-emerald-400/60">●</span> 12 ROADS MONITORED
          </span>
          <span className="mono-label hidden md:block">
            <span className="text-rose-400/60">●</span> 4 URGENT ISSUES
          </span>
          <span className="mono-readout text-[10px] tabular-nums">{clock}</span>
        </div>
      </header>

      {/* ══════════════ MAIN CONTENT ══════════════ */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-0 min-h-0 overflow-hidden">

        {/* Left Column */}
        <div className="lg:col-span-7 flex flex-col justify-start lg:justify-center px-6 lg:px-14 relative z-10 overflow-y-auto">

          {/* Classification badge */}
          <div className="animate-fade-in-up stagger-1 opacity-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-cyan-500/20 bg-cyan-950/15 text-cyan-500/80">
              <span className="mono-label text-[9px] tracking-[0.2em]">PUBLIC ROAD MONITORING SYSTEM</span>
            </div>
          </div>

          {/* Logo + Title */}
          <div className="space-y-3 lg:space-y-5 animate-fade-in-up stagger-2 opacity-0">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-cyan-500/20 bg-cyan-950/20">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                <div className="absolute inset-0 rounded-xl animate-glow-breathe" />
              </div>
              <div>
                <div className="mono-label text-[7.5px] sm:text-[8px] mb-0.5">MINISTRY OF URBAN DEVELOPMENT</div>
                <h1 className="text-2xl sm:text-4xl font-black tracking-[0.06em] text-slate-100 uppercase">
                  ROAD<span className="text-cyan-400">WATCH</span>
                </h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[#6a6a7a] leading-relaxed max-w-lg font-medium">
              Track road quality and repairs across the city. See sensor data,
              contractor performance scores, and road conditions on a map.
            </p>
          </div>

          {/* Capability cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 animate-fade-in-up stagger-3 opacity-0">
            {[
              {
                icon: Activity,
                color: 'text-cyan-400',
                bg: 'bg-cyan-950/20 border-cyan-500/15',
                label: 'Road Map',
                desc: 'See road conditions and repair history on a city map'
              },
              {
                icon: Radio,
                color: 'text-indigo-400',
                bg: 'bg-indigo-950/20 border-indigo-500/15',
                label: 'Sensor Network',
                desc: '180 sensors tracking road conditions across 12 roads'
              },
              {
                icon: Cpu,
                color: 'text-amber-400',
                bg: 'bg-amber-950/20 border-amber-500/15',
                label: 'Ratings',
                desc: 'Contractor performance scores and road health reports'
              },
            ].map(({ icon: Icon, color, bg, label, desc }) => (
              <div key={label} className={`p-3 sm:p-4 rounded-lg border ${bg} space-y-2`}>
                <div className={`flex items-center gap-2 ${color}`}>
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-200">{label}</span>
                </div>
                <p className="text-[8.5px] sm:text-[9px] text-[#55555f] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-x-4 gap-y-3 sm:gap-6 animate-fade-in-up stagger-4 opacity-0">
            {[
              { val: '12', label: 'Road Segments' },
              { val: '180', label: 'Sensor Feeds' },
              { val: '4', label: 'Critical Alerts' },
              { val: '₹92Cr', label: 'Budget Tracked' },
            ].map(({ val, label }) => (
              <div key={label} className="text-left sm:text-center">
                <div className="mono-readout text-sm sm:text-base">{val}</div>
                <div className="mono-label text-[7.5px] sm:text-[8px] mt-0.5 whitespace-nowrap">{label}</div>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full animate-fade-in-up stagger-5 opacity-0">
            <button
              onClick={onStartDemo}
              className="group relative flex items-center justify-center gap-2.5 px-6 py-3 sm:py-3.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/30 active:scale-95 overflow-hidden"
            >
              <span className="absolute inset-0 rounded-lg animate-pulse bg-cyan-400/20" />
              <Sparkles className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Demo Mode</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 relative z-10" />
            </button>
            <div className="grid grid-cols-2 gap-2.5 w-full sm:flex sm:w-auto sm:gap-3">
              <button
                onClick={onEnterDirect}
                className="flex items-center justify-center gap-2.5 px-6 py-3 sm:py-3.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/10 active:scale-95"
              >
                Launch Platform
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={onStartTour}
                className="flex items-center justify-center gap-2 px-6 py-3 sm:py-3.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-300 hover:text-slate-100 hover:border-white/[0.14] text-xs font-black uppercase tracking-widest transition-all active:scale-95"
              >
                Interactive Tour
              </button>
            </div>
          </div>

          {/* Footer line */}
          <div className="mono-label text-[8px] animate-fade-in-up stagger-6 opacity-0">
            MINISTRY OF URBAN DEVELOPMENT © 2026
          </div>
        </div>

        {/* Right Column — 3D Scene */}
        <div className="lg:col-span-5 relative bg-black/20 border-l border-white/[0.03] overflow-hidden min-h-[320px]">
          {/* Corner tags */}
          <div className="absolute top-3 left-3 z-10 mono-label text-[8px] opacity-50">3D VIEW</div>
          <div className="absolute top-3 right-3 z-10 mono-label text-[8px] opacity-50">CAMERA 1</div>
          <div className="absolute bottom-3 left-3 z-10 mono-label text-[8px] opacity-50">STATUS: OK</div>
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5">
            <div className="status-beacon live w-[5px] h-[5px]" />
            <span className="mono-label text-[8px] opacity-50">LIVE</span>
          </div>

          {/* Scan corner decorators */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-cyan-500/30 pointer-events-none" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-cyan-500/30 pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-cyan-500/30 pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-cyan-500/30 pointer-events-none" />

          <div className="absolute inset-0 z-0">
            <ErrorBoundary fallback={
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950/40 p-6 text-center select-none">
                <span className="mono-label text-[10px] text-cyan-500/60 uppercase tracking-widest animate-pulse">
                  3D Engine Offline / WebGL Unsupported
                </span>
                <span className="text-[9px] text-muted-foreground mt-2 max-w-[240px] leading-relaxed">
                  The platform runs normally in 2D mode. Click "Launch Platform" to proceed.
                </span>
              </div>
            }>
              <RoadInspectionScene />
            </ErrorBoundary>
          </div>
        </div>
      </div>

      {/* ══════════════ BOTTOM TELEMETRY TICKER ══════════════ */}
      <footer className="relative z-10 flex items-center gap-4 px-6 py-2 border-t border-white/[0.04] bg-black/30 backdrop-blur-sm shrink-0 overflow-hidden">
        <span className="mono-label text-[9px] text-cyan-500/60 shrink-0 tracking-[0.2em]">LIVE UPDATES</span>
        <div className="flex-1 overflow-hidden">
          <div
            key={tickerPos}
            className="mono-label text-[9px] text-[#4a4a5a] whitespace-nowrap animate-fade-in-up"
          >
            {TICKER_DATA[tickerPos]}
          </div>
        </div>
        <span className="mono-label text-[9px] opacity-40 shrink-0">{tickerPos + 1}/{TICKER_DATA.length}</span>
      </footer>
    </div>
  );
}
