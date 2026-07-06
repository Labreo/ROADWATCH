import Dexie, { Table } from 'dexie';
import { Road, SyncQueueItem } from '@/types';

export interface SyncLog {
  id: string;
  timestamp: string;
  count: number;
  success: boolean;
  error?: string;
  items: { title: string; category: string; result: 'synced' | 'failed' | 'conflict_resolved' }[];
}

class RoadwatchDatabase extends Dexie {
  public roadsCache!: Table<Road, number>;
  public complaintsQueue!: Table<SyncQueueItem, string>;
  public syncLogs!: Table<SyncLog, string>;

  constructor() {
    super('roadwatch_db');
    this.version(1).stores({
      roadsCache: 'id',
      complaintsQueue: 'id',
      syncLogs: 'id'
    });
  }
}

export const db = new RoadwatchDatabase();

class IndexedDBManager {
  // --- Roads Cache Operations ---
  public async cacheRoads(roads: Road[]): Promise<void> {
    await db.transaction('rw', db.roadsCache, async () => {
      // Dexie bulkPut handles overwrite safely
      await db.roadsCache.bulkPut(roads);
    });
  }

  public async getCachedRoads(): Promise<Road[]> {
    return db.roadsCache.toArray();
  }

  public async getCachedRoad(id: number): Promise<Road | null> {
    const road = await db.roadsCache.get(id);
    return road || null;
  }

  public async clearRoadsCache(): Promise<void> {
    await db.roadsCache.clear();
  }

  // --- Complaints Queue Operations ---
  public async getQueue(): Promise<SyncQueueItem[]> {
    const queue = await db.complaintsQueue.toArray();
    return queue.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  public async enqueue(item: SyncQueueItem): Promise<void> {
    await db.transaction('rw', db.complaintsQueue, async () => {
      await db.complaintsQueue.put(item);
    });
  }

  public async dequeue(id: string): Promise<void> {
    await db.transaction('rw', db.complaintsQueue, async () => {
      await db.complaintsQueue.delete(id);
    });
  }

  public async clearQueue(): Promise<void> {
    await db.complaintsQueue.clear();
  }

  // --- Sync Logs Operations ---
  public async getSyncLogs(): Promise<SyncLog[]> {
    const logs = await db.syncLogs.toArray();
    return logs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public async addSyncLog(log: SyncLog): Promise<void> {
    await db.transaction('rw', db.syncLogs, async () => {
      await db.syncLogs.put(log);
    });
  }

  public async clearSyncLogs(): Promise<void> {
    await db.syncLogs.clear();
  }
}

export const CachedRoadRepository = new IndexedDBManager();
