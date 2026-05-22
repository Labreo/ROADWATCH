import { create } from 'zustand';
import { RoadStatus, Complaint, SyncQueueItem } from '@/types';
import { complaints as mockComplaints } from '@/data/mockData';

export type AppView = 'dashboard' | 'roads' | 'contractors' | 'budgets' | 'complaints';

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
  offlineQueue: SyncQueueItem[];
  queueComplaint: (complaintData: Omit<Complaint, 'id' | 'createdAt'>) => Complaint;
  processSyncQueue: () => Promise<void>;
  syncQueueCount: number;

  // Wizard state
  isReporting: boolean;
  setIsReporting: (reporting: boolean) => void;

  // Complaints database
  complaintsList: Complaint[];
  addComplaint: (complaint: Complaint) => void;
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

// Helper to load queued offline complaints
const getStoredQueue = (): SyncQueueItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem('roadwatch_offline_queue');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error loading offline queue:', e);
    return [];
  }
};

export const useStore = create<AppState>((set, get) => {
  // Initial lists
  const initialCustomComplaints = getStoredComplaints();
  const initialQueue = getStoredQueue();
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
    activeView: 'dashboard',
    setActiveView: (view) => set({ activeView: view, selectedRoadId: null, selectedComplaintId: null }),

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
    offlineQueue: initialQueue,
    syncQueueCount: initialQueue.length,

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

    queueComplaint: (complaintData) => {
      const generatedId = Math.floor(100000 + Math.random() * 900000);
      const generatedCreatedAt = new Date().toISOString();
      const tempTicketId = `RW-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const newComplaint: Complaint = {
        ...complaintData,
        id: generatedId,
        createdAt: generatedCreatedAt,
        clientTempId: tempTicketId
      };

      const { isOnline: onlineState, offlineQueue, addComplaint } = get();

      if (onlineState) {
        // If online, submit immediately
        addComplaint(newComplaint);
      } else {
        // If offline, save in sync queue
        const syncItem: SyncQueueItem = {
          id: `sync-${generatedId}`,
          action: 'create_complaint',
          payload: newComplaint,
          timestamp: generatedCreatedAt
        };

        const updatedQueue = [...offlineQueue, syncItem];
        set({ 
          offlineQueue: updatedQueue,
          syncQueueCount: updatedQueue.length 
        });

        if (typeof window !== 'undefined') {
          window.localStorage.setItem('roadwatch_offline_queue', JSON.stringify(updatedQueue));
        }
      }

      return newComplaint;
    },

    processSyncQueue: async () => {
      const { offlineQueue, addComplaint, isOnline: onlineState } = get();
      if (!onlineState || offlineQueue.length === 0) return;

      // Simulate a network latency before syncing each item
      const queueToProcess = [...offlineQueue];
      
      // Clear queue state immediately to avoid double submissions during sync
      set({ 
        offlineQueue: [],
        syncQueueCount: 0 
      });
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('roadwatch_offline_queue');
      }

      // Add each item to the active complaints list
      for (const item of queueToProcess) {
        if (item.action === 'create_complaint') {
          // Simulate server status update to 'routed' or 'pending' upon successful sync
          const syncedComplaint: Complaint = {
            ...item.payload,
            status: 'routed' // update state on successful routing
          };
          addComplaint(syncedComplaint);
        }
      }
    }
  };
});
