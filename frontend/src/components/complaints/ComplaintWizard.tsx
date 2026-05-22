'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  MapPin, 
  Camera, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  Landmark, 
  ShieldAlert,
  Loader2,
  HardHat,
  WifiOff,
  CloudLightning,
  Trash2
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { routeComplaint, RoutingResult } from '@/services/routingEngine';
import { ComplaintCategory, Complaint } from '@/types';
import { roads } from '@/data/mockData';

// Dynamically load the wizard map to prevent Next.js SSR crashes
const WizardMap = dynamic(
  () => import('./WizardMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-48 bg-slate-900 rounded-lg flex items-center justify-center border border-border">
        <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
        <span className="text-xs text-muted-foreground ml-2">Loading GIS Locator Frame...</span>
      </div>
    )
  }
);

export default function ComplaintWizard() {
  const { 
    isReporting, 
    setIsReporting, 
    isOnline, 
    queueComplaint 
  } = useStore();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('pothole');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [coordinates, setCoordinates] = useState<[number, number]>([19.0760, 72.8777]); // Mumbai default
  const [associatedRoadId, setAssociatedRoadId] = useState<number | null>(null);
  
  // Image Upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Routing and AI states
  const [routingInfo, setRoutingInfo] = useState<RoutingResult | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<ComplaintCategory | null>(null);
  const [suggestedSeverity, setSuggestedSeverity] = useState<'low' | 'medium' | 'high' | 'critical' | null>(null);

  // Ticket creation success reference
  const [ticketResult, setTicketResult] = useState<Complaint | null>(null);

  // Close helper
  const handleClose = () => {
    setIsReporting(false);
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setTitle('');
    setDescription('');
    setCategory('pothole');
    setSeverity('medium');
    setCoordinates([19.0760, 72.8777]);
    setAssociatedRoadId(null);
    setImageFile(null);
    setImagePreview(null);
    setUploadProgress(0);
    setIsUploading(false);
    setRoutingInfo(null);
    setTicketResult(null);
    setShowAiSuggestion(false);
  };

  // Heuristic AI Analysis on description typing
  useEffect(() => {
    if (description.length < 8) {
      setShowAiSuggestion(false);
      return;
    }

    const timer = setTimeout(() => {
      setAiAnalyzing(true);
      
      // Keywords heuristics
      const text = description.toLowerCase();
      let catSug: ComplaintCategory | null = null;
      let sevSug: 'low' | 'medium' | 'high' | 'critical' | null = null;

      if (text.includes('flood') || text.includes('water') || text.includes('clogged') || text.includes('drain')) {
        catSug = 'waterlogging';
      } else if (text.includes('pothole') || text.includes('crater') || text.includes('hole')) {
        catSug = 'pothole';
      } else if (text.includes('paver') || text.includes('brick') || text.includes('tiles') || text.includes('crack')) {
        catSug = 'paving_defect';
      } else if (text.includes('trash') || text.includes('debris') || text.includes('sand') || text.includes('mud')) {
        catSug = 'debris';
      } else if (text.includes('sign') || text.includes('board') || text.includes('light') || text.includes('divider')) {
        catSug = 'missing_signage';
      }

      if (text.includes('dangerous') || text.includes('critical') || text.includes('blocks') || text.includes('accident')) {
        sevSug = 'critical';
      } else if (text.includes('deep') || text.includes('severe') || text.includes('highway')) {
        sevSug = 'high';
      } else if (text.includes('minor') || text.includes('small')) {
        sevSug = 'low';
      }

      setSuggestedCategory(catSug);
      setSuggestedSeverity(sevSug);
      setAiAnalyzing(false);

      if (catSug || sevSug) {
        setShowAiSuggestion(true);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [description]);

  // Apply AI Suggestion
  const applyAiSuggestion = () => {
    if (suggestedCategory) setCategory(suggestedCategory);
    if (suggestedSeverity) setSeverity(suggestedSeverity);
    setShowAiSuggestion(false);
  };

  // Geo-Routing lookup trigger
  useEffect(() => {
    // Re-run routing when coordinates or road references change
    const routing = routeComplaint(coordinates[1], coordinates[0], associatedRoadId);
    setRoutingInfo(routing);
  }, [coordinates, associatedRoadId]);

  // Image Upload handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    simulateUpload();
  };

  const simulateUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setUploadProgress(0);
    setIsUploading(false);
  };

  // Submit Handler
  const handleSubmit = () => {
    if (!routingInfo) return;

    const complaintData = {
      title: title || `${category.replace('_', ' ')} defect report`,
      description,
      category,
      geometry: {
        type: 'Point' as const,
        coordinates: [coordinates[1], coordinates[0]] as [number, number] // Save as [longitude, latitude]
      },
      status: 'pending' as const,
      assignedAuthorityId: routingInfo.authorityId,
      roadId: associatedRoadId || undefined
    };

    // Store action queues or saves immediately
    const ticket = queueComplaint(complaintData);
    setTicketResult(ticket);
    setStep(5);
  };

  if (!isReporting) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Modal Card wrapper */}
      <div className="w-full max-w-xl bg-slate-950 border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-xs uppercase font-extrabold tracking-wider text-slate-100">
                Civic Defect reporting wizard
              </h2>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Automated geo-routing and offline-queue tracking</p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="p-1 rounded-lg border border-border hover:bg-slate-900 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="px-6 py-3 bg-slate-900/30 border-b border-border/30 flex items-center justify-between text-[10px] select-none font-extrabold">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center border font-bold ${
                step === s 
                  ? 'bg-cyan-500 border-cyan-500 text-slate-950 shadow-md shadow-cyan-500/10'
                  : step > s 
                  ? 'bg-cyan-950/50 border-cyan-850 text-cyan-400'
                  : 'bg-slate-950 border-border text-slate-500'
              }`}>
                {s}
              </span>
              <span className={`hidden sm:inline uppercase tracking-widest ${
                step === s ? 'text-slate-200' : 'text-slate-500'
              }`}>
                {s === 1 ? 'Details' : s === 2 ? 'Location' : s === 3 ? 'Evidence' : 'Audit Routing'}
              </span>
              {s < 4 && <div className="flex-1 h-0.5 bg-border/40 mx-2 hidden sm:block"></div>}
            </div>
          ))}
        </div>

        {/* Content Pane */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* STEP 1: DEFECT DETAILS */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Brief summary of defect</label>
                <input 
                  type="text" 
                  placeholder="e.g. Deep pothole next to junction signal"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-border/80 rounded-lg placeholder-muted-foreground focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Detailed Description</label>
                <textarea 
                  rows={4}
                  placeholder="Describe the defect, dimensions, water logging, or hazardous traffic details. AI will parse this to route authority..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-border/80 rounded-lg placeholder-muted-foreground focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* AI Suggestion box */}
              {showAiSuggestion && (
                <div className="p-3 bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border border-cyan-800/60 rounded-xl flex items-start gap-2.5 animate-in slide-in-from-top-2">
                  <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1.5 flex-1">
                    <span className="text-[9px] uppercase font-bold text-cyan-400 tracking-wider">ROADWATCH AI Suggestion</span>
                    <p className="text-[10px] text-slate-300 leading-normal">
                      Based on description, AI classified:
                      {suggestedCategory && <span> Category: <strong className="text-cyan-300 uppercase">{suggestedCategory}</strong></span>}
                      {suggestedSeverity && <span> Severity: <strong className="text-cyan-300 uppercase">{suggestedSeverity}</strong></span>}
                    </p>
                    <button 
                      onClick={applyAiSuggestion}
                      className="text-[9px] font-extrabold bg-cyan-500 text-slate-950 px-2 py-0.8 rounded hover:bg-cyan-400"
                    >
                      Apply Suggested Filters
                    </button>
                  </div>
                </div>
              )}

              {aiAnalyzing && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>AI running diagnostic parse...</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                    className="w-full px-2 py-2 text-xs bg-slate-900 border border-border/80 rounded-lg focus:outline-none focus:border-cyan-500 text-slate-200 capitalize"
                  >
                    <option value="pothole">Pothole</option>
                    <option value="paving_defect">Paving Defect</option>
                    <option value="waterlogging">Waterlogging</option>
                    <option value="debris">Debris Dumping</option>
                    <option value="missing_signage">Missing Signage</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Severity</label>
                  <select 
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full px-2 py-2 text-xs bg-slate-900 border border-border/80 rounded-lg focus:outline-none focus:border-cyan-500 text-slate-200 capitalize"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="critical">Critical Hazard</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: LOCATION PIN SELECTION */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Select road reference (Optional)</h4>
                <select
                  value={associatedRoadId || ''}
                  onChange={(e) => setAssociatedRoadId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-2 py-2 text-xs bg-slate-900 border border-border/80 rounded-lg focus:outline-none focus:border-cyan-500 text-slate-200"
                >
                  <option value="">Select general region location (no road segment)</option>
                  {roads.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.roadCode})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Drop Location Pin on map</label>
                <div className="h-56 rounded-xl overflow-hidden border border-border">
                  <WizardMap 
                    center={coordinates} 
                    onChange={setCoordinates}
                    roadId={associatedRoadId}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] text-muted-foreground font-semibold bg-slate-900/50 p-2 rounded border border-border/40">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-cyan-400" /> GPS Lat/Lng</span>
                  <span className="font-mono text-slate-350">{coordinates[0].toFixed(5)}, {coordinates[1].toFixed(5)}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: MOCK IMAGE EVIDENCE UPLOAD */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">evidence capture (Photo upload)</label>
              
              {!imagePreview ? (
                <div className="border-2 border-dashed border-border hover:border-cyan-500/40 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-900/10 hover:bg-slate-900/25 relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Camera className="w-8 h-8 text-cyan-455 mb-2.5" />
                  <h4 className="text-xs font-bold text-slate-200">Select Defect Photo</h4>
                  <p className="text-[10px] text-muted-foreground mt-1 max-w-[220px]">Upload a JPG or PNG representing pothole size or waterlogging depths.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden border border-border h-48 bg-slate-950 flex items-center justify-center">
                    <img 
                      src={imagePreview} 
                      alt="Uploaded defect proof" 
                      className={`object-contain max-h-full max-w-full ${isUploading ? 'opacity-40 blur-sm' : ''}`}
                    />
                    
                    {!isUploading && (
                      <button
                        onClick={clearImage}
                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-950/80 border border-red-900 text-red-400 hover:bg-red-900 hover:text-slate-100 transition-all shadow-md"
                        aria-label="Remove Image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {isUploading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-slate-950/60">
                        <Loader2 className="w-7 h-7 animate-spin text-cyan-400" />
                        <span className="text-[10px] font-bold text-slate-350 uppercase tracking-widest">Uploading Photo... {uploadProgress}%</span>
                      </div>
                    )}
                  </div>

                  {isUploading && (
                    <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                      <div className="h-full bg-cyan-500 transition-all duration-150" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: INTELLECTUAL ROUTING AUDIT REVIEW */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-250 border-b border-border/40 pb-1.5 flex items-center gap-1"><Landmark className="w-4 h-4 text-cyan-400" /> AI Authority Routing Audit</h3>
              
              {routingInfo && (
                <div className="space-y-4">
                  {/* Responsible Officer Card */}
                  <div className="p-4 rounded-xl border border-border/80 bg-slate-900/30 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 inline-block mb-1.5">Assigned Ward Executive</span>
                        <h4 className="text-xs font-black text-slate-200 leading-none">{routingInfo.executiveEngineer}</h4>
                        <p className="text-[10px] text-muted-foreground mt-1">{routingInfo.authorityName}</p>
                      </div>
                      <span className="text-[8px] font-black uppercase text-cyan-400 border border-cyan-900/60 bg-cyan-950/40 px-2 py-0.5 rounded">
                        {routingInfo.jurisdictionType.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="border-t border-border/30 pt-2 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground font-semibold">
                      <span>Email: <strong className="text-slate-350">{routingInfo.contactEmail}</strong></span>
                      <span>Phone: <strong className="text-slate-350">{routingInfo.contactPhone}</strong></span>
                    </div>
                  </div>

                  {/* Routing Decision Path */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Decisions Trail</h4>
                    <div className="p-3.5 rounded-lg border border-border/40 bg-slate-950/60 font-mono text-[9px] text-slate-350 space-y-1.5">
                      {routingInfo.routingTrail.map((t, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="text-cyan-400 shrink-0 select-none">→</span>
                          <span>{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: SUCCESS SUBMISSION OUTCOME */}
          {step === 5 && ticketResult && (
            <div className="py-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 bg-emerald-950/60 border border-emerald-800 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10">
                <CheckCircle className="w-7 h-7" />
              </div>
              
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest">
                  {isOnline ? 'Defect Report Published' : 'Offline Mode: Ticket Queued'}
                </h3>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  {isOnline 
                    ? 'Your complaint has been successfully routed to the Executive Engineer. Decency timelines check is active.'
                    : 'Network connection is offline. The report has been queued locally in LocalStorage and will sync automatically when connection restores.'}
                </p>
              </div>

              {/* Ticket Details */}
              <div className="max-w-xs mx-auto p-4 rounded-xl border border-border bg-slate-900/25 space-y-2 text-[10px] text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tracking ID:</span>
                  <strong className="font-mono text-cyan-400">{ticketResult.clientTempId || `RW-2026-${ticketResult.id}`}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <strong className="capitalize text-slate-200">{isOnline ? 'Routed' : 'Queued (Offline)'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department:</span>
                  <strong className="text-slate-200">{routingInfo?.departmentCode}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <strong className="capitalize text-slate-250">{ticketResult.category.replace('_', ' ')}</strong>
                </div>
              </div>
              
              {!isOnline && (
                <div className="max-w-xs mx-auto p-2 bg-red-950/20 border border-red-900/60 rounded-lg flex items-center justify-center gap-1.5 text-[9.5px] text-red-400">
                  <WifiOff className="w-3.5 h-3.5 animate-pulse" />
                  <span>Offline Sync Queue Increment +1</span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer controls */}
        {step < 5 && (
          <div className="px-6 py-4 border-t border-border/60 bg-slate-900/25 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider bg-slate-950 border border-border hover:bg-slate-900 text-slate-300 px-4 py-2 rounded-xl transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && (!title || !description)}
                className={`flex items-center gap-1 text-[10px] uppercase font-extrabold tracking-wider bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 px-4 py-2 rounded-xl transition-all shadow-md shadow-cyan-500/10 ${
                  step === 1 && (!title || !description) ? 'cursor-not-allowed shadow-none' : 'active:scale-95'
                }`}
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-widest bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
              >
                Submit Defect Report <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="px-6 py-4 border-t border-border/60 bg-slate-900/25 text-center">
            <button
              onClick={handleClose}
              className="text-[10px] uppercase font-extrabold tracking-wider bg-slate-950 border border-border/80 hover:bg-slate-900 text-slate-350 hover:text-slate-200 px-5 py-2 rounded-xl transition-all"
            >
              Close Reporting Panel
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
