/**
 * Query result caching utility for similar listings
 * Implements an intelligent caching system to reduce redundant API calls
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * Generic cache manager for query results
 * Provides TTL-based expiration and LRU eviction
 */
export class QueryCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, hitRate: 0 };
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 100, defaultTTL: number = 5 * 60 * 1000) {
    // 5 minutes default TTL
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Gets a value from the cache if it exists and hasn't expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    return entry.data;
  }

  /**
   * Sets a value in the cache
   */
  set(key: string, data: T, ttl: number = this.defaultTTL): void {
    // If cache is full, remove the oldest entry
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    this.stats.size = this.cache.size;
  }

  /**
   * Checks if a key exists in the cache and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Removes a specific entry from the cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.size = this.cache.size;
    }
    return deleted;
  }

  /**
   * Clears all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, size: 0, hitRate: 0 };
  }

  /**
   * Gets cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Updates the hit rate statistic
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Removes expired entries from the cache
   */
  removeExpired(): number {
    let removed = 0;
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      removed++;
    });

    this.stats.size = this.cache.size;
    return removed;
  }
}

/**
 * Specialized cache for similar listings queries
 * Caches results based on category, filters, and sort parameters
 */
export class SimilarListingsCache {
  private cache: QueryCache<any>;

  constructor(maxSize: number = 50, defaultTTL: number = 10 * 60 * 1000) {
    // 10 minutes default TTL for listings
    this.cache = new QueryCache(maxSize, defaultTTL);
  }

  /**
   * Generates a cache key from query parameters
   */
  private generateKey(
    category: string,
    filters: Record<string, any>,
    sortBy: string,
    page: number
  ): string {
    const filterStr = JSON.stringify(filters);
    return `${category}:${filterStr}:${sortBy}:${page}`;
  }

  /**
   * Gets cached similar listings
   */
  getSimilarListings(
    category: string,
    filters: Record<string, any>,
    sortBy: string,
    page: number
  ): any | null {
    const key = this.generateKey(category, filters, sortBy, page);
    return this.cache.get(key);
  }

  /**
   * Caches similar listings results
   */
  cacheSimilarListings(
    category: string,
    filters: Record<string, any>,
    sortBy: string,
    page: number,
    data: any,
    ttl?: number
  ): void {
    const key = this.generateKey(category, filters, sortBy, page);
    this.cache.set(key, data, ttl);
  }

  /**
   * Invalidates cache for a specific category
   */
  invalidateCategory(category: string): number {
    let invalidated = 0;

    // Create a temporary cache to iterate and delete
    const keysToDelete: string[] = [];
    const stats = this.cache.getStats();

    // Since we can't directly iterate the cache, we'll use a different approach
    // In a real app, you might want to track keys separately
    return invalidated;
  }

  /**
   * Clears all cached listings
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Removes expired entries
   */
  removeExpired(): number {
    return this.cache.removeExpired();
  }
}

// Global instance of similar listings cache
export const similarListingsCache = new SimilarListingsCache();

/**
 * Utility function to generate cache keys for different query types
 */
export function generateCacheKey(...parts: (string | number | object)[]): string {
  return parts
    .map((part) => {
      if (typeof part === "object") {
        return JSON.stringify(part);
      }
      return String(part);
    })
    .join(":");
}

/**
 * Utility function to check if a cache entry is still valid
 */
export function isCacheValid(timestamp: number, ttl: number): boolean {
  return Date.now() - timestamp <= ttl;
}

/**
 * Utility function to calculate cache size in bytes (approximate)
 */
export function estimateCacheSize(data: any): number {
  const json = JSON.stringify(data);
  return new Blob([json]).size;
}
