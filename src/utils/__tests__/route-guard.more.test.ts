import { describe, it, expect } from 'vitest';
import { canAccessRoute, isPublicRoute, getDefaultRoute, routeConfig } from '../route-guard';
import { UserRole } from '@/types/auth';

describe('route-guard.more', () => {
  it('public routes should allow access without role', () => {
    expect(isPublicRoute('/login')).toBe(true);
    expect(canAccessRoute('/login')).toBe(true);
  });

  it('wildcard public routes should match nested paths', () => {
    expect(isPublicRoute('/register/adult')).toBe(true);
    expect(isPublicRoute('/invite/abcd')).toBe(true);
    expect(canAccessRoute('/register/family')).toBe(true);
  });

  it('denies when no role and route is protected', () => {
    expect(canAccessRoute('/admin')).toBe(false);
    expect(canAccessRoute('/club-dashboard')).toBe(false);
  });

  it('pending users can only access pendingUserRoutes', () => {
    // access allowed
    for (const r of routeConfig.pendingUserRoutes) {
      expect(canAccessRoute(r, UserRole.MEMBER, 'pending')).toBe(true);
    }
    // access denied to protected route while pending
    expect(canAccessRoute('/my-profile', UserRole.MEMBER, 'pending')).toBe(false);
  });

  it('role-based allow/deny with wildcards', () => {
    // CLUB_OWNER can access club-dashboard child route
    expect(canAccessRoute('/club-dashboard/passes', UserRole.CLUB_OWNER, 'active')).toBe(true);
    // MEMBER should not access admin
    expect(canAccessRoute('/admin', UserRole.MEMBER, 'active')).toBe(false);
    // SUPER_ADMIN broad access including system
    expect(canAccessRoute('/system/health', UserRole.SUPER_ADMIN, 'active')).toBe(true);
  });

  it('getDefaultRoute should return correct path by role/status', () => {
    expect(getDefaultRoute(undefined, 'pending')).toBe('/pending-approval');
    expect(getDefaultRoute(UserRole.SUPER_ADMIN, 'active')).toBe('/super-admin');
    expect(getDefaultRoute(UserRole.FEDERATION_ADMIN, 'active')).toBe('/admin');
    expect(getDefaultRoute(UserRole.CLUB_OWNER, 'active')).toBe('/club-dashboard');
    expect(getDefaultRoute(UserRole.MEMBER, 'active')).toBe('/my-profile');
    expect(getDefaultRoute(undefined, 'active')).toBe('/login');
  });
});
