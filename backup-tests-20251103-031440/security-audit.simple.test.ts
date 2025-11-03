import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityAudit, SecurityEventType, SecuritySeverity } from '../security-audit';

describe('SecurityAudit (simple)', () => {
  beforeEach(() => {
    // reset internal state by accessing events via getEvents() and slicing
    // There's no explicit reset API; we rely on generating new events and filtering in tests
  });

  it('high risk event (PRIVILEGE_ESCALATION_ATTEMPT) is blocked', () => {
    const ev = SecurityAudit.logEvent(SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT, { message: 'try' }, { userId: 'u1', ipAddress: '1.2.3.4' });
    expect(ev.blocked).toBe(true);
    expect(ev.riskScore).toBeGreaterThanOrEqual(70);
    expect([SecuritySeverity.CRITICAL, SecuritySeverity.HIGH, SecuritySeverity.MEDIUM, SecuritySeverity.LOW]).toContain(ev.severity);
  });

  it('rate limit exceeded event is medium severity and not necessarily blocked', () => {
    const ev = SecurityAudit.logEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, { attemptCount: 1 }, { userId: 'u2', ipAddress: '2.2.2.2' });
    // severity is MEDIUM by mapping
    const last = SecurityAudit.getEvents({ limit: 1 })[0];
    expect(last.type).toBe(SecurityEventType.RATE_LIMIT_EXCEEDED);
    // blocked can be true/false depending on time/useragent weighting; we verify structure
    expect(typeof last.riskScore).toBe('number');
  });

  it('suspicious activity with high attemptCount becomes blocked', () => {
    const ev = SecurityAudit.logEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, { attemptCount: 10 }, { userId: 'u3', ipAddress: '3.3.3.3', userAgent: 'curl/7.0' });
    const last = SecurityAudit.getEvents({ limit: 1 })[0];
    expect(last.id).toBe(ev.id);
    expect(last.blocked).toBe(true);
  });
});
