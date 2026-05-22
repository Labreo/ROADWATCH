import { useStore } from '@/store/useStore';

export class OfflineSyncManager {
  private static retryCount = 0;
  private static maxRetries = 3;
  private static isSyncing = false;

  // Initialize listeners for network connectivity
  public static initialize() {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      useStore.getState().setIsOnline(true);
      console.log('Online transition intercepted. Auto-sync queue initiated...');
      this.triggerAutoSync();
    };

    const handleOffline = () => {
      useStore.getState().setIsOnline(false);
      console.log('Offline transition intercepted. Queued submissions active.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    useStore.getState().setIsOnline(window.navigator.onLine);
  }

  // Simulates an API post with latencies and conditional network check
  public static async triggerAutoSync(): Promise<boolean> {
    if (this.isSyncing) return false;
    
    const store = useStore.getState();
    if (store.offlineQueue.length === 0) return false;

    this.isSyncing = true;
    this.retryCount = 0;

    return this.syncWithRetry();
  }

  private static async syncWithRetry(): Promise<boolean> {
    const store = useStore.getState();
    
    try {
      // Simulate network request delays
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Mock possible network hiccups (10% chance) to showcase retry recovery
          if (Math.random() < 0.1) {
            reject(new Error('Intermittent Municipal Gateway Error (Timeout 504)'));
          } else {
            resolve(true);
          }
        }, 1500);
      });

      await store.processSyncQueue();
      this.isSyncing = false;
      console.log('Sync processing completed successfully.');
      return true;
    } catch (error) {
      console.warn(`Sync attempt ${this.retryCount + 1} failed:`, error);
      this.retryCount++;
      
      if (this.retryCount < this.maxRetries) {
        // Linear backoff delay
        await new Promise((resolve) => setTimeout(resolve, 2000 * this.retryCount));
        return this.syncWithRetry();
      } else {
        console.error('Maximum sync retries reached. Keeping items in local queue.');
        this.isSyncing = false;
        
        // Notify store of sync error
        store.setIsOnline(false); // Force offline fallback state
        return false;
      }
    }
  }
}
