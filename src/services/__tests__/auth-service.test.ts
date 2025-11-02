import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../auth-service';
import { UserRole } from '@/types/auth';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => null })),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
  serverTimestamp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton instance
    (AuthService as any).instance = undefined;
    authService = AuthService.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('canAccessRoute', () => {
    it('should allow SUPER_ADMIN to access any route', () => {
      expect(authService.canAccessRoute(UserRole.SUPER_ADMIN, '/admin')).toBe(true);
      expect(authService.canAccessRoute(UserRole.SUPER_ADMIN, '/club-dashboard')).toBe(true);
      expect(authService.canAccessRoute(UserRole.SUPER_ADMIN, '/my-profile')).toBe(true);
      expect(authService.canAccessRoute(UserRole.SUPER_ADMIN, '/system')).toBe(true);
    });

    it('should allow FEDERATION_ADMIN to access admin routes', () => {
      expect(authService.canAccessRoute(UserRole.FEDERATION_ADMIN, '/admin')).toBe(true);
      expect(authService.canAccessRoute(UserRole.FEDERATION_ADMIN, '/my-profile')).toBe(true);
      // club-dashboard는 클럽 역할 전용, FEDERATION_ADMIN은 접근 불가
      expect(authService.canAccessRoute(UserRole.FEDERATION_ADMIN, '/club-dashboard')).toBe(false);
    });

    it('should allow CLUB_OWNER to access club routes', () => {
      expect(authService.canAccessRoute(UserRole.CLUB_OWNER, '/club-dashboard')).toBe(true);
      expect(authService.canAccessRoute(UserRole.CLUB_OWNER, '/my-profile')).toBe(true);
      // admin은 관리자 전용, CLUB_OWNER는 접근 불가
      expect(authService.canAccessRoute(UserRole.CLUB_OWNER, '/admin')).toBe(false);
    });

    it('should allow MEMBER to access member routes only', () => {
      expect(authService.canAccessRoute(UserRole.MEMBER, '/my-profile')).toBe(true);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/events')).toBe(true);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/club-dashboard')).toBe(false);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/admin')).toBe(false);
    });

    it('should allow everyone to access public routes', () => {
      expect(authService.canAccessRoute(UserRole.MEMBER, '/login')).toBe(true);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/register')).toBe(true);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/')).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear specific user cache', () => {
      // Set up a mock cache
      const profileCache = (authService as any).profileCache;
      profileCache.set('user123', {
        profile: { uid: 'user123', email: 'test@example.com', role: UserRole.MEMBER },
        timestamp: Date.now()
      });

      authService.clearCache('user123');
      expect(profileCache.has('user123')).toBe(false);
    });

    it('should clear all cache when no uid provided', () => {
      // Set up mock cache entries
      const profileCache = (authService as any).profileCache;
      profileCache.set('user123', {
        profile: { uid: 'user123', email: 'test1@example.com', role: UserRole.MEMBER },
        timestamp: Date.now()
      });
      profileCache.set('user456', {
        profile: { uid: 'user456', email: 'test2@example.com', role: UserRole.MEMBER },
        timestamp: Date.now()
      });

      authService.clearCache();
      expect(profileCache.size).toBe(0);
    });
  });

  describe('getUserProfile', () => {
    it('should return cached profile if valid', async () => {
      const mockFirestore = {} as any;
      const mockUser = {
        uid: 'test123',
        email: 'test@example.com'
      } as any;

      const mockProfile = {
        uid: 'test123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.MEMBER,
        status: 'active'
      };

      // Manually set cache
      const profileCache = (authService as any).profileCache;
      profileCache.set('test123', {
        profile: mockProfile,
        timestamp: Date.now()
      });

      const result = await authService.getUserProfile(mockUser, mockFirestore);
      expect(result).toEqual(mockProfile);
    });

    it('should fetch from Firestore if not cached', async () => {
      const { getDoc } = await import('firebase/firestore');
      const mockGetDoc = vi.mocked(getDoc);
      
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          uid: 'test123',
          email: 'test@example.com',
          displayName: 'Test User',
          role: UserRole.MEMBER,
          status: 'active'
        })
      } as any);

      const mockFirestore = {} as any;
      const mockUser = {
        uid: 'test123',
        email: 'test@example.com'
      } as any;

      const result = await authService.getUserProfile(mockUser, mockFirestore);
      
      expect(result).toBeTruthy();
      expect(result?.uid).toBe('test123');
      expect(result?.role).toBe(UserRole.MEMBER);
    });

    it('should return null on error', async () => {
      const { getDoc } = await import('firebase/firestore');
      const mockGetDoc = vi.mocked(getDoc);
      
      mockGetDoc.mockRejectedValueOnce(new Error('Firestore error'));

      const mockFirestore = {} as any;
      const mockUser = {
        uid: 'test123',
        email: 'test@example.com'
      } as any;

      const result = await authService.getUserProfile(mockUser, mockFirestore);
      expect(result).toBeNull();
    });
  });
});
