import { describe, it, expect, vi } from 'vitest';
import { LRUCache } from '../cache';

describe('LRUCache edges', () => {
  it('evicts least recently used when maxSize exceeded', () => {
    const c = new LRUCache<string>({ maxSize: 2, ttl: 10000 });
    c.set('a', '1');
    c.set('b', '2');
    // access 'a' to make 'b' LRU
    expect(c.get('a')).toBe('1');
    // insert 'c' -> should evict 'b'
    c.set('c', '3');
    expect(c.get('b')).toBeNull();
    expect(c.get('a')).toBe('1');
    expect(c.get('c')).toBe('3');
  });

  it('expires entries based on ttl (get/has clean up)', () => {
    const c = new LRUCache<string>({ maxSize: 10, ttl: 1 });
    c.set('x', 'v');
    // advance time
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 5);
    expect(c.get('x')).toBeNull();
    // has should also cleanup expired
    c.set('y', 'v2');
    // move time forward again
    ;(Date.now as any).mockReturnValue(now + 10);
    expect(c.has('y')).toBe(false);
    (Date.now as any).mockRestore?.();
  });

  it('getStats returns entries and metadata', () => {
    const c = new LRUCache<string>({ maxSize: 3, ttl: 100 });
    c.set('k1', 'a');
    c.set('k2', 'b');
    const stats = c.getStats();
    expect(stats.size).toBe(2);
    expect(stats.maxSize).toBe(3);
    expect(Array.isArray(stats.entries)).toBe(true);
    expect(stats.entries.length).toBe(2);
  });
});
