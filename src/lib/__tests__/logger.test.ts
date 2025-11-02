import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger, LogLevel, logReactError, measurePerformance } from '../logger';

function readAllLogs() {
  return logger.getLogs();
}

describe('logger', () => {
  beforeEach(() => {
    // reset logs between tests
    logger.clearLogs();
  });

  it('stores logs in localStorage and includes metadata', () => {
    logger.setUserId('u-1');
    logger.info('hello world', 'TEST', { a: 1 });
    const logs = readAllLogs();
    expect(logs.length).toBeGreaterThan(0);
    const last = logs[logs.length - 1];
    expect(last.message).toBe('hello world');
    expect(last.category).toBe('TEST');
    expect(last.userId).toBe('u-1');
    expect(last.metadata).toEqual({ a: 1 });
  });

  it('respects level filtering (DEBUG visible in dev)', () => {
    logger.clearLogs();
    logger.debug('debug-msg');
    const logs = readAllLogs();
    // In dev default level is DEBUG so it should be logged
    expect(logs.some(l => l.message === 'debug-msg')).toBe(true);
  });

  it('security logs include security fields', () => {
    logger.clearLogs();
    logger.security({ type: 'LOGIN_ATTEMPT', userId: 'u2', ip: '127.0.0.1', userAgent: 'UA', message: 'try', metadata: { x: 1 } });
    const logs = readAllLogs();
    const sec = logs.find(l => l.category === 'SECURITY');
    expect(sec?.metadata).toMatchObject({ type: 'LOGIN_ATTEMPT', ip: '127.0.0.1', userAgent: 'UA', x: 1 });
  });

  it('performance helper records duration', async () => {
    logger.clearLogs();
    await measurePerformance('op', async () => {
      await new Promise(res => setTimeout(res, 5));
    });
    const logs = logger.getLogs({ category: 'PERFORMANCE' });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].message).toContain('Performance: op completed in');
  });

  it('userAction and apiCall write expected categories', () => {
    logger.clearLogs();
    logger.userAction('clicked_button', { id: 10 });
    logger.apiCall('GET', '/api/x', 200, 15);
    const ua = logger.getLogs({ category: 'USER_ACTION' });
    const api = logger.getLogs({ category: 'API' });
    expect(ua.length).toBe(1);
    expect(api.length).toBe(1);
    expect(api[0].metadata).toMatchObject({ method: 'GET', endpoint: '/api/x', statusCode: 200, duration: 15 });
  });

  it('exportLogs returns a formatted string and clearLogs empties', () => {
    logger.clearLogs();
    logger.warn('warn here');
    const exported = logger.exportLogs();
    expect(typeof exported).toBe('string');
    expect(exported.length).toBeGreaterThan(0);
    logger.clearLogs();
    expect(readAllLogs().length).toBe(0);
  });

  it('logReactError records error with stack metadata', () => {
    logger.clearLogs();
    const err = new Error('react broke');
    logReactError(err, { componentStack: 'Stack: <Comp />' });
    const logs = readAllLogs();
    const rec = logs.find(l => l.category === 'REACT_ERROR');
    expect(rec?.message).toContain('react broke');
    expect(rec?.stack).toBeDefined();
  });

  it('global error handler writes GLOBAL_ERROR category', () => {
    logger.clearLogs();
    const evt = new ErrorEvent('error', { message: 'boom', filename: 'f.js', lineno: 1, colno: 2 });
    window.dispatchEvent(evt);
    const logs = logger.getLogs({ category: 'GLOBAL_ERROR' });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].message).toContain('Uncaught Error');
  });

  it('unhandledrejection handler records rejection reason', () => {
    logger.clearLogs();
    const rej = new PromiseRejectionEvent('unhandledrejection', { reason: 'reason-x', promise: Promise.resolve() });
    window.dispatchEvent(rej);
    const logs = logger.getLogs({ category: 'PROMISE_REJECTION' });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].message).toContain('Unhandled Promise Rejection');
  });
});
