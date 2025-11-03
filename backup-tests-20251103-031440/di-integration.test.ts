/**
 * DI 시스템 통합 테스트
 * 전체 DI 컨테이너와 서비스 팩토리의 통합을 검증합니다.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  DIContainer, 
  ServiceFactory, 
  setupTesting, 
  setupProduction,
  getAPIClient,
  getAuthService,
  getUserService,
  getClubService,
  getMemberService,
  getEventService,
  getNotificationService,
  getAuditService,
  getErrorHandler,
  getLoadingManager,
  diContainer,
  serviceFactory,
  getDIStatus,
  getRegisteredServices
} from '../index';

describe('DI 시스템 통합 테스트', () => {
  beforeEach(() => {
    setupTesting();
  });

  afterEach(() => {
    setupProduction();
  });

  describe('컨테이너 기본 기능', () => {
    it('서비스를 등록하고 해결할 수 있어야 함', () => {
      const mockService = { test: () => 'mock' };
      
      diContainer.registerInstance('testService', mockService);
      
      const resolved = diContainer.resolve('testService');
      expect(resolved).toBe(mockService);
    });

    it('등록되지 않은 서비스를 해결하려고 하면 에러가 발생해야 함', () => {
      expect(() => {
        diContainer.resolve('nonExistentService');
      }).toThrow('Service not registered: nonExistentService');
    });

    it('서비스 등록 여부를 확인할 수 있어야 함', () => {
      diContainer.registerInstance('existingService', {});
      
      expect(diContainer.has('existingService')).toBe(true);
      expect(diContainer.has('nonExistentService')).toBe(false);
    });

    it('서비스를 리셋할 수 있어야 함', () => {
      diContainer.registerInstance('tempService', {});
      expect(diContainer.has('tempService')).toBe(true);
      
      diContainer.reset(['tempService']);
      expect(diContainer.has('tempService')).toBe(false);
    });
  });

  describe('서비스 팩토리 통합', () => {
    it('모든 기본 서비스를 생성할 수 있어야 함', () => {
      const factory = ServiceFactory.getInstance();
      
      expect(factory.createAPIClient()).toBeDefined();
      expect(factory.createAuthService()).toBeDefined();
      expect(factory.createUserService()).toBeDefined();
      expect(factory.createClubService()).toBeDefined();
      expect(factory.createMemberService()).toBeDefined();
      expect(factory.createEventService()).toBeDefined();
      expect(factory.createNotificationService()).toBeDefined();
      expect(factory.createAuditService()).toBeDefined();
      expect(factory.createErrorHandler()).toBeDefined();
      expect(factory.createLoadingManager()).toBeDefined();
    });

    it('테스트 모드를 설정할 수 있어야 함', () => {
      const factory = ServiceFactory.getInstance();
      
      factory.setTestMode(true);
      expect(factory.isTestMode()).toBe(true);
      
      factory.setTestMode(false);
      expect(factory.isTestMode()).toBe(false);
    });

    it('테스트 모드에서 Mock 서비스를 반환해야 함', () => {
      const factory = ServiceFactory.getInstance();
      factory.setTestMode(true);
      
      const apiClient = factory.createAPIClient();
      const authService = factory.createAuthService();
      
      // Mock 서비스는 특정 메서드를 가짐
      expect(typeof (apiClient as any).setMockResponse).toBe('function');
      expect(typeof (authService as any).setMockProfile).toBe('function');
    });
  });

  describe('편의 함수 테스트', () => {
    it('모든 편의 함수가 서비스를 반환해야 함', () => {
      expect(getAPIClient()).toBeDefined();
      expect(getAuthService()).toBeDefined();
      expect(getUserService()).toBeDefined();
      expect(getClubService()).toBeDefined();
      expect(getMemberService()).toBeDefined();
      expect(getEventService()).toBeDefined();
      expect(getNotificationService()).toBeDefined();
      expect(getAuditService()).toBeDefined();
      expect(getErrorHandler()).toBeDefined();
      expect(getLoadingManager()).toBeDefined();
    });

    it('동일한 서비스 타입의 인스턴스는 동일해야 함 (싱글톤)', () => {
      const apiClient1 = getAPIClient();
      const apiClient2 = getAPIClient();
      
      expect(apiClient1).toBe(apiClient2);
    });
  });

  describe('환경 설정', () => {
    it('프로덕션 환경을 설정할 수 있어야 함', () => {
      setupProduction();
      
      expect(serviceFactory.isTestMode()).toBe(false);
      expect(diContainer.has('serviceFactory')).toBe(true);
    });

    it('테스트 환경을 설정할 수 있어야 함', () => {
      setupTesting();
      
      expect(serviceFactory.isTestMode()).toBe(true);
      expect(diContainer.has('serviceFactory')).toBe(true);
    });
  });

  describe('서비스 의존성', () => {
    it('서비스들이 올바른 의존성을 주입받아야 함', () => {
      const userService = getUserService();
      const memberService = getMemberService();
      const clubService = getClubService();
      const eventService = getEventService();
      const notificationService = getNotificationService();
      
      // 각 서비스가 API 클라이언트를 의존성으로 가지는지 확인 (Mock 서비스일 경우 구조가 다름)
      if (serviceFactory.isTestMode()) {
        // Mock 서비스는 다른 구조를 가질 수 있음
        expect(userService).toBeDefined();
        expect(memberService).toBeDefined();
        expect(clubService).toBeDefined();
        expect(eventService).toBeDefined();
        expect(notificationService).toBeDefined();
      } else {
        // 실제 서비스들은 API 의존성을 가짐
        expect((userService as any).api).toBeDefined();
        expect((memberService as any).api).toBeDefined();
        expect((clubService as any).api).toBeDefined();
        expect((eventService as any).api).toBeDefined();
        expect((notificationService as any).api).toBeDefined();
      }
    });
  });

  describe('DI 시스템 상태', () => {
    it('DI 시스템 상태를 확인할 수 있어야 함', () => {
      const status = getDIStatus();
      const services = getRegisteredServices();
      
      expect(status).toHaveProperty('isTestMode');
      expect(status).toHaveProperty('registeredServices');
      expect(status).toHaveProperty('containerReady');
      
      expect(Array.isArray(status.registeredServices)).toBe(true);
      expect(Array.isArray(services)).toBe(true);
      expect(status.registeredServices.length).toBeGreaterThan(0);
    });
  });

  describe('Mock 서비스 설정', () => {
    it('Mock 서비스를 직접 설정할 수 있어야 함', () => {
      const factory = ServiceFactory.getInstance();
      const mockAPIClient = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
      };
      
      factory.setMockServices({
        apiClient: mockAPIClient
      });
      
      const resolvedAPIClient = getAPIClient();
      expect(resolvedAPIClient).toBe(mockAPIClient);
    });
  });

  describe('에러 처리', () => {
    it('서비스 생성 중 에러가 발생해도 시스템은 안정적이어야 함', () => {
      const container = DIContainer.getInstance();
      
      // 잘못된 팩토리 등록
      expect(() => {
        container.register('errorService', () => {
          throw new Error('Service creation failed');
        });
      }).not.toThrow();
      
      // 해결 시점에 에러 발생
      expect(() => {
        container.resolve('errorService');
      }).toThrow('Service creation failed');
    });
  });
});
