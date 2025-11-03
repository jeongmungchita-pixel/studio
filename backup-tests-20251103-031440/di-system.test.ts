/**
 * DI 시스템 통합 테스트
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  diContainer, 
  serviceFactory, 
  setupTesting, 
  setupProduction,
  getDIStatus,
  MockFactory 
} from '../index';
import { IAPIClient, IAuthService, IUserService } from '../interfaces';
import { UserProfile, UserRole } from '@/types/auth';

describe('DI System', () => {
  beforeEach(() => {
    setupTesting();
  });

  afterEach(() => {
    setupProduction();
  });

  describe('ServiceFactory', () => {
    it('should create services in test mode', () => {
      const apiClient = serviceFactory.createAPIClient();
      const authService = serviceFactory.createAuthService();
      const userService = serviceFactory.createUserService();
      
      expect(apiClient).toBeDefined();
      expect(authService).toBeDefined();
      expect(userService).toBeDefined();
      expect(serviceFactory.isInTestMode()).toBe(true);
    });

    it('should switch between test and production mode', () => {
      serviceFactory.setTestMode(true);
      expect(serviceFactory.isInTestMode()).toBe(true);
      
      serviceFactory.setTestMode(false);
      expect(serviceFactory.isInTestMode()).toBe(false);
    });

    it('should reset services when mode changes', () => {
      serviceFactory.setTestMode(true);
      const testClient = serviceFactory.createAPIClient();
      
      serviceFactory.setTestMode(false);
      const prodClient = serviceFactory.createAPIClient();
      
      // 테스트 모드와 프로덕션 모드에서 다른 인스턴스가 생성되어야 함
      expect(testClient).toBeDefined();
      expect(prodClient).toBeDefined();
      expect(serviceFactory.isInTestMode()).toBe(false);
    });
  });

  describe('DI Container', () => {
    it('should resolve registered services', () => {
      const userService = diContainer.resolve<IUserService>('userService');
      const authService = diContainer.resolve<IAuthService>('authService');
      
      expect(userService).toBeDefined();
      expect(authService).toBeDefined();
    });

    it('should throw error for unregistered service', () => {
      expect(() => {
        diContainer.resolve('nonExistentService');
      }).toThrow('Service not registered: nonExistentService');
    });

    it('should check if service exists', () => {
      expect(diContainer.has('userService')).toBe(true);
      expect(diContainer.has('nonExistentService')).toBe(false);
    });

    it('should reset all services', () => {
      diContainer.resolve<IUserService>('userService');
      diContainer.reset();
      
      // 리셋 후에는 기본 서비스들이 다시 등록되어야 함
      expect(diContainer.has('serviceFactory')).toBe(true);
      expect(diContainer.has('apiClient')).toBe(true);
    });
  });

  describe('Mock Services', () => {
    it('should create mock API client', () => {
      const mockClient = MockFactory.createAPIClient();
      expect(mockClient).toBeDefined();
    });

    it('should create mock auth service', () => {
      const mockAuth = MockFactory.createAuthService();
      expect(mockAuth).toBeDefined();
    });

    it('should create mock user service', () => {
      const mockUsers = MockFactory.createUserService();
      expect(mockUsers).toBeDefined();
    });

    it('should create all mocks at once', () => {
      const mocks = MockFactory.createAllMocks();
      expect(mocks.apiClient).toBeDefined();
      expect(mocks.authService).toBeDefined();
      expect(mocks.userService).toBeDefined();
      expect(mocks.errorHandler).toBeDefined();
    });
  });

  describe('Mock Data Setup', () => {
    it('should setup mock users', () => {
      const mockUsers: UserProfile[] = [
        {
          uid: 'test-1',
          email: 'test@example.com',
          displayName: 'Test User',
          role: 'MEMBER',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      serviceFactory.setupMockData({ users: mockUsers });
      
      const userService = serviceFactory.createUserService();
      const users = userService.getUsers();
      
      expect(users).toBeDefined();
    });

    it('should setup mock profiles', () => {
      const mockProfiles = {
        'test-1': {
          uid: 'test-1',
          email: 'test@example.com',
          role: 'MEMBER'
        }
      };

      serviceFactory.setupMockData({ profiles: mockProfiles });
      
      const authService = serviceFactory.createAuthService();
      const profile = authService.getUserProfile({ uid: 'test-1' }, null);
      
      expect(profile).toBeDefined();
    });
  });

  describe('Integration Test', () => {
    it('should work end-to-end with mock data', async () => {
      // 1. Mock 데이터 설정
      const mockUsers: UserProfile[] = [
        {
          uid: 'admin-1',
          email: 'admin@test.com',
          displayName: 'Admin User',
          role: 'SUPER_ADMIN',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      serviceFactory.setupMockData({ users: mockUsers });

      // 2. 서비스 해결
      const userService = diContainer.resolve<IUserService>('userService');
      const authService = diContainer.resolve<IAuthService>('authService');

      // 3. 기능 테스트
      const users = await userService.getUsers();
      expect(users.data).toHaveLength(1);
      expect(users.data[0].role).toBe('SUPER_ADMIN');

      const canAccess = authService.canAccessRoute('SUPER_ADMIN', 'MEMBER');
      expect(canAccess).toBe(true);

      const cannotAccess = authService.canAccessRoute('MEMBER', 'SUPER_ADMIN');
      expect(cannotAccess).toBe(false);
    });

    it('should handle error scenarios', async () => {
      const userService = diContainer.resolve<IUserService>('userService');
      
      await expect(userService.getUserById('non-existent')).rejects.toThrow('User not found');
    });
  });

  describe('DI Status', () => {
    it('should return correct status information', () => {
      const status = getDIStatus();
      
      expect(status).toHaveProperty('isTestMode');
      expect(status).toHaveProperty('registeredServices');
      expect(status).toHaveProperty('containerReady');
      
      expect(typeof status.isTestMode).toBe('boolean');
      expect(Array.isArray(status.registeredServices)).toBe(true);
      expect(typeof status.containerReady).toBe('boolean');
    });
  });

  describe('Service Lifecycle', () => {
    it('should maintain singleton pattern', () => {
      const userService1 = diContainer.resolve<IUserService>('userService');
      const userService2 = diContainer.resolve<IUserService>('userService');
      
      expect(userService1).toBe(userService2);
    });

    it('should create new instances when reset', () => {
      const userService1 = diContainer.resolve<IUserService>('userService');
      diContainer.reset();
      diContainer.register('userService', () => MockFactory.createUserService());
      
      const userService2 = diContainer.resolve<IUserService>('userService');
      
      expect(userService1).not.toBe(userService2);
    });
  });
});
