import { describe, it, expect, vi, beforeEach } from 'vitest';

// 완전한 Mock Strategy: AuthService 자체를 Mock 없이 테스트
describe('AuthService Direct Testing - No Firebase Dependencies', () => {
  let authService: any;
  let mockFirestore: any;
  let mockFirebaseUser: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // 완전히 Mock된 Firebase 함수들
    const mockDoc = vi.fn();
    const mockGetDoc = vi.fn();
    const mockCollection = vi.fn();
    const mockQuery = vi.fn();
    const mockWhere = vi.fn();
    const mockGetDocs = vi.fn();
    const mockSetDoc = vi.fn();

    // Mock Doc Reference
    const mockDocRef = {
      get: mockGetDoc,
      set: mockSetDoc,
    };

    // Mock 설정
    mockDoc.mockReturnValue(mockDocRef);
    mockCollection.mockReturnValue({});
    mockQuery.mockReturnValue({});
    mockWhere.mockReturnValue({});

    // 전역 Firebase Mock 설정
    vi.stubGlobal('doc', mockDoc);
    vi.stubGlobal('getDoc', mockGetDoc);
    vi.stubGlobal('collection', mockCollection);
    vi.stubGlobal('query', mockQuery);
    vi.stubGlobal('where', mockWhere);
    vi.stubGlobal('getDocs', mockGetDocs);
    vi.stubGlobal('setDoc', mockSetDoc);

    // Mock 객체들
    mockFirestore = {
      doc: mockDoc,
      collection: mockCollection,
      query: mockQuery,
      where: mockWhere,
      getDoc: mockGetDoc,
      getDocs: mockGetDocs,
      setDoc: mockSetDoc,
    };

    mockFirebaseUser = {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    };

    // AuthService import 및 인스턴스 생성
    const { AuthService } = await import('@/services/auth-service');
    authService = new AuthService();
  });

  it('should get user profile successfully', async () => {
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
      { role: 'HEAD_COACH', expected: '/club-dashboard' },
      { role: 'ASSISTANT_COACH', expected: '/club-dashboard' },
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
      { role: 'ADMIN', route: '/admin', expected: true },
      { role: 'MEMBER', route: '/admin', expected: false },
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

    // Test with invalid role for redirect
    const result4 = authService.getRedirectUrlByRole('INVALID_ROLE');
    expect(result4).toBe('/dashboard'); // Default fallback
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

  it('should handle cache expiration correctly', async () => {
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

    // Create new instance to simulate cache expiration
    const newAuthService = new (await import('@/services/auth-service')).AuthService();
    const result3 = await newAuthService.getUserProfile(mockFirebaseUser, mockFirestore);
    expect(result3).toEqual(mockProfile);
    expect(callCount).toBe(2); // New instance, new cache
  });

  it('should handle user with club name and club role', async () => {
    const mockProfile = {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'CLUB_MANAGER',
      status: 'active',
      clubName: 'Test Club',
    };

    // Mock club ID retrieval
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'club-456',
          data: () => ({ name: 'Test Club' }),
        },
      ],
    });

    mockGetDoc.mockResolvedValue({
      exists: true,
      data: () => mockProfile,
    });

    const result = await authService.getUserProfile(mockFirebaseUser, mockFirestore);

    expect(result).toEqual({
      ...mockProfile,
      clubId: 'club-456',
    });
  });

  it('should handle approval requests for new users', async () => {
    // Mock no existing profile
    mockGetDoc.mockResolvedValue({
      exists: false,
    });

    // Mock approved requests
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'request-123',
          data: () => ({
            userId: 'test-user-123',
            type: 'adult',
            status: 'approved',
            email: 'test@example.com',
            displayName: 'Test User',
            role: 'MEMBER',
          }),
        },
      ],
    });

    const result = await authService.getUserProfile(mockFirebaseUser, mockFirestore);

    expect(result).toEqual({
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'MEMBER',
      status: 'approved',
    });
  });
});
