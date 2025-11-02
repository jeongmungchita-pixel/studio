import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SecurityAudit, SecurityEventType, SecuritySeverity } from '../security-audit';

describe('SecurityAudit (extended)', () => {
  const originalLocal = global.localStorage;
  const originalSession = global.sessionStorage;
  const storeLocal: Record<string, string> = {};
  const storeSession: Record<string, string> = {};

  beforeEach(() => {
    // Minimal local/session storage mocks
    // @ts-ignore
    global.localStorage = {
      getItem: (k: string) => storeLocal[k] ?? null,
      setItem: (k: string, v: string) => { storeLocal[k] = String(v); },
      removeItem: (k: string) => { delete storeLocal[k]; },
      clear: () => { Object.keys(storeLocal).forEach(k => delete storeLocal[k]); },
    };
    // @ts-ignore
    global.sessionStorage = {
      getItem: (k: string) => storeSession[k] ?? null,
      setItem: (k: string, v: string) => { storeSession[k] = String(v); },
      removeItem: (k: string) => { delete storeSession[k]; },
      clear: () => { Object.keys(storeSession).forEach(k => delete storeSession[k]); },
    };
  });

  afterEach(() => {
    // @ts-ignore
    global.localStorage = originalLocal;
    // @ts-ignore
    global.sessionStorage = originalSession;
    Object.keys(storeLocal).forEach(k => delete storeLocal[k]);
    Object.keys(storeSession).forEach(k => delete storeSession[k]);
  });

  it('blocks high risk events (user/ip) and queues alerts', () => {
    const evt = SecurityAudit.logEvent(
      SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT,
      { attemptCount: 3, message: 'try escalate' },
      { userId: 'u1', ipAddress: '203.0.113.1', userAgent: 'curl/8.0' }
    );
    expect(evt.blocked).toBe(true);

    // user blocked
    const blockedUsers = JSON.parse(localStorage.getItem('blocked-users') || '{}');
    expect(blockedUsers['u1']).toBeTruthy();
    expect(blockedUsers['u1'].reason).toContain('PRIVILEGE_ESCALATION_ATTEMPT');

    // ip blocked
    const blockedIPs = JSON.parse(localStorage.getItem('blocked-ips') || '{}');
    expect(blockedIPs['203.0.113.1']).toBeTruthy();

    // admin-alerts queued
    const adminAlerts = JSON.parse(sessionStorage.getItem('admin-alerts') || '[]');
    expect(adminAlerts.length).toBeGreaterThan(0);
    expect(adminAlerts[0].requiresAction).toBe(true);
  });

  it('calculateSeverity and risk produce bounded values', () => {
    const e1 = SecurityAudit.logEvent(SecurityEventType.LOGIN_FAILED, { attemptCount: 1 }, { userId: 'u2' });
    expect([SecuritySeverity.LOW, SecuritySeverity.MEDIUM, SecuritySeverity.HIGH, SecuritySeverity.CRITICAL]).toContain(e1.severity);
    expect(e1.riskScore).toBeGreaterThanOrEqual(0);
    expect(e1.riskScore).toBeLessThanOrEqual(100);
  });

  it('getSecurityStats returns consistent structure and blocked count', () => {
    const stats = SecurityAudit.getSecurityStats('day');
    expect(stats).toHaveProperty('totalEvents');
    expect(stats).toHaveProperty('eventsBySeverity');
    expect(stats).toHaveProperty('eventsByType');
    expect(stats).toHaveProperty('riskTrend');
    expect(Array.isArray(stats.riskTrend)).toBe(true);
    expect(stats.blockedEvents).toBeGreaterThanOrEqual(0);
  });

  it('exportEvents outputs json and csv', () => {
    const json = SecurityAudit.exportEvents('json');
    expect(() => JSON.parse(json)).not.toThrow();
    const csv = SecurityAudit.exportEvents('csv');
    expect(csv.split('\n')[0]).toContain('ID,Type,Severity,Timestamp');
  });
});
