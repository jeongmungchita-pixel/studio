import { describe, it, expect } from 'vitest';
import { withRateLimit, standardRateLimit, strictRateLimit } from '../rate-limit';

function makeReq(url: string, method: string = 'GET', headers?: Record<string, string>): any {
  return {
    method,
    headers: {
      get: (k: string) => headers?.[k.toLowerCase()] ?? headers?.[k] ?? null,
    },
    nextUrl: new URL(url),
  } as any;
}

async function ok() { return new Response('ok', { status: 200 }); }

describe('rate-limit more', () => {
  it('exceeds maxRequests returns 429 with headers', async () => {
    const rl = withRateLimit({ windowMs: 1000, maxRequests: 2, keyGenerator: () => 'test-key-1' });
    const req = makeReq('https://ex.com/api/a');
    const h = rl as any;
    const r1 = await h(req, ok as any);
    expect(r1.status).toBe(200);
    const r2 = await h(req, ok as any);
    expect(r2.status).toBe(200);
    const r3 = await h(req, ok as any);
    expect(r3.status).toBe(429);
    expect(r3.headers.get('Retry-After')).toBeDefined();
    expect(r3.headers.get('X-RateLimit-Limit')).toBe('2');
    expect(r3.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('standard vs strict limits differ in headers on first request', async () => {
    const reqStd = makeReq('https://ex.com/api/std');
    const resStd = await (standardRateLimit as any)(reqStd, ok as any);
    expect(resStd.headers.get('X-RateLimit-Limit')).toBe('100');

    const reqStrict = makeReq('https://ex.com/api/strict');
    const resStrict = await (strictRateLimit as any)(reqStrict, ok as any);
    expect(resStrict.headers.get('X-RateLimit-Limit')).toBe('10');
  });

  it('skipSuccessfulRequests reduces count so 429 is avoided', async () => {
    const rl = withRateLimit({ windowMs: 1000, maxRequests: 1, keyGenerator: () => 'test-key-2', skipSuccessfulRequests: true });
    const req = makeReq('https://ex.com/api/b');
    const h = rl as any;
    const r1 = await h(req, ok as any);
    expect(r1.status).toBe(200);
    // because skipSuccessfulRequests, the count is decremented; next should still pass
    const r2 = await h(req, ok as any);
    expect(r2.status).toBe(200);
  });
});
