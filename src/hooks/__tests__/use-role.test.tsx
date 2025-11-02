import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRole } from '../use-role';
import { UserRole } from '@/types/auth';

vi.mock('@/firebase', () => ({
  useUser: vi.fn(),
}));

import { useUser } from '@/firebase';

describe('useRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeUser = (role?: UserRole) => ({ _user: role ? {
    uid: 'u',
    email: 'a@b.com',
    displayName: 'A',
    role,
    provider: 'email',
    status: 'active',
    createdAt: new Date().toISOString(),
  } : null });

  it('should expose role flags for SUPER_ADMIN', async () => {
    (useUser as any).mockReturnValue(makeUser(UserRole.SUPER_ADMIN));
    const { result } = renderHook(() => useRole());
    expect(result.current.isSuperAdmin).toBe(true);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current._hasRole(UserRole.FEDERATION_ADMIN)).toBe(true);
    expect(result.current.level).toBeGreaterThan(0);
  });

  it('should compute club permissions for CLUB_MANAGER', () => {
    (useUser as any).mockReturnValue(makeUser(UserRole.CLUB_MANAGER));
    const { result } = renderHook(() => useRole());
    expect(result.current.isClubManager).toBe(true);
    expect(result.current.canManageClub).toBe(true);
    expect(result.current.isHigherThan(UserRole.MEMBER)).toBe(true);
    expect(result.current.canManage(UserRole.MEMBER)).toBe(true);
    expect(result.current.canManage(UserRole.FEDERATION_ADMIN)).toBe(false);
  });

  it('should be minimal for MEMBER', () => {
    (useUser as any).mockReturnValue(makeUser(UserRole.MEMBER));
    const { result } = renderHook(() => useRole());
    expect(result.current.isMember).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current._hasRole(UserRole.MEMBER)).toBe(true);
    expect(result.current._hasRole(UserRole.CLUB_MANAGER)).toBe(false);
  });

  it('should handle no user', () => {
    (useUser as any).mockReturnValue(makeUser(undefined));
    const { result } = renderHook(() => useRole());
    expect(result.current.userRole).toBeUndefined();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current._hasRole(UserRole.MEMBER)).toBe(false);
    expect(result.current.level).toBe(0);
  });
});
