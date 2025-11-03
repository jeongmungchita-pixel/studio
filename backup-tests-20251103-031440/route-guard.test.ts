import { describe, it, expect } from 'vitest';
import { canAccessRoute, isPublicRoute, getDefaultRoute, routeConfig } from '../route-guard';
import { UserRole } from '@/types/auth';

describe('route-guard', () => {
  describe('isPublicRoute', () => {
    it('should allow public routes', () => {
      expect(isPublicRoute('/login')).toBe(true);
      expect(isPublicRoute('/register')).toBe(true);
      expect(isPublicRoute('/invite/accept')).toBe(true);
      expect(isPublicRoute('/setup/initial-admin')).toBe(true);
    });

    it('should support wildcard patterns for public routes', () => {
      expect(isPublicRoute('/register/adult')).toBe(true);
      expect(isPublicRoute('/invite/abc123')).toBe(true);
    });

    it('should deny non-public routes', () => {
      expect(isPublicRoute('/admin')).toBe(false);
      expect(isPublicRoute('/club-dashboard')).toBe(false);
    });
  });

  describe('canAccessRoute', () => {
    it('should deny when not authenticated for protected routes', () => {
      expect(canAccessRoute('/admin', undefined, undefined)).toBe(false);
    });

    it('should allow SUPER_ADMIN everywhere', () => {
      expect(canAccessRoute('/admin', UserRole.SUPER_ADMIN, 'active')).toBe(true);
      expect(canAccessRoute('/club-dashboard/classes', UserRole.SUPER_ADMIN, 'active')).toBe(true);
    });

    it('should allow MEMBER to access member-allowed routes', () => {
      expect(canAccessRoute('/my-profile', UserRole.MEMBER, 'active')).toBe(true);
      expect(canAccessRoute('/events/123', UserRole.MEMBER, 'active')).toBe(true);
      expect(canAccessRoute('/admin', UserRole.MEMBER, 'active')).toBe(false);
    });

    it('should allow FEDERATION_ADMIN to access admin routes', () => {
      expect(canAccessRoute('/admin/users', UserRole.FEDERATION_ADMIN, 'active')).toBe(true);
      expect(canAccessRoute('/super-admin', UserRole.FEDERATION_ADMIN, 'active')).toBe(false);
    });

    it('should respect wildcard patterns in roleRoutes', () => {
      expect(canAccessRoute('/club-dashboard/classes/abc', UserRole.CLUB_OWNER, 'active')).toBe(true);
      // ASSISTANT_COACH does not have access to attendance in routeConfig
      expect(canAccessRoute('/club-dashboard/attendance', UserRole.ASSISTANT_COACH, 'active')).toBe(false);
      expect(canAccessRoute('/admin/approvals', UserRole.CLUB_OWNER, 'active')).toBe(false);
    });

    it('should restrict pending users to pendingUserRoutes only', () => {
      expect(canAccessRoute('/pending-approval', UserRole.MEMBER, 'pending')).toBe(true);
      expect(canAccessRoute('/profile-setup', UserRole.MEMBER, 'pending')).toBe(true);
      expect(canAccessRoute('/my-profile', UserRole.MEMBER, 'pending')).toBe(false);
    });
  });

  describe('getDefaultRoute', () => {
    it('should return auth path for unauthenticated', () => {
      expect(getDefaultRoute(undefined, undefined)).toBe('/login');
    });

    it('should return pending approval route when status is pending', () => {
      expect(getDefaultRoute(UserRole.MEMBER, 'pending')).toBe('/pending-approval');
    });

    it('should map roles to default dashboards', () => {
      expect(getDefaultRoute(UserRole.SUPER_ADMIN, 'active')).toBe('/super-admin');
      expect(getDefaultRoute(UserRole.FEDERATION_ADMIN, 'active')).toBe('/admin');
      expect(getDefaultRoute(UserRole.COMMITTEE_MEMBER, 'active')).toBe('/committees');
      expect(getDefaultRoute(UserRole.CLUB_OWNER, 'active')).toBe('/club-dashboard');
      expect(getDefaultRoute(UserRole.MEMBER, 'active')).toBe('/my-profile');
      expect(getDefaultRoute(UserRole.VENDOR, 'active')).toBe('/my-profile');
    });
  });
});
