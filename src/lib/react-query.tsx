'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';
import { APIError } from '@/utils/error/api-error';

/**
 * React Query 기본 설정
 */
const queryClientConfig = {
  defaultOptions: {
    queries: {
      // 5분간 데이터를 fresh로 간주
      staleTime: 5 * 60 * 1000,
      // 30분간 캐시 유지
      gcTime: 30 * 60 * 1000,
      // 에러 시 3번 재시도
      retry: (failureCount: number, error: any) => {
        // APIError의 상태 코드에 따라 재시도 결정
        if (error instanceof APIError) {
          // 4xx 에러는 재시도하지 않음
          if (error.statusCode >= 400 && error.statusCode < 500) {
            return false;
          }
          // 5xx 에러는 최대 3번 재시도
          return failureCount < 3;
        }
        // 일반 에러는 최대 3번 재시도
        return failureCount < 3;
      },
      // 재시도 간격 (지수 백오프)
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // 백그라운드에서 자동 refetch
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // 네트워크 재연결 시 refetch
      refetchOnMount: true,
    },
    mutations: {
      // 뮤테이션 에러 시 재시도하지 않음
      retry: false,
      // 뮤테이션 에러 처리
      onError: (error: any) => {
        console.error('Mutation error:', error);
        // 전역 에러 처리 로직 추가 가능
      },
    },
  },
};

/**
 * React Query Client 생성 함수
 */
export function createQueryClient() {
  return new QueryClient(queryClientConfig);
}

/**
 * React Query Provider 컴포넌트
 */
interface ReactQueryProviderProps {
  children: ReactNode;
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  // 클라이언트 사이드에서만 QueryClient 생성
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * 쿼리 키 팩토리
 * 일관된 쿼리 키 생성을 위한 유틸리티
 */
export const queryKeys = {
  // 사용자 관련
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.users.lists(), { filters }] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    profile: (id: string) => [...queryKeys.users.all, 'profile', id] as const,
  },
  
  // 클럽 관련
  clubs: {
    all: ['clubs'] as const,
    lists: () => [...queryKeys.clubs.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.clubs.lists(), { filters }] as const,
    details: () => [...queryKeys.clubs.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.clubs.details(), id] as const,
    members: (clubId: string) => [...queryKeys.clubs.detail(clubId), 'members'] as const,
  },
  
  // 이벤트 관련
  events: {
    all: ['events'] as const,
    lists: () => [...queryKeys.events.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.events.lists(), { filters }] as const,
    details: () => [...queryKeys.events.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.events.details(), id] as const,
  },
  
  // 공지사항 관련
  announcements: {
    all: ['announcements'] as const,
    lists: () => [...queryKeys.announcements.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.announcements.lists(), { filters }] as const,
    details: () => [...queryKeys.announcements.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.announcements.details(), id] as const,
  },
};

/**
 * 쿼리 무효화 헬퍼
 */
export const invalidateQueries = {
  // 사용자 관련 쿼리 무효화
  users: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
  },
  
  userDetail: (queryClient: QueryClient, userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
  },
  
  // 클럽 관련 쿼리 무효화
  clubs: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.clubs.all });
  },
  
  clubDetail: (queryClient: QueryClient, clubId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.clubs.detail(clubId) });
  },
  
  // 모든 쿼리 무효화
  all: (queryClient: QueryClient) => {
    queryClient.invalidateQueries();
  },
};

/**
 * 캐시 관리 유틸리티
 */
export const cacheUtils = {
  // 특정 쿼리 데이터 가져오기
  getQueryData: <T>(queryClient: QueryClient, queryKey: readonly unknown[]): T | undefined => {
    return queryClient.getQueryData<T>(queryKey);
  },
  
  // 쿼리 데이터 설정
  setQueryData: <T>(queryClient: QueryClient, queryKey: readonly unknown[], data: T) => {
    queryClient.setQueryData(queryKey, data);
  },
  
  // 쿼리 캐시 제거
  removeQueries: (queryClient: QueryClient, queryKey: readonly unknown[]) => {
    queryClient.removeQueries({ queryKey });
  },
  
  // 캐시 크기 확인
  getCacheSize: (queryClient: QueryClient) => {
    const cache = queryClient.getQueryCache();
    return cache.getAll().length;
  },
  
  // 오래된 캐시 정리
  clearStaleCache: (queryClient: QueryClient) => {
    queryClient.clear();
  },
};

/**
 * 개발 환경용 디버깅 유틸리티
 */
export const debugUtils = {
  // 모든 쿼리 상태 로그
  logAllQueries: (queryClient: QueryClient) => {
    if (process.env.NODE_ENV === 'development') {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      console.group('React Query Cache Status');
      queries.forEach((query) => {
        console.log({
          queryKey: query.queryKey,
          state: query.state,
          dataUpdatedAt: new Date(query.state.dataUpdatedAt),
          errorUpdatedAt: new Date(query.state.errorUpdatedAt),
        });
      });
      console.groupEnd();
    }
  },
  
  // 특정 쿼리 상태 로그
  logQuery: (queryClient: QueryClient, queryKey: readonly unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      const query = queryClient.getQueryCache().find({ queryKey });
      console.log('Query State:', {
        queryKey,
        state: query?.state,
        observers: query?.getObserversCount(),
      });
    }
  },
};
