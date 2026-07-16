import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { springs } from '../shared/animations';
import {
  MessageSquare,
  Send,
  X,
  RefreshCw,
  Sparkles,
  Maximize2,
  Minimize2,
  Navigation,
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  Plus,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Globe,
  ChevronDown,
  WifiOff,
  Wifi,
  CloudUpload,
  CheckCircle2,
  Wrench
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import CitationRenderer, { Citation } from './CitationRenderer';
import RoutedToCard from './RoutedToCard';
import EscalationChainCard from './EscalationChainCard';
import type { RoutingDetail, EscalationChain } from '@/types';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { detectRegionSwitch, detectRegionFromText, detectRegionFromGps } from '@/services/regionDetectionService';
import { isComparisonQuery, getCrossRegionComparison, generateComparisonResponse } from '@/services/regionComparisonService';
import { setActiveRegion } from '@/services/regionAwareFormat';
import OnboardingTour, { useOnboarding } from './OnboardingTour';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  routingDetails?: RoutingDetail;
  suggestedActions?: { type: string; target_id: number; label: string }[];
  evidence?: { title: string; items: string[] }[];
  escalationChain?: EscalationChain;
}

interface ChatPanelProps {
  onSelectContractor?: (id: number) => void;
}

// Localized Example Queries in 3 languages
const LOCALIZED_QUERIES = {
  'en-IN': [
    "Who repaired this road?",
    "Why is S.V. Road damaged again?",
    "How much money was spent here?",
    "Where do I report this issue?"
  ],
  'hi-IN': [
    "इस सड़क की मरम्मत किसने की?",
    "यह सड़क दोबारा क्यों खराब हुई?",
    "यहाँ कितना पैसा खर्च हुआ?",
    "मैं इस समस्या की रिपोर्ट कहाँ करूँ?"
  ],
  'mr-IN': [
    "या रस्त्याची दुरुस्ती कोणी केली?",
    "हा रस्ता पुन्हा का खराब झाला?",
    "येथे किती पैसे खर्च झाले?",
    "मी या समस्येची तक्रार कुठे करू?"
  ]
};

// Web Speech API interfaces
const SpeechRecognition = typeof window !== 'undefined' && 
  ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

// Animated SVG Waveform visualizer
function WaveformVisualizer({ 
  isListening, 
  isSpeaking, 
  isLoading, 
  volume 
}: { 
  isListening: boolean; 
  isSpeaking: boolean; 
  isLoading: boolean; 
  volume: number; 
}) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let animId: number;
    const tick = () => {
      setPhase(p => (p + 0.15) % (Math.PI * 2));
      animId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(animId);
  }, []);

  const generateWavePath = (offset: number, scale: number, count: number) => {
    const points = [];
    const width = 180;
    const height = 60;
    const center = height / 2;
    
    // Wave amplitude based on assistant state
    let amp = 3; 
    if (isListening) {
      amp = 4 + volume * 28; 
    } else if (isSpeaking) {
      amp = 14 + Math.sin(phase * 1.5) * 4; 
    } else if (isLoading) {
      amp = 6 + Math.cos(phase * 2) * 2.5; 
    }

    for (let i = 0; i <= width; i += 4) {
      const x = i;
      const angle = (i / width) * Math.PI * count + phase + offset;
      const y = center + Math.sin(angle) * amp * scale;
      points.push(`${x},${y}`);
    }
    return `M ${points.join(' L ')}`;
  };

  const path1 = generateWavePath(0, 1.0, 3.5);
  const path2 = generateWavePath(Math.PI * 0.4, 0.7, 4.2);
  const path3 = generateWavePath(Math.PI * 0.8, 0.4, 2.8);

  let waveColor = 'stroke-cyan-500';
  if (isListening) waveColor = 'stroke-cyan-400';
  else if (isSpeaking) waveColor = 'stroke-indigo-400';
  else if (isLoading) waveColor = 'stroke-amber-400';

  return (
    <div className="w-48 h-20 flex items-center justify-center relative">
      <svg width="100%" height="100%" viewBox="0 0 180 60" className="w-full h-full">
        <defs>
          <filter id="wave-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <path d={path1} fill="none" className={`${waveColor} opacity-90 transition-colors duration-300`} strokeWidth={2} filter="url(#wave-glow)" strokeLinecap="round" strokeLinejoin="round" />
        <path d={path2} fill="none" className={`${waveColor} opacity-50 transition-colors duration-300`} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <path d={path3} fill="none" className={`${waveColor} opacity-25 transition-colors duration-300`} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function ChatPanel({ onSelectContractor }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);
  // Voice Assistant States
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  useFocusTrap(sheetRef, isOpen && mounted && !isVoiceMode, () => setIsOpen(false));

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I am **ROADWATCH AI**, your civic transparency assistant. Ask me questions about road relaying projects, contractor scores, budgets, or report routing boundaries.\n\n*Try asking: 'Why is S.V. Road damaged again?' or 'Is Omega Infrastructure blacklisted?'*"
    }
  ]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([
    "Why is S.V. Road damaged again?",
    "Who is the contractor for SV Road?",
    "Is Omega Infrastructure blacklisted?"
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [expandedEvidenceKey, setExpandedEvidenceKey] = useState<string | null>(null);
  
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState('en-IN');
  const [currentTranscription, setCurrentTranscription] = useState('Tap Mic to speak to AI');
  const [audioVolume, setAudioVolume] = useState(0);

  // TTS (Text-to-Speech) state
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('rw_tts') === 'true';
  });
  const [isSpeakingTTS, setIsSpeakingTTS] = useState(false);

  // Screen reader announcement state
  const [announcement, setAnnouncement] = useState('');

  // Onboarding tour
  const { showTour, setShowTour, isFirstVisit } = useOnboarding();

  // Announce new assistant messages (skip empty/typing indicators)
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content && lastMsg.content.trim()) {
      const clean = lastMsg.content
        .replace(/\*\*/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/`/g, '')
        .replace(/#{1,6}\s/g, '')
        .trim();
      setAnnouncement(clean);
    }
  }, [messages]);

  // Clear announcement after 5 seconds
  useEffect(() => {
    if (!announcement) return;
    const timer = setTimeout(() => setAnnouncement(''), 5000);
    return () => clearTimeout(timer);
  }, [announcement]);

  // References to handle resources
  const isVoiceModeRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const sessionIdRef = useRef('');

  // Web Audio analyzer refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    sessionIdRef.current = 'sess_' + Math.random().toString(36).substring(2, 11);
  }, []);

  const {
    setSelectedRoadId,
    setSelectedComplaintId,
    setActiveView,
    setIsReporting,
    isOnline: storeOnline,
    setIsOnline: setStoreOnline,
    syncQueueCount,
    isSyncing,
    processSyncQueue,
    offlineQueue,
    regionCode,
    setRegionCode,
  } = useStore();

  // Simulate offline toggle state (overrides real network state for demo)
  const [simulateOffline, setSimulateOffline] = useState(false);
  const effectiveOnline = simulateOffline ? false : storeOnline;

  // Sync simulateOffline toggle to Zustand store so queueComplaint routes offline
  // Also send system message to chat guiding demo users
  useEffect(() => {
    if (simulateOffline) {
      setStoreOnline(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '🔧 **Demo Offline Mode Active.** Queued reports wait in IndexedDB. Toggle wrench ⚙️ button to restore connection and see auto-sync progress. Try filing a complaint!'
      }]);
      const id = setInterval(() => setStoreOnline(false), 500);
      return () => {
        clearInterval(id);
        setStoreOnline(typeof window !== 'undefined' ? window.navigator.onLine : true);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '✅ **Connection Restored.** Auto-sync progress shown above. Check queue for results.'
        }]);
      };
    } else {
      setStoreOnline(typeof window !== 'undefined' ? window.navigator.onLine : true);
    }
  }, [simulateOffline, setStoreOnline]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Keyboard dismiss gesture — swipe down on chat scroll area blurs active input
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;

    let startY = 0;
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - startY;
      if (dy > 60) (document.activeElement as HTMLElement | null)?.blur();
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Sync state to Ref
  useEffect(() => {
    isVoiceModeRef.current = isVoiceMode;
    if (!isVoiceMode) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    } else {
      setCurrentTranscription('Ready. Tap Orb to speak.');
    }
  }, [isVoiceMode]);

  // Setup Speech Recognition when language selection changes
  useEffect(() => {
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = speechLanguage;

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

      rec.onerror = (e: any) => {
        console.warn('STT Error:', e.error);
        setIsListening(false);
        if (e.error === 'not-allowed') {
          setCurrentTranscription('Microphone access denied.');
        } else {
          setCurrentTranscription('Speech timed out. Try again.');
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [speechLanguage]);

  // Speak assistant text out loud
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    // Clean up markdown text for synthesis
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/-\s/g, '')
      .replace(/\*\s/g, '')
      .replace(/`[^`]+`/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .slice(0, 260);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = speechLanguage;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsSpeakingTTS(true);
      setCurrentTranscription('AI is speaking...');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsSpeakingTTS(false);
      setCurrentTranscription('Standby. Tap Orb to speak.');
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsSpeakingTTS(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Web Audio microphone capture analyser
  const startAudioAnalyzer = async () => {
    if (typeof window === 'undefined') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      streamSourceRef.current = source;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const update = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          setAudioVolume(sum / dataArray.length / 255);
        }
        animationFrameRef.current = requestAnimationFrame(update);
      };
      update();
    } catch (err) {
      console.warn('Microphone analyzer disabled:', err);
    }
  };

  const stopAudioAnalyzer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamSourceRef.current) {
      streamSourceRef.current.disconnect();
      streamSourceRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioVolume(0);
  };

  useEffect(() => {
    if (!isListening) {
      stopAudioAnalyzer();
    }
    return () => stopAudioAnalyzer();
  }, [isListening]);

  // Toggle listening trigger
  const toggleListening = () => {
    if (!recognitionRef.current) {
      setCurrentTranscription('Web speech is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      
      try {
        recognitionRef.current.start();
        startAudioAnalyzer();
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  };

  // Keyboard accessibility spacebar mic trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVoiceMode) return;
      const tag = document.activeElement?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        toggleListening();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVoiceMode, isListening, speechLanguage]);

  // Backend checking (respect simulated offline)
  useEffect(() => {
    const checkBackend = async () => {
      if (simulateOffline) {
        setIsBackendOnline(false);
        return;
      }
      try {
        const res = await fetch("http://localhost:8000/");
        if (res.ok) {
          setIsBackendOnline(true);
        } else {
          setIsBackendOnline(false);
        }
      } catch (err) {
        setIsBackendOnline(false);
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, [simulateOffline]);

  // Action links click
  const handleActionClick = (action: { type: string; target_id: number; label: string }) => {
    if (action.type === 'navigate_to_road' || action.type === 'navigate_to_road_detail') {
      setSelectedRoadId(action.target_id);
      setActiveView('roads');
      setIsOpen(false);
    } else if (action.type === 'navigate_to_contractor') {
      setSelectedRoadId(null);
      onSelectContractor?.(action.target_id);
      setActiveView('contractors');
      setIsOpen(false);
    } else if (action.type === 'report_complaint_on_road') {
      setSelectedRoadId(action.target_id);
      setIsReporting(true);
      setIsOpen(false);
    } else if (action.type === 'navigate_to_regions' || action.type === 'navigate_to_region') {
      setActiveView('regions' as any);
      setIsOpen(false);
    }
  };

  const submitBackendError = async () => {
    const text = "⚠️ **Backend server unavailable.**\n\nYour query could not be processed because the backend server is not responding. Please ensure the backend is running.";
    const words = text.split(" ");
    let currentContent = "";
    for (let i = 0; i < words.length; i++) {
      currentContent += (i === 0 ? "" : " ") + words[i];
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          last.content = currentContent;
        }
        return updated;
      });
      await new Promise(resolve => setTimeout(resolve, 15));
    }
  };


  // Streaming helper shared by all response paths
  const streamResponse = async (
    text: string,
    citations: Citation[],
    suggestedActions: { type: string; target_id: number; label: string }[],
    evidence: { title: string; items: string[] }[],
    nextSuggestedPrompts: string[],
    routingDetails?: RoutingDetail,
    escalationChain?: EscalationChain
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
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    // Append citation & actions metadata once streaming finishes
    setMessages(prev => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last && last.role === 'assistant') {
        last.citations = citations;
        last.suggestedActions = suggestedActions;
        last.evidence = evidence;
        if (routingDetails) {
          last.routingDetails = routingDetails;
        }
        if (escalationChain) {
          last.escalationChain = escalationChain;
        }
      }
      return updated;
    });

    if (nextSuggestedPrompts.length > 0) {
      setSuggestedPrompts(nextSuggestedPrompts);
    }

    // Speak response if voice overlay is open or TTS is enabled
    if (text && (isVoiceModeRef.current || ttsEnabled)) {
      speakText(text);
    }
  };

  // Submit query
  const handleSubmit = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    // Haptic feedback on send
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }

    setInput('');
    setIsLoading(true);
    
    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    // Direct fallback if backend is offline
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

      if (!response.body) {
        throw new Error("No response body received");
      }

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
                    if (data.routing_details) {
                      last.routingDetails = data.routing_details;
                    }
                    if (data.escalation_chain) {
                      last.escalationChain = data.escalation_chain;
                    }
                  }
                  return updated;
                });
                if (data.suggested_prompts && data.suggested_prompts.length > 0) {
                  setSuggestedPrompts(data.suggested_prompts);
                }
              }
            } catch (err) {
              console.error("Parse stream error:", err);
            }
          }
        }
      }

      // If Voice overlay is open, speak the response
      if (isVoiceModeRef.current && fullResponse) {
        speakText(fullResponse);
      }
    } catch (error) {
      console.warn("Stream failed:", error);
      await submitBackendError();
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (content: string) => {
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
          <li key={idx} className="ml-4 list-disc text-slate-350 pl-1 text-[11px] leading-relaxed my-0.5">
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
        <p key={idx} className="text-[11px] leading-relaxed my-1 font-medium text-slate-350">
          {paragraphElement}
        </p>
      );
    });
  };

  return (
    <>
      {/* Screen-reader live region for assistant messages */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-[1006]">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative group p-4 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20 focus:outline-none flex items-center justify-center cursor-pointer border border-cyan-400/40"
          aria-label="Toggle AI Chat Assistant"
          aria-expanded={isOpen}
          aria-controls="chat-dialog"
        >
          <span className="absolute inset-0 rounded-full bg-cyan-400/30 animate-ping opacity-75 scale-105" />
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="w-6 h-6 text-slate-950" />
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
              >
                <MessageSquare className="w-5 h-5 text-slate-950" />
                <span className="text-[10px] uppercase font-black tracking-widest max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap pr-0 group-hover:pr-1">
                  Ask AI
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Chat Window Panel */}
      <AnimatePresence>
        {isOpen && mounted ? (
          <motion.div
            key="chat-drawer"
            ref={sheetRef}
            id="chat-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="AI Chat Assistant"
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.85, y: 50, x: 20 }}
            animate={
              isMobile 
                ? { y: typeof window !== 'undefined' ? window.innerHeight - (window.innerHeight * 70) / 100 : 0 }
                : { opacity: 1, scale: 1, y: 0, x: 0 }
            }
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.85, y: 50, x: 20 }}
            transition={isMobile ? springs.sheet : { type: 'spring', damping: 25, stiffness: 260 }}
            drag={isMobile ? 'y' : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={isMobile ? { top: typeof window !== 'undefined' ? window.innerHeight - (window.innerHeight * 95) / 100 : 0, bottom: typeof window !== 'undefined' ? window.innerHeight - 50 : 0 } : undefined}
            dragElastic={0.2}
            dragMomentum={false}
            onDragEnd={isMobile ? (_, info) => {
              if (typeof window === 'undefined') return;
              const y = info.point.y;
              const height = window.innerHeight;
              
              const snapPoints = [35, 70, 95];
              const currentPositions = snapPoints.map(pct => height - (height * pct) / 100);
              const closest = currentPositions.reduce((prev, curr) => 
                Math.abs(curr - y) < Math.abs(prev - y) ? curr : prev
              );
              
              const lowestPosition = currentPositions[0];
              if (y > lowestPosition + 100 || info.velocity.y > 600) {
                setIsOpen(false);
              } else if (sheetRef.current) {
                sheetRef.current.style.transform = `translate3d(0, ${closest}px, 0)`;
              }
            } : undefined}
            className={`fixed z-50 bg-slate-950/90 backdrop-blur-xl border border-border/80 border-t-2 border-t-cyan-500/35 shadow-2xl flex flex-col select-none transition-all duration-200
              ${
                isMobile 
                  ? 'inset-x-0 top-0 h-screen rounded-t-3xl' 
                  : `bottom-24 right-6 rounded-2xl overflow-hidden ${
                      isMaximized 
                        ? 'w-[500px] h-[700px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-120px)]' 
                        : 'w-96 h-[550px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-120px)]'
                    }`
              }`}
          >
            {/* Grab Handle Header (Touch gesture indicator for mobile) */}
            {isMobile && (
              <div 
                onPointerDown={(e) => dragControls.start(e)}
                className="w-full h-8 flex items-center justify-center cursor-ns-resize active:scale-95 transition-all touch-none shrink-0 bg-slate-900/40"
              >
                <div className="w-12 h-1 bg-slate-650 rounded-full opacity-80" />
              </div>
            )}

            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-slate-900/60 via-cyan-950/20 to-indigo-950/20 border-b border-border/60 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-black uppercase text-slate-100 tracking-wider">
                        ROADWATCH AI
                      </h3>
                      <span className={`w-1.5 h-1.5 rounded-full ${effectiveOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      {simulateOffline && (
                        <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-full tracking-wider">
                          DEMO MODE
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-muted-foreground font-semibold">
                      {effectiveOnline ? 'Accredited Records Engine' : 'Offline Queue Active — Local Responses'}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                  {/* Help / Onboarding Tour trigger */}
                  <button
                    onClick={() => setShowTour(true)}
                    className="p-1.5 rounded-lg border border-border/60 hover:border-cyan-500/30 hover:bg-cyan-950/20 text-muted-foreground hover:text-cyan-400 transition-all shrink-0 cursor-pointer flex items-center justify-center"
                    title="Show onboarding tour"
                    aria-label="Show onboarding tour"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>

                  {/* Simulate Offline toggle button (demo) */}
                  <button
                    onClick={() => setSimulateOffline(!simulateOffline)}
                    className={`p-1.5 rounded-lg border transition-all shrink-0 cursor-pointer flex items-center justify-center ${
                      simulateOffline
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                        : 'border-border/60 hover:border-amber-500/30 hover:bg-amber-500/5 text-muted-foreground hover:text-amber-400'
                    }`}
                    title={simulateOffline ? 'Restore Online Connection' : 'Simulate Offline Mode (Demo)'}
                    aria-label={simulateOffline ? 'Restore online connection' : 'Simulate offline mode'}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                  </button>

                  {/* TTS (Text-to-Speech) toggle */}
                  <button
                    onClick={() => {
                      const next = !ttsEnabled;
                      setTtsEnabled(next);
                      localStorage.setItem('rw_tts', next ? 'true' : 'false');
                      if (!next) {
                        window.speechSynthesis?.cancel();
                        setIsSpeakingTTS(false);
                      }
                    }}
                    className={`p-1.5 rounded-lg border transition-all shrink-0 cursor-pointer flex items-center justify-center mr-1 ${
                      ttsEnabled
                        ? 'border-cyan-500/50 bg-cyan-950/30 text-cyan-400'
                        : 'border-border/60 hover:border-cyan-500/30 hover:bg-cyan-950/20 text-muted-foreground hover:text-cyan-400'
                    }`}
                    title={ttsEnabled ? 'Disable text-to-speech' : 'Enable text-to-speech'}
                    aria-label={ttsEnabled ? 'Disable text-to-speech' : 'Enable text-to-speech'}
                  >
                    {isSpeakingTTS ? (
                      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
                        <Volume2 className="w-3.5 h-3.5 relative" />
                      </span>
                    ) : (
                      <Volume2 className={`w-3.5 h-3.5 ${ttsEnabled ? 'text-cyan-400' : ''}`} />
                    )}
                  </button>

                  {/* Voice mode trigger */}
                  <button
                    onClick={() => setIsVoiceMode(true)}
                    className="p-1.5 rounded-lg border border-border/60 hover:border-cyan-500/40 hover:bg-cyan-950/40 text-muted-foreground hover:text-cyan-455 transition-all shrink-0 cursor-pointer flex items-center justify-center mr-1"
                    title="Launch Voice Mode"
                    aria-label="Launch Voice Mode"
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="p-1.5 rounded-lg border border-border/60 hover:bg-slate-900 text-muted-foreground hover:text-foreground transition-all shrink-0 cursor-pointer hidden sm:block"
                    aria-label={isMaximized ? 'Minimize chat' : 'Maximize chat'}
                  >
                    {isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg border border-border/60 hover:bg-slate-900 text-muted-foreground hover:text-foreground transition-all shrink-0 cursor-pointer"
                    aria-label="Close chat"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Offline banner inside chat header */}
              <AnimatePresence>
                {(!effectiveOnline || syncQueueCount > 0 || isSyncing) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden mt-2"
                  >
                    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border ${
                      !effectiveOnline
                        ? 'bg-red-500/10 border-red-500/20 text-red-300'
                        : isSyncing
                        ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                    }`}>
                      {!effectiveOnline ? (
                        <>
                          <WifiOff className="w-3 h-3 shrink-0 text-red-400" />
                          <span className="flex-1">Offline — responses are local. Reports queued.</span>
                        </>
                      ) : isSyncing ? (
                        <>
                          <RefreshCw className="w-3 h-3 shrink-0 text-cyan-400 animate-spin" />
                          <span className="flex-1">Syncing {syncQueueCount} queued reports...</span>
                        </>
                      ) : (
                        <>
                          <CloudUpload className="w-3 h-3 shrink-0 text-amber-400" />
                          <span className="flex-1">{syncQueueCount} report{syncQueueCount > 1 ? 's' : ''} pending sync</span>
                          <button
                            onClick={processSyncQueue}
                            className="text-[9px] font-black px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md transition-all cursor-pointer uppercase tracking-wider shrink-0"
                          >
                            Sync Now
                          </button>
                        </>
                      )}

                      {/* Sync progress when actively syncing */}
                      {isSyncing && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] text-cyan-400/80">
                            {offlineQueue.filter(i => i.status === 'syncing').length}/{syncQueueCount}
                          </span>
                          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                              initial={{ width: '0%' }}
                              animate={{
                                width: `${syncQueueCount > 0 ? ((syncQueueCount - offlineQueue.filter(i => i.status === 'pending').length) / syncQueueCount) * 100 : 0}%`
                              }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Messages Box */}
            <div
              role="log"
              aria-live="polite"
              aria-label="Chat messages"
              aria-relevant="additions"
              ref={messagesScrollRef}
              className={`flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin ${isMobile ? 'pb-44' : ''}`}>
              {messages.map((msg, index) => {
                const isAI = msg.role === 'assistant';
                return (
                  <div 
                    key={index}
                    className={`flex items-start gap-2.5 ${isAI ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAI && (
                      <div className="p-1 rounded-lg bg-cyan-950/60 border border-cyan-850 text-cyan-400 shrink-0 mt-0.5">
                        <Sparkles className="w-3 h-3" />
                      </div>
                    )}
                    <div className={`flex flex-col max-w-[82%] ${isAI ? 'items-start' : 'items-end'}`}>
                      <div className={`p-3 rounded-2xl text-[11px] font-medium leading-relaxed border ${
                        isAI 
                          ? 'bg-slate-900/60 border-border/50 text-slate-100 rounded-tl-sm' 
                          : 'bg-gradient-to-tr from-cyan-600/90 to-indigo-600/90 border-cyan-500/20 text-slate-950 font-semibold rounded-tr-sm'
                      }`}>
                        {isAI ? (
                          msg.content === '' ? (
                            <div className="flex items-center gap-1 py-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-75" />
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-150" />
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-225" />
                            </div>
                          ) : (
                            renderMessageContent(msg.content)
                          )
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>

                      {isAI && msg.evidence && msg.evidence.length > 0 && (
                        <div className="w-full mt-2.5 space-y-1.5">
                          <span className="text-[9px] text-cyan-500/70 uppercase font-black tracking-widest block pl-1">
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
                                  aria-controls={`evidence-${index}-${evIdx}`}
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
                                      id={`evidence-${index}-${evIdx}`}
                                      role="region"
                                      aria-label={ev.title}
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
                                            className="text-[9px] text-slate-350 font-mono leading-relaxed flex items-start gap-1.5"
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
                        <div className="w-full">
                          <CitationRenderer
                            citations={msg.citations}
                            onSelectRoad={(id) => {
                              setSelectedRoadId(id);
                              setActiveView('roads');
                              setIsOpen(false);
                            }}
                            onSelectContractor={(id) => {
                              setSelectedRoadId(null);
                              onSelectContractor?.(id);
                              setActiveView('contractors');
                              setIsOpen(false);
                            }}
                          />
                        </div>
                      )}

                      {isAI && msg.routingDetails && (
                        <RoutedToCard routing={msg.routingDetails} />
                      )}

                      {isAI && msg.escalationChain && (
                        <EscalationChainCard chain={msg.escalationChain} />
                      )}

                      {isAI && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {msg.suggestedActions.map((act, actIdx) => (
                            <button
                              key={actIdx}
                              onClick={() => handleActionClick(act)}
                              className="text-[9px] font-bold px-2.5 py-1.5 bg-cyan-950/50 border border-cyan-850 hover:border-cyan-500 text-cyan-400 rounded-xl transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-sm"
                            >
                              {act.type === 'report_complaint_on_road' && <Plus className="w-3 h-3" />}
                              {act.type === 'navigate_to_road' && <Navigation className="w-3 h-3" />}
                              {act.type === 'navigate_to_contractor' && <FileSpreadsheet className="w-3 h-3" />}
                              {act.label}
                              <ArrowRight className="w-2.5 h-2.5" />
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

            {/* Bottom Actions & Input */}
            {!isMobile && (
              <div className="bg-slate-900/35 border-t border-border/60 py-3 space-y-2">
              {suggestedPrompts.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-none select-none">
                  {suggestedPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSubmit(prompt)}
                      className="shrink-0 text-[9.5px] font-black px-3 py-2 bg-slate-900/80 border border-border/80 hover:border-cyan-500/50 hover:bg-cyan-950/30 text-slate-350 hover:text-cyan-400 rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-sm"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              <div className="px-4">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit(input);
                  }}
                  className="flex gap-2 relative bg-slate-900 border border-border/80 focus-within:border-cyan-500 rounded-xl px-2 py-1.5 transition-all items-center"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about repairs, budgets, audits..."
                    aria-label="Type your message"
                    className="flex-1 bg-transparent border-0 focus:outline-none text-[11px] text-slate-200 placeholder-muted-foreground pl-1.5"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    aria-label="Send message"
                    className={`p-1.5 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 text-slate-950 font-bold hover:opacity-90 active:scale-95 transition-all shrink-0 cursor-pointer ${
                      (!input.trim() || isLoading) ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <Send className="w-3.5 h-3.5 text-slate-950" />
                  </button>
                </form>
              </div>
            </div>
            )}

            {/* ══════════════════════════════════════════════════════════
               CHATGPT VOICE ASSISTANT OVERLAY
               ══════════════════════════════════════════════════════════ */}
            {isVoiceMode && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Voice mode"
                className="absolute inset-0 bg-[#050507]/98 backdrop-blur-2xl flex flex-col z-50 animate-in fade-in zoom-in-95 duration-200 justify-between p-6"
              >
                
                {/* Voice Header */}
                <div className="flex items-center justify-between w-full border-b border-white/[0.04] pb-4">
                  {/* Language selection */}
                  <div className="flex items-center gap-1.5">
                    {[
                      { code: 'en-IN', label: 'EN' },
                      { code: 'hi-IN', label: 'HI' },
                      { code: 'mr-IN', label: 'MR' }
                    ].map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => setSpeechLanguage(lang.code)}
                        className={`text-[8.5px] font-black px-2.5 py-1 rounded border transition-all ${
                          speechLanguage === lang.code
                            ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                            : 'border-white/[0.06] text-[#55555f] hover:border-white/[0.12] hover:text-slate-400'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setIsVoiceMode(false)}
                    className="p-1.5 rounded-lg border border-white/[0.06] hover:bg-white/[0.02] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    aria-label="Close voice mode"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Pulse presence orb & Waveform visualizer */}
                <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-6">
                  <button 
                    onClick={toggleListening}
                    className={`w-32 h-32 rounded-full border flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative focus:outline-none ${
                      isListening
                        ? 'border-cyan-400/40 bg-cyan-400/[0.02] shadow-[0_0_40px_rgba(34,211,238,0.12)]'
                        : isSpeaking
                        ? 'border-indigo-400/40 bg-indigo-400/[0.02] shadow-[0_0_40px_rgba(99,102,241,0.12)]'
                        : isLoading
                        ? 'border-amber-400/40 bg-amber-400/[0.02] shadow-[0_0_40px_rgba(245,158,11,0.12)] animate-pulse'
                        : 'border-white/[0.06] bg-white/[0.01] hover:border-cyan-400/20 hover:bg-cyan-500/[0.01]'
                    }`}
                    aria-label={isListening ? 'Stop listening' : 'Start listening'}
                  >
                    {(isListening || isSpeaking || isLoading) && (
                      <div className="absolute inset-[-8px] rounded-full border border-current opacity-10 animate-ping pointer-events-none" />
                    )}

                    <WaveformVisualizer 
                      isListening={isListening} 
                      isSpeaking={isSpeaking} 
                      isLoading={isLoading} 
                      volume={audioVolume} 
                    />
                    
                    <div className="absolute bottom-3 text-center">
                      {isListening ? (
                        <Mic className="w-4 h-4 text-cyan-400 mx-auto animate-pulse" />
                      ) : isSpeaking ? (
                        <Volume2 className="w-4 h-4 text-indigo-400 mx-auto" />
                      ) : (
                        <MicOff className="w-4 h-4 text-[#55555f] mx-auto" />
                      )}
                    </div>
                  </button>

                  {/* Telemetry translation subtitles */}
                  <div className="text-center space-y-1.5 max-w-[260px] min-h-[44px]">
                    <div className="mono-label text-[8px] tracking-[0.16em] text-cyan-500/60 uppercase">
                      {isListening 
                        ? 'Listening...' 
                        : isSpeaking 
                        ? 'Voice Playback active' 
                        : isLoading 
                        ? 'AI is compiling reply...' 
                        : 'Scanner Standby'}
                    </div>
                    <p className="text-[10px] font-mono text-slate-350 leading-relaxed line-clamp-2">
                      {currentTranscription}
                    </p>
                  </div>
                </div>

                {/* Localized suggestions triggers */}
                <div className="space-y-2 shrink-0">
                  <div className="mono-label text-[7px] text-[#55555f] tracking-wider text-center select-none">
                    CLICK SUGGESTION // OR PRESS SPACEBAR TO SPEAK
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                    {LOCALIZED_QUERIES[speechLanguage as keyof typeof LOCALIZED_QUERIES].map((query, idx) => (
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
              </div>
            )}

          </motion.div>
        ) : null}

        {isOpen && mounted && isMobile && !isVoiceMode ? (
          <motion.div
            key="chat-input-bar"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 260 }}
            className="fixed bottom-0 inset-x-0 z-[1013] bg-slate-950/95 backdrop-blur-xl border-t border-border/60 py-4 pb-[env(safe-area-inset-bottom,24px)] space-y-2"
          >
            {suggestedPrompts.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-none select-none">
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                      handleSubmit(prompt);
                    }}
                    className="shrink-0 text-[9.5px] font-black px-3 py-2 bg-slate-900/80 border border-border/80 hover:border-cyan-500/50 hover:bg-cyan-950/30 text-slate-350 hover:text-cyan-400 rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <div className="px-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                  handleSubmit(input);
                }}
                className="flex gap-2 relative bg-slate-900 border border-border/80 focus-within:border-cyan-500 rounded-xl px-2 py-1.5 transition-all items-center"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about repairs, budgets, audits..."
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
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Onboarding Tour */}
      {showTour && (
        <OnboardingTour onClose={() => setShowTour(false)} />
      )}
    </>
  );
}
