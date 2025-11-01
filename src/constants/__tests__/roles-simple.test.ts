import { describe, it, expect } from 'vitest';
import {
  ROLE_HIERARCHY,
  ROLE_LABELS,
  ROLE_COLORS,
  ROLE_GROUPS,
  PERMISSIONS,
  roleUtils,
  hasRoleOrHigher,
  hasPermission,
  canManageRole,
  getSuperiorRoles,
  getSubordinateRoles,
  getRoleLevel,
  isTopRole,
  isAdminRole,
  isClubRole
} from '../roles';
import { UserRole } from '@/types/auth';

describe('Roles Constants and Utilities', () => {
  describe('ROLE_HIERARCHY', () => {
    it('should have correct hierarchy values', () => {
      expect(ROLE_HIERARCHY[UserRole.SUPER_ADMIN]).toBe(100);
      expect(ROLE_HIERARCHY[UserRole.FEDERATION_ADMIN]).toBe(90);
      expect(ROLE_HIERARCHY[UserRole.CLUB_OWNER]).toBe(50);
      expect(ROLE_HIERARCHY[UserRole.MEMBER]).toBe(10);
    });

    it('should have higher values for higher authority', () => {
      expect(ROLE_HIERARCHY[UserRole.SUPER_ADMIN]).toBeGreaterThan(ROLE_HIERARCHY[UserRole.MEMBER]);
    });
  });

  describe('ROLE_LABELS', () => {
    it('should have labels for all roles', () => {
      expect(ROLE_LABELS[UserRole.SUPER_ADMIN]).toBe('최고 관리자');
      expect(ROLE_LABELS[UserRole.MEMBER]).toBe('회원');
      expect(typeof ROLE_LABELS[UserRole.CLUB_OWNER]).toBe('string');
    });
  });

  describe('ROLE_COLORS', () => {
    it('should have color values for all roles', () => {
      expect(ROLE_COLORS[UserRole.SUPER_ADMIN]).toBeDefined();
      expect(typeof ROLE_COLORS[UserRole.SUPER_ADMIN]).toBe('string');
      expect(ROLE_COLORS[UserRole.MEMBER]).toBeDefined();
    });
  });

  describe('ROLE_GROUPS', () => {
    it('should have admin group', () => {
      expect(ROLE_GROUPS.ADMIN).toBeDefined();
      expect(Array.isArray(ROLE_GROUPS.ADMIN)).toBe(true);
    });

    it('should have club management group', () => {
      expect(ROLE_GROUPS.CLUB_MANAGEMENT).toBeDefined();
      expect(Array.isArray(ROLE_GROUPS.CLUB_MANAGEMENT)).toBe(true);
    });
  });

  describe('PERMISSIONS', () => {
    it('should have manage clubs permission', () => {
      expect(PERMISSIONS.MANAGE_CLUBS).toBeDefined();
      expect(Array.isArray(PERMISSIONS.MANAGE_CLUBS)).toBe(true);
    });

    it('should have manage members permission', () => {
      expect(PERMISSIONS.MANAGE_ALL_MEMBERS).toBeDefined();
      expect(Array.isArray(PERMISSIONS.MANAGE_ALL_MEMBERS)).toBe(true);
    });
  });

  describe('hasRoleOrHigher', () => {
    it('should return true for higher or equal role', () => {
      expect(hasRoleOrHigher(UserRole.SUPER_ADMIN, UserRole.MEMBER)).toBe(true);
      expect(hasRoleOrHigher(UserRole.MEMBER, UserRole.MEMBER)).toBe(true);
    });

    it('should return false for lower role', () => {
      expect(hasRoleOrHigher(UserRole.MEMBER, UserRole.SUPER_ADMIN)).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should check if role is in permission array', () => {
      const adminRoles = [UserRole.SUPER_ADMIN, UserRole.FEDERATION_ADMIN];
      expect(hasPermission(UserRole.SUPER_ADMIN, adminRoles)).toBe(true);
      expect(hasPermission(UserRole.MEMBER, adminRoles)).toBe(false);
    });
  });

  describe('canManageRole', () => {
    it('should return true if manager has higher role', () => {
      expect(canManageRole(UserRole.SUPER_ADMIN, UserRole.MEMBER)).toBe(true);
    });

    it('should return false for same or lower role', () => {
      expect(canManageRole(UserRole.MEMBER, UserRole.SUPER_ADMIN)).toBe(false);
      expect(canManageRole(UserRole.MEMBER, UserRole.MEMBER)).toBe(false);
    });
  });

  describe('getSuperiorRoles', () => {
    it('should return roles with higher hierarchy', () => {
      const superiors = getSuperiorRoles(UserRole.MEMBER);
      expect(superiors).toContain(UserRole.SUPER_ADMIN);
      expect(superiors).not.toContain(UserRole.MEMBER);
    });
  });

  describe('getSubordinateRoles', () => {
    it('should return roles with lower hierarchy', () => {
      const subordinates = getSubordinateRoles(UserRole.SUPER_ADMIN);
      expect(subordinates).toContain(UserRole.MEMBER);
      expect(subordinates).not.toContain(UserRole.SUPER_ADMIN);
    });
  });

  describe('getRoleLevel', () => {
    it('should return correct hierarchy level', () => {
      expect(getRoleLevel(UserRole.SUPER_ADMIN)).toBe(100);
      expect(getRoleLevel(UserRole.MEMBER)).toBe(10);
    });
  });

  describe('isTopRole', () => {
    it('should identify top role', () => {
      expect(isTopRole(UserRole.SUPER_ADMIN)).toBe(true);
      expect(isTopRole(UserRole.MEMBER)).toBe(false);
    });
  });

  describe('isAdminRole', () => {
    it('should identify admin roles', () => {
      expect(isAdminRole(UserRole.SUPER_ADMIN)).toBe(true);
      expect(isAdminRole(UserRole.FEDERATION_ADMIN)).toBe(true);
      expect(isAdminRole(UserRole.MEMBER)).toBe(false);
    });
  });

  describe('isClubRole', () => {
    it('should identify club roles', () => {
      expect(isClubRole(UserRole.CLUB_OWNER)).toBe(true);
      expect(isClubRole(UserRole.CLUB_MANAGER)).toBe(true);
      expect(isClubRole(UserRole.HEAD_COACH)).toBe(true);
      expect(isClubRole(UserRole.SUPER_ADMIN)).toBe(false);
    });
  });

  describe('roleUtils', () => {
    it('should have hasPermission method', () => {
      expect(typeof roleUtils.hasPermission).toBe('function');
    });

    it('should check permissions correctly', () => {
      const hasManageClubs = roleUtils.hasPermission(UserRole.SUPER_ADMIN, 'MANAGE_CLUBS');
      expect(typeof hasManageClubs).toBe('boolean');
    });
  });
});
