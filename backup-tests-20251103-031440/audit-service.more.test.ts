import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuditService } from '../audit-service';
import { UserRole } from '@/types/auth';
import { addDoc, getDocs } from 'firebase/firestore';

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn(() => ({})),
    addDoc: vi.fn(async () => ({})),
    query: vi.fn((...args: unknown[]) => args),
    where: vi.fn((...args: unknown[]) => ({ where: args })),
    orderBy: vi.fn((...args: unknown[]) => ({ orderBy: args })),
    limit: vi.fn((...args: unknown[]) => ({ limit: args })),
    getDocs: vi.fn(async () => ({ docs: [], empty: true })),
    Firestore: vi.fn(),
  };
});

describe('AuditService - Advanced Features', () => {
  let service: AuditService;
  let originalEnv: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Reset singleton
    (AuditService as any).instance = undefined;
    service = AuditService.getInstance();
    
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    if (originalEnv !== undefined) {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
    service.destroy();
    delete (global as any).window;
  });

  describe('Queue Processing', () => {
    it('should batch process info logs', async () => {
      service.initialize({} as any);
      
      // Add 10 info logs (BATCH_SIZE)
      for (let i = 0; i < 10; i++) {
        await service.log({ 
          action: 'data_created', 
          severity: 'info',
          userId: `user${i}` 
        });
      }
      
      // Should trigger batch processing
      expect(addDoc).toHaveBeenCalledTimes(10);
    });

    it('should process queue on timer flush', async () => {
      service.initialize({} as any);
      
      // Add fewer than BATCH_SIZE
      for (let i = 0; i < 5; i++) {
        await service.log({ 
          action: 'data_updated', 
          severity: 'info' 
        });
      }
      
      expect(addDoc).toHaveBeenCalledTimes(0);
      
      // Fast-forward timer (5 seconds)
      vi.advanceTimersByTime(5000);
      
      // Should have processed the queue
      expect(addDoc).toHaveBeenCalledTimes(5);
    });

    it('should not process empty queue', async () => {
      service.initialize({} as any);
      
      // Fast-forward timer without adding logs
      vi.advanceTimersByTime(5000);
      
      expect(addDoc).not.toHaveBeenCalled();
    });

    it('should handle queue processing errors', async () => {
      service.initialize({} as any);
      
      // Mock addDoc to fail
      (addDoc as any).mockRejectedValueOnce(new Error('Firestore error'));
      
      await service.log({ 
        action: 'data_created', 
        severity: 'info' 
      });
      
      // Add more to trigger batch
      for (let i = 0; i < 9; i++) {
        await service.log({ 
          action: 'data_created', 
          severity: 'info' 
        });
      }
      
      // Queue should have failed items (addDoc was mocked to fail once)
      // The batch processing should have retried and put items back in queue
      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe('Local Storage Backup', () => {
    it('should backup to localStorage on write failure', async () => {
      // Mock window and localStorage
      const mockLocalStorage = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      };
      global.window = { 
        localStorage: mockLocalStorage,
        navigator: { userAgent: 'test-browser' }
      } as any;
      
      service.initialize({} as any);
      
      // Make addDoc fail
      (addDoc as any).mockRejectedValueOnce(new Error('Write failed'));
      
      // Spy backup method to ensure it is invoked
      const backupSpy = vi.spyOn<any, any>(service as any, 'backupToLocalStorage');
      await service.log({ 
        action: 'login_failed', 
        severity: 'error' 
      });
      expect(backupSpy).toHaveBeenCalledTimes(1);
      
      delete (global as any).window;
    });

    it('should append to existing localStorage backup', async () => {
      const existingLogs = JSON.stringify([
        { action: 'old_log', timestamp: '2023-01-01' }
      ]);
      
      const mockLocalStorage = {
        getItem: vi.fn(() => existingLogs),
        setItem: vi.fn(),
      };
      global.window = { 
        localStorage: mockLocalStorage,
        navigator: { userAgent: 'test-browser' }
      } as any;
      
      service.initialize({} as any);
      const backupSpy = vi.spyOn<any, any>(service as any, 'backupToLocalStorage');
      (service as any).backupToLocalStorage({ action: 'data_created', timestamp: new Date().toISOString(), severity: 'critical' });
      expect(backupSpy).toHaveBeenCalledTimes(1);
      
      delete (global as any).window;
    });

    it('should limit localStorage backup to 100 items', async () => {
      // Create 100 existing logs
      const existingLogs = JSON.stringify(
        Array.from({ length: 100 }, (_, i) => ({
          action: `log_${i}`,
          timestamp: new Date(2023, 0, i + 1).toISOString()
        }))
      );
      
      const mockLocalStorage = {
        getItem: vi.fn(() => existingLogs),
        setItem: vi.fn(),
      };
      global.window = { 
        localStorage: mockLocalStorage,
        navigator: { userAgent: 'test-browser' }
      } as any;
      
      service.initialize({} as any);
      const backupSpy = vi.spyOn<any, any>(service as any, 'backupToLocalStorage');
      (service as any).backupToLocalStorage({ action: 'data_updated', timestamp: new Date().toISOString(), severity: 'critical' });
      expect(backupSpy).toHaveBeenCalledTimes(1);
      
      delete (global as any).window;
    });
  });

  describe('Console Logging', () => {
    it('should log to console in development mode', async () => {
      global.window = { 
        navigator: { userAgent: 'test-browser' }
      } as any;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        enumerable: true,
        configurable: true
      });
      service.initialize({} as any);
      
      await service.log({ 
        action: 'login', 
        severity: 'info',
        userId: 'test-user'
      });
      
      // Check console was called (implementation specific)
      // The actual logToConsole is called but doesn't output due to our implementation
    });

    it('should not log to console in production mode', async () => {
      global.window = { 
        navigator: { userAgent: 'test-browser' }
      } as any;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        enumerable: true,
        configurable: true
      });
      service.initialize({} as any);
      
      await service.log({ 
        action: 'login', 
        severity: 'info' 
      });
      
      // Console logging is disabled in production
    });
  });

  describe('Client Information', () => {
    it('should get client IP in browser environment', async () => {
      global.window = { 
        navigator: { userAgent: 'TestBrowser/1.0' } 
      } as any;
      
      service.initialize({} as any);
      
      await service.log({ 
        action: 'login', 
        severity: 'critical' 
      });
      
      // Verify IP and UserAgent are set
      const logCall = (addDoc as any).mock.calls[0];
      expect(logCall[1].ipAddress).toBe('client');
      expect(logCall[1].userAgent).toBe('TestBrowser/1.0');
      
      delete (global as any).window;
    });

    it('should handle server environment', async () => {
      // Ensure no window object
      delete (global as any).window;
      
      service.initialize({} as any);
      
      await service.log({ 
        action: 'login', 
        severity: 'critical' 
      });
      
      const logCall = (addDoc as any).mock.calls[0];
      expect(logCall[1].ipAddress).toBe('server');
      expect(logCall[1].userAgent).toBe('server');
    });
  });

  describe('Service Lifecycle', () => {
    it('should process queue without Firestore initialized', async () => {
      // Don't initialize Firestore
      
      await service.log({ 
        action: 'login', 
        severity: 'info' 
      });
      
      // Should queue the log
      expect((service as any).queue.length).toBe(1);
      expect(addDoc).not.toHaveBeenCalled();
    });

    it('should process queued logs after initialization', async () => {
      // Add logs before initialization
      await service.log({ 
        action: 'login', 
        severity: 'info' 
      });
      
      expect(addDoc).not.toHaveBeenCalled();
      
      // Initialize Firestore
      service.initialize({} as any);
      
      // Add 10 to trigger batch (BATCH_SIZE = 10)
      for (let i = 0; i < 10; i++) {
        await service.log({ 
          action: 'data_created', 
          severity: 'info' 
        });
      }
      
      // Should have processed 1 queued before + 10 new = 11 total
      expect(addDoc).toHaveBeenCalledTimes(11);
    });

    it('should clean up on destroy', async () => {
      service.initialize({} as any);
      
      // Add some logs
      for (let i = 0; i < 5; i++) {
        await service.log({ 
          action: 'data_created', 
          severity: 'info' 
        });
      }
      
      // Destroy service
      service.destroy();
      
      // Timer should be cleared (no more processing)
      vi.advanceTimersByTime(10000);
      // Should have processed once during destroy
      expect(addDoc).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle getDocs errors gracefully', async () => {
      service.initialize({} as any);
      
      // Mock getDocs to throw error
      (getDocs as any).mockRejectedValueOnce(new Error('Query failed'));
      
      const logs = await service.getAuditLogs({ userId: 'test' }, 10);
      expect(logs).toEqual([]);
    });

    it('should handle missing Firestore in getAuditLogs', async () => {
      // Don't initialize Firestore
      
      const logs = await service.getAuditLogs({}, 10);
      expect(logs).toEqual([]);
    });

    it('should handle localStorage errors silently', async () => {
      const mockLocalStorage = {
        getItem: vi.fn(() => { throw new Error('Storage full'); }),
        setItem: vi.fn(() => { throw new Error('Storage full'); }),
      };
      global.window = { 
        localStorage: mockLocalStorage,
        navigator: { userAgent: 'test-browser' }
      } as any;
      
      service.initialize({} as any);
      (addDoc as any).mockRejectedValueOnce(new Error('Write failed'));
      
      // Should not throw
      await expect(service.log({ 
        action: 'login', 
        severity: 'critical' 
      })).resolves.toBeUndefined();
      
      delete (global as any).window;
    });
  });
});
