/**
 * 중앙 에러 처리 시스템
 * 모든 에러를 분류하고 적절한 처리를 수행합니다.
 */

import { FirebaseError } from 'firebase/app';
import { navigationManager } from './navigation-manager';

// 에러 타입 정의
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  FIREBASE = 'FIREBASE',
  SYSTEM = 'SYSTEM',
  UNKNOWN = 'UNKNOWN'
}

// 에러 심각도
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// 에러 컨텍스트
export interface ErrorContext {
  userId?: string;
  action?: string;
  component?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

// 에러 정보
export interface ErrorInfo {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  code?: string;
  context?: ErrorContext;
  originalError?: Error;
  recoverable: boolean;
  retryable: boolean;
}

// 에러 리스너 타입
type ErrorListener = (error: ErrorInfo) => void;

export class ErrorHandler {
  private static instance: ErrorHandler;
  private listeners: Set<ErrorListener> = new Set();
  private errorHistory: ErrorInfo[] = [];
  private maxHistorySize = 50;
  private retryAttempts: Map<string, number> = new Map();
  private maxRetryAttempts = 3;

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 전역 에러 핸들러 설정
   */
  private setupGlobalErrorHandlers(): void {
    // 브라우저 전역 에러 핸들러
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.handle(event.error, {
          action: 'global-error',
          metadata: {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        });
      });

      // Promise rejection 핸들러
      window.addEventListener('unhandledrejection', (event) => {
        this.handle(new Error(event.reason), {
          action: 'unhandled-rejection',
          metadata: { reason: event.reason }
        });
      });
    }
  }

  /**
   * 에러 처리 메인 함수
   */
  handle(error: Error | unknown, context?: ErrorContext): ErrorInfo {
    const errorInfo = this.classifyError(error, context);
    
    // 에러 히스토리에 추가
    this.addToHistory(errorInfo);
    
    // 리스너들에게 알림
    this.notifyListeners(errorInfo);
    
    // 로깅
    this.logError(errorInfo);
    
    // 복구 시도
    if (errorInfo.recoverable) {
      this.attemptRecovery(errorInfo);
    }
    
    return errorInfo;
  }

  /**
   * 에러 분류
   */
  private classifyError(error: Error | unknown, context?: ErrorContext): ErrorInfo {
    // Firebase 에러 처리
    if (this.isFirebaseError(error)) {
      return this.handleFirebaseError(error as FirebaseError, context);
    }
    
    // 네트워크 에러
    if (this.isNetworkError(error)) {
      return this.handleNetworkError(error as Error, context);
    }
    
    // 검증 에러
    if (this.isValidationError(error)) {
      return this.handleValidationError(error as Error, context);
    }
    
    // 기본 에러
    if (error instanceof Error) {
      return this.handleGenericError(error, context);
    }
    
    // 알 수 없는 에러
    return {
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      message: String(error),
      userMessage: '예상치 못한 오류가 발생했습니다.',
      context,
      recoverable: false,
      retryable: false
    };
  }

  /**
   * Firebase 에러 처리
   */
  private handleFirebaseError(error: FirebaseError, context?: ErrorContext): ErrorInfo {
    const firebaseErrorMap: Record<string, { userMessage: string; severity: ErrorSeverity; type: ErrorType }> = {
      'auth/user-not-found': {
        userMessage: '사용자를 찾을 수 없습니다.',
        severity: ErrorSeverity.LOW,
        type: ErrorType.AUTHENTICATION
      },
      'auth/wrong-password': {
        userMessage: '비밀번호가 올바르지 않습니다.',
        severity: ErrorSeverity.LOW,
        type: ErrorType.AUTHENTICATION
      },
      'auth/invalid-credential': {
        userMessage: '이메일 또는 비밀번호가 올바르지 않습니다.',
        severity: ErrorSeverity.LOW,
        type: ErrorType.AUTHENTICATION
      },
      'auth/email-already-in-use': {
        userMessage: '이미 사용 중인 이메일입니다.',
        severity: ErrorSeverity.LOW,
        type: ErrorType.VALIDATION
      },
      'auth/weak-password': {
        userMessage: '비밀번호가 너무 약합니다. 6자 이상 입력해주세요.',
        severity: ErrorSeverity.LOW,
        type: ErrorType.VALIDATION
      },
      'auth/network-request-failed': {
        userMessage: '네트워크 연결을 확인해주세요.',
        severity: ErrorSeverity.MEDIUM,
        type: ErrorType.NETWORK
      },
      'auth/too-many-requests': {
        userMessage: '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.',
        severity: ErrorSeverity.MEDIUM,
        type: ErrorType.AUTHENTICATION
      },
      'auth/user-disabled': {
        userMessage: '계정이 비활성화되었습니다. 관리자에게 문의하세요.',
        severity: ErrorSeverity.HIGH,
        type: ErrorType.AUTHORIZATION
      },
      'permission-denied': {
        userMessage: '권한이 없습니다.',
        severity: ErrorSeverity.MEDIUM,
        type: ErrorType.AUTHORIZATION
      },
      'unavailable': {
        userMessage: '서비스를 일시적으로 사용할 수 없습니다.',
        severity: ErrorSeverity.HIGH,
        type: ErrorType.SYSTEM
      }
    };

    const errorConfig = firebaseErrorMap[error.code] || {
      userMessage: `Firebase 오류: ${error.message}`,
      severity: ErrorSeverity.MEDIUM,
      type: ErrorType.FIREBASE
    };

    return {
      ...errorConfig,
      message: error.message,
      code: error.code,
      context,
      originalError: error,
      recoverable: errorConfig.type === ErrorType.NETWORK,
      retryable: errorConfig.type === ErrorType.NETWORK || error.code === 'unavailable'
    };
  }

  /**
   * 네트워크 에러 처리
   */
  private handleNetworkError(error: Error, context?: ErrorContext): ErrorInfo {
    return {
      type: ErrorType.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      message: error.message,
      userMessage: '네트워크 연결을 확인해주세요.',
      context,
      originalError: error,
      recoverable: true,
      retryable: true
    };
  }

  /**
   * 검증 에러 처리
   */
  private handleValidationError(error: Error, context?: ErrorContext): ErrorInfo {
    return {
      type: ErrorType.VALIDATION,
      severity: ErrorSeverity.LOW,
      message: error.message,
      userMessage: error.message || '입력 값을 확인해주세요.',
      context,
      originalError: error,
      recoverable: false,
      retryable: false
    };
  }

  /**
   * 일반 에러 처리
   */
  private handleGenericError(error: Error, context?: ErrorContext): ErrorInfo {
    return {
      type: ErrorType.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      message: error.message,
      userMessage: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      context,
      originalError: error,
      recoverable: false,
      retryable: true
    };
  }

  /**
   * 에러 타입 체크 함수들
   */
  private isFirebaseError(error: unknown): error is FirebaseError {
    return error instanceof Error && 'code' in error && typeof (error as any).code === 'string';
  }

  private isNetworkError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return error.message.toLowerCase().includes('network') ||
           error.message.toLowerCase().includes('fetch');
  }

  private isValidationError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return error.name === 'ValidationError' ||
           error.message.toLowerCase().includes('validation');
  }

  /**
   * 에러 복구 시도
   */
  private attemptRecovery(errorInfo: ErrorInfo): void {
    const recoveryStrategies: Record<ErrorType, () => void> = {
      [ErrorType.AUTHENTICATION]: () => {
        // 인증 에러: 로그인 페이지로 이동
        navigationManager.goToLogin();
      },
      [ErrorType.AUTHORIZATION]: () => {
        // 권한 에러: 403 페이지로 이동
        navigationManager.navigate('/403', { replace: true });
      },
      [ErrorType.NETWORK]: () => {
        // 네트워크 에러: 재시도
        if (errorInfo.retryable) {
          this.scheduleRetry(errorInfo);
        }
      },
      [ErrorType.VALIDATION]: () => {
        // 검증 에러: 사용자에게 알림만
      },
      [ErrorType.FIREBASE]: () => {
        // Firebase 에러: 타입에 따라 처리
        if (errorInfo.retryable) {
          this.scheduleRetry(errorInfo);
        }
      },
      [ErrorType.SYSTEM]: () => {
        // 시스템 에러: 새로고침 제안
        if (errorInfo.severity === ErrorSeverity.CRITICAL) {
          this.suggestRefresh();
        }
      },
      [ErrorType.UNKNOWN]: () => {
        // 알 수 없는 에러: 로그만
      }
    };

    const strategy = recoveryStrategies[errorInfo.type];
    if (strategy) {
      strategy();
    }
  }

  /**
   * 재시도 스케줄링
   */
  private scheduleRetry(errorInfo: ErrorInfo): void {
    const key = `${errorInfo.type}-${errorInfo.code || 'unknown'}`;
    const attempts = this.retryAttempts.get(key) || 0;
    
    if (attempts < this.maxRetryAttempts) {
      this.retryAttempts.set(key, attempts + 1);
      
      // 지수 백오프로 재시도
      const delay = Math.pow(2, attempts) * 1000;
      setTimeout(() => {
        this.notifyListeners({
          ...errorInfo,
          userMessage: `재시도 중... (${attempts + 1}/${this.maxRetryAttempts})`
        });
      }, delay);
    } else {
      // 최대 재시도 횟수 초과
      this.notifyListeners({
        ...errorInfo,
        severity: ErrorSeverity.HIGH,
        userMessage: '여러 번 시도했지만 실패했습니다. 잠시 후 다시 시도해주세요.'
      });
      this.retryAttempts.delete(key);
    }
  }

  /**
   * 새로고침 제안
   */
  private suggestRefresh(): void {
    if (typeof window !== 'undefined') {
      const shouldRefresh = window.confirm('페이지를 새로고침하시겠습니까?');
      if (shouldRefresh) {
        window.location.reload();
      }
    }
  }

  /**
   * 에러 히스토리에 추가
   */
  private addToHistory(errorInfo: ErrorInfo): void {
    this.errorHistory.unshift({
      ...errorInfo,
      context: {
        ...errorInfo.context,
        timestamp: new Date().toISOString()
      }
    });
    
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.pop();
    }
  }

  /**
   * 리스너들에게 알림
   */
  private notifyListeners(errorInfo: ErrorInfo): void {
    this.listeners.forEach(listener => {
      try {
        listener(errorInfo);
      } catch (error) {
        console.error('Error in error listener:', error);
      }
    });
  }

  /**
   * 에러 로깅
   */
  private logError(errorInfo: ErrorInfo): void {
    const logLevel = this.getLogLevel(errorInfo.severity);
    const logMessage = `[${errorInfo.type}] ${errorInfo.message}`;
    const logData = {
      errorInfo,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };

    switch (logLevel) {
      case 'error':
        console.error(logMessage, logData);
        break;
      case 'warn':
        console.warn(logMessage, logData);
        break;
      case 'info':
        console.info(logMessage, logData);
        break;
      default:
        console.log(logMessage, logData);
    }

    // 프로덕션에서는 외부 로깅 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(errorInfo);
    }
  }

  /**
   * 로그 레벨 결정
   */
  private getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'log';
    }
  }

  /**
   * 외부 로깅 서비스로 전송
   */
  private sendToLoggingService(errorInfo: ErrorInfo): void {
    // TODO: Sentry, LogRocket 등 외부 서비스 연동
    // 예시:
    // if (window.Sentry) {
    //   window.Sentry.captureException(errorInfo.originalError, {
    //     level: this.getLogLevel(errorInfo.severity),
    //     tags: {
    //       type: errorInfo.type,
    //       code: errorInfo.code
    //     },
    //     extra: errorInfo.context
    //   });
    // }
  }

  /**
   * 에러 리스너 등록
   */
  subscribe(listener: ErrorListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 에러 히스토리 반환
   */
  getHistory(): ErrorInfo[] {
    return [...this.errorHistory];
  }

  /**
   * 에러 히스토리 초기화
   */
  clearHistory(): void {
    this.errorHistory = [];
  }

  /**
   * 특정 타입의 에러 개수 반환
   */
  getErrorCount(type?: ErrorType): number {
    if (type) {
      return this.errorHistory.filter(e => e.type === type).length;
    }
    return this.errorHistory.length;
  }

  /**
   * 디버그 정보 출력
   */
  debug(): void {
    console.log('🔍 ErrorHandler Debug:', {
      historyLength: this.errorHistory.length,
      listenersCount: this.listeners.size,
      retryAttemptsCount: this.retryAttempts.size,
      recentErrors: this.errorHistory.slice(0, 5)
    });
  }
}

// 전역 인스턴스 export
export const errorHandler = ErrorHandler.getInstance();
