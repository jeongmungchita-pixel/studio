import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '@/services/auth-service';
import { User } from 'firebase/auth';
import { Firestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// 진짜 DI 테스트: 실제 AuthService를 테스트
describe('AuthService with Real DI Testing', () => {
  let authService: AuthService;
  let mockFirebaseUser: User;
  let mockFirestore: Firestore;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // 실제 Firebase 모듈 Mock
    vi.mock('firebase/firestore', async () => {
      const actual = await vi.importActual('firebase/firestore');
      return {
        ...actual,
        doc: vi.fn(),
        getDoc: vi.fn(),
        collection: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        getDocs: vi.fn(),
      };
    });

    vi.mock('firebase/auth', async () => {
      const actual = await vi.importActual('firebase/auth');
      return {
        ...actual,
        signOut: vi.fn(),
      };
    });

    // Mock Firebase User
    mockFirebaseUser = {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    } as User;

    // Mock Firestore
    mockFirestore = {
      doc: vi.fn(),
      collection: vi.fn(),
      query: vi.fn(),
      where: vi.fn(),
      getDoc: vi.fn(),
      getDocs: vi.fn(),
    } as any;

    // 실제 AuthService 인스턴스 생성
    authService = new AuthService();
  });

  it('should get user profile from Firestore successfully', async () => {
    const mockProfile = {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'MEMBER',
      status: 'active',
    };

    const mockDocRef = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => mockProfile,
      }),
    };

    // Mock doc 함수
    const { doc: mockDoc } = await import('firebase/firestore');
    vi.mocked(mockDoc).mockReturnValue(mockDocRef as any);

    const result = await authService.getUserProfile(mockFirebaseUser, mockFirestore);

    expect(result).toEqual(mockProfile);
    expect(mockDoc).toHaveBeenCalledWith(mockFirestore, 'users', 'test-user-123');
    expect(mockDocRef.get).toHaveBeenCalledTimes(1);
  });

  it('should return null for non-existent user', async () => {
    const mockDocRef = {
      get: vi.fn().mockResolvedValue({
        exists: false,
      }),
    };

    const { doc: mockDoc } = await import('firebase/firestore');
    vi.mocked(mockDoc).mockReturnValue(mockDocRef as any);

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

    const mockDocRef = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => mockProfile,
      }),
    };

    const { doc: mockDoc } = await import('firebase/firestore');
    vi.mocked(mockDoc).mockReturnValue(mockDocRef as any);

    // First call
    const result1 = await authService.getUserProfile(mockFirebaseUser, mockFirestore);
    // Second call (should use cache)
    const result2 = await authService.getUserProfile(mockFirebaseUser, mockFirestore);

    expect(result1).toEqual(mockProfile);
    expect(result2).toEqual(mockProfile);
    expect(mockDocRef.get).toHaveBeenCalledTimes(1); // Only called once due to caching
  });

  it('should handle Firestore errors gracefully', async () => {
    const mockDocRef = {
      get: vi.fn().mockRejectedValue(new Error('Firestore connection failed')),
    };

    const { doc: mockDoc } = await import('firebase/firestore');
    vi.mocked(mockDoc).mockReturnValue(mockDocRef as any);

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
      const result = authService.getRedirectUrlByRole(role as any);
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
      const result = authService.canAccessRoute(role as any, route);
      expect(result).toBe(expected);
    });
  });

  it('should handle sign out correctly', async () => {
    const { signOut: mockSignOut } = await import('firebase/auth');
    vi.mocked(mockSignOut).mockResolvedValue(undefined);

    await authService.signOut();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('should handle sign out errors', async () => {
    const { signOut: mockSignOut } = await import('firebase/auth');
    vi.mocked(mockSignOut).mockRejectedValue(new Error('Sign out failed'));

    await expect(authService.signOut()).rejects.toThrow('Sign out failed');
  });

  it('should handle edge cases properly', async () => {
    // Test with undefined user
    const result1 = await authService.getUserProfile(undefined as any, mockFirestore);
    expect(result1).toBeNull();

    // Test with null firestore
    const result2 = await authService.getUserProfile(mockFirebaseUser, null as any);
    expect(result2).toBeNull();
  });

  it('should identify club roles correctly', () => {
    const clubRoles = [
      'CLUB_OWNER',
      'CLUB_MANAGER', 
      'HEAD_COACH',
      'ASSISTANT_COACH',
    ];

    clubRoles.forEach(role => {
      const redirectUrl = authService.getRedirectUrlByRole(role as any);
      expect(redirectUrl).toBe('/club-dashboard');
    });
  });
});
