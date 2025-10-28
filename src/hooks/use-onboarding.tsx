'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';

export type OnboardingStep = 
  | 'register'      // 회원가입 진행 중
  | 'verify'        // 이메일 인증 대기
  | 'approval'      // 관리자 승인 대기
  | 'profile'       // 프로필 설정
  | 'complete';     // 온보딩 완료

export interface OnboardingState {
  step: OnboardingStep;
  progress: number; // 0-100
  nextAction: string;
  isLoading: boolean;
}

/**
 * 온보딩 프로세스 상태 관리 Hook
 */
export function useOnboarding() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<OnboardingState>({
    step: 'register',
    progress: 0,
    nextAction: '회원가입을 진행해주세요',
    isLoading: true
  });

  useEffect(() => {
    if (isUserLoading) {
      setState(prev => ({ ...prev, isLoading: true }));
      return;
    }

    // 사용자 상태에 따른 온보딩 단계 결정
    if (!user) {
      // 로그인하지 않은 경우
      if (pathname?.startsWith('/register')) {
        setState({
          step: 'register',
          progress: 20,
          nextAction: '회원가입을 완료해주세요',
          isLoading: false
        });
      } else {
        setState({
          step: 'register',
          progress: 0,
          nextAction: '회원가입을 시작해주세요',
          isLoading: false
        });
      }
    } else if (user.status === 'pending') {
      // 승인 대기 중
      setState({
        step: 'approval',
        progress: 60,
        nextAction: '관리자 승인을 기다려주세요',
        isLoading: false
      });
    } else if (!user.phoneNumber || !user.displayName) {
      // 프로필 미완성
      setState({
        step: 'profile',
        progress: 80,
        nextAction: '프로필을 완성해주세요',
        isLoading: false
      });
    } else {
      // 온보딩 완료
      setState({
        step: 'complete',
        progress: 100,
        nextAction: '서비스를 이용할 수 있습니다',
        isLoading: false
      });
    }
  }, [user, isUserLoading, pathname]);

  /**
   * 다음 단계로 이동
   */
  const goToNextStep = () => {
    switch (state.step) {
      case 'register':
        router.push('/register');
        break;
      case 'verify':
        // 이메일 인증 페이지로 이동 (필요시 구현)
        break;
      case 'approval':
        router.push('/pending-approval');
        break;
      case 'profile':
        router.push('/profile-setup');
        break;
      case 'complete':
        // 역할별 대시보드로 이동
        if (user) {
          const defaultRoute = getDefaultRouteByRole(user.role);
          router.push(defaultRoute);
        }
        break;
    }
  };

  /**
   * 온보딩 건너뛰기 (가능한 경우에만)
   */
  const skipOnboarding = () => {
    if (state.step === 'profile' && user) {
      // 프로필 설정을 나중에 하도록 허용
      const defaultRoute = getDefaultRouteByRole(user.role);
      router.push(defaultRoute);
    }
  };

  return {
    ...state,
    goToNextStep,
    skipOnboarding,
    canSkip: state.step === 'profile' // 프로필 설정만 건너뛸 수 있음
  };
}

/**
 * 역할별 기본 라우트
 */
function getDefaultRouteByRole(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/super-admin';
    case 'FEDERATION_ADMIN':
      return '/admin';
    case 'CLUB_OWNER':
    case 'CLUB_MANAGER':
      return '/club-dashboard';
    default:
      return '/my-profile';
  }
}
