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
import { API_BASE } from '@/services/api';
import { OfflineSyncManager } from '@/services/offlineSync';
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

const REPORT_CATEGORIES: { value: ComplaintCategory; label: string }[] = [
  { value: 'pothole', label: 'Pothole' },
  { value: 'paving_defect', label: 'Paving defect' },
  { value: 'waterlogging', label: 'Waterlogging' },
  { value: 'debris', label: 'Debris' },
  { value: 'missing_signage', label: 'Missing signage' },
];

export default function ComplaintWizard() {
  const { 
    isReporting, 
    setIsReporting, 
    isOnline, 
    queueComplaint 
  } = useStore();

  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState(false);

  // Form details resolved by AI and customized by user
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('pothole');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [coordinates, setCoordinates] = useState<[number, number]>([19.1242, 72.8422]); // SV Road defaults
  const [associatedRoadId, setAssociatedRoadId] = useState<number | null>(null);
  const [roadName, setRoadName] = useState('S.V. Road');
  const [defectSize, setDefectSize] = useState('Not measured');

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

  // Device position, shown on the scanner and used for reports typed by hand
  const [gps, setGps] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (step !== 2 || !navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(
      position => setGps([position.coords.latitude, position.coords.longitude]),
      () => setGps(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [step]);

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

  // Real analysis: send the photo to the backend vision pipeline. Nothing is
  // filed yet (persist=false); the citizen reviews the result first.
  const analyzePhoto = async (photo: Blob) => {
    setPhotoError(null);
    setManualEntry(false);
    setStep(3);
    setAiAnalyzing(true);
    try {
      const compressed = await OfflineSyncManager.compressMediaAsset(photo);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(compressed);
      });
      setPhotoPreview(dataUrl);

      const body = new FormData();
      body.append('image', compressed, 'road-photo.jpg');
      body.append('persist', 'false');
      const position = await new Promise<GeolocationPosition | null>(resolve => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 4000 });
      });
      if (position) {
        body.append('latitude', String(position.coords.latitude));
        body.append('longitude', String(position.coords.longitude));
      }

      const response = await fetch(`${API_BASE}/chat/analyze-photo`, { method: 'POST', body });
      if (!response.ok) throw new Error('The photo could not be analysed.');
      const lines = (await response.text()).split('\n').filter(Boolean).map(line => JSON.parse(line));
      const failure = lines.find(line => line.type === 'error');
      if (failure) throw new Error(failure.content);
      const telemetry = lines.find(line => line.type === 'telemetry');
      const analysis = lines.find(line => line.type === 'metadata')?.analysis;
      if (!analysis) throw new Error('The photo could not be analysed.');

      const allowed: ComplaintCategory[] = ['pothole', 'paving_defect', 'waterlogging', 'debris', 'missing_signage'];
      const detected: ComplaintCategory = allowed.includes(analysis.defect_type) ? analysis.defect_type : 'paving_defect';
      const label = detected.replace('_', ' ');
      const point: [number, number] = telemetry?.latitude != null
        ? [telemetry.latitude, telemetry.longitude]
        : coordinates;
      setCoordinates(point);
      setCategory(detected);
      setSeverity(analysis.severity === 'emergency' ? 'critical' : analysis.severity);
      setDefectSize(`${analysis.width_m} m wide, depth ${analysis.depth_cm} cm`);
      setTitle(`${label.charAt(0).toUpperCase()}${label.slice(1)} reported by photo`);
      setDescription(analysis.recommended_action || `Road ${label} identified from a citizen photo.`);
      const nearest = findNearestRoad(point[0], point[1]);
      setAssociatedRoadId(nearest ? nearest.id : null);
      setRoadName(nearest ? nearest.name : 'Unmapped Ward Segment');
      setAiAnalyzing(false);
    } catch (err) {
      // Offline or AI failure: keep any photo and let the citizen describe it.
      setAiAnalyzing(false);
      const reason = err instanceof Error ? err.message : 'The photo could not be analysed.';
      setPhotoError(`${reason} Describe the damage below instead.`);
      startManualEntry();
    }
  };

  const startManualEntry = () => {
    const point = gps ?? coordinates;
    const nearest = findNearestRoad(point[0], point[1]);
    setCoordinates(point);
    setAssociatedRoadId(nearest ? nearest.id : null);
    setRoadName(nearest ? nearest.name : 'Unmapped Ward Segment');
    setDefectSize('Not measured');
    setTitle('');
    setDescription('');
    setManualEntry(true);
    setStep(3);
  };

  const restartScan = () => {
    setManualEntry(false);
    setPhotoPreview(null);
    setPhotoError(null);
    setStep(2);
  };

  const captureWebcamFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(blob => { if (blob) analyzePhoto(blob); }, 'image/jpeg', 0.85);
  };

  const handleCapture = () => {
    setShutterFlashing(true);
    setTimeout(() => setShutterFlashing(false), 150);
    captureWebcamFrame();
  };

  // Routing trigger
  useEffect(() => {
    if (step === 4) {
      const routing = routeComplaint(coordinates[1], coordinates[0], associatedRoadId);
      setRoutingInfo(routing);
    }
  }, [step, coordinates, associatedRoadId]);

  // Submit Handler
  const handleSubmit = async () => {
    if (!routingInfo) return;

    const complaintData = {
      title: title || `${REPORT_CATEGORIES.find(option => option.value === category)?.label ?? 'Road defect'} report`,
      description,
      category,
      geometry: {
        type: 'Point' as const,
        coordinates: [coordinates[1], coordinates[0]] as [number, number] // [lng, lat]
      },
      status: 'pending' as const,
      assignedAuthorityId: routingInfo.authorityId,
      roadId: associatedRoadId || undefined,
      imagePreview: photoPreview ?? undefined
    };

    setSubmitError(null);
    try {
      const ticket = await queueComplaint(complaintData);
      setTicketResult(ticket);
      setStep(5);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'This report could not be filed.');
    }
  };

  const handleClose = () => {
    setPhotoPreview(null);
    setPhotoError(null);
    setSubmitError(null);
    stopWebcam();
    setIsReporting(false);
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setManualEntry(false);
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
                <div className="absolute inset-0 flex w-full h-full flex-col items-center justify-center gap-2 px-8 text-center">
                  <Camera className="h-6 w-6 text-slate-500" aria-hidden />
                  <p className="text-[12px] text-slate-300">
                    {webcamAvailable ? 'Camera is off. Turn it on, or upload a road photo.' : 'Camera is not available. Upload a road photo instead.'}
                  </p>
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

              {/* Telemetry metadata layers */}
              <div className="absolute top-4 left-6 right-6 flex justify-between items-start pointer-events-none z-20">
                <div className="bg-slate-950/60 backdrop-blur-md px-2 py-1 border border-white/[0.04] rounded-sm space-y-0.5">
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-cyan-400 animate-ping inline-block" />
                    <span className="mono-label text-[7px] text-cyan-400">{gps ? 'GPS LOCKED' : 'GPS UNAVAILABLE'}</span>
                  </div>
                  <div className="mono-readout text-[8px] font-bold text-slate-350 tracking-wider">
                    {gps ? `${gps[0].toFixed(5)}, ${gps[1].toFixed(5)}` : 'Set on map later'}
                  </div>
                </div>
                
                <div className="bg-slate-950/60 backdrop-blur-md px-2 py-1 border border-white/[0.04] rounded-sm text-right">
                  <div className="mono-label text-[7px]">SIGNAL DEPTH</div>
                  <div className="mono-readout text-[8px] text-slate-350">
                    {isWebcamActive ? 'CAMERA ON' : 'CAMERA OFF'}
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
                      <MonitorPlay className="w-3.5 h-3.5" /> TURN OFF CAMERA
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
              
              <label className="mx-auto cursor-pointer rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-[11px] font-semibold text-cyan-300">
                Upload a road photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  aria-label="Upload a road photo"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    if (file) analyzePhoto(file);
                    event.target.value = '';
                  }}
                />
              </label>
              {photoError && <p role="alert" className="px-2 text-center text-[11px] text-rose-300">{photoError}</p>}
              <button type="button" onClick={startManualEntry} className="mx-auto text-[11px] text-slate-300 underline underline-offset-2 hover:text-cyan-300">
                No photo? Describe the damage instead
              </button>

              {/* Giant shutter layout */}
              <div className="flex items-center justify-center py-2">
                <button
                  onClick={handleCapture}
                  disabled={!isWebcamActive}
                  className="w-16 h-16 rounded-full border-4 border-slate-900 flex items-center justify-center transition-all bg-white relative hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-white/5 disabled:cursor-not-allowed disabled:opacity-40"
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
              {(aiAnalyzing || photoPreview) && (
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] min-h-[200px]">
                {photoPreview
                  ? <img src={photoPreview} alt="Road photo attached to this report" className="h-[200px] w-full object-cover" />
                  : <div className="h-[200px] w-full bg-slate-950" />}

                {aiAnalyzing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/85 backdrop-blur-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                    <span className="mono-label text-[8px] text-cyan-500/80 tracking-[0.15em] text-center px-4 font-mono">
                      {analysisProgressText}
                    </span>
                  </div>
                )}
              </div>

              )}

              {photoError && <p role="alert" className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200">{photoError}</p>}

              {manualEntry ? (
                <div className="space-y-3">
                  <label className="block space-y-1 text-[12px] text-slate-200">
                    <span>What is the problem?</span>
                    <select
                      value={category}
                      onChange={event => setCategory(event.target.value as ComplaintCategory)}
                      className="w-full rounded-lg border border-white/[0.1] bg-slate-950 px-3 py-2 text-[13px] text-slate-100"
                    >
                      {REPORT_CATEGORIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="block space-y-1 text-[12px] text-slate-200">
                    <span>Describe the damage and where it is</span>
                    <textarea
                      value={description}
                      onChange={event => setDescription(event.target.value)}
                      rows={4}
                      minLength={10}
                      placeholder="e.g. Large pile of construction debris blocking the left lane near the bus stop"
                      className="w-full rounded-lg border border-white/[0.1] bg-slate-950 px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-600"
                    />
                    <span className={`block text-[11px] ${description.trim().length < 10 ? 'text-amber-300' : 'text-emerald-400'}`}>
                      {description.trim().length < 10
                        ? `Write at least 10 characters to continue (${description.trim().length}/10).`
                        : 'Looks good. Continue to check the location.'}
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-400">Nearest road: {roadName}. You can correct the pin on the next step.</p>
                </div>
              ) : (
              <>
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
              </>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setStep(4)}
                disabled={aiAnalyzing || (manualEntry && description.trim().length < 10)}
                className="w-full py-3.5 rounded-2xl bg-cyan-400 hover:bg-cyan-500 text-slate-950 text-xs font-black tracking-widest uppercase disabled:bg-slate-900 disabled:text-slate-600 transition-all cursor-pointer shadow-lg shadow-cyan-400/10"
              >
                {manualEntry ? 'Continue to location' : 'Confirm and route report'}
              </button>
              <button
                onClick={restartScan}
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
              {submitError && (
                <p role="alert" className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-[11px] leading-4 text-rose-300">
                  {submitError}
                </p>
              )}
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
                  <span className="text-slate-350 font-bold">{`CMP-${String(ticketResult.id).padStart(5, '0')}`}</span>
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
