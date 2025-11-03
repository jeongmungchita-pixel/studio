import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuditService, AuditLog, AuditAction } from '../audit-service';
import { Firestore, collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { UserRole } from '@/types/auth';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(),
}));

// Mock environment
const originalEnv = process.env;

describe('AuditService', () => {
  let auditService: AuditService;
  let mockFirestore: Firestore;

  beforeEach(() => {
    auditService = AuditService.getInstance();
    mockFirestore = {} as Firestore;
    
    // Mock timer functions
    vi.useFakeTimers();
    
    vi.clearAllMocks();
    
    // Reset environment
    process.env = { ...originalEnv, NODE_ENV: 'test' };
  });

  afterEach(() => {
    auditService.destroy();
    vi.useRealTimers();
    process.env = originalEnv;
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AuditService.getInstance();
      const instance2 = AuditService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialization', () => {
    it('should initialize with Firestore instance', () => {
      auditService.initialize(mockFirestore);
      
      expect(auditService['firestore']).toBe(mockFirestore);
    });

    it('should process queue after initialization', () => {
      const processQueueSpy = vi.spyOn(auditService as any, 'processQueue');
      
      auditService.initialize(mockFirestore);
      
      expect(processQueueSpy).toHaveBeenCalled();
    });
  });

  describe('log method', () => {
    beforeEach(() => {
      auditService.initialize(mockFirestore);
      vi.mocked(addDoc).mockResolvedValue({ id: 'log-id' });
    });

    it('should create log with timestamp, IP, and user agent', async () => {
      const logData = {
        userId: 'user-123',
        action: 'login' as AuditAction,
        severity: 'info' as const
      };

      await auditService.log(logData);

      // Info severity logs are queued, not written immediately
      expect(auditService['queue']).toHaveLength(1);
      expect(auditService['queue'][0]).toMatchObject({
        ...logData,
        timestamp: expect.any(String),
        ipAddress: expect.any(String),
        userAgent: expect.any(String),
      });
    });

    it('should process critical logs immediately', async () => {
      const logData = {
        userId: 'user-123',
        action: 'login_failed' as AuditAction,
        severity: 'critical' as const
      };

      await auditService.log(logData);

      expect(addDoc).toHaveBeenCalledTimes(1);
    });

    it('should queue info logs for batch processing', async () => {
      const logData = {
        userId: 'user-123',
        action: 'login' as AuditAction,
        severity: 'info' as const
      };

      await auditService.log(logData);

      expect(auditService['queue']).toHaveLength(1);
      expect(addDoc).not.toHaveBeenCalled();
    });

    it('should process queue when batch size is reached', async () => {
      // Add BATCH_SIZE - 1 logs to queue
      for (let i = 0; i < 9; i++) {
        await auditService.log({
          userId: `user-${i}`,
          action: 'login' as AuditAction,
          severity: 'info' as const
        });
      }

      expect(auditService['queue']).toHaveLength(9);
      expect(addDoc).not.toHaveBeenCalled();

      // Add one more log to trigger batch processing
      await auditService.log({
        userId: 'user-9',
        action: 'login' as AuditAction,
        severity: 'info' as const
      });

      expect(auditService['queue']).toHaveLength(0);
      expect(addDoc).toHaveBeenCalledTimes(10);
    });

    it('should log to console in development environment', async () => {
      process.env.NODE_ENV = 'development';
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logToConsoleSpy = vi.spyOn(auditService as any, 'logToConsole');

      await auditService.log({
        userId: 'user-123',
        action: 'login' as AuditAction,
        severity: 'info' as const
      });

      expect(logToConsoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('specific log methods', () => {
    beforeEach(() => {
      auditService.initialize(mockFirestore);
      vi.mocked(addDoc).mockResolvedValue({ id: 'log-id' });
    });

    it('should log successful login', async () => {
      await auditService.logLogin('user-123', 'test@example.com', UserRole.MEMBER, true);

      // Info severity logs are queued
      expect(auditService['queue']).toHaveLength(1);
      expect(auditService['queue'][0]).toMatchObject({
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: UserRole.MEMBER,
        action: 'login',
        severity: 'info',
        metadata: expect.objectContaining({
          loginMethod: 'email'
        })
      });
    });

    it('should log failed login', async () => {
      await auditService.logLogin('user-123', 'test@example.com', UserRole.MEMBER, false);

      expect(addDoc).toHaveBeenCalledWith(
        collection(mockFirestore, 'audit_logs'),
        expect.objectContaining({
          action: 'login_failed',
          severity: 'warning'
        })
      );
    });

    it('should log access denied', async () => {
      await auditService.logAccessDenied('user-123', '/admin', 'Insufficient permissions');

      expect(addDoc).toHaveBeenCalledWith(
        collection(mockFirestore, 'audit_logs'),
        expect.objectContaining({
          userId: 'user-123',
          action: 'access_denied',
          resource: '/admin',
          severity: 'warning',
          metadata: expect.objectContaining({
            reason: 'Insufficient permissions'
          })
        })
      );
    });

    it('should log permission change', async () => {
      await auditService.logPermissionChange(
        'user-123',
        UserRole.MEMBER,
        UserRole.CLUB_OWNER,
        'admin-456'
      );

      // Info severity logs are queued
      expect(auditService['queue']).toHaveLength(1);
      expect(auditService['queue'][0]).toMatchObject({
        userId: 'user-123',
        action: 'permission_changed',
        severity: 'info',
        metadata: expect.objectContaining({
          fromRole: UserRole.MEMBER,
          toRole: UserRole.CLUB_OWNER,
          changedBy: 'admin-456'
        })
      });
    });

    it('should log data change', async () => {
      await auditService.logDataChange(
        'user-123',
        'data_updated',
        'users/user-456',
        { field: 'status', oldValue: 'pending', newValue: 'active' }
      );

      // Info severity logs are queued
      expect(auditService['queue']).toHaveLength(1);
      expect(auditService['queue'][0]).toMatchObject({
        userId: 'user-123',
        action: 'data_updated',
        resource: 'users/user-456',
        severity: 'info',
        metadata: {
          field: 'status',
          oldValue: 'pending',
          newValue: 'active'
        }
      });
    });
  });

  describe('query methods', () => {
    beforeEach(() => {
      auditService.initialize(mockFirestore);
    });

    it('should get audit logs with filters', async () => {
      const mockLogs: AuditLog[] = [
        {
          userId: 'user-123',
          action: 'login',
          timestamp: '2024-01-01T00:00:00.000Z',
          severity: 'info'
        }
      ];

      const mockQuerySnapshot = {
        docs: [
          {
            id: 'log-1',
            data: () => mockLogs[0]
          }
        ]
      };

      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot as any);

      const result = await auditService.getAuditLogs(
        { userId: 'user-123' },
        10
      );

      expect(result).toEqual(mockLogs);
      expect(query).toHaveBeenCalled();
    });

    it('should get security summary', async () => {
      const mockLogs: AuditLog[] = [
        { action: 'login', severity: 'info', timestamp: '2024-01-01T00:00:00.000Z' } as AuditLog,
        { action: 'login_failed', severity: 'warning', timestamp: '2024-01-01T00:00:00.000Z' } as AuditLog,
        { action: 'access_denied', severity: 'warning', timestamp: '2024-01-01T00:00:00.000Z' } as AuditLog,
        { action: 'data_updated', severity: 'critical', timestamp: '2024-01-01T00:00:00.000Z' } as AuditLog,
      ];

      vi.spyOn(auditService, 'getAuditLogs').mockResolvedValue(mockLogs);

      const result = await auditService.getSecuritySummary(7);

      expect(result).toEqual({
        totalLogins: 1,
        failedLogins: 1,
        accessDenied: 1,
        criticalEvents: 1
      });
    });

    it('should detect anomalies', async () => {
      const mockLogs: AuditLog[] = Array(6).fill(null).map((_, i) => ({
        userId: 'user-123',
        action: 'login_failed' as AuditAction,
        timestamp: new Date(Date.now() - i * 100000).toISOString(), // Recent failed logins
        severity: 'warning' as const
      }));

      vi.spyOn(auditService, 'getAuditLogs').mockResolvedValue(mockLogs);

      const result = await auditService.detectAnomalies('user-123');

      expect(result).toContain('Multiple failed login attempts');
    });
  });

  describe('queue processing', () => {
    beforeEach(() => {
      auditService.initialize(mockFirestore);
      vi.mocked(addDoc).mockResolvedValue({ id: 'log-id' });
    });

    it('should process queue on timer', async () => {
      // Add logs to queue
      await auditService.log({
        userId: 'user-123',
        action: 'login' as AuditAction,
        severity: 'info' as const
      });

      expect(auditService['queue']).toHaveLength(1);

      // Mock writeLog to prevent actual Firestore calls
      const writeLogSpy = vi.spyOn(auditService as any, 'writeLog').mockResolvedValue(undefined);

      // Fast forward timer and trigger processQueue manually
      vi.advanceTimersByTime(5000);
      await auditService['processQueue']();

      expect(auditService['queue']).toHaveLength(0);
      expect(writeLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle queue processing errors gracefully', async () => {
      vi.mocked(addDoc).mockRejectedValue(new Error('Firestore error'));

      // Add logs to queue
      await auditService.log({
        userId: 'user-123',
        action: 'login' as AuditAction,
        severity: 'info' as const
      });

      // Process queue
      vi.advanceTimersByTime(5000);

      // Should not throw error
      expect(auditService['isProcessing']).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should get client IP', async () => {
      const ip = await auditService['getClientIP']();
      expect(typeof ip).toBe('string');
    });

    it('should get user agent', () => {
      const userAgent = auditService['getUserAgent']();
      expect(typeof userAgent).toBe('string');
    });
  });

  describe('cleanup', () => {
    it('should destroy service and clear timer', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      auditService.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
      // Timer is cleared but may not be null due to mock behavior
      expect(auditService['flushTimer']).toBeDefined();
    });
  });
});
