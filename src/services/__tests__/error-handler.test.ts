import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ErrorHandler, ErrorType, ErrorSeverity } from '../error-handler';
import { FirebaseError } from 'firebase/app';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = ErrorHandler.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    errorHandler.clearHistory();
  });

  describe('getInstance', () => {
    it('싱글톤 인스턴스를 반환해야 함', () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('handle', () => {
    it('일반 Error를 처리해야 함', () => {
      const error = new Error('Test error');
      const result = errorHandler.handle(error);

      expect(result.type).toBe(ErrorType.SYSTEM);
      expect(result.message).toBe('Test error');
      expect(result.recoverable).toBe(false);
    });

    it('Firebase 에러를 처리해야 함', () => {
      const error = {
        code: 'auth/user-not-found',
        message: 'User not found',
      } as FirebaseError;

      const result = errorHandler.handle(error);

      expect(result.type).toBe(ErrorType.AUTHENTICATION);
      expect(result.userMessage).toBe('사용자를 찾을 수 없습니다.');
      expect(result.severity).toBe(ErrorSeverity.LOW);
    });

    it('네트워크 에러를 처리해야 함', () => {
      const error = new Error('Network request failed');
      const result = errorHandler.handle(error);

      expect(result.type).toBe(ErrorType.NETWORK);
      expect(result.userMessage).toBe('네트워크 연결을 확인해주세요.');
      expect(result.recoverable).toBe(true);
      expect(result.retryable).toBe(true);
    });

    it('검증 에러를 처리해야 함', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      const result = errorHandler.handle(error);

      expect(result.type).toBe(ErrorType.VALIDATION);
      expect(result.recoverable).toBe(false);
      expect(result.retryable).toBe(false);
    });

    it('알 수 없는 에러를 처리해야 함', () => {
      const error = 'String error';
      const result = errorHandler.handle(error);

      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('String error');
    });

    it('컨텍스트와 함께 에러를 처리해야 함', () => {
      const error = new Error('Test error');
      const context = {
        userId: 'user123',
        action: 'test-action',
        component: 'TestComponent',
      };

      const result = errorHandler.handle(error, context);

      expect(result.context).toEqual(expect.objectContaining(context));
    });
  });

  describe('에러 히스토리', () => {
    it('에러를 히스토리에 추가해야 함', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      errorHandler.handle(error1);
      errorHandler.handle(error2);

      const history = errorHandler.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('Error 2'); // 최신 것이 먼저
      expect(history[1].message).toBe('Error 1');
    });

    it('최대 히스토리 크기를 유지해야 함', () => {
      // 50개 이상의 에러 생성
      for (let i = 0; i < 60; i++) {
        errorHandler.handle(new Error(`Error ${i}`));
      }

      const history = errorHandler.getHistory();
      expect(history).toHaveLength(50); // maxHistorySize
    });

    it('히스토리를 초기화할 수 있어야 함', () => {
      errorHandler.handle(new Error('Error'));
      expect(errorHandler.getHistory()).toHaveLength(1);

      errorHandler.clearHistory();
      expect(errorHandler.getHistory()).toHaveLength(0);
    });
  });

  describe('에러 카운트', () => {
    it('전체 에러 개수를 반환해야 함', () => {
      errorHandler.handle(new Error('Error 1'));
      errorHandler.handle(new Error('Error 2'));

      expect(errorHandler.getErrorCount()).toBe(2);
    });

    it('특정 타입의 에러 개수를 반환해야 함', () => {
      errorHandler.handle(new Error('Network error'));
      errorHandler.handle(new Error('Network failed'));
      errorHandler.handle(new Error('Other error'));

      expect(errorHandler.getErrorCount(ErrorType.NETWORK)).toBe(2);
      expect(errorHandler.getErrorCount(ErrorType.SYSTEM)).toBe(1);
    });
  });

  describe('리스너', () => {
    it('에러 발생 시 리스너를 호출해야 함', () => {
      const listener = vi.fn();
      const unsubscribe = errorHandler.subscribe(listener);

      const error = new Error('Test error');
      errorHandler.handle(error);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error',
          type: ErrorType.SYSTEM,
        })
      );

      unsubscribe();
    });

    it('구독 해제 후 리스너를 호출하지 않아야 함', () => {
      const listener = vi.fn();
      const unsubscribe = errorHandler.subscribe(listener);

      unsubscribe();
      errorHandler.handle(new Error('Test error'));

      expect(listener).not.toHaveBeenCalled();
    });

    it('여러 리스너를 지원해야 함', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      errorHandler.subscribe(listener1);
      errorHandler.subscribe(listener2);

      errorHandler.handle(new Error('Test error'));

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('Firebase 에러 매핑', () => {
    const testCases = [
      {
        code: 'auth/user-not-found',
        expectedType: ErrorType.AUTHENTICATION,
        expectedMessage: '사용자를 찾을 수 없습니다.',
        expectedSeverity: ErrorSeverity.LOW,
      },
      {
        code: 'auth/wrong-password',
        expectedType: ErrorType.AUTHENTICATION,
        expectedMessage: '비밀번호가 올바르지 않습니다.',
        expectedSeverity: ErrorSeverity.LOW,
      },
      {
        code: 'auth/network-request-failed',
        expectedType: ErrorType.NETWORK,
        expectedMessage: '네트워크 연결을 확인해주세요.',
        expectedSeverity: ErrorSeverity.MEDIUM,
      },
      {
        code: 'permission-denied',
        expectedType: ErrorType.AUTHORIZATION,
        expectedMessage: '권한이 없습니다.',
        expectedSeverity: ErrorSeverity.MEDIUM,
      },
    ];

    testCases.forEach(({ code, expectedType, expectedMessage, expectedSeverity }) => {
      it(`${code} 에러를 올바르게 매핑해야 함`, () => {
        const error = { code, message: 'Firebase error' } as FirebaseError;
        const result = errorHandler.handle(error);

        expect(result.type).toBe(expectedType);
        expect(result.userMessage).toBe(expectedMessage);
        expect(result.severity).toBe(expectedSeverity);
      });
    });
  });

  describe('debug', () => {
    it('디버그 정보를 출력해야 함', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      errorHandler.handle(new Error('Test error'));
      errorHandler.debug();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ErrorHandler Debug'),
        expect.objectContaining({
          historyLength: 1,
          listenersCount: expect.any(Number),
          retryAttemptsCount: expect.any(Number),
          recentErrors: expect.any(Array),
        })
      );
    });
  });
});
