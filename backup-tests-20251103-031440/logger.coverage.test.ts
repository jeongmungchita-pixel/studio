import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger, LogLevel, measurePerformance } from '../logger';

describe('Logger Coverage Tests', () => {
  beforeEach(() => {
    logger.clearLogs();
  });

  describe('shouldLog method (line 71)', () => {
    it('should log at appropriate levels based on environment', () => {
      // Test that different log levels work
      // shouldLog is called internally and depends on this.logLevel
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warning message');
      logger.error('error message');
      
      const logs = logger.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some(l => l.message === 'debug message')).toBe(true);
      expect(logs.some(l => l.message === 'info message')).toBe(true);
      expect(logs.some(l => l.message === 'warning message')).toBe(true);
      expect(logs.some(l => l.message === 'error message')).toBe(true);
    });
  });

  describe('getLogs error handling (line 243)', () => {
    it('should return empty array when localStorage fails', () => {
      // Mock localStorage.getItem to throw an error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn().mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const logs = logger.getLogs();
      expect(logs).toEqual([]);

      // Restore original localStorage.getItem
      localStorage.getItem = originalGetItem;
    });

    it('should handle malformed JSON in localStorage', () => {
      // Mock localStorage.getItem to return invalid JSON
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn().mockReturnValue('invalid json');

      const logs = logger.getLogs();
      expect(logs).toEqual([]);

      // Restore original localStorage.getItem
      localStorage.getItem = originalGetItem;
    });
  });

  describe('measurePerformance sync function (lines 314-326)', () => {
    it('should measure synchronous function performance', () => {
      logger.clearLogs();
      
      // Test synchronous function (non-Promise)
      const result = measurePerformance('sync-op', () => {
        // Simulate some work
        return 42;
      });

      expect(result).toBe(42);
      
      const logs = logger.getLogs({ category: 'PERFORMANCE' });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].message).toContain('Performance: sync-op completed in');
    });

    it('should handle errors in synchronous function measurement', () => {
      logger.clearLogs();
      
      const testError = new Error('Test error');
      
      expect(() => {
        measurePerformance('error-op', () => {
          throw testError;
        });
      }).toThrow('Test error');
      
      const logs = logger.getLogs({ category: 'PERFORMANCE' });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].message).toContain('Performance measurement failed for error-op');
      expect(logs[0].metadata?.operation).toBe('error-op');
    });

    it('should measure async function performance correctly', async () => {
      logger.clearLogs();
      
      await measurePerformance('async-op', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async-result';
      });

      const logs = logger.getLogs({ category: 'PERFORMANCE' });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].message).toContain('Performance: async-op completed in');
    });
  });

  describe('edge cases for coverage', () => {
    it('should handle undefined metadata in log creation', () => {
      logger.info('test message', 'TEST', undefined);
      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1];
      expect(lastLog.metadata).toBeUndefined();
    });

    it('should handle null error in error logging', () => {
      logger.error('error with null error', null as any);
      const logs = logger.getLogs();
      const errorLog = logs.find(l => l.message === 'error with null error');
      expect(errorLog).toBeDefined();
    });

    it('should handle error without stack', () => {
      const errorWithoutStack = new Error('no stack');
      errorWithoutStack.stack = undefined;
      
      logger.error('error without stack', errorWithoutStack);
      const logs = logger.getLogs();
      const errorLog = logs.find(l => l.message === 'error without stack');
      expect(errorLog?.stack).toBeUndefined();
    });
  });
});
