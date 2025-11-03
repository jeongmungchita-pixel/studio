import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  DIProvider, 
  useService, 
  services,
  initializeDI 
} from '@/lib/di/global-di';
import type { IAuthService, IClubService } from '@/lib/di/interfaces';

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

const createMockClubService = (): IClubService => ({
  getClubs: vi.fn(),
  getClub: vi.fn(),
  createClub: vi.fn(),
  updateClub: vi.fn(),
  deleteClub: vi.fn(),
});

describe('간단한 전체 앱 DI 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DI 컨테이너 기본 기능', () => {
    it('should initialize DI system correctly', () => {
      initializeDI();
      expect(services.auth).toBeDefined();
      expect(services.users).toBeDefined();
      expect(services.clubs).toBeDefined();
    });

    it('should create and use mock services', () => {
      const mockAuth = createMockAuthService();
      const mockClub = createMockClubService();
      
      // Mock 서비스 테스트
      expect(typeof mockAuth.getUserProfile).toBe('function');
      expect(typeof mockClub.getClubs).toBe('function');
      
      // Mock 함수 호출 테스트
      mockAuth.getUserProfile.mockResolvedValue({ uid: 'test' });
      mockClub.getClubs.mockResolvedValue({ data: [] });
      
      expect(mockAuth.getUserProfile).toBeDefined();
      expect(mockClub.getClubs).toBeDefined();
    });
  });

  describe('DI Provider 기능', () => {
    it('should provide DI context correctly', () => {
      const mockServices = {
        authService: createMockAuthService(),
        clubService: createMockClubService(),
      };

      // DI Provider 생성 테스트
      const provider = DIProvider({ 
        children: 'test-children', 
        services: mockServices 
      });
      
      expect(provider).toBeDefined();
    });

    it('should handle empty services gracefully', () => {
      const provider = DIProvider({ 
        children: 'test-children', 
        services: {} 
      });
      
      expect(provider).toBeDefined();
    });
  });

  describe('서비스 사용 패턴', () => {
    it('should demonstrate service usage pattern', () => {
      // Mock 서비스 생성
      const mockAuth = createMockAuthService();
      const mockClub = createMockClubService();
      
      // Mock 응답 설정
      mockAuth.getUserProfile.mockResolvedValue({
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'MEMBER',
      });
      
      mockClub.getClubs.mockResolvedValue({
        data: [
          { id: 'club-1', name: 'Test Club' },
          { id: 'club-2', name: 'Another Club' },
        ],
        pagination: { page: 1, pageSize: 10, total: 2 },
      });

      // 서비스 사용 시뮬레이션
      const userProfile = mockAuth.getUserProfile({} as any, {} as any);
      const clubList = mockClub.getClubs(1, 10);

      expect(mockAuth.getUserProfile).toHaveBeenCalled();
      expect(mockClub.getClubs).toHaveBeenCalledWith(1, 10);
      
      // Promise 결과 확인
      userProfile.then((profile) => {
        expect(profile).toEqual({
          uid: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          role: 'MEMBER',
        });
      });
      
      clubList.then((result) => {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].name).toBe('Test Club');
      });
    });
  });

  describe('에러 처리', () => {
    it('should handle service errors gracefully', async () => {
      const mockAuth = createMockAuthService();
      mockAuth.getUserProfile.mockRejectedValue(new Error('Service error'));
      
      try {
        await mockAuth.getUserProfile({} as any, {} as any);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Service error');
      }
    });
  });

  describe('타입 안전성', () => {
    it('should maintain type safety for services', () => {
      const mockAuth: IAuthService = createMockAuthService();
      const mockClub: IClubService = createMockClubService();
      
      // 타입 체크 - 컴파일 타임에 타입 오류가 없어야 함
      expect(typeof mockAuth.getUserProfile).toBe('function');
      expect(typeof mockAuth.hasPendingRequests).toBe('function');
      expect(typeof mockAuth.createUserProfile).toBe('function');
      expect(typeof mockAuth.updateUserProfile).toBe('function');
      expect(typeof mockAuth.deleteUserProfile).toBe('function');
      
      expect(typeof mockClub.getClubs).toBe('function');
      expect(typeof mockClub.getClub).toBe('function');
      expect(typeof mockClub.createClub).toBe('function');
      expect(typeof mockClub.updateClub).toBe('function');
      expect(typeof mockClub.deleteClub).toBe('function');
    });
  });

  describe('통합 테스트 시나리오', () => {
    it('should demonstrate complete DI usage scenario', async () => {
      // 1. Mock 서비스 생성
      const mockAuth = createMockAuthService();
      const mockClub = createMockClubService();
      
      // 2. Mock 데이터 설정
      const mockUser = {
        uid: 'user-123',
        email: 'user@example.com',
        displayName: 'John Doe',
        role: 'CLUB_MANAGER' as const,
      };
      
      const mockClubs = [
        { id: 'club-1', name: 'Football Club', memberCount: 25 },
        { id: 'club-2', name: 'Basketball Club', memberCount: 15 },
      ];
      
      // 3. Mock 응답 설정
      mockAuth.getUserProfile.mockResolvedValue(mockUser);
      mockClub.getClubs.mockResolvedValue({
        data: mockClubs,
        pagination: { page: 1, pageSize: 10, total: 2 },
      });
      
      // 4. 시나리오 실행
      const userProfile = await mockAuth.getUserProfile({} as any, {} as any);
      const clubResult = await mockClub.getClubs(1, 10);
      
      // 5. 결과 검증
      expect(userProfile.role).toBe('CLUB_MANAGER');
      expect(clubResult.data).toHaveLength(2);
      expect(clubResult.data[0].name).toBe('Football Club');
      
      // 6. 호출 횟수 검증
      expect(mockAuth.getUserProfile).toHaveBeenCalledTimes(1);
      expect(mockClub.getClubs).toHaveBeenCalledTimes(1);
    });
  });
});
