/**
 * DI 아키텍처 테스트
 * - 순환 의존성 없는지 확인
 * - 포트/어댑터 패턴이 올바르게 동작하는지 확인
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  AuthPort, 
  UserRepositoryPort,
  appComposition,
  AppComposition
} from '@/composition-root';
import { UserRole } from '@/types/auth';
import { UserProfile } from '@/types/auth';

// Mock 어댑터
class MockAuthAdapter implements AuthPort {
  async getCurrentUser(): Promise<UserProfile | null> {
    return null;
  }

  async verifyIdToken(token: string): Promise<UserProfile | null> {
    if (token === 'valid-token') {
      return {
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.MEMBER,
        photoURL: '',
        phoneNumber: '',
        status: 'active',
        clubId: null,
        clubName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };
    }
    return null;
  }

  async createUser(userData: {
    email: string;
    password: string;
    displayName: string;
    role: UserRole;
  }): Promise<any> {
    return {
      success: true,
      data: {
        uid: 'new-user-id',
        ...userData,
        photoURL: '',
        phoneNumber: '',
        status: 'active',
        clubId: null,
        clubName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      }
    };
  }

  async updateUserRole(userId: string, role: UserRole): Promise<any> {
    return {
      success: true,
      data: {
        uid: userId,
        role,
        email: 'test@example.com',
        displayName: 'Test User',
      }
    };
  }

  async signOut(): Promise<void> {
    // Mock implementation
  }
}

class MockUserRepositoryAdapter implements UserRepositoryPort {
  async findById(id: string): Promise<UserProfile | null> {
    if (id === 'test-user-id') {
      return {
        uid: id,
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.MEMBER,
        photoURL: '',
        phoneNumber: '',
        status: 'active',
        clubId: null,
        clubName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };
    }
    return null;
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    if (email === 'test@example.com') {
      return {
        uid: 'test-user-id',
        email,
        displayName: 'Test User',
        role: UserRole.MEMBER,
        photoURL: '',
        phoneNumber: '',
        status: 'active',
        clubId: null,
        clubName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };
    }
    return null;
  }

  async save(user: UserProfile): Promise<any> {
    return {
      success: true,
      data: user
    };
  }

  async update(id: string, data: Partial<UserProfile>): Promise<any> {
    return {
      success: true,
      data: { uid: id, ...data }
    };
  }

  async delete(id: string): Promise<any> {
    return {
      success: true,
      data: { id }
    };
  }

  async findAll(options?: any): Promise<any> {
    return {
      success: true,
      data: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        hasNext: false,
        hasPrev: false,
      }
    };
  }
}

describe('DI Architecture Tests', () => {
  beforeEach(() => {
    // Composition Root 리셋
    AppComposition.reset();
  });

  afterEach(() => {
    // 테스트 후 정리
    AppComposition.reset();
  });

  it('should create composition root without circular dependencies', () => {
    const composition = AppComposition.getInstance();
    
    expect(composition).toBeDefined();
    expect(composition.getAuthAdapter()).toBeDefined();
    expect(composition.getUserRepository()).toBeDefined();
    expect(composition.getUserService()).toBeDefined();
  });

  it('should replace adapters for testing', () => {
    const composition = AppComposition.getInstance();
    
    // Mock 어댑터로 교체
    const mockAuth = new MockAuthAdapter();
    const mockUserRepo = new MockUserRepositoryAdapter();
    
    composition.replaceAuthAdapter(mockAuth);
    composition.replaceUserRepository(mockUserRepo);
    
    // 교체된 어댑터가 사용되는지 확인
    expect(composition.getAuthAdapter()).toBe(mockAuth);
    expect(composition.getUserRepository()).toBe(mockUserRepo);
  });

  it('should work with mock adapters in domain service', async () => {
    const composition = AppComposition.getInstance();
    
    // Mock 어댑터 설정
    composition.replaceAuthAdapter(new MockAuthAdapter());
    composition.replaceUserRepository(new MockUserRepositoryAdapter());
    
    const userService = composition.getUserService();
    
    // 테스트
    const user = await userService.getUserById('test-user-id');
    expect(user).toBeDefined();
    expect(user?.uid).toBe('test-user-id');
    
    const verifiedUser = await userService.verifyTokenAndGetUser('valid-token');
    expect(verifiedUser).toBeDefined();
    expect(verifiedUser?.email).toBe('test@example.com');
    
    const createdUserResult = await userService.createUser({
      email: 'new@example.com',
      password: 'password123',
      displayName: 'New User',
      role: UserRole.MEMBER
    });
    
    expect(createdUserResult.success).toBe(true);
    expect(createdUserResult.data?.email).toBe('new@example.com');
  });

  it('should maintain singleton behavior', () => {
    const composition1 = AppComposition.getInstance();
    const composition2 = AppComposition.getInstance();
    
    expect(composition1).toBe(composition2);
    
    const service1 = composition1.getUserService();
    const service2 = composition2.getUserService();
    
    expect(service1).toBe(service2);
  });

  it('should handle dependency injection correctly', () => {
    const composition = AppComposition.getInstance();
    
    // 모든 의존성이 올바르게 주입되었는지 확인
    expect(composition.getAuthAdapter()).toBeDefined();
    expect(composition.getUserRepository()).toBeDefined();
    expect(composition.getMemberRepository()).toBeDefined();
    expect(composition.getClubRepository()).toBeDefined();
    expect(composition.getStatisticsAdapter()).toBeDefined();
    expect(composition.getAuditAdapter()).toBeDefined();
    expect(composition.getNotificationAdapter()).toBeDefined();
    expect(composition.getStorageAdapter()).toBeDefined();
    expect(composition.getSearchAdapter()).toBeDefined();
    
    // 도메인 서비스들이 포트에 의존하는지 확인
    const userService = composition.getUserService();
    expect(userService).toBeDefined();
  });

  it('should demonstrate port/adapter pattern', () => {
    const composition = AppComposition.getInstance();
    
    // 포트 인터페이스를 통해 접근
    const authPort: AuthPort = composition.getAuthAdapter();
    const userRepo: UserRepositoryPort = composition.getUserRepository();
    
    // 포트의 메서드가 존재하는지 확인
    expect(typeof authPort.verifyIdToken).toBe('function');
    expect(typeof authPort.createUser).toBe('function');
    expect(typeof userRepo.findById).toBe('function');
    expect(typeof userRepo.save).toBe('function');
    
    // 어댑터가 포트를 구현하는지 확인
    expect(authPort).toBeInstanceOf(MockAuthAdapter);
    expect(userRepo).toBeInstanceOf(MockUserRepositoryAdapter);
  });
});
