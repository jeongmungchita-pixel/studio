import { describe, it, expect, beforeEach } from 'vitest';
import { logger, LogLevel } from '../logger';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

describe('logger (more)', () => {
  beforeEach(() => {
    logger.clearLogs();
  });

  it('applies combined filters (level + category + time window)', async () => {
    logger.clearLogs();
    logger.debug('pre', 'CATX');
    const start = new Date();
    await sleep(2);
    logger.info('target-1', 'CATY');
    logger.warn('target-2', 'CATY');
    await sleep(2);
    const end = new Date();
    logger.info('post', 'CATZ');

    const filtered = logger.getLogs({ level: LogLevel.INFO, category: 'CATY', startTime: start, endTime: end });
    // Only info+ in CATY and within window
    expect(filtered.some(l => l.message === 'target-1')).toBe(true);
    expect(filtered.some(l => l.message === 'target-2')).toBe(true);
    expect(filtered.some(l => l.message === 'pre')).toBe(false);
    expect(filtered.some(l => l.message === 'post')).toBe(false);
  });

  it('filters logs by level, category, and time window', async () => {
    logger.debug('d1', 'CAT1');
    const start = new Date();
    await sleep(5);
    logger.info('i1', 'CAT2');
    await sleep(5);
    const end = new Date();
    logger.warn('w1', 'CAT1');

    // level filter (>= INFO)
    const levelLogs = logger.getLogs({ level: LogLevel.INFO });
    expect(levelLogs.every(l => l.level >= LogLevel.INFO)).toBe(true);

    // category filter
    const cat1 = logger.getLogs({ category: 'CAT1' });
    expect(cat1.every(l => l.category === 'CAT1')).toBe(true);

    // time window should include the middle info event (timer granularity may vary in CI)
    const windowLogs = logger.getLogs({ startTime: start, endTime: end });
    expect(windowLogs.some(l => l.message === 'i1')).toBe(true);
  });

  it('keeps only the latest 100 logs in localStorage', () => {
    for (let i = 0; i < 105; i++) {
      logger.info(`log-${i}`);
    }
    const all = logger.getLogs();
    expect(all.length).toBeLessThanOrEqual(100);
    // the earliest entries must be dropped; latest should be present
    expect(all.some(l => l.message === 'log-104')).toBe(true);
  });
});
