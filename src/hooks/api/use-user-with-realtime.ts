'use client';
import { useEffect } from 'react';
import { where } from 'firebase/firestore';
import { useAuth } from '@/firebase';
import { useUserStore } from '@/store/user-store';
import { useRealtimeDocument, useRealtimeCollection } from '@/hooks/realtime';
import { useOptimisticUpdate } from './use-optimistic-update';
import { getAPI } from '@/api';
import { UserProfile } from '@/types/auth';
import { APIError } from '@/utils/error/api-error';
/**
 * 실시간 사용자 데이터 Hook
 * 기존 useUser를 대체하여 실시간 동기화와 낙관적 업데이트를 제공합니다.
 */
export function useUserWithRealtime() {
  const auth = useAuth();
  const { _user, setUser, setLoading, setError, updateProfile } = useUserStore();
  const currentUser = auth?.currentUser;
  const userId = currentUser?.uid;
  // 실시간 사용자 프로필 동기화
  const {
    data: realtimeUser,
    exists,
    isLoading: isRealtimeLoading,
    error: realtimeError,
    isConnected,
  } = useRealtimeDocument<UserProfile>(
    'users',
    userId || '',
    {
      enabled: !!userId,
      onDocumentChange: (userData, exists) => {
        if (exists && userData) {
          // 실시간으로 사용자 데이터 업데이트
          setUser(userData as UserProfile);
          // 권한 변경 감지
          if (_user && _user.role !== (userData as any).role) {
            // 필요시 페이지 리다이렉트 로직 추가
          }
          // 상태 변경 감지
          if (_user && _user.status !== (userData as any).status) {
            // 상태 변경에 따른 처리 (예: 계정 정지 시 로그아웃)
          }
        } else if (!exists) {
          // 사용자 문서가 삭제된 경우
          setUser(null);
        }
      },
      onError: (error) => {
        setError(error);
      },
    }
  );
  // 낙관적 업데이트를 위한 Hook
  const {
    optimisticUpdate,
    isLoading: isOptimisticLoading,
    error: optimisticError,
  } = useOptimisticUpdate<UserProfile>(_user);
  // 로딩 상태 통합
  useEffect(() => {
    setLoading(isRealtimeLoading || isOptimisticLoading);
  }, [isRealtimeLoading, isOptimisticLoading, setLoading]);
  // 에러 상태 통합
  useEffect(() => {
    const error = realtimeError || optimisticError;
    setError(error);
  }, [realtimeError, optimisticError, setError]);
  // 초기 사용자 데이터 설정
  useEffect(() => {
    if (realtimeUser && !_user) {
      setUser(realtimeUser);
    }
  }, [realtimeUser, _user, setUser]);
  // 프로필 업데이트 (낙관적)
  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!_user || !userId) {
      throw new APIError('User not authenticated', 'UNAUTHENTICATED', 401);
    }
    const optimisticData = { ..._user, ...updates };
    await optimisticUpdate(
      optimisticData,
      async () => {
        const api = getAPI();
        const result = await api.user.updateProfile(userId, updates);
        return result.data;
      },
      updates
    );
  };
  return {
    _user,
    isLoading: isRealtimeLoading || isOptimisticLoading,
    error: realtimeError || optimisticError,
    isConnected,
    exists,
    updateProfile: updateUserProfile,
    // Store 액션들도 노출
    setUser,
    clearUser: useUserStore.getState().clearUser,
  };
}
/**
 * 실시간 클럽 회원 목록 Hook
 */
export function useClubMembersRealtime(clubId?: string) {
  const constraints = clubId ? [where('clubId', '==', clubId)] : [];
  return useRealtimeCollection<UserProfile>(
    'users',
    constraints,
    {
      enabled: !!clubId,
      onError: (error: APIError) => {
      },
    }
  );
}
/**
 * 실시간 사용자 권한 Hook
 * 권한 변경을 실시간으로 감지하고 적절한 액션을 수행합니다.
 */
export function useRealtimePermissions(userId?: string) {
  const { _user } = useUserStore();
  const {
    data: userData,
    isConnected,
  } = useRealtimeDocument<UserProfile>(
    'users',
    userId || '',
    {
      enabled: !!userId,
      onDocumentChange: (newUserData, exists) => {
        if (!exists || !newUserData || !_user) return;
        // 권한 변경 감지
        if (_user.role !== (newUserData as any).role) {
          // 권한 변경에 따른 리다이렉트 또는 알림
          // 이 부분은 실제 라우팅 로직과 연동
        }
        // 계정 상태 변경 감지
        if (_user.status !== (newUserData as any).status) {
          // 계정 정지 등의 상태 변경 처리
          if ((newUserData as any).status === 'suspended') {
            // 로그아웃 처리
          }
        }
      },
    }
  );
  return {
    isConnected,
    currentRole: userData?.role || _user?.role,
    currentStatus: userData?.status || _user?.status,
  };
}
