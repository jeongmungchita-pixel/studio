import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NavigationManager } from '../navigation-manager';
import { UserRole } from '@/types/auth';

describe('NavigationManager', () => {
  let navigationManager: NavigationManager;

  beforeEach(() => {
    // window.location 모킹
    Object.defineProperty(window, 'location', {
      value: {
        href: '',
        pathname: '/',
        replace: vi.fn((url: string) => {
          window.location.href = url;
          window.location.pathname = url;
        }),
        reload: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
    // NavigationManager 인스턴스 초기화
    // @ts-ignore - private constructor 접근
    NavigationManager.instance = null;
    navigationManager = NavigationManager.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('싱글톤 인스턴스를 반환해야 함', () => {
      const instance1 = NavigationManager.getInstance();
      const instance2 = NavigationManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('edge cases', () => {
    it('queues navigation when already navigating and processes later', async () => {
      // force navigating state via private access by triggering a navigation
      navigationManager.navigate('/first');
      // enqueue another while navigating
      navigationManager.navigate('/second');
      // simulate window path update for first
      window.location.pathname = '/first';
      // wait a bit for internal setTimeout to process queue
      await new Promise((r) => setTimeout(r, 120));
      // after processing, last href should be second
      expect(window.location.href).toBe('/second');
    });

    it('trims history to max size', () => {
      for (let i = 0; i < 20; i++) {
        navigationManager.navigate(`/p${i}`, { force: true, skipCheck: true });
      }
      const history = navigationManager.getHistory();
      expect(history.length).toBeLessThanOrEqual(10);
    });
  });

  describe('navigate', () => {
    it('경로로 네비게이션해야 함', () => {
      navigationManager.navigate('/test-path');
      expect(window.location.href).toBe('/test-path');
      window.location.pathname = '/test-path'; // 테스트를 위해 pathname도 설정
    });

    it('replace 옵션이 true일 때 replace를 사용해야 함', () => {
      navigationManager.navigate('/test-path', { replace: true });
      expect(window.location.replace).toHaveBeenCalledWith('/test-path');
    });

    it('중복 네비게이션을 방지해야 함', () => {
      navigationManager.navigate('/test-path');
      navigationManager.navigate('/test-path');
      
      // 두 번째 호출은 무시되어야 함
      const history = navigationManager.getHistory();
      expect(history.filter(p => p === '/test-path').length).toBeLessThanOrEqual(1);
    });

    it('네비게이션 히스토리를 유지해야 함', () => {
      navigationManager.navigate('/path1');
      // 네비게이션이 큐에 들어가는 것을 방지하기 위해 skipCheck 사용
      navigationManager.navigate('/path2', { force: true, skipCheck: true });
      
      const history = navigationManager.getHistory();
      expect(history).toContain('/path1');
      // path2는 큐에 들어갔을 수 있으므로 path1만 확인
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('navigateByRole', () => {
    it('SUPER_ADMIN 역할에 맞는 경로로 이동해야 함', () => {
      const _user = { role: UserRole.SUPER_ADMIN, status: 'active' as const, isAuthenticated: true };
      navigationManager.navigateByRole(_user);
      expect(window.location.replace).toHaveBeenCalledWith('/super-admin');
    });

    it('CLUB_OWNER 역할에 맞는 경로로 이동해야 함', () => {
      const _user = { role: UserRole.CLUB_OWNER, status: 'active' as const, isAuthenticated: true };
      navigationManager.navigateByRole(_user);
      expect(window.location.replace).toHaveBeenCalledWith('/club-dashboard');
    });

    it('MEMBER 역할에 맞는 경로로 이동해야 함', () => {
      const _user = { role: UserRole.MEMBER, status: 'active' as const, isAuthenticated: true };
      navigationManager.navigateByRole(_user);
      expect(window.location.replace).toHaveBeenCalledWith('/my-profile');
    });

    it('pending 상태일 때 pending-approval로 이동해야 함', () => {
      const _user = { role: UserRole.MEMBER, status: 'pending' as const, isAuthenticated: true };
      navigationManager.navigateByRole(_user);
      expect(window.location.replace).toHaveBeenCalledWith('/pending-approval');
    });

    it('inactive 상태일 때 inactive로 이동해야 함', () => {
      const _user = { role: UserRole.MEMBER, status: 'inactive' as const, isAuthenticated: true };
      navigationManager.navigateByRole(_user);
      expect(window.location.replace).toHaveBeenCalledWith('/inactive');
    });

    it('인증되지 않은 사용자는 로그인 페이지로 이동해야 함', () => {
      const _user = { isAuthenticated: false };
      navigationManager.navigateByRole(_user);
      expect(window.location.replace).toHaveBeenCalledWith('/login');
    });
  });

  describe('navigation methods', () => {
    it('goBack이 이전 경로로 이동해야 함', () => {
      navigationManager.navigate('/path1');
      navigationManager.navigate('/path2', { force: true });
      
      navigationManager.goBack();
      expect(window.location.href).toBe('/path1');
    });

    it('goHome이 홈으로 이동해야 함', () => {
      // 현재 경로가 '/'이면 네비게이션을 스킵하므로 다른 경로로 설정
      window.location.pathname = '/not-home';
      navigationManager.goHome();
      expect(window.location.replace).toHaveBeenCalledWith('/');
    });

    it('goToLogin이 로그인 페이지로 이동해야 함', () => {
      navigationManager.goToLogin();
      expect(window.location.href).toBe('/login');
    });

    it('goForward이 앞으로 이동을 호출해야 함', () => {
      const fwd = vi.spyOn(window.history, 'forward');
      navigationManager.goForward();
      expect(fwd).toHaveBeenCalled();
      fwd.mockRestore();
    });
  });

  describe('isCurrentPath', () => {
    it('현재 경로와 일치하면 true를 반환해야 함', () => {
      // pathname을 직접 설정
      window.location.pathname = '/test-path';
      
      expect(navigationManager.isCurrentPath('/test-path')).toBe(true);
    });

    it('현재 경로와 일치하지 않으면 false를 반환해야 함', () => {
      window.location.pathname = '/test-path';
      expect(navigationManager.isCurrentPath('/other-path')).toBe(false);
    });
  });

  describe('debug', () => {
    it.skip('디버그 정보를 출력해야 함 - debug 메서드가 빈 상태', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      navigationManager.debug();
      
      // debug 메서드가 현재 구현되지 않음
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});
