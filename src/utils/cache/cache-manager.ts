interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
}
/**
 * CacheManager 클래스
 * 메모리 기반 캐싱 시스템을 제공합니다.
 */
export class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, CacheEntry>();
  private defaultTTL = 5 * 60 * 1000; // 5분
  private constructor() {
    // 주기적으로 만료된 캐시 정리 (1분마다)
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }
  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }
  /**
   * 캐시에 값 저장
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };
    this.cache.set(key, entry);
  }
  /**
   * 캐시에서 값 조회
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    // TTL 확인
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }
  /**
   * 캐시에서 값 삭제
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  /**
   * 패턴에 맞는 캐시 무효화
   */
  invalidate(pattern: string): void {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  /**
   * 모든 캐시 삭제
   */
  clear(): void {
    this.cache.clear();
  }
  /**
   * 캐시 크기 조회
   */
  size(): number {
    return this.cache.size;
  }
  /**
   * 캐시 키 목록 조회
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
  /**
   * 만료된 캐시 정리
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
  /**
   * 캐시 통계 조회
   */
  getStats(): {
    size: number;
    keys: string[];
    memoryUsage: number;
  } {
    return {
      size: this.cache.size,
      keys: this.keys(),
      memoryUsage: JSON.stringify(Array.from(this.cache.entries())).length,
    };
  }
}
