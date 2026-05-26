'use client';

import { 
  X, 
  Calendar, 
  Landmark, 
  Coins, 
  TrendingUp, 
  User, 
  ShieldAlert, 
  Award, 
  FileText, 
  AlertCircle, 
  CheckCircle,
  Clock
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { 
  getAuthority, 
  getProjectsForRoad, 
  getContractor, 
  getRoad,
  projects,
  contractors
} from '@/data/mockData';
import { Contractor, Project, Road } from '@/types';
import RoadHealthScorecard from './RoadHealthScorecard';
import InfrastructureDiagnostics from './InfrastructureDiagnostics';

// Subsurface Cross-section Helpers
const UTILITY_TYPES = [
  { key: 'water',    label: 'Water Main',         color: '#38bdf8', depth: '0.9m' },
  { key: 'electric', label: 'Electrical Conduit', color: '#fbbf24', depth: '1.1m' },
  { key: 'fiber',    label: 'Fiber Optic',         color: '#a78bfa', depth: '1.4m' },
  { key: 'storm',    label: 'Storm Drain',         color: '#34d399', depth: '1.8m' },
];

function seeded(id: number, i: number): number {
  return ((id * 31 + i * 17) % 97) / 97;
}

function UtilityCrossSection({ road }: { road: Road }) {
  const depthW = 200;
  const depthH = 80;

  return (
    <div className="space-y-2">
      <div className="mono-label text-[9px] tracking-wider text-cyan-500/60">SUBSURFACE CROSS-SECTION // {road.roadCode}</div>

      {/* Visual cross-section SVG */}
      <svg width="100%" height={depthH} viewBox={`0 0 ${depthW} ${depthH}`} className="w-full">
        {/* Ground surface */}
        <rect x={0} y={0} width={depthW} height={10} fill="rgba(255,255,255,0.04)" rx={1} />
        <text x={4} y={8} fill="rgba(255,255,255,0.2)" fontSize={5} fontFamily="monospace">SURFACE</text>

        {/* Utility pipes */}
        {UTILITY_TYPES.map((u, i) => {
          const yPos = 14 + i * 16;
          const active = seeded(road.id, i + 5) > 0.25;
          const pressure = Math.round(seeded(road.id, i * 7) * 100);

          return (
            <g key={u.key}>
              {/* Depth indicator line */}
              <line x1={2} y1={yPos + 4} x2={depthW - 2} y2={yPos + 4}
                stroke={`${u.color}15`} strokeWidth={0.5} strokeDasharray="3 4" />

              {/* Pipe */}
              <rect
                x={6} y={yPos} width={depthW - 14} height={8}
                rx={4}
                fill={active ? `${u.color}18` : 'rgba(255,255,255,0.02)'}
                stroke={active ? `${u.color}50` : 'rgba(255,255,255,0.06)'}
                strokeWidth={0.75}
              />

              {/* Flow indicator */}
              {active && (
                <rect x={10} y={yPos + 2} width={`${pressure}%`} height={4}
                  rx={2} fill={u.color} opacity={0.35} />
              )}

              {/* Labels */}
              <text x={10} y={yPos + 6.5} fill={u.color} fontSize={4.5} fontFamily="monospace" opacity={0.7}>
                {u.label}
              </text>
              <text x={depthW - 8} y={yPos + 6.5} fill="rgba(255,255,255,0.25)" fontSize={4.5} fontFamily="monospace" textAnchor="end">
                {u.depth}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Decodes road category types based on code structures
const getRoadType = (roadCode: string) => {
  if (roadCode.includes('NH')) return 'National Highway';
  if (roadCode.includes('SH')) return 'State Highway';
  return 'Arterial Local Road';
};

// Renders visual star rating blocks for contractor reliability
const renderStars = (rating: number) => {
  const rounded = Math.round(rating);
  return (
    <div className="flex gap-0.5 text-[10px] text-amber-400 select-none">
      {[...Array(5)].map((_, i) => (
        <span key={i} className={i < rounded ? 'opacity-100' : 'opacity-25'}>★</span>
      ))}
    </div>
  );
};

export default function RoadDetailsPanel() {
  const { selectedRoadId, setSelectedRoadId, complaintsList } = useStore();
  
  if (!selectedRoadId) return null;
  
  const road = getRoad(selectedRoadId);
  if (!road) return null;

  const authority = getAuthority(road.authorityId);
  const roadProjects = getProjectsForRoad(road.id);
  const complaints = complaintsList.filter(c => c.roadId === road.id);

  // Take the most recent active or completed project to display financials & contractor
  const primaryProject = roadProjects.find(p => p.status === 'in_progress') || roadProjects[0];
  const contractor: Contractor | undefined = primaryProject 
    ? getContractor(primaryProject.contractorId) 
    : undefined;

  // Format currency
  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value).replace('INR', '₹');
  };

  // Calculate budget statistics
  const budgetAllocated = primaryProject?.budgetAllocated || 0;
  const budgetSpent = primaryProject?.budgetSpent || 0;
  const budgetPercent = budgetAllocated > 0 ? Math.min(100, Math.round((budgetSpent / budgetAllocated) * 100)) : 0;
  const isOverBudget = budgetSpent > budgetAllocated;

  // Status styling badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[9px] font-black bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 uppercase tracking-wider">Good Condition</span>;
      case 'fair':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[9px] font-black bg-amber-950/60 text-amber-400 border border-amber-900/40 uppercase tracking-wider">Fair Condition</span>;
      case 'poor':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[9px] font-black bg-rose-950/60 text-rose-400 border border-rose-900/40 uppercase tracking-wider">Poor / Damaged</span>;
      case 'under_construction':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[9px] font-black bg-cyan-950/60 text-cyan-400 border border-cyan-900/40 uppercase tracking-wider animate-pulse">Under Maintenance</span>;
      default:
        return null;
    }
  };

  const beaconClass = road.status === 'poor' ? 'critical' : road.status === 'fair' ? 'elevated' : road.status === 'good' ? 'nominal' : 'live';

  return (
    <div className="w-full h-full flex flex-col bg-slate-950/95 border-l border-border/80 border-t-2 border-t-cyan-500/35 text-foreground overflow-hidden">
      {/* Header Panel */}
      <div className="flex items-start justify-between p-5 border-b border-border/60">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="mono-readout text-[9px] font-bold px-2 py-0.5 rounded bg-slate-900 border border-border/60">
              {road.roadCode}
            </span>
            {getStatusBadge(road.status)}
          </div>
          <div className="flex items-center gap-2">
            <div className={`status-beacon ${beaconClass}`} />
            <h2 className="text-base font-black text-slate-100 leading-tight tracking-wide uppercase">{road.name}</h2>
          </div>
          <div className="flex flex-col gap-1">
            <p className="mono-label text-[9px] tracking-wider text-cyan-550/70">
              CLASSIFICATION: <span className="text-slate-250 font-bold tracking-normal uppercase text-[9px]">{getRoadType(road.roadCode)}</span>
            </p>
            <p className="mono-label text-[9px] tracking-wider text-cyan-500/60">
              LENGTH: <span className="mono-readout text-[10px] text-slate-200">{road.lengthKm} KM</span>
            </p>
          </div>
        </div>
        <button 
          onClick={() => setSelectedRoadId(null)} 
          className="p-1.5 rounded-lg border border-border/60 hover:border-cyan-500/50 hover:bg-slate-900 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Subsurface Utilities Cross Section */}
        <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.02]">
          <UtilityCrossSection road={road} />
        </div>
        
        {/* Road Health Intelligence Scorecard */}
        <RoadHealthScorecard
          road={road}
          projects={projects}
          contractors={contractors}
          complaints={complaintsList}
        />
        
        {/* Infrastructure Diagnostic Insights */}
        <InfrastructureDiagnostics
          road={road}
          projects={projects}
          contractors={contractors}
          complaints={complaintsList}
        />
        
        {/* Section 1: Authority & Last Relayed */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-lg p-3 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <Landmark className="w-3.5 h-3.5 text-cyan-400" />
              <span className="mono-label text-[9px]">Supervising Authority</span>
            </div>
            <p className="text-xs font-bold text-slate-200 line-clamp-1">{authority?.name.split(' - ')[0]}</p>
            <p className="mono-label text-[8px] mt-1">{authority?.departmentCode}</p>
          </div>

          <div className="glass-card rounded-lg p-3 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span className="mono-label text-[9px]">Last Relaying Date</span>
            </div>
            <p className="mono-readout text-xs font-bold text-slate-200">
              {new Date(road.lastRelayingDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
            <p className="mono-label text-[8px] mt-1">Asphalt lifetime check</p>
          </div>
        </div>

        {/* Section 2: Financials & Budget Tracking */}
        {primaryProject ? (
          <div className="glass-panel rounded-xl p-4 border border-border/60 space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <Coins className="w-4 h-4 text-cyan-400" />
              <h3 className="mono-label text-[10px] tracking-wider text-slate-200">Budget Tracker (Active Work)</h3>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-1 italic font-medium">
              "{primaryProject.title}"
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="mono-label text-[9px] block mb-0.5">Sanctioned Amount</span>
                <span className="mono-readout text-sm font-bold text-emerald-400">{formatINR(budgetAllocated)}</span>
              </div>
              <div>
                <span className="mono-label text-[9px] block mb-0.5">Spent Amount</span>
                <span className="mono-readout text-sm font-bold text-slate-200">{formatINR(budgetSpent)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="mono-label text-[9px]">Budget Utilization</span>
                <span className={`mono-readout text-xs font-semibold ${isOverBudget ? 'text-red-400' : 'text-cyan-400'}`}>
                  {budgetPercent}% {isOverBudget ? '(Over Budget)' : 'Utilized'}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-border/20">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOverBudget ? 'bg-red-500' : budgetPercent > 90 ? 'bg-amber-500' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${budgetPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-xl p-4 border border-border/40 text-center text-xs text-muted-foreground">
            No active or planned budget contracts logged for this road.
          </div>
        )}

        {/* Section 3: Contractor Accountability Scorecard */}
        {contractor ? (
          <div className="glass-panel rounded-xl p-4 border border-border/60 space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2 justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" />
                <h3 className="mono-label text-[10px] tracking-wider text-slate-200">Contractor Scorecard</h3>
              </div>
              {contractor.blacklisted && (
                <span className="flex items-center gap-1 text-[9px] font-extrabold text-red-500 bg-red-950/40 border border-red-900/60 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                  <ShieldAlert className="w-3 h-3" /> Blacklisted
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-200 leading-tight uppercase">{contractor.name}</h4>
                <p className="mono-label text-[8px] mt-0.5">License: {contractor.licenseNumber}</p>
              </div>

              {contractor.blacklistedReason && (
                <div className="p-2.5 rounded bg-red-950/20 border border-red-900/40 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-400 leading-relaxed font-medium">
                    <strong>Blacklist Reason:</strong> {contractor.blacklistedReason}
                  </p>
                </div>
              )}

              {/* Contractor performance ratings */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-950/50 p-2.5 rounded border border-border/45 flex flex-col justify-between items-center">
                  <span className="mono-label text-[8px] block uppercase font-medium tracking-wider mb-1">Rating</span>
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span className="mono-readout text-[11px] font-bold text-slate-200">{contractor.rating.toFixed(1)}</span>
                    {renderStars(contractor.rating)}
                  </div>
                </div>
                <div className="bg-slate-950/50 p-2 rounded border border-border/40">
                  <span className="mono-label text-[8px] block uppercase font-medium tracking-wider mb-1">Completed</span>
                  <span className="mono-readout text-xs font-bold text-slate-200">{contractor.projectsCompleted}</span>
                </div>
                <div className="bg-slate-950/50 p-2 rounded border border-border/40">
                  <span className="mono-label text-[8px] block uppercase font-medium tracking-wider mb-1">Delayed</span>
                  <span className={`mono-readout text-xs font-bold ${contractor.projectsDelayed > 3 ? 'text-red-400' : 'text-slate-200'}`}>
                    {contractor.projectsDelayed}
                  </span>
                </div>
              </div>

              {primaryProject && primaryProject.delayDays > 0 && (
                <div className="p-2.5 rounded bg-amber-950/20 border border-amber-900/40 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span className="mono-label text-[9px] text-amber-400 font-semibold">
                    Current project has been delayed by {primaryProject.delayDays} days.
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Section 3.5: Maintenance and Repair History Timeline */}
        {roadProjects.length > 0 && (
          <div className="glass-panel rounded-xl p-4 border border-border/60 space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="mono-label text-[10px] tracking-wider text-slate-250 uppercase font-black">Repair & Maintenance History</h3>
            </div>

            <div className="relative border-l border-border/60 ml-3.5 pl-6 space-y-5 py-1">
              {roadProjects.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map((p) => {
                const projContractor = getContractor(p.contractorId);
                const projectStatus = p.status;
                
                let statusDotColor = 'bg-slate-500';
                if (projectStatus === 'completed') statusDotColor = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
                if (projectStatus === 'in_progress') statusDotColor = 'bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.5)]';
                if (projectStatus === 'halted') statusDotColor = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';

                return (
                  <div key={p.id} className="relative">
                    {/* Timeline Node Connector */}
                    <div className={`absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${statusDotColor} z-10`} />
                    
                    <div className="space-y-1.5 text-left">
                      <div className="flex justify-between items-start gap-2 flex-wrap">
                        <h4 className="text-[11px] font-bold text-slate-200 leading-snug">{p.title}</h4>
                        <span className={`text-[8px] font-extrabold uppercase border px-1.5 py-0.2 rounded tracking-wide ${
                          projectStatus === 'completed' ? 'text-emerald-400 border-emerald-955 bg-emerald-950/30' :
                          projectStatus === 'in_progress' ? 'text-cyan-400 border-cyan-955 bg-cyan-950/30' :
                          'text-red-400 border-red-955 bg-red-950/30'
                        }`}>
                          {projectStatus.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-[10px] text-muted-foreground leading-normal">
                        Contractor: <span className="font-semibold text-slate-350">{projContractor?.name || 'Municipal Works Agency'}</span>
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-450 border-t border-border/20 pt-1 mt-1">
                        <span>Cost: <span className="mono-readout text-[9px] text-slate-200 font-bold">{formatINR(p.budgetSpent)}</span></span>
                        <span className="text-right">Start: {new Date(p.startDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}</span>
                      </div>

                      {p.delayDays > 0 && (
                        <div className="text-[9px] text-amber-500 font-semibold flex items-center gap-1 mt-1">
                          <span>⚠️ Delayed: {p.delayDays} days</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 4: Citizen Complaint Logs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <h3 className="mono-label text-[10px] tracking-wider text-slate-250 uppercase font-black">Citizen Defect Reports</h3>
            </div>
            <span className="mono-readout text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-border text-slate-300 font-semibold">
              {complaints.length} Total
            </span>
          </div>

          {complaints.length > 0 ? (
            <>
              {/* Defect Reports Analytical Summary Grid */}
              <div className="grid grid-cols-3 gap-2 text-center bg-slate-950/40 p-3 rounded-xl border border-border/45">
                <div className="space-y-0.5">
                  <span className="mono-label text-[8px] block text-slate-450 uppercase">Active reports</span>
                  <span className="mono-readout text-sm font-bold text-rose-400">
                    {complaints.filter(c => c.status !== 'resolved' && c.status !== 'rejected').length}
                  </span>
                </div>
                <div className="border-x border-border/35 space-y-0.5">
                  <span className="mono-label text-[8px] block text-slate-450 uppercase">Resolved</span>
                  <span className="mono-readout text-sm font-bold text-emerald-400">
                    {complaints.filter(c => c.status === 'resolved').length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="mono-label text-[8px] block text-slate-450 uppercase">Resolution Rate</span>
                  <span className="mono-readout text-sm font-bold text-cyan-400">
                    {complaints.length > 0 
                      ? Math.round((complaints.filter(c => c.status === 'resolved').length / complaints.length) * 100) 
                      : 0}%
                  </span>
                </div>
              </div>

              {/* Defect Category Count Breakdown Pills */}
              <div className="flex flex-wrap gap-1.5 select-none">
                {Object.entries(
                  complaints.reduce((acc, c) => {
                    acc[c.category] = (acc[c.category] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([cat, count]) => {
                  let dotColor = 'bg-red-500';
                  if (cat === 'waterlogging') dotColor = 'bg-blue-500';
                  if (cat === 'paving_defect') dotColor = 'bg-yellow-500';
                  if (cat === 'debris') dotColor = 'bg-orange-500';
                  if (cat === 'missing_signage') dotColor = 'bg-fuchsia-500';

                  return (
                    <span key={cat} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-border/60 text-[8.5px] font-bold text-slate-350 capitalize">
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                      <span>{cat.replace('_', ' ')}</span>
                      <span className="mono-readout font-bold text-[9px] ml-1 bg-slate-950/80 px-1.5 py-0.2 rounded-md">{count}</span>
                    </span>
                  );
                })}
              </div>

              {/* Defect Logs Feed */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {complaints.map((c) => (
                <div key={c.id} className="p-3 rounded-lg border border-border/40 hover:border-border bg-slate-950/40 space-y-1.5 transition-colors">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-300 capitalize flex items-center gap-1">
                      {c.category === 'pothole' && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
                      {c.category === 'waterlogging' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                      {c.category === 'paving_defect' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>}
                      {c.category === 'debris' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>}
                      {c.category === 'missing_signage' && <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500"></span>}
                      {c.category.replace('_', ' ')}
                    </span>
                    <span className={`mono-readout text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase tracking-wide border ${
                      c.status === 'resolved' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/60' :
                      c.status === 'in_progress' ? 'bg-cyan-950/60 text-cyan-400 border-cyan-900/60' :
                      c.status === 'routed' ? 'bg-blue-950/60 text-blue-400 border-blue-900/60' : 'bg-slate-900 text-slate-400 border-border'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  
                  <h4 className="text-xs font-bold text-slate-200">{c.title}</h4>
                  <p className="text-[10px] text-muted-foreground leading-normal line-clamp-2">{c.description}</p>
                  
                  <div className="mono-readout text-[9px] text-[#55555f] text-right">
                    Reported on: {new Date(c.createdAt).toLocaleDateString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
            </>
          ) : (
            <div className="text-center py-6 text-xs text-muted-foreground bg-slate-950/20 rounded-lg border border-dashed border-border/40">
              <CheckCircle className="w-5 h-5 mx-auto mb-2 text-emerald-500/60" />
              No complaints logged on this segment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
