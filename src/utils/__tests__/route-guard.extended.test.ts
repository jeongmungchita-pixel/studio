import { describe, it, expect } from 'vitest';
import { canAccessRoute, isPublicRoute, getDefaultRoute } from '../route-guard';
import { UserRole } from '@/types/auth';

describe('route-guard (extended)', () => {
  describe('public route edge cases', () => {
    it('prefix wildcard also matches sibling-like paths (current implementation)', () => {
      // matchRoute uses startsWith for patterns ending with /*, so these are treated as public
      expect(isPublicRoute('/logins')).toBe(false);
      expect(isPublicRoute('/registerx')).toBe(true);
      expect(isPublicRoute('/invitex/abc')).toBe(true);
    });

    it('supports nested wildcard segments for public routes', () => {
      expect(isPublicRoute('/register/family/child')).toBe(true);
      expect(isPublicRoute('/invite/abc/extra')).toBe(true);
    });
  });

  describe('role route edge cases', () => {
    it('denies unknown role or missing mapping', () => {
      expect(canAccessRoute('/admin', undefined, 'active')).toBe(false);
      expect(canAccessRoute('/admin', 'UNKNOWN' as any, 'active')).toBe(false);
    });

    it('wildcard allows deeper nesting for allowed routes', () => {
      expect(canAccessRoute('/admin/settings/advanced', UserRole.FEDERATION_ADMIN, 'active')).toBe(true);
      expect(canAccessRoute('/club-dashboard/classes/level/a/b/c', UserRole.CLUB_OWNER, 'active')).toBe(true);
    });

    it('denies routes not present in the allowed patterns', () => {
      expect(canAccessRoute('/super-admin', UserRole.FEDERATION_ADMIN, 'active')).toBe(false);
      expect(canAccessRoute('/admin', UserRole.MEMBER, 'active')).toBe(false);
    });
  });

  describe('pending users', () => {
    it('restricts strictly to pendingUserRoutes when status is pending', () => {
      expect(canAccessRoute('/pending-approval', UserRole.PARENT, 'pending')).toBe(true);
      expect(canAccessRoute('/profile-setup', UserRole.PARENT, 'pending')).toBe(true);
      expect(canAccessRoute('/my-profile', UserRole.PARENT, 'pending')).toBe(false);
      expect(canAccessRoute('/events', UserRole.PARENT, 'pending')).toBe(false);
    });
  });

  describe('getDefaultRoute edge cases', () => {
    it('returns /login for unknown role when not pending', () => {
      expect(getDefaultRoute('UNKNOWN' as any, 'active')).toBe('/login');
    });
  });
});
