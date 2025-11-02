/**
 * NavigationManager를 사용하기 위한 React Hook
 */
import { useCallback } from 'react';
import { navigationManager, NavigationOptions, UserContext } from '@/services/navigation-manager';
import { useUser } from '@/firebase';
import { UserRole } from '@/types/auth';
export function useNavigation() {
  const { _user } = useUser();
  /**
   * 일반 네비게이션
   */
  const navigate = useCallback((path: string, options?: NavigationOptions) => {
    navigationManager.navigate(path, options);
  }, []);
  /**
   * 역할 기반 네비게이션
   */
  const navigateByRole = useCallback(() => {
    const userContext: UserContext = {
      isAuthenticated: !!_user,
      role: _user?.role as UserRole,
      status: _user?.status as 'pending' | 'active' | 'inactive'
    };
    navigationManager.navigateByRole(userContext);
  }, [_user]);
  /**
   * 뒤로가기
   */
  const goBack = useCallback(() => {
    navigationManager.goBack();
  }, []);
  /**
   * 홈으로 이동
   */
  const goHome = useCallback(() => {
    navigationManager.goHome();
  }, []);
  /**
   * 로그인 페이지로 이동
   */
  const goToLogin = useCallback(() => {
    navigationManager.goToLogin();
  }, []);
  /**
   * 현재 경로 확인
   */
  const isCurrentPath = useCallback((path: string) => {
    return navigationManager.isCurrentPath(path);
  }, []);
  /**
   * 디버그 정보 출력
   */
  const debug = useCallback(() => {
    navigationManager.debug();
  }, []);
  return {
    navigate,
    navigateByRole,
    goBack,
    goHome,
    goToLogin,
    isCurrentPath,
    debug,
    // 직접 접근이 필요한 경우를 위해
    manager: navigationManager
  };
}
