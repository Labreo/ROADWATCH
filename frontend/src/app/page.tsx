'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, getActiveTemplate } from '@/services/regionAwareFormat';
import { 
  Search, 
  MapPin, 
  SlidersHorizontal, 
  HardHat, 
  TrendingUp, 
  AlertTriangle, 
  AlertCircle,
  ShieldCheck, 
  User, 
  Award, 
  ShieldAlert, 
  Clock, 
  ArrowRight, 
  FileText, 
  CheckCircle, 
  Landmark, 
  Coins, 
  ChevronRight,
  Plus,
  RefreshCw,
  HelpCircle,
  Activity,
  Menu
} from 'lucide-react';

import { useStore, AppView } from '@/store/useStore';
import { 
  roads, 
  contractors, 
  projects, 
  authorities, 
  getAuthority,
  getContractor,
  getProjectsForRoad,
  getComplaintsForRoad
} from '@/data/mockData';
import { Road, Contractor, Project, Complaint } from '@/types';

import MapWrapper from '@/components/map/MapWrapper';
import RoadDetailsPanel from '@/components/dashboard/RoadDetailsPanel';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import EmptyState from '@/components/shared/EmptyState';
import { DashboardStatsSkeleton } from '@/components/shared/LoadingState';
import { OfflineSyncManager } from '@/services/offlineSync';
import ComplaintTimeline from '@/components/complaints/ComplaintTimeline';
import ComplaintWizard from '@/components/complaints/ComplaintWizard';
import SyncCenter from '@/components/transparency/SyncCenter';
import ChatPanel from '@/components/chat/ChatPanel';
import ChatOrchestrator from '@/components/chat/ChatOrchestrator';
import OverviewScreen from '@/components/live/OverviewScreen';
import OperationsScreen from '@/components/live/OperationsScreen';
import LedgerScreen from '@/components/live/LedgerScreen';
import ContractorsScreen from '@/components/live/ContractorsScreen';
import RegionsScreen from '@/components/live/RegionsScreen';
import SensorsScreen from '@/components/live/SensorsScreen';
import PlaybackScreen from '@/components/live/PlaybackScreen';
import MyReportsScreen from '@/components/live/MyReportsScreen';
import { apiGet } from '@/services/api';

import DigitalTwinView from '@/components/twin/DigitalTwinView';
import BottomSheet from '@/components/shared/BottomSheet';
import Card from '@/components/shared/Card';

// Transparency & Budget dashboard imports
import { calculateRoadTransparency, getScoreGrade, getCitywideTransparencyData } from '@/services/transparencyEngine';
import SpendingComparisonChart from '@/components/transparency/SpendingComparisonChart';
import RepairFrequencyHeatmap from '@/components/transparency/RepairFrequencyHeatmap';
import BudgetTimeline from '@/components/transparency/BudgetTimeline';
import ContractorHistoryCard from '@/components/transparency/ContractorHistoryCard';
import TransparencyScoreCard from '@/components/transparency/TransparencyScoreCard';
import SankeyFlowVisualizer from '@/components/transparency/SankeyFlowVisualizer';

interface LiveRoad {
  id: number; name: string; road_code: string; road_type: Road['roadType']; status: Road['status'];
  length_km: number; last_relaying_date: string | null; coordinates: [number, number][];
  surface_type: Road['surfaceType'] | null; lane_count: number | null; width_m: number | null; aadt: number | null;
}

const toRoad = (row: LiveRoad): Road => ({
  id: row.id,
  name: row.name,
  roadCode: row.road_code,
  roadType: row.road_type,
  status: row.status,
  lengthKm: Number(row.length_km),
  authorityId: roads.find(existing => existing.id === row.id)?.authorityId ?? 0,
  lastRelayingDate: row.last_relaying_date ?? '',
  geometry: { type: 'LineString', coordinates: row.coordinates },
  surfaceType: row.surface_type ?? undefined,
  laneCount: row.lane_count ?? undefined,
  widthM: row.width_m === null ? undefined : Number(row.width_m),
  aadt: row.aadt ?? undefined,
});

interface LiveComplaint {
  id: number; client_temp_id: string | null; title: string; description: string; category: Complaint['category'];
  status: Complaint['status']; priority: number; escalation_level: Complaint['escalationLevel']; created_at: string;
  assigned_authority_id: number | null; road_id: number | null; image_url: string | null;
  target_resolution_hours: number; sla_breached_at: string | null; last_escalated_at: string | null;
  coordinates: [number, number];
}

const toComplaint = (row: LiveComplaint): Complaint => ({
  id: row.id,
  clientTempId: row.client_temp_id ?? undefined,
  title: row.title,
  description: row.description,
  category: row.category,
  geometry: { type: 'Point', coordinates: row.coordinates },
  status: row.status,
  escalationLevel: row.escalation_level,
  priority: row.priority,
  slaBreachedAt: row.sla_breached_at ?? undefined,
  lastEscalatedAt: row.last_escalated_at ?? undefined,
  targetResolutionHours: row.target_resolution_hours,
  assignedAuthorityId: row.assigned_authority_id ?? 0,
  roadId: row.road_id ?? undefined,
  createdAt: row.created_at,
  imageUrl: row.image_url ?? undefined,
});

export default function Page() {
  const {
    activeView,
    setActiveView,
    regionCode,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    selectedRoadId,
    setSelectedRoadId,
    selectedComplaintId,
    setSelectedComplaintId,
    selectedContractorId,
    setSelectedContractorId,
    isChatDriven,
    isOnline,
    syncQueueCount,
    setIsReporting,
    complaintsList,
    offlineQueue,
    isPlaybackPlaying,
    playbackSpeed,
    stepPlaybackForward,
    setPlaybackPlaying,
    toggleSidebar,
    demoMode,
    setDemoMode,
    userRole,
    setUserRole,
  } = useStore();
  const [isSyncingUI, setIsSyncingUI] = useState(false);
  const [complaintsTab, setComplaintsTab] = useState<'reports' | 'sync'>('reports');

  // Bottom Drawer state for Conversational Cockpit
  const [drawerHeight, setDrawerHeight] = useState<number>(0);

  // Sync drawer height when activeView is driven by the chat stream
  useEffect(() => {
    if (isChatDriven && ['twin', 'roads', 'budgets', 'contractors', 'regions'].includes(activeView)) {
      setDrawerHeight(40);
    } else {
      setDrawerHeight(0);
    }
  }, [activeView, isChatDriven]);

  // Computed data for drawer
  const drawerRoad = selectedRoadId ? roads.find(r => r.id === selectedRoadId) : null;
  const drawerProjects = drawerRoad ? projects.filter(p => p.roadId === drawerRoad.id) : projects;

  // Replace the bundled road list with database rows when the backend is up.
  // Every consumer reads the shared `roads` array, so update it in place.
  const [, setLiveRoadsVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const load = () => Promise.all([
      apiGet<LiveRoad[]>(`/screens/roads?region=${regionCode}`),
      apiGet<LiveComplaint[]>(`/screens/complaints?region=${regionCode}`),
    ]).then(([liveRoads, liveComplaints]) => {
      if (cancelled) return;
      if (liveRoads.length > 0) {
        roads.splice(0, roads.length, ...liveRoads.map(toRoad));
        setLiveRoadsVersion(version => version + 1);
      }
      const saved = new Set(liveComplaints.map(row => row.client_temp_id));
      // Keep reports still queued on this device until the server has them.
      const queued = useStore.getState().complaintsList.filter(c => c.clientTempId && c.id >= 100000 && !saved.has(c.clientTempId));
      useStore.setState({ complaintsList: [...queued, ...liveComplaints.map(toComplaint)] });
    }).catch(() => {
      // Offline: keep bundled data and try again until the backend answers.
      if (!cancelled) retry = setTimeout(load, 5000);
    });
    load();
    return () => {
      cancelled = true;
      clearTimeout(retry);
    };
  }, [regionCode]);

  // Initialize connection sync manager on mount
  useEffect(() => {
    OfflineSyncManager.initialize();
  }, []);

  // Timeline Playback Interval Controller
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (isPlaybackPlaying && activeView === 'playback') {
      intervalId = setInterval(() => {
        stepPlaybackForward();
      }, playbackSpeed);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaybackPlaying, playbackSpeed, stepPlaybackForward, activeView]);

  // Reset playback status when navigating away
  useEffect(() => {
    if (activeView !== 'playback') {
      setPlaybackPlaying(false);
    }
  }, [activeView, setPlaybackPlaying]);



  const formatShortINR = (value: number) => formatCurrency(value, true);

  // Compute Platform Metrics (dynamically from mock data and store)
  const stats = useMemo(() => {
    const totalAllocated = projects.reduce((acc, p) => acc + p.budgetAllocated, 0);
    const totalSpent = projects.reduce((acc, p) => acc + p.budgetSpent, 0);
    const activeComplaintsCount = complaintsList.filter(c => c.status !== 'resolved' && c.status !== 'rejected').length;
    const resolvedComplaintsCount = complaintsList.filter(c => c.status === 'resolved').length;
    const resolutionRate = complaintsList.length > 0 
      ? Math.round((resolvedComplaintsCount / complaintsList.length) * 100) 
      : 0;

    return {
      totalBudget: totalAllocated,
      totalSpent: totalSpent,
      activeComplaints: activeComplaintsCount,
      resolutionRate: resolutionRate,
      totalRoads: roads.length,
      blacklistedContractorsCount: contractors.filter(c => c.blacklisted).length,
      delayedProjectsCount: projects.filter(p => p.delayDays > 0 || p.status === 'halted').length
    };
  }, [complaintsList]);

  // Compute city-wide transparency details
  const citywideTransparency = useMemo(() => {
    return getCitywideTransparencyData(roads, projects, contractors, complaintsList);
  }, [complaintsList]);

  // Compute selected road transparency details
  const selectedRoadTransparency = useMemo(() => {
    if (!selectedRoadId) return null;
    const road = roads.find(r => r.id === selectedRoadId);
    if (!road) return null;
    return calculateRoadTransparency(road, projects, contractors, complaintsList);
  }, [selectedRoadId, complaintsList]);

  // Filtered Roads List
  const filteredRoads = useMemo(() => {
    return roads.filter(road => {
      const matchesSearch = road.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            road.roadCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || road.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  // Filtered Contractors List
  const filteredContractors = useMemo(() => {
    return contractors.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Filtered Projects (Budgets) List
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const road = roads.find(r => r.id === p.roadId);
      const contractor = contractors.find(c => c.id === p.contractorId);
      return p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (road && road.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
             (contractor && contractor.name.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  }, [searchQuery]);

  // Filtered Complaints List
  const [complaintCategoryFilter, setComplaintCategoryFilter] = useState<string>('all');
  const filteredComplaints = useMemo(() => {
    return complaintsList.filter(c => {
      const road = c.roadId ? roads.find(r => r.id === c.roadId) : null;
      const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (road && road.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = complaintCategoryFilter === 'all' || c.category === complaintCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [complaintsList, searchQuery, complaintCategoryFilter]);

  // Color utilities for list item status tags
  const getStatusTextClass = (status: string) => {
    switch (status) {
      case 'good': return 'text-emerald-400 border-emerald-900/60 bg-emerald-950/40';
      case 'fair': return 'text-amber-400 border-amber-900/60 bg-amber-950/40';
      case 'poor': return 'text-red-400 border-red-900/60 bg-red-950/40';
      case 'under_construction': return 'text-cyan-400 border-cyan-900/60 bg-cyan-950/40';
      default: return 'text-slate-400 border-border bg-slate-900';
    }
  };

  // State trigger for simulated complaint submissions
  const handleSimulateReport = () => {
    setIsReporting(true);
  };

  // Handle local sync queue processing
  const handleSyncQueue = async () => {
    if (syncQueueCount === 0) return;
    setIsSyncingUI(true);
    await OfflineSyncManager.triggerAutoSync();
    setIsSyncingUI(false);
  };

  return (
    <div className="flex flex-col gap-6 min-h-0 h-full">

      {/* VIEW 1: CIVIC PORTAL OVERVIEW (Frame 01) */}
      {!isChatDriven && activeView === 'dashboard' && (
        <ErrorBoundary>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <OverviewScreen />
          </div>
        </ErrorBoundary>
      )}
      {/* MY REPORTS (Frame 06) */}
      {!isChatDriven && activeView === 'reports' && (
        <ErrorBoundary>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <MyReportsScreen />
          </div>
        </ErrorBoundary>
      )}
      {/* VIEW 2: ROAD REGISTRY MAP VIEW (The primary road lookup slice) */}
      {!isChatDriven && activeView === 'roads' && (
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden animate-in fade-in duration-300 relative lg:pointer-events-none">
          
          {/* ════════════ DESKTOP LAYOUT (FLOATING SIDEBARS) ════════════ */}
          
          {/* Left Side: Road Search & Sidebar Explorer (Desktop only) */}
          <section className="hidden lg:flex w-full lg:w-[320px] lg:absolute lg:left-4 lg:top-4 lg:bottom-4 lg:z-10 lg:h-auto flex-col glass-panel border-t-2 border-t-cyan-500/35 rounded-xl pointer-events-auto p-4 space-y-4 relative z-10">
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 block">Quick Registry filter</label>
              <div className="relative">
                <Search className="absolute top-2.5 left-3 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Filter by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-border/80 rounded-lg placeholder-muted-foreground text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
              </div>
            </div>

            {/* Filtering Status Controls */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                <SlidersHorizontal className="w-3 h-3" />
                <span>Filter By Status</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'good', 'fair', 'poor', 'under_construction'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`text-[9px] px-2.5 py-1.5 rounded-lg font-bold border capitalize transition-all cursor-pointer ${
                      statusFilter === status 
                        ? 'bg-cyan-950/40 border-cyan-500 text-cyan-400 shadow-sm shadow-cyan-500/15'
                        : 'bg-slate-955/50 border-border/80 text-slate-300 hover:border-slate-650 hover:text-slate-100'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Roads List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              <div className="flex justify-between items-center text-[10px] text-muted-foreground px-1 pb-1.5 uppercase tracking-wider font-bold">
                <span>Road Segments</span>
                <span>{filteredRoads.length} loaded</span>
              </div>

              {filteredRoads.length > 0 ? (
                filteredRoads.map((road) => {
                  const isSelected = selectedRoadId === road.id;
                  return (
                    <div
                      key={road.id}
                      onClick={() => setSelectedRoadId(road.id)}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition-all hover-raise ${
                        isSelected 
                          ? 'bg-slate-900/95 border-cyan-500 shadow-premium-md glow-border-active'
                          : 'bg-slate-950/40 border-border/60'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1.5 gap-2">
                        <span className="text-[8.5px] font-mono font-bold text-cyan-400 bg-cyan-950/30 border border-cyan-900/40 px-1.5 py-0.5 rounded tracking-wider uppercase">
                          {road.roadCode}
                        </span>
                        <span className="text-[7px] font-mono font-bold text-slate-500 bg-slate-900 border border-border/60 px-1 py-0.5 rounded tracking-wider uppercase">
                          {road.roadType}
                        </span>
                        <span className={`text-[8px] font-extrabold uppercase border px-1.5 py-0.2 rounded tracking-wide ${getStatusTextClass(road.status)}`}>
                          {road.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 line-clamp-1 tracking-tight mb-2">{road.name}</h4>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground border-t border-border/30 pt-2">
                        <span className="flex items-center gap-1 font-semibold text-slate-400">
                          <MapPin className="w-3 h-3 text-zinc-550" />
                          {road.lengthKm} km
                        </span>
                        <span className="text-[9px] text-slate-455">Last Paved: {new Date(road.lastRelayingDate).toLocaleDateString(getActiveTemplate().locale, { year: '2-digit', month: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState 
                  type="no-search-results" 
                  actionText="Clear Filter" 
                  onAction={() => { setSearchQuery(''); setStatusFilter('all'); }} 
                />
              )}
            </div>
          </section>

          {/* Right Side: Selected Road Details Drawer/Panel (Desktop only) */}
          {selectedRoadId ? (
            <section className="hidden lg:flex w-full lg:w-[350px] lg:absolute lg:right-4 lg:top-4 lg:bottom-4 lg:z-10 lg:h-auto flex-col glass-panel border-t-2 border-t-cyan-500/35 rounded-xl overflow-hidden shadow-2xl pointer-events-auto relative z-10 transition-all duration-300 animate-in slide-in-from-bottom lg:slide-in-from-right">
              <RoadDetailsPanel />
            </section>
          ) : (
            <div className="hidden lg:block lg:absolute lg:right-4 lg:top-4 lg:bottom-4 lg:z-10 w-[320px] pointer-events-none" />
          )}

          {/* ════════════ MOBILE LAYOUT & OVERLAYS ════════════ */}

          {/* Mobile Top Floating Search Bar */}
          <div className="absolute top-4 inset-x-4 z-[1001] lg:hidden flex flex-col gap-2 pointer-events-auto max-w-sm mx-auto animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-lg border border-border/80 p-2.5 rounded-2xl shadow-2xl">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-xl bg-slate-900 border border-border text-slate-200 hover:text-cyan-400 transition-colors cursor-pointer"
                aria-label="Toggle Navigation Sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search road segment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Smart Nearby Telemetry Alerts Overlay */}
          <div className="absolute top-20 right-4 z-[1001] max-w-[285px] pointer-events-auto hidden md:block animate-in fade-in slide-in-from-top-4 duration-500">
            <Card depth="card" glow="rose" className="p-4 bg-slate-955/90 backdrop-blur-lg border border-red-500/30 border-t-2 border-t-red-500 shadow-2xl select-none">
              <div className="flex gap-2.5">
                <div className="status-beacon critical mt-1 animate-pulse" />
                <div className="space-y-1.5">
                  <span className="mono-label text-[8.5px] text-red-450 font-black tracking-wider block">NEARBY TELEMETRY WARN</span>
                  <p className="text-[10.5px] font-bold text-slate-100 leading-normal">
                    S.V. Road: Interlocking paving caved (High Priority). Clog reported 12m ago.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Mobile bottom sheets */}
          <div className="lg:hidden">
            {/* 1. Mobile Registry Explorer List Sheet */}
            <BottomSheet
              isOpen={!selectedRoadId}
              onClose={() => {}}
              title="Road Registry Explorer"
              snapPoints={[25, 55, 85]}
              defaultSnapPoint={25}
              hasBackdrop={false}
            >
              {/* Filtering Status Controls */}
              <div className="space-y-3 pb-3">
                <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-slate-400 select-none">
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Filter By Status</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(['all', 'good', 'fair', 'poor', 'under_construction'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`text-[9px] px-2.5 py-1.5 rounded-lg font-bold border capitalize transition-all cursor-pointer ${
                        statusFilter === status 
                          ? 'bg-cyan-950/40 border-cyan-500 text-cyan-400 shadow-sm shadow-cyan-500/15'
                          : 'bg-slate-955/50 border-border/80 text-slate-300 hover:border-slate-650 hover:text-slate-100'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable list */}
              <div className="space-y-3 pt-4 border-t border-border/30">
                <div className="flex justify-between items-center text-[10px] text-muted-foreground px-1 pb-1.5 uppercase tracking-wider font-bold select-none">
                  <span>Road Segments</span>
                  <span>{filteredRoads.length} loaded</span>
                </div>
                {filteredRoads.length > 0 ? (
                  filteredRoads.map((road) => (
                    <div
                      key={road.id}
                      onClick={() => setSelectedRoadId(road.id)}
                      className="p-4 bg-slate-950/40 rounded-xl border border-border/60 text-left hover-raise cursor-pointer"
                    >
                      <div className="flex justify-between items-center mb-1.5 gap-2">
                        <span className="text-[8.5px] font-mono font-bold text-cyan-400 bg-cyan-950/30 border border-cyan-900/40 px-1.5 py-0.5 rounded tracking-wider uppercase">{road.roadCode}</span>
                        <span className="text-[7px] font-mono font-bold text-slate-500 bg-slate-900 border border-border/60 px-1 py-0.5 rounded tracking-wider uppercase">{road.roadType}</span>
                        <span className={`text-[8px] font-extrabold uppercase border px-1.5 py-0.2 rounded tracking-wide ${getStatusTextClass(road.status)}`}>
                          {road.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 line-clamp-1 tracking-tight">{road.name}</h4>
                    </div>
                  ))
                ) : (
                  <EmptyState 
                    type="no-search-results" 
                    actionText="Clear Filter" 
                    onAction={() => { setSearchQuery(''); setStatusFilter('all'); }} 
                  />
                )}
              </div>
            </BottomSheet>

            {/* 2. Mobile Details Panel Sheet */}
            <BottomSheet
              isOpen={!!selectedRoadId}
              onClose={() => setSelectedRoadId(null)}
              title="Road Segment Details"
              snapPoints={[35, 70, 95]}
              defaultSnapPoint={35}
            >
              <RoadDetailsPanel />
            </BottomSheet>
          </div>

          {/* ════════════ MAP CONTAINER (FULL BLEED) ════════════ */}

          {/* Fullscreen Map container wrapper */}
          <section className="absolute inset-0 w-full h-full lg:relative lg:inset-auto lg:flex-1 lg:h-full z-0 pointer-events-auto">
            <ErrorBoundary>
              <MapWrapper />
            </ErrorBoundary>
          </section>

        </div>
      )}

      {/* VIEW 3: CONTRACTOR SCORECARDS (Frame 18) */}
      {!isChatDriven && activeView === 'contractors' && (
        <ErrorBoundary>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <ContractorsScreen />
          </div>
        </ErrorBoundary>
      )}

      {/* VIEW 4: TRANSPARENCY LEDGER (Frames 16, 17, 19, 20) */}
      {!isChatDriven && activeView === 'budgets' && (
        <ErrorBoundary>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <LedgerScreen />
          </div>
        </ErrorBoundary>
      )}
      {/* VIEW 5: CITIZEN DEFECT REPORTS / COMPLAINTS */}
      {!isChatDriven && activeView === 'complaints' && (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden animate-in fade-in duration-300">
          
          {/* Main List / Sync Center */}
          <div className="flex-1 flex flex-col bg-slate-950/45 border border-border/80 rounded-xl p-5 space-y-4 overflow-hidden">
            <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-900 pb-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setComplaintsTab('reports')}
                  className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                    complaintsTab === 'reports'
                      ? 'bg-gradient-to-r from-cyan-950/45 to-indigo-950/45 border-cyan-500/80 text-cyan-400 shadow-md shadow-cyan-500/5'
                      : 'bg-transparent border-transparent text-muted-foreground hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Defect Registry ({filteredComplaints.length})
                </button>
                <button
                  onClick={() => setComplaintsTab('sync')}
                  className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                    complaintsTab === 'sync'
                      ? 'bg-gradient-to-r from-cyan-950/45 to-indigo-950/45 border-cyan-500/80 text-cyan-400 shadow-md shadow-cyan-500/5'
                      : 'bg-transparent border-transparent text-muted-foreground hover:text-slate-250 hover:bg-slate-900/40'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Sync & Operations
                  {offlineQueue.length > 0 && (
                    <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-cyan-500 text-[9px] font-black text-slate-950 shadow-md shadow-cyan-500/20">
                      {offlineQueue.length}
                    </span>
                  )}
                </button>
              </div>
              
              {/* Category Filter */}
              {complaintsTab === 'reports' && (
                <div className="flex gap-1.5 flex-wrap">
                  {(['all', 'pothole', 'paving_defect', 'waterlogging', 'debris', 'missing_signage'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setComplaintCategoryFilter(cat)}
                      className={`text-[9px] font-bold px-2 py-1 border rounded capitalize transition-all ${
                        complaintCategoryFilter === cat 
                          ? 'bg-cyan-500 border-cyan-500 text-slate-950 shadow-md shadow-cyan-500/10'
                          : 'bg-slate-900/60 border-border text-slate-350 hover:border-slate-700'
                      }`}
                    >
                      {cat.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {complaintsTab === 'reports' ? (
              <>
                {/* Simulated report trigger block */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-border/60 flex items-center justify-between flex-wrap gap-4 select-none">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-250 uppercase tracking-wide flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-cyan-400" /> Report a road defect
                    </h4>
                    <p className="text-[10px] text-muted-foreground max-w-[450px] leading-relaxed">
                      Add a photo and location. Reports route to the responsible authority, and queue on this device when you are offline.
                    </p>
                  </div>
                  <button 
                    onClick={handleSimulateReport}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 active:scale-95 transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Report a defect
                  </button>
                </div>

                {/* Complaints grid list */}
                <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                  {filteredComplaints.map((c) => {
                    const road = c.roadId ? roads.find(r => r.id === c.roadId) : null;
                    const authority = getAuthority(c.assignedAuthorityId);

                    return (
                      <div 
                        key={c.id} 
                        onClick={() => setSelectedComplaintId(c.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all space-y-3 flex flex-col justify-between ${
                          selectedComplaintId === c.id 
                            ? 'bg-slate-900 border-cyan-500 shadow-md shadow-cyan-500/5' 
                            : 'bg-slate-950/60 border-border hover:border-cyan-500/30 hover:bg-slate-950/80'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2 flex-wrap">
                            <span className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                              {c.category === 'pothole' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>}
                              {c.category.replace('_', ' ')}
                            </span>
                            <span className={`text-[8px] font-black uppercase border px-1.5 py-0.2 rounded tracking-wide ${
                              c.status === 'resolved' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/60' :
                              c.status === 'in_progress' ? 'bg-cyan-950/60 text-cyan-400 border-cyan-900/60' :
                              'bg-slate-900 text-slate-400 border-border'
                            }`}>
                              {c.status}
                            </span>
                          </div>
                          <h3 className="text-xs font-extrabold text-slate-200 leading-snug">{c.title}</h3>
                          <p className="text-[10px] text-muted-foreground leading-relaxed font-medium line-clamp-2">{c.description}</p>
                        </div>

                        <div className="border-t border-border/30 pt-3 text-[10px] text-muted-foreground space-y-1">
                          <div className="flex justify-between">
                            <span>Road Segment:</span>
                            <strong className="text-slate-355">{road ? road.name : 'Unknown Segment'}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Assigned to:</span>
                            <strong className="text-slate-355">{authority ? authority.departmentCode : 'Unassigned'}</strong>
                          </div>
                          <div className="text-[9px] text-right text-slate-500 pt-1">
                            Reported: {new Date(c.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 animate-in fade-in duration-300">
                <SyncCenter />
              </div>
            )}
          </div>

          {/* Right Side Details Drawer: Defect Lifecycle Timeline */}
          {complaintsTab === 'reports' && (
            selectedComplaintId ? (
              <section className="w-full lg:w-[350px] shrink-0 h-full flex flex-col bg-slate-950 rounded-xl overflow-hidden border border-border/80 shadow-2xl relative z-10 transition-all duration-300 animate-in slide-in-from-bottom lg:slide-in-from-right">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-100">
                      Defect Lifecycle Audit
                    </h3>
                  </div>
                  <button 
                    onClick={() => setSelectedComplaintId(null)}
                    className="p-1 rounded-lg border border-border hover:bg-slate-900 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  {(() => {
                    const complaint = complaintsList.find(c => c.id === selectedComplaintId);
                    return complaint ? (
                      <ComplaintTimeline complaint={complaint} />
                    ) : (
                      <p className="text-[10px] text-muted-foreground text-center py-8">Select a complaint to view audit timeline.</p>
                    );
                  })()}
                </div>
              </section>
            ) : (
              <section className="hidden lg:block w-[320px] shrink-0 h-full">
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center border border-dashed border-border/50 rounded-xl bg-slate-950/20">
                  <Clock className="w-7 h-7 text-cyan-400/60 mb-2" />
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">Timeline Audit</h4>
                  <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[200px]">
                    Click on any complaint card to view its live status routing log, AI diagnostics, and assigned Executive Engineer.
                  </p>
                </div>
              </section>
            )
          )}

        </div>
      )}

      {/* VIEW 6: MUNICIPAL OPERATIONS (Frames 11 to 14) */}
      {!isChatDriven && activeView === 'admin' && userRole === 'admin' && (
        <ErrorBoundary>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <OperationsScreen />
          </div>
        </ErrorBoundary>
      )}
      {!isChatDriven && activeView === 'admin' && userRole !== 'admin' && (
        <AdminRestrictedView />
      )}

      {/* VIEW 7: HISTORICAL PLAYBACK (Frame 10) */}
      {!isChatDriven && activeView === 'playback' && userRole === 'admin' && (
        <ErrorBoundary>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <PlaybackScreen />
          </div>
        </ErrorBoundary>
      )}
      {!isChatDriven && activeView === 'playback' && userRole !== 'admin' && (
        <AdminRestrictedView />
      )}

      {/* VIEW 8: SENSOR NETWORK (Frame 09) */}
      {!isChatDriven && activeView === 'sensors' && userRole === 'admin' && (
        <ErrorBoundary>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <SensorsScreen />
          </div>
        </ErrorBoundary>
      )}
      {!isChatDriven && activeView === 'sensors' && userRole !== 'admin' && (
        <AdminRestrictedView />
      )}

      {/* VIEW 9: DIGITAL TWIN COMMAND CONSOLE */}
      {!isChatDriven && activeView === 'twin' && userRole === 'admin' && (
        <ErrorBoundary>
          <DigitalTwinView />
        </ErrorBoundary>
      )}
      {!isChatDriven && activeView === 'twin' && userRole !== 'admin' && (
        <AdminRestrictedView />
      )}

      {/* VIEW 10: REGIONS HUB (Frame 15) */}
      {!isChatDriven && activeView === 'regions' && (
        <ErrorBoundary>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <RegionsScreen />
          </div>
        </ErrorBoundary>
      )}

      {/* VIEW 0: CONVERSATIONAL ORCHESTRATOR SHELL */}
      {/* Renders in all modes — when demoMode is active, ChatOrchestrator
          reads it from the store and uses local demo fallbacks instead of
          the live backend. When demoMode is 'off', it hits the live API. */}
      {(activeView === 'chat' || isChatDriven) && (
        <ChatOrchestrator />
      )}

      {/* Responsive Bottom Drawer Overlay for Chat-Driven Views */}
      <AnimatePresence>
        {isChatDriven && drawerHeight > 0 && (
          <>
            {/* Backdrop: clicking collapses the drawer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (drawerHeight === 90) {
                  setDrawerHeight(40);
                } else {
                  setDrawerHeight(0);
                  setActiveView('chat');
                }
              }}
              className="fixed inset-0 bg-[#000000]/60 backdrop-blur-sm z-[1008] pointer-events-auto"
            />

            {/* Bottom Drawer container */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{
                y: `${100 - drawerHeight}%`
              }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => {
                const yOffset = info.offset.y;
                const velocityY = info.velocity.y;
                const height = window.innerHeight;
                
                const currentHeightPct = 100 - (info.point.y / height) * 100;
                
                if (velocityY > 400) {
                  if (drawerHeight === 90) {
                    setDrawerHeight(40);
                  } else {
                    setDrawerHeight(0);
                    setActiveView('chat');
                  }
                } else if (velocityY < -400) {
                  if (drawerHeight === 40) {
                    setDrawerHeight(90);
                  }
                } else {
                  const targets = [0, 40, 90];
                  const nearest = targets.reduce((prev, curr) => 
                    Math.abs(curr - currentHeightPct) < Math.abs(prev - currentHeightPct) ? curr : prev
                  );
                  
                  if (nearest === 0) {
                    setDrawerHeight(0);
                    setActiveView('chat');
                  } else {
                    setDrawerHeight(nearest);
                  }
                }
              }}
              className="fixed inset-x-0 bottom-0 z-[1009] rounded-t-3xl border border-border/85 border-t-2 border-t-cyan-500/40 bg-slate-950/95 shadow-2xl flex flex-col pointer-events-auto overflow-hidden"
              style={{
                height: `${drawerHeight}%`,
                maxHeight: '90vh',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
              }}
            >
              {/* Grab handle indicator */}
              <div className="w-full h-8 flex items-center justify-center cursor-ns-resize shrink-0 touch-none hover:bg-white/[0.02] transition-colors">
                <div className="w-16 h-1 bg-slate-700 rounded-full" />
              </div>

              {/* Title & Close header */}
              <header className="px-6 py-3 border-b border-border/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-100">
                    {activeView === 'twin' && '3D Digital Twin Viewer'}
                    {activeView === 'roads' && 'Geospatial Inspection Map'}
                    {activeView === 'budgets' && 'Civic Budget Integrity Audit'}
                    {activeView === 'contractors' && 'Contractor Compliance Ledger'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setDrawerHeight(0);
                    setActiveView('chat');
                  }}
                  className="p-1.5 rounded-xl border border-border hover:bg-slate-900 text-muted-foreground hover:text-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </header>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin select-text">
                {activeView === 'twin' && (
                  <ErrorBoundary>
                    <DigitalTwinView />
                  </ErrorBoundary>
                )}
                
                {activeView === 'roads' && (
                  <div className="w-full h-full relative min-h-[300px]">
                    <ErrorBoundary>
                      <MapWrapper />
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeView === 'budgets' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-100">Public Capital Flow Pathway</h4>
                        <p className="text-[10px] text-muted-foreground">
                          {drawerRoad ? `Auditing fund flow for ${drawerRoad.name}` : "City-wide fund allocations"}
                        </p>
                      </div>
                      {drawerRoad && (
                        <span className="text-[8px] bg-slate-900 border border-border text-slate-400 px-2 py-0.5 rounded font-black uppercase">
                          {drawerRoad.roadCode}
                        </span>
                      )}
                    </div>
                    <div className="bg-slate-950/40 border border-border/60 rounded-xl p-3">
                      <SankeyFlowVisualizer
                        projects={drawerProjects}
                        contractors={contractors}
                        authorities={authorities}
                        road={drawerRoad || undefined}
                      />
                    </div>
                    {drawerRoad && (
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="p-2.5 rounded-lg border border-border bg-slate-950/50">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Sanctioned</span>
                          <span className="text-xs font-black text-emerald-450">
                            {formatShortINR(drawerProjects.reduce((acc, p) => acc + p.budgetAllocated, 0))}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg border border-border bg-slate-950/50">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Expended</span>
                          <span className="text-xs font-black text-slate-200">
                            {formatShortINR(drawerProjects.reduce((acc, p) => acc + p.budgetSpent, 0))}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeView === 'contractors' && (
                  <div className="space-y-4">
                    {(() => {
                      const contractor = contractors.find(c => c.id === selectedContractorId);
                      if (!contractor) {
                        return (
                          <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase text-slate-100">Contractor Registry</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {contractors.map(c => (
                                <div key={c.id} onClick={() => setSelectedContractorId(c.id)} className="p-3.5 bg-slate-955 border border-border/60 rounded-xl cursor-pointer hover:border-cyan-500/50 hover:bg-slate-900/20 transition-all flex justify-between items-center">
                                  <div>
                                    <span className="text-xs font-bold text-slate-250 block">{c.name}</span>
                                    <span className="text-[9px] text-muted-foreground mt-0.5 block">Lic: {c.licenseNumber}</span>
                                  </div>
                                  <span className="text-[10px] text-amber-500 font-extrabold">★ {c.rating.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      const activeWorks = projects.filter(p => p.contractorId === contractor.id);
                      const totalSanctioned = activeWorks.reduce((acc, p) => acc + p.budgetAllocated, 0);
                      const totalSpent = activeWorks.reduce((acc, p) => acc + p.budgetSpent, 0);
                      return (
                        <div className="space-y-4">
                          <div className="flex justify-between items-start border-b border-border/40 pb-2">
                            <div>
                              <h4 className="text-xs font-black uppercase text-slate-100">Contractor Safety Audit</h4>
                              <h3 className="text-sm font-extrabold text-cyan-400 mt-0.5">{contractor.name}</h3>
                            </div>
                            <button onClick={() => setSelectedContractorId(null)} className="text-[9px] uppercase font-black text-cyan-455 hover:underline">
                              &larr; Back to List
                            </button>
                          </div>
                          {contractor.blacklisted && (
                            <div className="p-3 rounded-lg border border-red-900 bg-red-950/20 text-[10px] text-red-400 font-semibold leading-relaxed">
                              <strong>Integrity Warning:</strong> Blacklisted for 3 years due to repeated compaction failures.
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="p-2.5 rounded-lg border border-border bg-slate-950/50">
                              <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Works Value</span>
                              <span className="text-xs font-black text-emerald-450">{formatCurrency(totalSanctioned)}</span>
                            </div>
                            <div className="p-2.5 rounded-lg border border-border bg-slate-950/50">
                              <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Total Outflow</span>
                              <span className="text-xs font-black text-slate-200">{formatCurrency(totalSpent)}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h5 className="text-[10px] uppercase font-bold text-slate-400">Contract Bindings ({activeWorks.length})</h5>
                            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                              {activeWorks.map(w => {
                                const roadObj = roads.find(r => r.id === w.roadId);
                                return (
                                  <div key={w.id} className="p-2.5 bg-slate-950/40 rounded border border-border/40 text-[10px] space-y-1">
                                    <p className="font-bold text-slate-200 leading-snug">{w.title}</p>
                                    <div className="flex justify-between items-center text-[9px] text-muted-foreground mt-0.5">
                                      <span>Road: {roadObj ? roadObj.name : 'Unknown'}</span>
                                      <span className="capitalize text-slate-400">{w.status}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Complaint wizard overlay */}
      <ComplaintWizard />


    </div>
  );
}

// Admin-restricted view shown to citizens
function AdminRestrictedView() {
  const setUserRole = useStore((s) => s.setUserRole);
  const setActiveView = useStore((s) => s.setActiveView);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex items-center justify-center p-8"
    >
      <div className="max-w-md text-center glass-panel rounded-2xl p-8 border border-white/[0.06]">
        <ShieldAlert className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
        <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider mb-2">
          Admin View Required
        </h2>
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-6">
          This section is only available in Admin mode. Switch to access the full
          operations dashboard, contractor registry, and infrastructure controls.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setUserRole('admin');
            }}
            className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-black uppercase tracking-wider transition-all"
          >
            Switch to Admin
          </button>
          <button
            onClick={() => setActiveView('chat')}
            className="px-4 py-2 rounded-xl border border-white/[0.1] text-[#55555f] hover:text-slate-300 text-[10px] font-black uppercase tracking-wider transition-all"
          >
            Back to Chat
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Inline SVG helper to represent Close icon
function X({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
