/**
 * Request deduplication cache to prevent duplicate expensive operations
 * Especially useful for AI service calls that may be requested multiple times
 * with identical parameters
 */

import crypto from "crypto";

interface CacheEntry<T> {
  result: T;
  timestamp: number;
  expiresAt: number;
}

export class RequestDeduplicationCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private readonly DEFAULT_TTL = 3600000; // 1 hour default

  /**
   * Generate a deterministic hash for request parameters
   * This allows identical requests to be recognized and deduplicated
   */
  private generateRequestHash(params: any): string {
    // Normalize the params object by sorting keys
    const normalized = JSON.stringify(params, Object.keys(params).sort());
    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  /**
   * Get or execute a request with automatic deduplication
   * - If the same request is in-flight, return the existing promise
   * - If cached and valid, return cached result
   * - Otherwise, execute and cache the result
   */
  async getOrExecute<T>(
    params: any,
    executor: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const hash = this.generateRequestHash(params);
    const now = Date.now();

    // Check if result is cached and still valid
    const cached = this.cache.get(hash);
    if (cached && cached.expiresAt > now) {
      console.log(`[RequestDeduplicationCache] Cache hit for hash: ${hash.substring(0, 8)}...`);
      return cached.result;
    }

    // Check if request is already in-flight
    if (this.pendingRequests.has(hash)) {
      console.log(`[RequestDeduplicationCache] Deduplicating in-flight request: ${hash.substring(0, 8)}...`);
      return this.pendingRequests.get(hash)!;
    }

    // Execute request and cache result
    const promise = executor()
      .then((result) => {
        this.cache.set(hash, {
          result,
          timestamp: now,
          expiresAt: now + ttl,
        });
        this.pendingRequests.delete(hash);
        return result;
      })
      .catch((error) => {
        this.pendingRequests.delete(hash);
        throw error;
      });

    this.pendingRequests.set(hash, promise);
    return promise;
  }

  /**
   * Invalidate cache entries matching a pattern
   * Useful when user profiles are updated
   */
  invalidatePattern(pattern: RegExp): void {
    let invalidated = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    if (invalidated > 0) {
      console.log(`[RequestDeduplicationCache] Invalidated ${invalidated} cache entries`);
    }
  }

  /**
   * Clear all expired entries periodically
   */
  pruneExpired(): void {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        pruned++;
      }
    }
    if (pruned > 0) {
      console.log(`[RequestDeduplicationCache] Pruned ${pruned} expired entries`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; pendingRequests: number } {
    return {
      size: this.cache.size,
      pendingRequests: this.pendingRequests.size,
    };
  }
}

// Singleton instance
export const requestDeduplicationCache = new RequestDeduplicationCache();

// Prune expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    requestDeduplicationCache.pruneExpired();
  }, 5 * 60 * 1000);
}

