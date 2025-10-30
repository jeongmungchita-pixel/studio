import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NavigationManager } from '../navigation-manager';
import { UserRole } from '@/types/auth';

describe('NavigationManager', () => {
  let navigationManager: NavigationManager;
  let originalLocation: Location;

  beforeEach(() => {
    // window.location 모킹
    originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      href: '',
      replace: vi.fn(),
      reload: vi.fn(),
    } as any;

    // 새 인스턴스 생성
    navigationManager = NavigationManager.getInstance();
  });

  afterEach(() => {
    window.location = originalLocation;
    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('싱글톤 인스턴스를 반환해야 함', () => {
      const instance1 = NavigationManager.getInstance();
      const instance2 = NavigationManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('navigate', () => {
    it('경로로 네비게이션해야 함', async () => {
      await navigationManager.navigate('/test-path');
      expect(window.location.href).toBe('/test-path');
    });

    it('replace 옵션이 true일 때 replace를 사용해야 함', async () => {
      await navigationManager.navigate('/test-path', { replace: true });
      expect(window.location.replace).toHaveBeenCalledWith('/test-path');
    });

    it('중복 네비게이션을 방지해야 함', async () => {
      const promise1 = navigationManager.navigate('/test-path');
      const promise2 = navigationManager.navigate('/test-path');
      
      await Promise.all([promise1, promise2]);
      
      // 한 번만 호출되어야 함
      expect(window.location.href).toBe('/test-path');
    });

    it('네비게이션 히스토리를 유지해야 함', async () => {
      await navigationManager.navigate('/path1');
      await navigationManager.navigate('/path2');
      
      const history = navigationManager.getHistory();
      expect(history).toContain('/path1');
      expect(history).toContain('/path2');
    });
  });

  describe('navigateByRole', () => {
    it('SUPER_ADMIN 역할에 맞는 경로로 이동해야 함', () => {
      const user = { role: UserRole.SUPER_ADMIN, status: 'active' as const };
      navigationManager.navigateByRole(user);
      expect(window.location.href).toBe('/super-admin');
    });

    it('CLUB_OWNER 역할에 맞는 경로로 이동해야 함', () => {
      const user = { role: UserRole.CLUB_OWNER, status: 'active' as const };
      navigationManager.navigateByRole(user);
      expect(window.location.href).toBe('/club-dashboard');
    });

    it('MEMBER 역할에 맞는 경로로 이동해야 함', () => {
      const user = { role: UserRole.MEMBER, status: 'active' as const };
      navigationManager.navigateByRole(user);
      expect(window.location.href).toBe('/my-profile');
    });

    it('pending 상태일 때 pending-approval로 이동해야 함', () => {
      const user = { role: UserRole.MEMBER, status: 'pending' as const };
      navigationManager.navigateByRole(user);
      expect(window.location.href).toBe('/pending-approval');
    });

    it('사용자가 없을 때 로그인 페이지로 이동해야 함', () => {
      navigationManager.navigateByRole(null);
      expect(window.location.href).toBe('/login');
    });
  });

  describe('navigation methods', () => {
    it('goBack이 이전 경로로 이동해야 함', async () => {
      await navigationManager.navigate('/path1');
      await navigationManager.navigate('/path2');
      
      navigationManager.goBack();
      expect(window.location.href).toBe('/path1');
    });

    it('goHome이 홈으로 이동해야 함', () => {
      navigationManager.goHome();
      expect(window.location.href).toBe('/');
    });

    it('goToLogin이 로그인 페이지로 이동해야 함', () => {
      navigationManager.goToLogin();
      expect(window.location.href).toBe('/login');
    });
  });

  describe('isCurrentPath', () => {
    it('현재 경로와 일치하면 true를 반환해야 함', async () => {
      await navigationManager.navigate('/test-path');
      expect(navigationManager.isCurrentPath('/test-path')).toBe(true);
    });

    it('현재 경로와 일치하지 않으면 false를 반환해야 함', async () => {
      await navigationManager.navigate('/test-path');
      expect(navigationManager.isCurrentPath('/other-path')).toBe(false);
    });
  });

  describe('debug', () => {
    it('디버그 정보를 출력해야 함', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      navigationManager.debug();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('NavigationManager Debug'),
        expect.objectContaining({
          isNavigating: expect.any(Boolean),
          queueLength: expect.any(Number),
          historyLength: expect.any(Number),
        })
      );
    });
  });
});
