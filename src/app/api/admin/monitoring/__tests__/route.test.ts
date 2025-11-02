import { describe, it, expect, vi } from 'vitest';

function makeReq(url: string, method: string = 'GET', headers?: Record<string, string>): any {
  return {
    method,
    headers: {
      get: (k: string) => headers?.[k] ?? headers?.[k.toLowerCase()] ?? null,
    },
    nextUrl: new URL(url),
  } as any;
}

describe('/api/admin/monitoring route', () => {
  it('returns monitoring payload for admin (withAdminAuth mocked)', async () => {
    vi.doMock('@/middleware/auth-enhanced', () => ({
      withAdminAuth: (req: any, handler: any) => handler(req as any),
    }));
    vi.doMock('@/lib/monitoring', () => ({
      getMonitoringData: () => ({
        summary: { totalRequests: 100, totalErrors: 5, avgResponseTime: 1200, topEndpoints: [] },
        metrics: [],
        recentLogs: [],
      }),
    }));
    vi.doMock('@/middleware/rate-limit', () => ({
      getRateLimitStats: () => ({ totalKeys: 1, topOffenders: [] }),
    }));
    vi.doMock('@/lib/cache', () => ({
      userCache: { getStats: () => ({ size: 0, hits: 0, misses: 0 }) },
      clubCache: { getStats: () => ({ size: 0, hits: 0, misses: 0 }) },
      memberCache: { getStats: () => ({ size: 0, hits: 0, misses: 0 }) },
      apiResponseCache: { getStats: () => ({ size: 0, hits: 0, misses: 0 }) },
    }));

    const { GET } = await import('../route');
    const req = makeReq('https://example.com/api/admin/monitoring');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.monitoring.summary.totalRequests).toBe(100);
    expect(json.rateLimiting.totalKeys).toBe(1);
    expect(json.caching.userCache).toBeDefined();
    expect(typeof json.healthScore).toBe('number');
  });
});
