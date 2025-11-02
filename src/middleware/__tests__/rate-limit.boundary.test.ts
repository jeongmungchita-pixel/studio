import { describe, it, expect } from 'vitest';
import { withRateLimit } from '../rate-limit';
import { NextResponse } from 'next/server';

function makeReq(url: string, method: string = 'GET', headers?: Record<string, string>): any {
  return {
    method,
    headers: {
      get: (k: string) => headers?.[k] ?? headers?.[k.toLowerCase()] ?? null,
    },
    nextUrl: new URL(url),
  } as any;
}

async function okHandler() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

describe('rate-limit boundary headers', () => {
  it('sets Remaining=0 and Retry-After on limit exceed within same window', async () => {
    const req = makeReq('https://example.com/api/boundary', 'GET', { 'x-forwarded-for': '9.9.9.9' });
    const mw = withRateLimit({ windowMs: 2000, maxRequests: 1 });

    // First request consumes the only slot
    const res1 = await mw(req as any, okHandler as any);
    expect(res1.headers.get('X-RateLimit-Limit')).toBe('1');
    expect(res1.headers.get('X-RateLimit-Remaining')).toBe('0');

    // Second request in same window should be 429
    const res2 = await mw(req as any, okHandler as any);
    expect(res2.status).toBe(429);
    expect(res2.headers.get('X-RateLimit-Remaining')).toBe('0');

    const retry = res2.headers.get('Retry-After');
    expect(retry).toBeDefined();
    const retryNum = Number(retry);
    expect(Number.isNaN(retryNum)).toBe(false);
    expect(retryNum).toBeGreaterThanOrEqual(0);
  });
});
