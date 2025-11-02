import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityAudit, SecurityEventType, SecuritySeverity } from '../security-audit';
import { UserRole } from '@/types/auth';

describe('SecurityAudit', () => {
  beforeEach(() => {
    // Reset storage used by SecurityAudit side-effects
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should log a low severity event (LOGIN_SUCCESS)', () => {
    const evt = SecurityAudit.logEvent(SecurityEventType.LOGIN_SUCCESS, { source: 'test' }, {
      userId: 'u1', userRole: UserRole.MEMBER, ipAddress: '127.0.0.1', userAgent: 'jest', resource: 'auth', action: 'login'
    });
    expect(evt.type).toBe(SecurityEventType.LOGIN_SUCCESS);
    expect(evt.severity).toBe(SecuritySeverity.LOW);
    expect(evt.details).toEqual({ source: 'test' });
    expect(evt.blocked).toBe(false);
  });

  it('should block and alert on critical/high-risk events', () => {
    const evt = SecurityAudit.logEvent(SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT, { attemptCount: 5 }, {
      userId: 'u2', userRole: UserRole.MEMBER, ipAddress: '198.96.155.3', userAgent: 'curl/8.0'
    });
    expect([SecuritySeverity.HIGH, SecuritySeverity.CRITICAL]).toContain(evt.severity);
    expect(evt.blocked).toBe(true);
    expect(evt.riskScore).toBeGreaterThanOrEqual(70);
  });

  it('should return events filtered and sorted with getEvents', () => {
    SecurityAudit.logEvent(SecurityEventType.LOGIN_FAILED, {});
    const critical = SecurityAudit.logEvent(SecurityEventType.SQL_INJECTION_ATTEMPT, {});
    const events = SecurityAudit.getEvents({ severity: SecuritySeverity.CRITICAL, limit: 1 });
    expect(events.length).toBe(1);
    expect(events[0].id).toBe(critical.id);
  });

  it('should produce security stats', () => {
    SecurityAudit.logEvent(SecurityEventType.LOGIN_FAILED, {});
    SecurityAudit.logEvent(SecurityEventType.PERMISSION_DENIED, {});
    const stats = SecurityAudit.getSecurityStats('hour');
    expect(stats.totalEvents).toBeGreaterThan(0);
    expect(Object.values(stats.eventsBySeverity).reduce((a, b) => a + b, 0)).toBe(stats.totalEvents);
    expect(Array.isArray(stats.riskTrend)).toBe(true);
  });

  it('should export events as JSON and CSV', () => {
    SecurityAudit.logEvent(SecurityEventType.LOGOUT, {});
    const json = SecurityAudit.exportEvents('json');
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);

    const csv = SecurityAudit.exportEvents('csv');
    expect(csv.split('\n')[0]).toContain('ID,Type,Severity,Timestamp');
  });
});
