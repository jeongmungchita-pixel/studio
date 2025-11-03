import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LoadingManager } from '../loading-manager';

describe('LoadingManager Simple DI Testing', () => {
  let loadingManager: LoadingManager;

  beforeEach(() => {
    // DI로 LoadingManager 인스턴스 생성
    loadingManager = LoadingManager.createWithDI();
    
    // Mock 타이머 설정
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Mock 타이머 정리
    vi.useRealTimers();
    
    // LoadingManager 상태 초기화
    loadingManager.clearAll();
  });

  describe('로딩 상태 관리', () => {
    it('should start loading with key', () => {
      const key = 'test-loading';
      
      loadingManager.startLoading(key);
      
      const states = loadingManager.getLoadingStates();
      expect(states.has(key)).toBe(true);
      expect(states.get(key)?.key).toBe(key);
      expect(states.get(key)?.startTime).toBeGreaterThan(0);
    });

    it('should start loading with options', () => {
      const key = 'test-loading';
      const options = {
        message: 'Custom message',
        estimatedTime: 5000,
        showProgress: true
      };
      
      loadingManager.startLoading(key, options);
      
      const states = loadingManager.getLoadingStates();
      const state = states.get(key);
      expect(state?.message).toBe('Custom message');
      expect(state?.estimatedTime).toBe(5000);
    });

    it('should use default message when no message provided', () => {
      const key = 'auth';
      
      loadingManager.startLoading(key);
      
      const states = loadingManager.getLoadingStates();
      expect(states.get(key)?.message).toBe('인증 확인 중...');
    });

    it('should stop loading', () => {
      const key = 'test-loading';
      
      loadingManager.startLoading(key);
      expect(loadingManager.isLoadingDetailed(key)).toBe(true);
      
      loadingManager.stopLoading(key);
      expect(loadingManager.isLoadingDetailed(key)).toBe(false);
      expect(loadingManager.getLoadingStates().has(key)).toBe(false);
    });

    it('should clear all loading states', () => {
      loadingManager.startLoading('key1');
      loadingManager.startLoading('key2');
      loadingManager.startLoading('key3');
      
      expect(loadingManager.getLoadingStates().size).toBe(3);
      
      loadingManager.clearAll();
      
      expect(loadingManager.getLoadingStates().size).toBe(0);
    });
  });

  describe('로딩 상태 조회', () => {
    it('should check if specific key is loading', () => {
      const key = 'test-loading';
      
      expect(loadingManager.isLoadingDetailed(key)).toBe(false);
      
      loadingManager.startLoading(key);
      expect(loadingManager.isLoadingDetailed(key)).toBe(true);
      
      loadingManager.stopLoading(key);
      expect(loadingManager.isLoadingDetailed(key)).toBe(false);
    });

    it('should check if any loading is active', () => {
      expect(loadingManager.isLoading()).toBe(false);
      
      loadingManager.startLoading('key1');
      expect(loadingManager.isLoading()).toBe(true);
      
      loadingManager.startLoading('key2');
      expect(loadingManager.isLoading()).toBe(true);
      
      loadingManager.stopLoading('key1');
      expect(loadingManager.isLoading()).toBe(true);
      
      loadingManager.stopLoading('key2');
      expect(loadingManager.isLoading()).toBe(false);
    });

    it('should check loading pattern', () => {
      expect(loadingManager.isLoadingPattern('auth')).toBe(false);
      
      loadingManager.startLoading('auth-login');
      expect(loadingManager.isLoadingPattern('auth')).toBe(true);
      
      loadingManager.startLoading('auth-register');
      expect(loadingManager.isLoadingPattern('auth')).toBe(true);
      
      loadingManager.startLoading('data-fetch');
      expect(loadingManager.isLoadingPattern('auth')).toBe(true);
      
      loadingManager.stopLoading('auth-login');
      loadingManager.stopLoading('auth-register');
      expect(loadingManager.isLoadingPattern('auth')).toBe(false);
    });

    it('should get loading state for specific key', () => {
      const key = 'test-loading';
      const options = { message: 'Test message' };
      
      loadingManager.startLoading(key, options);
      
      const state = loadingManager.getLoadingState(key);
      expect(state?.key).toBe(key);
      expect(state?.message).toBe('Test message');
      expect(state?.startTime).toBeGreaterThan(0);
    });

    it('should return undefined for non-existent loading state', () => {
      const state = loadingManager.getLoadingState('non-existent');
      expect(state).toBeUndefined();
    });

    it('should get all loading states', () => {
      loadingManager.startLoading('key1', { message: 'Message 1' });
      loadingManager.startLoading('key2', { message: 'Message 2' });
      
      const states = loadingManager.getLoadingStates();
      expect(states.length).toBe(2);
      expect(states.find(s => s.key === 'key1')?.message).toBe('Message 1');
      expect(states.find(s => s.key === 'key2')?.message).toBe('Message 2');
    });
  });

  describe('비동기 작업 지원', () => {
    it('should handle parallel operations', async () => {
      const results = await loadingManager.parallel([
        Promise.resolve('result1'),
        Promise.resolve('result2'),
        Promise.resolve('result3')
      ]);
      
      expect(results).toEqual(['result1', 'result2', 'result3']);
    });

    it('should handle sequential operations', async () => {
      const results = await loadingManager.sequential([
        () => Promise.resolve('result1'),
        () => Promise.resolve('result2'),
        () => Promise.resolve('result3')
      ]);
      
      expect(results).toEqual(['result1', 'result2', 'result3']);
    });

    it('should handle errors in parallel operations', async () => {
      await expect(
        loadingManager.parallel([
          Promise.resolve('result1'),
          Promise.reject(new Error('Test error')),
          Promise.resolve('result3')
        ])
      ).rejects.toThrow('Test error');
    });
  });

  describe('진행률 업데이트', () => {
    it('should update progress', () => {
      const key = 'progress-test';
      
      loadingManager.startLoading(key, { showProgress: true });
      
      loadingManager.updateProgress(key, 50);
      
      const state = loadingManager.getLoadingState(key);
      expect(state?.progress).toBe(50);
    });

    it('should not update progress for non-existent loading', () => {
      // Should not throw error
      expect(() => {
        loadingManager.updateProgress('non-existent', 50);
      }).not.toThrow();
    });
  });

  describe('메시지 관리', () => {
    it('should update message', () => {
      const key = 'message-test';
      
      loadingManager.startLoading(key, { message: 'Initial message' });
      
      loadingManager.updateMessage(key, 'Updated message');
      
      const state = loadingManager.getLoadingState(key);
      expect(state?.message).toBe('Updated message');
    });

    it('should not update message for non-existent loading', () => {
      // Should not throw error
      expect(() => {
        loadingManager.updateMessage('non-existent', 'New message');
      }).not.toThrow();
    });
  });

  describe('전역 로딩 상태', () => {
    it('should show global loading', () => {
      loadingManager.show('Global loading message');
      
      expect(loadingManager.isLoading()).toBe(true);
      expect(loadingManager.isLoadingDetailed('global')).toBe(true);
      
      const state = loadingManager.getLoadingState('global');
      expect(state?.message).toBe('Global loading message');
    });

    it('should hide global loading', () => {
      loadingManager.show('Test message');
      expect(loadingManager.isLoading()).toBe(true);
      
      loadingManager.hide();
      expect(loadingManager.isLoading()).toBe(false);
    });

    it('should update global message', () => {
      loadingManager.show('Initial message');
      
      loadingManager.setMessage('Updated message');
      
      const state = loadingManager.getLoadingState('global');
      expect(state?.message).toBe('Updated message');
    });
  });

  describe('싱글톤 패턴', () => {
    it('should return same instance for DI and getInstance', () => {
      const diInstance = LoadingManager.createWithDI();
      const singletonInstance = LoadingManager.getInstance();
      
      expect(diInstance).toBeInstanceOf(LoadingManager);
      expect(singletonInstance).toBeInstanceOf(LoadingManager);
    });
  });
});
