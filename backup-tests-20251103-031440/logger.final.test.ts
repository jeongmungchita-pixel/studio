import { describe, it, expect, beforeEach } from 'vitest';
import { logger } from '../logger';

describe('logger (final touches)', () => {
  beforeEach(() => {
    logger.clearLogs();
  });

  it('setUserId reflects on subsequent logs and exportLogs', () => {
    logger.setUserId('user-xyz');
    logger.info('msg-x', 'CAT');
    const [rec] = logger.getLogs().slice(-1);
    expect(rec.userId).toBe('user-xyz');

    const exported = logger.exportLogs();
    expect(exported).toContain('user-xyz');
    expect(exported).toContain('msg-x');
  });
});
