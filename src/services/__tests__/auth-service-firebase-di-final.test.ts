import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../auth-service';

describe('AuthService Firebase DI - Final Version', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = AuthService.createWithDI();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('DI 기본 기능', () => {
    it('should create instance with DI', () => {
      expect(authService).toBeInstanceOf(AuthService);
    });

    it('should have createWithDI method', () => {
      expect(typeof AuthService.createWithDI).toBe('function');
    });

    it('should implement IAuthService interface', () => {
      expect(typeof authService.getUserProfile).toBe('function');
      expect(typeof authService.hasPendingRequests).toBe('function');
      expect(typeof authService.createUserProfile).toBe('function');
      expect(typeof authService.updateUserProfile).toBe('function');
      expect(typeof authService.deleteUserProfile).toBe('function');
      expect(typeof authService.getRedirectUrl).toBe('function');
    });
  });

  describe('유틸리티 기능 (Firebase 없이)', () => {
    it('should return correct redirect URLs', () => {
      expect(authService.getRedirectUrl('SUPER_ADMIN')).toBe('/admin/dashboard');
      expect(authService.getRedirectUrl('FEDERATION_ADMIN')).toBe('/admin/dashboard');
      expect(authService.getRedirectUrl('CLUB_OWNER')).toBe('/club-dashboard');
      expect(authService.getRedirectUrl('CLUB_MANAGER')).toBe('/club-dashboard');
      expect(authService.getRedirectUrl('HEAD_COACH')).toBe('/coach-dashboard');
      expect(authService.getRedirectUrl('ASSISTANT_COACH')).toBe('/coach-dashboard');
      expect(authService.getRedirectUrl('MEMBER')).toBe('/dashboard');
      expect(authService.getRedirectUrl('PARENT')).toBe('/dashboard');
    });

    it('should handle unknown roles', () => {
      expect(authService.getRedirectUrl('UNKNOWN_ROLE')).toBe('/dashboard');
    });
  });

  describe('캐시 기능 테스트', () => {
    it('should handle cache TTL', async () => {
      // Mock Firestore 객체
      const mockFirestore = {
        doc: vi.fn(),
        getDoc: vi.fn(),
        collection: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        getDocs: vi.fn(),
        setDoc: vi.fn(),
        updateDoc: vi.fn(),
        deleteDoc: vi.fn(),
      };

      const mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
      };

      const mockProfile = {
        uid: mockUser.uid,
        email: mockUser.email,
        displayName: mockUser.displayName,
        role: 'MEMBER',
        status: 'active',
      };

      // Mock 설정
      mockFirestore.doc.mockReturnValue('mock-doc-ref');
      mockFirestore.getDoc.mockResolvedValue({
        exists: true,
        id: mockUser.uid,
        data: () => mockProfile,
      });

      // 첫 번째 호출
      const result1 = await authService.getUserProfile(mockUser, mockFirestore as any);
      expect(result1).toEqual(mockProfile);
      expect(mockFirestore.getDoc).toHaveBeenCalledTimes(1);

      // 캐시된 두 번째 호출
      const result2 = await authService.getUserProfile(mockUser, mockFirestore as any);
      expect(result2).toEqual(mockProfile);
      expect(mockFirestore.getDoc).toHaveBeenCalledTimes(1); // 호출 횟수 증가 안 함

      // 캐시 TTL 경과 후
      vi.advanceTimersByTime(6 * 60 * 1000); // 6분
      const result3 = await authService.getUserProfile(mockUser, mockFirestore as any);
      expect(result3).toEqual(mockProfile);
      expect(mockFirestore.getDoc).toHaveBeenCalledTimes(2); // 새로 호출
    });
  });

  describe('에러 처리', () => {
    it('should handle null user gracefully', async () => {
      const mockFirestore = {} as any;
      
      const result = await authService.getUserProfile(null as any, mockFirestore);
      expect(result).toBeNull();
    });

    it('should handle empty user UID gracefully', async () => {
      const mockFirestore = {} as any;
      const mockUser = { uid: '' };
      
      const result = await authService.getUserProfile(mockUser as any, mockFirestore);
      expect(result).toBeNull();
    });
  });

  describe('인터페이스 준수 확인', () => {
    it('should have all required IAuthService methods', () => {
      const requiredMethods = [
        'getUserProfile',
        'hasPendingRequests',
        'createUserProfile',
        'updateUserProfile',
        'deleteUserProfile',
      ];

      requiredMethods.forEach(method => {
        expect(typeof (authService as any)[method]).toBe('function');
      });
    });
  });
});
