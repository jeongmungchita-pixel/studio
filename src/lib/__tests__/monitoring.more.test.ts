import { describe, it, expect, vi } from 'vitest';
import { LogLevel, withMonitoring, getMonitoringData, logApiRequest } from '../monitoring';

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
async function fail() { return new Response('bad', { status: 500 }); }

describe('monitoring (more)', () => {
  it('records WARN/ERROR levels via logApiRequest metadata', async () => {
    const req = makeReq('https://example.com/api/x');
    await logApiRequest(req, { level: LogLevel.WARN, metadata: { k: 'v' } });
    const data = getMonitoringData();
    expect(data.recentLogs[0].level).toBe(LogLevel.WARN);
    expect(data.recentLogs[0].metadata).toMatchObject({ k: 'v' });
  });

  it('withMonitoring sets X-Response-Time header and error responses count as errors', async () => {
    const req1 = makeReq('https://example.com/api/s');
    const res1 = await withMonitoring(ok)(req1);
    expect(res1.headers.get('X-Response-Time')).toContain('ms');

    const req2 = makeReq('https://example.com/api/f');
    const res2 = await withMonitoring(fail)(req2);
    // even without throw, 500 should increase error metrics and be logged
    const data = getMonitoringData();
    expect(data.summary.totalRequests).toBeGreaterThan(0);
    // Ensure at least one error counted
    expect(data.summary.totalErrors).toBeGreaterThanOrEqual(1);
  });
});
