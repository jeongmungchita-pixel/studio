import { describe, it, expect } from 'vitest';
import { EnhancedRBAC, Permission, ResourceType } from '../rbac-enhanced';
import { UserRole } from '@/types/auth';

function ctx(overrides: Partial<Parameters<typeof EnhancedRBAC.hasContextualPermission>[0]> = {}) {
  return {
    userId: 'u1',
    userRole: UserRole.CLUB_MANAGER,
    clubId: 'c1',
    resourceOwnerId: 'u2',
    resourceClubId: 'c1',
    isPublicResource: false,
    ...overrides,
  } as any;
}

describe('RBAC Enhanced', () => {
  it('hasPermission basic matrix', () => {
    expect(EnhancedRBAC.hasPermission(UserRole.SUPER_ADMIN, Permission.USER_READ)).toBe(true);
    expect(EnhancedRBAC.hasPermission(UserRole.MEMBER, Permission.SYSTEM_DELETE)).toBe(false);
  });

  it('hasAnyPermission and hasAllPermissions', () => {
    expect(EnhancedRBAC.hasAnyPermission(UserRole.CLUB_MANAGER, [Permission.CLUB_READ, Permission.SYSTEM_DELETE])).toBe(true);
    expect(EnhancedRBAC.hasAllPermissions(UserRole.CLUB_MANAGER, [Permission.CLUB_READ, Permission.SYSTEM_DELETE])).toBe(false);
  });

  it('contextual: user resource own record allowed for read/update', () => {
    const c = ctx({ userId: 'me', resourceOwnerId: 'me' });
    expect(EnhancedRBAC.hasContextualPermission(c, Permission.USER_READ, ResourceType.USER)).toBe(true);
    expect(EnhancedRBAC.hasContextualPermission(c, Permission.USER_UPDATE, ResourceType.USER)).toBe(true);
    // but not delete
    expect(EnhancedRBAC.hasContextualPermission(c, Permission.USER_DELETE, ResourceType.USER)).toBe(false);
  });

  it('contextual: super admin bypasses checks; federation admin limited per matrix', () => {
    const c1 = ctx({ userRole: UserRole.SUPER_ADMIN });
    expect(EnhancedRBAC.hasContextualPermission(c1, Permission.USER_DELETE, ResourceType.USER)).toBe(true);
    const c2 = ctx({ userRole: UserRole.FEDERATION_ADMIN });
    // FEDERATION_ADMIN does not include USER_DELETE in matrix
    expect(EnhancedRBAC.hasContextualPermission(c2, Permission.USER_DELETE, ResourceType.USER)).toBe(false);
  });

  it('contextual: club owner/manager restricted to same club', () => {
    const sameClub = ctx({ userRole: UserRole.CLUB_OWNER, clubId: 'c1', resourceClubId: 'c1' });
    const otherClub = ctx({ userRole: UserRole.CLUB_OWNER, clubId: 'c1', resourceClubId: 'c2' });
    expect(EnhancedRBAC.hasContextualPermission(sameClub, Permission.USER_UPDATE_STATUS, ResourceType.USER)).toBe(true);
    expect(EnhancedRBAC.hasContextualPermission(otherClub, Permission.USER_UPDATE_STATUS, ResourceType.USER)).toBe(false);
  });

  it('contextual: club resource read allowed for admin or same-club; different club denied for club roles', () => {
    const admin = ctx({ userRole: UserRole.SUPER_ADMIN, resourceClubId: 'cX' });
    const same = ctx({ userRole: UserRole.MEMBER, clubId: 'c1', resourceClubId: 'c1' });
    const diff = ctx({ userRole: UserRole.MEMBER, clubId: 'c1', resourceClubId: 'c2' });
    expect(EnhancedRBAC.hasContextualPermission(admin, Permission.CLUB_UPDATE, ResourceType.CLUB)).toBe(true);
    expect(EnhancedRBAC.hasContextualPermission(same, Permission.CLUB_READ, ResourceType.CLUB)).toBe(true);
    // For club roles, different club should be denied
    expect(EnhancedRBAC.hasContextualPermission(diff, Permission.CLUB_READ, ResourceType.CLUB)).toBe(false);
  });

  it('contextual: event read allowed if public, otherwise same club', () => {
    const publicEvt = ctx({ isPublicResource: true, resourceClubId: undefined });
    const privateSame = ctx({ isPublicResource: false, resourceClubId: 'c1' });
    const privateOther = ctx({ isPublicResource: false, resourceClubId: 'c2' });
    expect(EnhancedRBAC.hasContextualPermission(publicEvt, Permission.EVENT_READ, ResourceType.EVENT)).toBe(true);
    expect(EnhancedRBAC.hasContextualPermission(privateSame, Permission.EVENT_READ, ResourceType.EVENT)).toBe(true);
    expect(EnhancedRBAC.hasContextualPermission(privateOther, Permission.EVENT_READ, ResourceType.EVENT)).toBe(false);
  });

  it('contextual: finance access restricted by role and same-club logic', () => {
    const superAdmin = ctx({ userRole: UserRole.SUPER_ADMIN, resourceClubId: 'c2' });
    const fedAdmin = ctx({ userRole: UserRole.FEDERATION_ADMIN, resourceClubId: 'c2' });
    const ownerSame = ctx({ userRole: UserRole.CLUB_OWNER, clubId: 'c1', resourceClubId: 'c1' });
    const managerReadSame = ctx({ userRole: UserRole.CLUB_MANAGER, clubId: 'c1', resourceClubId: 'c1' });
    const managerUpdate = ctx({ userRole: UserRole.CLUB_MANAGER, clubId: 'c1', resourceClubId: 'c1' });
    expect(EnhancedRBAC.hasContextualPermission(superAdmin, Permission.FINANCE_DELETE, ResourceType.FINANCE)).toBe(true);
    expect(EnhancedRBAC.hasContextualPermission(fedAdmin, Permission.FINANCE_READ, ResourceType.FINANCE)).toBe(true);
    expect(EnhancedRBAC.hasContextualPermission(fedAdmin, Permission.FINANCE_UPDATE, ResourceType.FINANCE)).toBe(false);
    expect(EnhancedRBAC.hasContextualPermission(ownerSame, Permission.FINANCE_UPDATE, ResourceType.FINANCE)).toBe(true);
    expect(EnhancedRBAC.hasContextualPermission(managerReadSame, Permission.FINANCE_READ, ResourceType.FINANCE)).toBe(true);
    expect(EnhancedRBAC.hasContextualPermission(managerUpdate, Permission.FINANCE_UPDATE, ResourceType.FINANCE)).toBe(false);
  });

  it('requirePermission throws when insufficient', () => {
    const c = ctx({ userRole: UserRole.MEMBER, resourceClubId: 'c2' });
    expect(() => EnhancedRBAC.requirePermission(c, Permission.FINANCE_UPDATE, ResourceType.FINANCE)).toThrow();
  });

  it('role hierarchy and change role constraints', () => {
    expect(EnhancedRBAC.isHigherRole(UserRole.SUPER_ADMIN, UserRole.CLUB_MANAGER)).toBe(true);
    expect(EnhancedRBAC.isHigherRole(UserRole.CLUB_MANAGER, UserRole.SUPER_ADMIN)).toBe(false);
    // canChangeRole: current must be higher than both current and new
    expect(EnhancedRBAC.canChangeRole(UserRole.SUPER_ADMIN, UserRole.CLUB_MANAGER, UserRole.CLUB_STAFF)).toBe(true);
    expect(EnhancedRBAC.canChangeRole(UserRole.CLUB_MANAGER, UserRole.SUPER_ADMIN, UserRole.CLUB_OWNER)).toBe(false);
    // cannot promote to equal or higher role
    expect(EnhancedRBAC.canChangeRole(UserRole.FEDERATION_ADMIN, UserRole.CLUB_MANAGER, UserRole.FEDERATION_ADMIN)).toBe(false);
  });

  it('getAccessibleResources and getPermissionMatrix return stable structures', () => {
    const perms = EnhancedRBAC.getAccessibleResources(UserRole.CLUB_MANAGER, ResourceType.CLUB);
    expect(Array.isArray(perms)).toBe(true);
    const matrix = EnhancedRBAC.getPermissionMatrix();
    expect(matrix[UserRole.SUPER_ADMIN]).toBeDefined();
  });
});
