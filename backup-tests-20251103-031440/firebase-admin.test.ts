import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  initAdmin, 
  getAdminAuth, 
  getAdminFirestore, 
  verifyIdToken, 
  getUserRole 
} from '../firebase-admin';

// Mock firebase-admin modules
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  cert: vi.fn((obj) => obj),
  getApps: vi.fn(() => [])
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: vi.fn()
  }))
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn()
      }))
    }))
  }))
}));

// Mock cache module
vi.mock('@/lib/cache', () => ({
  userCache: {
    get: vi.fn(),
    set: vi.fn()
  },
  cacheKeys: {
    userRole: vi.fn((uid) => `user:role:${uid}`)
  }
}));

describe('Firebase Admin SDK', () => {
  let originalEnv: NodeJS.ProcessEnv;
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module state
    vi.resetModules();
    originalEnv = { ...process.env };
  });
  
  afterEach(() => {
    process.env = originalEnv;
  });

  describe('initAdmin', () => {
    it('should initialize with service account when available', async () => {
      const { initializeApp, cert, getApps } = await import('firebase-admin/app');
      const mockApp = { name: 'test-app' };
      (initializeApp as any).mockReturnValue(mockApp);
      (getApps as any).mockReturnValue([]);
      
      const serviceAccount = {
        project_id: 'test-project',
        private_key: 'test-key',
        client_email: 'test@test.com'
      };
      
      process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY = JSON.stringify(serviceAccount);
      
      // Re-import to get fresh module
      const { initAdmin: freshInitAdmin } = await import('../firebase-admin');
      const app = freshInitAdmin();
      
      expect(cert).toHaveBeenCalledWith(serviceAccount);
      expect(initializeApp).toHaveBeenCalledWith({
        credential: serviceAccount,
        projectId: 'test-project'
      });
      expect(app).toBeDefined();
    });

    it('should fallback to default credentials on invalid service account', async () => {
      const { initializeApp, getApps } = await import('firebase-admin/app');
      const mockApp = { name: 'fallback-app' };
      (initializeApp as any).mockReturnValue(mockApp);
      (getApps as any).mockReturnValue([]);
      
      process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY = 'invalid-json';
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'fallback-project';
      
      const { initAdmin: freshInitAdmin } = await import('../firebase-admin');
      freshInitAdmin();
      
      expect(initializeApp).toHaveBeenCalledWith({
        projectId: 'fallback-project'
      });
    });

    it('should use default project ID when no env vars set', async () => {
      const { initializeApp, getApps } = await import('firebase-admin/app');
      const mockApp = { name: 'default-app' };
      (initializeApp as any).mockReturnValue(mockApp);
      (getApps as any).mockReturnValue([]);
      
      delete process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY;
      delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      
      const { initAdmin: freshInitAdmin } = await import('../firebase-admin');
      freshInitAdmin();
      
      expect(initializeApp).toHaveBeenCalledWith({
        projectId: 'studio-2481293716-bdd83'
      });
    });

    it('should reuse existing app if already initialized', async () => {
      const { getApps, initializeApp } = await import('firebase-admin/app');
      const mockApp = { name: 'existing-app' };
      
      (getApps as any).mockReturnValue([mockApp]);
      
      const { initAdmin: freshInitAdmin } = await import('../firebase-admin');
      const app = freshInitAdmin();
      
      expect(app).toBe(mockApp);
      expect(initializeApp).not.toHaveBeenCalled();
    });

    it('should return same instance on multiple calls', async () => {
      const { initializeApp, getApps } = await import('firebase-admin/app');
      const mockApp = { name: 'singleton-app' };
      (initializeApp as any).mockReturnValue(mockApp);
      (getApps as any).mockReturnValue([]);
      
      const { initAdmin: freshInitAdmin } = await import('../firebase-admin');
      
      const app1 = freshInitAdmin();
      const app2 = freshInitAdmin();
      
      expect(app1).toBe(app2);
    });
  });

  describe('getAdminAuth', () => {
    it('should initialize app and return auth instance', async () => {
      const { getAuth } = await import('firebase-admin/auth');
      const mockAuth = { verifyIdToken: vi.fn() };
      (getAuth as any).mockReturnValue(mockAuth);
      
      const { getAdminAuth: freshGetAdminAuth } = await import('../firebase-admin');
      const auth = freshGetAdminAuth();
      
      expect(getAuth).toHaveBeenCalled();
      expect(auth).toBe(mockAuth);
    });
  });

  describe('getAdminFirestore', () => {
    it('should initialize app and return firestore instance', async () => {
      const { getFirestore } = await import('firebase-admin/firestore');
      const mockFirestore = { collection: vi.fn() };
      (getFirestore as any).mockReturnValue(mockFirestore);
      
      const { getAdminFirestore: freshGetAdminFirestore } = await import('../firebase-admin');
      const firestore = freshGetAdminFirestore();
      
      expect(getFirestore).toHaveBeenCalled();
      expect(firestore).toBe(mockFirestore);
    });
  });

  describe('verifyIdToken', () => {
    it('should verify valid token successfully', async () => {
      const { getAuth } = await import('firebase-admin/auth');
      const mockDecodedToken = { 
        uid: 'user123', 
        email: 'test@test.com' 
      };
      const mockAuth = {
        verifyIdToken: vi.fn().mockResolvedValue(mockDecodedToken)
      };
      (getAuth as any).mockReturnValue(mockAuth);
      
      const { verifyIdToken: freshVerifyIdToken } = await import('../firebase-admin');
      const result = await freshVerifyIdToken('valid-token');
      
      expect(mockAuth.verifyIdToken).toHaveBeenCalledWith('valid-token');
      expect(result).toEqual(mockDecodedToken);
    });

    it('should return null for invalid token', async () => {
      const { getAuth } = await import('firebase-admin/auth');
      const mockAuth = {
        verifyIdToken: vi.fn().mockRejectedValue(new Error('Invalid token'))
      };
      (getAuth as any).mockReturnValue(mockAuth);
      
      const { verifyIdToken: freshVerifyIdToken } = await import('../firebase-admin');
      const result = await freshVerifyIdToken('invalid-token');
      
      expect(result).toBeNull();
    });

    it('should handle undefined token', async () => {
      const { getAuth } = await import('firebase-admin/auth');
      const mockAuth = {
        verifyIdToken: vi.fn().mockRejectedValue(new Error('Token required'))
      };
      (getAuth as any).mockReturnValue(mockAuth);
      
      const { verifyIdToken: freshVerifyIdToken } = await import('../firebase-admin');
      const result = await freshVerifyIdToken('');
      
      expect(result).toBeNull();
    });
  });

  describe('getUserRole', () => {
    const mockUserData = {
      role: 'MEMBER',
      status: 'active',
      clubId: 'club123',
      clubName: 'Test Club'
    };

    it('should fetch user role from Firestore', async () => {
      const { getFirestore } = await import('firebase-admin/firestore');
      const { userCache } = await import('@/lib/cache');
      
      const mockDoc = {
        exists: true,
        data: () => mockUserData
      };
      const mockFirestore = {
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn().mockResolvedValue(mockDoc)
          }))
        }))
      };
      
      (getFirestore as any).mockReturnValue(mockFirestore);
      (userCache.get as any).mockReturnValue(null);
      
      const { getUserRole: freshGetUserRole } = await import('../firebase-admin');
      const result = await freshGetUserRole('user123');
      
      expect(result).toEqual({
        role: 'MEMBER',
        status: 'active',
        clubId: 'club123',
        clubName: 'Test Club'
      });
      expect(userCache.set).toHaveBeenCalledWith(
        'user:role:user123',
        expect.objectContaining(mockUserData),
        300000
      );
    });

    it('should return cached value when available', async () => {
      const { userCache } = await import('@/lib/cache');
      const cachedData = {
        role: 'CACHED_ROLE',
        status: 'cached',
        clubId: 'cached123',
        clubName: 'Cached Club'
      };
      
      (userCache.get as any).mockReturnValue(cachedData);
      
      const { getUserRole: freshGetUserRole } = await import('../firebase-admin');
      const result = await freshGetUserRole('user123', true);
      
      expect(result).toEqual(cachedData);
      expect(userCache.get).toHaveBeenCalledWith('user:role:user123');
    });

    it('should bypass cache when useCache is false', async () => {
      const { getFirestore } = await import('firebase-admin/firestore');
      const { userCache } = await import('@/lib/cache');
      
      const mockDoc = {
        exists: true,
        data: () => mockUserData
      };
      const mockFirestore = {
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn().mockResolvedValue(mockDoc)
          }))
        }))
      };
      
      (getFirestore as any).mockReturnValue(mockFirestore);
      (userCache.get as any).mockReturnValue({ cached: 'value' });
      
      const { getUserRole: freshGetUserRole } = await import('../firebase-admin');
      const result = await freshGetUserRole('user123', false);
      
      expect(userCache.get).not.toHaveBeenCalled();
      expect(userCache.set).not.toHaveBeenCalled();
      expect(result).toEqual(mockUserData);
    });

    it('should return null for non-existent user', async () => {
      const { getFirestore } = await import('firebase-admin/firestore');
      const { userCache } = await import('@/lib/cache');
      
      const mockDoc = {
        exists: false,
        data: () => null
      };
      const mockFirestore = {
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn().mockResolvedValue(mockDoc)
          }))
        }))
      };
      
      (getFirestore as any).mockReturnValue(mockFirestore);
      (userCache.get as any).mockReturnValue(null);
      
      const { getUserRole: freshGetUserRole } = await import('../firebase-admin');
      const result = await freshGetUserRole('nonexistent');
      
      expect(result).toBeNull();
      expect(userCache.set).not.toHaveBeenCalled();
    });

    it('should handle Firestore errors gracefully', async () => {
      const { getFirestore } = await import('firebase-admin/firestore');
      const { userCache } = await import('@/lib/cache');
      
      const mockFirestore = {
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn().mockRejectedValue(new Error('Firestore error'))
          }))
        }))
      };
      
      (getFirestore as any).mockReturnValue(mockFirestore);
      (userCache.get as any).mockReturnValue(null);
      
      const { getUserRole: freshGetUserRole } = await import('../firebase-admin');
      
      await expect(getUserRole('user123')).rejects.toThrow('Firestore error');
    });

    it('should handle missing user data fields', async () => {
      const { getFirestore } = await import('firebase-admin/firestore');
      const { userCache } = await import('@/lib/cache');
      
      const mockDoc = {
        exists: true,
        data: () => ({ role: 'MEMBER' }) // Missing other fields
      };
      const mockFirestore = {
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn().mockResolvedValue(mockDoc)
          }))
        }))
      };
      
      (getFirestore as any).mockReturnValue(mockFirestore);
      (userCache.get as any).mockReturnValue(null);
      
      const { getUserRole: freshGetUserRole } = await import('../firebase-admin');
      const result = await freshGetUserRole('user123');
      
      expect(result).toEqual({
        role: 'MEMBER',
        status: undefined,
        clubId: undefined,
        clubName: undefined
      });
    });

    it('should handle null document', async () => {
      const { getFirestore } = await import('firebase-admin/firestore');
      const { userCache } = await import('@/lib/cache');
      
      const mockFirestore = {
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn().mockResolvedValue(null)
          }))
        }))
      };
      
      (getFirestore as any).mockReturnValue(mockFirestore);
      (userCache.get as any).mockReturnValue(null);
      
      const { getUserRole: freshGetUserRole } = await import('../firebase-admin');
      const result = await freshGetUserRole('user123');
      
      expect(result).toBeNull();
    });
  });
});
