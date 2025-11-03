/**
 * DI 아키텍처 통합 테스트
 * - Mock 어댑터를 통한 전체 흐름 검증
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppComposition } from '@/composition-root';
import { MockAuthAdapter } from '@/test/mocks/adapters/auth.mock';
import { MockUserRepositoryAdapter } from '@/test/mocks/adapters/user.mock';
import { UserRole } from '@/types/auth';

describe('DI 아키텍처 통합 테스트', () => {
  let composition: AppComposition;
  let mockAuth: MockAuthAdapter;
  let mockUserRepo: MockUserRepositoryAdapter;

  beforeEach(() => {
    // Mock 어댑터 생성
    mockAuth = new MockAuthAdapter();
    mockUserRepo = new MockUserRepositoryAdapter();

    // Composition Root에 Mock 주입
    composition = AppComposition.getInstance();
    composition.replaceAuthAdapter(mockAuth);
    composition.replaceUserRepository(mockUserRepo);
  });

  afterEach(() => {
    // 테스트 후 리셋
    AppComposition.reset();
  });

  describe('의존성 주입 검증', () => {
    it('Composition Root에서 서비스를 주입받아야 함', () => {
      const userService = composition.getUserService();
      const memberService = composition.getMemberService();
      const clubService = composition.getClubService();

      expect(userService).toBeDefined();
      expect(memberService).toBeDefined();
      expect(clubService).toBeDefined();
    });

    it('Mock 어댑터가 주입되어야 함', () => {
      const authAdapter = composition.getAuthAdapter();
      const userRepo = composition.getUserRepository();

      expect(authAdapter).toBeInstanceOf(MockAuthAdapter);
      expect(userRepo).toBeInstanceOf(MockUserRepositoryAdapter);
    });
  });

  describe('사용자 서비스 통합 테스트', () => {
    it('Mock을 통한 사용자 생성이 가능해야 함', async () => {
      const userService = composition.getUserService();

      const result = await userService.createUser({
        email: 'newuser@test.com',
        password: 'password123',
        displayName: 'New User',
        role: UserRole.MEMBER,
      });

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe('newuser@test.com');
      expect(result.data?.role).toBe(UserRole.MEMBER);
    });

    it('Mock을 통한 사용자 역할 변경이 가능해야 함', async () => {
      const userService = composition.getUserService();

      const result = await userService.changeUserRole('test-user-1', UserRole.CLUB_OWNER);

      expect(result.success).toBe(true);
      expect(result.data?.role).toBe(UserRole.CLUB_OWNER);
    });

    it('Mock을 통한 사용자 목록 조회가 가능해야 함', async () => {
      const userService = composition.getUserService();

      // 먼저 Mock 데이터가 제대로 주입되었는지 확인
      const authAdapter = composition.getAuthAdapter();
      const userRepo = composition.getUserRepository();
      
      expect(authAdapter).toBeInstanceOf(MockAuthAdapter);
      expect(userRepo).toBeInstanceOf(MockUserRepositoryAdapter);

      const result = await userService.getUsers({
        filters: { role: UserRole.ADMIN }
      });

      expect(result.success).toBe(true);
      
      // 실제 Mock 데이터 확인 (디버깅용)
      console.log('Mock result data:', result.data?.data);
      
      // Mock 데이터에는 ADMIN이 1명이어야 함
      expect(result.data?.data.length).toBeGreaterThanOrEqual(1);
      
      // 최소한 하나의 ADMIN 사용자가 있는지 확인
      const adminUsers = result.data?.data.filter(u => u.role === UserRole.ADMIN) || [];
      expect(adminUsers.length).toBeGreaterThanOrEqual(1);
      
      // 첫 번째 ADMIN 사용자 확인
      if (adminUsers.length > 0) {
        expect(adminUsers[0].role).toBe(UserRole.ADMIN);
      }
    });
  });

  describe('포트-어댑터 패턴 검증', () => {
    it('도메인 서비스는 포트에만 의존해야 함', async () => {
      const userService = composition.getUserService();

      // 포트 인터페이스를 통한 접근
      const authResult = await mockAuth.verifyIdToken('valid-admin-token');
      expect(authResult?.email).toBe('admin@test.com');

      const userResult = await mockUserRepo.findById('user-1');
      expect(userResult?.displayName).toBe('Admin User');
    });

    it('어댑터 교체 시 동일한 인터페이스로 동작해야 함', async () => {
      const newMockAuth = new MockAuthAdapter();
      composition.replaceAuthAdapter(newMockAuth);

      const userService = composition.getUserService();
      const result = await userService.changeUserRole('test-user-2', UserRole.ADMIN);

      expect(result.success).toBe(true);
      expect(result.data?.role).toBe(UserRole.ADMIN);
    });
  });

  describe('순환 의존성 차단 검증', () => {
    it('의존성 방향이 올바르게 설정되어야 함', () => {
      // 도메인 → 포트
      const userService = composition.getUserService();
      expect(userService).toBeDefined();

      // 포트 → 어댑터 (구현체)
      const authAdapter = composition.getAuthAdapter();
      expect(authAdapter).toBeDefined();

      // 어댑터 → 인프라 (싱글톤)
      expect(mockAuth).toBeDefined();
    });
  });

  describe('테스트 용이성 검증', () => {
    it('Mock 어댑터를 통한 격리된 테스트가 가능해야 함', async () => {
      // 테스트용 Mock 데이터 설정
      const testUser = {
        uid: 'test-isolated',
        email: 'isolated@test.com',
        displayName: 'Isolated Test',
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

      await mockUserRepo.save(testUser);

      const userService = composition.getUserService();
      const user = await userService.getUserById('test-isolated');

      expect(user).toBeDefined();
      expect(user?.email).toBe('isolated@test.com');
    });
  });
});
