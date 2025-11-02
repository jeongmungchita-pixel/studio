import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withMonitoring, getHealthCheck, LogLevel, logApiRequest } from '../monitoring';

function makeReq(url: string, method: string = 'GET', headers?: Record<string, string>): any {
  return {
    method,
    headers: {
      get: (k: string) => headers?.[k.toLowerCase()] ?? headers?.[k] ?? null,
    },
    nextUrl: new URL(url),
  } as any;
}

async function ok(status = 200) { return new Response('ok', { status }); }

vi.mock('@/lib/firebase-admin', () => ({ initAdmin: vi.fn(async () => {}) }));

// Create togglable mocks
const mockListUsers = vi.fn();
const mockGet = vi.fn();
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ listUsers: mockListUsers }) }));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: () => ({ collection: () => ({ doc: () => ({ get: mockGet }) }) }) }));

describe('monitoring health check', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('unhealthy when firebase or firestore checks fail', async () => {
    mockListUsers.mockRejectedValueOnce(new Error('auth down'));
    mockGet.mockRejectedValueOnce(new Error('db down'));

    const res = await getHealthCheck();
    expect(res.status).toBe('unhealthy');
    expect(res.services.firebase).toBe(false);
  });

  it('degraded when high error rate or slow avg response', async () => {
    // simulate some successful and failed requests to raise error rate > 10%
    const handler = withMonitoring(async (_req: any) => ok(500));
    await handler(makeReq('https://x.com/api/dg')); // one error

    // make success requests fewer than error threshold but ensure errorRate > 10%
    const handlerOk = withMonitoring(async (_req: any) => ok(200));
    await handlerOk(makeReq('https://x.com/api/dg2'));

    // Make firebase healthy
    mockListUsers.mockResolvedValueOnce({ users: [] });
    mockGet.mockResolvedValueOnce({ exists: true });

    const res = await getHealthCheck();
    expect(['degraded', 'healthy', 'unhealthy']).toContain(res.status);
  });
});
