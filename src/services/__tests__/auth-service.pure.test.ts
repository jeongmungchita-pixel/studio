import { describe, it, expect } from 'vitest';
import { authService } from '../auth-service';
import { UserRole } from '@/types/auth';

// 이 파일은 외부 SDK/네트워크 없이 순수 분기 로직을 검증합니다.

describe('AuthService (pure parts)', () => {
  describe('getRedirectUrlByRole', () => {
    it('pending 상태는 역할과 무관하게 /pending-approval 로 이동', () => {
      expect(authService.getRedirectUrlByRole(UserRole.MEMBER, 'pending')).toBe('/pending-approval');
      expect(authService.getRedirectUrlByRole(UserRole.SUPER_ADMIN, 'pending')).toBe('/pending-approval');
    });

    it('역할별 기본 리다이렉트 경로를 반환', () => {
      expect(authService.getRedirectUrlByRole(UserRole.SUPER_ADMIN)).toBe('/super-admin');
      expect(authService.getRedirectUrlByRole(UserRole.FEDERATION_ADMIN)).toBe('/admin');
      expect(authService.getRedirectUrlByRole(UserRole.CLUB_OWNER)).toBe('/club-dashboard');
      expect(authService.getRedirectUrlByRole(UserRole.CLUB_MANAGER)).toBe('/club-dashboard');
      expect(authService.getRedirectUrlByRole(UserRole.HEAD_COACH)).toBe('/club-dashboard');
      expect(authService.getRedirectUrlByRole(UserRole.ASSISTANT_COACH)).toBe('/club-dashboard');
      expect(authService.getRedirectUrlByRole(UserRole.COMMITTEE_CHAIR)).toBe('/committees');
      expect(authService.getRedirectUrlByRole(UserRole.COMMITTEE_MEMBER)).toBe('/committees');
      expect(authService.getRedirectUrlByRole(UserRole.MEMBER)).toBe('/my-profile');
    });
  });

  describe('canAccessRoute', () => {
    it('공개 라우트는 누구나 접근 가능', () => {
      expect(authService.canAccessRoute(UserRole.MEMBER, '/')).toBe(true);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/login')).toBe(true);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/register')).toBe(true);
    });

    it('SUPER_ADMIN은 모든 라우트 접근 가능', () => {
      expect(authService.canAccessRoute(UserRole.SUPER_ADMIN, '/admin')).toBe(true);
      expect(authService.canAccessRoute(UserRole.SUPER_ADMIN, '/system')).toBe(true);
      expect(authService.canAccessRoute(UserRole.SUPER_ADMIN, '/club-dashboard')).toBe(true);
      expect(authService.canAccessRoute(UserRole.SUPER_ADMIN, '/my-profile')).toBe(true);
    });

    it('FEDERATION_ADMIN은 관리자/멤버 라우트 접근 가능', () => {
      expect(authService.canAccessRoute(UserRole.FEDERATION_ADMIN, '/admin')).toBe(true);
      expect(authService.canAccessRoute(UserRole.FEDERATION_ADMIN, '/system')).toBe(true);
      expect(authService.canAccessRoute(UserRole.FEDERATION_ADMIN, '/my-profile')).toBe(true);
      // 클럽 대시보드는 불가
      expect(authService.canAccessRoute(UserRole.FEDERATION_ADMIN, '/club-dashboard')).toBe(false);
    });

    it('클럽 역할은 클럽/멤버 라우트 접근 가능', () => {
      const clubRoles = [
        UserRole.CLUB_OWNER,
        UserRole.CLUB_MANAGER,
        UserRole.HEAD_COACH,
        UserRole.ASSISTANT_COACH,
      ];
      for (const role of clubRoles) {
        expect(authService.canAccessRoute(role, '/club-dashboard')).toBe(true);
        expect(authService.canAccessRoute(role, '/my-profile')).toBe(true);
        expect(authService.canAccessRoute(role, '/admin')).toBe(false);
      }
    });

    it('일반 회원은 멤버 라우트만 접근 가능', () => {
      expect(authService.canAccessRoute(UserRole.MEMBER, '/my-profile')).toBe(true);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/events')).toBe(true);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/competitions')).toBe(true);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/club-dashboard')).toBe(false);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/admin')).toBe(false);
    });
  });
});
