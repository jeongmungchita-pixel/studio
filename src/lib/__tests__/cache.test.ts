import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LRUCache, withCache, cacheKeys, userCache, clubCache, memberCache, apiResponseCache } from '../cache';

describe('LRUCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets and gets values; has() respects TTL', () => {
    const cache = new LRUCache<string>({ ttl: 1000, maxSize: 3 });
    cache.set('a', 'A');
    expect(cache.get('a')).toBe('A');
    expect(cache.has('a')).toBe(true);

    // advance past TTL
    vi.setSystemTime(new Date('2024-01-01T00:00:02.000Z'));
    expect(cache.get('a')).toBeNull();
    expect(cache.has('a')).toBe(false);
  });

  it('evicts least-recently-used when maxSize reached', () => {
    const cache = new LRUCache<number>({ ttl: 10_000, maxSize: 2 });
    cache.set('k1', 1);
    cache.set('k2', 2);
    // access k1 to make k2 LRU
    expect(cache.get('k1')).toBe(1);
    cache.set('k3', 3); // should evict k2
    expect(cache.get('k2')).toBeNull();
    expect(cache.get('k1')).toBe(1);
    expect(cache.get('k3')).toBe(3);
  });

  it('delete and clear work as expected', () => {
    const cache = new LRUCache<number>({ ttl: 10_000, maxSize: 5 });
    cache.set('x', 1);
    cache.set('y', 2);
    expect(cache.delete('x')).toBe(true);
    expect(cache.get('x')).toBeNull();
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('cleanup removes expired entries without access', () => {
    const cache = new LRUCache<string>({ ttl: 1000, maxSize: 5 });
    cache.set('a', 'A');
    vi.setSystemTime(new Date('2024-01-01T00:00:02.000Z'));
    cache.cleanup();
    expect(cache.size).toBe(0);
  });

  it('getStats returns structured information', () => {
    const cache = new LRUCache<string>({ ttl: 1000, maxSize: 5 });
    cache.set('a', 'A');
    const stats = cache.getStats();
    expect(stats.size).toBe(1);
    expect(stats.maxSize).toBe(5);
    expect(Array.isArray(stats.entries)).toBe(true);
  });
});

describe('withCache decorator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('caches async function results by key', async () => {
    const base = async (...args: unknown[]) => (args[0] as number) * 2;
    const fn = vi.fn(base);
    const getKey = (...args: unknown[]) => `x:${args[0] as number}`;
    const cached = withCache(fn as unknown as (...args: unknown[]) => Promise<number>, getKey as (...args: unknown[]) => string, { ttl: 1000, maxSize: 10 });

    const r1 = await (cached as any)(2);
    const r2 = await (cached as any)(2);

    expect(r1).toBe(4);
    expect(r2).toBe(4);
    expect(fn).toHaveBeenCalledTimes(1); // second call was cached
  });

  it('expires cached value after TTL and recomputes', async () => {
    const base = async (...args: unknown[]) => (args[0] as number) * 3;
    const fn = vi.fn(base);
    const getKey = (...args: unknown[]) => `x:${args[0] as number}`;
    const cached = withCache(fn as unknown as (...args: unknown[]) => Promise<number>, getKey as (...args: unknown[]) => string, { ttl: 1000, maxSize: 10 });

    const r1 = await (cached as any)(3);
    vi.setSystemTime(new Date('2024-01-01T00:00:02.000Z'));
    const r2 = await (cached as any)(3);

    expect(r1).toBe(9);
    expect(r2).toBe(9);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('cacheKeys and global caches', () => {
  it('cacheKeys compose keys as expected', () => {
    expect(cacheKeys._user('u1')).toBe('_user:u1');
    expect(cacheKeys.club('c1')).toBe('club:c1');
    expect(cacheKeys.member('m1')).toBe('member:m1');
    expect(cacheKeys.membersByClub('c2')).toBe('members:club:c2');
    expect(cacheKeys.userRole('u2')).toBe('role:u2');
    expect(cacheKeys.apiResponse('GET', '/path')).toBe('api:GET:/path');
    expect(cacheKeys.apiResponse('POST', '/p', 'q=1')).toBe('api:POST:/p:q=1');
  });

  it('global caches expose stats with configured maxSize', () => {
    const userStats = userCache.getStats();
    const clubStats = clubCache.getStats();
    const memberStats = memberCache.getStats();
    const apiStats = apiResponseCache.getStats();

    expect(userStats.maxSize).toBeGreaterThan(0);
    expect(clubStats.maxSize).toBeGreaterThan(0);
    expect(memberStats.maxSize).toBeGreaterThan(0);
    expect(apiStats.maxSize).toBeGreaterThan(0);
  });
});
