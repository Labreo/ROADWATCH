'use client';

import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Sparkles, 
  UserCheck, 
  HardHat, 
  AlertTriangle,
  Mail,
  Phone,
  FileSpreadsheet
} from 'lucide-react';
import { Complaint } from '@/types';
import { routeComplaint } from '@/services/routingEngine';

interface ComplaintTimelineProps {
  complaint: Complaint;
}

export default function ComplaintTimeline({ complaint }: ComplaintTimelineProps) {
  const [longitude, latitude] = complaint.geometry.coordinates;
  const routing = routeComplaint(longitude, latitude, complaint.roadId);

  // Helper to format date
  const formatDate = (isoString: string, offsetDays = 0) => {
    const d = new Date(isoString);
    if (offsetDays > 0) {
      d.setDate(d.getDate() + offsetDays);
    }
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const status = complaint.status;

  // Determine stage states
  // Stages: Submitted, Inferred (AI), Routed (Jurisdiction), Assigned, Commenced (Resolution)
  const isSubmitted = true; // Always true
  const isAIProcessed = true; // AI heuristics runs client-side immediately
  const isRouted = status !== 'pending';
  const isAssigned = status !== 'pending';
  const isInProgress = status === 'in_progress' || status === 'resolved';
  const isResolved = status === 'resolved';
  const isRejected = status === 'rejected';

  return (
    <div className="space-y-6">
      
      {/* Overview Card */}
      <div className="p-4 rounded-xl border border-border bg-slate-900/30 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[9px] font-black uppercase text-zinc-300 bg-zinc-900 border border-zinc-800/80 px-2 py-0.5 rounded tracking-wider">
              {complaint.category.replace('_', ' ')}
            </span>
            <h4 className="text-xs font-black text-slate-200 mt-1.5 leading-tight">{complaint.title}</h4>
          </div>
          <span className={`text-[9px] font-black uppercase border px-2 py-0.5 rounded ${
            isResolved ? 'text-emerald-400 border-emerald-950 bg-emerald-950/40' :
            isRejected ? 'text-red-400 border-red-950 bg-red-950/40' :
            isInProgress ? 'text-zinc-300 border-zinc-900 bg-zinc-900/40' :
            isRouted ? 'text-zinc-400 border-zinc-900 bg-zinc-900/40' :
            'text-slate-400 border-slate-800 bg-slate-900'
          }`}>
            {status}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">{complaint.description}</p>
        
        <div className="border-t border-border/30 pt-2.5 mt-2.5 flex justify-between items-center text-[9px] text-muted-foreground font-mono">
          <span>Ticket ID: {complaint.clientTempId || `RW-2026-${complaint.id}`}</span>
          <span>GPS: {latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
        </div>
      </div>

      {/* Timeline flow */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        
        {/* Step 1: Submission */}
        <div className="relative">
          <span className="absolute -left-[21px] top-0 w-6 h-6 rounded-full border border-slate-700 bg-slate-950 flex items-center justify-center text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </span>
          <div className="space-y-1">
            <h5 className="text-[11px] font-extrabold uppercase text-slate-200 tracking-wider">Defect Log Submitted</h5>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Ticket registered through public channel. Received tracking code.
            </p>
            <span className="text-[9px] font-mono text-slate-500 block">{formatDate(complaint.createdAt)}</span>
          </div>
        </div>

        {/* Step 2: AI Diagnostic Classify */}
        <div className="relative">
          <span className="absolute -left-[21px] top-0 w-6 h-6 rounded-full border border-slate-700 bg-slate-950 flex items-center justify-center text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
          </span>
          <div className="space-y-1">
            <h5 className="text-[11px] font-extrabold uppercase text-slate-200 tracking-wider flex items-center gap-1">
              AI Diagnostics Complete
            </h5>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Heuristic classification complete: Categorized defect type as <strong className="text-slate-300 capitalize">{complaint.category.replace('_', ' ')}</strong>.
            </p>
            <span className="text-[9px] font-mono text-slate-500 block">{formatDate(complaint.createdAt)}</span>
          </div>
        </div>

        {/* Step 3: Jurisdictional Routing */}
        <div className="relative">
          <span className={`absolute -left-[21px] top-0 w-6 h-6 rounded-full border bg-slate-950 flex items-center justify-center text-slate-400 ${
            isRouted ? 'border-emerald-500/30' : 'border-slate-800'
          }`}>
            {isRouted ? (
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-slate-600" />
            )}
          </span>
          <div className="space-y-1">
            <h5 className={`text-[11px] font-extrabold uppercase tracking-wider ${
              isRouted ? 'text-slate-200' : 'text-slate-500'
            }`}>
              Jurisdiction Geo-Routing
            </h5>
            {isRouted ? (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Coordinates parsed through boundary shapefiles. Assigned responsible government unit:
                </p>
                <div className="p-2.5 rounded bg-slate-950 border border-border/40 text-[9.5px]">
                  <p className="font-extrabold text-slate-350">{routing.authorityName}</p>
                  <p className="text-muted-foreground mt-0.5">Code: {routing.departmentCode}</p>
                  <p className="text-slate-500 text-[8.5px] mt-1 uppercase font-mono">Region: {routing.regionName}</p>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 italic">Pending network synchronization to determine ward geometry...</p>
            )}
            {isRouted && <span className="text-[9px] font-mono text-slate-500 block">{formatDate(complaint.createdAt)}</span>}
          </div>
        </div>

        {/* Step 4: Executive Officer Assignment */}
        <div className="relative">
          <span className={`absolute -left-[21px] top-0 w-6 h-6 rounded-full border bg-slate-950 flex items-center justify-center text-slate-400 ${
            isAssigned ? 'border-emerald-500/30' : 'border-slate-800'
          }`}>
            {isAssigned ? (
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-slate-600" />
            )}
          </span>
          <div className="space-y-1">
            <h5 className={`text-[11px] font-extrabold uppercase tracking-wider ${
              isAssigned ? 'text-slate-200' : 'text-slate-500'
            }`}>
              Assigned {routing.fieldManagerTitle}
            </h5>
            {isAssigned ? (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Defect logged into local engineer board. Responsible point of contact:
                </p>
                <div className="p-2.5 rounded bg-slate-950 border border-border/40 text-[9.5px] space-y-1.5">
                  <h6 className="font-extrabold text-slate-300">{routing.executiveEngineer}</h6>
                  <div className="flex flex-col gap-1 text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-zinc-550" /> {routing.contactEmail}</span>
                    <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-zinc-550" /> {routing.contactPhone}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 italic">Waiting for authority assignment...</p>
            )}
            {isAssigned && <span className="text-[9px] font-mono text-slate-500 block">{formatDate(complaint.createdAt)}</span>}
          </div>
        </div>

        {/* Step 5: Action Tracking */}
        {isRejected ? (
          <div className="relative">
            <span className="absolute -left-[21px] top-0 w-6 h-6 rounded-full border border-red-500 bg-slate-950 flex items-center justify-center text-red-400 shadow-md">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
            <div className="space-y-1">
              <h5 className="text-[11px] font-extrabold uppercase text-red-400 tracking-wider">Report Rejected / Deemed Duplicate</h5>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Authority has audited the coordinates. Defect already marked on contractor SLA or falls under separate jurisdiction coordinates.
              </p>
              <span className="text-[9px] font-mono text-slate-500 block">{formatDate(complaint.createdAt, 1)}</span>
            </div>
          </div>
        ) : (
          <div className="relative">
            <span className={`absolute -left-[21px] top-0 w-6 h-6 rounded-full border bg-slate-950 flex items-center justify-center text-slate-400 ${
              isResolved ? 'border-emerald-500/30' : isInProgress ? 'border-zinc-500/30 animate-pulse' : 'border-slate-800'
            }`}>
              {isResolved ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : isInProgress ? (
                <HardHat className="w-3.5 h-3.5 text-zinc-500" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-slate-600" />
              )}
            </span>
            <div className="space-y-1">
              <h5 className={`text-[11px] font-extrabold uppercase tracking-wider ${
                isInProgress || isResolved ? 'text-slate-200' : 'text-slate-500'
              }`}>
                {isResolved ? 'Defect Rectified & Verified' : isInProgress ? 'Work Scheduled & Commenced' : 'SLA Target Action Plan'}
              </h5>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {isResolved 
                  ? 'The contractor has completed overlay operations. Citizen validator checks are successful.'
                  : isInProgress 
                  ? 'Work order issued to contractor. Inspection engineers dispatched to coordinates.' 
                  : `SLA timer initiated. ${routing.competentAgency} standards state repairs must initiate within 48 hours.`}
              </p>
              {(isInProgress || isResolved) && (
                <span className="text-[9px] font-mono text-slate-500 block">
                  {formatDate(complaint.createdAt, isResolved ? 3 : 1)}
                </span>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
