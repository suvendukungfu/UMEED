/**
 * In-Memory Sliding-Window Rate Limiter
 *
 * Provides localized brute-force and abuse protection for public endpoints:
 * - POST /api/incidents/ingest: Limits report flooding.
 * - GET /api/incidents/:publicReference: Limits tracking token guessing attempts.
 *
 * Architectural Boundary Disclosure:
 * This implementation is strictly an in-memory, single-instance rate limiter.
 * In a distributed, multi-replica environment, a shared datastore (e.g. Redis/Upstash)
 * or edge gateway (Cloudflare, Nginx, AWS WAF) is required.
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTimeMs: number;
}

interface WindowRecord {
  timestamps: number[];
}

export class MemoryRateLimiter {
  private records: Map<string, WindowRecord> = new Map();
  private defaultLimit: number;
  private defaultWindowMs: number;

  constructor(defaultLimit = 30, defaultWindowMs = 60 * 1000) {
    this.defaultLimit = defaultLimit;
    this.defaultWindowMs = defaultWindowMs;
  }

  /**
   * Check whether a client request is within the allowed threshold.
   */
  check(
    key: string,
    limit = this.defaultLimit,
    windowMs = this.defaultWindowMs
  ): RateLimitResult {
    const now = Date.now();
    const windowStart = now - windowMs;

    let record = this.records.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.records.set(key, record);
    }

    // Purge expired timestamps outside the sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= limit) {
      const oldestInWindow = record.timestamps[0];
      const resetTimeMs = Math.max(0, oldestInWindow + windowMs - now);
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetTimeMs,
      };
    }

    // Record this request
    record.timestamps.push(now);

    return {
      allowed: true,
      limit,
      remaining: limit - record.timestamps.length,
      resetTimeMs: windowMs,
    };
  }

  /**
   * Reset all rate-limiting records (used for test isolation).
   */
  reset(): void {
    this.records.clear();
  }
}

// Singletons for distinct security policies
export const ingestionRateLimiter = new MemoryRateLimiter(30, 60 * 1000); // 30 req/min for intake
export const trackingRateLimiter = new MemoryRateLimiter(10, 60 * 1000); // 10 req/min for tracking token auth
