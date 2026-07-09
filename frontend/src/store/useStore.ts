import { create } from 'zustand';
import { RoadStatus, Complaint, SyncQueueItem, Road, NotificationItem, FontSizeLevel, ContrastMode, Locale } from '@/types';
import { complaints as mockComplaints, roads as mockRoads } from '@/data/mockData';
import { CachedRoadRepository, SyncLog } from '@/services/cachedRoadRepository';
import { OfflineSyncManager } from '@/services/offlineSync';
import { playbackSteps } from '@/data/historicalData';
import { generateStressZones } from '@/data/sensorData';

export type AppView = 'dashboard' | 'roads' | 'contractors' | 'budgets' | 'complaints' | 'admin' | 'playback' | 'sensors' | 'twin' | 'chat';

interface AppState {
  // Sidebar State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Search and Filter State
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: RoadStatus | 'all';
  setStatusFilter: (filter: RoadStatus | 'all') => void;

  // Selected Entities
  selectedRoadId: number | null;
  setSelectedRoadId: (id: number | null) => void;
  selectedComplaintId: number | null;
  setSelectedComplaintId: (id: number | null) => void;
  selectedContractorId: number | null;
  setSelectedContractorId: (id: number | null) => void;

  // View Navigation
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  dispatchChatAction: (action: { type: string; payload: any }) => void;
  isChatDriven: boolean;
  setIsChatDriven: (val: boolean) => void;

  // Online / Offline Capability & Local Queue
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  isSyncing: boolean;
  offlineQueue: SyncQueueItem[];
  syncQueueCount: number;
  syncLogs: SyncLog[];
  cachedRoads: Road[];
  conflicts: { id: string; localItem: SyncQueueItem; serverItem: Complaint }[];

  loadCachedData: () => Promise<void>;
  cacheAllRoadsOffline: () => Promise<void>;
  clearCachedRoads: () => Promise<void>;
  queueComplaint: (complaintData: Omit<Complaint, 'id' | 'createdAt'>) => Promise<Complaint>;
  processSyncQueue: () => Promise<void>;
  retrySyncItem: (id: string) => Promise<void>;
  discardSyncItem: (id: string) => Promise<void>;
  resolveConflict: (id: string, resolution: 'keep_local' | 'keep_server' | 'discard') => Promise<void>;

  // Wizard state
  isReporting: boolean;
  setIsReporting: (reporting: boolean) => void;

  // Complaints database
  complaintsList: Complaint[];
  addComplaint: (complaint: Complaint) => void;
  updateComplaint: (id: number, updates: Partial<Complaint>) => void;
  getSortedComplaintQueue: () => Complaint[]; // Priority-sorted queue

  // Notifications
  notifications: NotificationItem[];
  addNotification: (notification: NotificationItem) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // Reassignment / Decline
  declineComplaintAssignment: (complaintId: number, authorityId: number, reason?: string) => Promise<{ status: string; newAuthorityId?: number } | null>;
  
  // Scheduled Repairs
  scheduledRepairs: {
    id: string;
    complaintId: number;
    roadId: number;
    contractorId: number;
    scheduledDate: string;
    engineerName: string;
    notes?: string;
  }[];
  scheduleRepair: (repair: {
    complaintId: number;
    roadId: number;
    contractorId: number;
    scheduledDate: string;
    engineerName: string;
    notes?: string;
  }) => void;

  // Playback Timeline State
  currentPlaybackStepId: string;
  isPlaybackPlaying: boolean;
  playbackSpeed: number;
  setPlaybackStepId: (stepId: string) => void;
  setPlaybackPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  stepPlaybackForward: () => void;
  stepPlaybackBackward: () => void;

  // Map Camera Control Viewport
  mapViewport: { center: [number, number]; zoom: number } | null;
  setMapViewport: (viewport: { center: [number, number]; zoom: number } | null) => void;

  // WebGL & Telemetry State
  canvasAction: { type: string; coordinates?: [number, number, number]; [key: string]: any } | null;
  setCanvasAction: (action: { type: string; coordinates?: [number, number, number]; [key: string]: any } | null) => void;
  uStructuralStressIntensity: number;
  setUStructuralStressIntensity: (val: number) => void;

  // Region State
  regionCode: string;
  setRegionCode: (code: string) => void;

  // Exchange Rate State
  exchangeTargetCurrency: string;
  setExchangeTargetCurrency: (currency: string) => void;

  // Accessibility State
  contrastMode: ContrastMode;
  setContrastMode: (mode: ContrastMode) => void;
  fontSize: FontSizeLevel;
  setFontSize: (size: FontSizeLevel) => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  reducedMotion: boolean;
  setReducedMotion: (val: boolean) => void;
}

// Helper to load custom complaints from LocalStorage
const getStoredComplaints = (): Complaint[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem('roadwatch_custom_complaints');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error loading custom complaints:', e);
    return [];
  }
};

export const useStore = create<AppState>((set, get) => {
  // Initial lists (localStorage fallback for custom synced complaints)
  const initialCustomComplaints = getStoredComplaints();
  const initialComplaintsList = [...initialCustomComplaints, ...mockComplaints];

  return {
    // Sidebar State
    sidebarOpen: true,
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

    // Search / Filters
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),
    statusFilter: 'all',
    setStatusFilter: (filter) => set({ statusFilter: filter }),

    // Selected Entities
    selectedRoadId: null,
    setSelectedRoadId: (id) => {
      set({ selectedRoadId: id });
      if (id !== null) {
        const zones = generateStressZones(mockRoads as any);
        const zone = zones.find(z => z.roadId === id);
        if (zone) {
          set({ uStructuralStressIntensity: zone.stressIndex / 100 });
        } else {
          set({ uStructuralStressIntensity: 0.0 });
        }
      } else {
        set({ uStructuralStressIntensity: 0.0 });
      }
    },
    selectedComplaintId: null,
    setSelectedComplaintId: (id) => set({ selectedComplaintId: id }),
    selectedContractorId: null,
    setSelectedContractorId: (id) => set({ selectedContractorId: id }),

    // Navigation
    activeView: 'chat',
    setActiveView: (view) => set({ activeView: view, selectedRoadId: null, selectedComplaintId: null, selectedContractorId: null, isChatDriven: false }),
    isChatDriven: false,
    setIsChatDriven: (val) => set({ isChatDriven: val }),

    dispatchChatAction: (action) => {
      const { type, payload } = action;
      if (!payload) return;

      const eventType = type || payload.type || payload.view;

      set((state) => {
        const updates: Partial<AppState> = {
          isChatDriven: true,
        };

        if (eventType === 'TRIGGER_DIGITAL_TWIN' || payload.view === 'twin') {
          updates.activeView = 'twin';
          const roadIdVal = payload.roadId !== undefined ? payload.roadId : payload.selectedRoadId;
          if (roadIdVal !== undefined) {
            updates.selectedRoadId = roadIdVal;
            if (roadIdVal !== null) {
              const zones = generateStressZones(mockRoads as any);
              const zone = zones.find(z => z.roadId === roadIdVal);
              updates.uStructuralStressIntensity = zone ? zone.stressIndex / 100 : 0.0;
            } else {
              updates.uStructuralStressIntensity = 0.0;
            }
          }
        } else if (eventType === 'FOCUS_GEOSPATIAL_MAP' || payload.view === 'map' || payload.view === 'roads') {
          updates.activeView = 'roads';
          const roadIdVal = payload.roadId !== undefined ? payload.roadId : payload.selectedRoadId;
          if (roadIdVal !== undefined) {
            updates.selectedRoadId = roadIdVal;
          }
          let center = payload.coordinates || payload.center;
          if (!center && roadIdVal !== undefined && roadIdVal !== null) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const road = mockRoads.find(r => r.id === roadIdVal) as any;
            if (road && road.geometry && road.geometry.coordinates && road.geometry.coordinates.length > 0) {
              center = road.geometry.coordinates[0];
            }
          }
          if (center) {
            updates.mapViewport = {
              center,
              zoom: payload.zoom || 14,
            };
          }
        } else if (eventType === 'MOUNT_BUDGET_SANKEY' || payload.view === 'budgets') {
          updates.activeView = 'budgets';
          const roadIdVal = payload.roadId !== undefined ? payload.roadId : payload.selectedRoadId;
          if (roadIdVal !== undefined) {
            updates.selectedRoadId = roadIdVal;
          }
        } else if (eventType === 'RENDER_CONTRACTOR_AUDIT' || payload.view === 'contractors') {
          updates.activeView = 'contractors';
          const contractorIdVal = payload.contractorId !== undefined ? payload.contractorId : payload.selectedContractorId;
          if (contractorIdVal !== undefined) {
            updates.selectedContractorId = contractorIdVal;
          }
        } else {
          // Fallback legacy navigation payload
          if (payload.view) {
            const v = payload.view;
            if (v === 'map' || v === 'roads') {
              updates.activeView = 'roads';
            } else if (['dashboard', 'contractors', 'budgets', 'complaints', 'admin', 'playback', 'sensors', 'twin', 'chat'].includes(v)) {
              updates.activeView = v;
            }
          }
          const roadIdVal = payload.roadId !== undefined ? payload.roadId : payload.selectedRoadId;
          if (roadIdVal !== undefined) {
            updates.selectedRoadId = roadIdVal;
          }
        }

        if (payload.complaintId !== undefined) {
          updates.selectedComplaintId = payload.complaintId;
        } else if (payload.selectedComplaintId !== undefined) {
          updates.selectedComplaintId = payload.selectedComplaintId;
        }

        if (payload.canvasAction) {
          updates.canvasAction = payload.canvasAction;
        } else if (payload.coordinates) {
          updates.canvasAction = { type: 'FOCUS_COORDINATES', coordinates: payload.coordinates };
        }

        return updates;
      });
    },

    // Playback State
    currentPlaybackStepId: '2026-Q2',
    isPlaybackPlaying: false,
    playbackSpeed: 1500,
    setPlaybackStepId: (stepId) => set({ currentPlaybackStepId: stepId }),
    setPlaybackPlaying: (playing) => set({ isPlaybackPlaying: playing }),
    setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
    stepPlaybackForward: () => {
      const { currentPlaybackStepId } = get();
      const currentIndex = playbackSteps.findIndex(s => s.id === currentPlaybackStepId);
      if (currentIndex < playbackSteps.length - 1) {
        set({ currentPlaybackStepId: playbackSteps[currentIndex + 1].id });
      } else {
        set({ isPlaybackPlaying: false });
      }
    },
    stepPlaybackBackward: () => {
      const { currentPlaybackStepId } = get();
      const currentIndex = playbackSteps.findIndex(s => s.id === currentPlaybackStepId);
      if (currentIndex > 0) {
        set({ currentPlaybackStepId: playbackSteps[currentIndex - 1].id });
      }
    },

    // Map Viewport
    mapViewport: null,
    setMapViewport: (viewport) => set({ mapViewport: viewport }),

    // WebGL / Telemetry
    canvasAction: null,
    setCanvasAction: (action) => set({ canvasAction: action }),
    uStructuralStressIntensity: (() => {
      const firstRoad = mockRoads[0];
      if (firstRoad) {
        const zones = generateStressZones(mockRoads as any);
        const zone = zones.find(z => z.roadId === firstRoad.id);
        return zone ? zone.stressIndex / 100 : 0.0;
      }
      return 0.0;
    })(),
    setUStructuralStressIntensity: (val) => set({ uStructuralStressIntensity: val }),

    // Region State
    regionCode: (() => {
      if (typeof window === 'undefined') return 'IN';
      return localStorage.getItem('rw_region') || 'IN';
    })(),
    setRegionCode: (code) => {
      set({ regionCode: code });
      if (typeof window !== 'undefined') {
        localStorage.setItem('rw_region', code);
      }
    },

    // Exchange Rate State
    exchangeTargetCurrency: 'USD',
    setExchangeTargetCurrency: (currency) => set({ exchangeTargetCurrency: currency }),

    // Accessibility State
    contrastMode: (() => {
      if (typeof window === 'undefined') return 'normal';
      return (localStorage.getItem('rw_contrast') as ContrastMode) || 'normal';
    })(),
    setContrastMode: (mode) => {
      set({ contrastMode: mode });
      if (typeof window !== 'undefined') {
        localStorage.setItem('rw_contrast', mode);
        document.documentElement.classList.toggle('high-contrast', mode === 'high');
      }
    },
    fontSize: (() => {
      if (typeof window === 'undefined') return 'default';
      return (localStorage.getItem('rw_fontsize') as FontSizeLevel) || 'default';
    })(),
    setFontSize: (size) => {
      set({ fontSize: size });
      if (typeof window !== 'undefined') {
        localStorage.setItem('rw_fontsize', size);
        document.documentElement.classList.remove('font-size-small', 'font-size-large');
        if (size !== 'default') {
          document.documentElement.classList.add(`font-size-${size}`);
        }
      }
    },
    locale: (() => {
      if (typeof window === 'undefined') return 'en-IN';
      return (localStorage.getItem('rw_locale') as Locale) || 'en-IN';
    })(),
    setLocale: (locale) => {
      set({ locale });
      if (typeof window !== 'undefined') {
        localStorage.setItem('rw_locale', locale);
      }
    },
    reducedMotion: (() => {
      if (typeof window === 'undefined') return false;
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    })(),
    setReducedMotion: (val) => {
      set({ reducedMotion: val });
      if (typeof window !== 'undefined') {
        document.documentElement.classList.toggle('reduced-motion', val);
      }
    },

    // Network / Offline Queue
    isOnline: typeof window !== 'undefined' ? window.navigator.onLine : true,
    setIsOnline: (online) => {
      const wasOffline = !get().isOnline;
      set({ isOnline: online });
      // If we transition from offline -> online, auto process the sync queue
      if (wasOffline && online && get().offlineQueue.length > 0) {
        get().processSyncQueue();
      }
    },
    isSyncing: false,
    offlineQueue: [],
    syncQueueCount: 0,
    syncLogs: [],
    cachedRoads: [],
    conflicts: [],

    loadCachedData: async () => {
      try {
        const queue = await CachedRoadRepository.getQueue();
        const logs = await CachedRoadRepository.getSyncLogs();
        const roads = await CachedRoadRepository.getCachedRoads();
        set({
          offlineQueue: queue,
          syncQueueCount: queue.length,
          syncLogs: logs,
          cachedRoads: roads
        });
      } catch (error) {
        console.error('Failed to load cached offline data:', error);
      }
    },

    cacheAllRoadsOffline: async () => {
      try {
        await CachedRoadRepository.cacheRoads(mockRoads);
        const roads = await CachedRoadRepository.getCachedRoads();
        set({ cachedRoads: roads });
      } catch (error) {
        console.error('Failed to cache roads offline:', error);
      }
    },

    clearCachedRoads: async () => {
      try {
        await CachedRoadRepository.clearRoadsCache();
        set({ cachedRoads: [] });
      } catch (error) {
        console.error('Failed to clear cached roads:', error);
      }
    },

    // Report Wizard toggle
    isReporting: false,
    setIsReporting: (reporting) => set({ isReporting: reporting }),

    // Complaints database state
    complaintsList: initialComplaintsList,
    addComplaint: (complaint) => {
      const updatedList = [complaint, ...get().complaintsList];
      set({ complaintsList: updatedList });
      
      // Save custom complaints to local storage
      if (typeof window !== 'undefined') {
        const custom = updatedList.filter(
          c => !mockComplaints.some(mc => mc.id === c.id)
        );
        window.localStorage.setItem('roadwatch_custom_complaints', JSON.stringify(custom));
      }
    },
    updateComplaint: (id, updates) => {
      set((state) => ({
        complaintsList: state.complaintsList.map(c =>
          c.id === id ? { ...c, ...updates } : c
        )
      }));

      // Save custom complaints to local storage if edited
      if (typeof window !== 'undefined') {
        const { complaintsList } = get();
        const custom = complaintsList.filter(
          c => !mockComplaints.some(mc => mc.id === c.id)
        );
        window.localStorage.setItem('roadwatch_custom_complaints', JSON.stringify(custom));
      }
    },
    getSortedComplaintQueue: () => {
      return [...get().complaintsList]
        .filter(c => c.status !== 'resolved' && c.status !== 'rejected')
        .sort((a, b) => {
          // Sort by priority DESC, escalation_level DESC, created_at ASC
          const aPriority = a.priority || 3;
          const bPriority = b.priority || 3;
          if (bPriority !== aPriority) return bPriority - aPriority;

          const aEsc = a.escalationLevel || 0;
          const bEsc = b.escalationLevel || 0;
          if (bEsc !== aEsc) return bEsc - aEsc;

          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
    },

    // Notifications
    notifications: [],
    addNotification: (notification) => {
      set((state) => ({
        notifications: [notification, ...state.notifications].slice(0, 100), // Keep last 100
      }));
    },
    markNotificationRead: (id) => {
      set((state) => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, read: true } : n
        ),
      }));
    },
    clearNotifications: () => set({ notifications: [] }),

    // Reassignment / Decline
    declineComplaintAssignment: async (complaintId, authorityId, reason) => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/v1/complaints/${complaintId}/decline`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ authorityId, reason }),
          }
        );
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || 'Decline failed');
        }
        const data = await res.json();

        // Update local state
        if (data.status === 'reassigned') {
          get().updateComplaint(complaintId, {
            assignedAuthorityId: data.new_authority_id,
            declinedAuthorityIds: data.declined_authority_ids,
          });
          get().addNotification({
            id: `notif-${Date.now()}`,
            title: 'Complaint Reassigned',
            message: `Reassigned to authority #${data.new_authority_id}`,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'info',
            eventType: 'complaint.declined',
            complaintId,
          });
        } else if (data.status === 'rejected') {
          get().updateComplaint(complaintId, {
            status: 'rejected',
            declinedAuthorityIds: data.declined_authority_ids,
          });
          get().addNotification({
            id: `notif-${Date.now()}`,
            title: 'Complaint Rejected',
            message: 'All authorities declined — complaint rejected.',
            timestamp: new Date().toISOString(),
            read: false,
            type: 'alert',
            eventType: 'complaint.declined',
            complaintId,
          });
        }
        return data;
      } catch (err) {
        console.error('Decline complaint failed:', err);
        return null;
      }
    },

    // Scheduled Repairs
    scheduledRepairs: [],
    scheduleRepair: (repairData) => {
      const newRepair = {
        ...repairData,
        id: `rep-${Math.floor(100000 + Math.random() * 900000)}`
      };
      set((state) => ({
        scheduledRepairs: [...state.scheduledRepairs, newRepair]
      }));
      // Auto-update complaint status to 'in_progress' and link road if appropriate
      get().updateComplaint(repairData.complaintId, { status: 'in_progress' });
    },

    queueComplaint: async (complaintData) => {
      const generatedId = Math.floor(100000 + Math.random() * 900000);
      const generatedCreatedAt = new Date().toISOString();
      const tempTicketId = `RW-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      let processedImagePreview = complaintData.imagePreview;
      if (processedImagePreview && processedImagePreview.startsWith('data:image')) {
        try {
          const response = await fetch(processedImagePreview);
          const blob = await response.blob();
          
          const compressedBlob = await OfflineSyncManager.compressMediaAsset(blob);
          
          processedImagePreview = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(compressedBlob);
          });
        } catch (err) {
          console.error('Image compression failed, using original:', err);
        }
      }

      const newComplaint: Complaint = {
        ...complaintData,
        id: generatedId,
        createdAt: generatedCreatedAt,
        clientTempId: tempTicketId,
        status: 'pending',
        imagePreview: processedImagePreview
      };

      const { isOnline: onlineState, offlineQueue, addComplaint } = get();

      if (onlineState) {
        // If online, submit immediately
        addComplaint({ ...newComplaint, status: 'routed' });
      } else {
        // If offline, save in sync queue
        const syncItem: SyncQueueItem = {
          id: `sync-${generatedId}`,
          action: 'create_complaint',
          payload: newComplaint,
          timestamp: generatedCreatedAt,
          status: 'pending',
          imagePreview: processedImagePreview
        };

        const updatedQueue = [...offlineQueue, syncItem];
        set({ 
          offlineQueue: updatedQueue,
          syncQueueCount: updatedQueue.length 
        });

        // Async write to IndexedDB
        CachedRoadRepository.enqueue(syncItem).catch(err => {
          console.error('IndexedDB enqueue failed:', err);
        });
      }

      return newComplaint;
    },

    processSyncQueue: async () => {
      const { offlineQueue, isOnline: onlineState, isSyncing, addComplaint } = get();
      if (!onlineState || offlineQueue.length === 0 || isSyncing) return;

      set({ isSyncing: true });

      const queueToProcess = [...offlineQueue];
      const itemsLogged: { title: string; category: string; result: 'synced' | 'failed' | 'conflict_resolved' }[] = [];
      let successCount = 0;
      let failedCount = 0;
      let errorOccurredMsg = '';

      for (const item of queueToProcess) {
        // Set item to syncing status
        const updatedQueue = get().offlineQueue.map(q => 
          q.id === item.id ? { ...q, status: 'syncing' as const } : q
        );
        set({ offlineQueue: updatedQueue });
        await CachedRoadRepository.enqueue({ ...item, status: 'syncing' });

        // Simulate network latency
        await new Promise(resolve => setTimeout(resolve, 1200));

        let responseStatus = 200;
        const isConflict = 
          item.payload.title?.toLowerCase().includes('conflict') ||
          item.payload.description?.toLowerCase().includes('conflict');

        try {
          const res = await fetch('http://localhost:8000/api/v1/complaints', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload)
          });
          responseStatus = res.status;
        } catch (e) {
          // If connection fails/no route, fallback to simulated status code
          responseStatus = isConflict ? 409 : 200;
        }

        // Catch 409 data conflict status code
        if (responseStatus === 409) {
          failedCount++;
          errorOccurredMsg = 'Conflict detected: A similar report is already active in this jurisdiction.';
          
          const serverItem: Complaint = {
            ...item.payload,
            id: Math.floor(200000 + Math.random() * 900000),
            title: `[Existing] ${item.payload.title}`,
            description: `This report was submitted by another citizen and is already under PWD review (Duplicate detected by authority rules).`,
            status: 'in_progress',
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString() // 2 days ago
          };

          // Log structural payload differences
          const payloadDiffs: Record<string, { local: any; server: any }> = {};
          const allKeys = Array.from(new Set([...Object.keys(item.payload), ...Object.keys(serverItem)]));
          for (const key of allKeys) {
            const localVal = (item.payload as any)[key];
            const serverVal = (serverItem as any)[key];
            if (JSON.stringify(localVal) !== JSON.stringify(serverVal)) {
              payloadDiffs[key] = { local: localVal, server: serverVal };
            }
          }
          console.warn('[Conflict 409 Intercepted] Structural payload differences:', payloadDiffs);

          // Mount conflict directly to reactive conflicts array
          const existingConflicts = get().conflicts;
          if (!existingConflicts.some(c => c.id === item.id)) {
            set({ conflicts: [...existingConflicts, { id: item.id, localItem: item, serverItem }] });
          }

          // Mark item as failed in offline queue
          const failedItem: SyncQueueItem = {
            ...item,
            status: 'failed',
            error: 'Conflict: Ticket already exists'
          };
          const postFailedQueue = get().offlineQueue.map(q => q.id === item.id ? failedItem : q);
          set({ offlineQueue: postFailedQueue });
          await CachedRoadRepository.enqueue(failedItem);

          itemsLogged.push({
            title: item.payload.title || 'Complaint',
            category: item.payload.category || 'General',
            result: 'failed'
          });

          // Immediately halt execution of the processing loop
          break;
        }

        // 2. Simulate 15% chance of random municipal gateway error to show retry resilience
        const hasNetworkHiccup = Math.random() < 0.15;
        if (hasNetworkHiccup) {
          failedCount++;
          errorOccurredMsg = 'Intermittent Municipal Gateway Error (Timeout 504)';
          
          const failedItem: SyncQueueItem = {
            ...item,
            status: 'failed',
            error: errorOccurredMsg
          };
          const postFailedQueue = get().offlineQueue.map(q => q.id === item.id ? failedItem : q);
          set({ offlineQueue: postFailedQueue });
          await CachedRoadRepository.enqueue(failedItem);

          itemsLogged.push({
            title: item.payload.title || 'Complaint',
            category: item.payload.category || 'General',
            result: 'failed'
          });
          continue;
        }

        // 3. Successful sync
        successCount++;
        const syncedComplaint: Complaint = {
          ...item.payload,
          status: 'routed'
        };
        addComplaint(syncedComplaint);

        // Remove from store queue
        const postSuccessQueue = get().offlineQueue.filter(q => q.id !== item.id);
        set({ 
          offlineQueue: postSuccessQueue,
          syncQueueCount: postSuccessQueue.length
        });
        
        // Remove from IndexedDB queue
        await CachedRoadRepository.dequeue(item.id);

        itemsLogged.push({
          title: item.payload.title || 'Complaint',
          category: item.payload.category || 'General',
          result: 'synced'
        });
      }

      // Add Sync Log
      if (itemsLogged.length > 0) {
        const syncLog: SyncLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          count: itemsLogged.length,
          success: failedCount === 0,
          error: failedCount > 0 ? errorOccurredMsg : undefined,
          items: itemsLogged
        };

        const updatedLogs = [syncLog, ...get().syncLogs];
        set({ syncLogs: updatedLogs });
        await CachedRoadRepository.addSyncLog(syncLog);
      }

      set({ isSyncing: false });
    },

    retrySyncItem: async (id) => {
      const { offlineQueue, isOnline: onlineState, isSyncing, addComplaint } = get();
      if (!onlineState || isSyncing) return;

      const item = offlineQueue.find(q => q.id === id);
      if (!item) return;

      set({ isSyncing: true });

      // Update status to syncing
      const updatedQueue = offlineQueue.map(q => 
        q.id === id ? { ...q, status: 'syncing' as const } : q
      );
      set({ offlineQueue: updatedQueue });
      await CachedRoadRepository.enqueue({ ...item, status: 'syncing' });

      // Simulate latency
      await new Promise(resolve => setTimeout(resolve, 1500));

      let responseStatus = 200;
      const isConflict = 
        item.payload.title?.toLowerCase().includes('conflict') ||
        item.payload.description?.toLowerCase().includes('conflict');

      try {
        const res = await fetch('http://localhost:8000/api/v1/complaints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload)
        });
        responseStatus = res.status;
      } catch (e) {
        responseStatus = isConflict ? 409 : 200;
      }

      if (responseStatus === 409) {
        // Handle conflict
        const serverItem: Complaint = {
          ...item.payload,
          id: Math.floor(200000 + Math.random() * 900000),
          title: `[Existing] ${item.payload.title}`,
          description: `This report was submitted by another citizen and is already under PWD review (Duplicate detected by authority rules).`,
          status: 'in_progress',
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
        };

        // Log structural payload differences
        const payloadDiffs: Record<string, { local: any; server: any }> = {};
        const allKeys = Array.from(new Set([...Object.keys(item.payload), ...Object.keys(serverItem)]));
        for (const key of allKeys) {
          const localVal = (item.payload as any)[key];
          const serverVal = (serverItem as any)[key];
          if (JSON.stringify(localVal) !== JSON.stringify(serverVal)) {
            payloadDiffs[key] = { local: localVal, server: serverVal };
          }
        }
        console.warn('[Conflict 409 Intercepted on Retry] Structural payload differences:', payloadDiffs);

        const existingConflicts = get().conflicts;
        if (!existingConflicts.some(c => c.id === item.id)) {
          set({ conflicts: [...existingConflicts, { id: item.id, localItem: item, serverItem }] });
        }

        const failedItem: SyncQueueItem = {
          ...item,
          status: 'failed',
          error: 'Conflict: Ticket already exists'
        };
        const postFailedQueue = get().offlineQueue.map(q => q.id === item.id ? failedItem : q);
        set({ offlineQueue: postFailedQueue });
        await CachedRoadRepository.enqueue(failedItem);

        const syncLog: SyncLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          count: 1,
          success: false,
          error: 'Conflict detected during manual retry',
          items: [{ title: item.payload.title || 'Complaint', category: item.payload.category || 'General', result: 'failed' }]
        };
        set({ syncLogs: [syncLog, ...get().syncLogs] });
        await CachedRoadRepository.addSyncLog(syncLog);
        
        set({ isSyncing: false });
        return;
      }

      // Success sync
      const syncedComplaint: Complaint = {
        ...item.payload,
        status: 'routed'
      };
      addComplaint(syncedComplaint);

      const postSuccessQueue = get().offlineQueue.filter(q => q.id !== id);
      set({ 
        offlineQueue: postSuccessQueue,
        syncQueueCount: postSuccessQueue.length
      });
      await CachedRoadRepository.dequeue(id);

      const syncLog: SyncLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        count: 1,
        success: true,
        items: [{ title: item.payload.title || 'Complaint', category: item.payload.category || 'General', result: 'synced' }]
      };
      set({ syncLogs: [syncLog, ...get().syncLogs] });
      await CachedRoadRepository.addSyncLog(syncLog);

      set({ isSyncing: false });
    },

    discardSyncItem: async (id) => {
      const { offlineQueue } = get();
      const updatedQueue = offlineQueue.filter(q => q.id !== id);
      set({ 
        offlineQueue: updatedQueue,
        syncQueueCount: updatedQueue.length,
        conflicts: get().conflicts.filter(c => c.id !== id)
      });
      await CachedRoadRepository.dequeue(id);
    },

    resolveConflict: async (id, resolution) => {
      const conflict = get().conflicts.find(c => c.id === id);
      if (!conflict) return;

      const { localItem, serverItem } = conflict;

      if (resolution === 'keep_local') {
        const syncedComplaint: Complaint = {
          ...localItem.payload,
          status: 'routed'
        };
        get().addComplaint(syncedComplaint);
        
        const syncLog: SyncLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          count: 1,
          success: true,
          items: [{ title: localItem.payload.title || 'Complaint', category: localItem.payload.category || 'General', result: 'conflict_resolved' }]
        };
        set({ syncLogs: [syncLog, ...get().syncLogs] });
        await CachedRoadRepository.addSyncLog(syncLog);
      } else if (resolution === 'keep_server') {
        get().addComplaint(serverItem);
        
        const syncLog: SyncLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          count: 1,
          success: true,
          items: [{ title: serverItem.title || 'Complaint', category: serverItem.category || 'General', result: 'conflict_resolved' }]
        };
        set({ syncLogs: [syncLog, ...get().syncLogs] });
        await CachedRoadRepository.addSyncLog(syncLog);
      }
      
      const updatedQueue = get().offlineQueue.filter(q => q.id !== id);
      set({
        offlineQueue: updatedQueue,
        syncQueueCount: updatedQueue.length,
        conflicts: get().conflicts.filter(c => c.id !== id)
      });
      await CachedRoadRepository.dequeue(id);
    }
  };
});

