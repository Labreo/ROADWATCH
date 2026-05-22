'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, FinancialAnomaly } from '@/types';
import { AlertTriangle, Info, Calendar } from 'lucide-react';
import { formatINR } from '@/services/transparencyEngine';

interface RepairFrequencyHeatmapProps {
  projects: Project[];
  anomalies: FinancialAnomaly[];
}

interface CellData {
  year: number;
  quarter: number; // 1, 2, 3, 4
  projectsActive: Project[];
  anomalyInCell: FinancialAnomaly | null;
  quarterLabel: string;
}

export default function RepairFrequencyHeatmap({ projects, anomalies }: RepairFrequencyHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<CellData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const years = [2023, 2024, 2025, 2026];
  const quarters = [1, 2, 3, 4];
  const qNames = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];

  // Helper to determine if a project was active in a specific quarter
  const getProjectsForCell = (year: number, q: number): Project[] => {
    // Quarter boundaries
    const qStart = new Date(year, (q - 1) * 3, 1).getTime();
    const qEnd = new Date(year, q * 3, 0, 23, 59, 59).getTime();

    return projects.filter(p => {
      const pStart = new Date(p.startDate).getTime();
      const pEnd = p.actualEndDate 
        ? new Date(p.actualEndDate).getTime() 
        : p.status === 'completed' 
          ? new Date(p.targetEndDate).getTime() 
          : new Date('2026-05-23').getTime(); // active / halted

      // Overlap condition
      return pStart <= qEnd && pEnd >= qStart;
    });
  };

  // Helper to find if a repeated repair anomaly was flagged in this cell
  const getAnomalyForCell = (year: number, q: number): FinancialAnomaly | null => {
    const qStart = new Date(year, (q - 1) * 3, 1).getTime();
    const qEnd = new Date(year, q * 3, 0, 23, 59, 59).getTime();

    const cellAnomaly = anomalies.find(a => {
      const detDate = new Date(a.detectedAt).getTime();
      return detDate >= qStart && detDate <= qEnd;
    });

    return cellAnomaly || null;
  };

  const handleMouseMove = (e: React.MouseEvent, cell: CellData) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const container = e.currentTarget.closest('.heatmap-root');
    if (container) {
      const containerRect = container.getBoundingClientRect();
      setTooltipPos({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 8
      });
    }
    setHoveredCell(cell);
  };

  return (
    <div className="heatmap-root relative bg-slate-950/20 border border-border/40 rounded-xl p-5 flex flex-col justify-between">
      <div className="flex justify-between items-start gap-4 mb-4 flex-wrap">
        <div>
          <h4 className="text-[10px] text-slate-200 uppercase font-black tracking-widest flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Maintenance Recurrence Matrix
          </h4>
          <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">
            Historical quarterly overview. Shaded blocks indicate active contracts; orange/red markers highlight early failure anomalies.
          </p>
        </div>

        {/* Legend */}
        <div className="flex gap-3 text-[8px] font-bold self-end">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-slate-900 border border-border/20 block"></span>
            <span className="text-slate-400">Idle</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-cyan-950 border border-cyan-800/40 block"></span>
            <span className="text-slate-450">Active Work</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-cyan-800 block"></span>
            <span className="text-slate-350">Multiple Contracts</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-red-950 border border-red-900/60 flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span></span>
            <span className="text-red-400">Anomaly Alert</span>
          </div>
        </div>
      </div>

      {/* Grid container */}
      <div className="w-full overflow-x-auto select-none py-1">
        <div className="min-w-[480px] grid grid-cols-5 gap-2.5">
          {/* Header Row */}
          <div></div>
          {quarters.map(q => (
            <div key={q} className="text-center text-[9px] text-muted-foreground font-black uppercase tracking-wider">
              {qNames[q - 1].split(' ')[0]}
            </div>
          ))}

          {/* Grid Rows */}
          {years.map(year => (
            <React.Fragment key={year}>
              <div className="flex items-center text-[9px] font-black text-slate-350 uppercase tracking-widest pl-1.5">
                {year}
              </div>

              {quarters.map(q => {
                const activeProjects = getProjectsForCell(year, q);
                const cellAnomaly = getAnomalyForCell(year, q);
                const cell: CellData = {
                  year,
                  quarter: q,
                  projectsActive: activeProjects,
                  anomalyInCell: cellAnomaly,
                  quarterLabel: qNames[q - 1]
                };

                // Class coloring based on activity
                let bgClass = 'bg-slate-900/60 border-border/20 hover:border-slate-700';
                if (activeProjects.length === 1) {
                  bgClass = 'bg-cyan-950/45 border-cyan-900/40 text-cyan-400 hover:bg-cyan-950/60';
                } else if (activeProjects.length > 1) {
                  bgClass = 'bg-cyan-900/40 border-cyan-700/50 text-cyan-200 hover:bg-cyan-900/60';
                }

                // If anomaly exists in this cell
                const hasAnomaly = !!cellAnomaly;

                return (
                  <div
                    key={q}
                    className={`relative h-12 rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${bgClass}`}
                    onMouseEnter={(e) => handleMouseMove(e, cell)}
                    onMouseMove={(e) => handleMouseMove(e, cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {/* Activity text count inside block */}
                    {activeProjects.length > 0 && (
                      <span className="text-[9px] font-black">
                        {activeProjects.length} {activeProjects.length === 1 ? 'Job' : 'Jobs'}
                      </span>
                    )}

                    {/* Anomaly Dot */}
                    {hasAnomaly && (
                      <>
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"></span>
                      </>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Tooltip Overlay */}
      <AnimatePresence>
        {hoveredCell !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute z-30 pointer-events-none bg-slate-900/95 backdrop-blur border border-border rounded-lg p-3 text-[10px] space-y-2 shadow-2xl max-w-[280px]"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="font-extrabold text-slate-100 uppercase border-b border-border/40 pb-1 flex justify-between gap-4">
              <span>{hoveredCell.quarterLabel} {hoveredCell.year}</span>
              <span className="text-muted-foreground">{hoveredCell.projectsActive.length} contract(s)</span>
            </div>

            {hoveredCell.projectsActive.length > 0 ? (
              <div className="space-y-1.5">
                {hoveredCell.projectsActive.map((p, idx) => (
                  <div key={p.id} className="border-l border-cyan-500 pl-1.5 space-y-0.5">
                    <div className="font-bold text-slate-200 line-clamp-1">{p.title}</div>
                    <div className="text-[9px] text-muted-foreground">
                      Allocated: <span className="text-slate-300 font-semibold">{formatINR(p.budgetAllocated)}</span>
                    </div>
                    <div className="text-[9px] text-muted-foreground flex justify-between">
                      <span>Status: <strong className="capitalize text-slate-350">{p.status}</strong></span>
                      {p.delayDays > 0 && <span className="text-amber-400 font-semibold">{p.delayDays}d delay</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground italic py-1">No active maintenance work scheduled.</div>
            )}

            {/* Anomaly Alerts inside cell */}
            {hoveredCell.anomalyInCell && (
              <div className="bg-red-950/40 border border-red-900/50 rounded p-1.5 flex items-start gap-1.5 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[9px] text-red-400 leading-normal font-semibold">
                  <strong>{hoveredCell.anomalyInCell.type === 'repeated_repair' ? 'Repeated Repair Warning' : 'Anomaly Detected'}:</strong> {hoveredCell.anomalyInCell.description}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
