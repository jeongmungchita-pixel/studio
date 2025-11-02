import { describe, it, expect } from 'vitest';
import { ROUTES, ROUTE_GROUPS, getRouteWithParams, isValidRoute, getRouteGroup, routeUtils } from '../routes';

describe('ROUTES constants', () => {
  it('should define core routes', () => {
    expect(ROUTES.HOME).toBe('/');
    expect(ROUTES.LOGIN).toBe('/login');
    expect(ROUTES.DASHBOARD).toBe('/dashboard');
    expect(ROUTES.ADMIN.ROOT).toBe('/admin');
    expect(ROUTES.SUPER_ADMIN.ROOT).toBe('/super-admin');
    expect(ROUTES.CLUB_DASHBOARD.ROOT).toBe('/club-dashboard');
    expect(ROUTES.MY_PROFILE.ROOT).toBe('/my-profile');
  });

  it('should define dynamic route helpers', () => {
    expect(ROUTES.DYNAMIC.MEMBER_DETAIL('123')).toBe('/members/123');
    expect(ROUTES.DYNAMIC.CLUB_DETAIL('c1')).toBe('/clubs/c1');
    expect(ROUTES.DYNAMIC.COMPETITION_LIVE('cmp')).toBe('/competitions/cmp/live');
    expect(ROUTES.DYNAMIC.CLASS_DETAIL('cls')).toBe('/club-dashboard/classes/cls');
  });
});

describe('getRouteWithParams', () => {
  it('should replace bracket params with provided values', () => {
    const route = '/clubs/[id]/classes/[classId]';
    const result = getRouteWithParams(route, { id: 'c1', classId: 'k10' });
    expect(result).toBe('/clubs/c1/classes/k10');
  });

  it('should keep placeholders if not provided', () => {
    const route = '/members/[id]/notes/[noteId]';
    const result = getRouteWithParams(route, { id: 'm100' });
    expect(result).toBe('/members/m100/notes/[noteId]');
  });
});

describe('isValidRoute', () => {
  it('should return true for exact matches', () => {
    expect(isValidRoute('/')).toBe(true);
    expect(isValidRoute('/login')).toBe(true);
    expect(isValidRoute('/club-dashboard')).toBe(true);
  });

  it('should return false for arbitrary dynamic-looking paths not listed in ROUTES', () => {
    // Since ROUTES does not include bracketed patterns, unknown subpaths are invalid
    expect(isValidRoute('/club-dashboard/classes/abc')).toBe(false);
    expect(isValidRoute('/competitions/comp123/live')).toBe(false);
  });

  it('should return false for unknown routes', () => {
    expect(isValidRoute('/unknown/path')).toBe(false);
    expect(isValidRoute('/adminx')).toBe(false);
  });
});

describe('getRouteGroup (legacy util)', () => {
  it('should map path to group name', () => {
    expect(getRouteGroup('/admin')).toBe('ADMIN');
    expect(getRouteGroup('/club-dashboard/settings')).toBe('CLUB_DASHBOARD');
    expect(getRouteGroup('/dashboard')).toBe('DASHBOARD');
    expect(getRouteGroup('/login')).toBe('AUTH');
    expect(getRouteGroup('/register')).toBe('AUTH');
    expect(getRouteGroup('/something-else')).toBeNull();
  });
});

describe('routeUtils', () => {
  it('should identify admin routes', () => {
    expect(routeUtils.isAdminRoute('/admin')).toBe(true);
    expect(routeUtils.isAdminRoute('/admin/users')).toBe(true);
    expect(routeUtils.isAdminRoute('/not-admin')).toBe(false);
  });

  it('should identify club dashboard routes', () => {
    expect(routeUtils.isClubDashboardRoute('/club-dashboard')).toBe(true);
    expect(routeUtils.isClubDashboardRoute('/club-dashboard/classes/123')).toBe(true);
    expect(routeUtils.isClubDashboardRoute('/clubs')).toBe(false);
  });

  it('should identify public routes', () => {
    expect(routeUtils.isPublicRoute('/')).toBe(true);
    expect(routeUtils.isPublicRoute('/invite/accept')).toBe(true);
    expect(routeUtils.isPublicRoute('/setup/initial-admin')).toBe(true);
    expect(routeUtils.isPublicRoute('/private')).toBe(false);
  });

  it('should identify protected routes', () => {
    expect(routeUtils.isProtectedRoute('/dashboard')).toBe(true);
    expect(routeUtils.isProtectedRoute('/my-profile/family')).toBe(true);
    expect(routeUtils.isProtectedRoute('/events')).toBe(true);
    expect(routeUtils.isProtectedRoute('/login')).toBe(false);
  });

  it('should return route group via routeUtils', () => {
    expect(routeUtils.getRouteGroup('/admin/users')).toBe('admin');
    expect(routeUtils.getRouteGroup('/club-dashboard/classes')).toBe('club-dashboard');
    expect(routeUtils.getRouteGroup('/')).toBe('public');
    expect(routeUtils.getRouteGroup('/dashboard')).toBe('protected');
    expect(routeUtils.getRouteGroup('/no-match')).toBeNull();
  });
});

describe('ROUTE_GROUPS integrity', () => {
  it('should contain arrays of routes', () => {
    expect(Array.isArray(ROUTE_GROUPS.ADMIN)).toBe(true);
    expect(Array.isArray(ROUTE_GROUPS.CLUB_DASHBOARD)).toBe(true);
    expect(Array.isArray(ROUTE_GROUPS.PUBLIC)).toBe(true);
    expect(Array.isArray(ROUTE_GROUPS.PROTECTED)).toBe(true);
  });
});
