/**
 * Market Data Cache Manager
 * 
 * Provides temporary in-memory caching for market data to avoid redundant API calls
 * during a user session. Cache entries expire after a configurable duration.
 */

import { CacheEntry } from './marketDataTypes';

class MarketDataCacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval to remove expired entries every 5 minutes
    this.startCleanupInterval();
  }

  /**
   * Generate a cache key from request parameters
   */
  private generateCacheKey(source: string, params: Record<string, any>): string {
    const paramString = JSON.stringify(params);
    return `${source}:${Buffer.from(paramString).toString('base64')}`;
  }

  /**
   * Store data in cache
   */
  set<T>(source: string, params: Record<string, any>, data: T, durationMinutes: number = 60): void {
    const key = this.generateCacheKey(source, params);
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    this.cache.set(key, {
      key,
      data,
      expiresAt,
      source,
      createdAt: new Date(),
    });
  }

  /**
   * Retrieve data from cache
   */
  get<T>(source: string, params: Record<string, any>): T | null {
    const key = this.generateCacheKey(source, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if data exists in cache and is not expired
   */
  has(source: string, params: Record<string, any>): boolean {
    const key = this.generateCacheKey(source, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries for a specific source
   */
  clearBySource(source: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.source === source) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let totalEntries = 0;
    let expiredEntries = 0;
    const now = new Date();

    for (const entry of Array.from(this.cache.values())) {
      totalEntries++;
      if (now > entry.expiresAt) {
        expiredEntries++;
      }
    }

    return {
      totalEntries,
      expiredEntries,
      activeEntries: totalEntries - expiredEntries,
    };
  }

  /**
   * Remove expired entries
   */
  private removeExpiredEntries(): void {
    const now = new Date();
    const keysToDelete: string[] = [];

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.removeExpiredEntries();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Allow process to exit even if interval is running
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop the cleanup interval
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Destroy the cache manager
   */
  destroy(): void {
    this.stopCleanupInterval();
    this.clearAll();
  }
}

// Export singleton instance
export const marketDataCache = new MarketDataCacheManager();
