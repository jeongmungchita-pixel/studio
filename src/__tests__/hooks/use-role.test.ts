import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRole } from '@/hooks/use-role';
import { UserRole } from '@/types/auth';

// Mock useUser hook
vi.mock('@/firebase', () => ({
  useUser: vi.fn()
}));

describe('useRole Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Role Checks', () => {
    it('should identify SUPER_ADMIN correctly', () => {
      const { useUser } = require('@/firebase');
      useUser.mockReturnValue({
        user: { role: UserRole.SUPER_ADMIN },
        isUserLoading: false
      });

      const { result } = renderHook(() => useRole());

      expect(result.current.userRole).toBe(UserRole.SUPER_ADMIN);
      expect(result.current.isSuperAdmin).toBe(true);
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.canManageClub).toBe(true);
    });

    it('should identify CLUB_OWNER correctly', () => {
      const { useUser } = require('@/firebase');
      useUser.mockReturnValue({
        user: { role: UserRole.CLUB_OWNER },
        isUserLoading: false
      });

      const { result } = renderHook(() => useRole());

      expect(result.current.userRole).toBe(UserRole.CLUB_OWNER);
      expect(result.current.isClubOwner).toBe(true);
      expect(result.current.canManageClub).toBe(true);
      expect(result.current.isAdmin).toBe(false);
    });

    it('should identify MEMBER correctly', () => {
      const { useUser } = require('@/firebase');
      useUser.mockReturnValue({
        user: { role: UserRole.MEMBER },
        isUserLoading: false
      });

      const { result } = renderHook(() => useRole());

      expect(result.current.userRole).toBe(UserRole.MEMBER);
      expect(result.current.isMember).toBe(true);
      expect(result.current.canManageClub).toBe(false);
      expect(result.current.isAdmin).toBe(false);
    });
  });

  describe('Permission Checks', () => {
    it('should allow SUPER_ADMIN to manage all roles', () => {
      const { useUser } = require('@/firebase');
      useUser.mockReturnValue({
        user: { role: UserRole.SUPER_ADMIN },
        isUserLoading: false
      });

      const { result } = renderHook(() => useRole());

      expect(result.current.canManage(UserRole.FEDERATION_ADMIN)).toBe(true);
      expect(result.current.canManage(UserRole.CLUB_OWNER)).toBe(true);
      expect(result.current.canManage(UserRole.MEMBER)).toBe(true);
    });

    it('should allow CLUB_OWNER to manage members only', () => {
      const { useUser } = require('@/firebase');
      useUser.mockReturnValue({
        user: { role: UserRole.CLUB_OWNER },
        isUserLoading: false
      });

      const { result } = renderHook(() => useRole());

      expect(result.current.canManage(UserRole.MEMBER)).toBe(true);
      expect(result.current.canManage(UserRole.PARENT)).toBe(true);
      expect(result.current.canManage(UserRole.CLUB_OWNER)).toBe(false);
      expect(result.current.canManage(UserRole.FEDERATION_ADMIN)).toBe(false);
    });

    it('should not allow MEMBER to manage anyone', () => {
      const { useUser } = require('@/firebase');
      useUser.mockReturnValue({
        user: { role: UserRole.MEMBER },
        isUserLoading: false
      });

      const { result } = renderHook(() => useRole());

      expect(result.current.canManage(UserRole.MEMBER)).toBe(false);
      expect(result.current.canManage(UserRole.PARENT)).toBe(false);
    });
  });

  describe('Role Hierarchy', () => {
    it('should return correct hierarchy level', () => {
      const { useUser } = require('@/firebase');
      
      // Test SUPER_ADMIN
      useUser.mockReturnValue({
        user: { role: UserRole.SUPER_ADMIN },
        isUserLoading: false
      });
      let { result } = renderHook(() => useRole());
      expect(result.current.level).toBe(100);

      // Test CLUB_OWNER
      useUser.mockReturnValue({
        user: { role: UserRole.CLUB_OWNER },
        isUserLoading: false
      });
      ({ result } = renderHook(() => useRole()));
      expect(result.current.level).toBe(50);

      // Test MEMBER
      useUser.mockReturnValue({
        user: { role: UserRole.MEMBER },
        isUserLoading: false
      });
      ({ result } = renderHook(() => useRole()));
      expect(result.current.level).toBe(20);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined user', () => {
      const { useUser } = require('@/firebase');
      useUser.mockReturnValue({
        user: null,
        isUserLoading: false
      });

      const { result } = renderHook(() => useRole());

      expect(result.current.userRole).toBeUndefined();
      expect(result.current.level).toBe(0);
      expect(result.current.isSuperAdmin).toBe(false);
      expect(result.current.canManageClub).toBe(false);
    });

    it('should handle loading state', () => {
      const { useUser } = require('@/firebase');
      useUser.mockReturnValue({
        user: null,
        isUserLoading: true
      });

      const { result } = renderHook(() => useRole());

      expect(result.current.userRole).toBeUndefined();
      expect(result.current.level).toBe(0);
    });
  });
});
