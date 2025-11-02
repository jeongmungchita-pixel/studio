import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRole } from '../use-role';
import { UserRole } from '@/types/auth';

vi.mock('@/firebase', () => ({
  useUser: vi.fn(),
}));

import { useUser } from '@/firebase';

const makeUser = (role?: UserRole, extra?: Record<string, any>) => ({ _user: role ? {
  uid: 'u', email: 'a@b.com', displayName: 'A', role, provider: 'email', status: 'active', createdAt: new Date().toISOString(), ...extra,
} : null });

describe('useRole (more)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FEDERATION_ADMIN has admin privileges and higher than CLUB_OWNER', () => {
    (useUser as any).mockReturnValue(makeUser(UserRole.FEDERATION_ADMIN));
    const { result } = renderHook(() => useRole());
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isHigherThan(UserRole.CLUB_OWNER)).toBe(true);
    expect(result.current._hasRole(UserRole.FEDERATION_ADMIN)).toBe(true);
  });

  it('CLUB_OWNER manage permissions boundaries', () => {
    (useUser as any).mockReturnValue(makeUser(UserRole.CLUB_OWNER));
    const { result } = renderHook(() => useRole());
    expect(result.current.canManage(UserRole.MEMBER)).toBe(true);
    // cannot manage federation admin
    expect(result.current.canManage(UserRole.FEDERATION_ADMIN)).toBe(false);
    // higher than MEMBER but not higher than FEDERATION_ADMIN
    expect(result.current.isHigherThan(UserRole.MEMBER)).toBe(true);
    expect(result.current.isHigherThan(UserRole.FEDERATION_ADMIN)).toBe(false);
  });

  it('HEAD_COACH isCoach and can manage MEMBER only', () => {
    (useUser as any).mockReturnValue(makeUser(UserRole.HEAD_COACH));
    const { result } = renderHook(() => useRole());
    expect(result.current.isCoach).toBe(true);
    expect(result.current.canManage(UserRole.MEMBER)).toBe(true);
    expect(result.current.canManage(UserRole.CLUB_MANAGER)).toBe(false);
  });

  it('PARENT role flags', () => {
    (useUser as any).mockReturnValue(makeUser(UserRole.PARENT));
    const { result } = renderHook(() => useRole());
    expect(result.current.isParent).toBe(true);
    expect(result.current._hasRole(UserRole.MEMBER)).toBe(false);
  });

  it('COMMITTEE roles flags', () => {
    (useUser as any).mockReturnValue(makeUser(UserRole.COMMITTEE_MEMBER));
    const { result: r1 } = renderHook(() => useRole());
    expect(r1.current.isCommitteeMember).toBe(true);

    (useUser as any).mockReturnValue(makeUser(UserRole.COMMITTEE_CHAIR));
    const { result: r2 } = renderHook(() => useRole());
    expect(r2.current.isCommitteeChair).toBe(true);
  });
});
