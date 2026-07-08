import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  ChevronRight, 
  ShieldAlert, 
  MapPin, 
  Activity, 
  Building2, 
  CheckCircle,
  HelpCircle,
  ThumbsDown,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { authorities, roads } from '@/data/mockData';
import { Complaint, ComplaintStatus } from '@/types';
import { getActiveTemplate } from '@/services/regionAwareFormat';

interface ComplaintOperationsPanelProps {
  selectedComplaintId: number | null;
  onSelectComplaint: (id: number | null) => void;
}

export default function ComplaintOperationsPanel({ 
  selectedComplaintId, 
  onSelectComplaint 
}: ComplaintOperationsPanelProps) {
  const { complaintsList, updateComplaint } = useStore();
  const [authorityFilter, setAuthorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Selected complaint lookup
  const selectedComplaint = useMemo(() => {
    return complaintsList.find(c => c.id === selectedComplaintId) || null;
  }, [complaintsList, selectedComplaintId]);

  // Dynamic duplicate/recurring issue detection
  const recurringCount = useMemo(() => {
    if (!selectedComplaint || !selectedComplaint.roadId) return 0;
    // Count other complaints on the same road segment
    return complaintsList.filter(
      c => c.roadId === selectedComplaint.roadId && c.id !== selectedComplaint.id
    ).length;
  }, [selectedComplaint, complaintsList]);

  // Filtered List
  const filteredComplaints = useMemo(() => {
    return complaintsList.filter(c => {
      const matchesAuth = authorityFilter === 'all' || 
        (c.assignedAuthorityId !== undefined && c.assignedAuthorityId.toString() === authorityFilter);
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesAuth && matchesStatus;
    });
  }, [complaintsList, authorityFilter, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'text-emerald-400 border-emerald-950/60 bg-emerald-950/40';
      case 'in_progress': return 'text-zinc-350 border-zinc-900/60 bg-zinc-900/40';
      case 'routed': return 'text-zinc-400 border-zinc-900/60 bg-zinc-900/40';
      case 'rejected': return 'text-slate-500 border-border bg-slate-900';
      default: return 'text-amber-400 border-amber-950/60 bg-amber-950/40';
    }
  };

  const handleUpdateStatus = (status: ComplaintStatus) => {
    if (selectedComplaint && selectedComplaint.id) {
      updateComplaint(selectedComplaint.id, { status });
    }
  };

  const handleUpdateAuthority = (authId: number) => {
    if (selectedComplaint && selectedComplaint.id) {
      updateComplaint(selectedComplaint.id, { assignedAuthorityId: authId });
    }
  };

  return (
    <div className="glass-panel border border-border/80 rounded-xl p-5 bg-slate-950/40 flex flex-col lg:flex-row gap-5 h-full min-h-0">
      
      {/* Left Column: Complaint Queue List */}
      <div className="w-full lg:w-[350px] shrink-0 flex flex-col space-y-3 min-h-0">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-500" />
            <h3 className="text-xs uppercase font-black tracking-widest text-slate-200">
              Operations Queue ({filteredComplaints.length})
            </h3>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <label className="text-[8px] uppercase font-bold text-muted-foreground block mb-1">Supervising Agency</label>
            <select
              value={authorityFilter}
              onChange={(e) => setAuthorityFilter(e.target.value)}
              className="w-full bg-slate-900 border border-border rounded-xl px-2 py-1 text-slate-300 font-semibold focus:outline-none"
            >
              <option value="all">All Agencies</option>
              {authorities.map(a => (
                <option key={a.id} value={a.id.toString()}>{a.departmentCode}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[8px] uppercase font-bold text-muted-foreground block mb-1">Ticket Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-900 border border-border rounded-xl px-2 py-1 text-slate-300 font-semibold focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="routed">Routed</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin">
          {filteredComplaints.map(c => {
            const isSelected = selectedComplaintId === c.id;
            const road = c.roadId ? roads.find(r => r.id === c.roadId) : null;
            return (
              <div
                key={c.id}
                onClick={() => onSelectComplaint(c.id || null)}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-zinc-900 border-zinc-700/60 shadow-sm shadow-zinc-950/40'
                    : 'bg-slate-950/60 border-border/50 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex justify-between items-start gap-2 mb-1 flex-wrap">
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">
                    {c.category.replace('_', ' ')}
                  </span>
                  <span className={`text-[7px] font-black uppercase border px-1 rounded ${getStatusColor(c.status)}`}>
                    {c.status}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{c.title}</h4>
                <div className="flex justify-between items-center text-[9px] text-muted-foreground mt-2 border-t border-border/20 pt-1.5 font-medium">
                  <span className="flex items-center gap-0.5 truncate max-w-[150px]">
                    <MapPin className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
                    {road ? road.name : 'Coordinates'}
                  </span>
                  <span>{new Date(c.createdAt || '').toLocaleDateString(getActiveTemplate().locale, { month: '2-digit', day: '2-digit' })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Detailed Triage & Operations Panel */}
      <div className="flex-1 flex flex-col justify-between min-h-0 bg-slate-900/10 border border-border/40 rounded-xl p-4">
        {selectedComplaint ? (
          <div className="space-y-4 overflow-y-auto pr-1 scrollbar-thin flex-1 flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="flex justify-between items-start border-b border-border/30 pb-3 gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="text-[8px] font-black uppercase bg-slate-900 border border-border text-slate-400 px-2 py-0.5 rounded tracking-wider">
                      Ticket ID: #{selectedComplaint.id}
                    </span>
                    <span className={`text-[8px] font-black uppercase border px-2 py-0.5 rounded tracking-wider ${getStatusColor(selectedComplaint.status)}`}>
                      {selectedComplaint.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-200 leading-snug">
                    {selectedComplaint.title}
                  </h3>
                </div>
                <button
                  onClick={() => onSelectComplaint(null)}
                  className="text-[9px] font-black text-zinc-400 hover:text-zinc-200 hover:underline uppercase tracking-wide shrink-0"
                >
                  Clear Selection
                </button>
              </div>

              {/* Duplicate/Recurring Issue Warning */}
              {recurringCount > 0 && (
                <div className="p-3 border border-amber-955 bg-amber-955/15 text-amber-500 rounded-xl text-[10px] leading-relaxed flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="font-extrabold uppercase block mb-0.5">Recurring Segment Alert</span>
                    There are **{recurringCount} other reports** logged on this same segment. The system has automatically flagged this location as a potential structural defect hotspot.
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1">
                <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest block">
                  Report Description
                </span>
                <p className="text-[11px] leading-relaxed text-slate-300 bg-slate-950/45 p-3 rounded-lg border border-border/30 font-medium">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Triage Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/20">
                
                {/* Re-route Authority */}
                <div className="space-y-1.5">
                  <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest block flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-zinc-500" /> Reassign Maintaining Agency
                  </span>
                  <select
                    value={selectedComplaint.assignedAuthorityId || ''}
                    onChange={(e) => handleUpdateAuthority(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-border rounded-xl px-3 py-2 text-[10px] text-slate-200 font-semibold focus:outline-none"
                  >
                    <option value="" disabled>Select Agency</option>
                    {authorities.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.departmentCode})</option>
                    ))}
                  </select>
                </div>

                {/* Status Triage */}
                <div className="space-y-1.5">
                  <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest block">
                    Administrative Actions
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleUpdateStatus('resolved')}
                      disabled={selectedComplaint.status === 'resolved'}
                      className="flex-1 py-1.5 rounded-lg border border-emerald-900 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40 text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Resolve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('rejected')}
                      disabled={selectedComplaint.status === 'rejected'}
                      className="flex-1 py-1.5 rounded-lg border border-red-900/60 bg-red-950/10 text-red-400 hover:bg-red-950/25 text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Instruction Footer */}
            <div className="text-[8.5px] text-muted-foreground bg-slate-950/25 p-2.5 rounded-lg border border-border/20 text-center select-none mt-4 font-medium leading-relaxed">
              Updating the maintaining agency or status instantly reconciles in the central transparency ledger and sends status push updates to the reporting citizen.
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none">
            <HelpCircle className="w-7 h-7 text-zinc-600 mb-2" />
            <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-wider mb-1">Administrative Triage View</h4>
            <p className="text-[9px] text-muted-foreground leading-relaxed max-w-[240px]">
              Select a citizen report from the queue to run spatial duplicate audits, override maintenance routing, reassign departments, or close tickets.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
