'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatINR } from '@/services/transparencyEngine';

interface ChartDataItem {
  label: string;
  sanctioned: number;
  spent: number;
  extraInfo?: string;
}

interface SpendingComparisonChartProps {
  data: ChartDataItem[];
  height?: number;
}

export default function SpendingComparisonChart({ data, height = 225 }: SpendingComparisonChartProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center border border-dashed border-border/40 rounded-xl p-8 text-xs text-muted-foreground">
        No budget data available for chart.
      </div>
    );
  }

  // Find max value for scaling the Y axis
  const maxVal = Math.max(...data.map(d => Math.max(d.sanctioned, d.spent)), 1000000); // at least 1M base

  // Padding & SVG Layout
  const paddingLeft = 65;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 35;
  
  const chartHeight = height - paddingTop - paddingBottom;
  const widthRatio = 100; // relative percentage
  
  // Format numbers for Y-axis labels (e.g., 200M, 15L, etc.)
  const formatYLabel = (num: number) => {
    if (num >= 10000000) {
      return `${(num / 10000000).toFixed(1)} Cr`;
    }
    if (num >= 100000) {
      return `${(num / 100000).toFixed(0)} L`;
    }
    return `${num / 1000}`;
  };

  // Generate 4 ticks
  const yTicks = [0, maxVal * 0.33, maxVal * 0.66, maxVal];

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Tooltip position relative to the chart container
    const chartContainer = e.currentTarget.closest('.chart-container-root');
    if (chartContainer) {
      const containerRect = chartContainer.getBoundingClientRect();
      setTooltipPos({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 10
      });
    }
    setActiveIdx(index);
  };

  return (
    <div className="chart-container-root relative w-full bg-slate-950/20 border border-border/40 rounded-xl p-4 flex flex-col justify-between">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Financial Expenditure Variance</span>
        <div className="flex gap-4 text-[9px] font-bold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500 block"></span>
            <span className="text-slate-300">Sanctioned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-cyan-500 block"></span>
            <span className="text-slate-300">Spent</span>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto select-none" style={{ height: `${height}px` }}>
        <div className="min-w-[500px] h-full relative">
          <svg className="w-full h-full">
            {/* Background Grid Lines & Y-Axis Ticks */}
            {yTicks.map((tick, i) => {
              const y = paddingTop + chartHeight - (tick / maxVal) * chartHeight;
              return (
                <g key={i} className="opacity-40">
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={`calc(100% - ${paddingRight}px)`}
                    y2={y}
                    stroke="var(--color-border, #1e293b)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingLeft - 10}
                    y={y + 3}
                    textAnchor="end"
                    fill="#94a3b8"
                    className="text-[9px] font-black"
                  >
                    {formatYLabel(tick)}
                  </text>
                </g>
              );
            })}

            {/* Bars Rendering */}
            {data.map((item, index) => {
              const count = data.length;
              const containerWidth = 100 - (paddingLeft / 5) - (paddingRight / 5); // Rough estimation
              // Let's divide available width among items
              const startXPercent = paddingLeft + (index * (100 - paddingLeft - paddingRight)) / count;
              const sectionWidth = (100 - paddingLeft - paddingRight) / count;
              
              // Map to specific widths in SVG coordinates
              const barGroupWidth = Math.min(24, (500 - paddingLeft - paddingRight) / count * 0.5);
              const barWidth = barGroupWidth / 2 - 2;

              const sanctionedHeight = (item.sanctioned / maxVal) * chartHeight;
              const spentHeight = (item.spent / maxVal) * chartHeight;

              const ySanctioned = paddingTop + chartHeight - sanctionedHeight;
              const ySpent = paddingTop + chartHeight - spentHeight;

              const isOver = item.spent > item.sanctioned;

              return (
                <g key={index} className="group">
                  {/* Invisible broad hitbox for better hover trigger */}
                  <rect
                    x={`${startXPercent}%`}
                    y={paddingTop}
                    width={`${sectionWidth}%`}
                    height={chartHeight + 10}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={(e) => handleMouseMove(e, index)}
                    onMouseMove={(e) => handleMouseMove(e, index)}
                    onMouseLeave={() => setActiveIdx(null)}
                  />

                  {/* Sanctioned Bar */}
                  <motion.rect
                    x={`calc(${startXPercent}% + ${sectionWidth}% / 2 - ${barGroupWidth}px / 2)`}
                    y={ySanctioned}
                    width={barWidth}
                    height={sanctionedHeight}
                    fill="url(#sanctionedGrad)"
                    rx={2}
                    className="transition-all duration-300"
                    style={{
                      opacity: activeIdx === null || activeIdx === index ? 1 : 0.4
                    }}
                  />

                  {/* Spent Bar */}
                  <motion.rect
                    x={`calc(${startXPercent}% + ${sectionWidth}% / 2 - ${barGroupWidth}px / 2 + ${barWidth + 2}px)`}
                    y={ySpent}
                    width={barWidth}
                    height={spentHeight}
                    fill={isOver ? 'url(#overSpentGrad)' : 'url(#spentGrad)'}
                    rx={2}
                    className="transition-all duration-300"
                    style={{
                      opacity: activeIdx === null || activeIdx === index ? 1 : 0.4
                    }}
                  />

                  {/* Label */}
                  <text
                    x={`calc(${startXPercent}% + ${sectionWidth}% / 2)`}
                    y={paddingTop + chartHeight + 16}
                    textAnchor="middle"
                    fill={activeIdx === index ? '#f1f5f9' : '#64748b'}
                    className={`text-[8px] font-bold tracking-wide uppercase transition-colors`}
                  >
                    {item.label.length > 12 ? `${item.label.slice(0, 10)}...` : item.label}
                  </text>
                </g>
              );
            })}

            {/* Gradients declarations */}
            <defs>
              <linearGradient id="sanctionedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#047857" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="spentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#0e7490" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="overSpentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.3" />
              </linearGradient>
            </defs>
          </svg>

          {/* Interactive Tooltip using Framer Motion */}
          <AnimatePresence>
            {activeIdx !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute z-20 pointer-events-none bg-slate-900/95 backdrop-blur border border-border rounded-lg p-3 text-[10px] space-y-1.5 shadow-xl min-w-[160px]"
                style={{
                  left: `${tooltipPos.x}px`,
                  top: `${tooltipPos.y}px`,
                  transform: 'translate(-50%, -100%)'
                }}
              >
                <div className="font-extrabold text-slate-100 uppercase border-b border-border/40 pb-1 flex justify-between">
                  <span>{data[activeIdx].label}</span>
                  {data[activeIdx].extraInfo && (
                    <span className="text-[8px] text-muted-foreground">{data[activeIdx].extraInfo}</span>
                  )}
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Sanctioned:</span>
                  <span className="font-bold text-emerald-400">{formatINR(data[activeIdx].sanctioned)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Spent:</span>
                  <span className="font-bold text-cyan-400">{formatINR(data[activeIdx].spent)}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-border/20 pt-1">
                  <span className="text-muted-foreground">Variance Rate:</span>
                  <span className={`font-black ${data[activeIdx].spent > data[activeIdx].sanctioned ? 'text-red-400' : 'text-cyan-400'}`}>
                    {Math.round((data[activeIdx].spent / data[activeIdx].sanctioned) * 100)}%
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
