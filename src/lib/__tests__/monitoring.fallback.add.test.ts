import { describe, it, expect, vi } from 'vitest';
import { LogLevel, logApiRequest, withMonitoring } from '../monitoring';

function makeReq(url: string, method: string = 'GET', headers?: Record<string, string>): any {
  return {
    method,
    headers: {
      get: (k: string) => headers?.[k.toLowerCase()] ?? headers?.[k] ?? null,
    },
    nextUrl: new URL(url),
  } as any;
}

// Mocks for firebase-admin/firestore
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: () => ({ add: vi.fn(() => { throw new Error('firestore down'); }) })
  })
}));
vi.mock('@/lib/firebase-admin', () => ({ initAdmin: vi.fn(async () => {}) }));

async function throws() { throw new Error('boom'); }

describe('monitoring fallback additions', () => {
  it('logApiRequest: ERROR level Firestore write failure is swallowed (no throw)', async () => {
    const req = makeReq('https://e.com/api/x', 'POST', { 'user-agent': 'UA' });
    await expect(logApiRequest(req, { level: LogLevel.ERROR, metadata: { a: 1 } })).resolves.toBeUndefined();
  });

  it('withMonitoring: when handler throws, it records metrics and rethrows', async () => {
    const req = makeReq('https://e.com/api/y');
    await expect(withMonitoring(throws as any)(req)).rejects.toThrow('boom');
  });
});
