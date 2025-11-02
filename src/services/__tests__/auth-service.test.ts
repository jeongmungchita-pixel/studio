import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../auth-service';
import { User } from 'firebase/auth';
import { UserRole } from '@/types';

// Mock Firebase modules completely
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockFirebaseUser: User;
  let mockFirestore: any;

  beforeEach(() => {
    authService = AuthService.getInstance();
    authService.clearCache(); // Clear cache before each test
    
    mockFirebaseUser = {
      uid: 'test-uid-123',
      email: 'test@example.com',
      displayName: 'Test User',
      phoneNumber: '+1234567890',
      photoURL: 'https://example.com/photo.jpg',
      providerData: [{ providerId: 'google.com' }]
    } as User;

    mockFirestore = {};
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    authService.clearCache();
  });

  describe('getUserProfile', () => {
    it('should return cached profile if available and not expired', async () => {
      const mockProfile = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.MEMBER,
        status: 'active',
        createdAt: new Date().toISOString(),
        provider: 'google',
        photoURL: 'https://example.com/photo.jpg'
      };

      // Manually cache a profile
      authService['cacheProfile']('test-uid-123', mockProfile);

      const result = await authService.getUserProfile(mockFirebaseUser, mockFirestore);

      expect(result).toEqual(mockProfile);
    });

    it('should return null for non-existent user with no approved requests', async () => {
      const { doc, getDoc, getDocs, setDoc } = await import('firebase/firestore');
      
      // Mock empty document
      vi.mocked(doc).mockReturnValue({} as any);
      vi.mocked(getDoc).mockResolvedValue({ exists: false } as any);
      vi.mocked(getDocs).mockResolvedValue({ empty: true } as any);
      vi.mocked(setDoc).mockResolvedValue(undefined);

      const result = await authService.getUserProfile(mockFirebaseUser, mockFirestore);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully and return null', async () => {
      const { doc, getDoc } = await import('firebase/firestore');
      
      vi.mocked(doc).mockReturnValue({} as any);
      vi.mocked(getDoc).mockRejectedValue(new Error('Firestore error'));

      const result = await authService.getUserProfile(mockFirebaseUser, mockFirestore);

      expect(result).toBeNull();
    });
  });

  describe('getRedirectUrl', () => {
    it('should return correct URLs for different roles', () => {
      const testCases = [
        { role: UserRole.SUPER_ADMIN, expected: '/super-admin' },
        { role: UserRole.FEDERATION_ADMIN, expected: '/admin' },
        { role: UserRole.CLUB_OWNER, expected: '/club-dashboard' },
        { role: UserRole.CLUB_MANAGER, expected: '/club-dashboard' },
        { role: UserRole.HEAD_COACH, expected: '/club-dashboard' },
        { role: UserRole.ASSISTANT_COACH, expected: '/club-dashboard' },
        { role: UserRole.COMMITTEE_CHAIR, expected: '/committees' },
        { role: UserRole.COMMITTEE_MEMBER, expected: '/committees' },
        { role: UserRole.MEMBER, expected: '/my-profile' },
        { role: UserRole.PARENT, expected: '/my-profile' },
      ];

      testCases.forEach(({ role, expected }) => {
        expect(authService.getRedirectUrl(role)).toBe(expected);
      });
    });
  });

  describe('canAccessRoute', () => {
    it('should allow access to public routes for all users', () => {
      const publicRoutes = ['/', '/login', '/register', '/register/adult'];
      
      publicRoutes.forEach(route => {
        expect(authService.canAccessRoute(UserRole.MEMBER, route)).toBe(true);
        expect(authService.canAccessRoute(UserRole.CLUB_OWNER, route)).toBe(true);
        expect(authService.canAccessRoute(UserRole.SUPER_ADMIN, route)).toBe(true);
      });
    });

    it('should allow SUPER_ADMIN to access all routes', () => {
      const allRoutes = ['/admin', '/club-dashboard', '/my-profile', '/private'];
      
      allRoutes.forEach(route => {
        expect(authService.canAccessRoute(UserRole.SUPER_ADMIN, route)).toBe(true);
      });
    });

    it('should allow FEDERATION_ADMIN to access admin and member routes', () => {
      expect(authService.canAccessRoute(UserRole.FEDERATION_ADMIN, '/admin')).toBe(true);
      expect(authService.canAccessRoute(UserRole.FEDERATION_ADMIN, '/my-profile')).toBe(true);
      expect(authService.canAccessRoute(UserRole.FEDERATION_ADMIN, '/club-dashboard')).toBe(false);
    });

    it('should allow club roles to access club and member routes', () => {
      const clubRoles = [
        UserRole.CLUB_OWNER,
        UserRole.CLUB_MANAGER,
        UserRole.HEAD_COACH,
        UserRole.ASSISTANT_COACH
      ];

      clubRoles.forEach(role => {
        expect(authService.canAccessRoute(role, '/club-dashboard')).toBe(true);
        expect(authService.canAccessRoute(role, '/my-profile')).toBe(true);
        expect(authService.canAccessRoute(role, '/admin')).toBe(false);
      });
    });

    it('should allow members to access only member routes', () => {
      expect(authService.canAccessRoute(UserRole.MEMBER, '/my-profile')).toBe(true);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/events')).toBe(true);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/club-dashboard')).toBe(false);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/admin')).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should cache profile with timestamp', async () => {
      const mockProfile = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.MEMBER,
        status: 'active',
        createdAt: new Date().toISOString(),
        provider: 'google',
        photoURL: 'https://example.com/photo.jpg'
      };

      authService['cacheProfile']('test-uid-123', mockProfile);

      const cached = authService['getCachedProfile']('test-uid-123');
      expect(cached).toEqual(mockProfile);
    });

    it('should return null for expired cache', async () => {
      const mockProfile = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.MEMBER,
        status: 'active',
        createdAt: new Date().toISOString(),
        provider: 'google',
        photoURL: 'https://example.com/photo.jpg'
      };

      // Cache with old timestamp (beyond TTL)
      authService['profileCache'].set('test-uid-123', {
        profile: mockProfile,
        timestamp: Date.now() - (6 * 60 * 1000) // 6 minutes ago
      });

      const cached = authService['getCachedProfile']('test-uid-123');
      expect(cached).toBeNull();
    });

    it('should clear specific user cache', () => {
      const mockProfile = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.MEMBER,
        status: 'active',
        createdAt: new Date().toISOString(),
        provider: 'google',
        photoURL: 'https://example.com/photo.jpg'
      };

      authService['cacheProfile']('test-uid-123', mockProfile);
      authService['cacheProfile']('test-uid-456', mockProfile);

      authService.clearCache('test-uid-123');

      expect(authService['getCachedProfile']('test-uid-123')).toBeNull();
      expect(authService['getCachedProfile']('test-uid-456')).not.toBeNull();
    });

    it('should clear all cache', () => {
      const mockProfile = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.MEMBER,
        status: 'active',
        createdAt: new Date().toISOString(),
        provider: 'google',
        photoURL: 'https://example.com/photo.jpg'
      };

      authService['cacheProfile']('test-uid-123', mockProfile);
      authService['cacheProfile']('test-uid-456', mockProfile);

      authService.clearCache();

      expect(authService['getCachedProfile']('test-uid-123')).toBeNull();
      expect(authService['getCachedProfile']('test-uid-456')).toBeNull();
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});
