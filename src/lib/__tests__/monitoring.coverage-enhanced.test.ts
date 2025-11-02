import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  LogLevel, 
  logApiRequest, 
  logError, 
  getHealthCheck, 
  getPerformanceMetrics,
  checkAndAlert,
  clearMetrics
} from '../monitoring';
import { NextRequest } from 'next/server';

// Mock Firebase Admin
vi.mock('@/lib/firebase-admin', () => ({
  initAdmin: vi.fn(),
  getAuth: vi.fn(),
  getFirestore: vi.fn()
}));

// Mock console methods
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {})
};

describe('Monitoring Coverage Enhancement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMetrics();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('LogLevel enum', () => {
    it('should have all required log levels', () => {
      expect(LogLevel.DEBUG).toBe('DEBUG');
      expect(LogLevel.INFO).toBe('INFO');
      expect(LogLevel.WARN).toBe('WARN');
      expect(LogLevel.ERROR).toBe('ERROR');
      expect(LogLevel.CRITICAL).toBe('CRITICAL');
    });
  });

  describe('logApiRequest', () => {
    it('should log API request with basic parameters', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'user-agent': 'test-agent' }
      });

      logApiRequest(request, {
        level: LogLevel.INFO,
        statusCode: 200,
        duration: 150,
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'MEMBER'
      });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('API Request:'),
        expect.objectContaining({
          level: LogLevel.INFO,
          method: 'POST',
          path: '/api/test',
          statusCode: 200,
          duration: 150,
          userId: 'user-123',
          userEmail: 'test@example.com',
          userRole: 'MEMBER'
        })
      );
    });

    it('should log error requests', () => {
      const request = new NextRequest('http://localhost:3000/api/error', {
        method: 'GET'
      });

      logApiRequest(request, {
        level: LogLevel.ERROR,
        statusCode: 500,
        duration: 1000,
        error: 'Internal server error'
      });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('API Request:'),
        expect.objectContaining({
          level: LogLevel.ERROR,
          method: 'GET',
          path: '/api/error',
          statusCode: 500,
          duration: 1000,
          error: 'Internal server error'
        })
      );
    });

    it('should include metadata when provided', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET'
      });

      const metadata = { 
        customField: 'custom-value',
        requestId: 'req-123',
        version: '1.0.0'
      };

      logApiRequest(request, {
        level: LogLevel.INFO,
        statusCode: 200,
        metadata
      });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('API Request:'),
        expect.objectContaining({
          metadata
        })
      );
    });

    it('should handle requests without optional parameters', () => {
      const request = new NextRequest('http://localhost:3000/api/minimal', {
        method: 'GET'
      });

      logApiRequest(request, {
        level: LogLevel.DEBUG
      });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('API Request:'),
        expect.objectContaining({
          level: LogLevel.DEBUG,
          method: 'GET',
          path: '/api/minimal'
        })
      );
    });
  });

  describe('logError', () => {
    it('should log error with context', () => {
      const error = new Error('Test error');
      const context = {
        endpoint: '/api/test',
        userId: 'user-123',
        action: 'create'
      };

      logError(error, context);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('API Error:'),
        expect.objectContaining({
          error: error.message,
          context
        })
      );
    });

    it('should log error without context', () => {
      const error = new Error('Simple error');

      logError(error);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('API Error:'),
        expect.objectContaining({
          error: error.message
        })
      );
    });

    it('should handle string errors', () => {
      const error = 'String error message';

      logError(error);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('API Error:'),
        expect.objectContaining({
          error
        })
      );
    });

    it('should handle object errors', () => {
      const error = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { field: 'email' }
      };

      logError(error);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('API Error:'),
        expect.objectContaining({
          error: error
        })
      );
    });
  });

  describe('getHealthCheck', () => {
    it('should return healthy status when all services are OK', async () => {
      // Mock Firebase services to be available
      vi.mocked(getAuth).mockReturnValue({} as any);
      vi.mocked(getFirestore).mockReturnValue({} as any);

      const result = await getHealthCheck();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeTypeOf('number');
      expect(result.services).toEqual({
        firebase: true,
        firestore: true
      });
      expect(result.uptime).toBeTypeOf('number');
    });

    it('should return unhealthy status when Firebase is unavailable', async () => {
      // Mock Firebase to throw error
      vi.mocked(getAuth).mockImplementation(() => {
        throw new Error('Firebase unavailable');
      });

      const result = await getHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.services.firebase).toBe(false);
    });

    it('should return unhealthy status when Firestore is unavailable', async () => {
      // Mock Firestore to throw error
      vi.mocked(getAuth).mockReturnValue({} as any);
      vi.mocked(getFirestore).mockImplementation(() => {
        throw new Error('Firestore unavailable');
      });

      const result = await getHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.services.firestore).toBe(false);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return empty metrics when no data exists', () => {
      const metrics = getPerformanceMetrics();

      expect(metrics).toEqual([]);
    });

    it('should return performance metrics for tracked endpoints', () => {
      // First, let's add some data through logApiRequest
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST'
      });

      // Log multiple requests to generate metrics
      for (let i = 0; i < 5; i++) {
        logApiRequest(request, {
          level: LogLevel.INFO,
          statusCode: 200,
          duration: 100 + (i * 10)
        });
      }

      const metrics = getPerformanceMetrics();

      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        endpoint: '/api/test',
        method: 'POST',
        count: 5,
        totalDuration: expect.any(Number),
        avgDuration: expect.any(Number),
        minDuration: expect.any(Number),
        maxDuration: expect.any(Number),
        errorCount: 0,
        successRate: 100
      });
    });

    it('should calculate metrics correctly with mixed success/failure', () => {
      const request = new NextRequest('http://localhost:3000/api/mixed', {
        method: 'GET'
      });

      // Log successful requests
      for (let i = 0; i < 3; i++) {
        logApiRequest(request, {
          level: LogLevel.INFO,
          statusCode: 200,
          duration: 100
        });
      }

      // Log failed requests
      for (let i = 0; i < 2; i++) {
        logApiRequest(request, {
          level: LogLevel.ERROR,
          statusCode: 500,
          duration: 200
        });
      }

      const metrics = getPerformanceMetrics();

      expect(metrics[0]).toMatchObject({
        count: 5,
        errorCount: 2,
        successRate: 60 // 3/5 * 100
      });
    });
  });

  describe('checkAndAlert', () => {
    it('should check alert conditions and log warnings', () => {
      const request = new NextRequest('http://localhost:3000/api/slow', {
        method: 'POST'
      });

      // Log slow requests
      for (let i = 0; i < 5; i++) {
        logApiRequest(request, {
          level: LogLevel.INFO,
          statusCode: 200,
          duration: 2000 // 2 seconds - should trigger alert
        });
      }

      checkAndAlert();

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Performance Alert:'),
        expect.objectContaining({
          endpoint: '/api/slow',
          avgDuration: expect.any(Number),
          threshold: 1000
        })
      );
    });

    it('should check error rate alerts', () => {
      const request = new NextRequest('http://localhost:3000/api/errors', {
        method: 'GET'
      });

      // Log high error rate
      for (let i = 0; i < 8; i++) {
        logApiRequest(request, {
          level: LogLevel.ERROR,
          statusCode: 500,
          duration: 100
        });
      }

      // Log some successful requests
      for (let i = 0; i < 2; i++) {
        logApiRequest(request, {
          level: LogLevel.INFO,
          statusCode: 200,
          duration: 100
        });
      }

      checkAndAlert();

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error Rate Alert:'),
        expect.objectContaining({
          endpoint: '/api/errors',
          errorRate: 80,
          threshold: 50
        })
      );
    });

    it('should not alert for normal performance', () => {
      const request = new NextRequest('http://localhost:3000/api/normal', {
        method: 'GET'
      });

      // Log normal requests
      for (let i = 0; i < 5; i++) {
        logApiRequest(request, {
          level: LogLevel.INFO,
          statusCode: 200,
          duration: 100
        });
      }

      checkAndAlert();

      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });
  });

  describe('clearMetrics', () => {
    it('should clear all performance metrics', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET'
      });

      // Add some data
      logApiRequest(request, {
        level: LogLevel.INFO,
        statusCode: 200,
        duration: 100
      });

      // Verify data exists
      let metrics = getPerformanceMetrics();
      expect(metrics).toHaveLength(1);

      // Clear metrics
      clearMetrics();

      // Verify data is cleared
      metrics = getPerformanceMetrics();
      expect(metrics).toEqual([]);
    });
  });

  describe('Edge cases', () => {
    it('should handle malformed request URLs', () => {
      const request = {
        method: 'GET',
        url: 'invalid-url',
        headers: new Headers()
      } as unknown as NextRequest;

      expect(() => {
        logApiRequest(request, {
          level: LogLevel.INFO
        });
      }).not.toThrow();
    });

    it('should handle null/undefined errors in logError', () => {
      expect(() => {
        logError(null);
        logError(undefined);
      }).not.toThrow();

      expect(consoleSpy.error).toHaveBeenCalledTimes(2);
    });

    it('should handle very large duration values', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET'
      });

      expect(() => {
        logApiRequest(request, {
          level: LogLevel.INFO,
          statusCode: 200,
          duration: Number.MAX_SAFE_INTEGER
        });
      }).not.toThrow();
    });
  });
});
