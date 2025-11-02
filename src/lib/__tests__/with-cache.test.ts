import { describe, it, expect, vi } from 'vitest';
import { withCache } from '../cache';

describe('withCache decorator', () => {
  it('returns cached result on second call with same key', async () => {
    const fn = vi.fn(async (...args: unknown[]) => (args[0] as number) * 2);
    const cached = withCache(fn, (...args: unknown[]) => `k:${args[0] as number}`, { ttl: 1000, maxSize: 50 });

    const r1 = await (cached as any)(5);
    const r2 = await (cached as any)(5);

    expect(r1).toBe(10);
    expect(r2).toBe(10);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not cache null/undefined results', async () => {
    const fn = vi.fn(async (...args: unknown[]) => {
      const x = args[0] as number | undefined;
      return x ? x : null;
    });
    const cached = withCache(fn, (...args: unknown[]) => `k:${args[0] as number | undefined}`, { ttl: 1000 });

    const r1 = await (cached as any)(undefined);
    const r2 = await (cached as any)(undefined);

    expect(r1).toBeNull();
    expect(r2).toBeNull();
    // since null is not cached, the underlying fn is invoked both times
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
