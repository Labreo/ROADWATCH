import { create } from 'zustand';
import { RoadStatus, Complaint, SyncQueueItem, Road } from '@/types';
import { complaints as mockComplaints, roads as mockRoads } from '@/data/mockData';
import { CachedRoadRepository, SyncLog } from '@/services/cachedRoadRepository';
import { playbackSteps } from '@/data/historicalData';

export type AppView = 'dashboard' | 'roads' | 'contractors' | 'budgets' | 'complaints' | 'admin' | 'playback' | 'sensors' | 'twin';

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

  // View Navigation
  activeView: AppView;
  setActiveView: (view: AppView) => void;

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
  queueComplaint: (complaintData: Omit<Complaint, 'id' | 'createdAt'>) => Complaint;
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
    setSelectedRoadId: (id) => set({ selectedRoadId: id }),
    selectedComplaintId: null,
    setSelectedComplaintId: (id) => set({ selectedComplaintId: id }),

    // Navigation
    activeView: 'roads',
    setActiveView: (view) => set({ activeView: view, selectedRoadId: null, selectedComplaintId: null }),

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

    queueComplaint: (complaintData) => {
      const generatedId = Math.floor(100000 + Math.random() * 900000);
      const generatedCreatedAt = new Date().toISOString();
      const tempTicketId = `RW-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const newComplaint: Complaint = {
        ...complaintData,
        id: generatedId,
        createdAt: generatedCreatedAt,
        clientTempId: tempTicketId,
        status: 'pending'
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
          imagePreview: complaintData.imagePreview
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

        // 1. Check for simulated conflict
        const isConflict = 
          item.payload.title?.toLowerCase().includes('conflict') ||
          item.payload.description?.toLowerCase().includes('conflict');

        if (isConflict) {
          failedCount++;
          errorOccurredMsg = 'Conflict detected: A similar report is already active in this jurisdiction.';
          
          // Add to conflicts list if not already there
          const existingConflicts = get().conflicts;
          if (!existingConflicts.some(c => c.id === item.id)) {
            const serverItem: Complaint = {
              ...item.payload,
              id: Math.floor(200000 + Math.random() * 900000),
              title: `[Existing] ${item.payload.title}`,
              description: `This report was submitted by another citizen on ${new Date(Date.now() - 86400000).toLocaleDateString()} and is already under PWD review.`,
              status: 'in_progress',
              createdAt: new Date(Date.now() - 86400000 * 2).toISOString() // 2 days ago
            };
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

          itemsLogged.push({
            title: item.payload.title || 'Complaint',
            category: item.payload.category || 'General',
            result: 'failed'
          });

          continue;
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

      const isConflict = 
        item.payload.title?.toLowerCase().includes('conflict') ||
        item.payload.description?.toLowerCase().includes('conflict');

      if (isConflict) {
        // Handle conflict
        const existingConflicts = get().conflicts;
        if (!existingConflicts.some(c => c.id === item.id)) {
          const serverItem: Complaint = {
            ...item.payload,
            id: Math.floor(200000 + Math.random() * 900000),
            title: `[Existing] ${item.payload.title}`,
            description: `This report was submitted by another citizen on ${new Date(Date.now() - 86400000).toLocaleDateString()} and is already under PWD review.`,
            status: 'in_progress',
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
          };
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

