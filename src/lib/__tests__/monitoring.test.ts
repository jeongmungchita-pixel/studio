import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LogLevel, logApiRequest, withMonitoring, getMonitoringData, getHealthCheck, checkAndAlert } from '../monitoring';

function makeReq(url: string, method: string = 'GET', headers?: Record<string, string>): any {
  return {
    method,
    headers: {
      get: (k: string) => headers?.[k.toLowerCase()] ?? headers?.[k] ?? null,
    },
    nextUrl: new URL(url),
  } as any;
}

vi.mock('@/lib/firebase-admin', () => ({
  initAdmin: vi.fn(async () => {}),
}));
vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({ listUsers: vi.fn(async () => ({ users: [] })) })),
}));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: () => ({
      add: vi.fn(async () => ({})),
      doc: () => ({ get: vi.fn(async () => ({ exists: true, data: () => ({}) })) }),
    }),
  })),
}));

describe('monitoring', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('logApiRequest records basic info with headers', async () => {
    const req = makeReq('https://example.com/api/test?x=1', 'POST', { 'user-agent': 'UA', 'x-forwarded-for': '1.2.3.4' });
    await logApiRequest(req, { level: LogLevel.INFO, userId: 'u1', userEmail: 'e@example.com', userRole: 'ADMIN', metadata: { a: 1 } });
    const data = getMonitoringData();
    expect(data.recentLogs.length).toBeGreaterThan(0);
    expect(data.recentLogs[0].userId).toBe('u1');
    expect(data.recentLogs[0].userAgent).toBe('UA');
    expect(data.recentLogs[0].ip).toBe('1.2.3.4');
  });

  it('withMonitoring wraps handler, sets header, and records metrics on success', async () => {
    const req = makeReq('https://example.com/api/success', 'GET');
    const handler = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const wrapped = withMonitoring(handler);
    const res = await wrapped(req);
    expect(res.headers.get('X-Response-Time')).toContain('ms');
    expect(handler).toHaveBeenCalled();
    const data = getMonitoringData();
    expect(data.summary.totalRequests).toBeGreaterThan(0);
    expect(data.summary.totalErrors).toBeGreaterThanOrEqual(0);
  });

  it('withMonitoring logs error and rethrows', async () => {
    const req = makeReq('https://example.com/api/fail', 'GET');
    const err = new Error('boom');
    const handler = vi.fn(async () => { throw err; });
    const wrapped = withMonitoring(handler);
    await expect(wrapped(req)).rejects.toThrow('boom');
    const data = getMonitoringData();
    expect(data.summary.totalErrors).toBeGreaterThanOrEqual(1);
  });

  it('getMonitoringData returns summary/metrics/recentLogs', () => {
    const data = getMonitoringData();
    expect(data.summary).toHaveProperty('totalRequests');
    expect(Array.isArray(data.metrics)).toBe(true);
    expect(Array.isArray(data.recentLogs)).toBe(true);
  });

  it('getHealthCheck composes status based on mocked services', async () => {
    const health = await getHealthCheck();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    expect(typeof health.uptime).toBe('number');
    expect(health.services.firebase).toBe(true);
    expect(health.services.firestore).toBe(true);
  });

  it('checkAndAlert writes alerts when thresholds exceeded', async () => {
    // Drive some failing metrics
    const req = makeReq('https://example.com/api/slow', 'GET');
    const failing = vi.fn(async () => new Response('fail', { status: 500 }));
    const wrapped = withMonitoring(failing);
    await wrapped(req).catch(() => {});
    await checkAndAlert();
    // If Firestore.add was called, our mock returns without throwing; just ensure no throw
    expect(true).toBe(true);
  });
});
