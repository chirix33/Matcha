/**
 * Cache for company insights with 7-day TTL as specified in requirements
 * Reduces AI costs and improves response times for repeated job views
 */

import type { CompanyInsight } from "@/types/job";
import { createHash } from "crypto";

interface CachedInsight {
  insight: CompanyInsight;
  timestamp: number;
  expiresAt: number;
}

const INSIGHT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class CompanyInsightsCache {
  private cache: Map<string, CachedInsight> = new Map();
  private readonly MAX_CACHE_SIZE = 500; // Limit memory usage

  /**
   * Generate cache key from job ID and description hash
   * Uses job ID + description hash to detect if job description changed
   */
  private generateCacheKey(jobId: string, description: string): string {
    // Hash description to detect changes
    const descHash = createHash("md5").update(description).digest("hex").substring(0, 8);
    return `insight:${jobId}:${descHash}`;
  }

  /**
   * Get cached insight if available and valid
   */
  get(jobId: string, description: string): CompanyInsight | null {
    const key = this.generateCacheKey(jobId, description);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (cached.expiresAt <= now) {
      // Expired, remove it
      this.cache.delete(key);
      return null;
    }

    console.log(`[CompanyInsightsCache] Cache hit for job: ${jobId}`);
    return cached.insight;
  }

  /**
   * Store insight in cache
   */
  set(jobId: string, description: string, insight: CompanyInsight): void {
    const key = this.generateCacheKey(jobId, description);
    const now = Date.now();

    // Enforce cache size limit (LRU eviction)
    if (this.cache.size >= this.MAX_CACHE_SIZE && !this.cache.has(key)) {
      this.evictOldest();
    }

    this.cache.set(key, {
      insight,
      timestamp: now,
      expiresAt: now + INSIGHT_CACHE_TTL_MS,
    });

    console.log(`[CompanyInsightsCache] Cached insight for job: ${jobId}`);
  }

  /**
   * Evict oldest entry (LRU)
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clear expired entries
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
      console.log(`[CompanyInsightsCache] Pruned ${pruned} expired entries`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
    };
  }
}

// Singleton instance
export const companyInsightsCache = new CompanyInsightsCache();

// Prune expired entries every hour
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    companyInsightsCache.pruneExpired();
  }, 60 * 60 * 1000);
}

