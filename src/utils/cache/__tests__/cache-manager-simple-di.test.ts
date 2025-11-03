import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager } from '../cache-manager';

describe('CacheManager Simple DI Testing', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    // DI로 CacheManager 인스턴스 생성
    cacheManager = CacheManager.createWithDI();
    
    // Mock 타이머 설정
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Mock 타이머 정리
    vi.useRealTimers();
    
    // 캐시 초기화
    cacheManager.clear();
  });

  describe('기본 캐시 동작', () => {
    it('should set and get values', () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      cacheManager.set(key, value);
      const result = cacheManager.get(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent keys', () => {
      const result = cacheManager.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should handle different data types', () => {
      const stringValue = 'test-string';
      const numberValue = 42;
      const arrayValue = [1, 2, 3];
      const objectValue = { nested: { value: 'test' } };

      cacheManager.set('string', stringValue);
      cacheManager.set('number', numberValue);
      cacheManager.set('array', arrayValue);
      cacheManager.set('object', objectValue);

      expect(cacheManager.get('string')).toBe(stringValue);
      expect(cacheManager.get('number')).toBe(numberValue);
      expect(cacheManager.get('array')).toEqual(arrayValue);
      expect(cacheManager.get('object')).toEqual(objectValue);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should respect custom TTL', () => {
      const key = 'ttl-test';
      const value = 'test-value';
      const customTTL = 1000; // 1초

      cacheManager.set(key, value, customTTL);
      
      // 즉시 조회하면 값이 있어야 함
      expect(cacheManager.get(key)).toBe(value);

      // TTL 경과 후 조회하면 null이 반환되어야 함
      vi.advanceTimersByTime(customTTL + 1);
      expect(cacheManager.get(key)).toBeNull();
    });

    it('should use default TTL when not specified', () => {
      const key = 'default-ttl-test';
      const value = 'test-value';

      cacheManager.set(key, value);
      
      // 즉시 조회하면 값이 있어야 함
      expect(cacheManager.get(key)).toBe(value);

      // 기본 TTL (5분) 경과 후 조회하면 null이 반환되어야 함
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);
      expect(cacheManager.get(key)).toBeNull();
    });

    it('should handle zero TTL (immediate expiration)', () => {
      const key = 'zero-ttl-test';
      const value = 'test-value';

      cacheManager.set(key, value, 0);
      
      // 0 TTL은 값이 저장되지 않음
      expect(cacheManager.get(key)).toBeNull();
    });
  });

  describe('캐시 관리', () => {
    it('should delete specific keys', () => {
      const key1 = 'delete-test-1';
      const key2 = 'delete-test-2';
      
      cacheManager.set(key1, 'value1');
      cacheManager.set(key2, 'value2');

      expect(cacheManager.get(key1)).toBe('value1');
      expect(cacheManager.get(key2)).toBe('value2');

      cacheManager.delete(key1);
      
      expect(cacheManager.get(key1)).toBeNull();
      expect(cacheManager.get(key2)).toBe('value2');
    });

    it('should clear all cache', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      cacheManager.set('key3', 'value3');

      expect(cacheManager.get('key1')).toBe('value1');
      expect(cacheManager.get('key2')).toBe('value2');
      expect(cacheManager.get('key3')).toBe('value3');

      cacheManager.clear();
      
      expect(cacheManager.get('key1')).toBeNull();
      expect(cacheManager.get('key2')).toBeNull();
      expect(cacheManager.get('key3')).toBeNull();
    });

    it('should check if key exists', () => {
      const key = 'exists-test';
      
      expect(cacheManager.has(key)).toBe(false);
      
      cacheManager.set(key, 'value');
      expect(cacheManager.has(key)).toBe(true);
      
      cacheManager.delete(key);
      expect(cacheManager.has(key)).toBe(false);
    });

    it('should get cache size', () => {
      expect(cacheManager.size()).toBe(0);
      
      cacheManager.set('key1', 'value1');
      expect(cacheManager.size()).toBe(1);
      
      cacheManager.set('key2', 'value2');
      expect(cacheManager.size()).toBe(2);
      
      cacheManager.delete('key1');
      expect(cacheManager.size()).toBe(1);
      
      cacheManager.clear();
      expect(cacheManager.size()).toBe(0);
    });
  });

  describe('자동 정리', () => {
    it('should automatically clean up expired entries', () => {
      const key1 = 'cleanup-test-1';
      const key2 = 'cleanup-test-2';
      
      cacheManager.set(key1, 'value1', 1000); // 1초 후 만료
      cacheManager.set(key2, 'value2', 5000); // 5초 후 만료

      expect(cacheManager.size()).toBe(2);

      // 1초 후 첫 번째 항목 만료
      vi.advanceTimersByTime(1000 + 1);
      cacheManager.cleanup();
      
      expect(cacheManager.size()).toBe(1);
      expect(cacheManager.get(key1)).toBeNull();
      expect(cacheManager.get(key2)).toBe('value2');

      // 5초 후 모든 항목 만료
      vi.advanceTimersByTime(5000);
      cacheManager.cleanup();
      
      expect(cacheManager.size()).toBe(0);
      expect(cacheManager.get(key2)).toBeNull();
    });
  });

  describe('고급 기능', () => {
    it('should get all keys', () => {
      expect(cacheManager.keys()).toEqual([]);
      
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      cacheManager.set('key3', 'value3');
      
      const keys = cacheManager.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should get remaining TTL for a key', () => {
      const key = 'ttl-remaining-test';
      const value = 'test-value';
      const ttl = 5000; // 5초

      cacheManager.set(key, value, ttl);
      
      const remainingTTL = cacheManager.getTTL(key);
      expect(remainingTTL).toBeGreaterThan(4000); // 약간의 오차 허용
      expect(remainingTTL).toBeLessThanOrEqual(ttl);

      // 2초 후
      vi.advanceTimersByTime(2000);
      const remainingTTL2 = cacheManager.getTTL(key);
      expect(remainingTTL2).toBeGreaterThan(2000);
      expect(remainingTTL2).toBeLessThanOrEqual(3000);

      // 만료된 키의 TTL은 -1을 반환해야 함
      vi.advanceTimersByTime(ttl + 1);
      expect(cacheManager.getTTL(key)).toBe(-1);
    });

    it('should return -1 for TTL of non-existent key', () => {
      const ttl = cacheManager.getTTL('non-existent-key');
      expect(ttl).toBe(-1);
    });
  });

  describe('싱글톤 패턴', () => {
    it('should return same instance from getInstance', () => {
      const instance1 = CacheManager.getInstance();
      const instance2 = CacheManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should create different instances from createWithDI', () => {
      const instance1 = CacheManager.createWithDI();
      const instance2 = CacheManager.createWithDI();
      
      // createWithDI는 매번 새 인스턴스를 생성해야 함
      expect(instance1).not.toBe(instance2);
    });

    it('should maintain separate cache for different instances', () => {
      const instance1 = CacheManager.createWithDI();
      const instance2 = CacheManager.createWithDI();
      
      instance1.set('shared-key', 'value1');
      instance2.set('shared-key', 'value2');
      
      expect(instance1.get('shared-key')).toBe('value1');
      expect(instance2.get('shared-key')).toBe('value2');
    });
  });

  describe('에러 처리', () => {
    it('should handle invalid keys gracefully', () => {
      expect(() => {
        cacheManager.set('', 'value');
      }).not.toThrow();

      expect(() => {
        cacheManager.get('');
      }).not.toThrow();

      expect(cacheManager.get('')).toBeNull();
    });

    it('should handle null and undefined values', () => {
      cacheManager.set('null-value', null);
      cacheManager.set('undefined-value', undefined);
      
      expect(cacheManager.get('null-value')).toBeNull();
      expect(cacheManager.get('undefined-value')).toBeUndefined();
    });
  });
});
