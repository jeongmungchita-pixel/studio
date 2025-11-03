import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withMonitoring, getMonitoringData, LogLevel, logApiRequest } from '../monitoring';

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

// Helper to control Date.now return values in sequence
function mockNowSequence(values: number[]) {
  const spy = vi.spyOn(Date, 'now');
  values.forEach((v) => spy.mockReturnValueOnce(v));
  return spy;
}

describe('monitoring summary/top/slowest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('computes summary and rankings with multiple endpoints', async () => {
    const base = 1700000000000;
    const handler = withMonitoring(async (_req: any) => ok(200));
    // Three endpoints with different durations using Date.now sequence per call (start, end)
    mockNowSequence([base + 0, base + 10]);
    await handler(makeReq('https://x.com/api/a'));

    mockNowSequence([base + 100, base + 150]);
    await handler(makeReq('https://x.com/api/b'));

    mockNowSequence([base + 200, base + 205]);
    await handler(makeReq('https://x.com/api/c'));

    // Add an error response to check error counts
    const handlerErr = withMonitoring(async (_req: any) => ok(500));
    mockNowSequence([base + 300, base + 320]);
    await handlerErr(makeReq('https://x.com/api/b'));

    // Add a WARN log to recentLogs
    await logApiRequest(makeReq('https://x.com/api/log'), { level: LogLevel.WARN, metadata: { t: 1 } });

    const data = getMonitoringData();
    const { summary, metrics, recentLogs } = data;

    // We made 4 requests in this test; totalRequests should be >= 4 (others may exist from other tests)
    expect(summary.totalRequests).toBeGreaterThanOrEqual(4);
    expect(summary.totalErrors).toBeGreaterThanOrEqual(1);
    expect(summary.avgResponseTime).toBeGreaterThan(0);
    expect(summary.successRate).toBeGreaterThan(0);

    // Metrics should include our endpoints
    const keys = metrics.map(m => `${m.method}:${m.endpoint}`);
    expect(keys).toEqual(expect.arrayContaining(['GET:/api/a', 'GET:/api/b', 'GET:/api/c']));

    // Slowest should have /api/b (50ms then 20ms -> avg 35) near front compared to 10ms and 5ms
    const slowest = data.summary.slowestEndpoints.map(e => e.endpoint);
    expect(slowest[0]).toBe('/api/b');

    // recentLogs should include our WARN
    expect(recentLogs[0].level === LogLevel.WARN || recentLogs.some(l => l.level === LogLevel.WARN)).toBe(true);
  });
});
