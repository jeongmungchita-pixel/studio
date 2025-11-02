import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '@/services/auth-service';
import { UserRole } from '@/types/auth';

// Mock Firebase
vi.mock('@/firebase', () => ({
  auth: {
    currentUser: null
  }
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = AuthService.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getRedirectUrlByRole', () => {
    it('should return correct URL for SUPER_ADMIN', () => {
      const url = authService.getRedirectUrlByRole(UserRole.SUPER_ADMIN);
      expect(url).toBe('/super-admin');
    });

    it('should return correct URL for FEDERATION_ADMIN', () => {
      const url = authService.getRedirectUrlByRole(UserRole.FEDERATION_ADMIN);
      expect(url).toBe('/admin');
    });

    it('should return correct URL for CLUB_OWNER', () => {
      const url = authService.getRedirectUrlByRole(UserRole.CLUB_OWNER);
      expect(url).toBe('/club-dashboard');
    });

    it('should return correct URL for MEMBER', () => {
      const url = authService.getRedirectUrlByRole(UserRole.MEMBER);
      expect(url).toBe('/my-profile');
    });

    it('should return correct URL for PARENT', () => {
      const url = authService.getRedirectUrlByRole(UserRole.PARENT);
      expect(url).toBe('/my-profile');
    });
  });

  describe('canAccessRoute (permission)', () => {
    it('should allow SUPER_ADMIN to access admin routes', () => {
      const hasPermission = authService.canAccessRoute(UserRole.SUPER_ADMIN, '/admin');
      expect(hasPermission).toBe(true);
    });

    it('should allow CLUB_OWNER to access club-dashboard', () => {
      const hasPermission = authService.canAccessRoute(UserRole.CLUB_OWNER, '/club-dashboard');
      expect(hasPermission).toBe(true);
    });

    it('should NOT allow MEMBER access to admin routes', () => {
      const hasPermission = authService.canAccessRoute(UserRole.MEMBER, '/admin');
      expect(hasPermission).toBe(false);
    });

    it('should NOT allow PARENT access to club-dashboard', () => {
      const hasPermission = authService.canAccessRoute(UserRole.PARENT, '/club-dashboard');
      expect(hasPermission).toBe(false);
    });

    it('should allow all roles to access my-profile', () => {
      const roles = [
        UserRole.SUPER_ADMIN,
        UserRole.FEDERATION_ADMIN,
        UserRole.CLUB_OWNER,
        UserRole.MEMBER,
        UserRole.PARENT
      ];

      roles.forEach(role => {
        const allowed = authService.canAccessRoute(role, '/my-profile');
        expect(allowed).toBe(true);
      });
    });
  });

  describe('canAccessRoute', () => {
    it('should check if user can access specific route', () => {
      expect(authService.canAccessRoute(UserRole.SUPER_ADMIN, '/super-admin')).toBe(true);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/super-admin')).toBe(false);
    });
  });
});
