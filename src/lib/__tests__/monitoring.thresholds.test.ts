import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withMonitoring, checkAndAlert } from '../monitoring';

function makeReq(url: string, method: string = 'GET', headers?: Record<string, string>): any {
  return {
    method,
    headers: {
      get: (k: string) => headers?.[k.toLowerCase()] ?? headers?.[k] ?? null,
    },
    nextUrl: new URL(url),
  } as any;
}

// Mocks for firebase-admin modules to avoid real calls
vi.mock('@/lib/firebase-admin', () => ({
  initAdmin: vi.fn(async () => {}),
}));

const addSpy = vi.fn(async () => ({}));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: () => ({
      add: addSpy,
      doc: () => ({ get: vi.fn(async () => ({ exists: true, data: () => ({}) })) }),
    }),
  })),
}));
vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({ listUsers: vi.fn(async () => ({ users: [] })) })),
}));

async function ok() { return new Response('ok', { status: 200 }); }
async function fail() { return new Response('bad', { status: 500 }); }

describe('monitoring thresholds', () => {
  beforeEach(() => {
    addSpy.mockClear();
  });

  it('triggers alert when error rate exceeds 20%', async () => {
    const wrappedOk = withMonitoring(ok);
    const wrappedFail = withMonitoring(fail);

    const req = makeReq('https://example.com/api/err-rate');

    // 3 successes, 2 failures => 40% error rate (>20)
    await wrappedOk(req);
    await wrappedOk(req);
    await wrappedOk(req);
    await wrappedFail(req);
    await wrappedFail(req);

    await checkAndAlert();

    const calls = addSpy.mock.calls as unknown as any[][];
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = (calls.length > 0 ? calls[calls.length - 1] : undefined) as any[] | undefined;
    const payload = (lastCall && lastCall[0]) as any | undefined;
    expect(!!payload && Array.isArray(payload.alerts)).toBe(true);
    // Should include high error rate message
    const alerts: string[] = (payload?.alerts as string[]) || [];
    expect(alerts.some(a => a.toLowerCase().includes('error rate'))).toBe(true);
  });

  it('triggers alert when a specific endpoint has low successRate with sufficient count', async () => {
    const req = makeReq('https://example.com/api/failing-endpoint');
    const failing = vi.fn(async () => new Response('bad', { status: 500 }));
    const wrappedFailing = withMonitoring(failing);

    // Make >10 failing requests to drop successRate < 50 for this endpoint
    for (let i = 0; i < 12; i++) {
      await wrappedFailing(req);
    }

    await checkAndAlert();

    const calls2 = addSpy.mock.calls as unknown as any[][];
    expect(calls2.length).toBeGreaterThan(0);
    const lastCall = (calls2.length > 0 ? calls2[calls2.length - 1] : undefined) as any[] | undefined;
    const payload = (lastCall && lastCall[0]) as any | undefined;
    const alerts: string[] = payload?.alerts as string[] || [];
    expect(alerts.some(a => a.toLowerCase().includes('endpoint failing'))).toBe(true);
  });
});
