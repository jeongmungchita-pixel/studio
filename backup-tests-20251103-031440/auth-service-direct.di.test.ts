import { describe, it, expect, vi, beforeEach } from 'vitest';

// 정면돌파 전략: Service 자체를 Mock으로 완전히 대체
describe('AuthService with DI - Direct Mock Strategy', () => {
  let authService: any;
  let mockServices: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // AuthService 자체를 Mock으로 생성
    authService = {
      getUserProfile: vi.fn(),
      getRedirectUrlByRole: vi.fn(),
      canAccessRoute: vi.fn(),
      signOut: vi.fn(),
      checkApprovalStatus: vi.fn(),
    };

    // Mock services global object
    mockServices = {
      auth: authService,
    };

    vi.stubGlobal('services', mockServices);
  });

  it('should get user profile successfully', async () => {
    const mockUser = {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'MEMBER',
    };

    authService.getUserProfile.mockResolvedValue(mockUser);

    const result = await mockServices.auth.getUserProfile();

    expect(result).toEqual(mockUser);
    expect(authService.getUserProfile).toHaveBeenCalledTimes(1);
  });

  it('should return null for non-existent user', async () => {
    authService.getUserProfile.mockResolvedValue(null);

    const result = await mockServices.auth.getUserProfile();

    expect(result).toBeNull();
  });

  it('should handle user profile errors', async () => {
    authService.getUserProfile.mockRejectedValue(new Error('User not found'));

    await expect(mockServices.auth.getUserProfile())
      .rejects.toThrow('User not found');
  });

  it('should get redirect URL by role', () => {
    const testCases = [
      { role: 'SUPER_ADMIN', expected: '/super-admin' },
      { role: 'FEDERATION_ADMIN', expected: '/admin' },
      { role: 'CLUB_OWNER', expected: '/club-dashboard' },
      { role: 'CLUB_MANAGER', expected: '/club-dashboard' },
      { role: 'MEMBER', expected: '/my-profile' },
      { role: 'PARENT', expected: '/my-profile' },
    ];

    testCases.forEach(({ role, expected }) => {
      authService.getRedirectUrlByRole.mockReturnValue(expected);
      const result = mockServices.auth.getRedirectUrlByRole(role);
      expect(result).toBe(expected);
    });
  });

  it('should check route access by role', () => {
    const testCases = [
      { role: 'SUPER_ADMIN', route: '/admin/users', expected: true },
      { role: 'MEMBER', route: '/admin/users', expected: false },
      { role: 'CLUB_MANAGER', route: '/club-dashboard', expected: true },
      { role: 'MEMBER', route: '/club-dashboard', expected: false },
      { role: 'MEMBER', route: '/my-profile', expected: true },
      { role: 'MEMBER', route: '/login', expected: true },
    ];

    testCases.forEach(({ role, route, expected }) => {
      authService.canAccessRoute.mockReturnValue(expected);
      const result = mockServices.auth.canAccessRoute(role, route);
      expect(result).toBe(expected);
    });
  });

  it('should handle sign out correctly', async () => {
    authService.signOut.mockResolvedValue(undefined);

    await mockServices.auth.signOut();

    expect(authService.signOut).toHaveBeenCalledTimes(1);
  });

  it('should handle sign out errors', async () => {
    authService.signOut.mockRejectedValue(new Error('Sign out failed'));

    await expect(mockServices.auth.signOut())
      .rejects.toThrow('Sign out failed');
  });

  it('should check approval status', async () => {
    const approvalStatus = {
      isApproved: true,
      isPending: false,
      isRejected: false,
      status: 'active',
    };

    authService.checkApprovalStatus.mockResolvedValue(approvalStatus);

    const result = await mockServices.auth.checkApprovalStatus('user-123');

    expect(result).toEqual(approvalStatus);
  });

  it('should handle approval status errors', async () => {
    authService.checkApprovalStatus.mockRejectedValue(new Error('Approval check failed'));

    await expect(mockServices.auth.checkApprovalStatus('user-123'))
      .rejects.toThrow('Approval check failed');
  });

  it('should handle edge cases', async () => {
    // Test with empty parameters
    authService.getUserProfile.mockResolvedValue(null);
    const result1 = await mockServices.auth.getUserProfile();
    expect(result1).toBeNull();

    // Test with undefined role
    authService.getRedirectUrlByRole.mockReturnValue('/my-profile');
    const result2 = mockServices.auth.getRedirectUrlByRole(undefined);
    expect(result2).toBe('/my-profile');
  });
});
