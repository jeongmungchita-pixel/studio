/**
 * DI 아키텍처 성능 검증 테스트
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppComposition } from '@/composition-root';
import { MockAuthAdapter } from '@/test/mocks/adapters/auth.mock';
import { MockUserRepositoryAdapter } from '@/test/mocks/adapters/user.mock';

describe('DI 아키텍처 성능 검증', () => {
  let composition: AppComposition;

  beforeEach(() => {
    composition = AppComposition.getInstance();
  });

  afterEach(() => {
    AppComposition.reset();
  });

  describe('싱글톤 성능 검증', () => {
    it('Composition Root는 항상 동일한 인스턴스를 반환해야 함', () => {
      const instance1 = AppComposition.getInstance();
      const instance2 = AppComposition.getInstance();
      const instance3 = AppComposition.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });

    it('서비스 인스턴스는 재사용되어야 함', () => {
      const service1 = composition.getUserService();
      const service2 = composition.getUserService();
      const service3 = composition.getUserService();

      expect(service1).toBe(service2);
      expect(service2).toBe(service3);
    });

    it('어댑터 인스턴스는 재사용되어야 함', () => {
      const adapter1 = composition.getAuthAdapter();
      const adapter2 = composition.getAuthAdapter();
      const adapter3 = composition.getAuthAdapter();

      expect(adapter1).toBe(adapter2);
      expect(adapter2).toBe(adapter3);
    });
  });

  describe('의존성 주입 성능 검증', () => {
    it('의존성 주입 시간이 10ms를 넘지 않아야 함', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        composition.getUserService();
        composition.getMemberService();
        composition.getClubService();
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / 3000; // 3 services * 1000 iterations

      expect(averageTime).toBeLessThan(0.01); // 10ms
    });

    it('대량의 서비스 요청에서도 성능이 안정적이어야 함', async () => {
      const mockAuth = new MockAuthAdapter();
      const mockUserRepo = new MockUserRepositoryAdapter();
      
      composition.replaceAuthAdapter(mockAuth);
      composition.replaceUserRepository(mockUserRepo);

      const startTime = performance.now();
      const promises = [];

      // 100개의 동시 요청
      for (let i = 0; i < 100; i++) {
        const userService = composition.getUserService();
        promises.push(userService.getUsers());
      }

      await Promise.all(promises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / 100;

      expect(averageTime).toBeLessThan(50); // 50ms per request
    });
  });

  describe('메모리 사용량 검증', () => {
    it('의존성 인스턴스가 메모리 누수를 일으키지 않아야 함', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // 다수의 인스턴스 생성 시도
      for (let i = 0; i < 1000; i++) {
        AppComposition.getInstance();
        composition.getUserService();
        composition.getAuthAdapter();
      }

      // 강제 가비지 컬렉션 (Node.js 환경)
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // 메모리 증가가 10MB를 넘지 않아야 함
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('Composition Root 리셋 시 메모리가 정리되어야 함', () => {
      // 여러 인스턴스 생성
      for (let i = 0; i < 100; i++) {
        AppComposition.getInstance();
      }

      const beforeResetMemory = process.memoryUsage().heapUsed;

      // 리셋 실행
      AppComposition.reset();

      if (global.gc) {
        global.gc();
      }

      const afterResetMemory = process.memoryUsage().heapUsed;

      // 메모리가 감소하거나 크게 증가하지 않아야 함
      const memoryChange = afterResetMemory - beforeResetMemory;
      expect(memoryChange).toBeLessThan(5 * 1024 * 1024); // 5MB 이내
    });
  });

  describe('확장성 성능 검증', () => {
    it('새로운 어댑터 주입 시 성능 저하가 최소화되어야 함', () => {
      const newMockAuth = new MockAuthAdapter();
      const newMockUserRepo = new MockUserRepositoryAdapter();

      const startTime = performance.now();

      // 어댑터 교체
      composition.replaceAuthAdapter(newMockAuth);
      composition.replaceUserRepository(newMockUserRepo);

      // 서비스 재생성 확인
      const userService = composition.getUserService();
      const authAdapter = composition.getAuthAdapter();

      const endTime = performance.now();
      const replaceTime = endTime - startTime;

      expect(replaceTime).toBeLessThan(10); // 10ms 이내
      expect(userService).toBeDefined();
      expect(authAdapter).toBe(newMockAuth);
    });
  });
});
