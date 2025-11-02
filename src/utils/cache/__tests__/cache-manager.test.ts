import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager } from '../cache-manager';

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    // reset singleton and use fake timers to control setInterval cleanup
    (CacheManager as any).instance = null;
    vi.useFakeTimers();
    cache = CacheManager.getInstance();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves items within TTL', () => {
    cache.set('k1', { a: 1 }, 1000);
    expect(cache.get('k1')).toEqual({ a: 1 });
  });

  it('returns null after TTL expiration and deletes entry', () => {
    cache.set('k2', 'v2', 50);
    expect(cache.get('k2')).toBe('v2');
    vi.advanceTimersByTime(60);
    // get should also purge expired
    expect(cache.get('k2')).toBeNull();
  });

  it('delete removes a specific key and returns true', () => {
    cache.set('k3', 3, 1000);
    expect(cache.delete('k3')).toBe(true);
    expect(cache.get('k3')).toBeNull();
  });

  it('invalidate removes keys matching wildcard pattern', () => {
    cache.set('user-1', 1);
    cache.set('user-2', 2);
    cache.set('other', 3);
    cache.invalidate('user-*');
    expect(cache.get('user-1')).toBeNull();
    expect(cache.get('user-2')).toBeNull();
    expect(cache.get('other')).toBe(3);
  });

  it('clear empties all entries', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.keys()).toEqual([]);
  });

  it('size and keys reflect current store', () => {
    cache.set('x', 'X');
    cache.set('y', 'Y');
    const keys = cache.keys();
    expect(cache.size()).toBe(2);
    expect(keys.sort()).toEqual(['x', 'y']);
  });

  it('cleanup interval purges expired entries without access', () => {
    cache.set('z', 'Z', 1000);
    // let it expire
    vi.advanceTimersByTime(2000);
    // trigger the internal cleanup running every 60s
    vi.advanceTimersByTime(60 * 1000);
    // After cleanup, size should be 0 without calling get()
    expect(cache.size()).toBe(0);
  });

  it('getStats returns size, keys and memoryUsage', () => {
    cache.set('s1', { foo: 'bar' });
    const stats = cache.getStats();
    expect(stats.size).toBe(1);
    expect(stats.keys).toEqual(['s1']);
    expect(typeof stats.memoryUsage).toBe('number');
  });
});
