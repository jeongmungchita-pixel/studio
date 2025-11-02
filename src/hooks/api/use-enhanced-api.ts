'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { getAPI } from '@/api';
import { queryKeys, invalidateQueries } from '@/lib/react-query';
import { useUIStore } from '@/stores/ui-store';
import { useOptimisticUpdate } from './use-optimistic-update';
import { APIError } from '@/lib/error/error-manager';
/**
 * 향상된 API Hook
 * React Query + Zustand + 낙관적 업데이트를 통합한 Hook
 */
export function useEnhancedAPI() {
  const firestore = useFirestore();
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();
  // API 인스턴스 초기화
  const api = firestore ? getAPI() : null;
  /**
   * 사용자 프로필 조회 (캐싱 + 실시간)
   */
  const useUserProfile = (userId?: string) => {
    return useQuery({
      queryKey: queryKeys.users.profile(userId || ''),
      queryFn: async () => {
        if (!api || !userId) throw new APIError('API not initialized', 500, 'API_NOT_INITIALIZED');
        const result = await api.user.getUserProfile(userId);
        return result.data;
      },
      enabled: !!api && !!userId,
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 30 * 60 * 1000, // 30분
    });
  };
  /**
   * 사용자 프로필 업데이트 (낙관적)
   */
  const useUpdateUserProfile = () => {
    const { optimisticUpdate } = useOptimisticUpdate();
    return useMutation({
      mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
        if (!api) throw new APIError('API not initialized', 500, 'API_NOT_INITIALIZED');
        return optimisticUpdate(
          updates,
          async () => {
            const result = await api.user.updateProfile(userId, updates);
            return result.data;
          },
          { userId, updates }
        );
      },
      onSuccess: (data, variables) => {
        // 관련 쿼리 무효화
        invalidateQueries.userDetail(queryClient, variables.userId);
        invalidateQueries.users(queryClient);
        // 성공 알림
        addNotification({
          type: 'success',
          title: '프로필 업데이트',
          message: '프로필이 성공적으로 업데이트되었습니다.',
        });
      },
      onError: (error: APIError) => {
        // 에러 알림
        addNotification({
          type: 'error',
          title: '프로필 업데이트 실패',
          message: (error as any).message,
        });
      },
    });
  };
  /**
   * 클럽 목록 조회
   */
  const useClubs = (filters?: Record<string, unknown>) => {
    return useQuery({
      queryKey: queryKeys.clubs.list(filters || {}),
      queryFn: async () => {
        if (!api) throw new APIError('API not initialized', 500, 'API_NOT_INITIALIZED');
        const result = await api.club.findMany({
          where: filters ? Object.entries(filters).map(([field, value]) => ({
            field,
            operator: '==',
            value,
          })) : undefined,
        });
        return result.data;
      },
      enabled: !!api,
      staleTime: 10 * 60 * 1000, // 10분
    });
  };
  /**
   * 클럽 상세 정보 조회
   */
  const useClub = (clubId?: string) => {
    return useQuery({
      queryKey: queryKeys.clubs.detail(clubId || ''),
      queryFn: async () => {
        if (!api || !clubId) throw new APIError('API not initialized', 500, 'API_NOT_INITIALIZED');
        const result = await api.club.getClub(clubId);
        return result.data;
      },
      enabled: !!api && !!clubId,
      staleTime: 5 * 60 * 1000,
    });
  };
  /**
   * 클럽 회원 목록 조회
   */
  const useClubMembers = (clubId?: string) => {
    return useQuery({
      queryKey: queryKeys.clubs.members(clubId || ''),
      queryFn: async () => {
        if (!api || !clubId) throw new APIError('API not initialized', 500, 'API_NOT_INITIALIZED');
        const result = await api.user.getUsersByClub(clubId);
        return result.data;
      },
      enabled: !!api && !!clubId,
      staleTime: 2 * 60 * 1000, // 2분 (회원 정보는 자주 변경될 수 있음)
    });
  };
  /**
   * 무한 스크롤을 위한 페이지네이션 Hook
   */
  const usePaginatedUsers = (filters?: Record<string, unknown>) => {
    return useQuery({
      queryKey: queryKeys.users.list(filters || {}),
      queryFn: async () => {
        if (!api) throw new APIError('API not initialized', 500, 'API_NOT_INITIALIZED');
        const result = await api.user.findManyPaginated({
          where: filters ? Object.entries(filters).map(([field, value]) => ({
            field,
            operator: '==',
            value,
          })) : undefined,
          page: 1,
          pageSize: 20,
        });
        return result;
      },
      enabled: !!api,
      staleTime: 5 * 60 * 1000,
    });
  };
  /**
   * 캐시 관리 유틸리티
   */
  const cacheUtils = {
    // 사용자 캐시 무효화
    invalidateUser: useCallback((userId: string) => {
      invalidateQueries.userDetail(queryClient, userId);
    }, [queryClient]),
    // 클럽 캐시 무효화
    invalidateClub: useCallback((clubId: string) => {
      invalidateQueries.clubDetail(queryClient, clubId);
    }, [queryClient]),
    // 모든 캐시 무효화
    invalidateAll: useCallback(() => {
      invalidateQueries.all(queryClient);
    }, [queryClient]),
    // 특정 쿼리 데이터 가져오기
    getUserData: useCallback((userId: string) => {
      return queryClient.getQueryData(queryKeys.users.profile(userId));
    }, [queryClient]),
    // 쿼리 데이터 직접 설정
    setUserData: useCallback((userId: string, data: unknown) => {
      queryClient.setQueryData(queryKeys.users.profile(userId), data);
    }, [queryClient]),
  };
  /**
   * 배치 작업 Hook
   */
  const useBatchOperations = () => {
    return useMutation({
      mutationFn: async (operations: Array<() => Promise<any>>) => {
        const results = await Promise.allSettled(operations.map(op => op()));
        return results;
      },
      onSuccess: () => {
        // 배치 작업 완료 후 관련 캐시 무효화
        invalidateQueries.all(queryClient);
        addNotification({
          type: 'success',
          title: '배치 작업 완료',
          message: '모든 작업이 성공적으로 완료되었습니다.',
        });
      },
      onError: (error: APIError) => {
        addNotification({
          type: 'error',
          title: '배치 작업 실패',
          message: (error as any).message,
        });
      },
    });
  };
  return {
    // 쿼리 Hook들
    useUserProfile,
    useClubs,
    useClub,
    useClubMembers,
    usePaginatedUsers,
    // 뮤테이션 Hook들
    useUpdateUserProfile,
    useBatchOperations,
    // 유틸리티
    cacheUtils,
    // 상태
    isInitialized: !!api,
  };
}
/**
 * 특정 도메인을 위한 전용 Hook들
 */
// 사용자 관리 전용 Hook
export function useUserManagement() {
  const { useUserProfile, useUpdateUserProfile, cacheUtils } = useEnhancedAPI();
  return {
    useUserProfile,
    useUpdateUserProfile,
    invalidateUser: cacheUtils.invalidateUser,
    getUserData: cacheUtils.getUserData,
    setUserData: cacheUtils.setUserData,
  };
}
// 클럽 관리 전용 Hook
export function useClubManagement() {
  const { useClubs, useClub, useClubMembers, cacheUtils } = useEnhancedAPI();
  return {
    useClubs,
    useClub,
    useClubMembers,
    invalidateClub: cacheUtils.invalidateClub,
  };
}
