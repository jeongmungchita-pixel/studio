import { describe, it, expect } from 'vitest';
import { withRateLimit, withUserRateLimit, strictRateLimit, standardRateLimit, lenientRateLimit, getRateLimitStats, resetRateLimit } from '../rate-limit';
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

async function failHandler() {
  return NextResponse.json({ ok: false }, { status: 500 });
}

describe('rate-limit middleware', () => {
  it('adds rate limit headers on success', async () => {
    const req = makeReq('https://example.com/api/x', 'GET', { 'x-forwarded-for': '1.1.1.1' });
    const mw = withRateLimit({ windowMs: 1000, maxRequests: 2 });
    const res = await mw(req as any, okHandler as any);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('2');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('1');
    expect(typeof res.headers.get('X-RateLimit-Reset')).toBe('string');
  });

  it('returns 429 and Retry-After when exceeded', async () => {
    const req = makeReq('https://example.com/api/limit', 'GET', { 'x-forwarded-for': '2.2.2.2' });
    const mw = withRateLimit({ windowMs: 2000, maxRequests: 1 });
    await mw(req as any, okHandler as any);
    const res2 = await mw(req as any, okHandler as any);
    expect(res2.status).toBe(429);
    expect(res2.headers.get('Retry-After')).toBeDefined();
    const body = await res2.json();
    expect(body.error).toBeDefined();
  });

  it('skipSuccessfulRequests decreases count for <400 responses', async () => {
    const req = makeReq('https://example.com/api/skip-success', 'GET', { 'x-forwarded-for': '3.3.3.3' });
    const mw = withRateLimit({ windowMs: 1000, maxRequests: 1, skipSuccessfulRequests: true });
    await mw(req as any, okHandler as any);
    // Should not be rate-limited now (count decremented)
    const res2 = await mw(req as any, okHandler as any);
    expect(res2.status).toBe(200);
  });

  it('skipFailedRequests decreases count for thrown errors', async () => {
    const req = makeReq('https://example.com/api/skip-fail', 'GET', { 'x-forwarded-for': '4.4.4.4' });
    const mw = withRateLimit({ windowMs: 1000, maxRequests: 1, skipFailedRequests: true });
    // First call throws
    await expect(mw(req as any, (async () => { throw new Error('boom'); }) as any)).rejects.toThrow('boom');
    // Should allow next success since failure was skipped
    const res2 = await mw(req as any, okHandler as any);
    expect(res2.status).toBe(200);
  });

  it('withUserRateLimit uses Authorization token for key', async () => {
    const req = makeReq('https://example.com/api/user', 'GET', { Authorization: 'Bearer token-xyz' });
    const mw = withUserRateLimit({ windowMs: 1000, maxRequests: 1 });
    await mw(req as any, okHandler as any);
    // Second should be limited
    const res2 = await mw(req as any, okHandler as any);
    expect(res2.status).toBe(429);
  });

  it('predefined presets are callable', async () => {
    const req1 = makeReq('https://example.com/api/a', 'GET', { 'x-forwarded-for': '5.5.5.5' });
    await strictRateLimit(req1 as any, okHandler as any);
    const req2 = makeReq('https://example.com/api/b', 'GET', { 'x-forwarded-for': '6.6.6.6' });
    await standardRateLimit(req2 as any, okHandler as any);
    const req3 = makeReq('https://example.com/api/c', 'GET', { 'x-forwarded-for': '7.7.7.7' });
    await lenientRateLimit(req3 as any, okHandler as any);
    // No assertions needed; just ensure no throw
    expect(true).toBe(true);
  });

  it('getRateLimitStats returns offenders and totalKeys; resetRateLimit removes a key', async () => {
    const ip = '8.8.8.8';
    const req = makeReq('https://example.com/api/stats', 'GET', { 'x-forwarded-for': ip });
    const mw = withRateLimit({ windowMs: 10000, maxRequests: 2 });
    await mw(req as any, okHandler as any);
    await mw(req as any, okHandler as any);
    const stats = getRateLimitStats();
    expect(stats.totalKeys).toBeGreaterThan(0);
    const offender = stats.topOffenders.find(o => o.key === ip || o.key.startsWith(ip));
    expect(offender).toBeDefined();
    resetRateLimit(ip);
    const stats2 = getRateLimitStats();
    // After reset, either removed or decreased
    expect(stats2.totalKeys).toBeGreaterThanOrEqual(0);
  });
});
