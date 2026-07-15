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
  ChevronRight,
  Camera,
  CheckCircle,
  Image,
  Edit3,
  Crosshair,
  Loader
} from 'lucide-react';
import { routeComplaint } from '@/services/routingEngine';
import { useStore } from '@/store/useStore';
import { detectRegionSwitch, detectRegionFromText } from '@/services/regionDetectionService';
import { isComparisonQuery, getCrossRegionComparison, generateComparisonResponse } from '@/services/regionComparisonService';
import { setActiveRegion } from '@/services/regionAwareFormat';
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
import { formatCurrency } from '@/services/regionAwareFormat';

// Subcomponents
import MapWrapper from '@/components/map/MapWrapper';
import RoadDetailsPanel from '@/components/dashboard/RoadDetailsPanel';
import DigitalTwinView from '@/components/twin/DigitalTwinView';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import ComplaintTimeline from '@/components/complaints/ComplaintTimeline';
import PlaybackDashboard from '@/components/playback/PlaybackDashboard';
import SensorDashboard from '@/components/sensors/SensorDashboard';
import RegionsOverview from '@/components/regions/RegionsOverview';
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
  isWizard?: boolean;
  wizardStep?: number;
  routingDetails?: any;
  escalationChain?: any;
  auditReport?: {
    is_grounded: boolean;
    confidence: number;
    guardian_model: string;
    generator_model: string;
    latency_ms: number;
    tokens_parsed: number;
    audit_log: string[];
  };
}

interface WizardData {
  description: string;
  photoDataUrl: string | null;
  photoFile: File | null;
  location: { lat: number; lon: number } | null;
}

const WIZARD_TOTAL_STEPS = 4;

export default function ChatOrchestrator() {
  const { 
    selectedRoadId, 
    setSelectedRoadId,
    selectedComplaintId,
    setSelectedComplaintId,
    dispatchChatAction,
    complaintsList,
    isOnline,
    setIsReporting,
    addComplaint,
    regionCode,
    setRegionCode
  } = useStore();

  // Local navigation context state
  const [contextView, setContextView] = useState<'map' | 'twin' | 'contractors' | 'budgets' | 'complaints' | 'playback' | 'sensors' | 'regions' | null>(null);
  const [selectedContractorId, setSelectedContractorId] = useState<number | null>(null);
  const [twinPopupRoadId, setTwinPopupRoadId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Chat window state
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Welcome to **ROADWATCH Conversational Shell**, integrated with the **IIT Madras CoERS 5E Framework (Engineering, Enforcement, Education, Emergency, Empathy)** and the **Sanjaya-RATH Safety Governance Core**. I can assist you with budget compliance audits, contractor scorecards, or launching 3D spatial simulations to support Data-Driven Hyperlocal Interventions (DDHI).\n\n*Try tapping a query below, like: 'Why is S.V. Road damaged again?'*"
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
  const [isProbesOpen, setIsProbesOpen] = useState(true);

  const handleProbeClick = async (type: 'lie' | 'noise' | 'truth') => {
    if (isLoading) return;
    let query = "";
    if (type === 'lie') {
      query = "Report: Omega Infrastructure completed repaving S.V. Road yesterday for ₹4.8 Cr.";
    } else if (type === 'noise') {
      query = "Can you write a poem about the beach in Mumbai?";
    } else {
      query = "What is the status of S.V. Road?";
    }
    await handleSubmit(query);
  };

  // Complaint Wizard State
  const [wizardActive, setWizardActive] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState<WizardData>({
    description: '',
    photoDataUrl: null,
    photoFile: null,
    location: null,
  });
  const [wizardSubmitting, setWizardSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Assistant States
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('Tap Mic to speak to AI');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const sessionIdRef = useRef('session-' + Math.random().toString(36).substring(2, 11));

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



  const formatShortINR = (value: number) => formatCurrency(value, true);

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

  const streamResponse = async (
    text: string,
    citations: any[],
    suggestedActions: { type: string; target_id: number; label: string }[],
    evidence: { title: string; items: string[] }[],
    nextSuggestedPrompts: string[],
    routingDetails?: any,
    escalationChain?: any,
    auditReport?: any
  ) => {
    const words = text.split(" ");
    let currentContent = "";
    for (let i = 0; i < words.length; i++) {
      currentContent += (i === 0 ? "" : " ") + words[i];
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant') {
          last.content = currentContent;
        }
        return updated;
      });
      await new Promise(resolve => setTimeout(resolve, 15));
    }

    setMessages(prev => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last && last.role === 'assistant') {
        last.content = text;
        last.citations = citations;
        last.suggestedActions = suggestedActions;
        last.evidence = evidence;
        last.routingDetails = routingDetails;
        last.escalationChain = escalationChain;
        last.auditReport = auditReport;
      }
      return updated;
    });

    if (nextSuggestedPrompts && nextSuggestedPrompts.length > 0) {
      setSuggestedPrompts(nextSuggestedPrompts);
    }
  };

  const submitBackendError = async () => {
    const text = "⚠️ **Backend server unavailable.**\n\nYour query could not be processed because the backend server is not responding. Please ensure the backend is running (`docker compose up -d && cd backend && uvicorn app.main:app --reload`) and try again.\n\nIf you are running in demo mode, please use the **Demo Mode** button on the landing page instead.";
    const words = text.split(" ");
    let currentContent = "";
    for (let i = 0; i < words.length; i++) {
      currentContent += (i === 0 ? "" : " ") + words[i];
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant') {
          last.content = currentContent;
        }
        return updated;
      });
      await new Promise(resolve => setTimeout(resolve, 15));
    }
  };

  const handleSubmit = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setInput('');
    setIsLoading(true);

    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    // Detect region switch from text and update global store
    const regionSwitch = detectRegionSwitch(textToSend);
    if (regionSwitch) {
      setRegionCode(regionSwitch.regionCode);
    }

    // Direct error if backend is offline
    if (!isBackendOnline) {
      await submitBackendError();
      setIsLoading(false);
      return;
    }

    let userLat: number | undefined;
    let userLon: number | undefined;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
      });
      userLat = position.coords.latitude;
      userLon = position.coords.longitude;
    } catch (e) {}

    try {
      const response = await fetch("http://localhost:8000/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          session_id: sessionIdRef.current,
          latitude: userLat,
          longitude: userLon
        })
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

                const match = fullResponse.match(/\{"view":\s*"[^"]*".*?\}/);
                let contentToDisplay = fullResponse;

                if (match) {
                  try {
                    const parsed = JSON.parse(match[0]);
                    if (parsed.view) {
                      dispatchChatAction({ type: 'NAVIGATE', payload: parsed });
                      if (parsed.view === 'twin' && parsed.asPopup) {
                        setSelectedRoadId(parsed.roadId || 3);
                        setTwinPopupRoadId(parsed.roadId || 3);
                      } else {
                        setContextView(parsed.view === 'roads' ? 'map' : parsed.view);
                      }
                      if (parsed.contractorId) setSelectedContractorId(parsed.contractorId);
                    }
                  } catch (e) {}
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
                    last.auditReport = data.audit_report;
                  }
                  return updated;
                });
                if (data.suggested_prompts) {
                  setSuggestedPrompts(data.suggested_prompts);
                }
              }
            } catch (err) {}
          }
        }
      }
    } catch (error) {
      console.warn("Chat stream error:", error);
      await submitBackendError();
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

  const startWizard = () => {
    if (wizardActive) return;
    setWizardActive(true);
    setWizardStep(0);
    setWizardData({ description: '', photoDataUrl: null, photoFile: null, location: null });
    setMessages(prev => [...prev, { role: 'user', content: '📋 Report an Issue' }]);
    setMessages(prev => [...prev, { role: 'assistant', content: '', isWizard: true, wizardStep: 0 }]);
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => setWizardData(prev => ({ ...prev, location: { lat: pos.coords.latitude, lon: pos.coords.longitude } })),
        () => {},
        { timeout: 5000 }
      );
    } catch (e) {}
  };

  const wizardNextStep = () => {
    const nextStep = wizardStep + 1;
    if (nextStep >= WIZARD_TOTAL_STEPS) return;
    setWizardStep(nextStep);
    setMessages(prev => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].isWizard) {
          updated[i] = { ...updated[i], content: '', wizardStep: nextStep };
          break;
        }
      }
      return updated;
    });
  };

  const wizardPrevStep = () => {
    const prevStep = wizardStep - 1;
    if (prevStep < 0) return;
    setWizardStep(prevStep);
    setMessages(prev => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].isWizard) {
          updated[i] = { ...updated[i], content: '', wizardStep: prevStep };
          break;
        }
      }
      return updated;
    });
  };

  const wizardCancel = () => {
    setWizardActive(false);
    setWizardStep(0);
    setMessages(prev => [...prev, { role: 'assistant', content: 'Complaint reporting cancelled. You can start again anytime by tapping **Report an Issue**.' }]);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setWizardData(prev => ({ ...prev, photoDataUrl: ev.target?.result as string, photoFile: file }));
    };
    reader.readAsDataURL(file);
  };

  const wizardSubmit = async () => {
    if (wizardSubmitting) return;
    setWizardSubmitting(true);
    try {
      const lat = wizardData.location?.lat ?? 19.076;
      const lon = wizardData.location?.lon ?? 72.8777;
      const payload = {
        title: wizardData.description.slice(0, 80),
        description: wizardData.description,
        category: 'pothole',
        latitude: lat,
        longitude: lon,
        photo: wizardData.photoDataUrl,
      };
      
      let success = false;
      try {
        const res = await fetch("http://localhost:8000/api/v1/complaints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        success = res.ok;
      } catch (e) {
        success = false;
      }

      // Resolve authority locally using the offline georouting engine
      let authorityId = 1; // default MCGM K-West
      try {
        const routeResult = routeComplaint(lon, lat, null);
        authorityId = routeResult.authorityId;
      } catch (err) {
        console.warn("Offline authority resolution failed:", err);
      }

      // Add to local state store so it immediately updates the UI dashboard & complaints list
      const newId = Math.floor(100000 + Math.random() * 900000);
      addComplaint({
        id: newId,
        title: payload.title || "Road Pothole/Defect",
        description: payload.description,
        category: 'pothole',
        status: success ? 'routed' : 'pending',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat]
        },
        assignedAuthorityId: authorityId,
        createdAt: new Date().toISOString(),
        imagePreview: payload.photo || '',
      });

      setWizardActive(false);
      setWizardStep(0);
      setWizardSubmitting(false);
      if (success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '✅ **Complaint Submitted Successfully!**\n\nYour road defect report has been logged in the system. You can track its status in the **Complaints** tab. Our team will review and route it to the responsible authority.',
          citations: [],
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '📤 **Queued Offline**\n\nYour complaint has been saved locally and will be submitted automatically when you\'re back online. No data lost.',
          citations: [],
        }]);
      }
    } catch (e) {
      setWizardSubmitting(false);
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
                  ROADWATCH (CoERS Sanjaya-RATH Core)
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isBackendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="text-[8.5px] text-muted-foreground font-bold tracking-wide uppercase">
                    {isBackendOnline ? 'IITM CoERS 5E Framework' : 'Offline Mode (CoERS Empathy Fallback)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Probes Console Toggle */}
              <button
                onClick={() => setIsProbesOpen(!isProbesOpen)}
                className={`p-2 rounded-xl border border-white/[0.06] hover:bg-indigo-950/40 hover:text-indigo-400 transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  isProbesOpen ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'text-slate-400'
                }`}
                title="Toggle Judges Probes Console"
                aria-label={isProbesOpen ? 'Close Probes Console' : 'Open Probes Console'}
              >
                <Activity className="w-4 h-4" />
              </button>

              {/* Voice mode toggle */}
              <button
                onClick={() => setIsVoiceMode(!isVoiceMode)}
                className={`p-2 rounded-xl border border-white/[0.06] hover:bg-cyan-950/40 hover:text-cyan-400 transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  isVoiceMode ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'text-slate-400'
                }`}
                title="Toggle Voice overlay"
                aria-label={isVoiceMode ? 'Close voice mode' : 'Open voice mode'}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Screen reader live region for message announcements */}
          <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
            {isLoading ? 'AI is thinking...' : ''}
            {messages.length > 0 && !isLoading && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content
              ? `New message: ${messages[messages.length - 1].content.replace(/\*\*/g, '').slice(0, 120)}`
              : ''}
          </div>

          {/* Judges Probes Panel (Falsification Engine) */}
          <AnimatePresence>
            {isProbesOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-indigo-500/10 bg-indigo-950/10 select-none shrink-0"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
                      Falsification Probes Engine (Judges Console)
                    </span>
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wide">
                      Verifiable AI Spine (Pattern B)
                    </span>
                  </div>
                  <p className="text-[9.5px] text-slate-400 leading-normal">
                    Click a probe button below to feed dynamic input variations to the AI and test its safety guardrails, truth fidelity, and digital twin reactivity live.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleProbeClick('lie')}
                      disabled={isLoading}
                      className="px-2.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:border-red-500 hover:bg-red-500/20 text-red-400 text-[9px] font-black text-center transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      🤥 Push with Lie
                    </button>
                    <button
                      onClick={() => handleProbeClick('noise')}
                      disabled={isLoading}
                      className="px-2.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500 hover:bg-amber-500/20 text-amber-400 text-[9px] font-black text-center transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      🔊 Push with Noise
                    </button>
                    <button
                      onClick={() => handleProbeClick('truth')}
                      disabled={isLoading}
                      className="px-2.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500 hover:bg-emerald-500/20 text-emerald-400 text-[9px] font-black text-center transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      📊 Push Ground Truth
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-white/[0.05]">
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
                      {isAI && msg.isWizard ? (
                        <WizardStepRenderer
                          step={wizardStep}
                          data={wizardData}
                          setData={setWizardData}
                          onNext={wizardNextStep}
                          onPrev={wizardPrevStep}
                          onSubmit={wizardSubmit}
                          onCancel={wizardCancel}
                          onPhotoCapture={handlePhotoCapture}
                          fileInputRef={fileInputRef}
                          submitting={wizardSubmitting}
                        />
                      ) : isAI ? (
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
                                aria-expanded={isExpanded}
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

                    {isAI && msg.auditReport && (
                      <div className={`w-full mt-2.5 border rounded-2xl p-3 bg-slate-950/40 backdrop-blur-md ${
                        msg.auditReport.is_grounded ? 'border-emerald-500/10' : 'border-red-500/20'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className={`flex items-center gap-1.5 font-black text-[9px] tracking-wider uppercase ${
                            msg.auditReport.is_grounded ? 'text-emerald-400' : 'text-red-400 font-extrabold'
                          }`}>
                            {msg.auditReport.is_grounded ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                            ) : (
                              <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-bounce" />
                            )}
                            <span>{msg.auditReport.is_grounded ? 'Verified Grounded (Sanjaya-RATH Audit)' : 'UNGROUNDED CONTRADICTION DETECTED'}</span>
                          </div>
                          <span className="text-[7.5px] font-mono text-slate-500">
                            Latency: {msg.auditReport.latency_ms}ms | Parsed: {msg.auditReport.tokens_parsed} t
                          </span>
                        </div>
                        <div className="text-[8.5px] font-mono text-slate-400 space-y-1 mt-2 border-t border-white/[0.05] pt-2">
                          <div className="flex justify-between text-slate-500 text-[8px] uppercase font-black">
                            <span>Gen: <span className="text-slate-300 font-bold">{msg.auditReport.generator_model}</span></span>
                            <span>Audit: <span className="text-slate-300 font-bold">{msg.auditReport.guardian_model}</span></span>
                          </div>
                          <div className="mt-1.5 space-y-0.5 max-h-[80px] overflow-y-auto pr-1">
                            {msg.auditReport.audit_log.map((log, lIdx) => (
                              <div key={lIdx} className="flex items-start gap-1">
                                <span className={msg.auditReport?.is_grounded ? "text-emerald-500 font-bold" : "text-red-500 font-bold"}>
                                  {msg.auditReport?.is_grounded ? "✓" : "✗"}
                                </span>
                                <span className="leading-normal text-slate-300">{log}</span>
                              </div>
                            ))}
                          </div>
                        </div>
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
                <div key={index} className={`flex flex-col space-y-1 max-w-[85%] ${isAssistant ? 'mr-auto items-start' : 'ml-auto items-end'}`}>
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-extrabold">
                    {isAssistant ? 'Civic Assistant' : 'You'}
                  </span>
                  <div className={`px-4 py-3 rounded-2xl leading-relaxed text-[11.5px] border ${isAssistant ? 'bg-slate-900/40 border-white/[0.03] text-slate-200' : 'bg-cyan-950/20 border-cyan-800/30 text-cyan-200'}`}>
                    {renderMessageMarkdown(msg.content)}
                    {isAssistant && msg.citations && msg.citations.length > 0 && <CitationRenderer citations={msg.citations} />}
                    {isAssistant && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-white/[0.04]">
                        {msg.suggestedActions.map((act, actIdx) => (
                          <button
                            key={actIdx}
                            onClick={() => handleActionClick(act)}
                            className="text-[9px] font-black uppercase text-cyan-400 hover:text-cyan-200 border border-cyan-800/40 hover:border-cyan-600/60 bg-cyan-950/30 hover:bg-cyan-950/50 px-2 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                          >
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

          <div className="bg-slate-900/10 border-t border-white/[0.05] py-3.5 space-y-3 shrink-0 select-none">
            <div className="px-5">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(input);
                  setInput('');
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={wizardActive ? "Reporting flow active..." : "Ask about road budgets, contractors, or switch to UK..."}
                  disabled={wizardActive}
                  className="flex-1 bg-slate-950 border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-cyan-500/60"
                  aria-label="Civic Dialogue Prompt Input"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim() || wizardActive}
                  className="p-2.5 rounded-xl bg-cyan-500 text-slate-950 disabled:opacity-30 transition-all hover:bg-cyan-400 cursor-pointer flex items-center justify-center shrink-0 active:scale-90"
                  aria-label="Submit dialogue message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {contextView && !isMobile && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '48%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 180 }}
              className="h-full bg-slate-950 border-l border-white/[0.04] overflow-hidden flex flex-col z-10 shrink-0 select-text"
            >
              <header className="px-5 py-3 border-b border-[#18181f] bg-[#0c0c11]/85 backdrop-blur-md flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <h2 className="text-xs uppercase font-extrabold tracking-wider text-slate-100">
                    {contextView === 'map' && 'Geospatial Road Map'}
                    {contextView === 'twin' && '3D Digital Twin Simulation'}
                    {contextView === 'budgets' && 'Civic Budget Integrity Audit'}
                    {contextView === 'contractors' && 'Contractor Compliance Ledger'}
                    {contextView === 'complaints' && 'Defect Lifecycle Timeline'}
                    {contextView === 'playback' && 'Historical Repay Playback'}
                    {contextView === 'sensors' && 'Smart Infrastructure Sensors'}
                    {contextView === 'regions' && 'Global Regions Hub'}
                  </h2>
                </div>
                <button 
                  onClick={handleCloseContext}
                  className="p-1.5 rounded-xl border border-white/[0.08] hover:bg-slate-900/60 text-slate-450 hover:text-slate-200 transition-all cursor-pointer"
                  aria-label="Close context pane"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </header>

              <div className="flex-1 min-h-0 relative select-text">
                {contextView === 'map' && (
                  <div className="w-full h-full relative">
                    <ErrorBoundary>
                      <MapWrapper />
                    </ErrorBoundary>
                  </div>
                )}
                {contextView === 'twin' && (
                  <div className="w-full h-full bg-slate-950/90 relative">
                    <ErrorBoundary>
                      <DigitalTwinView />
                    </ErrorBoundary>
                  </div>
                )}
                {contextView === 'budgets' && (
                  <div className="w-full h-full p-5 overflow-y-auto space-y-5 bg-[#07070a]/30 scrollbar-thin">
                    {selectedRoadId ? (
                      (() => {
                        const road = roads.find(r => r.id === selectedRoadId)!;
                        const roadProjects = projects.filter(p => p.roadId === road.id);
                        const scoreData = calculateRoadTransparency(road.id);

                        return (
                          <div className="space-y-6 animate-in fade-in duration-300">
                            <button
                              onClick={() => setSelectedRoadId(null)}
                              className="text-[9px] uppercase font-black text-cyan-455 hover:underline"
                            >
                              &larr; City Spending Analysis
                            </button>
                            <div className="flex justify-between items-start border-b border-white/[0.05] pb-3">
                              <div>
                                <h3 className="text-sm font-black text-slate-100">{road.name}</h3>
                                <p className="text-[10px] text-muted-foreground">{road.roadCode} &bull; {road.lengthKm} KM &bull; MCGM Ward {road.ward}</p>
                              </div>
                            </div>
                            <TransparencyScoreCard score={scoreData.score} metrics={scoreData.metrics} />
                            <div className="bg-slate-900/30 border border-white/[0.04] p-4 rounded-2xl space-y-4">
                              <h5 className="text-[10px] text-slate-300 uppercase font-black">Segment Budget Health</h5>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-widest">Sanctioned Tenders</span>
                                  <span className="text-xs font-black text-emerald-450 mt-1 block">{formatCurrency(scoreData.totalSanctioned)}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-widest">Expended Funds</span>
                                  <span className="text-xs font-black text-slate-200 mt-1 block">{formatCurrency(scoreData.totalSpent)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="glass-panel p-4 rounded-2xl border border-white/[0.05]">
                            <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-widest">Sanctioned</span>
                            <span className="text-sm font-black text-emerald-455 mt-1 block">{formatCurrency(citywideTransparency.totalSanctioned)}</span>
                          </div>
                          <div className="glass-panel p-4 rounded-2xl border border-white/[0.05]">
                            <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-widest">Expended</span>
                            <span className="text-sm font-black text-slate-200 mt-1 block">{formatCurrency(citywideTransparency.totalSpent)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {contextView === 'contractors' && (
                  <div className="w-full h-full p-5 overflow-y-auto">
                    {selectedContractorId ? (
                      (() => {
                        const c = contractors.find(co => co.id === selectedContractorId)!;
                        return (
                          <div className="space-y-5">
                            <button onClick={() => setSelectedContractorId(null)} className="text-[9px] uppercase font-black text-cyan-455 hover:underline">
                              &larr; Contractor Registry
                            </button>
                            <div className="flex justify-between items-start border-b border-white/[0.05] pb-3">
                              <div>
                                <h3 className="text-sm font-extrabold text-slate-100">{c.name}</h3>
                                <p className="text-[10px] text-muted-foreground">Lic: {c.licenseNumber}</p>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                                <Award className="w-3.5 h-3.5" />
                                {c.rating.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="grid grid-cols-2 gap-3.5">
                        {contractors.map(c => (
                          <div key={c.id} onClick={() => setSelectedContractorId(c.id)} className="p-4 bg-slate-900/40 border border-white/[0.04] rounded-2xl cursor-pointer">
                            <h4 className="text-xs font-extrabold text-slate-200">{c.name}</h4>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 3D Digital Twin Modal Pop-up */}
      <AnimatePresence>
        {twinPopupRoadId !== null && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setTwinPopupRoadId(null)} />
            <motion.div className="relative w-full max-w-6xl h-[80vh] bg-[#07070a]/98 border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl flex flex-col z-10">
              <header className="px-5 py-3 border-b border-white/[0.04] bg-black/40 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">3D Live Model</h3>
                <button onClick={() => setTwinPopupRoadId(null)} className="p-1.5 rounded-xl border border-white/[0.08] hover:bg-slate-900/60 text-slate-400"><X className="w-4 h-4" /></button>
              </header>
              <div className="flex-1 min-h-0 relative w-full bg-slate-950/90"><ErrorBoundary><DigitalTwinView /></ErrorBoundary></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" aria-hidden="true" />
    </div>
  );
}

function WizardStepRenderer({
  data,
  setData,
  onSubmit,
  onCancel,
  onPhotoCapture,
  fileInputRef,
  submitting,
}: {
  data: WizardData;
  setData: (updater: (prev: WizardData) => WizardData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onPhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  submitting: boolean;
}) {
  const canProceed = data.photoDataUrl !== null;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500" style={{ width: `100%` }} />
        </div>
        <span className="text-[9px] font-bold text-cyan-400 shrink-0">Upload Photo</span>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Upload a Photo of the defect</p>
        <p className="text-[10px] text-slate-400">Take or upload a picture of the defect. Our AI routes it instantly.</p>
        <div className="flex flex-col items-center gap-3 p-4 border-2 border-dashed border-white/[0.08] rounded-xl bg-slate-950/30">
          {data.photoDataUrl ? (
            <div className="relative w-full">
              <img src={data.photoDataUrl} alt="Captured defect" className="w-full h-32 object-cover rounded-lg border border-white/[0.06]" />
              <button onClick={() => setData(prev => ({ ...prev, photoDataUrl: null, photoFile: null }))} className="absolute top-1 right-1 p-1 rounded-lg bg-slate-900/80 border border-white/[0.1] text-slate-400 hover:text-red-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Camera className="w-10 h-10 text-slate-600" />
          )}
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-700/30 text-cyan-400 text-[10px] font-bold hover:bg-cyan-500/20 transition-all">
            {data.photoDataUrl ? 'Retake Photo' : 'Choose Photo'}
          </button>
          <p className="text-[8px] text-slate-600">Photo upload is required to file a complaint</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <button onClick={onCancel} disabled={submitting} className="px-3 py-1.5 rounded-xl border border-white/[0.08] text-slate-500 hover:text-red-400 text-[9px] font-bold transition-all disabled:opacity-40">
          Cancel
        </button>
        <button onClick={onSubmit} disabled={submitting || !canProceed} className="px-4 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-[9px] font-black hover:bg-emerald-400 transition-all disabled:opacity-40 flex items-center gap-1">
          {submitting ? <><Loader className="w-3 h-3 animate-spin" /> Submitting...</> : <><CheckCircle className="w-3 h-3" /> Submit Report</>}
        </button>
      </div>
    </div>
  );
}
