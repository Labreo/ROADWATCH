'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  Plus, 
  Mic, 
  MicOff, 
  Volume2, 
  X, 
  ChevronDown, 
  Navigation, 
  FileSpreadsheet, 
  ArrowRight, 
  AlertCircle, 
  MapPin, 
  Activity, 
  Coins, 
  HardHat, 
  Globe, 
  HelpCircle,
  Clock,
  Award,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { 
  roads, 
  contractors, 
  projects, 
  getAuthority,
  getContractor,
  complaints as mockComplaints
} from '@/data/mockData';
import { Road, Contractor, Project, Complaint } from '@/types';
import { calculateRoadTransparency, getScoreGrade, getCitywideTransparencyData } from '@/services/transparencyEngine';

// Subcomponents
import MapWrapper from '@/components/map/MapWrapper';
import RoadDetailsPanel from '@/components/dashboard/RoadDetailsPanel';
import DigitalTwinView from '@/components/twin/DigitalTwinView';
import ComplaintTimeline from '@/components/complaints/ComplaintTimeline';
import SpendingComparisonChart from '@/components/transparency/SpendingComparisonChart';
import RepairFrequencyHeatmap from '@/components/transparency/RepairFrequencyHeatmap';
import BudgetTimeline from '@/components/transparency/BudgetTimeline';
import ContractorHistoryCard from '@/components/transparency/ContractorHistoryCard';
import TransparencyScoreCard from '@/components/transparency/TransparencyScoreCard';
import BottomSheet from '@/components/shared/BottomSheet';
import CitationRenderer, { Citation } from './CitationRenderer';

// Localized example prompts
const LOCALIZED_QUERIES = {
  'en-IN': [
    "Why is S.V. Road damaged again?",
    "Show SV Road on map",
    "Launch the digital twin",
    "Show Omega Infrastructure",
    "Verify budgets for SV Road"
  ]
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  suggestedActions?: { type: string; target_id: number; label: string }[];
  evidence?: { title: string; items: string[] }[];
}

export default function ChatOrchestrator() {
  const { 
    selectedRoadId, 
    setSelectedRoadId,
    selectedComplaintId,
    setSelectedComplaintId,
    dispatchChatAction,
    complaintsList,
    isOnline,
    setIsReporting
  } = useStore();

  // Local navigation context state
  const [contextView, setContextView] = useState<'map' | 'twin' | 'contractors' | 'budgets' | 'complaints' | null>(null);
  const [selectedContractorId, setSelectedContractorId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Chat window state
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Welcome to **ROADWATCH Conversational Shell**. I am your municipal auditor assistant. Ask questions to query budget compliance, inspect contractor rating scores, launch telemetry simulations, or view defect timelines.\n\n*Try tapping a query below, like: 'Why is S.V. Road damaged again?'*"
    }
  ]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([
    "Why is S.V. Road damaged again?",
    "Launch the digital twin",
    "Verify budgets for SV Road",
    "Show Omega Infrastructure"
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [expandedEvidenceKey, setExpandedEvidenceKey] = useState<string | null>(null);

  // Voice Assistant States
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('Tap Mic to speak to AI');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Check backend status
    const checkBackend = async () => {
      try {
        const res = await fetch("http://localhost:8000/");
        setIsBackendOnline(res.ok);
      } catch (err) {
        setIsBackendOnline(false);
      }
    };
    checkBackend();

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Voice synthesis & recognition cleanup on unmount
  useEffect(() => {
    const SpeechRecognition = typeof window !== 'undefined' && 
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN';
      
      rec.onstart = () => {
        setIsListening(true);
        setCurrentTranscription('Listening...');
      };
      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setCurrentTranscription(text);
        setTimeout(() => {
          handleSubmit(text);
        }, 600);
      };
      rec.onerror = () => {
        setIsListening(false);
        setCurrentTranscription('Speech timed out. Try again.');
      };
      rec.onend = () => {
        setIsListening(false);
      };
      recognitionRef.current = rec;
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Format currency helpers
  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value).replace('INR', '₹');
  };

  const formatShortINR = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    return formatINR(value);
  };

  // Transparency details memoization
  const citywideTransparency = useMemo(() => {
    return getCitywideTransparencyData(roads, projects, contractors, complaintsList);
  }, [complaintsList]);

  const selectedRoadTransparency = useMemo(() => {
    if (!selectedRoadId) return null;
    const road = roads.find(r => r.id === selectedRoadId);
    if (!road) return null;
    return calculateRoadTransparency(road, projects, contractors, complaintsList);
  }, [selectedRoadId, complaintsList]);

  // Simulated AI Stream
  const simulateStreamingResponse = async (textToSend: string) => {
    const lowerQuery = textToSend.toLowerCase();
    
    let responseText = "";
    let citations: Citation[] = [];
    let suggestedActions: { type: string; target_id: number; label: string }[] = [];
    let evidence: { title: string; items: string[] }[] = [];
    let nextPrompts: string[] = [];

    // Check query categories
    const isTwinQuery = lowerQuery.includes('twin') || lowerQuery.includes('3d') || lowerQuery.includes('telemetry') || lowerQuery.includes('simulation');
    const isMapQuery = lowerQuery.includes('map') || lowerQuery.includes('locate') || lowerQuery.includes('show sv') || lowerQuery.includes('show s.v.');
    const isContractorQuery = lowerQuery.includes('omega') || lowerQuery.includes('contractor') || lowerQuery.includes('who repaired');
    const isBudgetQuery = lowerQuery.includes('budget') || lowerQuery.includes('spend') || lowerQuery.includes('money') || lowerQuery.includes('cost') || lowerQuery.includes('verify budget');
    const isDamageQuery = lowerQuery.includes('damage') || lowerQuery.includes('pothole') || lowerQuery.includes('poor') || lowerQuery.includes('broken');

    if (isTwinQuery) {
      responseText = "Connecting to the **Digital Twin Command Console** for S.V. Road. I am initializing the spatial grid overlay and loading live accelerometer diagnostics. Here, we can run virtual simulation models and overlay real-time structural load limits. {\"view\": \"twin\", \"roadId\": 1}";
      citations = [{ type: 'road', id: 1, name: 'S.V. Road (Santacruz to Bandra)', code: 'SVR-LD01', status: 'poor', length: 4.8 }];
      evidence = [{ title: "Digital Twin Telemetry", items: ["IMU scan status: Synchronized", "Structural stress limit: 84% capacity", "Subsurface moisture: 42% (Normal)"] }];
      nextPrompts = ["Show SV Road on map", "Verify budgets for SV Road", "Show Omega Infrastructure"];
    } else if (isMapQuery) {
      responseText = "Surfacing **S.V. Road (Santacruz to Bandra)** directly on the geospatial Map panel. Toggling the localized GIS complaints log so you can view pins for all active paving defects. {\"view\": \"map\", \"roadId\": 1}";
      citations = [{ type: 'road', id: 1, name: 'S.V. Road (Santacruz to Bandra)', code: 'SVR-LD01', status: 'poor', length: 4.8 }];
      nextPrompts = ["Launch the digital twin", "Verify budgets for SV Road", "Why is S.V. Road damaged again?"];
    } else if (isContractorQuery) {
      responseText = "Omega Infrastructure Ltd. is marked with a **poor safety rating of 1.85/5.00** and has been blacklisted for 3 years due to repeated sub-base soil compaction failures. Toggling the Contractor registry card so you can review the full audit findings. {\"view\": \"contractors\", \"contractorId\": 3}";
      citations = [{ type: 'contractor', id: 3, name: 'Omega Infrastructure Ltd.', rating: 1.85, blacklisted: true }];
      nextPrompts = ["Why is S.V. Road damaged again?", "Verify budgets for SV Road", "Show SV Road on map"];
    } else if (isBudgetQuery) {
      responseText = "Opening the **Accountability Ledger and Budget Audit Card** for S.V. Road. Total public spend is ₹4.72 Crores against ₹4.8 Crores sanctioned (98.4%). However, a 14% unapproved material cost variance has been flagged. {\"view\": \"budgets\", \"roadId\": 1}";
      citations = [
        { type: 'road', id: 1, name: 'S.V. Road (Santacruz to Bandra)', code: 'SVR-LD01', status: 'poor', length: 4.8 },
        { type: 'contractor', id: 3, name: 'Omega Infrastructure Ltd.', rating: 1.85, blacklisted: true }
      ];
      evidence = [{ title: "Sanction Ledger", items: ["Sanctioned budget: ₹4.80 Cr", "Outflow ledger: ₹4.72 Cr", "Audit tag: Flagged for Vigilance review"] }];
      nextPrompts = ["Why is S.V. Road damaged again?", "Show Omega Infrastructure", "Launch the digital twin"];
    } else if (isDamageQuery) {
      responseText = "S.V. Road is currently flagged with a **poor health score (32/100)**. Soil compaction reports show density at only **62%** (minimum is 80%). Unapproved utility trenching in late 2025 has let water strip the binders. {\"view\": \"map\", \"roadId\": 1}";
      citations = [{ type: 'road', id: 1, name: 'S.V. Road (Santacruz to Bandra)', code: 'SVR-LD01', status: 'poor', length: 4.8 }];
      suggestedActions = [{ type: 'report_complaint_on_road', target_id: 1, label: "Log Civic Complaint" }];
      evidence = [{ title: "Sub-Base Compaction Deficits", items: ["Sub-base compaction: 62% (Required >80%)", "Asphalt stripping: Severe (8.5% aggregate absorption)"] }];
      nextPrompts = ["Verify budgets for SV Road", "Show Omega Infrastructure", "Launch the digital twin"];
    } else {
      responseText = "Checking the municipal data. S.V. Road is the lowest-scoring segment in Ward H-West due to recurring pothole complaints and budget variances. Let me know if you would like to inspect the map, digital twin, or contractor audit records. {\"view\": \"map\", \"roadId\": 1}";
      nextPrompts = ["Why is S.V. Road damaged again?", "Launch the digital twin", "Verify budgets for SV Road"];
    }

    // Stream word-by-word
    const words = responseText.split(" ");
    let currentContent = "";
    for (let i = 0; i < words.length; i++) {
      currentContent += (i === 0 ? "" : " ") + words[i];

      // Check for action token in real-time
      const match = currentContent.match(/\{"view":\s*"[^"]*".*?\}/);
      let contentToDisplay = currentContent;
      
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (parsed.view) {
            dispatchChatAction({ type: 'NAVIGATE', payload: parsed });
            setContextView(parsed.view === 'roads' ? 'map' : parsed.view);
            if (parsed.contractorId) {
              setSelectedContractorId(parsed.contractorId);
            }
          }
          contentToDisplay = currentContent.replace(match[0], '');
        } catch (e) {}
      }

      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant') {
          last.content = contentToDisplay;
        }
        return updated;
      });

      await new Promise(resolve => setTimeout(resolve, 20));
    }

    // Finalize assistant metadata
    setMessages(prev => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last && last.role === 'assistant') {
        last.citations = citations;
        last.suggestedActions = suggestedActions;
        last.evidence = evidence;
      }
      return updated;
    });

    if (nextPrompts.length > 0) {
      setSuggestedPrompts(nextPrompts);
    }
  };

  const handleSubmit = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setInput('');
    setIsLoading(true);

    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    if (!isBackendOnline) {
      await simulateStreamingResponse(textToSend);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend })
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';

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
                fullResponse += data.content;

                // Live check for JSON token
                const match = fullResponse.match(/\{"view":\s*"[^"]*".*?\}/);
                let contentToDisplay = fullResponse;
                
                if (match) {
                  const parsed = JSON.parse(match[0]);
                  if (parsed.view) {
                    dispatchChatAction({ type: 'NAVIGATE', payload: parsed });
                    setContextView(parsed.view === 'roads' ? 'map' : parsed.view);
                    if (parsed.contractorId) setSelectedContractorId(parsed.contractorId);
                  }
                  contentToDisplay = fullResponse.replace(match[0], '');
                }

                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === 'assistant') {
                    last.content = contentToDisplay;
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
                  }
                  return updated;
                });
              }
            } catch (err) {}
          }
        }
      }
    } catch (error) {
      await simulateStreamingResponse(textToSend);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: { type: string; target_id: number; label: string }) => {
    if (action.type === 'navigate_to_road' || action.type === 'navigate_to_road_detail') {
      setSelectedRoadId(action.target_id);
      setContextView('map');
    } else if (action.type === 'navigate_to_contractor') {
      setSelectedRoadId(null);
      setSelectedContractorId(action.target_id);
      setContextView('contractors');
    } else if (action.type === 'report_complaint_on_road') {
      setSelectedRoadId(action.target_id);
      setIsReporting(true);
    }
  };

  const renderMessageMarkdown = (content: string) => {
    if (!content) return null;
    return content.split('\n').map((line, idx) => {
      const boldRegex = /\*\*(.*?)\*\*/g;
      
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const rawContent = line.trim().substring(2);
        const parts = [];
        let lastIndex = 0;
        let match;
        while ((match = boldRegex.exec(rawContent)) !== null) {
          parts.push(rawContent.substring(lastIndex, match.index));
          parts.push(<strong key={match.index} className="text-cyan-400 font-extrabold">{match[1]}</strong>);
          lastIndex = boldRegex.lastIndex;
        }
        let listElement: React.ReactNode = rawContent;
        if (lastIndex > 0) {
          parts.push(rawContent.substring(lastIndex));
          listElement = <>{parts}</>;
        }
        return (
          <li key={idx} className="ml-4 list-disc text-slate-350 pl-1 text-[11px] leading-relaxed my-0.5 font-medium">
            {listElement}
          </li>
        );
      }

      const parts = [];
      let lastIndex = 0;
      let match;
      while ((match = boldRegex.exec(line)) !== null) {
        parts.push(line.substring(lastIndex, match.index));
        parts.push(<strong key={match.index} className="text-cyan-400 font-extrabold">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      let paragraphElement: React.ReactNode = line;
      if (lastIndex > 0) {
        parts.push(line.substring(lastIndex));
        paragraphElement = <>{parts}</>;
      }

      return (
        <p key={idx} className="text-[11.5px] leading-relaxed my-1.5 font-medium text-slate-350">
          {paragraphElement}
        </p>
      );
    });
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleCloseContext = () => {
    setContextView(null);
  };

  const filteredContractors = contractors;

  const getStatusTextClass = (status: string) => {
    switch (status) {
      case 'good': return 'text-emerald-400 border-emerald-900/60 bg-emerald-950/40';
      case 'fair': return 'text-amber-400 border-amber-900/60 bg-amber-950/40';
      case 'poor': return 'text-red-400 border-red-900/60 bg-red-950/40';
      case 'under_construction': return 'text-cyan-400 border-cyan-900/60 bg-cyan-950/40';
      default: return 'text-slate-400 border-border bg-slate-900';
    }
  };

  return (
    <div className="flex-1 flex h-full min-h-0 overflow-hidden relative">
      
      {/* desktop split pane using layout animation */}
      <motion.div layout className="flex-1 flex w-full h-full min-h-0 overflow-hidden">
        
        {/* Left Pane: Interactive conversation window */}
        <motion.div 
          layout 
          className={`h-full flex flex-col min-w-0 overflow-hidden transition-all duration-500 bg-slate-950/20 border-r border-white/[0.04] ${
            contextView ? 'w-full lg:w-[45%]' : 'w-full'
          }`}
        >
          {/* Header */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900/40 via-cyan-950/10 to-indigo-950/10 border-b border-white/[0.05] flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 shadow-sm shrink-0">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-[12px] font-black uppercase text-slate-100 tracking-wider">
                  ROADWATCH AUDITOR AI
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isBackendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="text-[8.5px] text-muted-foreground font-bold tracking-wide uppercase">
                    {isBackendOnline ? 'Accredited Records Engine' : 'Offline Mode (Local Fallback)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Voice mode toggle */}
            <button
              onClick={() => setIsVoiceMode(!isVoiceMode)}
              className={`p-2 rounded-xl border border-white/[0.06] hover:bg-cyan-950/40 hover:text-cyan-400 transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                isVoiceMode ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'text-slate-400'
              }`}
              title="Toggle Voice overlay"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Box */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin select-text">
            {messages.map((msg, index) => {
              const isAI = msg.role === 'assistant';
              return (
                <div 
                  key={index}
                  className={`flex items-start gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}
                >
                  {isAI && (
                    <div className="p-1.5 rounded-xl bg-cyan-950/60 border border-cyan-850 text-cyan-400 shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[85%] ${isAI ? 'items-start' : 'items-end'}`}>
                    <div className={`p-4 rounded-2xl text-[11.5px] font-medium leading-relaxed border ${
                      isAI 
                        ? 'bg-slate-900/50 border-white/[0.04] text-slate-100 rounded-tl-sm' 
                        : 'bg-gradient-to-tr from-cyan-600/90 to-indigo-600/90 border-cyan-500/20 text-slate-950 font-bold rounded-tr-sm'
                    }`}>
                      {isAI ? (
                        msg.content === '' ? (
                          <div className="flex items-center gap-1 py-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-75" />
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-150" />
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-225" />
                          </div>
                        ) : (
                          renderMessageMarkdown(msg.content)
                        )
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>

                    {isAI && msg.evidence && msg.evidence.length > 0 && (
                      <div className="w-full mt-2.5 space-y-1.5">
                        <span className="text-[8.5px] text-cyan-500/70 uppercase font-black tracking-widest block pl-1">
                          Verification Evidence Logs
                        </span>
                        {msg.evidence.map((ev, evIdx) => {
                          const isExpanded = expandedEvidenceKey === `${index}-${evIdx}`;
                          return (
                            <div 
                              key={evIdx}
                              className="border border-cyan-500/10 bg-cyan-950/10 rounded-xl overflow-hidden"
                            >
                              <button
                                type="button"
                                onClick={() => setExpandedEvidenceKey(isExpanded ? null : `${index}-${evIdx}`)}
                                className="w-full px-3 py-2 flex items-center justify-between text-[10px] font-bold text-cyan-400/90 hover:bg-cyan-500/5 transition-all text-left cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                  <span>{ev.title}</span>
                                </div>
                                <motion.span
                                  animate={{ rotate: isExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown className="w-3.5 h-3.5 text-cyan-500/80" />
                                </motion.span>
                              </button>
                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <ul className="px-3 pb-2 pt-0.5 space-y-1 border-t border-cyan-500/5">
                                      {ev.items.map((item, itemIdx) => (
                                        <li 
                                          key={itemIdx} 
                                          className="text-[9px] text-slate-300 font-mono leading-relaxed flex items-start gap-1.5"
                                        >
                                          <span className="text-cyan-600 select-none mt-0.5">❯</span>
                                          <span>{item}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {isAI && msg.citations && msg.citations.length > 0 && (
                      <div className="w-full mt-2.5">
                        <CitationRenderer 
                          citations={msg.citations} 
                          onSelectRoad={(id) => {
                            setSelectedRoadId(id);
                            setContextView('map');
                          }}
                          onSelectContractor={(id) => {
                            setSelectedRoadId(null);
                            setSelectedContractorId(id);
                            setContextView('contractors');
                          }}
                        />
                      </div>
                    )}

                    {isAI && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {msg.suggestedActions.map((act, actIdx) => (
                          <button
                            key={actIdx}
                            onClick={() => handleActionClick(act)}
                            className="text-[9.5px] font-bold px-3 py-1.5 bg-cyan-950/40 border border-cyan-850 hover:border-cyan-500 text-cyan-400 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
                          >
                            {act.type === 'report_complaint_on_road' && <Plus className="w-3 h-3" />}
                            {act.type === 'navigate_to_road' && <Navigation className="w-3.5 h-3.5" />}
                            {act.type === 'navigate_to_contractor' && <FileSpreadsheet className="w-3.5 h-3.5" />}
                            {act.label}
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Actions & Input panel */}
          <div className="bg-slate-900/10 border-t border-white/[0.05] py-3.5 space-y-3 shrink-0 select-none">
            {suggestedPrompts.length > 0 && (
              <div className="flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSubmit(prompt)}
                    className="shrink-0 text-[10px] font-extrabold px-3 py-2 bg-slate-950/80 border border-white/[0.06] hover:border-cyan-500/50 hover:bg-cyan-950/20 text-slate-300 hover:text-cyan-400 rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <div className="px-5">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(input);
                }}
                className="flex gap-2 relative bg-slate-950 border border-white/[0.07] focus-within:border-cyan-500/80 rounded-xl px-2.5 py-2 transition-all items-center"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask budgets, contractor ratings, twin simulation..."
                  className="flex-1 bg-transparent border-0 focus:outline-none text-[11px] text-slate-200 placeholder-muted-foreground pl-1.5"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={`p-1.5 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 text-slate-950 font-bold hover:opacity-90 active:scale-95 transition-all shrink-0 cursor-pointer ${
                    (!input.trim() || isLoading) ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  <Send className="w-3.5 h-3.5 text-slate-950" />
                </button>
              </form>
            </div>
          </div>
        </motion.div>

        {/* Right Pane: Canvas context layout zone */}
        <AnimatePresence>
          {contextView && !isMobile && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '55%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="hidden lg:flex flex-col h-full bg-slate-950/40 relative overflow-hidden"
            >
              {/* Close contextual card button */}
              <div className="absolute top-4 right-4 z-50">
                <button
                  onClick={handleCloseContext}
                  className="p-1.5 rounded-lg bg-slate-950/80 border border-white/[0.08] hover:border-cyan-500/40 text-slate-400 hover:text-slate-200 transition-all cursor-pointer shadow-lg"
                  aria-label="Close canvas"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Dynamic Sub-View Dispatcher */}
              <div className="flex-1 h-full min-h-0 w-full overflow-hidden">
                {contextView === 'map' && (
                  <div className="w-full h-full relative">
                    <MapWrapper />
                    {selectedRoadId && (
                      <div className="absolute left-4 top-4 bottom-4 w-76 bg-slate-950/95 border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-300">
                        <RoadDetailsPanel />
                      </div>
                    )}
                  </div>
                )}

                {contextView === 'twin' && (
                  <div className="w-full h-full bg-slate-950/90 relative">
                    <DigitalTwinView />
                  </div>
                )}

                {contextView === 'budgets' && (
                  <div className="w-full h-full p-5 overflow-y-auto space-y-6">
                    {selectedRoadId ? (
                      (() => {
                        const road = roads.find(r => r.id === selectedRoadId)!;
                        const roadProjects = projects.filter(p => p.roadId === road.id);
                        const scoreData = selectedRoadTransparency!;
                        
                        return (
                          <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="flex justify-between items-start border-b border-white/[0.05] pb-4">
                              <div>
                                <button 
                                  onClick={() => setSelectedRoadId(null)}
                                  className="text-[9px] uppercase font-black text-cyan-455 hover:underline mb-1.5 block"
                                >
                                  &larr; City Audit Summary
                                </button>
                                <h3 className="text-sm font-black text-slate-100 uppercase">{road.roadCode} Transparency</h3>
                                <h4 className="text-base font-black text-slate-200 mt-1">{road.name}</h4>
                              </div>
                              <span className={`text-[9px] font-extrabold uppercase border px-2 py-0.5 rounded tracking-wide ${getStatusTextClass(road.status)}`}>
                                {road.status.replace('_', ' ')}
                              </span>
                            </div>

                            <TransparencyScoreCard score={scoreData.transparencyScore} deductions={scoreData.scoreDeductions} />
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-slate-900/30 p-4 border border-white/[0.04] rounded-2xl">
                                <h5 className="text-[10px] text-slate-200 uppercase font-black mb-3">Yearly Spending Chart</h5>
                                <SpendingComparisonChart 
                                  height={150}
                                  data={scoreData.yearlyAllocations.map(y => ({
                                    label: `${y.year}`,
                                    sanctioned: y.sanctioned,
                                    spent: y.spent
                                  }))}
                                />
                              </div>
                              <RepairFrequencyHeatmap projects={roadProjects} anomalies={scoreData.anomalies} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <BudgetTimeline projects={roadProjects} contractors={contractors} />
                              <ContractorHistoryCard breakdown={scoreData.contractorSpendingBreakdown} contractors={contractors} />
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="border-b border-white/[0.05] pb-3">
                          <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                            <Coins className="w-4 h-4 text-cyan-400" /> City Spending Analysis
                          </h3>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="glass-panel p-4 rounded-2xl border border-white/[0.05]">
                            <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-widest">Sanctioned</span>
                            <span className="text-sm font-black text-emerald-450 mt-1 block">{formatINR(citywideTransparency.totalSanctioned)}</span>
                          </div>
                          <div className="glass-panel p-4 rounded-2xl border border-white/[0.05]">
                            <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-widest">Expended</span>
                            <span className="text-sm font-black text-slate-200 mt-1 block">{formatINR(citywideTransparency.totalSpent)}</span>
                          </div>
                          <div className="glass-panel p-4 rounded-2xl border border-white/[0.05]">
                            <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-widest">Average Score</span>
                            <span className="text-sm font-black text-cyan-400 mt-1 block">{citywideTransparency.averageScore} / 100</span>
                          </div>
                        </div>

                        <div className="bg-slate-900/30 p-4 border border-white/[0.04] rounded-2xl">
                          <h5 className="text-[10px] text-slate-200 uppercase font-black mb-3">Geographic Grant Comparison</h5>
                          <SpendingComparisonChart 
                            data={citywideTransparency.roadTransparencyList.map(r => {
                              const rObj = roads.find(ro => ro.id === r.roadId);
                              return {
                                label: rObj ? rObj.name : 'Unknown',
                                sanctioned: r.totalSanctioned,
                                spent: r.totalSpent,
                                extraInfo: rObj ? rObj.roadCode : undefined
                              };
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {contextView === 'contractors' && (
                  <div className="w-full h-full p-5 overflow-y-auto space-y-6">
                    {selectedContractorId ? (
                      (() => {
                        const c = contractors.find(co => co.id === selectedContractorId)!;
                        const activeWorks = projects.filter(p => p.contractorId === c.id);
                        const totalSanctioned = activeWorks.reduce((acc, p) => acc + p.budgetAllocated, 0);
                        const totalSpent = activeWorks.reduce((acc, p) => acc + p.budgetSpent, 0);

                        return (
                          <div className="space-y-5 animate-in fade-in duration-300">
                            <button
                              onClick={() => setSelectedContractorId(null)}
                              className="text-[9px] uppercase font-black text-cyan-455 hover:underline"
                            >
                              &larr; Contractor Registry
                            </button>

                            <div className="flex justify-between items-start border-b border-white/[0.05] pb-3">
                              <div>
                                <h3 className="text-sm font-extrabold text-slate-100">{c.name}</h3>
                                <p className="text-[10px] text-muted-foreground">Lic: {c.licenseNumber}</p>
                              </div>
                              {c.blacklisted ? (
                                <span className="text-[8px] bg-red-950/50 border border-red-900 text-red-500 font-extrabold uppercase px-1.5 py-0.5 rounded">Blacklisted</span>
                              ) : (
                                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                                  <Award className="w-3.5 h-3.5" />
                                  {c.rating.toFixed(2)}
                                </div>
                              )}
                            </div>

                            {c.blacklisted && c.blacklistedReason && (
                              <div className="p-3.5 rounded-xl border border-red-900/60 bg-red-950/20 text-[10.5px] text-red-400 leading-relaxed font-semibold">
                                <span className="flex items-center gap-1 text-[11px] mb-1 font-bold text-red-500 uppercase"><ShieldAlert className="w-4 h-4" /> Integrity Notice</span>
                                {c.blacklistedReason}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 text-center">
                              <div className="p-3 bg-slate-900/40 border border-white/[0.05] rounded-xl">
                                <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Sanctioned Value</span>
                                <span className="text-xs font-black text-emerald-450 mt-1 block">{formatINR(totalSanctioned)}</span>
                              </div>
                              <div className="p-3 bg-slate-900/40 border border-white/[0.05] rounded-xl">
                                <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Spent Outflow</span>
                                <span className="text-xs font-black text-slate-200 mt-1 block">{formatINR(totalSpent)}</span>
                              </div>
                            </div>

                            <div className="space-y-2.5">
                              <h4 className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 border-b border-white/[0.05] pb-1.5">Tender Bindings</h4>
                              {activeWorks.length > 0 ? (
                                <div className="space-y-2">
                                  {activeWorks.map(w => {
                                    const rd = roads.find(r => r.id === w.roadId);
                                    return (
                                      <div key={w.id} className="p-3 bg-slate-900/30 rounded-xl border border-white/[0.04] text-[10px] flex justify-between items-center">
                                        <div>
                                          <p className="font-bold text-slate-200">{w.title}</p>
                                          <p className="text-muted-foreground mt-0.5">Road: {rd ? rd.name : 'Unknown'}</p>
                                        </div>
                                        <span className="capitalize text-[9px] font-black text-cyan-400 bg-cyan-950/30 border border-cyan-900 px-1.5 py-0.2 rounded">{w.status}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-[10px] text-muted-foreground text-center py-4">No active bindings.</p>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="border-b border-white/[0.05] pb-2">
                          <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                            <HardHat className="w-4 h-4 text-cyan-400" /> Contractor Registry
                          </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5">
                          {contractors.map(c => (
                            <div 
                              key={c.id} 
                              onClick={() => setSelectedContractorId(c.id)}
                              className="p-4 bg-slate-900/40 border border-white/[0.04] hover:border-cyan-500/40 rounded-2xl cursor-pointer transition-all hover:bg-slate-900/60"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="text-xs font-extrabold text-slate-200 leading-snug">{c.name}</h4>
                                {c.blacklisted ? (
                                  <span className="text-[8px] bg-red-955/60 border border-red-900/60 text-red-500 px-1.5 rounded uppercase font-black font-mono">Blocked</span>
                                ) : (
                                  <span className="text-[9.5px] font-bold text-amber-500">★ {c.rating.toFixed(1)}</span>
                                )}
                              </div>
                              <p className="text-[9.5px] text-muted-foreground font-semibold">Tenders: {c.projectsCompleted} | Delayed: {c.projectsDelayed}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {contextView === 'complaints' && (
                  <div className="w-full h-full p-5 overflow-y-auto space-y-6">
                    {selectedComplaintId ? (
                      (() => {
                        const complaint = complaintsList.find(c => c.id === selectedComplaintId);
                        return (
                          <div className="space-y-4 animate-in fade-in duration-300">
                            <button
                              onClick={() => setSelectedComplaintId(null)}
                              className="text-[9px] uppercase font-black text-cyan-455 hover:underline"
                            >
                              &larr; Complaints List
                            </button>
                            {complaint ? (
                              <ComplaintTimeline complaint={complaint} />
                            ) : (
                              <p className="text-[10px] text-muted-foreground text-center">No record found.</p>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="border-b border-white/[0.05] pb-2">
                          <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-cyan-400" /> Recent Citizen Grievances
                          </h3>
                        </div>

                        <div className="space-y-3">
                          {complaintsList.slice(0, 6).map(c => {
                            const rd = c.roadId ? roads.find(r => r.id === c.roadId) : null;
                            return (
                              <div 
                                key={c.id} 
                                onClick={() => setSelectedComplaintId(c.id)}
                                className="p-3.5 bg-slate-900/40 border border-white/[0.04] rounded-2xl cursor-pointer hover:border-cyan-500/40 transition-all"
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="text-[8.5px] uppercase font-bold text-slate-400">{c.category.replace('_', ' ')}</span>
                                  <span className="text-[8px] uppercase font-black text-cyan-400 bg-cyan-950/20 px-1 border border-cyan-900 rounded">{c.status}</span>
                                </div>
                                <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{c.title}</h4>
                                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3 h-3 text-cyan-500" /> {rd ? rd.name : 'Unknown Segment'}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>

      {/* Mobile Drawer Zone using BottomSheet */}
      {isMobile && contextView && (
        <BottomSheet
          isOpen={!!contextView}
          onClose={handleCloseContext}
          title={
            contextView === 'map' ? 'Geospatial Road Map' :
            contextView === 'twin' ? 'Digital Twin command' :
            contextView === 'budgets' ? 'Transparency Budgets' :
            contextView === 'contractors' ? 'Contractor rating scorecard' :
            'Defect Lifecycle timeline'
          }
          snapPoints={[35, 75, 95]}
          defaultSnapPoint={75}
        >
          <div className="w-full h-[60vh] min-h-0 overflow-y-auto">
            {contextView === 'map' && (
              <div className="w-full h-full relative min-h-[300px]">
                <MapWrapper />
                {selectedRoadId && (
                  <div className="absolute inset-x-4 bottom-4 max-h-[50%] bg-slate-950/95 border border-white/[0.08] rounded-2xl overflow-y-auto p-4 z-10 shadow-2xl">
                    <RoadDetailsPanel />
                  </div>
                )}
              </div>
            )}

            {contextView === 'twin' && (
              <div className="w-full h-full bg-slate-950/90 relative min-h-[300px]">
                <DigitalTwinView />
              </div>
            )}

            {contextView === 'budgets' && (
              <div className="space-y-5">
                {selectedRoadId ? (
                  (() => {
                    const road = roads.find(r => r.id === selectedRoadId)!;
                    const roadProjects = projects.filter(p => p.roadId === road.id);
                    const scoreData = selectedRoadTransparency!;
                    
                    return (
                      <div className="space-y-4">
                        <button 
                          onClick={() => setSelectedRoadId(null)}
                          className="text-[9px] uppercase font-black text-cyan-455 hover:underline block"
                        >
                          &larr; Back to City Summary
                        </button>
                        <h3 className="text-sm font-black text-slate-100 uppercase">{road.name}</h3>
                        <TransparencyScoreCard score={scoreData.transparencyScore} deductions={scoreData.scoreDeductions} />
                        <div className="bg-slate-900/35 p-3.5 border border-white/[0.04] rounded-2xl">
                          <h5 className="text-[10px] text-slate-200 font-black mb-2">Yearly Spending</h5>
                          <SpendingComparisonChart 
                            height={120}
                            data={scoreData.yearlyAllocations.map(y => ({
                              label: `${y.year}`,
                              sanctioned: y.sanctioned,
                              spent: y.spent
                            }))}
                          />
                        </div>
                        <RepairFrequencyHeatmap projects={roadProjects} anomalies={scoreData.anomalies} />
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass-panel p-3 rounded-xl border border-white/[0.05]">
                        <span className="text-[8px] text-muted-foreground block uppercase font-bold">Sanctioned</span>
                        <span className="text-xs font-black text-emerald-450">{formatINR(citywideTransparency.totalSanctioned)}</span>
                      </div>
                      <div className="glass-panel p-3 rounded-xl border border-white/[0.05]">
                        <span className="text-[8px] text-muted-foreground block uppercase font-bold">Expended</span>
                        <span className="text-xs font-black text-slate-200">{formatINR(citywideTransparency.totalSpent)}</span>
                      </div>
                    </div>
                    <div className="bg-slate-900/35 p-3.5 border border-white/[0.04] rounded-2xl">
                      <SpendingComparisonChart 
                        data={citywideTransparency.roadTransparencyList.map(r => {
                          const rObj = roads.find(ro => ro.id === r.roadId);
                          return {
                            label: rObj ? rObj.name : 'Unknown',
                            sanctioned: r.totalSanctioned,
                            spent: r.totalSpent
                          };
                        })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {contextView === 'contractors' && (
              <div className="space-y-4">
                {selectedContractorId ? (
                  (() => {
                    const coSelected = contractors.find(co => co.id === selectedContractorId)!;
                    const activeWorks = projects.filter(p => p.contractorId === coSelected.id);
                    return (
                      <div className="space-y-4">
                        <button
                          onClick={() => setSelectedContractorId(null)}
                          className="text-[9px] uppercase font-black text-cyan-455 hover:underline"
                        >
                          &larr; Contractor List
                        </button>
                        <h4 className="text-xs font-black text-slate-200">{coSelected.name}</h4>
                        {coSelected.blacklisted && (
                          <div className="p-3 rounded-lg border border-red-900/50 bg-red-950/20 text-[10px] text-red-400">
                            <strong>Integrity Warning:</strong> {coSelected.blacklistedReason}
                          </div>
                        )}
                        <div className="space-y-2">
                          {activeWorks.map(w => (
                            <div key={w.id} className="p-2.5 bg-slate-900/30 rounded-xl border border-white/[0.04] text-[10px]">
                              <p className="font-bold text-slate-200">{w.title}</p>
                              <p className="text-muted-foreground mt-0.5">Status: {w.status}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {contractors.map(co => (
                      <div key={co.id} onClick={() => setSelectedContractorId(co.id)} className="p-3 bg-slate-900/30 border border-white/[0.04] rounded-xl">
                        <h4 className="text-xs font-bold text-slate-200">{co.name}</h4>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {contextView === 'complaints' && (
              <div className="space-y-4">
                {selectedComplaintId ? (
                  (() => {
                    const complaint = complaintsList.find(c => c.id === selectedComplaintId);
                    return (
                      <div className="space-y-2">
                        <button onClick={() => setSelectedComplaintId(null)} className="text-[9px] uppercase font-black text-cyan-455 hover:underline block">&larr; List</button>
                        {complaint && <ComplaintTimeline complaint={complaint} />}
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-2">
                    {complaintsList.slice(0, 5).map(c => (
                      <div key={c.id} onClick={() => setSelectedComplaintId(c.id)} className="p-3 bg-slate-900/30 border border-white/[0.04] rounded-xl text-[11px] font-bold text-slate-250">
                        {c.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </BottomSheet>
      )}

      {/* Voice Assistant Overlay */}
      <AnimatePresence>
        {isVoiceMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#050507]/98 backdrop-blur-2xl flex flex-col z-50 justify-between p-6 animate-in fade-in duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between w-full border-b border-white/[0.04] pb-4">
              <span className="text-[10px] font-black text-cyan-400 tracking-wider">VOICE ASSISTANT MODE</span>
              <button
                onClick={() => setIsVoiceMode(false)}
                className="p-1.5 rounded-lg border border-white/[0.06] hover:bg-white/[0.02] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Orb Pulsing */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <button 
                onClick={toggleListening}
                className={`w-32 h-32 rounded-full border flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative focus:outline-none ${
                  isListening
                    ? 'border-cyan-400/40 bg-cyan-400/[0.02] shadow-[0_0_40px_rgba(34,211,238,0.12)]'
                    : isSpeaking
                    ? 'border-indigo-400/40 bg-indigo-400/[0.02] shadow-[0_0_40px_rgba(99,102,241,0.12)]'
                    : 'border-white/[0.06] bg-white/[0.01]'
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Mic className="w-6 h-6 animate-pulse" />
                </div>
              </button>

              <div className="text-center space-y-1 max-w-[260px]">
                <div className="mono-label text-[8px] tracking-[0.16em] text-cyan-500/60 uppercase">
                  {isListening ? 'Listening...' : 'Orb Standby'}
                </div>
                <p className="text-[10.5px] font-mono text-slate-300">
                  {currentTranscription}
                </p>
              </div>
            </div>

            {/* suggestions */}
            <div className="space-y-2 shrink-0 select-none max-w-sm mx-auto">
              <div className="mono-label text-[7px] text-[#55555f] tracking-wider text-center">
                TAP SUGGESTION OR SPEECH TRIGGER
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LOCALIZED_QUERIES['en-IN'].slice(0, 4).map((query, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentTranscription(query);
                      handleSubmit(query);
                    }}
                    className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-cyan-950/20 hover:border-cyan-500/30 text-left text-[9.5px] font-semibold text-slate-350 hover:text-cyan-400 transition-all cursor-pointer leading-snug active:scale-95"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
