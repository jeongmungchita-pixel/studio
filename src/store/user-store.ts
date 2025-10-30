'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile } from '@/types/auth';
import { APIError } from '@/utils/error/api-error';

interface UserStore {
  // 상태
  user: UserProfile | null;
  isLoading: boolean;
  error: APIError | null;

  // 액션
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: APIError | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearUser: () => void;
  reset: () => void;
}

/**
 * 사용자 상태 관리 Store
 * Zustand를 사용하여 전역 사용자 상태를 관리합니다.
 */
export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      // 초기 상태
      user: null,
      isLoading: false,
      error: null,

      // 사용자 설정
      setUser: (user) => {
        set({ 
          user, 
          error: null,
          isLoading: false 
        });
      },

      // 로딩 상태 설정
      setLoading: (isLoading) => {
        set({ isLoading });
      },

      // 에러 설정
      setError: (error) => {
        set({ 
          error, 
          isLoading: false 
        });
      },

      // 프로필 업데이트
      updateProfile: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: {
              ...currentUser,
              ...updates,
              updatedAt: new Date().toISOString(),
            },
          });
        }
      },

      // 사용자 정보 삭제
      clearUser: () => {
        set({
          user: null,
          error: null,
          isLoading: false,
        });
      },

      // 전체 상태 초기화
      reset: () => {
        set({
          user: null,
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: 'user-store',
      // 민감한 정보는 localStorage에 저장하지 않음
      partialize: (state) => ({
        user: state.user ? {
          uid: state.user.uid,
          email: state.user.email,
          displayName: state.user.displayName,
          role: state.user.role,
          status: state.user.status,
          clubId: state.user.clubId,
          clubName: state.user.clubName,
        } : null,
      }),
    }
  )
);

// 편의를 위한 선택자들
export const useUser = () => useUserStore((state) => state.user);
export const useUserLoading = () => useUserStore((state) => state.isLoading);
export const useUserError = () => useUserStore((state) => state.error);

// 사용자 역할 확인 헬퍼
export const useUserRole = () => {
  const user = useUser();
  return user?.role || null;
};

// 사용자 권한 확인 헬퍼
export const useUserPermissions = () => {
  const user = useUser();
  
  return {
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
    isFederationAdmin: user?.role === 'FEDERATION_ADMIN',
    isClubOwner: user?.role === 'CLUB_OWNER',
    isClubManager: user?.role === 'CLUB_MANAGER',
    isCoach: user?.role === 'HEAD_COACH' || user?.role === 'ASSISTANT_COACH',
    isMember: user?.role === 'MEMBER',
    isActive: user?.status === 'active',
    isPending: user?.status === 'pending',
  };
};
