/**
 * LRU Cache implementation for API responses
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}
interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}
export class LRUCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
  }
  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }
  /**
   * Set value in cache
   */
  set(key: string, data: T, ttl?: number): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttl || this.defaultTTL)
    };
    // Delete existing entry to reinsert at end
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, entry);
  }
  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }
  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }
  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; timestamp: number; expiresAt: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      timestamp: entry.timestamp,
      expiresAt: entry.expiresAt
    }));
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses for accurate rate
      entries
    };
  }
}
/**
 * Global cache instances for different purposes
 */
export const userCache = new LRUCache({ ttl: 5 * 60 * 1000, maxSize: 500 }); // 5 minutes
export const clubCache = new LRUCache({ ttl: 30 * 60 * 1000, maxSize: 100 }); // 30 minutes
export const memberCache = new LRUCache({ ttl: 10 * 60 * 1000, maxSize: 1000 }); // 10 minutes
export const apiResponseCache = new LRUCache({ ttl: 60 * 1000, maxSize: 200 }); // 1 minute
/**
 * Cache key generators
 */
export const cacheKeys = {
  _user: (uid: string) => `_user:${uid}`,
  club: (clubId: string) => `club:${clubId}`,
  member: (memberId: string) => `member:${memberId}`,
  membersByClub: (clubId: string) => `members:club:${clubId}`,
  userRole: (uid: string) => `role:${uid}`,
  apiResponse: (method: string, path: string, params?: string) => 
    `api:${method}:${path}${params ? `:${params}` : ''}`
};
/**
 * Cache decorator for async functions
 */
export function withCache<T extends (...args: unknown[]) => Promise<any>>(
  fn: T,
  getCacheKey: (...args: Parameters<T>) => string,
  options?: CacheOptions
): T {
  const cache = new LRUCache(options);
  return (async (...args: Parameters<T>) => {
    const key = getCacheKey(...args);
    // Check cache first
    const cached = cache.get(key);
    if (cached !== null) {
      return cached;
    }
    // Execute function and cache result
    const result = await fn(...args);
    if (result !== null && result !== undefined) {
      cache.set(key, result);
    }
    return result;
  }) as T;
}
// Periodic cleanup of expired entries (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    userCache.cleanup();
    clubCache.cleanup();
    memberCache.cleanup();
    apiResponseCache.cleanup();
  }, 5 * 60 * 1000);
}
