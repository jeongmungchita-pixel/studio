import { describe, it, expect } from 'vitest';
import { withRateLimit, withUserRateLimit } from '../rate-limit';
import { NextResponse } from 'next/server';

function makeReq(url: string, method: string = 'GET', headers?: Record<string, string>): any {
  return {
    method,
    headers: {
      get: (k: string) => headers?.[k] ?? headers?.[k.toLowerCase()] ?? null,
    },
    nextUrl: new URL(url),
    // simulate req.ip for fallback
    ip: headers?.['x-remote-ip'] || undefined,
  } as any;
}

async function okHandler() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

describe('rate-limit (extended)', () => {
  it('prefers x-forwarded-for over other headers and groups by first IP', async () => {
    const req = makeReq('https://ex.com/api/a', 'GET', {
      'x-forwarded-for': '9.9.9.9, 8.8.8.8',
      'x-real-ip': '7.7.7.7',
      'cf-connecting-ip': '6.6.6.6',
    });
    const mw = withRateLimit({ windowMs: 1000, maxRequests: 1 });
    await mw(req as any, okHandler as any);
    const res2 = await mw(req as any, okHandler as any);
    expect(res2.status).toBe(429);
    const body = await res2.json();
    expect(body.retryAfter).toBeGreaterThanOrEqual(0);
  });

  it('withUserRateLimit uses Authorization and falls back to IP when missing', async () => {
    const mw = withUserRateLimit({ windowMs: 5000, maxRequests: 1 });

    // Call with Authorization -> limited on second call
    const authReq = makeReq('https://ex.com/api/u', 'GET', { Authorization: 'Bearer token-1234567890abcdefghij' });
    await mw(authReq as any, okHandler as any);
    const authRes2 = await mw(authReq as any, okHandler as any);
    expect(authRes2.status).toBe(429);

    // Different request without Authorization -> uses IP and should allow first call
    const ipReq = makeReq('https://ex.com/api/u', 'GET', { 'x-forwarded-for': '10.10.10.10' });
    const ipRes = await mw(ipReq as any, okHandler as any);
    expect(ipRes.status).toBe(200);
  });

  it('window boundary resets after windowMs elapsed', async () => {
    const mw = withRateLimit({ windowMs: 10, maxRequests: 1 });
    const req = makeReq('https://ex.com/api/t', 'GET', { 'x-forwarded-for': '11.11.11.11' });
    await mw(req as any, okHandler as any);
    // Wait beyond window to ensure reset even with coarse timers in CI
    await new Promise((r) => setTimeout(r, 20));
    const res = await mw(req as any, okHandler as any);
    expect(res.status).toBe(200);
  });

  it('invokes custom handler when rate limited', async () => {
    const req = makeReq('https://ex.com/api/custom', 'GET', { 'x-forwarded-for': '12.12.12.12' });
    const custom = withRateLimit({
      windowMs: 1000,
      maxRequests: 1,
      handler: () => NextResponse.json({ custom: true }, { status: 429 }),
    });
    await custom(req as any, okHandler as any);
    const res2 = await custom(req as any, okHandler as any);
    expect(res2.status).toBe(429);
    const body = await res2.json();
    expect(body.custom).toBe(true);
  });
});
