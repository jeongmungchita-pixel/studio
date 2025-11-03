import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuthService } from '@/lib/di/auth-service';
import { diContainer } from '@/lib/di/di-container';
import type { IAuthService, IAPIClient } from '@/lib/di/interfaces';

// Mock API Client
const mockAPIClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
} as unknown as IAPIClient;

describe('AuthService with DI', () => {
  let authService: IAuthService;

  beforeEach(async () => {
    vi.resetAllMocks();
    
    // DI 컨테이너에 Mock 직접 등록
    diContainer.registerInstance('apiClient', mockAPIClient);
    
    // AuthService 인스턴스 직접 생성
    authService = new AuthService(mockAPIClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
    diContainer.reset();
  });

  describe('getUserProfile', () => {
    it('Firebase 사용자 정보로 프로필 조회 성공', async () => {
      const mockFirebaseUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
      };
      
      const mockFirestore = {};
      
      const mockProfile = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'MEMBER',
        status: 'active',
      };

      mockAPIClient.get.mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      const result = await authService.getUserProfile(mockFirebaseUser as any, mockFirestore as any);

      expect(result).toEqual(mockProfile);
      expect(mockAPIClient.get).toHaveBeenCalledWith('/auth/profile/test-uid');
    });

    it('프로필 조회 실패 시 에러 발생', async () => {
      const mockFirebaseUser = {
        uid: 'test-uid',
        email: 'test@example.com',
      };
      
      const mockFirestore = {};

      mockAPIClient.get.mockResolvedValue({
        success: false,
        error: { message: 'User not found' },
      });

      await expect(authService.getUserProfile(mockFirebaseUser as any, mockFirestore as any))
        .rejects.toThrow('User not found');
    });
  });

  describe('hasPendingRequests', () => {
    it('보류 중인 요청이 있는 경우 true 반환', async () => {
      const mockFirestore = {};

      mockAPIClient.get.mockResolvedValue({
        success: true,
        data: { hasPending: true },
      });

      const result = await authService.hasPendingRequests('test-uid', mockFirestore as any);

      expect(result).toBe(true);
      expect(mockAPIClient.get).toHaveBeenCalledWith('/auth/pending-requests/test-uid');
    });

    it('보류 중인 요청이 없는 경우 false 반환', async () => {
      const mockFirestore = {};

      mockAPIClient.get.mockResolvedValue({
        success: true,
        data: { hasPending: false },
      });

      const result = await authService.hasPendingRequests('test-uid', mockFirestore as any);

      expect(result).toBe(false);
    });

    it('API 호출 실패 시 false 반환', async () => {
      const mockFirestore = {};

      mockAPIClient.get.mockResolvedValue({
        success: false,
        error: { message: 'API Error' },
      });

      const result = await authService.hasPendingRequests('test-uid', mockFirestore as any);

      expect(result).toBe(false);
    });
  });

  describe('getRedirectUrl', () => {
    it('역할별 올바른 리다이렉트 URL 반환', () => {
      expect(authService.getRedirectUrl('SUPER_ADMIN')).toBe('/super-admin');
      expect(authService.getRedirectUrl('FEDERATION_ADMIN')).toBe('/admin');
      expect(authService.getRedirectUrl('CLUB_OWNER')).toBe('/club-dashboard');
      expect(authService.getRedirectUrl('MEMBER')).toBe('/member');
      expect(authService.getRedirectUrl('PARENT')).toBe('/my-profile');
    });

    it('알 수 없는 역할의 경우 기본 URL 반환', () => {
      expect(authService.getRedirectUrl('UNKNOWN_ROLE')).toBe('/dashboard');
    });
  });

  describe('login', () => {
    it('이메일과 비밀번호로 로그인 성공', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'MEMBER',
      };

      mockAPIClient.post.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await (authService as any).login(credentials);

      expect(result).toEqual(mockUser);
      expect(mockAPIClient.post).toHaveBeenCalledWith('/auth/login', credentials);
    });

    it('로그인 실패 시 에러 발생', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      mockAPIClient.post.mockResolvedValue({
        success: false,
        error: { message: 'Invalid credentials' },
      });

      await expect((authService as any).login(credentials))
        .rejects.toThrow('Invalid credentials');
    });
  });
});
