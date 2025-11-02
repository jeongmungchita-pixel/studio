import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityAudit, SecurityEventType, SecuritySeverity } from '../security-audit';
import { UserRole } from '@/types/auth';

describe('SecurityAudit Coverage Tests', () => {
  beforeEach(() => {
    // Reset events to ensure clean test state
    (SecurityAudit as any).events = [];
    (SecurityAudit as any).lastTimestamp = 0;
    // Reset storage used by SecurityAudit side-effects
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('getEvents filter coverage', () => {
    it('should filter events by type', () => {
      SecurityAudit.logEvent(SecurityEventType.LOGIN_SUCCESS, {});
      SecurityAudit.logEvent(SecurityEventType.LOGIN_FAILED, {});
      SecurityAudit.logEvent(SecurityEventType.PERMISSION_DENIED, {});
      
      const loginEvents = SecurityAudit.getEvents({ type: SecurityEventType.LOGIN_SUCCESS });
      expect(loginEvents).toHaveLength(1);
      expect(loginEvents[0].type).toBe(SecurityEventType.LOGIN_SUCCESS);
    });

    it('should filter events by userId', () => {
      SecurityAudit.logEvent(SecurityEventType.LOGIN_SUCCESS, {}, {
        userId: 'user-1', userRole: UserRole.MEMBER, ipAddress: '127.0.0.1', userAgent: 'test', resource: 'auth', action: 'login'
      });
      SecurityAudit.logEvent(SecurityEventType.LOGIN_FAILED, {}, {
        userId: 'user-2', userRole: UserRole.MEMBER, ipAddress: '127.0.0.1', userAgent: 'test', resource: 'auth', action: 'login'
      });
      
      const user1Events = SecurityAudit.getEvents({ userId: 'user-1' });
      expect(user1Events).toHaveLength(1);
      expect(user1Events[0].userId).toBe('user-1');
    });

    it('should filter events by startDate', () => {
      vi.useFakeTimers();
      
      // Set time to 1 day ago and log first event
      const pastDate = new Date('2023-01-01T00:00:00Z');
      vi.setSystemTime(pastDate);
      
      SecurityAudit.logEvent(SecurityEventType.LOGIN_SUCCESS, {}, {
        userId: 'user-1', userRole: UserRole.MEMBER, ipAddress: '127.0.0.1', userAgent: 'test', resource: 'auth', action: 'login'
      });
      
      // Reset events and log new event at current time
      (SecurityAudit as any).events = [];
      const now = new Date('2023-01-02T00:00:00Z');
      vi.setSystemTime(now);
      
      SecurityAudit.logEvent(SecurityEventType.LOGIN_FAILED, {}, {
        userId: 'user-2', userRole: UserRole.MEMBER, ipAddress: '127.0.0.1', userAgent: 'test', resource: 'auth', action: 'login'
      });
      
      const recentEvents = SecurityAudit.getEvents({ startDate: now });
      expect(recentEvents).toHaveLength(1);
      expect(recentEvents[0].type).toBe(SecurityEventType.LOGIN_FAILED);
      
      vi.useRealTimers();
    });

    it('should filter events by endDate', () => {
      // Use fake timers to control timestamps
      vi.useFakeTimers();
      const now = new Date();
      vi.setSystemTime(now);
      
      SecurityAudit.logEvent(SecurityEventType.LOGIN_SUCCESS, {}, {
        userId: 'user-1', userRole: UserRole.MEMBER, ipAddress: '127.0.0.1', userAgent: 'test', resource: 'auth', action: 'login'
      });
      
      // Advance time for future event
      const future = new Date();
      future.setDate(future.getDate() + 1);
      vi.setSystemTime(future);
      
      SecurityAudit.logEvent(SecurityEventType.LOGIN_FAILED, {}, {
        userId: 'user-2', userRole: UserRole.MEMBER, ipAddress: '127.0.0.1', userAgent: 'test', resource: 'auth', action: 'login'
      });
      
      const pastEvents = SecurityAudit.getEvents({ endDate: now });
      expect(pastEvents).toHaveLength(1);
      expect(pastEvents[0].type).toBe(SecurityEventType.LOGIN_SUCCESS);
      
      vi.useRealTimers();
    });

    it('should combine multiple filters', () => {
      SecurityAudit.logEvent(SecurityEventType.LOGIN_SUCCESS, {}, {
        userId: 'user-1', userRole: UserRole.MEMBER, ipAddress: '127.0.0.1', userAgent: 'test', resource: 'auth', action: 'login'
      });
      SecurityAudit.logEvent(SecurityEventType.LOGIN_FAILED, {}, {
        userId: 'user-1', userRole: UserRole.MEMBER, ipAddress: '127.0.0.1', userAgent: 'test', resource: 'auth', action: 'login'
      });
      SecurityAudit.logEvent(SecurityEventType.PERMISSION_DENIED, {}, {
        userId: 'user-2', userRole: UserRole.MEMBER, ipAddress: '127.0.0.1', userAgent: 'test', resource: 'auth', action: 'login'
      });
      
      const user1LoginEvents = SecurityAudit.getEvents({ 
        userId: 'user-1',
        type: SecurityEventType.LOGIN_SUCCESS
      });
      expect(user1LoginEvents).toHaveLength(1);
      expect(user1LoginEvents[0].type).toBe(SecurityEventType.LOGIN_SUCCESS);
      expect(user1LoginEvents[0].userId).toBe('user-1');
    });
  });
});
