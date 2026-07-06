'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  MapPin, 
  Camera, 
  Sparkles, 
  CheckCircle, 
  Landmark, 
  ShieldAlert,
  Loader2,
  WifiOff,
  Video,
  MonitorPlay,
  Settings,
  HelpCircle,
  TrendingUp,
  Cpu
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { routeComplaint, RoutingResult } from '@/services/routingEngine';
import { ComplaintCategory, Complaint, Road } from '@/types';
import { roads } from '@/data/mockData';

interface WizardMapProps {
  center: [number, number];
  onChange: (coords: [number, number]) => void;
  roadId: number | null;
}

// Dynamically load the wizard map to prevent Next.js SSR crashes
const WizardMap = dynamic<WizardMapProps>(
  () => import('./WizardMap') as any,
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-48 bg-slate-900 rounded-lg flex items-center justify-center border border-border">
        <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
        <span className="text-xs text-muted-foreground ml-2">Loading GIS Locator Frame...</span>
      </div>
    )
  }
);

// Preset Mock Defect Scenarios for Simulator Mode
const PRESETS = [
  {
    id: 'pothole',
    label: 'Sub-base Pothole',
    category: 'pothole' as ComplaintCategory,
    severity: 'critical' as const,
    title: 'Severe sub-base collapse crater on S.V. Road',
    size: '45cm x 30cm, Depth: 12cm',
    confidence: '98.2%',
    coordinates: [19.1242, 72.8422] as [number, number], // Ward K-West
    description: 'Large structural pothole showing severe asphalt fragmentation. Bounding box coordinates indicate sub-base failure due to heavy vehicle compaction.'
  },
  {
    id: 'waterlogging',
    label: 'Drainage Clog',
    category: 'waterlogging' as ComplaintCategory,
    severity: 'high' as const,
    title: 'Active hydraulic congestion near WEH Express',
    size: 'Volume: 12m³, Depth: 15cm',
    confidence: '94.6%',
    coordinates: [19.0435, 72.8624] as [number, number], // Ward F-North
    description: 'Stormwater drainage saturation and reverse flow. Highly localized hydraulic wear detected on asphalt overlay.'
  },
  {
    id: 'paving',
    label: 'Paver Defect',
    category: 'paving_defect' as ComplaintCategory,
    severity: 'medium' as const,
    title: 'Displaced paver block interlocking shifting',
    size: 'Displaced blocks: 18 units',
    confidence: '91.8%',
    coordinates: [19.0182, 72.8415] as [number, number], // Ward H-East
    description: 'Loose paving block grid shifting under heavy axial transport wear. Leveling mortar bedding audit suggested.'
  },
  {
    id: 'debris',
    label: 'Aggregate Dump',
    category: 'debris' as ComplaintCategory,
    severity: 'medium' as const,
    title: 'Construction concrete rubble lane block',
    size: 'Est. Volume: 2.4 cubic meters',
    confidence: '89.5%',
    coordinates: [19.0760, 72.8777] as [number, number], // PWD default
    description: 'Unlawful dumping of dry aggregates and masonry debris blocking vehicular lane margins.'
  }
];

// Interactive Scanner Hot-spots mapping to presets (Google Lens style)
const SCATTER_NODES = [
  { presetIdx: 0, x: '35%', y: '45%', label: 'Pothole' },
  { presetIdx: 1, x: '65%', y: '60%', label: 'Drainage Clog' },
  { presetIdx: 2, x: '45%', y: '30%', label: 'Paver Defect' },
  { presetIdx: 3, x: '75%', y: '40%', label: 'Aggregate Dump' }
];

// Helper to calculate distance in km between two lat/lng points
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper to find nearest road
function findNearestRoad(lat: number, lng: number): Road | null {
  let minDistance = Infinity;
  let nearestRoad: Road | null = null;
  
  for (const road of roads) {
    for (const coord of road.geometry.coordinates) {
      // GeoJSON coordinate represents [longitude, latitude]
      const dist = getDistance(lat, lng, coord[1], coord[0]);
      if (dist < minDistance) {
        minDistance = dist;
        nearestRoad = road;
      }
    }
  }
  
  return nearestRoad;
}

// Generate base64 SVG preview image based on category
function getSvgDataUrl(category: ComplaintCategory, titleText: string, size: string) {
  let svgColor = '#f43f5e';
  if (category === 'waterlogging') svgColor = '#38bdf8';
  else if (category === 'paving_defect') svgColor = '#f59e0b';
  else if (category === 'debris') svgColor = '#a78bfa';

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" width="200" height="150" style="background:#07070a;font-family:monospace">
    <rect width="200" height="150" fill="#07070a"/>
    <g opacity="0.15">
      <line x1="0" y1="75" x2="200" y2="75" stroke="#22d3ee" stroke-width="0.5"/>
      <line x1="100" y1="0" x2="100" y2="150" stroke="#22d3ee" stroke-width="0.5"/>
    </g>
    <rect x="50" y="35" width="100" height="80" rx="4" fill="none" stroke="${svgColor}" stroke-width="1.5" stroke-dasharray="3 3"/>
    <circle cx="100" cy="75" r="15" fill="none" stroke="${svgColor}" stroke-width="2"/>
    <text x="15" y="20" fill="${svgColor}" font-size="7" font-weight="bold">AI SCANNED: ${category.toUpperCase().replace('_', ' ')}</text>
    <text x="15" y="132" fill="#94a3b8" font-size="6">METRICS: ${size}</text>
    <text x="15" y="142" fill="#55555f" font-size="5">ROADWATCH AI-LENS v2.0</text>
  </svg>`;
  
  try {
    return 'data:image/svg+xml;base64,' + btoa(svgContent);
  } catch (err) {
    return '';
  }
}

// stylized wireframe SVGs for camera simulation presets
function DefectVisualizer({ category, size }: { category: ComplaintCategory; size: string }) {
  return (
    <div className="w-full h-full bg-slate-950 relative flex items-center justify-center overflow-hidden border border-white/[0.04] rounded-2xl min-h-[220px]">
      <div className="absolute inset-0 command-grid-dense opacity-25" />
      <svg width="100%" height="100%" viewBox="0 0 200 150" className="relative z-10 w-full h-full max-h-48 max-w-sm">
        <line x1={0} y1={75} x2={200} y2={75} stroke="rgba(34,211,238,0.12)" strokeWidth={0.5} strokeDasharray="3 3" />
        <line x1={100} y1={0} x2={100} y2={150} stroke="rgba(34,211,238,0.12)" strokeWidth={0.5} strokeDasharray="3 3" />
        
        {category === 'pothole' && (
          <g>
            <circle cx={100} cy={75} r={35} fill="none" stroke="#f43f5e" strokeWidth={1} strokeDasharray="3 2" opacity={0.35} />
            <circle cx={100} cy={75} r={24} fill="none" stroke="#f43f5e" strokeWidth={1.2} opacity={0.6} />
            <circle cx={96} cy={78} r={14} fill="rgba(244,63,94,0.15)" stroke="#f43f5e" strokeWidth={1.5} />
            <line x1={100} y1={75} x2={130} y2={50} stroke="#f43f5e" strokeWidth={0.75} />
            <circle cx={130} cy={50} r={1.5} fill="#f43f5e" />
            <text x={134} y={52} fill="#f43f5e" fontSize={5} fontFamily="monospace" fontWeight="bold">MAX DEPTH: 12cm</text>
            <text x={10} y={15} fill="rgba(255,255,255,0.3)" fontSize={5} fontFamily="monospace">MODEL: CAVITY_DETECTOR_V2</text>
            <text x={10} y={23} fill="#f43f5e" fontSize={5} fontFamily="monospace" fontWeight="bold">STRUCTURAL CONTOUR BLOCK</text>
          </g>
        )}

        {category === 'waterlogging' && (
          <g>
            <path d="M 30,85 Q 65,70 100,85 T 170,85 L 170,120 L 30,120 Z" fill="rgba(56,189,248,0.1)" stroke="#38bdf8" strokeWidth={1} />
            <path d="M 35,95 Q 65,85 100,95 T 165,95" fill="none" stroke="#38bdf8" strokeWidth={0.5} strokeDasharray="2 3" />
            <line x1={100} y1={105} x2={100} y2={125} stroke="#38bdf8" strokeWidth={0.75} strokeDasharray="2 2" />
            <polygon points="100,128 97,124 103,124" fill="#38bdf8" />
            <text x={105} y={117} fill="#38bdf8" fontSize={5} fontFamily="monospace" fontWeight="bold">CONGESTION LEVEL: 92%</text>
            <text x={10} y={15} fill="rgba(255,255,255,0.3)" fontSize={5} fontFamily="monospace">MODEL: FLOW_VECTOR_ANALYST</text>
          </g>
        )}

        {category === 'paving_defect' && (
          <g>
            {[-2, -1, 0, 1, 2].map((x) =>
              [-1, 0, 1].map((y) => {
                const cx = 100 + x * 24;
                const cy = 75 + y * 16;
                const isDisplaced = x === 0 && y === 0;
                const rotate = isDisplaced ? 'rotate(12 100 75)' : '';
                return (
                  <rect
                    key={`${x}-${y}`}
                    x={cx - 10} y={cy - 6} width={20} height={12}
                    fill={isDisplaced ? 'rgba(245,158,11,0.15)' : 'none'}
                    stroke={isDisplaced ? '#f59e0b' : 'rgba(255,255,255,0.12)'}
                    strokeWidth={isDisplaced ? 1.2 : 0.7}
                    transform={rotate}
                  />
                );
              })
            )}
            <text x={112} y={85} fill="#f59e0b" fontSize={4.5} fontFamily="monospace" fontWeight="bold">DISPLACED BLOCK: θ=+12°</text>
            <text x={10} y={15} fill="rgba(255,255,255,0.3)" fontSize={5} fontFamily="monospace">MODEL: TILE_ALIGNMENT_ENGINE</text>
          </g>
        )}

        {category === 'debris' && (
          <g>
            <polygon points="70,105 130,105 150,85 90,85" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
            <polygon points="100,45 130,105 70,105" fill="none" stroke="#a78bfa" strokeWidth={1} />
            <polygon points="100,45 150,85 130,105" fill="none" stroke="#a78bfa" strokeWidth={0.75} strokeDasharray="3 1" />
            <line x1={100} y1={45} x2={145} y2={45} stroke="#a78bfa" strokeWidth={0.5} strokeDasharray="2 2" />
            <text x={148} y={47} fill="#a78bfa" fontSize={5} fontFamily="monospace" fontWeight="bold">VOL: ~2.4 m³</text>
            <text x={10} y={15} fill="rgba(255,255,255,0.3)" fontSize={5} fontFamily="monospace">MODEL: OBSTRUCTION_VOLUME_SCAN</text>
          </g>
        )}
      </svg>
      <div className="absolute bottom-2 left-3 right-3 flex justify-between z-20 text-[7px] font-mono text-cyan-500/60 tracking-wider">
        <span>GRID: RESOLVED</span>
        <span>{size}</span>
      </div>
    </div>
  );
}

export default function ComplaintWizard() {
  const { 
    isReporting, 
    setIsReporting, 
    isOnline, 
    queueComplaint 
  } = useStore();

  const [step, setStep] = useState(1);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);

  // Form details resolved by AI and customized by user
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('pothole');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [coordinates, setCoordinates] = useState<[number, number]>([19.1242, 72.8422]); // SV Road defaults
  const [associatedRoadId, setAssociatedRoadId] = useState<number | null>(null);
  const [roadName, setRoadName] = useState('S.V. Road');
  const [confidenceScore, setConfidenceScore] = useState('98.2%');
  const [defectSize, setDefectSize] = useState('45cm x 30cm, Depth: 12cm');

  // Webcam stream handlers
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamAvailable, setWebcamAvailable] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // UI Processing states
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [shutterFlashing, setShutterFlashing] = useState(false);
  const [ticketResult, setTicketResult] = useState<Complaint | null>(null);
  const [routingInfo, setRoutingInfo] = useState<RoutingResult | null>(null);
  const [analysisProgressText, setAnalysisProgressText] = useState('ISOLATING PAVEMENT LAYER COORDS...');

  // Geo-position coordinates jitter
  const [jitterCoords, setJitterCoords] = useState<[number, number]>([19.1242, 72.8422]);

  // Jitter coordinates to simulate GPS tracking
  useEffect(() => {
    if (step === 2) {
      const interval = setInterval(() => {
        const base = isWebcamActive ? [19.0760, 72.8777] : PRESETS[selectedPresetIndex].coordinates;
        const latJitter = base[0] + (Math.random() - 0.5) * 0.0002;
        const lngJitter = base[1] + (Math.random() - 0.5) * 0.0002;
        setJitterCoords([latJitter, lngJitter]);
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [step, isWebcamActive, selectedPresetIndex]);

  // Analysis text ticker cycle effect
  useEffect(() => {
    if (aiAnalyzing) {
      const texts = [
        'ISOLATING PAVEMENT LAYER COORDS...',
        'COMPRESSING SUB-BASE TELEMETRY...',
        'AUDITING AGGREGATE DENSITY MIX...',
        'CALCULATING DEFECT VOLUMETRICS...',
        'SPATIALLY VERIFYING WARD BOUNDS...',
        'AUTO-RESOLVING JURISDICTION...'
      ];
      let idx = 0;
      setAnalysisProgressText(texts[0]);
      const interval = setInterval(() => {
        idx = (idx + 1) % texts.length;
        setAnalysisProgressText(texts[idx]);
      }, 400);
      return () => clearInterval(interval);
    }
  }, [aiAnalyzing]);

  // Load webcam stream
  const startWebcam = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsWebcamActive(true);
      setWebcamAvailable(true);
    } catch (err) {
      console.warn('Webcam stream requested but failed to initialize:', err);
      setWebcamAvailable(false);
      setIsWebcamActive(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsWebcamActive(false);
  };

  useEffect(() => {
    if (step === 2 && isWebcamActive) {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => stopWebcam();
  }, [step]);

  // AI-Lens defect capture
  const handleCapture = () => {
    setShutterFlashing(true);
    setTimeout(() => setShutterFlashing(false), 150);

    setStep(3);
    setAiAnalyzing(true);

    // Initialize defaults based on selected preset or webcam fallback
    const preset = PRESETS[selectedPresetIndex];
    
    // Resolve coordinates
    let resolvedCoords: [number, number] = preset.coordinates;
    let resolvedCategory: ComplaintCategory = preset.category;
    let resolvedSeverity = preset.severity;
    let resolvedTitle = preset.title;
    let resolvedDescription = preset.description;
    let resolvedSize = preset.size;
    let resolvedConfidence = preset.confidence;

    if (isWebcamActive) {
      // In webcam mode, pick random profile coordinates from SV Road area
      resolvedCoords = [19.1242 + (Math.random() - 0.5) * 0.01, 72.8422 + (Math.random() - 0.5) * 0.01];
      resolvedCategory = 'pothole';
      resolvedSeverity = 'high';
      resolvedTitle = 'Subsurface structural pothole detected via camera stream';
      resolvedDescription = 'Pothole defect scanned via camera stream coordinates. Distress vectors show pavement sub-base erosion.';
      resolvedSize = '32cm x 28cm, Depth: 8.5cm';
      resolvedConfidence = '94.2%';
    }

    setCoordinates(resolvedCoords);
    setCategory(resolvedCategory);
    setSeverity(resolvedSeverity);
    setDefectSize(resolvedSize);
    setConfidenceScore(resolvedConfidence);

    // Resolve nearest road
    const nearest = findNearestRoad(resolvedCoords[0], resolvedCoords[1]);
    if (nearest) {
      setAssociatedRoadId(nearest.id);
      setRoadName(nearest.name);
    } else {
      setAssociatedRoadId(null);
      setRoadName('Unmapped Ward Segment');
    }

    // Trigger AI compilation delay
    setTimeout(() => {
      setTitle(resolvedTitle);
      setDescription(resolvedDescription);
      setAiAnalyzing(false);
    }, 1800);
  };

  // Routing trigger
  useEffect(() => {
    if (step === 4) {
      const routing = routeComplaint(coordinates[1], coordinates[0], associatedRoadId);
      setRoutingInfo(routing);
    }
  }, [step, coordinates, associatedRoadId]);

  // Submit Handler
  const handleSubmit = () => {
    if (!routingInfo) return;

    // Generate diagnostic data-url image preview
    const base64Preview = getSvgDataUrl(category, title, defectSize);

    const complaintData = {
      title: title || `${category.replace('_', ' ')} defect report`,
      description,
      category,
      geometry: {
        type: 'Point' as const,
        coordinates: [coordinates[1], coordinates[0]] as [number, number] // [lng, lat]
      },
      status: 'pending' as const,
      assignedAuthorityId: routingInfo.authorityId,
      roadId: associatedRoadId || undefined,
      imagePreview: base64Preview || undefined
    };

    const ticket = queueComplaint(complaintData);
    setTicketResult(ticket);
    setStep(5);
  };

  const handleClose = () => {
    stopWebcam();
    setIsReporting(false);
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setSelectedPresetIndex(0);
    setTitle('');
    setDescription('');
    setCategory('pothole');
    setSeverity('medium');
    setCoordinates([19.1242, 72.8422]);
    setAssociatedRoadId(null);
    setRoutingInfo(null);
    setTicketResult(null);
    setIsWebcamActive(false);
  };

  if (!isReporting) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-2 bg-[#000000]/80 backdrop-blur-md animate-in fade-in duration-300">
      
      {/* Mobile bezel mock frame on desktop viewports */}
      <div className="w-full max-w-sm h-[88vh] max-h-[760px] bg-slate-955 border border-white/[0.08] rounded-[36px] flex flex-col relative shadow-[0_24px_80px_rgba(0,0,0,0.85)] overflow-hidden transition-all duration-300">
        
        {/* Device speaker notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full z-40 flex items-center justify-center">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>
        
        {/* Telemetry Status Bar */}
        <div className="h-7 pt-2.5 px-6 flex justify-between items-center text-[7px] font-mono text-[#55555f] tracking-widest select-none z-30 shrink-0">
          <span>AI-LENS // CMD</span>
          <div className="flex items-center gap-1.5">
            <span>5G</span>
            <span className={isOnline ? 'text-emerald-400' : 'text-amber-500 font-bold'}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
            <span className="w-4 h-2.5 border border-current rounded-sm flex items-center p-0.5 opacity-60">
              <div className="h-full w-full bg-current rounded-2xs" />
            </span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
           STEP 1: ONBOARDING / INTRO PORTAL
           ══════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="flex-1 flex flex-col p-6 justify-between relative overflow-hidden animate-in fade-in duration-300">
            {/* Background scan decoration */}
            <div className="absolute inset-0 command-grid opacity-15 pointer-events-none z-0" />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full border border-cyan-500/10 animate-ping z-0 pointer-events-none" />

            <div className="space-y-6 relative z-10 text-center pt-8">
              <div className="flex items-center justify-center gap-1.5 text-cyan-400">
                <Sparkles className="w-6 h-6 animate-pulse" />
                <span className="mono-label text-[10px] tracking-[0.2em] font-black">ROADWATCH AI-LENS</span>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-sm font-black text-slate-100 uppercase tracking-widest">SCANNERS OPERATIONAL</h2>
                <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                  Scan and register road damages directly from your device camera. Automated routing and AI analysis enabled.
                </p>
              </div>

              {/* Onboarding info tiles */}
              <div className="space-y-2 max-w-xs mx-auto text-left">
                {[
                  { label: 'Webcam Scanner', desc: 'Capture high-res road defect evidence instantly.' },
                  { label: 'AI Diagnostic Parsing', desc: 'Extract category, size, and severity indices automatically.' },
                  { label: 'GPS Segment Mapping', desc: 'Identify municipal coordinates & route to Executive Engineers.' }
                ].map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-white/[0.04] bg-white/[0.01] flex gap-3">
                    <div className="mono-readout text-cyan-500/50 mt-0.5">0{idx + 1}</div>
                    <div className="space-y-0.5">
                      <h4 className="text-[9px] font-black text-slate-200 uppercase tracking-wide">{item.label}</h4>
                      <p className="text-[8px] text-[#55555f] leading-normal">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 relative z-10 pt-4">
              <button
                onClick={() => setStep(2)}
                className="w-full py-3.5 rounded-2xl bg-cyan-400 hover:bg-cyan-500 text-slate-950 text-xs font-black tracking-widest uppercase hover:scale-101 active:scale-99 transition-all cursor-pointer shadow-lg shadow-cyan-400/10"
              >
                INITIALIZE SCANNERS
              </button>
              <button
                onClick={handleClose}
                className="w-full py-2.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.02] text-muted-foreground hover:text-slate-200 text-[10px] uppercase font-bold tracking-wider transition-all"
              >
                Close Portal
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
           STEP 2: SCANNER / CAMERA MODULE
           ══════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="flex-1 flex flex-col relative overflow-hidden animate-in fade-in duration-300">
            {/* Viewfinder block */}
            <div className="flex-1 relative bg-slate-950 overflow-hidden flex items-center justify-center">
              {/* WebRTC Video */}
              {isWebcamActive && webcamAvailable ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                /* Simulator frame preset preview */
                <div className="absolute inset-0 w-full h-full">
                  <DefectVisualizer 
                    category={PRESETS[selectedPresetIndex].category} 
                    size={PRESETS[selectedPresetIndex].size}
                  />
                </div>
              )}

              {/* Shutter flash animation */}
              {shutterFlashing && (
                <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-150" />
              )}

              {/* Viewfinder corner overlays */}
              <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none" />
              <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-cyan-400/60 pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-cyan-400/60 pointer-events-none" />

              {/* Active scanning sweep bar */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent shadow-[0_0_12px_#22d3ee] pointer-events-none z-20 animate-scanline" />

              {/* Google Lens Scatter Nodes */}
              {!isWebcamActive && SCATTER_NODES.map((node) => {
                const isActive = selectedPresetIndex === node.presetIdx;
                return (
                  <button
                    key={node.presetIdx}
                    type="button"
                    onClick={() => setSelectedPresetIndex(node.presetIdx)}
                    style={{ left: node.x, top: node.y }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group p-1 focus:outline-none cursor-pointer"
                    aria-label={`Select preset: ${node.label}`}
                  >
                    <span className="relative flex h-5 w-5 items-center justify-center">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isActive ? 'bg-cyan-400' : 'bg-white/40'}`} />
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 shadow-[0_0_8px_currentColor] transition-all duration-300 ${
                        isActive 
                          ? 'bg-cyan-400 text-cyan-400 scale-125' 
                          : 'bg-white/70 text-white group-hover:bg-cyan-300 group-hover:scale-110'
                      }`} />
                    </span>
                    {/* Tooltip on hover */}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-white/[0.08] text-[7.5px] font-black uppercase text-slate-200 px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none">
                      {node.label}
                    </div>
                  </button>
                );
              })}

              {/* Telemetry metadata layers */}
              <div className="absolute top-4 left-6 right-6 flex justify-between items-start pointer-events-none z-20">
                <div className="bg-slate-950/60 backdrop-blur-md px-2 py-1 border border-white/[0.04] rounded-sm space-y-0.5">
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-cyan-400 animate-ping inline-block" />
                    <span className="mono-label text-[7px] text-cyan-400">GPS MATCHING</span>
                  </div>
                  <div className="mono-readout text-[8px] font-bold text-slate-350 tracking-wider">
                    {jitterCoords[0].toFixed(5)}, {jitterCoords[1].toFixed(5)}
                  </div>
                </div>
                
                <div className="bg-slate-950/60 backdrop-blur-md px-2 py-1 border border-white/[0.04] rounded-sm text-right">
                  <div className="mono-label text-[7px]">SIGNAL DEPTH</div>
                  <div className="mono-readout text-[8px] text-slate-350">
                    {isWebcamActive ? 'WEBCAM RELAY' : 'SIMULATION MODE'}
                  </div>
                </div>
              </div>

              {/* Center reticle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 rounded-full border border-cyan-400/40 flex items-center justify-center animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-cyan-400/70" />
                </div>
              </div>

              {/* Switch camera / simulator selector */}
              <div className="absolute bottom-4 left-6 right-6 flex justify-between items-center z-20">
                <button
                  onClick={isWebcamActive ? stopWebcam : startWebcam}
                  className="bg-slate-950/80 backdrop-blur-md border border-white/[0.08] hover:border-cyan-400/30 p-2 rounded-full text-slate-300 hover:text-cyan-400 flex items-center gap-1.5 text-[8.5px] font-mono tracking-wider transition-all"
                >
                  {isWebcamActive ? (
                    <>
                      <MonitorPlay className="w-3.5 h-3.5" /> SIMULATOR MODE
                    </>
                  ) : (
                    <>
                      <Video className="w-3.5 h-3.5" /> ACTIVATE WEBCAM
                    </>
                  )}
                </button>

                <button
                  onClick={handleClose}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-950/80 border border-white/[0.08] hover:bg-slate-900 text-[#55555f] hover:text-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Shutter / Capture control bar */}
            <div className="p-4 border-t border-white/[0.05] bg-slate-955 flex flex-col gap-3 shrink-0">
              
              {/* Preset buttons - display in Simulator mode */}
              {!isWebcamActive && (
                <div className="space-y-1.5">
                  <span className="mono-label text-[7.5px] block text-center opacity-60">SELECT SCANNING TEMPLATE</span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1.5 px-0.5 justify-center">
                    {PRESETS.map((p, idx) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPresetIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg border text-[8.5px] font-black uppercase transition-all shrink-0 ${
                          selectedPresetIndex === idx
                            ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.1)]'
                            : 'border-white/[0.06] text-[#55555f] hover:border-white/[0.12] hover:text-slate-400'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Giant shutter layout */}
              <div className="flex items-center justify-center py-2">
                <button
                  onClick={handleCapture}
                  className="w-16 h-16 rounded-full border-4 border-slate-900 flex items-center justify-center transition-all bg-white relative hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-white/5"
                  aria-label="Capture Road Defect"
                >
                  <div className="absolute inset-0 rounded-full border border-white/20 animate-pulse scale-110 pointer-events-none" />
                  <div className="w-10 h-10 rounded-full bg-cyan-400 scale-90 group-hover:scale-95 transition-all" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
           STEP 3: AI DIAGNOSIS & BOUNDING BOX OVERLAY
           ══════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="flex-1 flex flex-col p-5 justify-between relative overflow-hidden animate-in fade-in duration-300">
            {/* Frozen frame / scanning matrix */}
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] min-h-[200px]">
                <DefectVisualizer category={category} size={defectSize} />
                
                {/* AI bounding diagnostics frame */}
                {!aiAnalyzing && (
                  <div className="absolute inset-x-8 top-10 bottom-12 bg-rose-500/5 rounded flex flex-col justify-between p-2 animate-in zoom-in-95 duration-300">
                    {/* Animated SVG Border */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none rounded">
                      <rect 
                        width="100%" 
                        height="100%" 
                        fill="none" 
                        stroke="#f43f5e" 
                        strokeWidth="1.5" 
                        strokeDasharray="6 4" 
                        className="animate-dash"
                        style={{ opacity: 0.5 }}
                      />
                    </svg>
                    {/* Bounding box glow points */}
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-rose-400 border border-white rounded-full animate-pulse z-10" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-400 border border-white rounded-full animate-pulse z-10" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-rose-400 border border-white rounded-full animate-pulse z-10" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-rose-400 border border-white rounded-full animate-pulse z-10" />

                    <div className="bg-rose-950/85 backdrop-blur-md px-1.5 py-0.5 rounded border border-rose-500/30 text-[7px] font-mono text-rose-400 self-start uppercase tracking-wider relative z-10">
                      IDENTIFIED: {category.replace('_', ' ')} // {confidenceScore} CONFIDENCE
                    </div>
                  </div>
                )}

                {aiAnalyzing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/85 backdrop-blur-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                    <span className="mono-label text-[8px] text-cyan-500/80 tracking-[0.15em] text-center px-4 font-mono">
                      {analysisProgressText}
                    </span>
                  </div>
                )}
              </div>

              {/* Diagnosis Statistics */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="mono-label text-[8px] text-[#55555f]">DIAGNOSTIC MATRIX</span>
                  <span className="mono-readout text-[8px] text-emerald-400 uppercase tracking-widest">SCAN RESOLVED</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="p-2.5 rounded-lg border border-white/[0.04] bg-white/[0.01] space-y-0.5">
                    <span className="mono-label text-[7.5px]">Resolved Class</span>
                    <p className="font-bold text-slate-200 capitalize">{category.replace('_', ' ')}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-white/[0.04] bg-white/[0.01] space-y-0.5">
                    <span className="mono-label text-[7.5px]">Severity Rating</span>
                    <p className="font-bold text-rose-400 capitalize">{severity}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-white/[0.04] bg-white/[0.01] space-y-0.5">
                    <span className="mono-label text-[7.5px]">Defect Geometry</span>
                    <p className="font-bold text-slate-200">{defectSize}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-white/[0.04] bg-white/[0.01] space-y-0.5">
                    <span className="mono-label text-[7.5px]">GPS Location Match</span>
                    <p className="font-bold text-slate-200 truncate">{roadName}</p>
                  </div>
                </div>
              </div>

              {/* AI Draft Summary Panel */}
              <div className="p-3 rounded-lg border border-cyan-500/10 bg-cyan-500/[0.01] space-y-1.5">
                <div className="flex items-center gap-1 text-cyan-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="mono-label text-[7.5px] tracking-wider">AI COMPILATION DRAFT</span>
                </div>
                {aiAnalyzing ? (
                  <div className="h-6 w-full bg-white/[0.02] animate-pulse rounded" />
                ) : (
                  <p className="text-[9.5px] text-slate-350 leading-relaxed font-mono">
                    {description}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setStep(4)}
                disabled={aiAnalyzing}
                className="w-full py-3.5 rounded-2xl bg-cyan-400 hover:bg-cyan-500 text-slate-950 text-xs font-black tracking-widest uppercase disabled:bg-slate-900 disabled:text-slate-600 transition-all cursor-pointer shadow-lg shadow-cyan-400/10"
              >
                CONFIRM INTEL ROUTING
              </button>
              <button
                onClick={() => setStep(2)}
                className="w-full py-2.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.02] text-muted-foreground hover:text-slate-200 text-[10px] uppercase font-bold tracking-wider transition-all"
              >
                Scan Again
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
           STEP 4: INTELLECTUAL ROUTING AUDIT & PREVIEW
           ══════════════════════════════════════════════════════════ */}
        {step === 4 && (
          <div className="flex-1 flex flex-col p-5 justify-between relative overflow-hidden animate-in fade-in duration-300">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
                <span className="mono-label text-[8px] text-[#55555f]">AUTHORITY ROUTING PATH</span>
                <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-slate-900 border border-white/[0.06] text-slate-300 font-mono tracking-widest">
                  DEPT: {routingInfo?.departmentCode || 'MUNICIPAL'}
                </span>
              </div>

              {routingInfo && (
                <div className="space-y-3.5">
                  {/* Responsible Officer Card */}
                  <div className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01] space-y-2">
                    <div className="flex justify-between items-start gap-1">
                      <div>
                        <span className="mono-label text-[7px] text-cyan-400 block mb-1">{routingInfo.fieldManagerTitle || 'Ward Executive'}</span>
                        <h4 className="text-[11px] font-black text-slate-200 leading-none">{routingInfo.executiveEngineer}</h4>
                        <p className="text-[9px] text-[#55555f] mt-1">{routingInfo.authorityName}</p>
                      </div>
                      <span className="text-[7px] font-bold uppercase text-slate-400 border border-white/[0.08] bg-slate-900/60 px-1.5 py-0.5 rounded-sm">
                        {routingInfo.jurisdictionType.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="border-t border-white/[0.04] pt-2 flex justify-between text-[8px] font-mono text-slate-400">
                      <span>{routingInfo.contactEmail}</span>
                      <span>{routingInfo.contactPhone}</span>
                    </div>
                  </div>

                  {/* Decision Path */}
                  <div className="space-y-1">
                    <span className="mono-label text-[7.5px]">DECISION ROUTING PATH</span>
                    <div className="p-2.5 rounded-lg border border-white/[0.04] bg-slate-950 font-mono text-[7px] text-[#55555f] space-y-1">
                      {routingInfo.routingTrail.map((t, idx) => (
                        <div key={idx} className="flex gap-1">
                          <span className="text-cyan-500/50">›</span>
                          <span className={idx === routingInfo.routingTrail.length - 1 ? 'text-slate-300' : ''}>{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* User interactive Map locator confirmation */}
                  <div className="space-y-1">
                    <span className="mono-label text-[7.5px]">VERIFY RESOLVED GEOLOCATION</span>
                    <div className="h-28 rounded-xl overflow-hidden border border-white/[0.08]">
                      <WizardMap 
                        center={coordinates} 
                        onChange={setCoordinates}
                        roadId={associatedRoadId}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleSubmit}
                className="w-full py-3.5 rounded-2xl bg-cyan-400 hover:bg-cyan-500 text-slate-950 text-xs font-black tracking-widest uppercase hover:scale-101 active:scale-99 transition-all cursor-pointer shadow-lg shadow-cyan-400/10"
              >
                PUBLISH CIVIC TICKET
              </button>
              <button
                onClick={() => setStep(3)}
                className="w-full py-2.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.02] text-muted-foreground hover:text-slate-200 text-[10px] uppercase font-bold tracking-wider transition-all"
              >
                Back to Diagnostics
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
           STEP 5: SUCCESS PUBLISH / OFFLINE TICKET CACHED
           ══════════════════════════════════════════════════════════ */}
        {step === 5 && ticketResult && (
          <div className="flex-1 flex flex-col p-6 justify-between animate-in zoom-in-95 duration-200 text-center">
            <div className="space-y-6 pt-12">
              <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle className="w-6 h-6" />
              </div>
              
              <div className="space-y-2 max-w-[240px] mx-auto">
                <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest">
                  {isOnline ? 'TICKET PUBLISHED' : 'TICKET QUEUED OFFLINE'}
                </h3>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {isOnline 
                    ? 'Report successfully uploaded and dispatched. Decency timeline audit monitors active.'
                    : 'Network connection unavailable. Bounding parameters and SVG vector matrix successfully enqueued in local IndexedDB store.'}
                </p>
              </div>

              {/* Ticket specifications */}
              <div className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01] max-w-xs mx-auto space-y-1.5 text-[9px] text-left">
                <div className="flex justify-between font-mono">
                  <span className="text-[#55555f]">TICKET ID:</span>
                  <span className="text-slate-350 font-bold">{ticketResult.clientTempId || `RW-2026-${ticketResult.id}`}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-[#55555f]">DISPATCH:</span>
                  <span className="text-slate-350 font-bold capitalize">{isOnline ? 'Active Ledger' : 'Local Cache Queue'}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-[#55555f]">COORDINATES:</span>
                  <span className="text-slate-350">{coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-[#55555f]">RESOLVED ROAD:</span>
                  <span className="text-slate-350">{roadName}</span>
                </div>
              </div>

              {!isOnline && (
                <div className="max-w-xs mx-auto p-3.5 bg-amber-955/40 border border-amber-550/20 rounded-xl flex flex-col gap-1.5 text-[9.5px] text-amber-400 text-left">
                  <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-amber-400">
                    <WifiOff className="w-4 h-4 animate-pulse" />
                    <span>Offline Sync Engaged</span>
                  </div>
                  <p className="text-[8.5px] text-amber-400/60 leading-relaxed font-mono">
                    A secure cryptographic payload containing localized distress metrics, coordinate parameters, and your defect video frame has been cached to IndexedDB. Synchronization will initiate automatically once network telemetry is restored.
                  </p>
                  <div className="border-t border-amber-500/10 pt-1.5 flex justify-between font-mono text-[8px] opacity-75">
                    <span>QUEUE SIZE: +1 Grievance</span>
                    <span>INDEXEDDB V2</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3.5 rounded-2xl bg-cyan-400 hover:bg-cyan-500 text-slate-950 text-xs font-black tracking-widest uppercase hover:scale-101 active:scale-99 transition-all cursor-pointer"
            >
              CLOSE SCANNER MODULE
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
