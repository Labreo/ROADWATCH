import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  type: 'info' | 'ai' | 'warning' | 'success';
  message: string;
}

export default function LiveSystemLog() {
  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: '08:15:22', type: 'info', message: 'Operations Center initialized. Connected to PostGIS node.' },
    { timestamp: '08:16:04', type: 'ai', message: 'AI Engine categorized report #103: interlock sink -> Category: "paving_defect"' },
    { timestamp: '08:17:11', type: 'info', message: 'MCGM-KW boundary contains complaint coordinates. Auto-routing resolved.' },
    { timestamp: '08:19:45', type: 'success', message: 'Service Worker sync: Uploaded 2 offline reports from local IndexedDB.' },
    { timestamp: '08:22:10', type: 'info', message: 'Dispatched Zenith Construction for emergency asphalt patching on SV Road.' }
  ]);

  const logEndRef = useRef<HTMLDivElement>(null);

  const mockTemplates = [
    { type: 'info', message: 'Auto-routing complaint to PWD Mumbai Division based on radial proximity.' },
    { type: 'ai', message: 'LLM categorized user text: "flooding outside station" -> Category: "waterlogging".' },
    { type: 'success', message: 'Service Worker: Offline queue fully synchronized with central PostgreSQL.' },
    { type: 'warning', message: 'Project delay alert: LBS Marg microtunnelling exceeds contract timeframe by 200+ days.' },
    { type: 'info', message: 'Contractor Apex Infrastructure submitted weekly expenditure ledger: ₹1,20,00,000 spent.' },
    { type: 'success', message: 'Complaint resolved: Pothole at Vikhroli closed by Ward F-North supervisor.' },
    { type: 'ai', message: 'AI routing audit: ST_Contains polygon check executed against Ward H-East bounds.' },
    { type: 'warning', message: 'Blacklist warning: Omega Infrastructure projects flag high-severity surface peeling.' },
    { type: 'info', message: 'Geospatial query: ST_DWithin search completed for SV Road segment bounds (buffer 20m).' }
  ];

  useEffect(() => {
    const addMockLog = () => {
      const randomTemplate = mockTemplates[Math.floor(Math.random() * mockTemplates.length)];
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      
      setLogs(prev => {
        const newLogs = [...prev, {
          timestamp: timeStr,
          type: randomTemplate.type as any,
          message: randomTemplate.message
        }];
        // Keep only last 30 logs
        return newLogs.slice(-30);
      });
    };

    const interval = setInterval(addMockLog, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'ai': return 'text-zinc-400 font-bold';
      case 'warning': return 'text-amber-500 font-bold';
      case 'success': return 'text-emerald-450 font-bold';
      default: return 'text-slate-400';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ai': return <Sparkles className="w-3 h-3 text-zinc-500 shrink-0 mt-0.5" />;
      case 'warning': return <ShieldAlert className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />;
      case 'success': return <RefreshCw className="w-3 h-3 text-emerald-450 shrink-0 mt-0.5" />;
      default: return <Terminal className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="glass-panel border border-border/80 rounded-xl p-4 flex flex-col h-full bg-slate-950/85">
      <div className="flex items-center gap-2 border-b border-border/40 pb-2 mb-3 shrink-0">
        <Terminal className="w-4 h-4 text-zinc-500" />
        <h4 className="text-[10px] text-slate-200 uppercase font-black tracking-widest">
          Live System Monitor Log
        </h4>
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-[9px] space-y-2 pr-1 select-none scrollbar-thin">
        {logs.map((log, idx) => (
          <div key={idx} className="flex items-start gap-2.5 hover:bg-slate-900/35 p-1 rounded transition-colors">
            <span className="text-slate-600 shrink-0 font-medium">[{log.timestamp}]</span>
            {getIcon(log.type)}
            <span className={`leading-relaxed flex-1 ${getTypeStyle(log.type)}`}>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
