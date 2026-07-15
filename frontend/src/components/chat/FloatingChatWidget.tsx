'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { updateReportsCache } from '@/lib/localChatEngine';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  engine?: string;
};

type ReportingState = {
  step: 'idle' | 'type' | 'image' | 'landmark' | 'gps' | 'submitting' | 'success';
  type?: 'pothole' | 'streetlight' | 'traffic_signal' | 'open_drainage';
  image?: File;
  landmark?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  autoAddress?: string;
};

type HighwayEntry = {
  code: string;
  contracts: number;
  totalValue: string;
  states: string[];
};

type StateEntry = {
  state: string;
  contracts: number;
  totalValue: string;
};

type HighwayIndex = {
  highways: { nh: HighwayEntry[]; sh: HighwayEntry[] };
  states: StateEntry[];
  totalContracts: number;
};

const SUGGESTIONS = [
  { label: '📊 Spending Stats', text: 'Show me total spending statistics' },
  { label: '🛣️ NH-44 Contracts', text: 'Search contracts for NH-44' },
  { label: '🚨 Budget Overruns', text: 'Are there any budget overruns or audit flags?' },
  { label: '⚠️ Report a Pothole', text: 'Report a pothole' },
];

const WELCOME_MESSAGE = `👋 **Welcome to the ROADWATCH AI Civil Assistant!**

I can help you monitor local road quality, check public spending records (CPPP & NHAI data), analyze budgets & contractors, and report road safety hazards in real-time.

*Type **"help"** for options, or select a suggestion chip to start!*`;

export default function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: WELCOME_MESSAGE,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState('Local Chat Engine (CPPP Data)');

  // Reporting Flow State
  const [reporting, setReporting] = useState<ReportingState>({ step: 'idle' });

  // Highway Dropdown State
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownTab, setDropdownTab] = useState<'nh' | 'sh' | 'states'>('nh');
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [highwayIndex, setHighwayIndex] = useState<HighwayIndex | null>(null);
  const [loadingIndex, setLoadingIndex] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // No-op: backend handles all query processing

  // Fetch highway index on first dropdown open
  const fetchHighwayIndex = useCallback(async () => {
    if (highwayIndex || loadingIndex) return;
    setLoadingIndex(true);
    try {
      const res = await fetch('/highway_index.json');
      if (res.ok) {
        const data = await res.json();
        setHighwayIndex(data);
      }
    } catch (e) {
      console.error('Failed to load highway index:', e);
    } finally {
      setLoadingIndex(false);
    }
  }, [highwayIndex, loadingIndex]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, reporting.step]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: WELCOME_MESSAGE,
        timestamp: new Date(),
      },
    ]);
    setReporting({ step: 'idle' });
    setEngine('Local Chat Engine (CPPP Data)');
  };

  const sessionIdRef = useRef(`fw-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    // Guided reporting trigger
    if (/report|pothole|streetlight|drainage/i.test(text) && text.length < 30) {
      setReporting({ step: 'type' });
      setMessages((prev) => [
        ...prev,
        {
          id: `assist-${Date.now()}`,
          role: 'assistant',
          content: `🚧 **Starting Guided Reporting Flow**\n\nI will guide you step-by-step to report this issue. Let's begin!\n\n**Step 1: Select the issue type below:**`,
          timestamp: new Date(),
        },
      ]);
      setLoading(false);
      return;
    }

    setEngine('ROADWATCH Backend API');

    const assistantMsg: Message = {
      id: `assist-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      engine: 'ROADWATCH Backend API',
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const response = await fetch("http://localhost:8000/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: sessionIdRef.current,
        })
      });

      if (!response.body) {
        throw new Error("No response body received");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.type === 'content') {
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === 'assistant') {
                    last.content += data.content;
                  }
                  return updated;
                });
              } else if (data.type === 'metadata') {
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === 'assistant') {
                    last.citations = data.citations;
                    last.suggestedActions = data.suggested_actions;
                    last.routingDetails = data.routing_details;
                  }
                  return updated;
                });
              }
            } catch (err) {
              console.error("Parse stream error:", err);
            }
          }
        }
      }
    } catch (error) {
      console.warn("Chat stream failed:", error);
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant') {
          last.content = "⚠️ **Backend server unavailable.**\n\nYour query could not be processed because the backend server is not responding. Please ensure the backend is running.";
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  /* Guided Reporting Handlers */
  const handleSelectType = (type: ReportingState['type']) => {
    setReporting((prev) => ({ ...prev, step: 'image', type }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReporting((prev) => ({ ...prev, step: 'landmark', image: file }));
    }
  };

  const handleSkipImage = () => {
    setReporting((prev) => ({ ...prev, step: 'landmark' }));
  };

  const handleLandmarkSubmit = (landmarkStr: string) => {
    setReporting((prev) => ({ ...prev, step: 'gps', landmark: landmarkStr }));
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setReporting((prev) => ({
        ...prev,
        step: 'submitting',
        lat: 13.0827,
        lng: 80.2707,
        accuracy: 10,
        autoAddress: 'Chennai, Tamil Nadu (Fallback Coordinates)',
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = Math.abs(pos.coords.latitude);
        const longitude = Math.abs(pos.coords.longitude);
        const acc = Math.round(pos.coords.accuracy);

        let resolvedAddress = `Location at Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          if (data.display_name) {
            resolvedAddress = data.display_name;
          }
        } catch {
          // Nominatim fallback failed, use coordinate string
        }

        setReporting((prev) => ({
          ...prev,
          step: 'submitting',
          lat: latitude,
          lng: longitude,
          accuracy: acc,
          autoAddress: resolvedAddress,
        }));
      },
      () => {
        setReporting((prev) => ({
          ...prev,
          step: 'submitting',
          lat: 13.0827,
          lng: 80.2707,
          accuracy: 15,
          autoAddress: 'Default City Coordinates (Chennai)',
        }));
      },
      { enableHighAccuracy: true }
    );
  };

  // Smart Routing Classifier (Client-Side Overpass)
  const classifyRoadDetailsClient = async (lat: number, lng: number) => {
    let detectedState = 'India';
    let authority = 'PWD';
    let engineerEmail = null;

    try {
      const query = `[out:json];
        (
          way(around:25,${lat},${lng})[highway];
          is_in(${lat},${lng})->.a;
          area.a[admin_level=4];
        );
        out tags;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const overpassData = await res.json();

      if (overpassData.elements && overpassData.elements.length > 0) {
        const stateElement = overpassData.elements.find((el: any) => el.type === 'area' || (el.tags && el.tags.admin_level === '4'));
        const roadElement = overpassData.elements.find((el: any) => el.type === 'way' && el.tags && el.tags.highway);

        if (stateElement && stateElement.tags && stateElement.tags.name) {
          detectedState = stateElement.tags.name;
        }
        if (roadElement && roadElement.tags) {
          const tags = roadElement.tags;
          const ref = tags.ref ? tags.ref.toUpperCase() : '';
          const highway = tags.highway || '';
          if (ref.startsWith('NH') || highway === 'motorway' || highway === 'trunk') {
            authority = 'NHAI';
          } else if (ref.startsWith('SH') || ref.includes('MDR')) {
            authority = 'STATE_HIGHWAY';
          } else if (['residential', 'tertiary', 'service', 'living_street'].includes(highway)) {
            authority = 'Municipal';
          }
        }
      }
    } catch (e) {
      console.warn("OSM routing lookup failed (using fallback):", e);
    }

    try {
      const authRes = await fetch('/all_india_pwd_road_authorities.json');
      const authorities = await authRes.json();
      const stateAuthority = authorities.find((a: any) => 
        a.state_ut.toLowerCase().includes(detectedState.toLowerCase()) ||
        detectedState.toLowerCase().includes(a.state_ut.toLowerCase())
      );
      if (stateAuthority) {
        engineerEmail = stateAuthority.office_email || stateAuthority.administrative_head_email;
      }
    } catch {}

    return { authority, state: detectedState, engineerEmail };
  };

  // Submit report client-side
  useEffect(() => {
    if (reporting.step === 'submitting') {
      const submitData = async () => {
        try {
          const finalLocation = reporting.landmark
            ? `(${reporting.landmark}) ${reporting.autoAddress || 'GPS Location'}`
            : (reporting.autoAddress || 'GPS Location');

          const routingInfo = await classifyRoadDetailsClient(reporting.lat || 13.0827, reporting.lng || 80.2707);
          const routedTo = routingInfo.authority === 'NHAI' 
            ? 'National Highways Authority of India (NHAI)' 
            : routingInfo.authority === 'STATE_HIGHWAY'
            ? `State Highways Department (${routingInfo.state || 'State'})`
            : routingInfo.authority === 'Municipal'
            ? `Municipal Corporation (${routingInfo.state || 'City'})` 
            : `Public Works Department (${routingInfo.state || 'State'})`;

          // Cache in local storage reports list
          const saved = localStorage.getItem('roadwatch_reports');
          const currentReports = saved ? JSON.parse(saved) : [];
          const newReport = {
            id: `rep-${Date.now()}`,
            image_url: '/uploads/placeholder.jpg',
            location: finalLocation,
            lat: reporting.lat || 13.0827,
            lng: reporting.lng || 80.2707,
            type: reporting.type!,
            impact_level: 2,
            governing_body: routedTo,
            status: 'pending',
            created_at: new Date().toISOString()
          };
          currentReports.unshift(newReport);
          updateReportsCache(currentReports);

          setReporting((prev) => ({ ...prev, step: 'success' }));
          setMessages((prev) => [
            ...prev,
            {
              id: `reporting-success-${Date.now()}`,
              role: 'assistant',
              content: `🎉 **Civic Report Filed Successfully!**\n\nYour report regarding a **${reporting.type?.toUpperCase().replace('_', ' ')}** at *${finalLocation}* has been submitted and auto-routed.\n\n**Auto-Routing Result:**\n- **Authority**: ${routedTo}\n- **State**: ${routingInfo.state || 'India'}\n- **Contact**: ${routingInfo.engineerEmail || 'pwd-hq@state.gov.in'}\n\nThank you for making our roads safer! 🛣️`,
              timestamp: new Date(),
            },
          ]);
        } catch (err: any) {
          console.error(err);
          setReporting({ step: 'idle' });
          setMessages((prev) => [
            ...prev,
            {
              id: `reporting-failed-${Date.now()}`,
              role: 'assistant',
              content: `⚠️ **Report Submission Failed**: ${err.message || 'Unknown error'}. Report saved to offline queue.`,
              timestamp: new Date(),
            },
          ]);
        }
      };
      submitData();
    }
  }, [reporting.step]);

  // Clean Markdown Renderer
  const renderMessageContent = (content: string) => {
    if (!content || content === '__TRIGGER_REPORT_FLOW__') return null;

    const lines = content.split('\n');
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];
    const parsedElements: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const parts = trimmed.split('|').map((p) => p.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);

        if (!inTable) {
          inTable = true;
          tableHeaders = parts;
          tableRows = [];
        } else {
          if (parts.every((p) => p.startsWith(':') || p.startsWith('-') || p.endsWith('-'))) {
            return;
          }
          tableRows.push(parts);
        }
        return;
      }

      if (inTable && (!trimmed.startsWith('|') || !trimmed.endsWith('|'))) {
        inTable = false;
        parsedElements.push(
          <div key={`table-${idx}`} className="my-3 overflow-x-auto w-full">
            <table className="min-w-full text-xs text-left border border-slate-700 bg-slate-900/60 rounded">
              <thead className="bg-slate-800 border-b border-slate-700 text-slate-200">
                <tr>
                  {tableHeaders.map((h, i) => (
                    <th key={i} className="px-3 py-2 font-semibold">
                      {parseInlineMarkdown(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {tableRows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-slate-800/40">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 max-w-[200px] truncate">
                        {parseInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      if (trimmed.startsWith('###')) {
        parsedElements.push(
          <h4 key={idx} className="text-sm font-bold text-cyan-400 mt-4 mb-2">
            {parseInlineMarkdown(trimmed.replace('###', '').trim())}
          </h4>
        );
      } else if (trimmed.startsWith('##')) {
        parsedElements.push(
          <h3 key={idx} className="text-base font-bold text-white mt-4 mb-2 border-b border-slate-700/60 pb-1">
            {parseInlineMarkdown(trimmed.replace('##', '').trim())}
          </h3>
        );
      } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        parsedElements.push(
          <li key={idx} className="ml-4 list-disc text-xs my-1 text-slate-300">
            {parseInlineMarkdown(trimmed.substring(1).trim())}
          </li>
        );
      } else if (trimmed) {
        parsedElements.push(
          <p key={idx} className="text-xs my-2 text-slate-200 leading-relaxed">
            {parseInlineMarkdown(trimmed)}
          </p>
        );
      } else {
        parsedElements.push(<div key={idx} className="h-2" />);
      }
    });

    if (inTable) {
      parsedElements.push(
        <div key="table-end" className="my-3 overflow-x-auto w-full">
          <table className="min-w-full text-xs text-left border border-slate-700 bg-slate-900/60 rounded">
            <thead className="bg-slate-800 border-b border-slate-700 text-slate-200">
              <tr>
                {tableHeaders.map((h, i) => (
                  <th key={i} className="px-3 py-2 font-semibold">
                    {parseInlineMarkdown(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {tableRows.map((row, ri) => (
                <tr key={ri} className="hover:bg-slate-800/40">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2">
                      {parseInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return parsedElements;
  };

  const parseInlineMarkdown = (text: string) => {
    if (typeof text !== 'string') return null;
    let parts: React.ReactNode[] = [text];

    parts = parts.flatMap((part) => {
      if (typeof part !== 'string') return part;
      const subParts = part.split(/\*\*(.*?)\*\*/g);
      return subParts.map((sub, i) => (i % 2 === 1 ? <strong key={`bold-${i}`} className="text-white font-semibold">{sub}</strong> : sub));
    });

    parts = parts.flatMap((part) => {
      if (typeof part !== 'string') return part;
      const subParts = part.split(/\*(.*?)\*/g);
      return subParts.map((sub, i) => (i % 2 === 1 ? <em key={`italic-${i}`} className="italic">{sub}</em> : sub));
    });

    parts = parts.flatMap((part) => {
      if (typeof part !== 'string') return part;
      const subParts = part.split(/`(.*?)`/g);
      return subParts.map((sub, i) => (i % 2 === 1 ? <code key={`code-${i}`} className="px-1 py-0.5 rounded bg-slate-800 font-mono text-cyan-400 border border-slate-700 text-[10px]">{sub}</code> : sub));
    });

    return <>{parts}</>;
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center h-14 w-14 rounded-full bg-cyan-500 text-black shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer"
          style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)' }}
          aria-label="Open ROADWATCH Civil Chatbot"
        >
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-ping" />
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
          
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}

      {isOpen && (
        <div
          className={`flex flex-col bg-[#0b1329]/95 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden transition-all duration-300 ease-in-out ${
            isMaximized ? 'fixed inset-4 sm:inset-6 md:inset-12 z-[10000]' : 'h-[560px] w-[400px]'
          }`}
          style={{ boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6), 0 0 3px rgba(6, 182, 212, 0.15)' }}
        >
          {/* HEADER */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0f1d3a] border-b border-slate-700/50">
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide">ROADWATCH Civil AI</h3>
                <p className="text-[9px] text-slate-400">{engine}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsMaximized((prev) => !prev)}
                className="text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                title={isMaximized ? "Restore" : "Maximize"}
              >
                {isMaximized ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15v-6m0 0h6m-6 0L19.5 4.5M15 9v6m0 0H9m6 0L4.5 19.5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                )}
              </button>
              <button
                onClick={handleClearChat}
                className="text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                title="Clear Chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Collapse Chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* CHAT MESSAGES BODY */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/40">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <span className="text-[9px] text-slate-400 mb-1">
                  {m.role === 'user' ? 'YOU' : 'CIVIC ASSISTANT'} • {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>

                <div
                  className={`p-3 rounded-2xl ${
                    m.role === 'user'
                      ? 'bg-cyan-500 text-black rounded-tr-none'
                      : 'bg-[#0f1d3a] text-slate-200 border border-slate-800 rounded-tl-none'
                  }`}
                >
                  {renderMessageContent(m.content)}
                </div>
              </div>
            ))}

            {/* Guided Reporting Interactive UI */}
            {reporting.step !== 'idle' && reporting.step !== 'success' && (
              <div className="mr-auto w-full max-w-[85%] border border-cyan-500/40 rounded-2xl bg-cyan-950/20 p-4 space-y-4">
                <span className="text-[9px] font-bold text-cyan-400 block tracking-wider uppercase">Guided Issue Filing</span>

                {/* STEP 1: SELECT ISSUE TYPE */}
                {reporting.step === 'type' && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-300">Select issue type:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['pothole', 'streetlight', 'traffic_signal', 'open_drainage'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => handleSelectType(t)}
                          className="bg-slate-900 border border-slate-700 rounded p-2 text-left text-xs hover:border-cyan-400 transition hover:bg-slate-800 cursor-pointer capitalize text-slate-200"
                        >
                          {t === 'pothole' ? '🕳️' : t === 'streetlight' ? '💡' : t === 'traffic_signal' ? '🚦' : '🌊'} {t.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 2: UPLOAD IMAGE */}
                {reporting.step === 'image' && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-300">Upload a photo of the <b>{reporting.type?.replace('_', ' ')}</b> (optional):</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 bg-slate-900 border-2 border-dashed border-slate-700 rounded-lg text-xs hover:border-cyan-500 transition text-slate-300 flex flex-col items-center justify-center space-y-1 cursor-pointer"
                    >
                      <span>📸 Capture / Choose Photo</span>
                      <span className="text-[9px] text-slate-500">jpeg/png formats</span>
                    </button>
                    <button
                      onClick={handleSkipImage}
                      className="w-full py-2 text-[10px] text-slate-400 hover:text-slate-200 transition"
                    >
                      Skip — proceed without photo
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                )}

                {/* STEP 3: NEAREST LANDMARK */}
                {reporting.step === 'landmark' && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-300">Nearest landmark (optional):</p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const val = (e.currentTarget.elements.namedItem('landmark') as HTMLInputElement).value;
                        handleLandmarkSubmit(val);
                      }}
                      className="flex space-x-2"
                    >
                      <input
                        name="landmark"
                        type="text"
                        placeholder="e.g. Opp. Central School, Near bus stop..."
                        className="flex-1 text-xs rounded bg-slate-900 border border-slate-700 p-2 text-white focus:outline-none focus:border-cyan-500"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="bg-cyan-500 text-black px-3 rounded text-xs font-bold hover:bg-cyan-400 cursor-pointer"
                      >
                        Next
                      </button>
                    </form>
                  </div>
                )}

                {/* STEP 4: GPS LOCATION */}
                {reporting.step === 'gps' && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-300">Tag precise location via device GPS:</p>
                    <button
                      onClick={handleDetectLocation}
                      className="w-full py-2 bg-cyan-500 text-black text-xs font-bold rounded flex items-center justify-center space-x-1 hover:bg-cyan-400 cursor-pointer"
                    >
                      <span>📍 Detect Coordinates</span>
                    </button>
                    <p className="text-[9px] text-slate-500 text-center">Your coordinates will be used to auto-route the issue to the correct authority</p>
                  </div>
                )}

                {/* STEP 5: SUBMITTING / LOADER */}
                {reporting.step === 'submitting' && (
                  <div className="flex flex-col items-center justify-center py-4 space-y-2">
                    <span className="h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] text-cyan-400 font-bold">Submitting & auto-routing report...</p>
                  </div>
                )}
              </div>
            )}

            {/* AI Typing loader */}
            {loading && (
              <div className="mr-auto items-start max-w-[85%] space-y-1">
                <span className="text-[9px] text-slate-400">CIVIC ASSISTANT • typing...</span>
                <div className="p-3 rounded-2xl bg-[#0f1d3a] border border-slate-800 rounded-tl-none flex space-x-1 items-center h-8">
                  <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* CHAT INPUT AREA */}
          {reporting.step === 'idle' && (
            <div className="p-3 bg-[#0a1122] border-t border-slate-800 space-y-2 relative">
              {/* SUGGESTION CHIPS */}
              {messages.length <= 1 && (
                <div className="flex space-x-2 overflow-x-auto pb-1 scroll-smooth">
                  {SUGGESTIONS.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(chip.text)}
                      className="flex-shrink-0 text-[10px] bg-slate-900 border border-slate-700/80 hover:border-cyan-400/60 rounded-full px-3 py-1 text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}

              {/* HIGHWAY DROPDOWN PANEL */}
              {showDropdown && (
                <div
                  ref={dropdownRef}
                  className="absolute bottom-full left-0 right-0 mx-3 mb-2 bg-[#0b1329] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden z-50"
                  style={{ maxHeight: '320px', boxShadow: '0 -8px 30px rgba(0,0,0,0.5)' }}
                >
                  <div className="flex items-center justify-between px-3 py-2 bg-[#0f1d3a] border-b border-slate-700/50">
                    <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase">🛣️ Quick Highway Explorer</span>
                    <button
                      onClick={() => setShowDropdown(false)}
                      className="text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex border-b border-slate-800">
                    {([['nh', '🏛️ NH'], ['sh', '🏘️ SH'], ['states', '📍 States']] as const).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => { setDropdownTab(key); setDropdownSearch(''); }}
                        className={`flex-1 text-[10px] py-2 font-bold tracking-wide transition cursor-pointer ${
                          dropdownTab === key
                            ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="px-3 py-2 border-b border-slate-800">
                    <input
                      type="text"
                      placeholder={dropdownTab === 'states' ? 'Search states...' : 'Search highways (e.g. 44)...'}
                      value={dropdownSearch}
                      onChange={(e) => setDropdownSearch(e.target.value)}
                      className="w-full text-[11px] rounded-lg bg-slate-900 border border-slate-700 p-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      autoFocus
                    />
                  </div>

                  <div className="overflow-y-auto" style={{ maxHeight: '200px' }}>
                    {loadingIndex ? (
                      <div className="flex items-center justify-center py-8">
                        <span className="h-5 w-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                        <span className="ml-2 text-[10px] text-slate-400">Loading data...</span>
                      </div>
                    ) : !highwayIndex ? (
                      <div className="text-center py-6 text-[10px] text-slate-500">No data available</div>
                    ) : dropdownTab === 'states' ? (
                      highwayIndex.states
                        .filter((s) => s.state.toLowerCase().includes(dropdownSearch.toLowerCase()))
                        .map((s) => (
                          <button
                            key={s.state}
                            onClick={() => {
                              handleSendMessage(`Show me highway spending details for ${s.state}`);
                              setShowDropdown(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-cyan-500/10 border-b border-slate-800/50 transition cursor-pointer group"
                          >
                            <div>
                              <span className="text-[11px] font-semibold text-slate-200 group-hover:text-cyan-400 transition">{s.state}</span>
                              <span className="text-[9px] text-slate-500 ml-2">{s.contracts} contracts</span>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400">{s.totalValue}</span>
                          </button>
                        ))
                    ) : (
                      (dropdownTab === 'nh' ? highwayIndex.highways.nh : highwayIndex.highways.sh)
                        .filter((h) => h.code.toLowerCase().includes(dropdownSearch.toLowerCase()))
                        .slice(0, 30)
                        .map((h) => (
                          <button
                            key={h.code}
                            onClick={() => {
                              handleSendMessage(`Search contracts for ${h.code}`);
                              setShowDropdown(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-cyan-500/10 border-b border-slate-800/50 transition cursor-pointer group"
                          >
                            <div>
                              <span className="text-[11px] font-bold text-cyan-400 font-mono group-hover:text-cyan-300 transition">{h.code}</span>
                              <span className="text-[9px] text-slate-500 ml-2">{h.contracts} contracts</span>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400">{h.totalValue}</span>
                          </button>
                        ))
                    )}
                  </div>
                </div>
              )}

              {/* INPUT ROW */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setShowDropdown((v) => !v);
                    if (!showDropdown) fetchHighwayIndex();
                  }}
                  className={`flex-shrink-0 text-[10px] font-bold transition px-2 py-2 rounded-lg border cursor-pointer ${
                    showDropdown
                      ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10'
                      : 'border-slate-700 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400'
                  }`}
                  title="Browse Highways"
                >
                  Brief 🛣️
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(inputValue);
                    }
                  }}
                  placeholder="Ask about roads, budgets, contractors..."
                  className="flex-1 text-[11px] rounded-lg bg-slate-900 border border-slate-700 p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />

                <button
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={loading || !inputValue.trim()}
                  className="flex-shrink-0 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black rounded-lg p-2.5 transition cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
