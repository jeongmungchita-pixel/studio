import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { errorHandler, ErrorSeverity, ErrorType } from '../error-handler';
import { navigationManager } from '../navigation-manager';

// Helper to create a Firebase-like error
class MockFirebaseError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'FirebaseError';
  }
}

describe('error-handler recovery strategies', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(navigationManager, 'goToLogin').mockImplementation(() => {});
    vi.spyOn(navigationManager, 'navigate').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('AUTHENTICATION recovery triggers goToLogin when recovery executed', () => {
    const info = {
      type: ErrorType.AUTHENTICATION,
      severity: ErrorSeverity.LOW,
      message: 'auth',
      userMessage: 'auth',
      recoverable: false,
      retryable: false,
    } as any;
    (errorHandler as any).attemptRecovery(info);
    expect(navigationManager.goToLogin).toHaveBeenCalled();
  });

  it('AUTHORIZATION recovery navigates to /403 when recovery executed', () => {
    const info = {
      type: ErrorType.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      message: 'denied',
      userMessage: 'denied',
      recoverable: false,
      retryable: false,
    } as any;
    (errorHandler as any).attemptRecovery(info);
    expect(navigationManager.navigate).toHaveBeenCalledWith('/403', { replace: true });
  });

  it('NETWORK errors schedule retries and notify listeners', () => {
    const notify = vi.spyOn<any, any>(errorHandler as any, 'notifyListeners');
    const netErr = new Error('Network error');
    const info = errorHandler.handle(netErr, { action: 'test' });
    expect(info.type).toBe(ErrorType.NETWORK);
    // First retry should be scheduled after 1s
    vi.advanceTimersByTime(1000);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      userMessage: expect.stringContaining('재시도 중... (1/')
    }));
  });

  it('SYSTEM critical errors suggest refresh (window.confirm)', () => {
    // Spy confirm only (reload spying can be restricted by JSDOM)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    // Force call of private attemptRecovery with CRITICAL SYSTEM
    const errorInfo = {
      type: ErrorType.SYSTEM,
      severity: ErrorSeverity.CRITICAL,
      message: 'critical',
      userMessage: 'critical',
      recoverable: false,
      retryable: false,
    } as any;
    (errorHandler as any).attemptRecovery(errorInfo);
    expect(confirmSpy).toHaveBeenCalled();
  });
});
