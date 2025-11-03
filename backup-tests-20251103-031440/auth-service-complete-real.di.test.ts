import { describe, it, expect, vi, beforeEach } from 'vitest';

// 전역 Mock 변수 선언
let mockDoc: any;
let mockGetDoc: any;
let mockCollection: any;
let mockQuery: any;
let mockWhere: any;
let mockGetDocs: any;
let mockFirestore: any;
let mockFirebaseUser: any;
let authService: any;

// 진짜 Firebase Mock으로 AuthService 테스트
describe('AuthService with Complete Firebase Mock', () => {

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    // Firebase Firestore Mock 설정
    mockDoc = vi.fn();
    mockGetDoc = vi.fn();
    mockCollection = vi.fn();
    mockQuery = vi.fn();
    mockWhere = vi.fn();
    mockGetDocs = vi.fn();

    const mockDocRef = {
      get: mockGetDoc,
    };

    // Mock chain 설정
    mockDoc.mockReturnValue(mockDocRef);
    mockCollection.mockReturnValue({});
    mockQuery.mockReturnValue({});
    mockWhere.mockReturnValue({});

    // Firebase 모듈 Mock
    vi.doMock('firebase/firestore', () => ({
      doc: mockDoc,
      getDoc: mockGetDoc,
      collection: mockCollection,
      query: mockQuery,
      where: mockWhere,
      getDocs: mockGetDocs,
    }));

    vi.doMock('firebase/auth', () => ({
      signOut: vi.fn(),
    }));

    // Mock 객체들
    mockFirestore = {
      doc: mockDoc,
      collection: mockCollection,
      query: mockQuery,
      where: mockWhere,
      getDoc: mockGetDoc,
      getDocs: mockGetDocs,
    };

    mockFirebaseUser = {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    };

    // AuthService import (Mock 적용 후)
    const { AuthService } = await import('@/services/auth-service');
    authService = new AuthService();
  });

  it('should get user profile successfully with real Firebase mock', async () => {
    const mockProfile = {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'MEMBER',
      status: 'active',
    };

    // Mock successful document retrieval
    mockGetDoc.mockResolvedValue({
      exists: true,
      data: () => mockProfile,
    });

    const result = await authService.getUserProfile(mockFirebaseUser, mockFirestore);

    expect(result).toEqual(mockProfile);
    expect(mockDoc).toHaveBeenCalledWith(mockFirestore, 'users', 'test-user-123');
    expect(mockGetDoc).toHaveBeenCalledTimes(1);
  });

  it('should return null for non-existent user', async () => {
    // Mock non-existent document
    mockGetDoc.mockResolvedValue({
      exists: false,
    });

    const result = await authService.getUserProfile(mockFirebaseUser, mockFirestore);

    expect(result).toBeNull();
    expect(mockDoc).toHaveBeenCalledWith(mockFirestore, 'users', 'test-user-123');
  });

  it('should cache user profile for subsequent calls', async () => {
    const mockProfile = {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'MEMBER',
    };

    mockGetDoc.mockResolvedValue({
      exists: true,
      data: () => mockProfile,
    });

    // First call
    const result1 = await authService.getUserProfile(mockFirebaseUser, mockFirestore);
    // Second call (should use cache)
    const result2 = await authService.getUserProfile(mockFirebaseUser, mockFirestore);

    expect(result1).toEqual(mockProfile);
    expect(result2).toEqual(mockProfile);
    expect(mockGetDoc).toHaveBeenCalledTimes(1); // Only called once due to caching
  });

  it('should handle Firestore errors gracefully', async () => {
    // Mock Firestore error
    mockGetDoc.mockRejectedValue(new Error('Firestore connection failed'));

    const result = await authService.getUserProfile(mockFirebaseUser, mockFirestore);

    expect(result).toBeNull();
  });

  it('should get redirect URL by role correctly', () => {
    const testCases = [
      { role: 'SUPER_ADMIN', expected: '/super-admin' },
      { role: 'FEDERATION_ADMIN', expected: '/admin' },
      { role: 'CLUB_OWNER', expected: '/club-dashboard' },
      { role: 'CLUB_MANAGER', expected: '/club-dashboard' },
      { role: 'MEMBER', expected: '/my-profile' },
      { role: 'PARENT', expected: '/my-profile' },
    ];

    testCases.forEach(({ role, expected }) => {
      const result = authService.getRedirectUrlByRole(role);
      expect(result).toBe(expected);
    });
  });

  it('should check route access by role correctly', () => {
    const testCases = [
      { role: 'SUPER_ADMIN', route: '/admin/users', expected: true },
      { role: 'MEMBER', route: '/admin/users', expected: false },
      { role: 'CLUB_MANAGER', route: '/club-dashboard', expected: true },
      { role: 'MEMBER', route: '/club-dashboard', expected: false },
      { role: 'MEMBER', route: '/my-profile', expected: true },
      { role: 'MEMBER', route: '/login', expected: true },
    ];

    testCases.forEach(({ role, route, expected }) => {
      const result = authService.canAccessRoute(role, route);
      expect(result).toBe(expected);
    });
  });

  it('should handle edge cases properly', async () => {
    // Test with undefined user
    const result1 = await authService.getUserProfile(undefined, mockFirestore);
    expect(result1).toBeNull();

    // Test with null firestore
    const result2 = await authService.getUserProfile(mockFirebaseUser, null);
    expect(result2).toBeNull();

    // Test with empty user object
    const result3 = await authService.getUserProfile({}, mockFirestore);
    expect(result3).toBeNull();
  });

  it('should identify club roles correctly', () => {
    const clubRoles = [
      'CLUB_OWNER',
      'CLUB_MANAGER', 
      'HEAD_COACH',
      'ASSISTANT_COACH',
    ];

    clubRoles.forEach(role => {
      const redirectUrl = authService.getRedirectUrlByRole(role);
      expect(redirectUrl).toBe('/club-dashboard');
    });
  });

  it('should handle cache expiration', async () => {
    const mockProfile = {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'MEMBER',
    };

    let callCount = 0;
    mockGetDoc.mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        exists: true,
        data: () => mockProfile,
      });
    });

    // First call
    const result1 = await authService.getUserProfile(mockFirebaseUser, mockFirestore);
    expect(result1).toEqual(mockProfile);
    expect(callCount).toBe(1);

    // Second call (should use cache)
    const result2 = await authService.getUserProfile(mockFirebaseUser, mockFirestore);
    expect(result2).toEqual(mockProfile);
    expect(callCount).toBe(1); // Still 1 because of cache

    // Manually clear cache by creating new instance
    const newAuthService = new (await import('@/services/auth-service')).AuthService();
    const result3 = await newAuthService.getUserProfile(mockFirebaseUser, mockFirestore);
    expect(result3).toEqual(mockProfile);
    expect(callCount).toBe(2); // New instance, new cache
  });
});
