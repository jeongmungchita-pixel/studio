import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '@/services/auth-service';

// DI 기반 AuthService 테스트
describe('AuthService with DI', () => {
  let authService: AuthService;
  let mockFirestore: any;
  let mockFirebaseUser: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Firebase services
    mockFirestore = {
      doc: vi.fn(),
      collection: vi.fn(),
      runTransaction: vi.fn(),
    };

    mockFirebaseUser = {
      uid: 'test-user',
      email: 'test@example.com',
    };

    // Create AuthService instance
    authService = new AuthService();
  });

  it('should get user profile with Firebase User and Firestore', async () => {
    const mockUserProfile = {
      uid: 'test-user',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'MEMBER',
    };

    const mockDocRef = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => mockUserProfile,
      }),
    };

    // Mock the actual Firebase doc function
    const mockDoc = vi.fn().mockReturnValue(mockDocRef);
    mockFirestore.doc = mockDoc;

    const result = await authService.getUserProfile(mockFirebaseUser, mockFirestore);

    expect(result).toEqual(mockUserProfile);
    expect(mockDoc).toHaveBeenCalledWith('users', 'test-user');
  });

  it('should return null for non-existent user', async () => {
    const mockDocRef = {
      get: vi.fn().mockResolvedValue({
        exists: false,
      }),
    };

    mockFirestore.doc.mockReturnValue(mockDocRef);

    const result = await authService.getUserProfile(mockFirebaseUser, mockFirestore);

    expect(result).toBeNull();
  });

  it('should handle Firestore errors gracefully', async () => {
    const mockDocRef = {
      get: vi.fn().mockRejectedValue(new Error('Firestore error')),
    };

    mockFirestore.doc.mockReturnValue(mockDocRef);

    const result = await authService.getUserProfile(mockFirebaseUser, mockFirestore);

    expect(result).toBeNull();
  });

  it('should cache user profile for subsequent calls', async () => {
    const mockUserProfile = {
      uid: 'test-user',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'MEMBER',
    };

    const mockDocRef = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => mockUserProfile,
      }),
    };

    mockFirestore.doc.mockReturnValue(mockDocRef);

    // First call
    const result1 = await authService.getUserProfile(mockFirebaseUser, mockFirestore);
    // Second call (should use cache)
    const result2 = await authService.getUserProfile(mockFirebaseUser, mockFirestore);

    expect(result1).toEqual(mockUserProfile);
    expect(result2).toEqual(mockUserProfile);
    expect(mockDocRef.get).toHaveBeenCalledTimes(1); // Only called once due to caching
  });

  it('should get redirect URL by role', () => {
    const testCases = [
      { role: 'SUPER_ADMIN', expected: '/super-admin' },
      { role: 'FEDERATION_ADMIN', expected: '/admin' },
      { role: 'CLUB_OWNER', expected: '/club-dashboard' },
      { role: 'CLUB_MANAGER', expected: '/club-dashboard' },
      { role: 'HEAD_COACH', expected: '/club-dashboard' },
      { role: 'MEMBER', expected: '/my-profile' },
      { role: 'PARENT', expected: '/my-profile' },
    ];

    testCases.forEach(({ role, expected }) => {
      const result = authService.getRedirectUrlByRole(role as any);
      expect(result).toBe(expected);
    });
  });

  it('should check route access by role', () => {
    const testCases = [
      { role: 'SUPER_ADMIN', route: '/admin/users', expected: true },
      { role: 'SUPER_ADMIN', route: '/super-admin', expected: true },
      { role: 'FEDERATION_ADMIN', route: '/admin/users', expected: true },
      { role: 'FEDERATION_ADMIN', route: '/super-admin', expected: false },
      { role: 'MEMBER', route: '/admin/users', expected: false },
      { role: 'CLUB_MANAGER', route: '/club-dashboard', expected: true },
      { role: 'CLUB_MANAGER', route: '/admin/users', expected: false },
      { role: 'MEMBER', route: '/my-profile', expected: true },
      { role: 'MEMBER', route: '/club-dashboard', expected: false },
    ];

    testCases.forEach(({ role, route, expected }) => {
      const result = authService.canAccessRoute(role as any, route);
      expect(result).toBe(expected);
    });
  });
});
