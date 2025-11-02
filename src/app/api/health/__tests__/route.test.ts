import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

function makeReq(url: string, method: string = 'GET', headers?: Record<string, string>): any {
  return {
    method,
    headers: {
      get: (k: string) => headers?.[k] ?? headers?.[k.toLowerCase()] ?? null,
    },
    nextUrl: new URL(url),
  } as any;
}

describe('/api/health route', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 and healthy payload when monitoring reports healthy', async () => {
    vi.doMock('@/lib/monitoring', () => ({
      getHealthCheck: vi.fn(async () => ({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 12345,
        metrics: { totalRequests: 10, errorRate: 0, avgResponseTime: 50 },
        services: { firebase: true, firestore: true },
      })),
    }));
    const { GET: Route } = await import('../route');
    const req = makeReq('https://example.com/api/health');
    const res = await Route(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('healthy');
    expect(json.services.firebase).toBe(true);
  });

  it('returns 503 when monitoring throws', async () => {
    vi.doMock('@/lib/monitoring', () => ({
      getHealthCheck: vi.fn(async () => { throw new Error('fail'); }),
    }));
    const { GET: Route } = await import('../route');
    const req = makeReq('https://example.com/api/health');
    const res = await Route(req as any);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.status).toBe('unhealthy');
  });
});
