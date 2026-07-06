'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';

interface LogEntry {
  timestamp: string;
  type: 'info' | 'ai' | 'warning' | 'success';
  message: string;
}

export default function LiveSystemLog() {
  const { addComplaint } = useStore();
  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: '08:15:22', type: 'info', message: 'Operations Center initialized. Connected to PostGIS node.' },
    { timestamp: '08:16:04', type: 'ai', message: 'AI Engine categorized report #103: interlock sink -> Category: "paving_defect"' },
    { timestamp: '08:17:11', type: 'info', message: 'MCGM-KW boundary contains complaint coordinates. Auto-routing resolved.' },
    { timestamp: '08:19:45', type: 'success', message: 'Service Worker sync: Uploaded 2 offline reports from local IndexedDB.' },
    { timestamp: '08:22:10', type: 'info', message: 'Dispatched Zenith Construction for emergency asphalt patching on SV Road.' }
  ]);

  const [alertText, setAlertText] = useState<string | null>(null);
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

  // 1. Listen to real-time logs and dispatches from the backend via Server-Sent Events (SSE)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectStream = () => {
      console.log("Connecting to live log stream at http://localhost:8000/api/v1/operations/logs/stream...");
      eventSource = new EventSource('http://localhost:8000/api/v1/operations/logs/stream');

      eventSource.onmessage = (event) => {
        try {
          const logData = JSON.parse(event.data);
          
          setLogs(prev => {
            const newLogs = [...prev, {
              timestamp: logData.timestamp || new Date().toTimeString().split(' ')[0],
              type: logData.type || 'info',
              message: logData.message
            }];
            return newLogs.slice(-40);
          });

          // Inject newly routed complaint into global store
          if (logData.complaint) {
            console.log("Adding webhook routed complaint to dashboard store:", logData.complaint);
            addComplaint(logData.complaint);
          }

          // Trigger viewport flash alert on successful integration webhook routing
          if (logData.message && logData.message.includes("INBOUND OMNI-CHANNEL REPORT PARSED - ROUTING TO WARD REGISTRY")) {
            setAlertText("INBOUND OMNI-CHANNEL REPORT PARSED - ROUTING TO WARD REGISTRY");
            // Automatically clear flash alert
            setTimeout(() => {
              setAlertText(null);
            }, 4500);
          }
        } catch (e) {
          console.error("Error parsing streaming log data:", e);
        }
      };

      eventSource.onerror = (err) => {
        console.warn("Log stream disconnected. Reconnecting in 5 seconds...", err);
        if (eventSource) {
          eventSource.close();
        }
        reconnectTimeout = setTimeout(connectStream, 5000);
      };
    };

    connectStream();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [addComplaint]);

  // 2. Slow mock generator as background filler log activity
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
        return newLogs.slice(-40);
      });
    };

    const interval = setInterval(addMockLog, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'ai': return 'text-zinc-400 font-bold';
      case 'warning': return 'text-amber-500 font-bold';
      case 'success': return 'text-emerald-400 font-bold';
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

      {/* Viewport-wide Animated Flash Alert Overlay */}
      <AnimatePresence>
        {alertText && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
            {/* Ambient Dark Overlay with Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-[3px]"
            />
            
            {/* Main Premium Alert Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -80 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                transition: { type: "spring", stiffness: 350, damping: 22 }
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.85, 
                y: 60, 
                transition: { duration: 0.25 } 
              }}
              className="relative max-w-xl w-full border-2 border-emerald-500/80 rounded-2xl p-6 bg-slate-950/95 shadow-[0_0_60px_rgba(16,185,129,0.35)] flex flex-col items-center text-center overflow-hidden pointer-events-auto"
            >
              {/* High-tech Matrix Grid Pattern Background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#022c22_1px,transparent_1px),linear-gradient(to_bottom,#022c22_1px,transparent_1px)] bg-[size:16px_16px] opacity-25" />
              
              {/* Outer Pulsing Concentric Ripple Rings */}
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.4, 0.7, 0.4]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 2, 
                  ease: "easeInOut" 
                }}
                className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 z-10"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                </div>
              </motion.div>

              {/* Header Badge */}
              <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-950/90 border border-emerald-500/40 text-emerald-400 mb-3.5 z-10 animate-pulse">
                INBOUND DATA PARSED
              </span>

              {/* Main Content Wording */}
              <h3 className="text-xs md:text-sm font-black text-slate-100 uppercase tracking-widest mb-2.5 max-w-md leading-relaxed z-10">
                {alertText}
              </h3>
              
              {/* Support Details */}
              <p className="text-[9px] text-zinc-400 font-semibold max-w-sm z-10 leading-normal">
                An incoming WhatsApp incident stream report has successfully passed the visual evaluation pipeline and has been routed to the local Ward Registry.
              </p>

              {/* Premium bottom status bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_12px_#10b981]" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
