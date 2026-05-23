'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { playbackSteps } from '@/data/historicalData';
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  Gauge
} from 'lucide-react';

export default function TimelineSlider() {
  const {
    currentPlaybackStepId,
    isPlaybackPlaying,
    playbackSpeed,
    setPlaybackStepId,
    setPlaybackPlaying,
    setPlaybackSpeed,
    stepPlaybackForward,
    stepPlaybackBackward
  } = useStore();

  const currentIndex = playbackSteps.findIndex(s => s.id === currentPlaybackStepId);
  const activeStep = playbackSteps[currentIndex === -1 ? 0 : currentIndex];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    if (!isNaN(idx) && idx >= 0 && idx < playbackSteps.length) {
      setPlaybackStepId(playbackSteps[idx].id);
    }
  };

  const handleReset = () => {
    setPlaybackStepId(playbackSteps[0].id);
    setPlaybackPlaying(false);
  };

  const handleSpeedToggle = (speedMs: number) => {
    setPlaybackSpeed(speedMs);
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 z-[1000] p-4 glass-panel rounded-2xl border border-border/80 shadow-2xl flex flex-col md:flex-row items-center gap-4 bg-slate-950/90 text-foreground">
      {/* Controls Container */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleReset}
          className="p-2 rounded-xl border border-border/60 hover:bg-slate-900 transition-colors text-muted-foreground hover:text-foreground"
          title="Reset to Beginning"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={stepPlaybackBackward}
          disabled={currentIndex <= 0}
          className="p-2 rounded-xl border border-border/60 hover:bg-slate-900 transition-colors text-slate-350 hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
          title="Step Backward"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => setPlaybackPlaying(!isPlaybackPlaying)}
          className={`p-3 rounded-xl transition-all shadow-md ${
            isPlaybackPlaying 
              ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20' 
              : 'bg-slate-900 hover:bg-slate-800 border border-border/80 text-cyan-400'
          }`}
          title={isPlaybackPlaying ? 'Pause Playback' : 'Play Timeline'}
        >
          {isPlaybackPlaying ? (
            <Pause className="w-4 h-4 fill-slate-950" />
          ) : (
            <Play className="w-4 h-4 fill-cyan-400 translate-x-0.2" />
          )}
        </button>

        <button
          onClick={stepPlaybackForward}
          disabled={currentIndex >= playbackSteps.length - 1}
          className="p-2 rounded-xl border border-border/60 hover:bg-slate-900 transition-colors text-slate-350 hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
          title="Step Forward"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Timeline Slider and Label Bar */}
      <div className="flex-1 w-full space-y-1">
        <div className="flex justify-between items-center text-[10px] px-1.5 font-bold uppercase tracking-wider text-muted-foreground">
          <span>Timeline Scrubber</span>
          <span className="text-cyan-400 bg-cyan-950/40 border border-cyan-900/60 px-2 py-0.5 rounded animate-pulse">
            Active: {activeStep.label} ({activeStep.date})
          </span>
        </div>

        {/* Input Range Slider */}
        <div className="relative flex items-center h-6">
          <input
            type="range"
            min={0}
            max={playbackSteps.length - 1}
            value={currentIndex === -1 ? 0 : currentIndex}
            onChange={handleSliderChange}
            className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none"
            style={{
              background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${
                (currentIndex / (playbackSteps.length - 1)) * 100
              }%, #1e293b ${(currentIndex / (playbackSteps.length - 1)) * 100}%, #1e293b 100%)`
            }}
          />
        </div>

        {/* Playback Ticks Row */}
        <div className="hidden lg:flex justify-between px-1 text-[8px] text-muted-foreground font-semibold">
          {playbackSteps.map((step, idx) => {
            const isSelected = step.id === currentPlaybackStepId;
            return (
              <button
                key={step.id}
                onClick={() => setPlaybackStepId(step.id)}
                className={`transition-colors border-t border-border pt-1 hover:text-slate-200 cursor-pointer ${
                  isSelected ? 'text-cyan-400 border-cyan-500/80 font-black' : 'border-slate-800'
                }`}
                style={{ width: `${100 / playbackSteps.length}%` }}
              >
                {step.label.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Speed Dial Tray */}
      <div className="flex items-center gap-1.5 border-l border-border/80 pl-4 shrink-0">
        <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
        <div className="flex bg-slate-900 rounded-xl p-0.5 border border-border/60">
          {[
            { label: '0.5x', ms: 2500 },
            { label: '1.0x', ms: 1200 },
            { label: '2.0x', ms: 600 }
          ].map((sp) => {
            const isSelected = playbackSpeed === sp.ms;
            return (
              <button
                key={sp.label}
                onClick={() => handleSpeedToggle(sp.ms)}
                className={`text-[9px] font-extrabold px-2.5 py-1 rounded-lg uppercase transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-slate-950 text-cyan-400 border border-cyan-800/40 shadow-inner' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {sp.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
