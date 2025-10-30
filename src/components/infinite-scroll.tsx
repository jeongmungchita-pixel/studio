'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollProps {
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  children: React.ReactNode;
  loader?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
}

/**
 * 무한 스크롤 컴포넌트
 */
export function InfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  children,
  loader,
  threshold = 0.1,
  rootMargin = '100px',
  className,
}: InfiniteScrollProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { isIntersecting } = useIntersectionObserver(loadMoreRef, {
    threshold,
    rootMargin,
  });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className={className}>
      {children}
      
      {/* 로딩 트리거 */}
      <div ref={loadMoreRef} className="h-1" />
      
      {/* 로딩 인디케이터 */}
      {isFetchingNextPage && (
        loader || (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )
      )}
    </div>
  );
}

/**
 * 무한 스크롤 리스트 아이템 컴포넌트
 */
interface InfiniteScrollListProps<T> {
  pages?: Array<{ items: T[] }>;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  emptyMessage?: string;
  className?: string;
  itemClassName?: string;
}

export function InfiniteScrollList<T>({
  pages = [],
  renderItem,
  keyExtractor,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  emptyMessage = '데이터가 없습니다.',
  className,
  itemClassName,
}: InfiniteScrollListProps<T>) {
  const items = pages.flatMap(page => page.items);

  if (items.length === 0 && !isFetchingNextPage) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <InfiniteScroll
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      className={className}
    >
      {items.map((item, index) => (
        <div key={keyExtractor(item, index)} className={itemClassName}>
          {renderItem(item, index)}
        </div>
      ))}
    </InfiniteScroll>
  );
}

/**
 * 그리드 형태의 무한 스크롤
 */
interface InfiniteScrollGridProps<T> {
  pages?: Array<{ items: T[] }>;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  columns?: number;
  gap?: number;
  emptyMessage?: string;
  className?: string;
}

export function InfiniteScrollGrid<T>({
  pages = [],
  renderItem,
  keyExtractor,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  columns = 3,
  gap = 4,
  emptyMessage = '데이터가 없습니다.',
  className,
}: InfiniteScrollGridProps<T>) {
  const items = pages.flatMap(page => page.items);

  if (items.length === 0 && !isFetchingNextPage) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const gridClassName = `grid grid-cols-${columns} gap-${gap}`;

  return (
    <InfiniteScroll
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      className={className}
    >
      <div className={gridClassName}>
        {items.map((item, index) => (
          <div key={keyExtractor(item, index)}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </InfiniteScroll>
  );
}
