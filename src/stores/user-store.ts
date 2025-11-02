'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile } from '@/types/auth';
import { APIError } from '@/lib/error/error-manager';
interface UserStore {
  // 상태
  _user: UserProfile | null;
  isLoading: boolean;
  error: APIError | null;
  // 액션
  setUser: (_user: UserProfile | null) => void;
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
      _user: null,
      isLoading: false,
      error: null,
      // 사용자 설정
      setUser: (_user) => {
        set({ 
          _user, 
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
        const currentUser = get()._user;
        if (currentUser) {
          set({
            _user: {
              ...currentUser,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          });
        }
      },
      // 사용자 정보 삭제
      clearUser: () => {
        set({
          _user: null,
          error: null,
          isLoading: false,
        });
      },
      // 전체 상태 초기화
      reset: () => {
        set({
          _user: null,
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: 'user-store',
      // 민감한 정보는 localStorage에 저장하지 않음
      partialize: (state) => ({
        _user: state._user ? {
          uid: state._user.uid,
          email: state._user.email,
          displayName: state._user.displayName,
          role: state._user.role,
          status: state._user.status,
          clubId: state._user.clubId,
          clubName: state._user.clubName,
        } : null,
      }),
    }
  )
);
// 편의를 위한 선택자들
export const useUser = () => useUserStore((state) => state._user);
export const useUserLoading = () => useUserStore((state) => state.isLoading);
export const useUserError = () => useUserStore((state) => state.error);
// 사용자 역할 확인 헬퍼
export const useUserRole = () => {
  const _user = useUser();
  return _user?.role || null;
};
// 사용자 권한 확인 헬퍼
export const useUserPermissions = () => {
  const _user = useUser();
  return {
    isSuperAdmin: _user?.role === 'SUPER_ADMIN',
    isFederationAdmin: _user?.role === 'FEDERATION_ADMIN',
    isClubOwner: _user?.role === 'CLUB_OWNER',
    isClubManager: _user?.role === 'CLUB_MANAGER',
    isCoach: _user?.role === 'HEAD_COACH' || _user?.role === 'ASSISTANT_COACH',
    isMember: _user?.role === 'MEMBER',
    isActive: _user?.status === 'active',
    isPending: _user?.status === 'pending',
  };
};
