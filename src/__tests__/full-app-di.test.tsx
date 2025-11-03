import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { 
  DIProvider, 
  useService, 
  useFirebaseService,
  services,
  initializeDI 
} from '@/lib/di/global-di';
import { DIUserInfo, DIClubList, DIDashboard } from '@/components/common/di-component';
import { useUserDI } from '@/hooks/use-user-di';
import type { IAuthService, IClubService, IFirebaseService } from '@/lib/di/interfaces';

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

const createMockFirebaseService = (): IFirebaseService => ({
  getFirestore: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChanged: vi.fn(),
});

describe('전체 앱 DI 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initializeDI();
  });

  describe('DI 컨테이너 기능', () => {
    it('should initialize DI system', () => {
      expect(services.auth).toBeDefined();
      expect(services.users).toBeDefined();
      expect(services.clubs).toBeDefined();
    });

    it('should resolve services correctly', () => {
      const mockAuth = createMockAuthService();
      const mockClub = createMockClubService();
      
      // Mock 서비스 등록
      vi.mocked(services.auth).getUserProfile = mockAuth.getUserProfile;
      vi.mocked(services.clubs).getClubs = mockClub.getClubs;
      
      expect(typeof services.auth.getUserProfile).toBe('function');
      expect(typeof services.clubs.getClubs).toBe('function');
    });
  });

  describe('Hooks DI 테스트', () => {
    it('should use service through DI in hook', () => {
      const mockAuth = createMockAuthService();
      const mockFirebase = createMockFirebaseService();
      
      // Mock 설정
      mockAuth.getUserProfile.mockResolvedValue({
        uid: 'test-user',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'MEMBER',
      });
      
      mockFirebase.getCurrentUser.mockReturnValue({
        uid: 'test-user',
        email: 'test@example.com',
      });
      
      mockFirebase.getFirestore.mockReturnValue({});

      // Test Hook Wrapper
      function TestHookComponent() {
        const authService = useService<IAuthService>('authService');
        const firebaseService = useFirebaseService();
        
        React.useEffect(() => {
          const user = firebaseService.getCurrentUser();
          if (user) {
            authService.getUserProfile(user, firebaseService.getFirestore());
          }
        }, [authService, firebaseService]);
        
        return <div>Hook Test</div>;
      }

      render(
        <DIProvider 
          services={{
            authService: mockAuth,
            firebaseService: mockFirebase,
          }}
        >
          <TestHookComponent />
        </DIProvider>
      );

      expect(screen.getByText('Hook Test')).toBeInTheDocument();
    });

    it('should handle useUserDI hook correctly', async () => {
      const mockAuth = createMockAuthService();
      const mockFirebase = createMockFirebaseService();
      
      mockAuth.getUserProfile.mockResolvedValue({
        uid: 'test-user',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'MEMBER',
      });
      
      mockFirebase.getCurrentUser.mockReturnValue({
        uid: 'test-user',
        email: 'test@example.com',
      });
      
      mockFirebase.getFirestore.mockReturnValue({});
      mockFirebase.onAuthStateChanged = vi.fn((callback) => {
        callback(mockFirebase.getCurrentUser());
        return () => {}; // unsubscribe function
      });

      function TestUserComponent() {
        const { _user, isUserLoading } = useUserDI();
        
        if (isUserLoading) return <div>Loading...</div>;
        if (!_user) return <div>No user</div>;
        
        return <div>{_user.displayName}</div>;
      }

      render(
        <DIProvider 
          services={{
            authService: mockAuth,
            firebaseService: mockFirebase,
          }}
        >
          <TestUserComponent />
        </DIProvider>
      );

      expect(await screen.findByText('Test User')).toBeInTheDocument();
    });
  });

  describe('컴포넌트 DI 테스트', () => {
    it('should render DIUserInfo with mocked services', async () => {
      const mockAuth = createMockAuthService();
      const mockFirebase = createMockFirebaseService();
      
      mockAuth.getUserProfile.mockResolvedValue({
        uid: 'test-user',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'MEMBER',
      });
      
      mockFirebase.getCurrentUser.mockReturnValue({
        uid: 'test-user',
        email: 'test@example.com',
      });
      
      mockFirebase.getFirestore.mockReturnValue({});

      render(
        <DIProvider 
          services={{
            authService: mockAuth,
            firebaseService: mockFirebase,
          }}
        >
          <DIUserInfo />
        </DIProvider>
      );

      expect(await screen.findByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('역할: MEMBER')).toBeInTheDocument();
    });

    it('should render DIClubList with mocked services', async () => {
      const mockClub = createMockClubService();
      
      mockClub.getClubs.mockResolvedValue({
        data: [
          { id: '1', name: 'Test Club 1', description: 'Description 1' },
          { id: '2', name: 'Test Club 2', description: 'Description 2' },
        ],
        pagination: { page: 1, pageSize: 10, total: 2 },
      });

      render(
        <DIProvider 
          services={{
            clubService: mockClub,
          }}
        >
          <DIClubList />
        </DIProvider>
      );

      expect(await screen.findByText('클럽 목록')).toBeInTheDocument();
      expect(screen.getByText('Test Club 1')).toBeInTheDocument();
      expect(screen.getByText('Test Club 2')).toBeInTheDocument();
    });
  });

  describe('통합 DI 테스트', () => {
    it('should render complete dashboard with all DI services', async () => {
      const mockAuth = createMockAuthService();
      const mockClub = createMockClubService();
      const mockFirebase = createMockFirebaseService();
      const mockNotification = {
        getNotifications: vi.fn(),
        markAsRead: vi.fn(),
      };
      
      // Mock 설정
      mockAuth.getUserProfile.mockResolvedValue({
        uid: 'test-user',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'MEMBER',
      });
      
      mockFirebase.getCurrentUser.mockReturnValue({
        uid: 'test-user',
        email: 'test@example.com',
      });
      
      mockFirebase.getFirestore.mockReturnValue({});
      
      mockClub.getClubs.mockResolvedValue({
        data: [{ id: '1', name: 'Test Club', description: 'Test Description' }],
        pagination: { page: 1, pageSize: 10, total: 1 },
      });
      
      mockNotification.getNotifications.mockResolvedValue({
        data: [
          { id: '1', message: 'Test Notification', read: false },
        ],
      });

      render(
        <DIProvider 
          services={{
            authService: mockAuth,
            clubService: mockClub,
            firebaseService: mockFirebase,
            notificationService: mockNotification,
          }}
        >
          <DIDashboard />
        </DIProvider>
      );

      // 대시보드 제목 확인
      expect(await screen.findByText('Federation 대시보드')).toBeInTheDocument();
      
      // 사용자 정보 확인
      expect(screen.getByText('Test User')).toBeInTheDocument();
      
      // 클럽 정보 확인
      expect(screen.getByText('Test Club')).toBeInTheDocument();
      
      // 알림 정보 확인
      expect(screen.getByText('Test Notification')).toBeInTheDocument();
    });
  });

  describe('DI 에러 처리', () => {
    it('should handle service errors gracefully', async () => {
      const mockAuth = createMockAuthService();
      const mockFirebase = createMockFirebaseService();
      
      mockAuth.getUserProfile.mockRejectedValue(new Error('Service error'));
      mockFirebase.getCurrentUser.mockReturnValue({
        uid: 'test-user',
        email: 'test@example.com',
      });
      mockFirebase.getFirestore.mockReturnValue({});

      render(
        <DIProvider 
          services={{
            authService: mockAuth,
            firebaseService: mockFirebase,
          }}
        >
          <DIUserInfo />
        </DIProvider>
      );

      expect(await screen.findByText('사용자 정보 없음')).toBeInTheDocument();
    });
  });
});
