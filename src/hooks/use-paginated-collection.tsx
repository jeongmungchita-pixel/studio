'use client';

import { useState, useEffect, useCallback } from 'react';
import { Query, DocumentData, QueryDocumentSnapshot, limit, startAfter, getDocs } from 'firebase/firestore';
import { WithId } from '@/firebase/firestore/use-collection';

interface UsePaginatedCollectionOptions {
  pageSize?: number;
  enabled?: boolean;
}

interface UsePaginatedCollectionResult<T> {
  data: WithId<T>[];
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  loadNextPage: () => Promise<void>;
  loadPreviousPage: () => Promise<void>;
  currentPage: number;
  totalLoaded: number;
  refresh: () => Promise<void>;
}

export function usePaginatedCollection<T = any>(
  baseQuery: Query<DocumentData> | null,
  options: UsePaginatedCollectionOptions = {}
): UsePaginatedCollectionResult<T> {
  const { pageSize = 50, enabled = true } = options;
  
  const [data, setData] = useState<WithId<T>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSnapshots, setPageSnapshots] = useState<QueryDocumentSnapshot<DocumentData>[]>([]);
  const [hasNextPage, setHasNextPage] = useState(true);

  // 첫 페이지 로드
  const loadFirstPage = useCallback(async () => {
    if (!baseQuery || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const firstPageQuery = firestoreQuery(baseQuery, limit(pageSize));
      const snapshot = await getDocs(firstPageQuery);
      
      const results: WithId<T>[] = snapshot.docs.map(doc => ({
        ...doc.data() as T,
        id: doc.id
      }));

      setData(results);
      setCurrentPage(1);
      setPageSnapshots(snapshot.docs.length > 0 ? [snapshot.docs[snapshot.docs.length - 1]] : []);
      setHasNextPage(snapshot.docs.length === pageSize);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [baseQuery, enabled, pageSize]);

  // 다음 페이지 로드
  const loadNextPage = useCallback(async () => {
    if (!baseQuery || !hasNextPage || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const lastSnapshot = pageSnapshots[pageSnapshots.length - 1];
      const nextPageQuery = firestoreQuery(
        baseQuery,
        startAfter(lastSnapshot),
        limit(pageSize)
      );
      
      const snapshot = await getDocs(nextPageQuery);
      
      if (snapshot.docs.length > 0) {
        const results: WithId<T>[] = snapshot.docs.map(doc => ({
          ...doc.data() as T,
          id: doc.id
        }));

        setData(results);
        setCurrentPage(prev => prev + 1);
        setPageSnapshots(prev => [...prev, snapshot.docs[snapshot.docs.length - 1]]);
        setHasNextPage(snapshot.docs.length === pageSize);
      } else {
        setHasNextPage(false);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [baseQuery, hasNextPage, isLoading, pageSnapshots, pageSize]);

  // 이전 페이지 로드
  const loadPreviousPage = useCallback(async () => {
    if (!baseQuery || currentPage <= 1 || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      if (currentPage === 2) {
        // 첫 페이지로 돌아가기
        await loadFirstPage();
      } else {
        // 이전 페이지의 스냅샷 사용
        const prevSnapshot = pageSnapshots[currentPage - 3]; // 0-based index
        const prevPageQuery = firestoreQuery(
          baseQuery,
          startAfter(prevSnapshot),
          limit(pageSize)
        );
        
        const snapshot = await getDocs(prevPageQuery);
        
        const results: WithId<T>[] = snapshot.docs.map(doc => ({
          ...doc.data() as T,
          id: doc.id
        }));

        setData(results);
        setCurrentPage(prev => prev - 1);
        setHasNextPage(true);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [baseQuery, currentPage, isLoading, loadFirstPage, pageSnapshots, pageSize]);

  // 새로고침
  const refresh = useCallback(async () => {
    setPageSnapshots([]);
    setCurrentPage(1);
    await loadFirstPage();
  }, [loadFirstPage]);

  // 초기 로드
  useEffect(() => {
    if (baseQuery && enabled) {
      loadFirstPage();
    }
  }, [baseQuery, enabled, loadFirstPage]);

  return {
    data,
    isLoading,
    error,
    hasNextPage,
    hasPreviousPage: currentPage > 1,
    loadNextPage,
    loadPreviousPage,
    currentPage,
    totalLoaded: data.length,
    refresh
  };
}
