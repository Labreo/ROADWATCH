'use client';

import React, { useMemo } from 'react';

interface StressIndicatorProps {
  value: number;          // 0–100
  level: 'nominal' | 'elevated' | 'critical';
  width?: number;
  height?: number;
  showLabel?: boolean;
  animated?: boolean;
}

const LEVEL_STROKE: Record<string, string> = {
  nominal:  '#34d399',
  elevated: '#f59e0b',
  critical: '#f43f5e',
};

const LEVEL_GLOW: Record<string, string> = {
  nominal:  'rgba(52,211,153,0.25)',
  elevated: 'rgba(245,158,11,0.3)',
  critical: 'rgba(244,63,94,0.35)',
};

/**
 * Generates an SVG oscilloscope waveform path.
 * Amplitude scales with the stress value (0–100).
 * Critical waveforms show irregular spikes (clipping distortion).
 */
function buildWavePath(
  value: number,
  level: string,
  w: number,
  h: number
): string {
  const mid = h / 2;
  const amplitude = (value / 100) * (h * 0.42);
  const cycles = 4;
  const points: string[] = [];

  for (let i = 0; i <= w; i += 2) {
    const t = (i / w) * cycles * Math.PI * 2;
    let y = mid - Math.sin(t) * amplitude;

    // Add distortion noise for critical/elevated
    if (level === 'critical' && i % 22 < 6) {
      y += (Math.sin(t * 3.7) * amplitude * 0.5);
    } else if (level === 'elevated' && i % 40 < 8) {
      y += (Math.sin(t * 2.2) * amplitude * 0.25);
    }

    // Clamp within bounds
    y = Math.max(2, Math.min(h - 2, y));
    points.push(`${i},${y.toFixed(1)}`);
  }

  return `M${points.join(' L')}`;
}

export default function StressIndicator({
  value,
  level,
  width = 160,
  height = 36,
  showLabel = false,
  animated = true,
}: StressIndicatorProps) {
  const path = useMemo(
    () => buildWavePath(value, level, width, height),
    [value, level, width, height]
  );

  const stroke = LEVEL_STROKE[level] ?? '#34d399';
  const glow   = LEVEL_GLOW[level] ?? 'transparent';
  const filterId = `glow-${level}-${width}`;

  // Speed: critical = fastest
  const duration = level === 'critical' ? '0.9s' : level === 'elevated' ? '1.8s' : '3.5s';
  const opacity  = level === 'nominal' ? 0.6 : 1;

  return (
    <div className="flex flex-col gap-1">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <filter id={filterId} x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Baseline */}
        <line
          x1={0} y1={height / 2}
          x2={width} y2={height / 2}
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={0.5}
        />

        {/* Threshold zones */}
        <rect x={0} y={0} width={width} height={height * 0.25} fill="rgba(244,63,94,0.03)" />
        <rect x={0} y={height * 0.75} width={width} height={height * 0.25} fill="rgba(244,63,94,0.03)" />

        {/* Glow layer — thick, blurred, low opacity */}
        {animated && (
          <path
            d={path}
            stroke={stroke}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeOpacity={0.18}
            filter={`url(#${filterId})`}
            strokeDasharray={120}
            style={{
              animation: `stress-wave ${duration} linear infinite`,
              willChange: 'stroke-dashoffset',
            }}
          />
        )}

        {/* Main waveform */}
        <path
          d={path}
          stroke={stroke}
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeOpacity={opacity}
          strokeDasharray={120}
          style={animated ? {
            animation: `stress-wave ${duration} linear infinite`,
            willChange: 'stroke-dashoffset',
          } : {}}
        />
      </svg>

      {showLabel && (
        <div className="flex justify-between">
          <span className="mono-label text-[8px]">STRESS WAVE</span>
          <span className="mono-readout text-[9px]" style={{ color: stroke }}>
            {value.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}
