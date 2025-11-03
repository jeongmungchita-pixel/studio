import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceContainer } from '@/services/container';

// DI의 진짜 가치: 실제 의존성 주입 테스트
describe('DI Container Real Value Testing', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    vi.clearAllMocks();
    container = ServiceContainer.getInstance();
    container.reset(); // 컨테이너 초기화
  });

  it('should demonstrate DI value with mock injection', () => {
    // Mock API Client
    const mockApiClient = {
      get: vi.fn().mockResolvedValue({ data: 'test' }),
      post: vi.fn().mockResolvedValue({ success: true }),
    };

    // Mock Firestore
    const mockFirestore = {
      doc: vi.fn(),
      getDoc: vi.fn(),
    };

    // Mock Cache Manager
    const mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
    };

    // DI 컨테이너에 Mock 등록
    container.registerInstance('apiClient', mockApiClient);
    container.registerInstance('firestore', mockFirestore);
    container.registerInstance('cacheManager', mockCacheManager);

    // Mock이 주입된 서비스 가져오기
    const apiClient = container.resolve('apiClient');
    const firestore = container.resolve('firestore');
    const cacheManager = container.resolve('cacheManager');

    // 실제 테스트
    expect(apiClient.get).toBeDefined();
    expect(firestore.doc).toBeDefined();
    expect(cacheManager.get).toBeDefined();

    // Mock 동작 확인
    apiClient.get('/test');
    expect(apiClient.get).toHaveBeenCalledWith('/test');
  });

  it('should enable service testing with injected dependencies', async () => {
    // Mock 의존성들
    const mockDependencies = {
      apiClient: {
        get: vi.fn().mockResolvedValue([
          { id: 1, name: 'User 1' },
          { id: 2, name: 'User 2' },
        ]),
      },
      cacheManager: {
        get: vi.fn(),
        set: vi.fn(),
      },
    };

    // DI 컨테이너에 Mock 등록
    container.registerInstance('apiClient', mockDependencies.apiClient);
    container.registerInstance('cacheManager', mockDependencies.cacheManager);

    // Mock이 주입된 UserService 생성
    class TestUserService {
      constructor(private apiClient: any, private cache: any) {}
      
      async getUsers() {
        const cached = this.cache.get('users');
        if (cached) return cached;
        
        const users = await this.apiClient.get('/users');
        this.cache.set('users', users);
        return users;
      }
    }

    const userService = new TestUserService(
      container.resolve('apiClient'),
      container.resolve('cacheManager')
    );

    // 실제 테스트
    const users = await userService.getUsers();
    
    expect(users).toHaveLength(2);
    expect(mockDependencies.apiClient.get).toHaveBeenCalledWith('/users');
    expect(mockDependencies.cacheManager.set).toHaveBeenCalledWith('users', users);
  });

  it('should enable error handling testing', async () => {
    // Mock 의존성
    const mockApiClient = {
      get: vi.fn().mockRejectedValue(new Error('Network error')),
    };

    const mockErrorHandler = {
      handle: vi.fn().mockReturnValue({ handled: true }),
    };

    // DI 컨테이너에 Mock 등록
    container.registerInstance('apiClient', mockApiClient);
    container.registerInstance('errorHandler', mockErrorHandler);

    // 에러 핸들링이 포함된 서비스
    class TestService {
      constructor(
        private apiClient: any,
        private errorHandler: any
      ) {}
      
      async getData() {
        try {
          return await this.apiClient.get('/data');
        } catch (error) {
          return this.errorHandler.handle(error);
        }
      }
    }

    const service = new TestService(
      container.resolve('apiClient'),
      container.resolve('errorHandler')
    );

    // 에러 핸들링 테스트
    const result = await service.getData();
    
    expect(result).toEqual({ handled: true });
    expect(mockErrorHandler.handle).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Network error' })
    );
  });

  it('should enable component testing with injected services', () => {
    // Mock Services
    const mockAuthService = {
      getUser: vi.fn().mockReturnValue({ id: 1, name: 'Test User' }),
      login: vi.fn(),
      logout: vi.fn(),
    };

    const mockUserService = {
      getProfile: vi.fn().mockReturnValue({ role: 'ADMIN' }),
      updateProfile: vi.fn(),
    };

    // DI 컨테이너에 Mock 등록
    container.registerInstance('authService', mockAuthService);
    container.registerInstance('userService', mockUserService);

    // Mock이 주입된 컴포넌트
    class UserProfileComponent {
      constructor(
        private authService: any,
        private userService: any
      ) {}
      
      render() {
        const user = this.authService.getUser();
        const profile = this.userService.getProfile();
        
        return {
          user,
          profile,
          isAdmin: profile.role === 'ADMIN',
        };
      }
    }

    const component = new UserProfileComponent(
      container.resolve('authService'),
      container.resolve('userService')
    );

    // 컴포넌트 렌더링 테스트
    const rendered = component.render();
    
    expect(rendered.user).toEqual({ id: 1, name: 'Test User' });
    expect(rendered.profile).toEqual({ role: 'ADMIN' });
    expect(rendered.isAdmin).toBe(true);
    
    expect(mockAuthService.getUser).toHaveBeenCalledTimes(1);
    expect(mockUserService.getProfile).toHaveBeenCalledTimes(1);
  });

  it('should demonstrate test isolation with DI', () => {
    // 각 테스트에서 독립적인 Mock 사용
    const mock1 = { value: 'test1' };
    const mock2 = { value: 'test2' };

    // 첫 번째 테스트
    container.registerInstance('service', mock1);
    const service1 = container.resolve('service');
    expect(service1.value).toBe('test1');

    // 컨테이너 초기화 후 두 번째 테스트
    container.reset();
    container.registerInstance('service', mock2);
    const service2 = container.resolve('service');
    expect(service2.value).toBe('test2');
  });
});
