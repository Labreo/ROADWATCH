'use client';

import { useMemo, useState, useEffect } from 'react';
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
  Activity
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

// Transparency & Budget dashboard imports
import { calculateRoadTransparency, getScoreGrade, getCitywideTransparencyData } from '@/services/transparencyEngine';
import SpendingComparisonChart from '@/components/transparency/SpendingComparisonChart';
import RepairFrequencyHeatmap from '@/components/transparency/RepairFrequencyHeatmap';
import BudgetTimeline from '@/components/transparency/BudgetTimeline';
import ContractorHistoryCard from '@/components/transparency/ContractorHistoryCard';
import TransparencyScoreCard from '@/components/transparency/TransparencyScoreCard';

export default function Page() {
  const { 
    activeView, 
    setActiveView,
    searchQuery, 
    setSearchQuery,
    statusFilter, 
    setStatusFilter,
    selectedRoadId, 
    setSelectedRoadId,
    selectedComplaintId,
    setSelectedComplaintId,
    isOnline,
    syncQueueCount,
    setIsReporting,
    complaintsList
  } = useStore();

  // Selected sub-entities for contractors/budget detail views
  const [selectedContractorId, setSelectedContractorId] = useState<number | null>(null);
  const [isSyncingUI, setIsSyncingUI] = useState(false);

  // Initialize connection sync manager on mount
  useEffect(() => {
    OfflineSyncManager.initialize();
  }, []);

  // Format currency helper
  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value).replace('INR', '₹');
  };

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

      {/* VIEW 1: DASHBOARD OVERVIEW */}
      {activeView === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Summary counters grid */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel rounded-xl p-4 flex items-center gap-3 border border-border/50">
              <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Road Registry</span>
                <span className="text-base md:text-lg font-extrabold text-slate-200">{stats.totalRoads} Segments</span>
              </div>
            </div>

            <div className="glass-panel rounded-xl p-4 flex items-center gap-3 border border-border/50">
              <div className="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Sanctioned Audits</span>
                <span className="text-base md:text-lg font-extrabold text-slate-200">{formatINR(stats.totalBudget)}</span>
              </div>
            </div>

            <div className="glass-panel rounded-xl p-4 flex items-center gap-3 border border-border/50">
              <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/40 text-red-400">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Pending Defects</span>
                <span className="text-base md:text-lg font-extrabold text-slate-200">{stats.activeComplaints} Active</span>
              </div>
            </div>

            <div className="glass-panel rounded-xl p-4 flex items-center gap-3 border border-border/50">
              <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Resolution Rate</span>
                <span className="text-base md:text-lg font-extrabold text-slate-200">{stats.resolutionRate}% Resolved</span>
              </div>
            </div>
          </section>

          {/* Quick Info & Actions Row */}
          {syncQueueCount > 0 && (
            <div className="p-3.5 rounded-xl border border-cyan-800 bg-cyan-950/45 flex items-center justify-between text-xs text-cyan-400 gap-3">
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncingUI ? 'animate-spin' : ''}`} />
                <span>You have <strong>{syncQueueCount} reports</strong> pending in local storage queue. {isOnline ? 'Online connection detected.' : 'Sync is deferred.'}</span>
              </div>
              <button 
                onClick={handleSyncQueue}
                disabled={!isOnline || isSyncingUI}
                className={`px-3 py-1 rounded bg-cyan-500 font-extrabold text-slate-900 text-[10px] uppercase tracking-wide hover:bg-cyan-400 transition-all ${
                  (!isOnline || isSyncingUI) ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'
                }`}
              >
                {isSyncingUI ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          )}

          {/* Main Grid View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1: Citizen Defect Reports Overview */}
            <div className="glass-panel rounded-xl border border-border/60 p-5 flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">Recent Defect Logs</h3>
                </div>
                <button 
                  onClick={() => setActiveView('complaints')}
                  className="text-[10px] font-bold text-cyan-450 hover:underline flex items-center gap-0.5"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-1">
                {complaintsList.slice(0, 5).map((complaint) => {
                  const road = complaint.roadId ? roads.find(r => r.id === complaint.roadId) : null;
                  return (
                    <div 
                      key={complaint.id} 
                      onClick={() => {
                        setSelectedComplaintId(complaint.id);
                        setActiveView('complaints');
                      }}
                      className="p-3 bg-slate-950/50 rounded-lg border border-border/45 hover:border-cyan-500/40 cursor-pointer transition-all"
                    >
                      <div className="flex justify-between items-start gap-2 mb-1.5 flex-wrap">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                          {complaint.category.replace('_', ' ')}
                        </span>
                        <span className={`text-[8px] font-black uppercase px-1 rounded border ${
                          complaint.status === 'resolved' ? 'text-emerald-400 border-emerald-950/40 bg-emerald-950/10' : 'text-amber-400 border-amber-950/40 bg-amber-950/10'
                        }`}>
                          {complaint.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{complaint.title}</h4>
                      <p className="text-[10px] text-muted-foreground mt-1 font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-cyan-500" />
                        {road ? road.name : 'Unknown Segment'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Contractor Integrity Audit */}
            <div className="glass-panel rounded-xl border border-border/60 p-5 flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">Contractor Integrity Audit</h3>
                </div>
                <button 
                  onClick={() => setActiveView('contractors')}
                  className="text-[10px] font-bold text-cyan-455 hover:underline flex items-center gap-0.5"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-1">
                {contractors.slice(0, 5).map((contractor) => (
                  <div key={contractor.id} className="p-3 bg-slate-950/50 rounded-lg border border-border/45 hover:border-border transition-all">
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-xs font-extrabold text-slate-200 truncate pr-2">{contractor.name}</h4>
                      {contractor.blacklisted ? (
                        <span className="text-[8px] bg-red-950/50 border border-red-900 text-red-500 font-extrabold uppercase px-1 rounded">Blacklisted</span>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                          <Award className="w-3.5 h-3.5" />
                          {contractor.rating.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px] text-muted-foreground border-t border-border/20 pt-1.5 mt-1.5">
                      <span>Completed: <strong>{contractor.projectsCompleted}</strong></span>
                      <span>Delayed: <strong className={contractor.projectsDelayed > 3 ? 'text-red-400' : 'text-slate-400'}>{contractor.projectsDelayed}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Budget Variance Warnings */}
            <div className="glass-panel rounded-xl border border-border/60 p-5 flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">Budget Variance & Delays</h3>
                </div>
                <button 
                  onClick={() => setActiveView('budgets')}
                  className="text-[10px] font-bold text-cyan-455 hover:underline flex items-center gap-0.5"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-1">
                {projects.slice(0, 5).map((project) => {
                  const road = roads.find(r => r.id === project.roadId);
                  const utilization = Math.round((project.budgetSpent / project.budgetAllocated) * 100);
                  const isOver = project.budgetSpent > project.budgetAllocated;

                  return (
                    <div key={project.id} className="p-3 bg-slate-950/50 rounded-lg border border-border/45 hover:border-border transition-all space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 line-clamp-1 leading-normal">{project.title}</h4>
                          <span className="text-[9px] text-muted-foreground">{road ? road.name : 'Unknown Road'}</span>
                        </div>
                        {isOver && (
                          <span className="text-[8px] bg-red-950 text-red-400 border border-red-900/60 font-black uppercase px-1 rounded animate-pulse">Over Budget</span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px]">
                          <span className="text-muted-foreground">Budget Spent</span>
                          <span className={isOver ? 'text-red-400 font-bold' : 'text-slate-300'}>{utilization}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${isOver ? 'bg-red-500' : 'bg-cyan-500'}`} 
                            style={{ width: `${Math.min(100, utilization)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Quick Start Guide */}
          <div className="glass-panel border border-border/40 p-4 rounded-xl flex items-center justify-between gap-4 flex-wrap bg-slate-950/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-950 rounded-lg border border-border text-cyan-400 shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wide">Inspection Action Quick-Guide</h4>
                <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                  Select <strong>Road Registry Explorer</strong> on the navigation panel to view the spatial GIS accountability map directly, click segments, and inspect local contractors.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveView('roads')}
              className="text-[10px] font-extrabold uppercase tracking-widest bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2 rounded-xl transition-all shadow-md shadow-cyan-500/20 active:scale-95 flex items-center gap-1.5"
            >
              Start Map Scan <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* VIEW 2: ROAD REGISTRY MAP VIEW (The primary road lookup slice) */}
      {activeView === 'roads' && (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden animate-in fade-in duration-300">
          {/* Left Side: Road Search & Sidebar Explorer */}
          <section className="w-full lg:w-[320px] shrink-0 flex flex-col bg-slate-950/45 rounded-xl border border-border/60 p-4 space-y-4">
            
            {/* Search Input handled in TopNav, but let's keep search here if they type specific to roads list */}
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
              <div className="flex flex-wrap gap-1">
                {(['all', 'good', 'fair', 'poor', 'under_construction'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`text-[9px] px-2 py-1 rounded font-bold border capitalize transition-all ${
                      statusFilter === status 
                        ? 'bg-cyan-500 border-cyan-500 text-slate-950 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/60 border-border text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Roads List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              <div className="flex justify-between items-center text-[10px] text-muted-foreground px-1 pb-1 uppercase tracking-wider font-bold">
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
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-slate-900 border-cyan-500/80 shadow-md shadow-cyan-500/5'
                          : 'bg-slate-950/60 border-border/50 hover:bg-slate-900/40 hover:border-border'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                          {road.roadCode}
                        </span>
                        <span className={`text-[8px] font-extrabold uppercase border px-1.5 py-0.2 rounded tracking-wide ${getStatusTextClass(road.status)}`}>
                          {road.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{road.name}</h4>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-2 border-t border-border/30 pt-1.5">
                        <span className="flex items-center gap-1 font-semibold text-slate-400">
                          <MapPin className="w-3 h-3 text-cyan-500" />
                          {road.lengthKm} km
                        </span>
                        <span className="text-[9px]">Last Paved: {new Date(road.lastRelayingDate).toLocaleDateString('en-IN', { year: '2-digit', month: '2-digit' })}</span>
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

          {/* Center: Dynamic Leaflet Map with Safety ErrorBoundary */}
          <section className="flex-1 h-full min-h-[350px] lg:min-h-0 relative">
            <ErrorBoundary>
              <MapWrapper />
            </ErrorBoundary>
          </section>

          {/* Right Side: Selected Road Details Drawer/Panel */}
          {selectedRoadId ? (
            <section className="w-full lg:w-[350px] shrink-0 h-full flex flex-col bg-slate-950 rounded-xl overflow-hidden border border-border/80 shadow-2xl relative z-10 transition-all duration-300 animate-in slide-in-from-bottom lg:slide-in-from-right">
              <RoadDetailsPanel />
            </section>
          ) : (
            <section className="hidden lg:block w-[320px] shrink-0 h-full">
              <EmptyState type="unselected" />
            </section>
          )}
        </div>
      )}

      {/* VIEW 3: CONTRACTOR TRANSPARENCY REGISTRY */}
      {activeView === 'contractors' && (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden animate-in fade-in duration-300">
          
          {/* Main List */}
          <div className="flex-1 flex flex-col space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h2 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-2">
                <HardHat className="w-4 h-4 text-cyan-400" /> License Registry: 12 Active Contractors
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pr-1">
              {filteredContractors.map((c) => {
                const isSelected = selectedContractorId === c.id;
                return (
                  <div 
                    key={c.id}
                    onClick={() => setSelectedContractorId(isSelected ? null : c.id)}
                    className={`p-4 rounded-xl border cursor-pointer hover:border-cyan-500/50 transition-all ${
                      isSelected 
                        ? 'bg-slate-900 border-cyan-500 shadow-md shadow-cyan-500/5' 
                        : 'bg-slate-950 border-border/80'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div>
                        <h3 className="text-xs font-extrabold text-slate-200 leading-snug">{c.name}</h3>
                        <span className="text-[9px] text-muted-foreground">Lic: {c.licenseNumber}</span>
                      </div>
                      {c.blacklisted ? (
                        <span className="text-[8px] font-black text-red-500 border border-red-900 bg-red-950/40 px-2 py-0.5 rounded flex items-center gap-0.5 uppercase tracking-wide shrink-0">
                          <ShieldAlert className="w-3 h-3" /> Blacklisted
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] font-black text-amber-400">
                          <Award className="w-3.5 h-3.5" />
                          {c.rating.toFixed(2)}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border/30 pt-3 mt-3 grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase tracking-wider font-semibold">Completed Works</span>
                        <span className="font-extrabold text-slate-200 text-xs">{c.projectsCompleted} projects</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase tracking-wider font-semibold">Contract Delays</span>
                        <span className={`font-extrabold text-xs ${c.projectsDelayed > 3 ? 'text-red-400' : 'text-slate-200'}`}>
                          {c.projectsDelayed} delayed
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contractor Details View */}
          {selectedContractorId ? (
            <section className="w-full lg:w-[350px] shrink-0 bg-slate-950 border border-border rounded-xl p-5 flex flex-col space-y-5 animate-in slide-in-from-right duration-250">
              {(() => {
                const contractor = contractors.find(c => c.id === selectedContractorId);
                if (!contractor) return null;
                const activeWorks = projects.filter(p => p.contractorId === contractor.id);
                const totalSanctioned = activeWorks.reduce((acc, p) => acc + p.budgetAllocated, 0);
                const totalSpent = activeWorks.reduce((acc, p) => acc + p.budgetSpent, 0);
                
                return (
                  <>
                    <div className="flex items-start justify-between border-b border-border/60 pb-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-100">{contractor.name}</h3>
                        <p className="text-[10px] text-muted-foreground">Registered: {new Date(contractor.registrationDate).toLocaleDateString()}</p>
                      </div>
                      <button 
                        onClick={() => setSelectedContractorId(null)}
                        className="p-1 rounded border border-border hover:bg-slate-900 text-muted-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Blacklist Box */}
                    {contractor.blacklisted && contractor.blacklistedReason && (
                      <div className="p-3 rounded-lg border border-red-900 bg-red-950/20 text-[10px] text-red-400 leading-relaxed font-semibold">
                        <span className="flex items-center gap-1 text-[11px] mb-1 font-bold text-red-500 uppercase"><ShieldAlert className="w-4 h-4" /> Integrity Notice</span>
                        {contractor.blacklistedReason}
                      </div>
                    )}

                    {/* Stats summary */}
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-2.5 rounded-lg border border-border bg-slate-950/50">
                        <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Works Value</span>
                        <span className="text-xs font-black text-emerald-400">{formatINR(totalSanctioned)}</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-border bg-slate-950/50">
                        <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Total Outflow</span>
                        <span className="text-xs font-black text-slate-200">{formatINR(totalSpent)}</span>
                      </div>
                    </div>

                    {/* Active work logs */}
                    <div className="space-y-2.5">
                      <h4 className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 border-b border-border/40 pb-1">Contract Bindings</h4>
                      {activeWorks.length > 0 ? (
                        <div className="space-y-2 overflow-y-auto max-h-[220px]">
                          {activeWorks.map(w => {
                            const road = roads.find(r => r.id === w.roadId);
                            return (
                              <div key={w.id} className="p-2.5 bg-slate-950/40 rounded border border-border/40 text-[10px] space-y-1">
                                <p className="font-bold text-slate-200 leading-normal">{w.title}</p>
                                <div className="flex justify-between items-center text-muted-foreground text-[9px] pt-1">
                                  <span>Road: {road ? road.name : 'Registry'}</span>
                                  <span className="capitalize text-slate-350">{w.status}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground text-center py-4">No active construction bindings logged.</p>
                      )}
                    </div>
                  </>
                );
              })()}
            </section>
          ) : (
            <div className="hidden lg:block w-[320px] shrink-0">
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center border border-dashed border-border/50 rounded-xl bg-slate-950/20">
                <HelpCircle className="w-7 h-7 text-cyan-400/60 mb-2" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">Contractor Card Check</h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[200px]">
                  Click on any contractor card to inspect registration details, blacklist justifications, and active work budgets.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: BUDGET & EXPENDITURE AUDITS */}
      {activeView === 'budgets' && (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden animate-in fade-in duration-300">
          
          {/* LEFT COLUMN: ACCOUNTABILITY REGISTRY */}
          <div className="w-full lg:w-[350px] shrink-0 flex flex-col bg-slate-950/45 border border-border/80 rounded-xl p-5 space-y-4 overflow-hidden">
            <div>
              <h2 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-cyan-400" /> Accountability Registry
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Select a road segment to audit budget details, ratings, and active alerts.
              </p>
            </div>

            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Search segment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-border rounded-xl text-xs placeholder:text-muted-foreground text-foreground focus:outline-none focus:border-cyan-500/50 transition-all font-medium"
                />
              </div>

              {/* Status Filter */}
              <div className="flex gap-1.5 flex-wrap">
                {(['all', 'good', 'fair', 'poor', 'under_construction'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`text-[9px] font-bold px-2 py-1 border rounded capitalize transition-all ${
                      statusFilter === status 
                        ? 'bg-cyan-500 border-cyan-500 text-slate-950 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/60 border-border text-slate-350 hover:border-slate-700'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* List of roads with Grade Badge */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
              {filteredRoads.map((road) => {
                const roadComplaints = complaintsList.filter(c => c.roadId === road.id);
                const roadData = calculateRoadTransparency(road, projects, contractors, roadComplaints);
                const { grade, color, bg } = getScoreGrade(roadData.transparencyScore);
                const hasAnomalies = roadData.anomalies.length > 0;
                const hasHighAnomaly = roadData.anomalies.some(a => a.severity === 'high');

                return (
                  <div
                    key={road.id}
                    onClick={() => setSelectedRoadId(road.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                      selectedRoadId === road.id
                        ? 'bg-slate-900 border-cyan-500 shadow-md shadow-cyan-500/5'
                        : 'bg-slate-950/60 border-border hover:border-cyan-500/30 hover:bg-slate-950/80'
                    }`}
                  >
                    <div className="space-y-1.5 max-w-[220px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[8px] bg-slate-800 text-slate-400 font-bold px-1.5 py-0.2 rounded border border-border/50 uppercase">{road.roadCode}</span>
                        {hasAnomalies && (
                          <span className={`w-1.5 h-1.5 rounded-full ${hasHighAnomaly ? 'bg-red-550 animate-pulse' : 'bg-orange-500'}`}></span>
                        )}
                      </div>
                      <h3 className="text-xs font-extrabold text-slate-200 line-clamp-1">{road.name}</h3>
                      <p className="text-[9px] text-muted-foreground font-medium">
                        Score: {roadData.transparencyScore}/100 ({roadData.yearlyAllocations.length} years)
                      </p>
                    </div>

                    {/* Grade Circle / Badge */}
                    <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-black text-xs shrink-0 shadow-sm ${bg} ${color}`}>
                      {grade}
                    </div>
                  </div>
                );
              })}

              {filteredRoads.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground italic">
                  No segments match criteria.
                </div>
              )}
            </div>
          </div>

          {/* MAIN WORKSPACE PANEL */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-6 bg-slate-950/20 border border-border/80 rounded-xl p-5">
            {!selectedRoadId ? (
              /* VIEW A: CITY-WIDE CIVIC ACCOUNTABILITY INTEL */
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center flex-wrap gap-4 border-b border-border/40 pb-3">
                  <div>
                    <h2 className="text-xs font-black text-slate-100 uppercase tracking-widest flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-cyan-400" /> City-Wide Accountability Intel
                    </h2>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                      Aggregated public funding metrics, contractor allocations, and structural anomaly logs for municipal assets.
                    </p>
                  </div>
                  <span className="text-[9px] font-extrabold px-3 py-1 border border-border rounded-full uppercase tracking-wider text-slate-300 bg-slate-950/80">
                    Active Fiscal Audit
                  </span>
                </div>

                {/* City-Wide KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="glass-panel p-4 rounded-xl border border-border/60 bg-slate-950/25">
                    <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-widest">Total Sanctioned Grants</span>
                    <span className="text-base font-black text-emerald-450 mt-1 block">{formatINR(citywideTransparency.totalSanctioned)}</span>
                    <span className="text-[8px] text-muted-foreground block mt-1">Capital public fund budget allocations</span>
                  </div>

                  <div className="glass-panel p-4 rounded-xl border border-border/60 bg-slate-950/25">
                    <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-widest">Total Expended Funds</span>
                    <span className="text-base font-black text-slate-200 mt-1 block">{formatINR(citywideTransparency.totalSpent)}</span>
                    <span className="text-[8px] text-muted-foreground block mt-1">
                      Utilization: {Math.round((citywideTransparency.totalSpent / citywideTransparency.totalSanctioned) * 100)}% of budget
                    </span>
                  </div>

                  <div className="glass-panel p-4 rounded-xl border border-border/60 bg-slate-950/25">
                    <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-widest">Average Transparency Score</span>
                    <span className="text-base font-black text-cyan-400 mt-1 block flex items-center gap-2">
                      {citywideTransparency.averageScore} / 100
                      <span className="text-[9px] font-black px-1.5 py-0.1 border bg-cyan-950 text-cyan-450 border-cyan-900 rounded uppercase">
                        {getScoreGrade(citywideTransparency.averageScore).grade}
                      </span>
                    </span>
                    <span className="text-[8px] text-muted-foreground block mt-1">Aggregate integrity and delay metric</span>
                  </div>

                  <div className="glass-panel p-4 rounded-xl border border-border/60 bg-slate-950/25">
                    <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-widest">Flagged Fiscal Anomalies</span>
                    <span className={`text-base font-black mt-1 block flex items-center gap-1.5 ${
                      citywideTransparency.allAnomalies.length > 0 ? 'text-red-400 animate-pulse' : 'text-slate-350'
                    }`}>
                      {citywideTransparency.allAnomalies.length} Flagged Alerts
                    </span>
                    <span className="text-[8px] text-muted-foreground block mt-1">
                      {citywideTransparency.highSeverityAnomaliesCount} critically high severity
                    </span>
                  </div>
                </div>

                {/* City-Wide Spending Comparison Chart */}
                <div className="space-y-2">
                  <h4 className="text-[10px] text-slate-250 uppercase font-black tracking-widest">Comparative Funding Audit</h4>
                  <SpendingComparisonChart 
                    data={citywideTransparency.roadTransparencyList.map(r => {
                      const roadObj = roads.find(ro => ro.id === r.roadId);
                      return {
                        label: roadObj ? roadObj.name : 'Unknown',
                        sanctioned: r.totalSanctioned,
                        spent: r.totalSpent,
                        extraInfo: roadObj ? roadObj.roadCode : undefined
                      };
                    })}
                  />
                </div>

                {/* Grid row 3: Contractor leaderboards & Active Anomalies Log */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  {/* Contractor leaderboards */}
                  <div className="xl:col-span-7 bg-slate-950/20 border border-border/60 rounded-xl p-4 space-y-3.5 overflow-hidden">
                    <div>
                      <h4 className="text-[10px] text-slate-200 uppercase font-black tracking-widest">Contractor Public Share Breakdown</h4>
                      <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">
                        Aggregate public funding and rating history for civil engineering contractors.
                      </p>
                    </div>

                    <div className="overflow-x-auto select-none">
                      <table className="w-full text-[10px] text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border/60 text-muted-foreground font-black uppercase">
                            <th className="pb-2 font-bold">Contractor</th>
                            <th className="pb-2 font-bold text-right">Funds Spent</th>
                            <th className="pb-2 font-bold text-center">Jobs</th>
                            <th className="pb-2 font-bold text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                          {citywideTransparency.contractorLeaderboard.slice(0, 5).map((c, i) => (
                            <tr key={i} className="hover:bg-slate-900/30">
                              <td className="py-2.5 pr-2 font-extrabold text-slate-250">
                                <div>{c.name}</div>
                                <div className="text-[8px] font-bold text-amber-500 mt-0.5">Rating: {c.rating.toFixed(2)}/5.0</div>
                              </td>
                              <td className="py-2.5 text-right font-bold text-slate-300">{formatINR(c.totalReceived)}</td>
                              <td className="py-2.5 text-center font-bold text-slate-350">{c.projects}</td>
                              <td className="py-2.5 text-center">
                                {c.blacklisted ? (
                                  <span className="text-[8px] bg-red-955/60 border border-red-900/60 text-red-505 px-1.5 py-0.2 rounded uppercase font-black">
                                    Black
                                  </span>
                                ) : (
                                  <span className="text-[8px] bg-emerald-955/60 border border-emerald-900/60 text-emerald-400 px-1.5 py-0.2 rounded uppercase font-black">
                                    Active
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Active Anomalies Log */}
                  <div className="xl:col-span-5 bg-slate-950/20 border border-border/60 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                    <div>
                      <h4 className="text-[10px] text-slate-200 uppercase font-black tracking-widest">Active Audit Red Flags</h4>
                      <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">
                        High priority budget and repair frequency conflicts detected automatically.
                      </p>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[160px] pr-1">
                      {citywideTransparency.allAnomalies.map((a, i) => {
                        const anomalyRoad = citywideTransparency.roadTransparencyList.find(r => r.anomalies.some(an => an.id === a.id));
                        const roadObj = anomalyRoad ? roads.find(r => r.id === anomalyRoad.roadId) : null;
                        
                        return (
                          <div 
                            key={i} 
                            onClick={() => {
                              if (roadObj) setSelectedRoadId(roadObj.id);
                            }}
                            className={`p-2.5 rounded border text-[9px] cursor-pointer hover:border-red-500/40 transition-colors flex items-start gap-2 ${
                              a.severity === 'high' 
                                ? 'bg-red-950/15 border-red-900/50 text-red-400 font-semibold' 
                                : 'bg-amber-955/15 border-amber-900/50 text-amber-400 font-semibold'
                            }`}
                          >
                            <AlertCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${a.severity === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                            <div className="space-y-0.5">
                              <div className="font-extrabold flex justify-between gap-2 uppercase tracking-wide">
                                <span>{a.type.replace('_', ' ')}</span>
                                <span className="text-slate-500 hover:text-slate-400 font-medium">Link: {roadObj ? roadObj.roadCode : 'Segment'} →</span>
                              </div>
                              <p className="leading-relaxed text-slate-300 font-medium">{a.description}</p>
                            </div>
                          </div>
                        );
                      })}

                      {citywideTransparency.allAnomalies.length === 0 && (
                        <div className="text-center py-8 text-xs text-muted-foreground italic">
                          No budget or structural anomalies flagged across the network.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* VIEW B: SINGLE SEGMENT TRANSPARENCY SCORECARD & AUDIT LEDGER */
              (() => {
                const road = roads.find(r => r.id === selectedRoadId)!;
                const roadProjects = projects.filter(p => p.roadId === road.id);
                const roadComplaints = complaintsList.filter(c => c.roadId === road.id);
                const data = selectedRoadTransparency!;

                return (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    
                    {/* Detail panel header */}
                    <div className="flex justify-between items-start gap-4 flex-wrap border-b border-border/40 pb-4">
                      <div className="space-y-1">
                        <button 
                          onClick={() => setSelectedRoadId(null)}
                          className="flex items-center gap-1.5 text-[9px] uppercase font-black tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors mb-1.5"
                        >
                          &larr; Back to City-Wide Audit
                        </button>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-[9px] font-black uppercase bg-slate-900 border border-border text-slate-400 px-2 py-0.5 rounded tracking-wider">
                            {road.roadCode}
                          </span>
                          <h2 className="text-sm font-black text-slate-100 uppercase tracking-wide">
                            Transparency Audit Details
                          </h2>
                        </div>
                        <h3 className="text-base font-black text-slate-200 leading-snug">{road.name}</h3>
                        <p className="text-[10px] text-muted-foreground">
                          Segment Length: {road.lengthKm.toFixed(2)} Km | Supervising: {getAuthority(road.authorityId)?.name.split(' - ')[0]}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2 text-right">
                        <span className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Relaying Status</span>
                        <span className={`text-[9px] font-extrabold uppercase border px-2 py-0.5 rounded tracking-wide ${getStatusTextClass(road.status)}`}>
                          {road.status.replace('_', ' ')}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-semibold">Last Relayed: {new Date(road.lastRelayingDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>

                    {/* Dashboard Grid 1: Score gauge card */}
                    <TransparencyScoreCard score={data.transparencyScore} deductions={data.scoreDeductions} />

                    {/* Dashboard Grid 2: Comparisons & Heatmaps */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <h4 className="text-[10px] text-slate-200 uppercase font-black tracking-widest">Yearly Budget Distributions</h4>
                        <SpendingComparisonChart 
                          height={180}
                          data={data.yearlyAllocations.map(y => ({
                            label: `${y.year}`,
                            sanctioned: y.sanctioned,
                            spent: y.spent
                          }))}
                        />
                      </div>
                      <RepairFrequencyHeatmap projects={roadProjects} anomalies={data.anomalies} />
                    </div>

                    {/* Dashboard Grid 3: History lists */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <BudgetTimeline projects={roadProjects} contractors={contractors} />
                      <ContractorHistoryCard breakdown={data.contractorSpendingBreakdown} contractors={contractors} />
                    </div>

                    {/* Dashboard Grid 4: Unresolved Complaints list */}
                    <div className="bg-slate-950/20 border border-border/60 rounded-xl p-5 space-y-4">
                      <div className="flex justify-between items-center border-b border-border/40 pb-2">
                        <h4 className="text-[10px] text-slate-200 uppercase font-black tracking-widest">Segment Citizen Defect Reports</h4>
                        <span className="text-[9px] bg-slate-900 border border-border text-slate-450 px-2 py-0.2 rounded font-black">
                          {roadComplaints.length} reports logged
                        </span>
                      </div>

                      {roadComplaints.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {roadComplaints.map((c) => (
                            <div key={c.id} className="p-3 rounded-lg border border-border/40 bg-slate-950/40 space-y-2 text-[10px]">
                              <div className="flex justify-between items-start gap-2">
                                <span className="font-extrabold text-slate-350 capitalize">{c.category.replace('_', ' ')}</span>
                                <span className={`text-[8px] px-1.5 py-0.2 rounded border font-black uppercase tracking-wide ${
                                  c.status === 'resolved' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/60' :
                                  c.status === 'in_progress' ? 'bg-cyan-950/60 text-cyan-400 border-cyan-900/60' :
                                  'bg-slate-900 text-slate-400 border-border'
                                }`}>
                                  {c.status}
                                </span>
                              </div>
                              <h5 className="font-black text-slate-200 leading-snug">{c.title}</h5>
                              <p className="text-muted-foreground leading-normal font-medium">{c.description}</p>
                              <div className="text-[8px] text-slate-500 text-right font-medium">
                                Submitted: {new Date(c.createdAt).toLocaleDateString('en-IN')}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-xs text-muted-foreground italic">
                          No citizen complaints logged on this segment. This improves the accountability score.
                        </div>
                      )}
                    </div>

                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}      {/* VIEW 5: CITIZEN DEFECT REPORTS / COMPLAINTS */}
      {activeView === 'complaints' && (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden animate-in fade-in duration-300">
          
          {/* Main List */}
          <div className="flex-1 flex flex-col bg-slate-950/45 border border-border/80 rounded-xl p-5 space-y-4 overflow-hidden">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h2 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-cyan-400" /> Citizen Defect Registry ({filteredComplaints.length})
              </h2>
              
              {/* Category Filter */}
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
            </div>

            {/* Simulated report trigger block */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-border/60 flex items-center justify-between flex-wrap gap-4 select-none">
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-250 uppercase tracking-wide flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" /> Offline Reporting Simulator
                </h4>
                <p className="text-[10px] text-muted-foreground max-w-[450px] leading-relaxed">
                  ROADWATCH architecture supports local SQLite/IndexedDB queue states for offline mapping. Click to mock report a new pothole while connection is throttled.
                </p>
              </div>
              <button 
                onClick={handleSimulateReport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 active:scale-95 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" /> Mock Report defect
              </button>
            </div>

            {/* Complaints grid list */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {/* Right Side Details Drawer: Defect Lifecycle Timeline */}
          {selectedComplaintId ? (
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
          )}

        </div>
      )}

      {/* Complaint wizard overlay */}
      <ComplaintWizard />
    </div>
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
