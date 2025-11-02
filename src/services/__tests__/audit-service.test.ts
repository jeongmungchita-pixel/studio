import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '../audit-service';
import { UserRole } from '@/types/auth';
import { addDoc, getDocs } from 'firebase/firestore';

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn(() => ({})),
    addDoc: vi.fn(async () => ({})),
    query: vi.fn((...args: any[]) => args),
    where: vi.fn((...args: any[]) => ({ where: args })),
    orderBy: vi.fn((...args: any[]) => ({ orderBy: args })),
    limit: vi.fn((...args: any[]) => ({ limit: args })),
    getDocs: vi.fn(async () => ({ docs: [], empty: true })),
  };
});

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    vi.clearAllMocks();
    (AuditService as any).instance = undefined;
    service = AuditService.getInstance();
    service.initialize({} as any);
  });

  it('should be singleton', () => {
    expect(AuditService.getInstance()).toBe(AuditService.getInstance());
  });

  it('log (critical/error) should write immediately via addDoc', async () => {
    await service.log({ action: 'login_failed', severity: 'error' });
    expect(addDoc).toHaveBeenCalledTimes(1);
  });

  it('logLogin should enqueue info and write error immediately', async () => {
    await service.logLogin('u1', 'a@b.com', UserRole.MEMBER, true);
    await service.logLogin('u1', 'a@b.com', UserRole.MEMBER, false);
    expect(addDoc).toHaveBeenCalledTimes(1); // only the failed (warning) does not write immediately, but our implementation writes immediately for error/critical only
  });

  it('logAccessDenied should not throw', async () => {
    await expect(service.logAccessDenied('u1', '/admin', 'forbidden')).resolves.toBeUndefined();
  });

  it('logPermissionChange should not throw', async () => {
    await expect(service.logPermissionChange('u1', UserRole.MEMBER, UserRole.CLUB_MANAGER, 'admin')).resolves.toBeUndefined();
  });

  it('logDataChange should not throw', async () => {
    await expect(service.logDataChange('u1', 'data_created', 'users', { id: 'x' })).resolves.toBeUndefined();
  });

  it('getAuditLogs should return empty array by default', async () => {
    const logs = await service.getAuditLogs({}, 10);
    expect(Array.isArray(logs)).toBe(true);
  });

  it('getAuditLogs should map docs data', async () => {
    (getDocs as any).mockResolvedValueOnce({
      docs: [
        { data: () => ({ action: 'login', severity: 'info', timestamp: new Date().toISOString() }) },
        { data: () => ({ action: 'access_denied', severity: 'warning', timestamp: new Date().toISOString() }) },
      ],
      empty: false,
    });
    const logs = await service.getAuditLogs({ userId: 'u1' }, 10);
    expect(logs.length).toBe(2);
  });

  it('getSecuritySummary returns aggregated counts', async () => {
    (getDocs as any).mockResolvedValueOnce({
      docs: [
        { data: () => ({ action: 'login', severity: 'info', timestamp: new Date().toISOString() }) },
        { data: () => ({ action: 'login_failed', severity: 'warning', timestamp: new Date().toISOString() }) },
        { data: () => ({ action: 'access_denied', severity: 'warning', timestamp: new Date().toISOString() }) },
        { data: () => ({ action: 'data_created', severity: 'critical', timestamp: new Date().toISOString() }) },
      ],
      empty: false,
    });
    const summary = await service.getSecuritySummary(7);
    expect(summary.totalLogins).toBe(1);
    expect(summary.failedLogins).toBe(1);
    expect(summary.accessDenied).toBe(1);
    expect(summary.criticalEvents).toBe(1);
  });

  it('detectAnomalies flags patterns', async () => {
    const now = Date.now();
    (getDocs as any).mockResolvedValueOnce({
      docs: [
        // many failed logins within last hour
        { data: () => ({ action: 'login_failed', timestamp: new Date(now - 1000).toISOString(), severity: 'warning' }) },
        { data: () => ({ action: 'login_failed', timestamp: new Date(now - 2000).toISOString(), severity: 'warning' }) },
        { data: () => ({ action: 'login_failed', timestamp: new Date(now - 3000).toISOString(), severity: 'warning' }) },
        { data: () => ({ action: 'login_failed', timestamp: new Date(now - 4000).toISOString(), severity: 'warning' }) },
        { data: () => ({ action: 'login_failed', timestamp: new Date(now - 5000).toISOString(), severity: 'warning' }) },
        { data: () => ({ action: 'login_failed', timestamp: new Date(now - 6000).toISOString(), severity: 'warning' }) },
        // access denieds
        { data: () => ({ action: 'access_denied', timestamp: new Date(now - 7000).toISOString(), severity: 'warning' }) },
        { data: () => ({ action: 'access_denied', timestamp: new Date(now - 8000).toISOString(), severity: 'warning' }) },
        { data: () => ({ action: 'access_denied', timestamp: new Date(now - 9000).toISOString(), severity: 'warning' }) },
        { data: () => ({ action: 'access_denied', timestamp: new Date(now - 10000).toISOString(), severity: 'warning' }) },
        { data: () => ({ action: 'access_denied', timestamp: new Date(now - 11000).toISOString(), severity: 'warning' }) },
      ],
      empty: false,
    });
    const anomalies = await service.detectAnomalies('u1');
    expect(anomalies.some(a => a.includes('Multiple failed login'))).toBe(true);
    expect(anomalies.some(a => a.includes('Frequent access denials'))).toBe(true);
  });
});
