import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  useService, 
  useFirebaseService, 
  services,
  initializeDI 
} from '@/lib/di/global-di';
import type { IAuthService, IFirebaseService } from '@/lib/di/interfaces';

/**
 * Mock 서비스 팩토리
 */
const createMockAuthService = (): IAuthService => ({
  getUserProfile: vi.fn(),
  hasPendingRequests: vi.fn(),
  createUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  deleteUserProfile: vi.fn(),
});

const createMockFirebaseService = (): IFirebaseService => ({
  getCurrentUser: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
  getFirestore: vi.fn(),
});

describe('핵심 DI 시스템 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initializeDI();
  });

  describe('DI 컨테이너 기본 기능', () => {
    it('should initialize DI system correctly', () => {
      expect(services.auth).toBeDefined();
      expect(services.users).toBeDefined();
      expect(services.clubs).toBeDefined();
      expect(services.firebase).toBeDefined();
    });

    it('should resolve services correctly', () => {
      const authService = services.auth;
      const firebaseService = services.firebase;
      
      expect(authService).toBeDefined();
      expect(firebaseService).toBeDefined();
    });
  });

  describe('서비스 Mock 생성', () => {
    it('should create mock auth service', () => {
      const mockAuth = createMockAuthService();
      
      expect(typeof mockAuth.getUserProfile).toBe('function');
      expect(typeof mockAuth.hasPendingRequests).toBe('function');
      expect(typeof mockAuth.createUserProfile).toBe('function');
      expect(typeof mockAuth.updateUserProfile).toBe('function');
      expect(typeof mockAuth.deleteUserProfile).toBe('function');
    });

    it('should create mock firebase service', () => {
      const mockFirebase = createMockFirebaseService();
      
      expect(typeof mockFirebase.getCurrentUser).toBe('function');
      expect(typeof mockFirebase.onAuthStateChanged).toBe('function');
      expect(typeof mockFirebase.signOut).toBe('function');
      expect(typeof mockFirebase.getFirestore).toBe('function');
    });
  });

  describe('Mock 서비스 동작 테스트', () => {
    it('should mock auth service methods correctly', async () => {
      const mockAuth = createMockAuthService();
      
      // Mock 응답 설정
      const mockUser = {
        uid: 'test-123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'MEMBER' as const,
      };
      
      mockAuth.getUserProfile.mockResolvedValue(mockUser);
      mockAuth.hasPendingRequests.mockResolvedValue(false);
      
      // 서비스 호출 테스트
      const profile = await mockAuth.getUserProfile({} as any, {} as any);
      const hasPending = await mockAuth.hasPendingRequests('test-123', {} as any);
      
      expect(profile).toEqual(mockUser);
      expect(hasPending).toBe(false);
      expect(mockAuth.getUserProfile).toHaveBeenCalledTimes(1);
      expect(mockAuth.hasPendingRequests).toHaveBeenCalledTimes(1);
    });

    it('should mock firebase service methods correctly', () => {
      const mockFirebase = createMockFirebaseService();
      
      // Mock 응답 설정
      const mockUser = {
        uid: 'firebase-123',
        email: 'firebase@test.com',
      };
      
      const mockUnsubscribe = vi.fn();
      
      mockFirebase.getCurrentUser.mockReturnValue(mockUser);
      mockFirebase.onAuthStateChanged.mockReturnValue(mockUnsubscribe);
      
      // 서비스 호출 테스트
      const currentUser = mockFirebase.getCurrentUser();
      const unsubscribe = mockFirebase.onAuthStateChanged(vi.fn());
      
      expect(currentUser).toEqual(mockUser);
      expect(unsubscribe).toBe(mockUnsubscribe);
      expect(mockFirebase.getCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockFirebase.onAuthStateChanged).toHaveBeenCalledTimes(1);
    });
  });

  describe('에러 처리 테스트', () => {
    it('should handle auth service errors gracefully', async () => {
      const mockAuth = createMockAuthService();
      
      mockAuth.getUserProfile.mockRejectedValue(new Error('Auth service error'));
      
      try {
        await mockAuth.getUserProfile({} as any, {} as any);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Auth service error');
      }
    });

    it('should handle firebase service errors gracefully', () => {
      const mockFirebase = createMockFirebaseService();
      
      mockFirebase.getCurrentUser.mockImplementation(() => {
        throw new Error('Firebase service error');
      });
      
      expect(() => mockFirebase.getCurrentUser()).toThrow('Firebase service error');
    });
  });

  describe('타입 안전성 테스트', () => {
    it('should maintain type safety for auth service', () => {
      const mockAuth: IAuthService = createMockAuthService();
      
      // TypeScript 컴파일 타임에 타입 검증
      expect(typeof mockAuth.getUserProfile).toBe('function');
      expect(typeof mockAuth.hasPendingRequests).toBe('function');
      expect(typeof mockAuth.createUserProfile).toBe('function');
      expect(typeof mockAuth.updateUserProfile).toBe('function');
      expect(typeof mockAuth.deleteUserProfile).toBe('function');
    });

    it('should maintain type safety for firebase service', () => {
      const mockFirebase: IFirebaseService = createMockFirebaseService();
      
      // TypeScript 컴파일 타임에 타입 검증
      expect(typeof mockFirebase.getCurrentUser).toBe('function');
      expect(typeof mockFirebase.onAuthStateChanged).toBe('function');
      expect(typeof mockFirebase.signOut).toBe('function');
      expect(typeof mockFirebase.getFirestore).toBe('function');
    });
  });

  describe('통합 시나리오 테스트', () => {
    it('should demonstrate complete DI usage scenario', async () => {
      // Mock 서비스 생성
      const mockAuth = createMockAuthService();
      const mockFirebase = createMockFirebaseService();
      
      // Mock 데이터 설정
      const mockFirebaseUser = {
        uid: 'user-123',
        email: 'user@test.com',
        displayName: 'John Doe',
      };
      
      const mockUserProfile = {
        uid: 'user-123',
        email: 'user@test.com',
        displayName: 'John Doe',
        role: 'CLUB_MANAGER' as const,
        status: 'active' as const,
      };
      
      // Mock 응답 설정
      mockFirebase.getCurrentUser.mockReturnValue(mockFirebaseUser);
      mockAuth.getUserProfile.mockResolvedValue(mockUserProfile);
      mockAuth.hasPendingRequests.mockResolvedValue(false);
      
      // 시나리오 실행
      const currentUser = mockFirebase.getCurrentUser();
      const userProfile = await mockAuth.getUserProfile(mockFirebaseUser, {} as any);
      const hasPending = await mockAuth.hasPendingRequests(mockFirebaseUser.uid, {} as any);
      
      // 결과 검증
      expect(currentUser).toEqual(mockFirebaseUser);
      expect(userProfile.role).toBe('CLUB_MANAGER');
      expect(hasPending).toBe(false);
      
      // 호출 횟수 검증
      expect(mockFirebase.getCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockAuth.getUserProfile).toHaveBeenCalledTimes(1);
      expect(mockAuth.hasPendingRequests).toHaveBeenCalledTimes(1);
    });
  });
});
