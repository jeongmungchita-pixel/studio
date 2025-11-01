import { NextRequest, NextResponse } from 'next/server';
interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
}
interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  maxRequests?: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (_req: NextRequest) => string; // Custom key generator
  handler?: (_req: NextRequest) => NextResponse; // Custom handler for rate limited requests
  message?: string; // Custom error message
}
/**
 * In-memory store for rate limiting
 */
class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  constructor() {
    // Clean up old entries every minute
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 60 * 1000);
    }
  }
  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key);
  }
  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }
  increment(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now();
    const entry = this.store.get(key);
    if (!entry) {
      // First request from this key
      const newEntry: RateLimitEntry = {
        count: 1,
        firstRequest: now,
        lastRequest: now
      };
      this.store.set(key, newEntry);
      return newEntry;
    }
    // Check if window has expired
    if (now - entry.firstRequest > windowMs) {
      // Reset window
      const newEntry: RateLimitEntry = {
        count: 1,
        firstRequest: now,
        lastRequest: now
      };
      this.store.set(key, newEntry);
      return newEntry;
    }
    // Increment within window
    entry.count++;
    entry.lastRequest = now;
    return entry;
  }
  reset(key: string): void {
    this.store.delete(key);
  }
  cleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour
    for (const [key, entry] of this.store.entries()) {
      if (entry.lastRequest < oneHourAgo) {
        this.store.delete(key);
      }
    }
  }
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
  get size(): number {
    return this.store.size;
  }
  getStats(): {
    totalKeys: number;
    topOffenders: Array<{ key: string; count: number; lastRequest: number }>;
  } {
    const entries = Array.from(this.store.entries())
      .map(([key, entry]) => ({ key, ...entry }))
      .sort((a, b) => b.count - a.count);
    return {
      totalKeys: this.store.size,
      topOffenders: entries.slice(0, 10)
    };
  }
}
// Global store instance
const globalStore = new RateLimitStore();
/**
 * Default key generator (by IP address)
 */
function defaultKeyGenerator(_req: NextRequest): string {
  // Try to get real IP from various headers
  const xForwardedFor = _req.headers.get('x-forwarded-for');
  const xRealIp = _req.headers.get('x-real-ip');
  const cfConnectingIp = _req.headers.get('cf-connecting-ip');
  const clientIp = (_req as any).ip || xForwardedFor || xRealIp || cfConnectingIp || 'unknown';
  if (xForwardedFor) {
    // Take the first IP if there are multiple
    return xForwardedFor.split(',')[0].trim();
  }
  if (xRealIp) {
    return xRealIp;
  }
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  // Fallback to a generic key if no IP found
  return 'unknown-ip';
}
/**
 * Rate limiting middleware
 */
export function withRateLimit(
  options: RateLimitOptions = {}
) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes default
    maxRequests = 100, // 100 requests per window default
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = defaultKeyGenerator,
    message = 'Too many requests, please try again later.'
  } = options;
  return async function rateLimitMiddleware(
    request: NextRequest,
    handler: (_req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const key = keyGenerator(request);
    const entry = globalStore.increment(key, windowMs);
    // Check if rate limit exceeded
    if (entry.count > maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.firstRequest + windowMs - Date.now()) / 1000);
      if (options.handler) {
        return options.handler(request);
      }
      return NextResponse.json(
        {
          error: message,
          retryAfter: retryAfter > 0 ? retryAfter : 0
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter > 0 ? retryAfter : 0),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.firstRequest + windowMs).toISOString()
          }
        }
      );
    }
    // Add rate limit headers
    const remaining = maxRequests - entry.count;
    const reset = new Date(entry.firstRequest + windowMs).toISOString();
    try {
      const response = await handler(request);
      // Add rate limit headers to response
      response.headers.set('X-RateLimit-Limit', String(maxRequests));
      response.headers.set('X-RateLimit-Remaining', String(remaining > 0 ? remaining : 0));
      response.headers.set('X-RateLimit-Reset', reset);
      // Optionally skip counting successful requests
      if (skipSuccessfulRequests && response.status < 400) {
        entry.count--;
      }
      return response;
    } catch (error: unknown) {
      // Optionally skip counting failed requests
      if (skipFailedRequests) {
        entry.count--;
      }
      throw error;
    }
  };
}
/**
 * User-specific rate limiting (requires authentication)
 */
export function withUserRateLimit(
  options: RateLimitOptions = {}
) {
  return withRateLimit({
    ...options,
    keyGenerator: (_req: NextRequest) => {
      // Try to get user ID from authorization header
      const authHeader = _req.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Use token as key (would be better to decode and use uid)
        // For now, use a hash of the token
        const token = authHeader.substring(7);
        return `_user:${token.substring(0, 20)}`; // Use first 20 chars as identifier
      }
      // Fallback to IP-based limiting
      return defaultKeyGenerator(_req);
    }
  });
}
/**
 * Strict rate limiting for sensitive operations
 */
export const strictRateLimit = withRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10, // Only 10 requests per 5 minutes
  message: 'Too many attempts. Please wait before trying again.'
});
/**
 * Standard rate limiting for API endpoints
 */
export const standardRateLimit = withRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
});
/**
 * Lenient rate limiting for read operations
 */
export const lenientRateLimit = withRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 500, // 500 requests per 15 minutes
});
/**
 * Get rate limit statistics
 */
export function getRateLimitStats() {
  return globalStore.getStats();
}
/**
 * Reset rate limit for a specific key
 */
export function resetRateLimit(key: string) {
  globalStore.reset(key);
}
