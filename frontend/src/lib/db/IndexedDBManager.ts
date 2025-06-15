/**
 * IndexedDB Manager for client-side content caching
 * Provides a persistent cache with TTL support for personalized learning content
 */

interface CachedContent {
  key: string;
  content: string;
  timestamp: number;
  ttl: number;
  version: string;
  personaHash: string;
  metadata?: {
    fileId: string;
    topicId: string;
    subtopic?: string;
    mode: string;
    userId: string;
  };
}

class IndexedDBManager {
  private dbName = 'LearnXCache';
  private version = 1;
  private storeName = 'contentCache';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('userId', 'metadata.userId', { unique: false });
        }
      };
    });
  }

  async get(key: string): Promise<CachedContent | null> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const data = request.result;
        
        // Check if content exists and hasn't expired
        if (data && this.isValid(data)) {
          resolve(data);
        } else {
          // Clean up expired entry
          if (data) {
            this.delete(key);
          }
          resolve(null);
        }
      };
    });
  }

  async set(key: string, content: string, metadata: CachedContent['metadata'], version: string, personaHash: string): Promise<void> {
    await this.init();
    
    const cachedContent: CachedContent = {
      key,
      content,
      timestamp: Date.now(),
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      version,
      personaHash,
      metadata
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(cachedContent);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        // Clean up old entries periodically
        this.cleanupOldEntries();
        resolve();
      };
    });
  }

  async delete(key: string): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAllForUser(userId: string): Promise<CachedContent[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const validContent = request.result.filter(item => this.isValid(item));
        resolve(validContent);
      };
    });
  }

  private isValid(content: CachedContent): boolean {
    const now = Date.now();
    return (now - content.timestamp) < content.ttl;
  }

  private async cleanupOldEntries(): Promise<void> {
    const transaction = this.db!.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('timestamp');
    
    // Get all entries sorted by timestamp
    const request = index.openCursor();
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      
      if (cursor) {
        const data = cursor.value;
        
        // Delete if expired
        if (!this.isValid(data)) {
          cursor.delete();
        }
        
        cursor.continue();
      }
    };
  }

  async getCacheSize(): Promise<{ count: number; estimatedSize: number }> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const countRequest = store.count();
      
      countRequest.onsuccess = async () => {
        const count = countRequest.result;
        
        // Estimate storage size
        if ('estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          resolve({
            count,
            estimatedSize: estimate.usage || 0
          });
        } else {
          resolve({ count, estimatedSize: 0 });
        }
      };
      
      countRequest.onerror = () => reject(countRequest.error);
    });
  }
}

export const indexedDBManager = new IndexedDBManager();
export type { CachedContent };