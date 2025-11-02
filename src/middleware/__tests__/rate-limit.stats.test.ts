import { describe, it, expect } from 'vitest';
import { NextResponse } from 'next/server';
import { withRateLimit, getRateLimitStats } from '../rate-limit';

function makeReq(url: string, ip: string): any {
  const headers: Record<string,string> = { 'x-real-ip': ip };
  return {
    headers: { get: (k: string) => headers[k] ?? headers[k.toLowerCase()] ?? null },
    nextUrl: new URL(url),
    method: 'GET',
  } as any;
}

async function ok() { return NextResponse.json({ ok: true }, { status: 200 }); }

describe('rate-limit stats', () => {
  it('collects entries and exposes topOffenders', async () => {
    const mw = withRateLimit({ windowMs: 60_000, maxRequests: 2 });
    // ip1 makes 3 requests, exceeding limit
    await mw(makeReq('https://x.com/a', '1.1.1.1'), ok);
    await mw(makeReq('https://x.com/a', '1.1.1.1'), ok);
    await mw(makeReq('https://x.com/a', '1.1.1.1'), ok).catch(() => {});
    // ip2 makes 1 request
    await mw(makeReq('https://x.com/b', '2.2.2.2'), ok);

    const stats = getRateLimitStats();
    expect(stats.totalKeys).toBeGreaterThanOrEqual(2);
    expect(stats.topOffenders.length).toBeGreaterThan(0);
    const first = stats.topOffenders[0];
    expect(first.key).toBeDefined();
    expect(first.count).toBeGreaterThan(0);
  });
});
