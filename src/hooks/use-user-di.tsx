'use client';

import { useEffect, useState } from 'react';
import { useService, useFirebaseService } from '@/lib/di/global-di';
import type { IFirebaseService, IAuthService } from '@/lib/di/interfaces';
import { UserProfile, UserRole } from '@/types';
import { ApprovalRequest } from '@/types/common';

export interface UserHookResult {
  _user: (UserProfile & { clubId?: string; _profileError?: boolean }) | null;
  isUserLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/**
 * DI 기반 사용자 Hook
 * Firebase 의존성을 DI 컨테이너를 통해 주입받음
 */
export function useUserDI(): UserHookResult {
  // DI를 통해 서비스 주입
  const firebaseService = useFirebaseService();
  const authService = useService<IAuthService>('authService');
  
  const [_user, setUser] = useState<(UserProfile & { clubId?: string }) | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  /**
   * 사용자 프로필 새로고침
   */
  const refreshProfile = async () => {
    const fs = firebaseService as any;
    const firebaseUser = fs.getCurrentUser();
    const firestore = fs.getFirestore();
    
    if (!firebaseUser || !firestore) {
      setUser(null);
      setIsUserLoading(false);
      return;
    }

    try {
      setIsUserLoading(true);
      const profile = await authService.getUserProfile(firebaseUser, firestore);
      setUser(profile);
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
      setUser(null);
    } finally {
      setIsUserLoading(false);
    }
  };

  /**
   * 로그아웃 처리
   */
  const handleSignOut = async () => {
    try {
      // Firebase Auth 로그아웃
      const fs = firebaseService as any;
      const auth = fs.getCurrentUser();
      if (auth) {
        // Firebase signOut logic here
        // await signOut(auth);
      }
      
      // 상태 초기화
      setUser(null);
      setIsUserLoading(false);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  useEffect(() => {
    // Firebase Auth 상태 변경 감지
    const fs = firebaseService as any;
    const unsubscribe = fs.onAuthStateChanged?.(async (firebaseUser: any) => {
      if (firebaseUser) {
        try {
          setIsUserLoading(true);
          const firestore = fs.getFirestore();
          if (firestore) {
            try {
              const profile = await authService.getUserProfile(firebaseUser, firestore);
              setUser(profile);
            } catch (error) {
              console.error('Failed to get user profile:', error);
              setUser(null);
            }
          }
        } catch (error) {
          console.error('Failed to load user:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsUserLoading(false);
    });

    return () => {
      unsubscribe?.();
    };
  }, [firebaseService, authService]);

  return {
    _user,
    isUserLoading,
    signOut: handleSignOut,
    refreshProfile,
  };
}

/**
 * DI 기반 사용자 역할 Hook
 */
export function useUserRole(): UserRole | null {
  const { _user } = useUserDI();
  return _user?.role || null;
}

/**
 * DI 기반 사용자 권한 Hook
 */
export function useUserPermissions(): string[] {
  const { _user } = useUserDI();
  return (_user as any)?.permissions || [];
}

/**
 * DI 기반 클럽 정보 Hook
 */
export function useUserClub() {
  const { _user } = useUserDI();
  
  if (!_user || !_user.clubId) {
    return { clubId: null, clubName: null };
  }

  return {
    clubId: _user.clubId,
    clubName: _user.clubName || null,
  };
}

/**
 * DI 기반 승인 요청 Hook
 */
export function useUserApprovalRequests() {
  const { _user } = useUserDI();
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const firebaseService = useFirebaseService();
  const authService = useService<IAuthService>('authService');

  useEffect(() => {
    if (!_user) {
      setHasPendingRequests(false);
      return;
    }

    const checkPendingRequests = async () => {
      try {
        setIsLoading(true);
        const fs = firebaseService as any;
        const firestore = fs.getFirestore();
        if (firestore) {
          const pending = await authService.hasPendingRequests(_user.uid, firestore);
          setHasPendingRequests(pending);
        }
      } catch (error) {
        console.error('Failed to check pending requests:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkPendingRequests();
  }, [_user, firebaseService, authService]);

  return {
    hasPendingRequests,
    isLoading,
  };
}

// 기존 useUser와 호환성을 위한 export
export { useUserDI as useUser };
