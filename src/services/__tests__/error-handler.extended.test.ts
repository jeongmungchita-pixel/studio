import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorHandler, ErrorType, ErrorSeverity } from '../error-handler';
import { navigationManager } from '../navigation-manager';

// Mock navigation manager
vi.mock('../navigation-manager', () => ({
  navigationManager: {
    goToLogin: vi.fn(),
    navigate: vi.fn(),
  }
}));

describe('ErrorHandler Extended Tests', () => {
  let errorHandler: ErrorHandler;
  let originalConfirm: typeof window.confirm;
  let originalLocation: Location;

  beforeEach(() => {
    // Reset singleton
    (ErrorHandler as any).instance = null;
    errorHandler = ErrorHandler.getInstance();
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock window methods
    originalConfirm = window.confirm;
    window.confirm = vi.fn(() => false);
    
    // Mock window.location.reload
    originalLocation = window.location;
    delete (window as any).location;
    (window as any).location = { ...originalLocation, reload: vi.fn() };
  });

  afterEach(() => {
    errorHandler.clearHistory();
    vi.restoreAllMocks();
    vi.useRealTimers();
    window.confirm = originalConfirm;
    (window as any).location = originalLocation;
  });

  describe('Global Error Handlers', () => {
    it('should handle window error events', () => {
      const handleSpy = vi.spyOn(errorHandler, 'handle');
      
      // Trigger global error event
      const errorEvent = new ErrorEvent('error', {
        error: new Error('Global error'),
        message: 'Global error message',
        filename: 'script.js',
        lineno: 10,
        colno: 5
      });
      
      window.dispatchEvent(errorEvent);
      
      expect(handleSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          action: 'global-error',
          metadata: expect.objectContaining({
            message: 'Global error message',
            filename: 'script.js',
            lineno: 10,
            colno: 5
          })
        })
      );
    });

    it('should handle unhandled promise rejections', async () => {
      const handleSpy = vi.spyOn(errorHandler, 'handle');
      
      // Trigger unhandled rejection
      const error = new Error('Promise rejection');
      const promise = Promise.reject(error);
      promise.catch(() => {}); // Prevent actual unhandled rejection
      
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        reason: error,
        promise: promise
      });
      
      window.dispatchEvent(rejectionEvent);
      
      expect(handleSpy).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          action: 'unhandled-rejection'
        })
      );
    });

    it('should handle non-Error promise rejections', async () => {
      const handleSpy = vi.spyOn(errorHandler, 'handle');
      
      // Trigger rejection with string reason
      const promise = Promise.reject('String rejection reason');
      promise.catch(() => {}); // Prevent actual unhandled rejection
      
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        reason: 'String rejection reason',
        promise: promise
      });
      
      window.dispatchEvent(rejectionEvent);
      
      expect(handleSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          action: 'unhandled-rejection'
        })
      );
    });

    it('should mark unavailable as retryable according to mapping', () => {
      const error = new Error('Service unavailable');
      (error as any).code = 'unavailable';
      const result = errorHandler.handle(error);
      expect(result.type).toBe(ErrorType.SYSTEM);
      expect(result.retryable).toBe(true);
    });
  });

  describe('Error Recovery Strategies', () => {
    it('should attempt recovery for recoverable network errors', () => {
      const error = new Error('Network error');
      const result = errorHandler.handle(error);
      
      expect(result.type).toBe(ErrorType.NETWORK);
      expect(result.recoverable).toBe(true);
      expect(result.retryable).toBe(true);
    });

    it('should schedule retry for retryable errors', () => {
      const listener = vi.fn();
      errorHandler.subscribe(listener);
      
      const error = new Error('Network error');
      errorHandler.handle(error);
      
      // Fast-forward first retry (2^0 * 1000 = 1000ms)
      vi.advanceTimersByTime(1000);
      
      expect(listener).toHaveBeenCalledTimes(2); // Initial error + retry notification
      expect(listener).toHaveBeenLastCalledWith(
        expect.objectContaining({
          userMessage: expect.stringContaining('재시도 중... (1/3)')
        })
      );
    });

    it('should use exponential backoff for retries', () => {
      const listener = vi.fn();
      errorHandler.subscribe(listener);
      
      const error = new Error('Network error');
      
      // Trigger same error multiple times
      errorHandler.handle(error);
      vi.advanceTimersByTime(1000); // 2^0 * 1000
      
      errorHandler.handle(error);
      vi.advanceTimersByTime(2000); // 2^1 * 1000
      
      errorHandler.handle(error);
      vi.advanceTimersByTime(4000); // 2^2 * 1000
      
      const calls = listener.mock.calls;
      expect(calls.some(call => call[0].userMessage?.includes('(1/3)'))).toBe(true);
      expect(calls.some(call => call[0].userMessage?.includes('(2/3)'))).toBe(true);
      expect(calls.some(call => call[0].userMessage?.includes('(3/3)'))).toBe(true);
    });

    it('should stop retrying after max attempts', () => {
      const listener = vi.fn();
      errorHandler.subscribe(listener);
      
      const error = new Error('Network error');
      
      // Exhaust all retry attempts
      for (let i = 0; i < 4; i++) {
        errorHandler.handle(error);
        vi.advanceTimersByTime(Math.pow(2, i) * 1000);
      }
      
      // Should have notification about max retries exceeded
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: ErrorSeverity.HIGH,
          userMessage: expect.stringContaining('여러 번 시도했지만 실패했습니다')
        })
      );
    });

    it('should suggest refresh for critical system errors', () => {
      window.confirm = vi.fn(() => false);
      
      const error = new Error('System error');
      (error as any).severity = ErrorSeverity.CRITICAL;
      
      // Manually trigger recovery for a critical system error
      const errorInfo = {
        type: ErrorType.SYSTEM,
        severity: ErrorSeverity.CRITICAL,
        message: 'Critical system error',
        userMessage: 'Critical error',
        recoverable: true,
        retryable: false
      };
      
      (errorHandler as any).attemptRecovery(errorInfo);
      
      expect(window.confirm).toHaveBeenCalledWith('페이지를 새로고침하시겠습니까?');
    });

    it('should refresh page when user confirms', () => {
      window.confirm = vi.fn(() => true);
      const reloadSpy = vi.fn();
      window.location.reload = reloadSpy;
      
      const errorInfo = {
        type: ErrorType.SYSTEM,
        severity: ErrorSeverity.CRITICAL,
        message: 'Critical system error',
        userMessage: 'Critical error',
        recoverable: true,
        retryable: false
      };
      
      (errorHandler as any).attemptRecovery(errorInfo);
      
      expect(reloadSpy).toHaveBeenCalled();
    });

    it('should navigate to login for authentication errors when recovery is invoked', () => {
      const authInfo = {
        type: ErrorType.AUTHENTICATION,
        severity: ErrorSeverity.LOW,
        message: 'Auth needed',
        userMessage: '로그인이 필요합니다.',
        recoverable: false,
        retryable: false
      };
      (errorHandler as any).attemptRecovery(authInfo);
      expect(navigationManager.goToLogin).toHaveBeenCalled();
    });

    it('should navigate to /403 for authorization errors when recovery is invoked', () => {
      const authzInfo = {
        type: ErrorType.AUTHORIZATION,
        severity: ErrorSeverity.MEDIUM,
        message: 'No permission',
        userMessage: '권한이 없습니다.',
        recoverable: false,
        retryable: false
      };
      (errorHandler as any).attemptRecovery(authzInfo);
      expect(navigationManager.navigate).toHaveBeenCalledWith('/403', { replace: true });
    });
  });

  describe('Firebase Error Variations', () => {
    const additionalFirebaseErrors = [
      {
        code: 'auth/invalid-credential',
        expectedMessage: '이메일 또는 비밀번호가 올바르지 않습니다.',
        expectedType: ErrorType.AUTHENTICATION
      },
      {
        code: 'auth/email-already-in-use',
        expectedMessage: '이미 사용 중인 이메일입니다.',
        expectedType: ErrorType.VALIDATION
      },
      {
        code: 'auth/weak-password',
        expectedMessage: '비밀번호가 너무 약합니다. 6자 이상 입력해주세요.',
        expectedType: ErrorType.VALIDATION
      },
      {
        code: 'auth/too-many-requests',
        expectedMessage: '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.',
        expectedType: ErrorType.AUTHENTICATION
      },
      {
        code: 'auth/user-disabled',
        expectedMessage: '계정이 비활성화되었습니다. 관리자에게 문의하세요.',
        expectedType: ErrorType.AUTHORIZATION
      },
      {
        code: 'unavailable',
        expectedMessage: '서비스를 일시적으로 사용할 수 없습니다.',
        expectedType: ErrorType.SYSTEM
      }
    ];

    additionalFirebaseErrors.forEach(({ code, expectedMessage, expectedType }) => {
      it(`should handle ${code} error correctly`, () => {
        const error = new Error('Firebase error');
        (error as any).code = code;
        
        const result = errorHandler.handle(error);
        
        expect(result.type).toBe(expectedType);
        expect(result.userMessage).toBe(expectedMessage);
        expect(result.code).toBe(code);
      });
    });

    it('should handle unknown Firebase error codes', () => {
      const error = new Error('Unknown Firebase error');
      (error as any).code = 'unknown-error-code';
      
      const result = errorHandler.handle(error);
      
      expect(result.type).toBe(ErrorType.FIREBASE);
      expect(result.userMessage).toContain('Firebase 오류:');
    });
  });

  describe('Error Context and Metadata', () => {
    it('should add timestamp to error context', () => {
      const error = new Error('Test error');
      const result = errorHandler.handle(error, { action: 'test' });
      
      const history = errorHandler.getHistory();
      expect(history[0].context?.timestamp).toBeDefined();
      expect(new Date(history[0].context!.timestamp!).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should preserve original error reference', () => {
      const originalError = new Error('Original error');
      const result = errorHandler.handle(originalError);
      
      expect(result.originalError).toBe(originalError);
    });

    it('should handle errors with custom properties', () => {
      const error: any = new Error('Custom error');
      error.customProp = 'custom value';
      error.statusCode = 404;
      
      const result = errorHandler.handle(error);
      
      expect(result.message).toBe('Custom error');
      expect((result.originalError as any)?.customProp).toBe('custom value');
    });
  });

  describe('Listener Error Handling', () => {
    it('should not throw if listener throws an error', () => {
      const badListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();
      
      errorHandler.subscribe(badListener);
      errorHandler.subscribe(goodListener);
      
      expect(() => errorHandler.handle(new Error('Test'))).not.toThrow();
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('Error Type Detection', () => {
    it('should detect fetch errors as network errors', () => {
      const error = new Error('Failed to fetch');
      const result = errorHandler.handle(error);
      
      expect(result.type).toBe(ErrorType.NETWORK);
    });

    it('should detect errors with validation in message', () => {
      const error = new Error('Validation failed for field email');
      const result = errorHandler.handle(error);
      
      expect(result.type).toBe(ErrorType.VALIDATION);
    });

    it('should detect errors with ValidationError name', () => {
      const error = new Error('Some error');
      error.name = 'ValidationError';
      const result = errorHandler.handle(error);
      
      expect(result.type).toBe(ErrorType.VALIDATION);
    });
  });

  describe('Log Level Mapping', () => {
    it('should map CRITICAL severity to error level', () => {
      const logLevel = (errorHandler as any).getLogLevel(ErrorSeverity.CRITICAL);
      expect(logLevel).toBe('error');
    });

    it('should map HIGH severity to error level', () => {
      const logLevel = (errorHandler as any).getLogLevel(ErrorSeverity.HIGH);
      expect(logLevel).toBe('error');
    });

    it('should map MEDIUM severity to warn level', () => {
      const logLevel = (errorHandler as any).getLogLevel(ErrorSeverity.MEDIUM);
      expect(logLevel).toBe('warn');
    });

    it('should map LOW severity to info level', () => {
      const logLevel = (errorHandler as any).getLogLevel(ErrorSeverity.LOW);
      expect(logLevel).toBe('info');
    });

    it('should default to log level for unknown severity', () => {
      const logLevel = (errorHandler as any).getLogLevel('UNKNOWN' as any);
      expect(logLevel).toBe('log');
    });
  });

  describe('Production Logging', () => {
    let originalEnv: string | undefined;

    beforeEach(() => {
      originalEnv = process.env.NODE_ENV;
    });

    afterEach(() => {
      (process.env as any).NODE_ENV = originalEnv;
    });

    it('should send to logging service in production', () => {
      (process.env as any).NODE_ENV = 'production';
      const sendSpy = vi.spyOn(errorHandler as any, 'sendToLoggingService');
      
      errorHandler.handle(new Error('Production error'));
      
      expect(sendSpy).toHaveBeenCalled();
    });

    it('should not send to logging service in development', () => {
      (process.env as any).NODE_ENV = 'development';
      const sendSpy = vi.spyOn(errorHandler as any, 'sendToLoggingService');
      
      errorHandler.handle(new Error('Development error'));
      
      expect(sendSpy).not.toHaveBeenCalled();
    });
  });

  describe('Retry Key Management', () => {
    it('should generate unique keys for different error types', () => {
      const networkError = new Error('Network error');
      const authError = new Error('Auth error');
      (authError as any).code = 'auth/user-not-found';
      
      // Handle errors which should trigger retry scheduling for network error
      errorHandler.handle(networkError);
      
      // Network error is retryable, so it should be tracked
      const retryAttempts = (errorHandler as any).retryAttempts;
      expect(retryAttempts.get('NETWORK-unknown')).toBeDefined();
      
      // Auth error is not retryable by default, so it won't be in retryAttempts
      errorHandler.handle(authError);
      // Since auth/user-not-found is not retryable, it won't be tracked
      expect(retryAttempts.get('AUTHENTICATION-auth/user-not-found')).toBeUndefined();
    });

    it('should clean up retry attempts after max exceeded', () => {
      const error = new Error('Network error');
      
      // Exhaust retries
      for (let i = 0; i < 4; i++) {
        errorHandler.handle(error);
        vi.advanceTimersByTime(Math.pow(2, i) * 1000);
      }
      
      const retryAttempts = (errorHandler as any).retryAttempts;
      expect(retryAttempts.get('NETWORK-unknown')).toBeUndefined();
    });
  });

  describe('Error Information Completeness', () => {
    it('should include all required fields in error info', () => {
      const error = new Error('Complete error');
      const context = {
        userId: 'user123',
        action: 'test-action',
        component: 'TestComponent',
        metadata: { extra: 'data' }
      };
      
      const result = errorHandler.handle(error, context);
      
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('userMessage');
      expect(result).toHaveProperty('context');
      expect(result).toHaveProperty('recoverable');
      expect(result).toHaveProperty('retryable');
    });
  });
});
