import { describe, it, expect } from 'vitest';
import { NextResponse } from 'next/server';
import { withUserRateLimit } from '../rate-limit';

function makeReq(url: string, token?: string): any {
  const headers: Record<string,string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return {
    headers: {
      get: (k: string) => headers[k] ?? headers[k.toLowerCase()] ?? null,
    },
    nextUrl: new URL(url),
    method: 'GET',
  } as any;
}

async function ok() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

describe('withUserRateLimit via Authorization header', () => {
  it('limits per user token and returns 429 on second request within window', async () => {
    const mw = withUserRateLimit({ windowMs: 60_000, maxRequests: 1 });
    const req = makeReq('https://x.com/api/user', 'tok_abc1234567890');

    const res1 = await mw(req, ok);
    expect(res1.status).toBe(200);
    expect(res1.headers.get('X-RateLimit-Limit')).toBe('1');

    const res2 = await mw(req, ok);
    expect(res2.status).toBe(429);
    expect(res2.headers.get('Retry-After')).toBeDefined();
    expect(res2.headers.get('X-RateLimit-Limit')).toBe('1');
    expect(res2.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('falls back to IP-based when Authorization missing', async () => {
    const mw = withUserRateLimit({ windowMs: 60_000, maxRequests: 1 });
    const req = makeReq('https://x.com/api/noauth');
    const res1 = await mw(req, ok);
    expect(res1.status).toBe(200);
  });
});
