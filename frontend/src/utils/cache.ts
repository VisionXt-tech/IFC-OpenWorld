/**
 * Client-side Cache Utility
 *
 * Provides in-memory caching with TTL (Time To Live) support.
 * Used to reduce redundant API calls and improve performance.
 */

import { logger } from './logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

class Cache {
  private store: Map<string, CacheEntry<unknown>>;
  private hitCount: number;
  private missCount: number;

  constructor() {
    this.store = new Map();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get value from cache
   * Returns null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.missCount++;
      logger.debug(`[Cache] MISS: ${key}`);
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      this.missCount++;
      logger.debug(`[Cache] EXPIRED: ${key}`);
      return null;
    }

    this.hitCount++;
    logger.debug(`[Cache] HIT: ${key}`);
    return entry.data;
  }

  /**
   * Set value in cache with TTL
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    logger.debug(`[Cache] SET: ${key} (TTL: ${ttl}ms)`);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove specific key from cache
   */
  delete(key: string): boolean {
    const deleted = this.store.delete(key);
    if (deleted) {
      logger.debug(`[Cache] DELETE: ${key}`);
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.store.size;
    this.store.clear();
    logger.debug(`[Cache] CLEAR: Removed ${size} entries`);
  }

  /**
   * Remove all expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.store.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug(`[Cache] CLEANUP: Removed ${removed} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.hitCount + this.missCount;
    return {
      size: this.store.size,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: total > 0 ? (this.hitCount / total) * 100 : 0,
    };
  }

  /**
   * Log cache statistics
   */
  logStats(): void {
    const stats = this.getStats();
    logger.info('[Cache] Statistics:', {
      size: stats.size,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: `${stats.hitRate.toFixed(2)}%`,
    });
  }
}

// Singleton instance
export const cache = new Cache();

// Auto-cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Cache key generators for consistency
 */
export const CacheKeys = {
  buildings: (bbox?: [number, number, number, number]) =>
    bbox ? `buildings:${bbox.join(',')}` : 'buildings:all',

  buildingById: (id: string) => `building:${id}`,

  processingStatus: (taskId: string) => `processing:${taskId}`,

  uploadUrl: (fileName: string) => `upload-url:${fileName}`,
} as const;

/**
 * Helper function to get or fetch with cache
 */
export async function getOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch and cache
  const data = await fetchFn();
  cache.set(key, data, ttl);
  return data;
}

/**
 * Viewport-based cache key generator
 * Groups nearby coordinates into grid cells to maximize cache hits
 */
export function getViewportCacheKey(
  bbox: [number, number, number, number],
  gridSize: number = 0.1 // degrees
): string {
  const [minLon, minLat, maxLon, maxLat] = bbox;

  // Round to grid
  const gridMinLon = Math.floor(minLon / gridSize) * gridSize;
  const gridMinLat = Math.floor(minLat / gridSize) * gridSize;
  const gridMaxLon = Math.ceil(maxLon / gridSize) * gridSize;
  const gridMaxLat = Math.ceil(maxLat / gridSize) * gridSize;

  return `viewport:${gridMinLon},${gridMinLat},${gridMaxLon},${gridMaxLat}`;
}
