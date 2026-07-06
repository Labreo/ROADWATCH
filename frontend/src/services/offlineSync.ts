import { useStore } from '@/store/useStore';

export class OfflineSyncManager {
  private static retryCount = 0;
  private static maxRetries = 3;
  private static isSyncing = false;

  // Compression pipeline for image assets
  public static async compressMediaAsset(imageBlob: Blob): Promise<Blob> {
    if (typeof window === 'undefined') return imageBlob;

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(imageBlob);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        
        let { width, height } = img;
        const maxW = 1280;
        const maxH = 720;
        
        // Calculate aspect ratio scale
        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2D context from canvas'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Iterative compression loop to ensure size < 500KB
        const maxSizeBytes = 500 * 1024;
        let quality = 0.9;
        
        const getBlobWithQuality = (q: number): Promise<Blob> => {
          return new Promise((resolveBlob, rejectBlob) => {
            canvas.toBlob(
              (b) => {
                if (b) {
                  resolveBlob(b);
                } else {
                  rejectBlob(new Error('Canvas toBlob returned null'));
                }
              },
              'image/jpeg',
              q
            );
          });
        };
        
        const attemptCompression = async (currentQuality: number): Promise<Blob> => {
          try {
            const b = await getBlobWithQuality(currentQuality);
            if (b.size <= maxSizeBytes || currentQuality <= 0.1) {
              return b;
            }
            // Reduce quality and try again
            return attemptCompression(currentQuality - 0.1);
          } catch (err) {
            // If custom canvas compression errors out, fallback to current blob
            return imageBlob;
          }
        };
        
        attemptCompression(quality)
          .then(resolve)
          .catch(reject);
      };
      
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      
      img.src = url;
    });
  }

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
