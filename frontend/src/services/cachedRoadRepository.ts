import { Road, SyncQueueItem } from '@/types';

const DB_NAME = 'roadwatch_db';
const DB_VERSION = 1;

export interface SyncLog {
  id: string;
  timestamp: string;
  count: number;
  success: boolean;
  error?: string;
  items: { title: string; category: string; result: 'synced' | 'failed' | 'conflict_resolved' }[];
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('IndexedDB is not available on server-side'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create Object Stores if they don't exist
        if (!db.objectStoreNames.contains('roads')) {
          db.createObjectStore('roads', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('complaintsQueue')) {
          db.createObjectStore('complaintsQueue', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('syncLogs')) {
          db.createObjectStore('syncLogs', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  // --- Roads Cache Operations ---
  public async cacheRoads(roads: Road[]): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('roads', 'readwrite');
      const store = transaction.objectStore('roads');

      roads.forEach(road => {
        store.put(road);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  public async getCachedRoads(): Promise<Road[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('roads', 'readonly');
      const store = transaction.objectStore('roads');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async getCachedRoad(id: number): Promise<Road | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('roads', 'readonly');
      const store = transaction.objectStore('roads');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  public async clearRoadsCache(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('roads', 'readwrite');
      const store = transaction.objectStore('roads');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Complaints Queue Operations ---
  public async getQueue(): Promise<SyncQueueItem[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('complaintsQueue', 'readonly');
      const store = transaction.objectStore('complaintsQueue');
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort items by timestamp ascending (chronological sync)
        const sorted = (request.result as SyncQueueItem[]).sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async enqueue(item: SyncQueueItem): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('complaintsQueue', 'readwrite');
      const store = transaction.objectStore('complaintsQueue');
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async dequeue(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('complaintsQueue', 'readwrite');
      const store = transaction.objectStore('complaintsQueue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async clearQueue(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('complaintsQueue', 'readwrite');
      const store = transaction.objectStore('complaintsQueue');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Sync Logs Operations ---
  public async getSyncLogs(): Promise<SyncLog[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('syncLogs', 'readonly');
      const store = transaction.objectStore('syncLogs');
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort logs descending (newest first)
        const sorted = (request.result as SyncLog[]).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async addSyncLog(log: SyncLog): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('syncLogs', 'readwrite');
      const store = transaction.objectStore('syncLogs');
      const request = store.put(log);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  public async clearSyncLogs(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('syncLogs', 'readwrite');
      const store = transaction.objectStore('syncLogs');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const CachedRoadRepository = new IndexedDBManager();
