/**
 * Error Manager 테스트
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  APIError, 
  ErrorManager, 
  errorManager,
  ErrorType,
  ErrorLevel,
  isAPIError,
  getErrorMessage
} from '../error-manager';
import { FirebaseError } from 'firebase/app';

describe('APIError', () => {
  describe('Constructor', () => {
    it('should create an APIError with all parameters', () => {
      const error = new APIError('Test error', 400, 'TEST_ERROR', { detail: 'test' });
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.context).toEqual({ detail: 'test' });
      expect(error.name).toBe('APIError');
    });

    it('should have default status code 500', () => {
      const error = new APIError('Test error');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('Static Factory Methods', () => {
    it('should create notFound error', () => {
      const error = APIError.notFound('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Resource not found');
    });

    it('should create badRequest error', () => {
      const error = APIError.badRequest('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
    });

    it('should create unauthorized error', () => {
      const error = APIError.unauthorized();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should create forbidden error', () => {
      const error = APIError.forbidden();
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    it('should create conflict error', () => {
      const error = APIError.conflict('Duplicate entry');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });

    it('should create internal error', () => {
      const error = APIError.internal();
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('fromError', () => {
    it('should return APIError if already APIError', () => {
      const original = new APIError('Test', 400, 'TEST');
      const result = APIError.fromError(original);
      expect(result).toBe(original);
    });

    it('should convert Error to APIError', () => {
      const error = new Error('Regular error');
      const result = APIError.fromError(error);
      expect(result).toBeInstanceOf(APIError);
      expect(result.message).toBe('Regular error');
      expect(result.statusCode).toBe(500);
    });

    it('should handle unknown error', () => {
      const result = APIError.fromError('string error');
      expect(result).toBeInstanceOf(APIError);
      expect(result.message).toBe('Unknown error occurred');
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON correctly', () => {
      const error = new APIError('Test', 400, 'TEST_CODE', { foo: 'bar' });
      const json = error.toJSON();
      
      expect(json).toEqual({
        name: 'APIError',
        message: 'Test',
        statusCode: 400,
        code: 'TEST_CODE',
        context: { foo: 'bar' }
      });
    });
  });
});

describe('ErrorManager', () => {
  let manager: ErrorManager;
  let consoleErrorSpy: any;

  beforeEach(() => {
    manager = new ErrorManager();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('handleError', () => {
    it('should handle APIError', async () => {
      const error = new APIError('API Error', 400, 'API_ERROR');
      await manager.handleError(error, 'TestContext');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[TestContext] Error:',
        expect.objectContaining({
          message: 'API Error',
          code: 'API_ERROR'
        })
      );
    });

    it('should handle FirebaseError', async () => {
      const firebaseError = {
        code: 'auth/invalid-email',
        message: 'Invalid email',
        name: 'FirebaseError'
      } as FirebaseError;

      await manager.handleError(firebaseError, 'AuthContext');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Failed to fetch');
      networkError.name = 'NetworkError';

      await manager.handleError(networkError, 'NetworkContext');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('handleAuthError', () => {
    it('should handle permission-denied error', async () => {
      const error = {
        code: 'permission-denied',
        message: 'Permission denied',
        name: 'FirebaseError'
      } as FirebaseError;

      const result = await manager.handleAuthError(error);
      
      expect(result).toContain('권한이 없습니다');
    });

    it('should handle unauthenticated error', async () => {
      const error = {
        code: 'unauthenticated',
        message: 'Unauthenticated',
        name: 'FirebaseError'
      } as FirebaseError;

      const result = await manager.handleAuthError(error);
      
      expect(result).toContain('인증되지 않은 사용자');
    });
  });

  describe('Error Type Detection', () => {
    it('should detect error type correctly', () => {
      const authError = new APIError('Auth error', 401, 'UNAUTHORIZED');
      const validationError = new APIError('Validation error', 400, 'VALIDATION_ERROR');
      const networkError = new Error('Failed to fetch');
      networkError.name = 'NetworkError';

      expect(manager.getErrorType(authError)).toBe(ErrorType.AUTHENTICATION);
      expect(manager.getErrorType(validationError)).toBe(ErrorType.VALIDATION);
      expect(manager.getErrorType(networkError)).toBe(ErrorType.NETWORK);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on retryable errors', async () => {
      const retryableFn = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce('Success');

      const result = await manager.withRetry(retryableFn, {
        maxAttempts: 2,
        delay: 10
      });

      expect(result).toBe('Success');
      expect(retryableFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableFn = vi.fn()
        .mockRejectedValueOnce(new APIError('Bad request', 400, 'BAD_REQUEST'));

      await expect(manager.withRetry(nonRetryableFn, {
        maxAttempts: 3,
        delay: 10
      })).rejects.toThrow('Bad request');

      expect(nonRetryableFn).toHaveBeenCalledTimes(1);
    });

    it('should respect max attempts', async () => {
      const alwaysFailFn = vi.fn()
        .mockRejectedValue(new Error('Always fails'));

      await expect(manager.withRetry(alwaysFailFn, {
        maxAttempts: 3,
        delay: 10
      })).rejects.toThrow('Always fails');

      expect(alwaysFailFn).toHaveBeenCalledTimes(3);
    });
  });
});

describe('Utility Functions', () => {
  describe('isAPIError', () => {
    it('should identify APIError correctly', () => {
      const apiError = new APIError('Test', 400);
      const regularError = new Error('Test');
      
      expect(isAPIError(apiError)).toBe(true);
      expect(isAPIError(regularError)).toBe(false);
      expect(isAPIError(null)).toBe(false);
      expect(isAPIError(undefined)).toBe(false);
      expect(isAPIError('string')).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from APIError', () => {
      const error = new APIError('API Error message', 400);
      expect(getErrorMessage(error)).toBe('API Error message');
    });

    it('should extract message from regular Error', () => {
      const error = new Error('Regular error message');
      expect(getErrorMessage(error)).toBe('Regular error message');
    });

    it('should handle string errors', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should handle unknown errors', () => {
      expect(getErrorMessage(null)).toBe('An unknown error occurred');
      expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
      expect(getErrorMessage({})).toBe('An unknown error occurred');
    });
  });
});

describe('Singleton Instance', () => {
  it('should export singleton errorManager', () => {
    expect(errorManager).toBeInstanceOf(ErrorManager);
    expect(errorManager).toBeDefined();
  });
});
