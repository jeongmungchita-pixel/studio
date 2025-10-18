'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Query,
  DocumentData,
  QueryDocumentSnapshot,
  limit,
  startAfter,
  getDocs,
  query,
} from 'firebase/firestore';
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

type PageCache<T> = {
  items: WithId<T>[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasNext: boolean;
};

export function usePaginatedCollection<T = any>(
  baseQuery: Query<DocumentData> | null,
  options: UsePaginatedCollectionOptions = {}
): UsePaginatedCollectionResult<T> {
  const { pageSize = 50, enabled = true } = options;

  const [pages, setPages] = useState<PageCache<T>[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const currentPageIndex = currentPage - 1;
  const currentPageData = pages[currentPageIndex]?.items ?? [];

  const loadPage = useCallback(
    async (pageIndex: number) => {
      if (!baseQuery) return null;

      const cursor =
        pageIndex === 0 ? null : pages[pageIndex - 1]?.lastDoc ?? null;

      const pageQuery =
        cursor === null
          ? query(baseQuery, limit(pageSize))
          : query(baseQuery, startAfter(cursor), limit(pageSize));

      const snapshot = await getDocs(pageQuery);
      const results: WithId<T>[] = snapshot.docs.map(doc => ({
        ...(doc.data() as T),
        id: doc.id,
      }));

      return {
        items: results,
        lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
        hasNext: snapshot.docs.length === pageSize,
      } satisfies PageCache<T>;
    },
    [baseQuery, pageSize, pages]
  );

  const loadFirstPage = useCallback(async () => {
    if (!baseQuery || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const firstPage = await loadPage(0);
      if (!firstPage) return;

      setPages([firstPage]);
      setCurrentPage(1);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [baseQuery, enabled, loadPage]);

  const loadNextPage = useCallback(async () => {
    if (!baseQuery) return;

    const cachedNext = pages[currentPageIndex + 1];
    if (cachedNext) {
      setCurrentPage(prev => prev + 1);
      return;
    }

    const current = pages[currentPageIndex];
    if (!current?.hasNext || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextPageIndex = currentPageIndex + 1;
      const nextPage = await loadPage(nextPageIndex);
      if (!nextPage) return;

      setPages(prev => {
        const next = [...prev];
        next[nextPageIndex] = nextPage;
        return next;
      });
      setCurrentPage(prev => prev + 1);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [baseQuery, currentPageIndex, isLoading, loadPage, pages]);

  const loadPreviousPage = useCallback(async () => {
    if (currentPage <= 1 || isLoading) {
      return;
    }

    setCurrentPage(prev => prev - 1);
  }, [currentPage, isLoading]);

  const refresh = useCallback(async () => {
    setPages([]);
    setCurrentPage(1);
    await loadFirstPage();
  }, [loadFirstPage]);

  useEffect(() => {
    if (baseQuery && enabled) {
      loadFirstPage();
    }
  }, [baseQuery, enabled, loadFirstPage]);

  const hasNextPage = useMemo(() => {
    const current = pages[currentPageIndex];
    if (!current) return false;

    if (pages[currentPageIndex + 1]) {
      return true;
    }

    return current.hasNext;
  }, [currentPageIndex, pages]);

  const totalLoaded = currentPageData.length;

  return {
    data: currentPageData,
    isLoading,
    error,
    hasNextPage,
    hasPreviousPage: currentPage > 1,
    loadNextPage,
    loadPreviousPage,
    currentPage,
    totalLoaded,
    refresh,
  };
}
