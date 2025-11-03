import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRole } from '../use-role';
import { UserRole } from '@/types/auth';

// Mock useUser hook
const mockUseUser = vi.fn();
vi.mock('@/firebase', () => ({
  useUser: () => mockUseUser(),
}));

describe('useRole Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic role functionality', () => {
    it('should return undefined role when user is null', () => {
      mockUseUser.mockReturnValue({ _user: null, isUserLoading: false });
      
      const { result } = renderHook(() => useRole());
      
      expect(result.current.userRole).toBeUndefined();
      expect(result.current.level).toBe(0);
    });

    it('should return correct role and level for member', () => {
      mockUseUser.mockReturnValue({ 
        _user: { role: UserRole.MEMBER }, 
        isUserLoading: false 
      });
      
      const { result } = renderHook(() => useRole());
      
      expect(result.current.userRole).toBe(UserRole.MEMBER);
      expect(result.current.level).toBe(20);
    });

    it('should return correct role and level for federation admin', () => {
      mockUseUser.mockReturnValue({ 
        _user: { role: UserRole.FEDERATION_ADMIN }, 
        isUserLoading: false 
      });
      
      const { result } = renderHook(() => useRole());
      
      expect(result.current.userRole).toBe(UserRole.FEDERATION_ADMIN);
      expect(result.current.level).toBe(90);
    });
  });

  describe('Role checking functions', () => {
    it('should correctly check if user has equal or higher role', () => {
      mockUseUser.mockReturnValue({ 
        _user: { role: UserRole.CLUB_OWNER }, 
        isUserLoading: false 
      });
      
      const { result } = renderHook(() => useRole());
      
      // Club owner should have equal or higher role than member
      expect(result.current._hasRole(UserRole.MEMBER)).toBe(true);
      expect(result.current._hasRole(UserRole.CLUB_OWNER)).toBe(true);
      // Club owner should not have equal or higher role than federation admin
      expect(result.current._hasRole(UserRole.FEDERATION_ADMIN)).toBe(false);
    });

    it('should correctly check if user has higher role', () => {
      mockUseUser.mockReturnValue({ 
        _user: { role: UserRole.HEAD_COACH }, 
        isUserLoading: false 
      });
      
      const { result } = renderHook(() => useRole());
      
      // Head coach should have higher role than member
      expect(result.current.isHigherThan(UserRole.MEMBER)).toBe(true);
      // Head coach should not have higher role than another head coach
      expect(result.current.isHigherThan(UserRole.HEAD_COACH)).toBe(false);
    });

    it('should correctly check if user can manage target role', () => {
      mockUseUser.mockReturnValue({ 
        _user: { role: UserRole.CLUB_MANAGER }, 
        isUserLoading: false 
      });
      
      const { result } = renderHook(() => useRole());
      
      // Club manager can manage members and assistant coaches
      expect(result.current.canManage(UserRole.MEMBER)).toBe(true);
      expect(result.current.canManage(UserRole.ASSISTANT_COACH)).toBe(true);
      // Club manager cannot manage other club managers or owners
      expect(result.current.canManage(UserRole.CLUB_MANAGER)).toBe(false);
      expect(result.current.canManage(UserRole.CLUB_OWNER)).toBe(false);
    });
  });

  describe('Convenience properties', () => {
    it('should correctly identify super admin', () => {
      mockUseUser.mockReturnValue({ 
        _user: { role: UserRole.SUPER_ADMIN }, 
        isUserLoading: false 
      });
      
      const { result } = renderHook(() => useRole());
      
      expect(result.current.isSuperAdmin).toBe(true);
      expect(result.current.isFederationAdmin).toBe(false);
      expect(result.current.isClubOwner).toBe(false);
    });

    it('should correctly identify federation admin', () => {
      mockUseUser.mockReturnValue({ 
        _user: { role: UserRole.FEDERATION_ADMIN }, 
        isUserLoading: false 
      });
      
      const { result } = renderHook(() => useRole());
      
      expect(result.current.isSuperAdmin).toBe(false);
      expect(result.current.isFederationAdmin).toBe(true);
      expect(result.current.isClubOwner).toBe(false);
      expect(result.current.isAdmin).toBe(true);
    });

    it('should correctly identify coach roles', () => {
      mockUseUser.mockReturnValue({ 
        _user: { role: UserRole.HEAD_COACH }, 
        isUserLoading: false 
      });
      
      const { result } = renderHook(() => useRole());
      
      expect(result.current.isCoach).toBe(true);
      expect(result.current.isMember).toBe(false);
      
      // Test assistant coach
      mockUseUser.mockReturnValue({ 
        _user: { role: UserRole.ASSISTANT_COACH }, 
        isUserLoading: false 
      });
      
      const { result: result2 } = renderHook(() => useRole());
      
      expect(result2.current.isCoach).toBe(true);
    });

    it('should correctly identify club management permissions', () => {
      mockUseUser.mockReturnValue({ 
        _user: { role: UserRole.CLUB_MANAGER }, 
        isUserLoading: false 
      });
      
      const { result } = renderHook(() => useRole());
      
      expect(result.current.canManageClub).toBe(true);
      expect(result.current.isClubOwner).toBe(false);
      expect(result.current.isClubManager).toBe(true);
    });

    it('should correctly identify committee roles', () => {
      mockUseUser.mockReturnValue({ 
        _user: { role: UserRole.COMMITTEE_MEMBER }, 
        isUserLoading: false 
      });
      
      const { result } = renderHook(() => useRole());
      
      expect(result.current.isCommitteeMember).toBe(true);
      expect(result.current.isCommitteeChair).toBe(false);
      
      // Test committee chair
      mockUseUser.mockReturnValue({ 
        _user: { role: UserRole.COMMITTEE_CHAIR }, 
        isUserLoading: false 
      });
      
      const { result: result2 } = renderHook(() => useRole());
      
      expect(result2.current.isCommitteeMember).toBe(true);
      expect(result2.current.isCommitteeChair).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle all role types without errors', () => {
      const allRoles = [
        UserRole.SUPER_ADMIN,
        UserRole.FEDERATION_ADMIN,
        UserRole.COMMITTEE_CHAIR,
        UserRole.COMMITTEE_MEMBER,
        UserRole.CLUB_OWNER,
        UserRole.CLUB_MANAGER,
        UserRole.HEAD_COACH,
        UserRole.ASSISTANT_COACH,
        UserRole.MEMBER,
        UserRole.PARENT,
      ];

      allRoles.forEach(role => {
        mockUseUser.mockReturnValue({ 
          _user: { role }, 
          isUserLoading: false 
        });
        
        const { result } = renderHook(() => useRole());
        
        expect(result.current.userRole).toBe(role);
        expect(typeof result.current.level).toBe('number');
        expect(typeof result.current._hasRole).toBe('function');
        expect(typeof result.current.canManage).toBe('function');
      });
    });

    it('should return false for all role checks when user has no role', () => {
      mockUseUser.mockReturnValue({ 
        _user: { }, 
        isUserLoading: false 
      });
      
      const { result } = renderHook(() => useRole());
      
      expect(result.current._hasRole(UserRole.MEMBER)).toBe(false);
      expect(result.current.isHigherThan(UserRole.MEMBER)).toBe(false);
      expect(result.current.canManage(UserRole.MEMBER)).toBe(false);
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isCoach).toBe(false);
    });
  });
});
