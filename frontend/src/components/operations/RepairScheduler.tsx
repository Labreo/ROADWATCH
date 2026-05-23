import React, { useState } from 'react';
import { Calendar, User, HardHat, FileText, CheckCircle2, Clock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { contractors, roads } from '@/data/mockData';
import { Complaint } from '@/types';

interface RepairSchedulerProps {
  selectedComplaint: Complaint | null;
  onClearSelection?: () => void;
}

export default function RepairScheduler({ selectedComplaint, onClearSelection }: RepairSchedulerProps) {
  const { scheduleRepair, scheduledRepairs } = useStore();
  const [contractorId, setContractorId] = useState<number>(1);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [engineerName, setEngineerName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState(false);

  // Filter blacklisted contractors
  const activeContractors = contractors.filter(c => !c.blacklisted);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !selectedComplaint.id || !scheduledDate || !engineerName) return;

    scheduleRepair({
      complaintId: selectedComplaint.id,
      roadId: selectedComplaint.roadId || 1, // Default road fallback if unassociated
      contractorId,
      scheduledDate,
      engineerName,
      notes
    });

    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onClearSelection?.();
      // Reset form
      setScheduledDate('');
      setEngineerName('');
      setNotes('');
    }, 2000);
  };

  return (
    <div className="glass-panel border border-border/80 rounded-xl p-5 bg-slate-950/40 flex flex-col justify-between h-full">
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border/40 pb-2">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs uppercase font-black tracking-widest text-slate-200">
            Work Dispatch & Repair Scheduler
          </h3>
        </div>

        {selectedComplaint ? (
          successMsg ? (
            <div className="flex flex-col items-center justify-center text-center p-8 border border-emerald-950/50 bg-emerald-950/20 rounded-xl text-emerald-400 animate-in fade-in duration-300">
              <CheckCircle2 className="w-10 h-10 mb-2 animate-bounce" />
              <h4 className="text-xs font-extrabold uppercase tracking-wide">Work Dispatch Succeeded</h4>
              <p className="text-[10px] text-slate-350 leading-relaxed mt-1">
                Contractor has been scheduled. Complaint status updated to "In Progress".
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="p-2.5 rounded bg-slate-900/60 border border-border/40 text-[9px] space-y-1 select-none">
                <span className="text-muted-foreground uppercase font-bold block">Active Ticket Target</span>
                <span className="font-extrabold text-slate-200 block truncate">{selectedComplaint.title}</span>
                <span className="text-slate-400 block truncate">Category: {selectedComplaint.category}</span>
              </div>

              {/* Contractor Select */}
              <div>
                <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-1 block">
                  Select Certified Contractor
                </label>
                <div className="relative">
                  <select
                    value={contractorId}
                    onChange={(e) => setContractorId(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-border rounded-xl px-3 py-2 text-[10px] text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-all font-semibold"
                  >
                    {activeContractors.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} (★ {c.rating.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Relaying Date */}
              <div>
                <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-1 block">
                  Target Work Date
                </label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-slate-900 border border-border rounded-xl px-3 py-1.5 text-[10px] text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-all font-semibold"
                />
              </div>

              {/* Supervising Engineer */}
              <div>
                <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-1 block">
                  Supervising Executive Engineer
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Er. K. V. Patil"
                    value={engineerName}
                    onChange={(e) => setEngineerName(e.target.value)}
                    className="w-full bg-slate-900 border border-border rounded-xl px-3 py-1.5 text-[10px] text-slate-200 placeholder-muted-foreground focus:outline-none focus:border-cyan-500/50 transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Technical Notes */}
              <div>
                <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-1 block">
                  Technical Specifications & Notes
                </label>
                <textarea
                  placeholder="e.g. High grade mastic asphalt seal required. Relaying bounds 25 meters."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-border rounded-xl px-3 py-1.5 text-[10px] text-slate-200 placeholder-muted-foreground focus:outline-none focus:border-cyan-500/50 transition-all font-semibold resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/10 transition-all active:scale-[0.98] cursor-pointer"
              >
                Dispatch Repair Contract
              </button>
            </form>
          )
        ) : (
          <div className="p-6 text-center border border-dashed border-border/50 rounded-xl bg-slate-950/20 select-none">
            <Clock className="w-6 h-6 text-cyan-400/50 mx-auto mb-2" />
            <h4 className="text-[10px] font-bold text-slate-250 uppercase tracking-wider mb-1">Triage Dispatcher</h4>
            <p className="text-[9px] text-muted-foreground leading-relaxed">
              Select any active complaint from the queue or map to dispatch repairs, allocate budgets, and assign supervisor engineers.
            </p>
          </div>
        )}
      </div>

      {/* List of active dispatches */}
      {scheduledRepairs.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/20">
          <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest block mb-2">
            Active Dispatched Jobs ({scheduledRepairs.length})
          </span>
          <div className="space-y-2 overflow-y-auto max-h-[120px] pr-1 scrollbar-thin">
            {scheduledRepairs.map((r) => {
              const contr = contractors.find(c => c.id === r.contractorId);
              return (
                <div key={r.id} className="p-2.5 bg-slate-900/40 rounded-lg border border-border/40 text-[9px] space-y-1">
                  <div className="flex justify-between font-bold text-slate-200">
                    <span className="truncate max-w-[150px]">Supervisor: {r.engineerName}</span>
                    <span className="text-cyan-400">{r.scheduledDate}</span>
                  </div>
                  <div className="text-[8px] text-slate-400">
                    Contractor: **{contr ? contr.name : 'Apex'}**
                  </div>
                  {r.notes && <p className="text-[8px] italic text-slate-500 truncate mt-0.5">{r.notes}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
