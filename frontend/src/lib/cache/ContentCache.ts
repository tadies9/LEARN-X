/**
 * Content Cache Manager
 * Handles caching strategy with memory and IndexedDB layers
 */

import { indexedDBManager } from '../db/IndexedDBManager';
import crypto from 'crypto-js';

interface CacheOptions {
  userId: string;
  fileId: string;
  topicId: string;
  subtopic?: string;
  mode: string;
  version: string;
  persona?: {
    interests?: string[];
    learningStyle?: string;
    professionalBackground?: string;
    field?: string;
    communicationStyle?: string;
  };
}

interface MemoryCacheItem {
  content: string;
  timestamp: number;
}

class ContentCache {
  private memoryCache = new Map<string, MemoryCacheItem>();
  private maxMemoryItems = 50;
  private preloadQueue = new Set<string>();
  private preloadInProgress = new Set<string>();

  /**
   * Generate cache key from parameters
   */
  private generateKey(options: CacheOptions): string {
    const { userId, fileId, topicId, subtopic, mode } = options;
    return `${userId}_${fileId}_${topicId}_${subtopic || 'main'}_${mode}`;
  }

  /**
   * Generate hash of persona for change detection
   */
  private hashPersona(persona: CacheOptions['persona']): string {
    if (!persona) return 'no-persona';

    const personaString = JSON.stringify({
      interests: persona.interests,
      learningStyle: persona.learningStyle,
      professionalBackground: persona.professionalBackground,
      field: persona.field,
      communicationStyle: persona.communicationStyle,
    });

    return crypto.SHA256(personaString).toString();
  }

  /**
   * Get content from cache (memory first, then IndexedDB)
   */
  async get(options: CacheOptions): Promise<string | null> {
    const key = this.generateKey(options);

    // Check memory cache first
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem) {
      // Refresh memory cache timestamp
      memoryItem.timestamp = Date.now();
      return memoryItem.content;
    }

    // Check IndexedDB
    const cachedContent = await indexedDBManager.get(key);
    if (cachedContent) {
      // Validate version and persona
      const currentPersonaHash = this.hashPersona(options.persona);

      if (
        cachedContent.version === options.version &&
        cachedContent.personaHash === currentPersonaHash
      ) {
        // Add to memory cache for faster access
        this.addToMemoryCache(key, cachedContent.content);

        return cachedContent.content;
      }
    }

    return null;
  }

  /**
   * Set content in both cache layers
   */
  async set(options: CacheOptions, content: string): Promise<void> {
    const key = this.generateKey(options);
    const personaHash = this.hashPersona(options.persona);

    // Add to memory cache
    this.addToMemoryCache(key, content);

    // Save to IndexedDB
    await indexedDBManager.set(
      key,
      content,
      {
        fileId: options.fileId,
        topicId: options.topicId,
        subtopic: options.subtopic,
        mode: options.mode,
        userId: options.userId,
      },
      options.version,
      personaHash
    );
  }

  /**
   * Preload content for progressive loading
   */
  async preload(options: CacheOptions, fetchFn: () => Promise<string>): Promise<void> {
    const key = this.generateKey(options);

    // Skip if already cached or being preloaded
    if ((await this.get(options)) || this.preloadInProgress.has(key)) {
      return;
    }

    // Add to preload queue
    this.preloadQueue.add(key);
    this.preloadInProgress.add(key);

    try {
      const content = await fetchFn();
      await this.set(options, content);
    } catch (error) {
      console.error(`Failed to preload ${key}:`, error);
    } finally {
      this.preloadInProgress.delete(key);
      this.preloadQueue.delete(key);
    }
  }

  /**
   * Clear cache for a specific file
   */
  async clearForFile(userId: string, fileId: string): Promise<void> {
    // Clear from memory cache
    for (const [key] of this.memoryCache) {
      if (key.includes(`${userId}_${fileId}`)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear from IndexedDB
    const allContent = await indexedDBManager.getAllForUser(userId);
    for (const item of allContent) {
      if (item.metadata?.fileId === fileId) {
        await indexedDBManager.delete(item.key);
      }
    }
  }

  /**
   * Clear all cache for a user
   */
  async clearForUser(userId: string): Promise<void> {
    // Clear from memory cache
    for (const [key] of this.memoryCache) {
      if (key.startsWith(userId)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear from IndexedDB
    const allContent = await indexedDBManager.getAllForUser(userId);
    for (const item of allContent) {
      await indexedDBManager.delete(item.key);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memoryCacheSize: number;
    indexedDBStats: { count: number; estimatedSize: number };
    preloadQueueSize: number;
  }> {
    const indexedDBStats = await indexedDBManager.getCacheSize();

    return {
      memoryCacheSize: this.memoryCache.size,
      indexedDBStats,
      preloadQueueSize: this.preloadQueue.size,
    };
  }

  /**
   * Add to memory cache with LRU eviction
   */
  private addToMemoryCache(key: string, content: string): void {
    // If at capacity, remove oldest item
    if (this.memoryCache.size >= this.maxMemoryItems) {
      let oldestKey = '';
      let oldestTime = Date.now();

      for (const [k, v] of this.memoryCache) {
        if (v.timestamp < oldestTime) {
          oldestTime = v.timestamp;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    this.memoryCache.set(key, {
      content,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if content is being preloaded
   */
  isPreloading(options: CacheOptions): boolean {
    const key = this.generateKey(options);
    return this.preloadInProgress.has(key);
  }

  /**
   * Clear specific cache entry
   */
  async clear(options: CacheOptions): Promise<void> {
    const key = this.generateKey(options);

    // Clear from memory cache
    this.memoryCache.delete(key);

    // Clear from IndexedDB
    await indexedDBManager.delete(key);
  }
}

export const contentCache = new ContentCache();
export type { CacheOptions };
