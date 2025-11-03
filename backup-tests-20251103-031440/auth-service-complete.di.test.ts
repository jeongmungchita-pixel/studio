import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '@/services/auth-service';
import { setupFirebaseMocks } from '@/components/__tests__/firebase-mock';

// DI 기반 AuthService 완전 정복 테스트
describe('AuthService with DI - Complete Coverage', () => {
  let authService: AuthService;
  let firebaseMocks: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    
    // Firebase 완전 Mock 설정
    firebaseMocks = setupFirebaseMocks();
    
    // AuthService 재로드 (Mock 적용 후)
    const { AuthService: MockedAuthService } = await import('@/services/auth-service');
    authService = new MockedAuthService();
  });

  it('should get user profile successfully with complete Firebase integration', async () => {
    const mockUser = {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'MEMBER',
      status: 'active',
    };

    const mockFirebaseUser = {
      uid: 'test-user-123',
      email: 'test@example.com',
    };

    // Mock successful document retrieval
    firebaseMocks.getDoc.mockResolvedValue({
      exists: true,
      data: () => mockUser,
    });

    const result = await authService.getUserProfile(mockFirebaseUser as any, firebaseMocks.firestore);

    expect(result).toEqual(mockUser);
    expect(firebaseMocks.doc).toHaveBeenCalledWith(firebaseMocks.firestore, 'users', 'test-user-123');
    expect(firebaseMocks.getDoc).toHaveBeenCalledTimes(1);
  });

  it('should return null for non-existent user', async () => {
    const mockFirebaseUser = {
      uid: 'nonexistent-user',
      email: 'test@example.com',
    };

    // Mock non-existent document
    firebaseMocks.getDoc.mockResolvedValue({
      exists: false,
    });

    const result = await authService.getUserProfile(mockFirebaseUser as any, firebaseMocks.firestore);

    expect(result).toBeNull();
    expect(firebaseMocks.doc).toHaveBeenCalledWith(firebaseMocks.firestore, 'users', 'nonexistent-user');
  });

  it('should handle Firestore errors gracefully', async () => {
    const mockFirebaseUser = {
      uid: 'test-user-123',
      email: 'test@example.com',
    };

    // Mock Firestore error
    firebaseMocks.getDoc.mockRejectedValue(new Error('Firestore connection failed'));

    const result = await authService.getUserProfile(mockFirebaseUser as any, firebaseMocks.firestore);

    expect(result).toBeNull();
  });

  it('should cache user profile for subsequent calls', async () => {
    const mockUser = {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'MEMBER',
    };

    const mockFirebaseUser = {
      uid: 'test-user-123',
      email: 'test@example.com',
    };

    // Mock successful document retrieval
    firebaseMocks.getDoc.mockResolvedValue({
      exists: true,
      data: () => mockUser,
    });

    // First call
    const result1 = await authService.getUserProfile(mockFirebaseUser as any, firebaseMocks.firestore);
    // Second call (should use cache)
    const result2 = await authService.getUserProfile(mockFirebaseUser as any, firebaseMocks.firestore);

    expect(result1).toEqual(mockUser);
    expect(result2).toEqual(mockUser);
    expect(firebaseMocks.getDoc).toHaveBeenCalledTimes(1); // Only called once due to caching
  });

  it('should get redirect URL by role with complete coverage', () => {
    const testCases = [
      { role: 'SUPER_ADMIN', expected: '/super-admin' },
      { role: 'FEDERATION_ADMIN', expected: '/admin' },
      { role: 'CLUB_OWNER', expected: '/club-dashboard' },
      { role: 'CLUB_MANAGER', expected: '/club-dashboard' },
      { role: 'HEAD_COACH', expected: '/club-dashboard' },
      { role: 'ASSISTANT_COACH', expected: '/club-dashboard' },
      { role: 'MEMBER', expected: '/my-profile' },
      { role: 'PARENT', expected: '/my-profile' },
      { role: 'COMMITTEE_CHAIR', expected: '/committees' },
      { role: 'COMMITTEE_MEMBER', expected: '/committees' },
      { role: 'MEDIA_MANAGER', expected: '/club-dashboard' },
    ];

    testCases.forEach(({ role, expected }) => {
      const result = authService.getRedirectUrlByRole(role as any);
      expect(result).toBe(expected);
    });
  });

  it('should check route access by role with comprehensive coverage', () => {
    const testCases = [
      // Super Admin - all routes
      { role: 'SUPER_ADMIN', route: '/admin/users', expected: true },
      { role: 'SUPER_ADMIN', route: '/super-admin', expected: true },
      { role: 'SUPER_ADMIN', route: '/club-dashboard', expected: true },
      { role: 'SUPER_ADMIN', route: '/my-profile', expected: true },
      
      // Federation Admin - admin and member routes
      { role: 'FEDERATION_ADMIN', route: '/admin/users', expected: true },
      { role: 'FEDERATION_ADMIN', route: '/super-admin', expected: false },
      { role: 'FEDERATION_ADMIN', route: '/club-dashboard', expected: false },
      { role: 'FEDERATION_ADMIN', route: '/my-profile', expected: true },
      
      // Club roles - club and member routes
      { role: 'CLUB_OWNER', route: '/admin/users', expected: false },
      { role: 'CLUB_OWNER', route: '/club-dashboard', expected: true },
      { role: 'CLUB_OWNER', route: '/my-profile', expected: true },
      
      { role: 'CLUB_MANAGER', route: '/club-dashboard', expected: true },
      { role: 'CLUB_MANAGER', route: '/admin/users', expected: false },
      
      // Members - only member routes
      { role: 'MEMBER', route: '/my-profile', expected: true },
      { role: 'MEMBER', route: '/club-dashboard', expected: false },
      { role: 'MEMBER', route: '/admin/users', expected: false },
      
      // Public routes
      { role: 'MEMBER', route: '/', expected: true },
      { role: 'MEMBER', route: '/login', expected: true },
      { role: 'MEMBER', route: '/register/adult', expected: true },
    ];

    testCases.forEach(({ role, route, expected }) => {
      const result = authService.canAccessRoute(role as any, route);
      expect(result).toBe(expected);
    });
  });

  it('should handle sign out correctly', async () => {
    await authService.signOut();
    expect(firebaseMocks.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('should handle sign out errors', async () => {
    firebaseMocks.auth.signOut.mockRejectedValue(new Error('Sign out failed'));
    
    await expect(authService.signOut()).rejects.toThrow('Sign out failed');
  });

  it('should identify club roles correctly', () => {
    // Test private method through public behavior
    const clubRoles = [
      'CLUB_OWNER',
      'CLUB_MANAGER', 
      'CLUB_STAFF',
      'HEAD_COACH',
      'ASSISTANT_COACH',
      'MEDIA_MANAGER'
    ];

    clubRoles.forEach(role => {
      const redirectUrl = authService.getRedirectUrlByRole(role as any);
      expect(redirectUrl).toBe('/club-dashboard');
    });
  });

  it('should handle edge cases and error scenarios', async () => {
    // Test with undefined user
    const result1 = await authService.getUserProfile(undefined as any, firebaseMocks.firestore);
    expect(result1).toBeNull();

    // Test with null firestore
    const mockFirebaseUser = { uid: 'test-user', email: 'test@example.com' };
    const result2 = await authService.getUserProfile(mockFirebaseUser as any, null as any);
    expect(result2).toBeNull();
  });
});
