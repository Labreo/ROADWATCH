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
import { streamConcentrateReply, isConcentrateConfigured } from '@/services/concentrateClient';
import { useStore } from '@/store/useStore';
import { detectRegionSwitch, detectRegionFromText } from '@/services/regionDetectionService';
import { isComparisonQuery, getCrossRegionComparison, generateComparisonResponse } from '@/services/regionComparisonService';
import { setActiveRegion } from '@/services/regionAwareFormat';
import { getRegionData, regionInfo } from '@/data/regionsMockData';
import { globalTemplates } from '@/data/globalTemplates';
import { 
  roads,
  contractors,
  projects,
  authorities,
  getAuthority,
  getContractor,
  complaints as mockComplaints
} from '@/data/mockData';
import { Road, Contractor, Project, Complaint, ComplaintCategory } from '@/types';
import { calculateRoadTransparency, getScoreGrade, getCitywideTransparencyData } from '@/services/transparencyEngine';
import { formatCurrency } from '@/services/regionAwareFormat';
import { demoSnippets, DemoMessage } from '@/data/demoScripts';

// ---------------------------------------------------------------------------
// Demo-mode local fallback: fuzzy keyword matcher against demoSnippets
// ---------------------------------------------------------------------------
function findBestDemoReply(query: string): DemoMessage | null {
  const q = query.toLowerCase();

  // ── Direct intent overrides ──────────────────────────────────────────
  // Bypass fuzzy scoring for high-confidence intent patterns so that
  // phrasing variations ("launch the digital twin", "show the twin",
  // "show the live condition") all reliably map to the right snippet.

  // Falsification probe MUST be checked first: the lie query contains words
  // ("₹4.8 Cr", "completed", "report") that would otherwise mis-route to the
  // budget or complaint scenarios. A claim about Omega + SV Road framed as a
  // question/assertion ("...right?", "completed", "yesterday", "for ₹4.8")
  // is the Granite Guardian falsification probe.
  if (
    /omega/i.test(q) &&
    /(completed|repair|repav|yesterday|4\.8|right\?|₹|cr\b|crore)/i.test(q)
  ) {
    const guardianSnippet = demoSnippets.find(s => s.id === 'scenario-e');
    const reply = guardianSnippet?.messages.find(m => m.role === 'assistant') ?? null;
    if (reply) return reply;
  }

  if (/twin|digital.twin|live.condition|3d.model|spatial.model|launch.*model|show.*twin/i.test(q)) {
    const twinSnippet = demoSnippets.find(s => s.id === 'scenario-d');
    const reply = twinSnippet?.messages.find(m => m.role === 'assistant') ?? null;
    if (reply) return reply;
  }
  if (/budget|spending|where.*money|money.*go|breakdown|tender.*cost/i.test(q)) {
    const budgetSnippet = demoSnippets.find(s => s.id === 'scenario-b');
    const reply = budgetSnippet?.messages.find(m => m.role === 'assistant') ?? null;
    if (reply) return reply;
  }
  if (/pothole|report|hazard|complaint|standing.water|caving/i.test(q)) {
    const complaintSnippet = demoSnippets.find(s => s.id === 'scenario-c');
    const reply = complaintSnippet?.messages.find(m => m.role === 'assistant') ?? null;
    if (reply) return reply;
  }

  // ── Fuzzy keyword overlap ────────────────────────────────────────────
  let bestScore = 0;
  let bestReply: DemoMessage | null = null;

  for (const snippet of demoSnippets) {
    for (let i = 0; i < snippet.messages.length - 1; i++) {
      const userMsg = snippet.messages[i];
      const assistantMsg = snippet.messages[i + 1];
      if (userMsg.role !== 'user' || assistantMsg.role !== 'assistant') continue;

      // Score by shared keyword overlap
      const keywords = userMsg.content.toLowerCase().split(/\W+/).filter(w => w.length > 3);
      const score = keywords.reduce((acc, kw) => acc + (q.includes(kw) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        bestReply = assistantMsg;
      }
    }
  }

  // Require at least 1 keyword match to avoid nonsense fallbacks
  return bestScore >= 1 ? bestReply : null;
}

// ---------------------------------------------------------------------------
// Cross-region road lookup for global budget queries (KA-4).
// Scans the non-India region datasets (GB/US/KE) for a road matching the
// query by name or road code, so "M25 smart motorway budget" resolves to the
// UK dataset with GBP formatting and the correct National Highways authority —
// without the user having to switch region first.
// ---------------------------------------------------------------------------
function findRegionRoadBudget(query: string): {
  regionCode: string;
  answer: string;
} | null {
  const q = query.toLowerCase();
  for (const regionCode of ['GB', 'US', 'KE']) {
    const data = getRegionData(regionCode);
    const template = globalTemplates[regionCode];
    for (const road of data.roads) {
      const nameHit = q.includes(road.name.toLowerCase());
      const codeHit = q.includes(road.roadCode.toLowerCase());
      if (!nameHit && !codeHit) continue;

      const project = data.projects.find(p => p.roadId === road.id);
      const authority = data.authorities.find(a => a.id === road.authorityId);
      if (!project || !authority) continue;

      const utilisation = Math.round((project.budgetSpent / project.budgetAllocated) * 100);
      const answer =
        `**${road.name} (${road.roadCode}) — ${project.title}**\n\n` +
        `Managing authority: **${authority.name}**.\n\n` +
        `- Sanctioned budget: **${template.formatCurrency(project.budgetAllocated)}**\n` +
        `- Expended to date: **${template.formatCurrency(project.budgetSpent)}** (${utilisation}% utilised)\n` +
        `- Status: **${project.status.replace(/_/g, ' ')}**\n\n` +
        `Figures are reported in ${template.currency} (${template.currencySymbol}) under the ${template.regionName} template. ` +
        `Open the Global Regions Hub on the right for the full ${template.regionName} road ledger.`;

      return { regionCode, answer };
    }
  }
  return null;
}

// Subcomponents
import MapWrapper from '@/components/map/MapWrapper';
import RoadDetailsPanel from '@/components/dashboard/RoadDetailsPanel';
import DigitalTwinView from '@/components/twin/DigitalTwinView';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import ComplaintTimeline from '@/components/complaints/ComplaintTimeline';
import SpendingComparisonChart from '@/components/transparency/SpendingComparisonChart';
import RepairFrequencyHeatmap from '@/components/transparency/RepairFrequencyHeatmap';
import BudgetTimeline from '@/components/transparency/BudgetTimeline';
import ContractorHistoryCard from '@/components/transparency/ContractorHistoryCard';
import TransparencyScoreCard from '@/components/transparency/TransparencyScoreCard';
import SankeyFlowVisualizer from '@/components/transparency/SankeyFlowVisualizer';
import RegionsOverview from '@/components/regions/RegionsOverview';
import SensorDashboard from '@/components/sensors/SensorDashboard';
import PlaybackDashboard from '@/components/playback/PlaybackDashboard';
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
  // AI vision draft (populated on step 0 -> 1 transition)
  analyzing: boolean;
  analyzed: boolean;
  title: string;
  category: string;
  severity: string;
  defectType: string;
  depthCm: number | null;
  widthM: number | null;
  recommendedAction: string;
}

// 0 = photo upload, 1 = AI analyze + editable draft review + confirm
const WIZARD_TOTAL_STEPS = 2;

// Severity options offered in the draft review card
const WIZARD_SEVERITY_OPTS = ['emergency', 'high', 'medium', 'low'] as const;
const WIZARD_CATEGORY_OPTS = ['pothole', 'waterlogging', 'paving_defect', 'missing_signage'] as const;

// Human-readable label for a defect/category code.
function defectTypeLabel(code: string): string {
  const map: Record<string, string> = {
    pothole: 'Pothole (Class 1 structural failure)',
    waterlogging: 'Waterlogging / drainage failure',
    paving_defect: 'Paving defect',
    missing_signage: 'Missing / damaged signage',
  };
  return map[code] ?? code;
}

// Simulated client-side vision classifier. Deterministic so the on-stage demo
// never depends on a live backend/Concentrate call. Matches the demo narration
// (Class 1 structural failure, standing water, P1). The ~2s delay gives the UI
// an "analyzing" beat that fills presentation time.
function analyzePhotoDraft(): Promise<Partial<WizardData>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        title: 'Pothole with standing water — S.V. Road',
        description:
          'Deep pothole with pooled water detected on the carriageway. Structural subsidence with standing water poses a hazard to two-wheelers and pedestrians.',
        category: 'pothole',
        defectType: 'pothole',
        severity: 'emergency',
        depthCm: 52,
        widthM: 1.3,
        recommendedAction: 'Immediate barricading + contractor mobilization within 4h; permanent repair within 48h.',
      });
    }, 2000);
  });
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
    setIsReporting,
    addComplaint,
    setRegionCode
  } = useStore();

  // Local navigation context state
  const [contextView, setContextView] = useState<'map' | 'twin' | 'contractors' | 'budgets' | 'complaints' | 'regions' | 'sensors' | 'playback' | null>(null);
  const [selectedContractorId, setSelectedContractorId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Sub-view within 'map' context: 'details' shows RoadDetailsPanel full-pane,
  // 'map' shows MapWrapper full-pane. Toggle with the map/back button.
  const [mapSubView, setMapSubView] = useState<'details' | 'map'>('details');

  // Reset to details panel whenever a new road is selected
  useEffect(() => {
    if (selectedRoadId) setMapSubView('details');
  }, [selectedRoadId]);

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
  const [isProbesOpen, setIsProbesOpen] = useState(false);

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
    analyzing: false,
    analyzed: false,
    title: '',
    category: 'pothole',
    severity: 'emergency',
    defectType: 'pothole',
    depthCm: null,
    widthM: null,
    recommendedAction: '',
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

  // Live LLM fallback: stream a grounded answer from Concentrate AI directly
  // from the browser when the backend is down and no canned demo reply matched.
  // Returns true if it produced an answer, false if it should fall through to
  // the static "backend unavailable" message.
  const streamLiveLLM = async (textToSend: string): Promise<boolean> => {
    if (!isConcentrateConfigured()) return false;
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      let acc = '';
      await streamConcentrateReply(textToSend, history, (delta) => {
        acc += delta;
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') last.content = acc;
          return updated;
        });
      });
      // Nothing came back — treat as failure so caller shows the error.
      return acc.trim().length > 0;
    } catch (e) {
      console.warn('Concentrate live fallback failed:', e);
      return false;
    }
  };

  const handleSubmit = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setInput('');
    setIsLoading(true);

    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    // ------------------------------------------------------------------
    // Navigation dispatcher — fires after any response to open the right panel
    // Works regardless of backend status (demo mode, timeout, or live stream).
    // ------------------------------------------------------------------
    const dispatchNavigationFromQuery = (q: string) => {
      // Falsification probe: an Omega claim framed as completed/paid/"right?"
      // opens the blacklist record, not the budget panel. Checked first so the
      // "₹4.8 Cr" in the lie doesn't mis-route to budgets.
      if (/omega/i.test(q) && /(completed|repair|repav|yesterday|4\.8|right\?|₹|cr\b|crore)/i.test(q)) {
        setSelectedRoadId(null);
        setSelectedContractorId(3);
        setContextView('contractors');
      } else if (/playback|historical|history.*(playback|simulation|timeline)|replay|time.?lapse|progression/i.test(q)) {
        // Historical playback dashboard (Flow D) — check before twin/sensor so
        // "historical" queries don't get swallowed by the telemetry regex.
        if (!selectedRoadId) setSelectedRoadId(3);
        setContextView('playback');
      } else if (/(sensor|iot|vibration|stress|drainage).*(monitor|dashboard|stream|log|telemetry|infrastructure)|(monitor|dashboard).*(sensor|iot)|smart infrastructure|sensor monitor/i.test(q)) {
        // Smart Infrastructure Sensor Monitor (Flow C) — must beat the twin
        // regex below, which also matches the bare word "sensor".
        if (!selectedRoadId) setSelectedRoadId(3);
        setContextView('sensors');
      } else if (/twin|digital twin|live condition|3d model|spatial model|telemetry|sensor/i.test(q)) {
        setContextView('twin');
        // Auto-select S.V. Road (id: 3) for the demo flow
        if (!selectedRoadId) setSelectedRoadId(3);
      } else if (/show.*map|view.*map|map.*road|geospatial|on the map/i.test(q) && selectedRoadId) {
        setContextView('map');
      } else if (/budget|spending|money|crore|₹|tender|sanction/i.test(q)) {
        // Match a named road so the panel opens the road-level breakdown
        // (with Sankey capital-flow) rather than the city audit summary.
        const namedRoad = roads.find(r =>
          q.toLowerCase().includes(r.name.toLowerCase()) ||
          q.toLowerCase().includes(r.roadCode.toLowerCase().replace(/-/g, ' ')) ||
          (/s\.?\s?v\.?\s?road/i.test(q) && r.id === 3)
        );
        if (namedRoad) setSelectedRoadId(namedRoad.id);
        setContextView('budgets');
      } else if (/contractor|omega|zenith|blacklist|scorecard/i.test(q)) {
        setContextView('contractors');
      }
    };

    // ------------------------------------------------------------------
    // GLOBAL APPLICABILITY (KA-4): explicit region switch.
    // "Switch to United Kingdom" flips the active region entirely on the
    // client — store region + currency/format template — with no code change,
    // then opens the Global Regions Hub on the right showing the live template.
    // ------------------------------------------------------------------
    const regionSwitch = detectRegionSwitch(textToSend);
    if (regionSwitch) {
      const code = regionSwitch.regionCode;
      const template = globalTemplates[code];
      const info = regionInfo[code as keyof typeof regionInfo];
      setRegionCode(code);
      setActiveRegion(code);
      const nh = template.tiers.national_highway;
      const confirmation =
        `${info?.flag ?? '🌍'} **Region switched to ${template.regionName}.**\n\n` +
        `The entire platform now runs on the ${template.regionName} template — no code changes, data only:\n\n` +
        `- Currency: **${template.currency} (${template.currencySymbol})**\n` +
        `- Road tiers: **${nh.classification}**, ${template.tiers.state_highway.classification}, ${template.tiers.municipal.classification}\n` +
        `- Lead authority: **${nh.agency}**\n\n` +
        `The Global Regions Hub on the right shows the active ${template.regionName} jurisdiction. ` +
        `Try asking about a local road — e.g. "${info?.roadNaming ?? ''}".`;
      await streamResponse(confirmation, [], [], [], []);
      setSelectedRoadId(null);
      setSelectedContractorId(null);
      setContextView('regions');
      setIsLoading(false);
      return;
    }

    // ------------------------------------------------------------------
    // GLOBAL APPLICABILITY (KA-4): cross-region road budget query.
    // "Show me the M25 smart motorway budget" resolves against the GB/US/KE
    // datasets and answers in the correct currency + authority, switching the
    // active region so the Regions Hub reflects it.
    // ------------------------------------------------------------------
    const regionBudget = findRegionRoadBudget(textToSend);
    if (regionBudget) {
      setRegionCode(regionBudget.regionCode);
      setActiveRegion(regionBudget.regionCode);
      await streamResponse(regionBudget.answer, [], [], [], []);
      setSelectedRoadId(null);
      setSelectedContractorId(null);
      setContextView('regions');
      setIsLoading(false);
      return;
    }

    // ------------------------------------------------------------------
    // MULTI-SOURCE PANELS (Flow C/D): sensor monitor + historical playback.
    // These render live dashboards in the context panel. Intercept here so the
    // reply + panel are identical whether the backend is up or down.
    // ------------------------------------------------------------------
    const q = textToSend.toLowerCase();
    const wantsPlayback = /playback|historical|replay|time.?lapse|progression/.test(q);
    const wantsSensors =
      /(sensor|iot|vibration|stress|drainage).*(monitor|dashboard|stream|log|telemetry|infrastructure)|(monitor|dashboard).*(sensor|iot)|smart infrastructure|sensor monitor/.test(q);
    if (wantsPlayback) {
      await streamResponse(
        `**Historical Playback loaded.** The panel on the right replays this segment's defect log — ` +
          `road-condition progression over time alongside contractor repair dispatches, so past municipal ` +
          `engineering quality can be audited step by step. Scrub the timeline to any date.`,
        [], [], [], []
      );
      dispatchNavigationFromQuery(textToSend);
      setIsLoading(false);
      return;
    }
    if (wantsSensors) {
      await streamResponse(
        `**Smart Infrastructure Sensor Monitor active.** The panel streams live IoT telemetry for this segment — ` +
          `real-time vibration, structural stress heatmaps, and local drainage sensor logs. ` +
          `Where sensors flag a defect, the map is regenerated to reflect the current road condition.`,
        [], [], [], []
      );
      dispatchNavigationFromQuery(textToSend);
      setIsLoading(false);
      return;
    }

    // ------------------------------------------------------------------
    // DEMO FALLBACK: If backend is offline, stream the best matching
    // canned response from demoScripts.ts (full evidence + citations).
    // ------------------------------------------------------------------
    if (!isBackendOnline) {
      const demoReply = findBestDemoReply(textToSend);
      if (demoReply) {
        await streamResponse(
          demoReply.content,
          (demoReply.citations as any) ?? [],
          demoReply.suggestedActions ?? [],
          demoReply.evidence ?? [],
          demoReply.suggestedPrompts ?? [],
          undefined,
          undefined,
          demoReply.auditReport
        );
      } else {
        // No canned match — try a live grounded LLM answer before giving up.
        const answered = await streamLiveLLM(textToSend);
        if (!answered) await submitBackendError();
      }
      // Always fire navigation — even if we showed an error, open the right panel
      dispatchNavigationFromQuery(textToSend);
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

    // Abort the stream if the backend hangs for more than 10 seconds
    const abortController = new AbortController();
    const streamTimeout = setTimeout(() => abortController.abort(), 10000);

    try {
      const response = await fetch("http://localhost:8000/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
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
                      setContextView(parsed.view === 'roads' ? 'map' : parsed.view);
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

      // If backend streamed but returned nothing useful, fall back to demo data
      if (!fullResponse.trim()) {
        const demoReply = findBestDemoReply(textToSend);
        if (demoReply) {
          await streamResponse(
            demoReply.content,
            (demoReply.citations as any) ?? [],
            demoReply.suggestedActions ?? [],
            demoReply.evidence ?? [],
            demoReply.suggestedPrompts ?? []
          );
          dispatchNavigationFromQuery(textToSend);
        } else {
          const answered = await streamLiveLLM(textToSend);
          if (!answered) await submitBackendError();
          dispatchNavigationFromQuery(textToSend);
        }
      } else {
        // Backend returned content — still check for twin/map triggers if
        // the backend didn't embed a {"view":...} navigation token
        dispatchNavigationFromQuery(textToSend);
      }
    } catch (error: any) {
      // On timeout/abort or network failure, try the demo data first
      const demoReply = findBestDemoReply(textToSend);
      if (demoReply) {
        await streamResponse(
          demoReply.content,
          (demoReply.citations as any) ?? [],
          demoReply.suggestedActions ?? [],
          demoReply.evidence ?? [],
          demoReply.suggestedPrompts ?? [],
          undefined,
          undefined,
          demoReply.auditReport
        );
      } else {
        console.warn("Chat stream error:", error);
        const answered = await streamLiveLLM(textToSend);
        if (!answered) await submitBackendError();
      }
      // Always fire navigation regardless of whether demo reply was found
      dispatchNavigationFromQuery(textToSend);
    } finally {
      clearTimeout(streamTimeout);
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
    setWizardData({
      description: '', photoDataUrl: null, photoFile: null, location: null,
      analyzing: false, analyzed: false, title: '', category: 'pothole',
      severity: 'emergency', defectType: 'pothole', depthCm: null, widthM: null,
      recommendedAction: '',
    });
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

    // Entering the AI review step (step 1): run the simulated vision classifier
    // once, then populate the editable draft. Skip if already analyzed (Back/Next).
    if (nextStep === 1 && !wizardData.analyzed) {
      setWizardData(prev => ({ ...prev, analyzing: true }));
      analyzePhotoDraft().then(draft => {
        setWizardData(prev => ({
          ...prev,
          ...draft,
          // Preserve a user-typed description if they already entered one.
          description: prev.description || (draft.description ?? ''),
          analyzing: false,
          analyzed: true,
        }));
      });
    }
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

    // Default to S.V. Road, Bandra West so offline routing lands on Ward H-West
    // (matches the demo narration: Exec Engineer R.K. Joshi, Zenith dispatch).
    const lat = wizardData.location?.lat ?? 19.0980;
    const lon = wizardData.location?.lon ?? 72.8362;
    const photo = wizardData.photoDataUrl;
    // Use the (possibly user-edited) AI draft. Fall back to the free-text
    // description or a sane default if the draft is somehow empty.
    const category = wizardData.category || 'pothole';
    const severity = wizardData.severity || 'emergency';
    const title = wizardData.title || (wizardData.description ? wizardData.description.slice(0, 80) : "Pothole — standing water");
    const description = wizardData.description || "Road pothole/defect reported via direct photo upload.";

    // Close the card immediately and show a processing bubble so the user always
    // gets feedback the instant they tap Submit — never a stuck green button.
    setWizardActive(false);
    setWizardStep(0);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    // Best-effort backend POST (non-blocking for the demo/offline flow).
    let backendOk = false;
    try {
      const res = await fetch("http://localhost:8000/api/v1/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, severity, latitude: lat, longitude: lon, photo }),
      });
      backendOk = res.ok;
    } catch (e) {
      backendOk = false;
    }

    // Resolve the responsible authority via the offline georouting engine.
    let route: ReturnType<typeof routeComplaint> | null = null;
    try {
      route = routeComplaint(lon, lat, null);
    } catch (err) {
      console.warn("Offline authority resolution failed:", err);
    }

    const authorityId = route?.authorityId ?? 1;
    const authorityName = route?.authorityName ?? 'Brihanmumbai Municipal Corporation (BMC)';
    const deptCode = route?.departmentCode ?? 'BMC Ward H-West, Roads & Traffic Department';
    const engineer = route?.executiveEngineer ?? 'Mr. R.K. Joshi';
    const managerTitle = route?.fieldManagerTitle ?? 'Executive Engineer';
    const ticketNo = `RW-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const workOrder = `WO-HW-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    // Persist to store so the dashboard & Complaints tab update immediately.
    const newId = Math.floor(100000 + Math.random() * 900000);
    try {
      addComplaint({
        id: newId,
        title,
        description,
        category: category as ComplaintCategory,
        status: 'routed',
        priority: 5,
        escalationLevel: 0,
        targetResolutionHours: 48,
        geometry: { type: 'Point', coordinates: [lon, lat] },
        assignedAuthorityId: authorityId,
        roadId: 1,
        createdAt: new Date().toISOString(),
        imagePreview: photo || '',
      });
    } catch (err) {
      console.warn("Failed to persist complaint locally:", err);
    }

    // Map the confirmed draft severity onto the demo's P-level / SLA narration.
    const sevMeta: Record<string, { label: string; mobHrs: number; repairHrs: number }> = {
      emergency: { label: 'P1 (Critical)', mobHrs: 4, repairHrs: 48 },
      high: { label: 'P2 (High)', mobHrs: 12, repairHrs: 72 },
      medium: { label: 'P3 (Medium)', mobHrs: 24, repairHrs: 120 },
      low: { label: 'P4 (Low)', mobHrs: 48, repairHrs: 240 },
    };
    const sev = sevMeta[severity] ?? sevMeta.emergency;
    const defectLabel = defectTypeLabel(wizardData.defectType || category);
    const depthStr = wizardData.depthCm != null ? `${wizardData.depthCm}mm-class subsidence` : 'structural subsidence';

    const content =
      `✅ **Complaint filed & auto-routed** — Ticket **#${ticketNo}**\n\n` +
      `Here is your **routing summary:**\n\n` +
      `**Location:** GPS extracted from photo metadata → **${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E** (S.V. Road, Bandra West).\n\n` +
      `**Authority Match:** PostGIS ST_Contains boundary check assigns this to **${deptCode}**, supervised by ${managerTitle} **${engineer}** (${authorityName}).\n\n` +
      `**Defect Classification:** AI vision pipeline → **${defectLabel}** (${depthStr}, reviewer-confirmed) — priority **${sev.label}**.\n\n` +
      `**SLA Response:** ${sev.label} defect → contractor mobilization within **${sev.mobHrs} hours**, permanent repair within **${sev.repairHrs} hours**. The SLA clock has started.\n\n` +
      `**Auto-Dispatch:** Qualified non-blacklisted contractor **Zenith Construction Ltd.** (rating 4.2/5) dispatched under work order **${workOrder}**. Crew GPS ETA **25 minutes**.\n\n` +
      (backendOk ? `_Synced to civic infrastructure database._` : `_Saved locally — will sync to the civic database when back online. No data lost._`);

    await streamResponse(
      content,
      [],
      [
        { type: 'navigate_to_road', target_id: 1, label: 'View Hazard on Map' },
        { type: 'navigate_to_road', target_id: 1, label: 'Track Complaint Status' },
      ],
      [
        {
          title: 'Citizen Report Telemetry',
          items: [
            `Ticket ID: ${ticketNo}`,
            `GPS: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E (from photo EXIF)`,
            `Photo attached — AI vision: ${defectLabel} / ${severity} (citizen-reviewed)`,
          ],
        },
        {
          title: 'Authority & Dispatch Chain',
          items: [
            `${deptCode}`,
            `${managerTitle}: ${engineer}`,
            `Work Order: ${workOrder} | Contractor: Zenith Construction Ltd. | Crew ETA: 25 min`,
          ],
        },
      ],
      ['Track my complaint status', 'Show me the repair work order', 'View SLA compliance for Ward H-West'],
    );

    // Fire the map/context navigation to S.V. Road for "View Hazard on Map".
    setSelectedRoadId(1);

    setWizardSubmitting(false);
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
            {!wizardActive && suggestedPrompts.length > 0 && (
              <div className="flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
                <button
                  onClick={startWizard}
                  className="shrink-0 text-[10px] font-extrabold px-3 py-2 bg-cyan-950/60 border border-cyan-700/50 hover:border-cyan-500 text-cyan-400 rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3 h-3" /> Report an Issue
                </button>
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
                  <div className="w-full h-full flex flex-col min-h-0">
                    {selectedRoadId && mapSubView === 'details' ? (
                      /* ── DETAILS VIEW: full-pane road details panel ── */
                      <div className="w-full h-full flex flex-col min-h-0 relative">
                        {/* Swap-to-map button in top-right corner */}
                        <button
                          onClick={() => setMapSubView('map')}
                          title="View on map"
                          aria-label="Switch to map view"
                          className="absolute top-3 right-12 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/60 hover:border-cyan-500 text-[9px] font-black uppercase tracking-wide transition-all cursor-pointer shadow-lg"
                        >
                          <MapPin className="w-3 h-3" />
                          View Map
                        </button>
                        {/* Road Details Panel scrolls within the full pane */}
                        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-white/[0.06]">
                          <RoadDetailsPanel />
                        </div>
                      </div>
                    ) : selectedRoadId && mapSubView === 'map' ? (
                      /* ── MAP VIEW: full-pane Leaflet map ── */
                      <div className="w-full h-full relative">
                        {/* Back-to-details + close strip — floats above Leaflet (z-[9999]) */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-[9999] pointer-events-none">
                          <button
                            onClick={() => setMapSubView('details')}
                            title="Back to road details"
                            aria-label="Back to road details"
                            className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-950/60 hover:border-cyan-500 text-[9.5px] font-black uppercase tracking-wide transition-all cursor-pointer shadow-2xl"
                          >
                            <ArrowRight className="w-3 h-3 rotate-180" />
                            ← Road Details
                          </button>
                          <button
                            onClick={() => setContextView(null)}
                            title="Close map"
                            aria-label="Close map"
                            className="pointer-events-auto flex items-center justify-center w-8 h-8 rounded-xl bg-slate-950 border border-white/[0.15] text-slate-400 hover:text-slate-100 hover:border-white/30 transition-all cursor-pointer shadow-2xl"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <MapWrapper />
                      </div>
                    ) : (
                      /* ── NO ROAD SELECTED: plain map ── */
                      <div className="w-full h-full relative">
                        <MapWrapper />
                      </div>
                    )}
                  </div>
                )}

                {contextView === 'twin' && (
                  <div className="w-full h-full flex flex-col bg-slate-950/90">
                    <ErrorBoundary>
                      <DigitalTwinView />
                    </ErrorBoundary>
                  </div>
                )}

                {contextView === 'regions' && (
                  <div className="w-full h-full flex flex-col bg-slate-950/90">
                    <ErrorBoundary>
                      <RegionsOverview />
                    </ErrorBoundary>
                  </div>
                )}

                {contextView === 'sensors' && (
                  <div className="w-full h-full flex flex-col bg-slate-950/90 overflow-y-auto">
                    <ErrorBoundary>
                      <SensorDashboard embedded />
                    </ErrorBoundary>
                  </div>
                )}

                {contextView === 'playback' && (
                  <div className="w-full h-full flex flex-col bg-slate-950/90 overflow-y-auto">
                    <ErrorBoundary>
                      <PlaybackDashboard embedded />
                    </ErrorBoundary>
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

                            <div className="space-y-2">
                              <div className="flex justify-between items-center border-b border-white/[0.05] pb-1.5">
                                <h4 className="text-[10px] text-slate-200 uppercase font-black tracking-widest">Public Capital Flow Pathway</h4>
                                <span className="text-[8px] bg-slate-900 border border-white/[0.05] text-slate-450 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                                  Upstream Funding Tracker
                                </span>
                              </div>
                              <SankeyFlowVisualizer
                                projects={roadProjects}
                                contractors={contractors}
                                authorities={authorities}
                                road={road}
                              />
                            </div>

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
                            <span className="text-sm font-black text-emerald-450 mt-1 block">{formatCurrency(citywideTransparency.totalSanctioned)}</span>
                          </div>
                          <div className="glass-panel p-4 rounded-2xl border border-white/[0.05]">
                            <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-widest">Expended</span>
                            <span className="text-sm font-black text-slate-200 mt-1 block">{formatCurrency(citywideTransparency.totalSpent)}</span>
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
                                <span className="text-xs font-black text-emerald-450 mt-1 block">{formatCurrency(totalSanctioned)}</span>
                              </div>
                              <div className="p-3 bg-slate-900/40 border border-white/[0.05] rounded-xl">
                                <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Spent Outflow</span>
                                <span className="text-xs font-black text-slate-200 mt-1 block">{formatCurrency(totalSpent)}</span>
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
            contextView === 'regions' ? 'Global Regions Hub' :
            contextView === 'sensors' ? 'Smart Infrastructure Sensor Monitor' :
            contextView === 'playback' ? 'Historical Playback Simulation' :
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
              <div className="w-full h-full flex flex-col bg-slate-950/90 min-h-[300px]">
                <ErrorBoundary>
                  <DigitalTwinView />
                </ErrorBoundary>
              </div>
            )}

            {contextView === 'regions' && (
              <div className="w-full min-h-[300px]">
                <ErrorBoundary>
                  <RegionsOverview />
                </ErrorBoundary>
              </div>
            )}

            {contextView === 'sensors' && (
              <div className="w-full min-h-[300px]">
                <ErrorBoundary>
                  <SensorDashboard embedded />
                </ErrorBoundary>
              </div>
            )}

            {contextView === 'playback' && (
              <div className="w-full min-h-[300px]">
                <ErrorBoundary>
                  <PlaybackDashboard embedded />
                </ErrorBoundary>
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
                        <span className="text-xs font-black text-emerald-450">{formatCurrency(citywideTransparency.totalSanctioned)}</span>
                      </div>
                      <div className="glass-panel p-3 rounded-xl border border-white/[0.05]">
                        <span className="text-[8px] text-muted-foreground block uppercase font-bold">Expended</span>
                        <span className="text-xs font-black text-slate-200">{formatCurrency(citywideTransparency.totalSpent)}</span>
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
                aria-label="Close voice mode"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Orb Pulsing */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <button 
                onClick={toggleListening}
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
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

      {/* Hidden file input for photo capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}

// Wizard Step Renderer
function WizardStepRenderer({
  step,
  data,
  setData,
  onNext,
  onPrev,
  onSubmit,
  onCancel,
  onPhotoCapture,
  fileInputRef,
  submitting,
}: {
  step: number;
  data: WizardData;
  setData: (updater: (prev: WizardData) => WizardData) => void;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  onPhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  submitting: boolean;
}) {
  const progressPct = ((step + 1) / WIZARD_TOTAL_STEPS) * 100;
  const canProceed = data.photoDataUrl !== null;

  // ---- Step 1: AI analysis + editable draft review ----
  if (step === 1) {
    return (
      <div className="w-full space-y-3">
        {data.analyzing ? (
          // "Analyzing" beat — deterministic ~2s simulated vision pass
          <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-cyan-700/30 rounded-xl bg-slate-950/40">
            {data.photoDataUrl && (
              <img
                src={data.photoDataUrl}
                alt="Analyzing defect"
                className="w-full h-28 object-cover rounded-lg border border-cyan-500/20 opacity-70"
              />
            )}
            <div className="flex items-center gap-2 text-cyan-400">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-[11px] font-bold">AI vision analyzing defect…</span>
            </div>
            <p className="text-[9px] text-slate-500 text-center">
              Classifying defect type, estimating depth &amp; severity, drafting your report.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">AI Draft — Review &amp; Edit</p>
            </div>
            <p className="text-[9px] text-slate-400">Our vision model pre-filled this from your photo. Correct anything before it&apos;s sent.</p>

            {data.photoDataUrl && (
              <img
                src={data.photoDataUrl}
                alt="Reported defect"
                className="w-full h-20 object-cover rounded-lg border border-white/[0.06]"
              />
            )}

            {/* AI telemetry chips (read-only) */}
            <div className="flex flex-wrap gap-1.5">
              {data.depthCm != null && (
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-700/30 text-cyan-300 text-[8px] font-bold">
                  Depth ≈ {data.depthCm}mm
                </span>
              )}
              {data.widthM != null && (
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-700/30 text-cyan-300 text-[8px] font-bold">
                  Width ≈ {data.widthM}m
                </span>
              )}
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-700/30 text-cyan-300 text-[8px] font-bold">
                Confidence 94%
              </span>
            </div>

            {/* Editable title */}
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Title</label>
              <input
                type="text"
                value={data.title}
                onChange={(e) => setData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-white/[0.08] text-slate-200 text-[10px] focus:border-cyan-500/50 focus:outline-none"
                placeholder="Short summary of the defect"
              />
            </div>

            {/* Editable description */}
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Description</label>
              <textarea
                value={data.description}
                onChange={(e) => setData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-white/[0.08] text-slate-200 text-[10px] resize-none focus:border-cyan-500/50 focus:outline-none"
                placeholder="Describe the defect"
              />
            </div>

            {/* Category selector */}
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {WIZARD_CATEGORY_OPTS.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setData(prev => ({ ...prev, category: cat }))}
                    className={`px-2 py-1 rounded-lg text-[8px] font-bold border transition-all ${
                      data.category === cat
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-slate-950/40 border-white/[0.08] text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity selector */}
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Severity</label>
              <div className="flex flex-wrap gap-1.5">
                {WIZARD_SEVERITY_OPTS.map(sev => (
                  <button
                    key={sev}
                    onClick={() => setData(prev => ({ ...prev, severity: sev }))}
                    className={`px-2 py-1 rounded-lg text-[8px] font-bold border transition-all ${
                      data.severity === sev
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-950/40 border-white/[0.08] text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {data.recommendedAction && (
              <p className="text-[8px] text-slate-500 italic border-l-2 border-cyan-700/40 pl-2">
                AI recommendation: {data.recommendedAction}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={onPrev}
                disabled={submitting}
                className="px-3 py-1.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-cyan-400 text-[9px] font-bold transition-all disabled:opacity-40"
              >
                ← Back
              </button>
              <button
                onClick={onSubmit}
                disabled={submitting || !data.title.trim()}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-[9px] font-black hover:bg-emerald-400 transition-all disabled:opacity-40 flex items-center gap-1"
              >
                {submitting ? (
                  <><Loader className="w-3 h-3 animate-spin" /> Sending…</>
                ) : (
                  <><CheckCircle className="w-3 h-3" /> Confirm &amp; Send</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ---- Step 0: photo upload ----
  return (
    <div className="w-full space-y-3">
      {/* Step content */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Upload a Photo of the defect</p>
        <p className="text-[10px] text-slate-400">Take or upload a picture of the defect. Our AI classifies it and drafts your report.</p>
        <div className="flex flex-col items-center gap-3 p-4 border-2 border-dashed border-white/[0.08] rounded-xl bg-slate-950/30">
          {data.photoDataUrl ? (
            <div className="relative w-full">
              <img
                src={data.photoDataUrl}
                alt="Captured defect"
                className="w-full h-32 object-cover rounded-lg border border-white/[0.06]"
              />
              <button
                onClick={() => setData(prev => ({ ...prev, photoDataUrl: null, photoFile: null }))}
                className="absolute top-1 right-1 p-1 rounded-lg bg-slate-900/80 border border-white/[0.1] text-slate-400 hover:text-red-400 transition-colors"
                aria-label="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Camera className="w-10 h-10 text-slate-600" />
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-700/30 text-cyan-400 text-[10px] font-bold hover:bg-cyan-500/20 transition-all"
          >
            {data.photoDataUrl ? 'Retake Photo' : 'Choose Photo'}
          </button>
          <p className="text-[8px] text-slate-600">Photo upload is required to file a complaint</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={submitting}
          className="px-3 py-1.5 rounded-xl border border-white/[0.08] text-slate-500 hover:text-red-400 text-[9px] font-bold transition-all disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          onClick={onNext}
          disabled={submitting || !canProceed}
          className="px-4 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-[9px] font-black hover:bg-cyan-400 transition-all disabled:opacity-40 flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3" /> Analyze with AI
        </button>
      </div>
    </div>
  );
}
