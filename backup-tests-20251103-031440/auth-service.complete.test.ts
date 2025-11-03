import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from '../auth-service';
import { UserRole } from '@/types/auth';
import { User } from 'firebase/auth';
import { 
  Firestore, 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  setDoc 
} from 'firebase/firestore';

// Firebase mocks
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
}));

describe('AuthService - Complete Test Suite', () => {
  let authService: AuthService;
  let mockFirestore: any;
  let mockUser: User;

  beforeEach(() => {
    // Reset singleton instance
    (AuthService as any).instance = null;
    authService = AuthService.getInstance();
    
    // Clear all mocks
    vi.clearAllMocks();
    
    // Setup mock Firestore
    mockFirestore = {} as Firestore;
    
    // Setup mock Firebase User
    mockUser = {
      uid: 'test-uid-123',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg',
      phoneNumber: '010-1234-5678',
      providerData: [{
        providerId: 'google.com',
        uid: 'google-uid',
        displayName: 'Test User',
        email: 'test@example.com',
        phoneNumber: null,
        photoURL: null
      }],
    } as User;
  });

  afterEach(() => {
    authService.clearCache();
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getUserProfile', () => {
    it('should return cached profile if available', async () => {
      // Setup cached profile
      const cachedProfile = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Cached User',
        role: UserRole.MEMBER,
        status: 'active',
        provider: 'google',
        createdAt: new Date().toISOString(),
      };
      
      // Cache the profile
      (authService as any).cacheProfile('test-uid-123', cachedProfile);
      
      // Get profile (should not call Firestore)
      const result = await authService.getUserProfile(mockUser, mockFirestore);
      
      expect(result).toEqual(cachedProfile);
      expect(getDoc).not.toHaveBeenCalled();
    });

    it('should fetch from Firestore if not cached', async () => {
      const firestoreProfile = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Firestore User',
        role: UserRole.CLUB_OWNER,
        clubName: 'Test Club',
        status: 'active',
        provider: 'email',
        createdAt: new Date().toISOString(),
      };

      // Mock Firestore response
      vi.mocked(doc).mockReturnValue({ id: 'test-uid-123' } as any);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => firestoreProfile,
      } as any);

      // Mock club ID lookup
      vi.mocked(collection).mockReturnValue({ id: 'clubs' } as any);
      vi.mocked(query).mockReturnValue({ id: 'query' } as any);
      vi.mocked(getDocs).mockResolvedValue({
        empty: false,
        docs: [{ id: 'club-123', data: () => ({ name: 'Test Club' }) }],
      } as any);

      const result = await authService.getUserProfile(mockUser, mockFirestore);

      expect(result).toMatchObject({
        ...firestoreProfile,
        clubId: 'club-123',
      });
      expect(getDoc).toHaveBeenCalledTimes(1);
    });

    it('should check approved requests if profile does not exist', async () => {
      // Mock no existing profile
      vi.mocked(doc).mockReturnValue({ id: 'test-uid-123' } as any);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
      } as any);

      // Mock approved member request
      const approvedRequest = {
        email: 'test@example.com',
        name: 'Approved User',
        status: 'approved',
        clubId: 'club-456',
        clubName: 'Another Club',
      };

      let callCount = 0;
      vi.mocked(collection).mockReturnValue({ id: 'requests' } as any);
      vi.mocked(query).mockReturnValue({ id: 'query' } as any);
      vi.mocked(getDocs).mockImplementation(() => {
        callCount++;
        // First two calls (clubOwner and superAdmin) return empty
        if (callCount <= 2) {
          return Promise.resolve({ empty: true, docs: [] } as any);
        }
        // Third call (memberRegistrationRequests) returns approved request
        return Promise.resolve({
          empty: false,
          docs: [{ data: () => approvedRequest }],
        } as any);
      });

      // Mock setDoc
      vi.mocked(setDoc).mockResolvedValue(undefined);

      const result = await authService.getUserProfile(mockUser, mockFirestore);

      expect(result).toMatchObject({
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Approved User',
        role: UserRole.MEMBER,
        clubId: 'club-456',
        clubName: 'Another Club',
      });
      expect(setDoc).toHaveBeenCalled();
    });

    it('should return null on error', async () => {
      vi.mocked(doc).mockImplementation(() => {
        throw new Error('Firestore error');
      });

      const result = await authService.getUserProfile(mockUser, mockFirestore);
      
      expect(result).toBeNull();
    });

    it('should create default profile if no approved requests', async () => {
      // Mock no existing profile
      vi.mocked(doc).mockReturnValue({ id: 'test-uid-123' } as any);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
      } as any);

      // Mock no approved requests
      vi.mocked(getDocs).mockResolvedValue({
        empty: true,
        docs: [],
      } as any);

      const result = await authService.getUserProfile(mockUser, mockFirestore);

      expect(result).toMatchObject({
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.MEMBER,
        status: 'active',
      });
    });
  });

  describe('getRedirectUrlByRole', () => {
    it('should return /pending-approval for pending status', () => {
      const url = authService.getRedirectUrlByRole(UserRole.MEMBER, 'pending');
      expect(url).toBe('/pending-approval');
    });

    it('should return correct URLs for each role', () => {
      expect(authService.getRedirectUrlByRole(UserRole.SUPER_ADMIN)).toBe('/super-admin');
      expect(authService.getRedirectUrlByRole(UserRole.FEDERATION_ADMIN)).toBe('/admin');
      expect(authService.getRedirectUrlByRole(UserRole.CLUB_OWNER)).toBe('/club-dashboard');
      expect(authService.getRedirectUrlByRole(UserRole.CLUB_MANAGER)).toBe('/club-dashboard');
      expect(authService.getRedirectUrlByRole(UserRole.HEAD_COACH)).toBe('/club-dashboard');
      expect(authService.getRedirectUrlByRole(UserRole.ASSISTANT_COACH)).toBe('/club-dashboard');
      expect(authService.getRedirectUrlByRole(UserRole.COMMITTEE_CHAIR)).toBe('/committees');
      expect(authService.getRedirectUrlByRole(UserRole.COMMITTEE_MEMBER)).toBe('/committees');
      expect(authService.getRedirectUrlByRole(UserRole.MEMBER)).toBe('/my-profile');
      expect(authService.getRedirectUrlByRole(UserRole.PARENT)).toBe('/my-profile');
    });
  });

  describe('canAccessRoute', () => {
    it('should allow public routes for all users', () => {
      expect(authService.canAccessRoute(UserRole.MEMBER, '/')).toBe(true);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/login')).toBe(true);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/register')).toBe(true);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/register/adult')).toBe(true);
    });

    it('should allow SUPER_ADMIN to access all routes', () => {
      expect(authService.canAccessRoute(UserRole.SUPER_ADMIN, '/admin')).toBe(true);
      expect(authService.canAccessRoute(UserRole.SUPER_ADMIN, '/club-dashboard')).toBe(true);
      expect(authService.canAccessRoute(UserRole.SUPER_ADMIN, '/my-profile')).toBe(true);
      expect(authService.canAccessRoute(UserRole.SUPER_ADMIN, '/system')).toBe(true);
      expect(authService.canAccessRoute(UserRole.SUPER_ADMIN, '/any-route')).toBe(true);
    });

    it('should allow FEDERATION_ADMIN to access admin and member routes', () => {
      expect(authService.canAccessRoute(UserRole.FEDERATION_ADMIN, '/admin')).toBe(true);
      expect(authService.canAccessRoute(UserRole.FEDERATION_ADMIN, '/my-profile')).toBe(true);
      expect(authService.canAccessRoute(UserRole.FEDERATION_ADMIN, '/events')).toBe(true);
      expect(authService.canAccessRoute(UserRole.FEDERATION_ADMIN, '/club-dashboard')).toBe(false);
    });

    it('should allow club roles to access club and member routes', () => {
      expect(authService.canAccessRoute(UserRole.CLUB_OWNER, '/club-dashboard')).toBe(true);
      expect(authService.canAccessRoute(UserRole.CLUB_OWNER, '/my-profile')).toBe(true);
      expect(authService.canAccessRoute(UserRole.CLUB_OWNER, '/admin')).toBe(false);
      
      expect(authService.canAccessRoute(UserRole.HEAD_COACH, '/club-dashboard')).toBe(true);
      expect(authService.canAccessRoute(UserRole.HEAD_COACH, '/my-profile')).toBe(true);
      expect(authService.canAccessRoute(UserRole.HEAD_COACH, '/admin')).toBe(false);
    });

    it('should allow members to access member routes only', () => {
      expect(authService.canAccessRoute(UserRole.MEMBER, '/my-profile')).toBe(true);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/events')).toBe(true);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/competitions')).toBe(true);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/admin')).toBe(false);
      expect(authService.canAccessRoute(UserRole.MEMBER, '/club-dashboard')).toBe(false);
    });
  });

  describe('Cache Management', () => {
    it('should cache profile correctly', async () => {
      const profile = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.MEMBER,
        status: 'active' as const,
        provider: 'google' as const,
        createdAt: new Date().toISOString(),
      };

      // Mock Firestore response
      vi.mocked(doc).mockReturnValue({ id: 'test-uid-123' } as any);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => profile,
      } as any);

      // First call - should fetch from Firestore
      const result1 = await authService.getUserProfile(mockUser, mockFirestore);
      expect(getDoc).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await authService.getUserProfile(mockUser, mockFirestore);
      expect(getDoc).toHaveBeenCalledTimes(1); // Still 1, not called again
      expect(result2).toEqual(result1);
    });

    it('should invalidate cache after TTL', async () => {
      const profile = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.MEMBER,
        status: 'active' as const,
        provider: 'google' as const,
        createdAt: new Date().toISOString(),
      };

      // Cache profile with expired timestamp
      const expiredCache = {
        profile,
        timestamp: Date.now() - (6 * 60 * 1000), // 6 minutes ago
      };
      (authService as any).profileCache.set('test-uid-123', expiredCache);

      // Mock Firestore response
      vi.mocked(doc).mockReturnValue({ id: 'test-uid-123' } as any);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => profile,
      } as any);

      // Should fetch from Firestore due to expired cache
      await authService.getUserProfile(mockUser, mockFirestore);
      expect(getDoc).toHaveBeenCalled();
    });

    it('should clear cache for specific user', () => {
      const profile = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.MEMBER,
        status: 'active' as const,
        provider: 'google' as const,
        createdAt: new Date().toISOString(),
      };

      (authService as any).cacheProfile('test-uid-123', profile);
      (authService as any).cacheProfile('other-uid', profile);

      authService.clearCache('test-uid-123');

      expect((authService as any).profileCache.has('test-uid-123')).toBe(false);
      expect((authService as any).profileCache.has('other-uid')).toBe(true);
    });

    it('should clear entire cache', () => {
      const profile = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.MEMBER,
        status: 'active' as const,
        provider: 'google' as const,
        createdAt: new Date().toISOString(),
      };

      (authService as any).cacheProfile('test-uid-123', profile);
      (authService as any).cacheProfile('other-uid', profile);

      authService.clearCache();

      expect((authService as any).profileCache.size).toBe(0);
    });
  });

  describe('Private Methods', () => {
    describe('isClubRole', () => {
      it('should identify club roles correctly', () => {
        const isClubRole = (authService as any).isClubRole.bind(authService);
        
        expect(isClubRole(UserRole.CLUB_OWNER)).toBe(true);
        expect(isClubRole(UserRole.CLUB_MANAGER)).toBe(true);
        expect(isClubRole(UserRole.CLUB_STAFF)).toBe(true);
        expect(isClubRole(UserRole.HEAD_COACH)).toBe(true);
        expect(isClubRole(UserRole.ASSISTANT_COACH)).toBe(true);
        expect(isClubRole(UserRole.MEDIA_MANAGER)).toBe(true);
        
        expect(isClubRole(UserRole.SUPER_ADMIN)).toBe(false);
        expect(isClubRole(UserRole.FEDERATION_ADMIN)).toBe(false);
        expect(isClubRole(UserRole.MEMBER)).toBe(false);
        expect(isClubRole(UserRole.PARENT)).toBe(false);
      });
    });

    describe('createProfileFromRequest', () => {
      it('should create club owner profile correctly', async () => {
        const request = {
          name: 'Club Owner',
          phoneNumber: '010-9999-8888',
          clubName: 'Best Club',
        };

        // Mock club ID lookup
        vi.mocked(collection).mockReturnValue({ id: 'clubs' } as any);
        vi.mocked(query).mockReturnValue({ id: 'query' } as any);
        vi.mocked(getDocs).mockResolvedValue({
          empty: false,
          docs: [{ id: 'club-999' }],
        } as any);

        const createProfile = (authService as any).createProfileFromRequest.bind(authService);
        const result = await createProfile(mockUser, request, 'clubOwner', mockFirestore);

        expect(result).toMatchObject({
          uid: 'test-uid-123',
          email: 'test@example.com',
          displayName: 'Club Owner',
          phoneNumber: '010-9999-8888',
          role: UserRole.CLUB_OWNER,
          clubId: 'club-999',
          clubName: 'Best Club',
          status: 'active',
        });
      });

      it('should create super admin profile correctly', async () => {
        const request = {
          name: 'Super Admin',
          phoneNumber: '010-0000-0000',
        };

        const createProfile = (authService as any).createProfileFromRequest.bind(authService);
        const result = await createProfile(mockUser, request, 'superAdmin', mockFirestore);

        expect(result).toMatchObject({
          uid: 'test-uid-123',
          email: 'test@example.com',
          displayName: 'Super Admin',
          phoneNumber: '010-0000-0000',
          role: UserRole.SUPER_ADMIN,
          status: 'active',
        });
      });

      it('should create member profile correctly', async () => {
        const request = {
          name: 'Regular Member',
          phoneNumber: '010-1111-2222',
          clubId: 'club-123',
          clubName: 'My Club',
        };

        const createProfile = (authService as any).createProfileFromRequest.bind(authService);
        const result = await createProfile(mockUser, request, 'member', mockFirestore);

        expect(result).toMatchObject({
          uid: 'test-uid-123',
          email: 'test@example.com',
          displayName: 'Regular Member',
          phoneNumber: '010-1111-2222',
          role: UserRole.MEMBER,
          clubId: 'club-123',
          clubName: 'My Club',
          status: 'active',
        });
      });
    });

    describe('getClubId', () => {
      it('should return club ID when found', async () => {
        vi.mocked(collection).mockReturnValue({ id: 'clubs' } as any);
        vi.mocked(query).mockReturnValue({ id: 'query' } as any);
        vi.mocked(getDocs).mockResolvedValue({
          empty: false,
          docs: [{ id: 'found-club-id' }],
        } as any);

        const getClubId = (authService as any).getClubId.bind(authService);
        const result = await getClubId(mockFirestore, 'Test Club');

        expect(result).toBe('found-club-id');
      });

      it('should return null when club not found', async () => {
        vi.mocked(collection).mockReturnValue({ id: 'clubs' } as any);
        vi.mocked(query).mockReturnValue({ id: 'query' } as any);
        vi.mocked(getDocs).mockResolvedValue({
          empty: true,
          docs: [],
        } as any);

        const getClubId = (authService as any).getClubId.bind(authService);
        const result = await getClubId(mockFirestore, 'Non-existent Club');

        expect(result).toBeNull();
      });

      it('should return null on error', async () => {
        vi.mocked(collection).mockImplementation(() => {
          throw new Error('Firestore error');
        });

        const getClubId = (authService as any).getClubId.bind(authService);
        const result = await getClubId(mockFirestore, 'Test Club');

        expect(result).toBeNull();
      });
    });
  });
});
