'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Query, DocumentData } from 'firebase/firestore';
import { useCollection, WithId } from '@/firebase/firestore/use-collection';

interface CacheEntry<T> {
  data: WithId<T>[] | null;
  timestamp: number;
  isLoading: boolean;
  error: Error | null;
}

interface UseCachedCollectionOptions {
  cacheKey: string;
  cacheDuration?: number; // 캐시 유지 시간 (밀리초)
  enabled?: boolean;
  staleWhileRevalidate?: boolean; // 오래된 데이터를 보여주면서 백그라운드에서 새 데이터 가져오기
}

interface UseCachedCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: Error | null;
  isStale: boolean; // 데이터가 오래되었는지 여부
  refresh: () => void;
  clearCache: () => void;
}

// 전역 캐시 저장소
const globalCache = new Map<string, CacheEntry<any>>();

export function useCachedCollection<T = any>(
  query: Query<DocumentData> | null,
  options: UseCachedCollectionOptions
): UseCachedCollectionResult<T> {
  const {
    cacheKey,
    cacheDuration = 5 * 60 * 1000, // 기본 5분
    enabled = true,
    staleWhileRevalidate = true
  } = options;

  const [forceRefresh, setForceRefresh] = useState(0);
  const isInitialMount = useRef(true);

  // 캐시에서 데이터 가져오기
  const getCachedData = useCallback((): CacheEntry<T> | null => {
    const cached = globalCache.get(cacheKey);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cacheDuration;
    if (isExpired && !staleWhileRevalidate) {
      globalCache.delete(cacheKey);
      return null;
    }

    return cached;
  }, [cacheKey, cacheDuration, staleWhileRevalidate]);

  // 캐시 상태 확인
  const cachedEntry = getCachedData();
  const shouldFetch = !cachedEntry || 
    (Date.now() - cachedEntry.timestamp > cacheDuration) ||
    forceRefresh > 0;

  // 실제 Firestore 쿼리 (캐시가 없거나 만료된 경우에만)
  const { 
    data: freshData, 
    isLoading: isFetching, 
    error: fetchError 
  } = useCollection<T>(shouldFetch && enabled ? query : null);

  // 캐시 업데이트
  useEffect(() => {
    if (freshData !== null || fetchError) {
      const newEntry: CacheEntry<T> = {
        data: freshData,
        timestamp: Date.now(),
        isLoading: false,
        error: fetchError
      };
      globalCache.set(cacheKey, newEntry);
    }
  }, [freshData, fetchError, cacheKey]);

  // 반환할 데이터 결정
  const currentCached = getCachedData();
  const data = currentCached?.data ?? null;
  const isLoading = isFetching || (currentCached?.isLoading ?? false);
  const error = fetchError || currentCached?.error || null;
  const isStale = currentCached ? 
    Date.now() - currentCached.timestamp > cacheDuration : false;

  // 새로고침 함수
  const refresh = useCallback(() => {
    globalCache.delete(cacheKey);
    setForceRefresh(prev => prev + 1);
  }, [cacheKey]);

  // 캐시 삭제 함수
  const clearCache = useCallback(() => {
    globalCache.delete(cacheKey);
  }, [cacheKey]);

  // 초기 마운트 시 캐시된 데이터가 있으면 즉시 반환
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, []);

  return {
    data,
    isLoading: isInitialMount.current ? (cachedEntry ? false : isLoading) : isLoading,
    error,
    isStale,
    refresh,
    clearCache
  };
}

// 전역 캐시 관리 유틸리티
export const cacheUtils = {
  // 모든 캐시 삭제
  clearAll: () => {
    globalCache.clear();
  },
  
  // 특정 패턴의 캐시 삭제
  clearByPattern: (pattern: string) => {
    const keys = Array.from(globalCache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        globalCache.delete(key);
      }
    });
  },
  
  // 캐시 상태 확인
  getCacheInfo: () => {
    const entries = Array.from(globalCache.entries()).map(([key, entry]) => ({
      key,
      size: JSON.stringify(entry.data).length,
      age: Date.now() - entry.timestamp,
      hasError: !!entry.error
    }));
    
    return {
      totalEntries: globalCache.size,
      totalSize: entries.reduce((sum, entry) => sum + entry.size, 0),
      entries
    };
  }
};
