/**
 * 중앙 네비게이션 매니저
 * 모든 라우팅을 관리하고 무한루프를 방지합니다.
 */

import { UserRole } from '@/types/auth';

export interface NavigationOptions {
  replace?: boolean;
  force?: boolean;
  skipCheck?: boolean;
}

export interface UserContext {
  role?: UserRole;
  status?: 'pending' | 'active' | 'inactive';
  isAuthenticated: boolean;
}

export class NavigationManager {
  private static instance: NavigationManager;
  private isNavigating = false;
  private navigationQueue: Array<{ path: string; options?: NavigationOptions }> = [];
  private lastNavigationPath: string | null = null;
  private navigationHistory: string[] = [];
  private maxHistorySize = 10;

  private constructor() {}

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): NavigationManager {
    if (!NavigationManager.instance) {
      NavigationManager.instance = new NavigationManager();
    }
    return NavigationManager.instance;
  }

  /**
   * 네비게이션 실행
   */
  navigate(path: string, options?: NavigationOptions): void {
    // 디버깅 로그
    if (process.env.NODE_ENV === 'development') {
      console.log('🧭 Navigation Request:', { path, options, isNavigating: this.isNavigating });
    }

    // 동일한 경로로의 반복 네비게이션 방지
    if (!options?.force && this.lastNavigationPath === path) {
      console.warn('🚫 Duplicate navigation prevented:', path);
      return;
    }

    // 이미 네비게이션 중이면 큐에 추가
    if (this.isNavigating && !options?.skipCheck) {
      this.navigationQueue.push({ path, options });
      console.log('📋 Added to navigation queue:', path);
      return;
    }

    // 네비게이션 실행
    this.performNavigation(path, options);
  }

  /**
   * 사용자 컨텍스트 기반 네비게이션
   */
  navigateByRole(user: UserContext): void {
    const path = this.getPathByRole(user);
    this.navigate(path, { replace: true });
  }

  /**
   * 역할별 기본 경로 반환
   */
  private getPathByRole(user: UserContext): string {
    // 인증되지 않은 사용자
    if (!user.isAuthenticated) {
      return '/login';
    }

    // 승인 대기 중인 사용자
    if (user.status === 'pending') {
      return '/pending-approval';
    }

    // 비활성 사용자
    if (user.status === 'inactive') {
      return '/inactive';
    }

    // 역할별 대시보드
    switch (user.role) {
      case UserRole.SUPER_ADMIN:
        return '/super-admin';
      case UserRole.FEDERATION_ADMIN:
        return '/admin';
      case UserRole.CLUB_OWNER:
      case UserRole.CLUB_MANAGER:
        return '/club-dashboard';
      case UserRole.HEAD_COACH:
      case UserRole.ASSISTANT_COACH:
        return '/club-dashboard';
      case UserRole.MEMBER:
      case UserRole.PARENT:
        return '/my-profile';
      default:
        return '/';
    }
  }

  /**
   * 실제 네비게이션 수행
   */
  private performNavigation(path: string, options?: NavigationOptions): void {
    this.isNavigating = true;
    this.lastNavigationPath = path;
    
    // 히스토리 추가
    this.addToHistory(path);

    try {
      // 클라이언트 사이드에서만 실행
      if (typeof window !== 'undefined') {
        if (options?.replace) {
          window.location.replace(path);
        } else {
          window.location.href = path;
        }
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
      this.isNavigating = false;
      this.processQueue();
    }

    // 네비게이션 후 플래그 리셋 (페이지 이동 시 실행되지 않을 수 있음)
    setTimeout(() => {
      this.isNavigating = false;
      this.processQueue();
    }, 100);
  }

  /**
   * 네비게이션 큐 처리
   */
  private processQueue(): void {
    if (this.navigationQueue.length > 0) {
      const next = this.navigationQueue.shift();
      if (next) {
        this.navigate(next.path, next.options);
      }
    }
  }

  /**
   * 히스토리에 추가
   */
  private addToHistory(path: string): void {
    this.navigationHistory.push(path);
    if (this.navigationHistory.length > this.maxHistorySize) {
      this.navigationHistory.shift();
    }
  }

  /**
   * 뒤로가기
   */
  goBack(): void {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  }

  /**
   * 앞으로가기
   */
  goForward(): void {
    if (typeof window !== 'undefined') {
      window.history.forward();
    }
  }

  /**
   * 홈으로 이동
   */
  goHome(): void {
    this.navigate('/', { replace: true });
  }

  /**
   * 로그인 페이지로 이동
   */
  goToLogin(): void {
    this.navigate('/login', { replace: true });
  }

  /**
   * 현재 경로 확인
   */
  getCurrentPath(): string {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  }

  /**
   * 특정 경로인지 확인
   */
  isCurrentPath(path: string): boolean {
    return this.getCurrentPath() === path;
  }

  /**
   * 네비게이션 히스토리 반환
   */
  getHistory(): string[] {
    return [...this.navigationHistory];
  }

  /**
   * 네비게이션 상태 리셋
   */
  reset(): void {
    this.isNavigating = false;
    this.navigationQueue = [];
    this.lastNavigationPath = null;
    this.navigationHistory = [];
  }

  /**
   * 디버그 정보 출력
   */
  debug(): void {
    console.log('🔍 NavigationManager Debug:', {
      isNavigating: this.isNavigating,
      lastPath: this.lastNavigationPath,
      queueLength: this.navigationQueue.length,
      history: this.navigationHistory,
      currentPath: this.getCurrentPath()
    });
  }
}

// 전역 인스턴스 export
export const navigationManager = NavigationManager.getInstance();
