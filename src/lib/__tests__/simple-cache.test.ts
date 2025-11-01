import { describe, it, expect } from 'vitest';
import { LRUCache, userCache, clubCache, memberCache, apiResponseCache, cacheKeys } from '../cache';

describe('LRUCache - Simple Tests', () => {
  it('should create an instance', () => {
    const cache = new LRUCache({ maxSize: 10 });
    expect(cache).toBeInstanceOf(LRUCache);
  });

  it('should set and get values', () => {
    const cache = new LRUCache<string>({ maxSize: 10 });
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for missing keys', () => {
    const cache = new LRUCache<string>({ maxSize: 10 });
    expect(cache.get('missing')).toBeUndefined();
  });

  it('should check if key exists', () => {
    const cache = new LRUCache<string>({ maxSize: 10 });
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('missing')).toBe(false);
  });

  it('should delete values', () => {
    const cache = new LRUCache<string>({ maxSize: 10 });
    cache.set('key1', 'value1');
    cache.delete('key1');
    expect(cache.has('key1')).toBe(false);
  });

  it('should clear all values', () => {
    const cache = new LRUCache<string>({ maxSize: 10 });
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(false);
  });

  it('should get stats', () => {
    const cache = new LRUCache<string>({ maxSize: 10 });
    cache.set('key1', 'value1');
    const stats = cache.getStats();
    expect(stats.size).toBe(1);
    expect(stats.maxSize).toBe(10);
    expect(typeof stats.hitRate).toBe('number');
  });
});

describe('Global Cache Instances', () => {
  it('should have userCache', () => {
    expect(userCache).toBeInstanceOf(LRUCache);
  });

  it('should have clubCache', () => {
    expect(clubCache).toBeInstanceOf(LRUCache);
  });

  it('should have memberCache', () => {
    expect(memberCache).toBeInstanceOf(LRUCache);
  });

  it('should have apiResponseCache', () => {
    expect(apiResponseCache).toBeInstanceOf(LRUCache);
  });
});

describe('Cache Keys', () => {
  it('should generate user cache keys', () => {
    expect(cacheKeys._user('uid123')).toBe('_user:uid123');
  });

  it('should generate club cache keys', () => {
    expect(cacheKeys.club('club456')).toBe('club:club456');
  });

  it('should generate member cache keys', () => {
    expect(cacheKeys.member('member789')).toBe('member:member789');
  });

  it('should generate members by club cache keys', () => {
    expect(cacheKeys.membersByClub('club123')).toBe('members:club:club123');
  });

  it('should generate user role cache keys', () => {
    expect(cacheKeys.userRole('uid456')).toBe('role:uid456');
  });

  it('should generate API response cache keys', () => {
    expect(cacheKeys.apiResponse('GET', '/api/test')).toBe('api:GET:/api/test');
    expect(cacheKeys.apiResponse('POST', '/api/users', 'id=1')).toBe('api:POST:/api/users:id=1');
  });
});
