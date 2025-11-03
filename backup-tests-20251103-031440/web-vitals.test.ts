import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('web-vitals', () => {
  return {
    onCLS: (cb: any) => cb({ value: 0.05, delta: 0.01, id: 'm1', navigationType: 'navigate' }),
    onFCP: (cb: any) => cb({ value: 1234, delta: 100, id: 'm2', navigationType: 'navigate' }),
    onINP: (cb: any) => cb({ value: 180, delta: 20, id: 'm3', navigationType: 'navigate' }),
    onLCP: (cb: any) => cb({ value: 2000, delta: 50, id: 'm4', navigationType: 'navigate' }),
    onTTFB: (cb: any) => cb({ value: 500, delta: 0, id: 'm5', navigationType: 'navigate' }),
  } as any;
});

describe('web-vitals init', () => {
  beforeEach(() => {
    // isolate modules for clean env vars and globals
    vi.resetModules();
    (globalThis as any).window = {
      location: { href: 'https://example.com' },
      gtag: vi.fn(),
    } as any;
    ;(globalThis as any).navigator = {
      userAgent: 'UA',
      sendBeacon: vi.fn(),
    } as any;
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sends metrics via sendBeacon in production and falls back to fetch when sendBeacon missing', async () => {
    const { initWebVitals } = await import('../web-vitals');
    const sendBeacon = (globalThis as any).navigator.sendBeacon as any;
    initWebVitals();
    expect(sendBeacon).toHaveBeenCalledTimes(5);

    // remove sendBeacon to test fetch fallback
    (globalThis as any).navigator.sendBeacon = undefined;
    const fetchSpy = vi.spyOn(globalThis as any, 'fetch').mockResolvedValue({} as any);
    initWebVitals();
    expect(fetchSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('does not throw in development mode', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { initWebVitals } = await import('../web-vitals');
    expect(() => initWebVitals()).not.toThrow();
  });
});
