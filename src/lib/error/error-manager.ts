/**
 * 통합 에러 관리 시스템
 * services와 utils의 error-handler를 통합한 중앙 에러 처리 시스템
 */
import { FirebaseError } from 'firebase/app';
import { navigationManager } from '@/services/navigation-manager';

/**
 * API 에러 클래스
 */
export class APIError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly context?: any;
  
  constructor(message: string, statusCode: number = 500, code?: string, context?: any) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code || 'API_ERROR';
    this.context = context;
    Object.setPrototypeOf(this, APIError.prototype);
  }
  
  static fromError(error: unknown): APIError {
    if (error instanceof APIError) {
      return error;
    }
    
    if (error instanceof Error) {
      return new APIError(error.message, 500, 'UNKNOWN_ERROR');
    }
    
    return new APIError('Unknown error occurred', 500, 'UNKNOWN_ERROR');
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      context: this.context
    };
  }
  
  // Static factory methods for common errors
  static notFound(message: string = 'Resource not found', context?: any): APIError {
    return new APIError(message, 404, 'NOT_FOUND', context);
  }
  
  static badRequest(message: string = 'Bad request', context?: any): APIError {
    return new APIError(message, 400, 'BAD_REQUEST', context);
  }
  
  static unauthorized(message: string = 'Unauthorized', context?: any): APIError {
    return new APIError(message, 401, 'UNAUTHORIZED', context);
  }
  
  static forbidden(message: string = 'Forbidden', context?: any): APIError {
    return new APIError(message, 403, 'FORBIDDEN', context);
  }
  
  static internal(message: string = 'Internal server error', context?: any): APIError {
    return new APIError(message, 500, 'INTERNAL_ERROR', context);
  }
  
  static conflict(message: string = 'Conflict', context?: any): APIError {
    return new APIError(message, 409, 'CONFLICT', context);
  }
  
  static invalidToken(message: string = 'Invalid token', context?: any): APIError {
    return new APIError(message, 401, 'INVALID_TOKEN', context);
  }
  
  static insufficientPermissions(message: string = 'Insufficient permissions', context?: any): APIError {
    return new APIError(message, 403, 'INSUFFICIENT_PERMISSIONS', context);
  }
}

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
  metadata?: Record<string, unknown>;
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

// 재시도 옵션 (utils/error-handler.ts에서 가져옴)
export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  retryCondition?: (error: unknown) => boolean;
}

// 에러 리스너 타입
type ErrorListener = (error: ErrorInfo) => void;

/**
 * 통합 에러 관리자 클래스
 */
export class ErrorManager {
  private static instance: ErrorManager;
  private listeners: Set<ErrorListener> = new Set();
  private errorHistory: ErrorInfo[] = [];
  private maxHistorySize = 50;

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  /**
   * 글로벌 에러 핸들러 설정
   */
  private setupGlobalErrorHandlers() {
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled Promise Rejection:', event.reason);
        this.handleError(event.reason, { action: 'unhandledrejection' });
      });

      window.addEventListener('error', (event) => {
        console.error('Global Error:', event.error);
        this.handleError(event.error, { action: 'global-error' });
      });
    }
  }

  /**
   * 에러 분류
   */
  private classifyError(error: unknown): { type: ErrorType; severity: ErrorSeverity; code?: string } {
    // Firebase 에러
    if (error instanceof FirebaseError) {
      const authErrors = ['auth/', 'permission-denied', 'unauthenticated'];
      if (authErrors.some(code => error.code.includes(code))) {
        return { 
          type: ErrorType.AUTHENTICATION, 
          severity: ErrorSeverity.MEDIUM,
          code: error.code
        };
      }
      return { 
        type: ErrorType.FIREBASE, 
        severity: ErrorSeverity.MEDIUM,
        code: error.code
      };
    }

    // API 에러
    if (error instanceof APIError) {
      if (error.statusCode === 401) {
        return { type: ErrorType.AUTHENTICATION, severity: ErrorSeverity.HIGH };
      }
      if (error.statusCode === 403) {
        return { type: ErrorType.AUTHORIZATION, severity: ErrorSeverity.MEDIUM };
      }
      if (error.statusCode >= 500) {
        return { type: ErrorType.SYSTEM, severity: ErrorSeverity.HIGH };
      }
      return { type: ErrorType.NETWORK, severity: ErrorSeverity.MEDIUM };
    }

    // 네트워크 에러
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { type: ErrorType.NETWORK, severity: ErrorSeverity.HIGH };
    }

    // 기타
    return { type: ErrorType.UNKNOWN, severity: ErrorSeverity.LOW };
  }

  /**
   * Firebase 에러 메시지 매핑
   */
  private getFirebaseErrorMessage(code: string): string {
    const errorMessages: Record<string, string> = {
      'auth/user-not-found': '사용자를 찾을 수 없습니다',
      'auth/wrong-password': '비밀번호가 올바르지 않습니다',
      'auth/email-already-in-use': '이미 사용 중인 이메일입니다',
      'auth/weak-password': '비밀번호가 너무 약합니다',
      'auth/invalid-email': '올바르지 않은 이메일 형식입니다',
      'auth/requires-recent-login': '재인증이 필요합니다',
      'permission-denied': '권한이 없습니다',
      'unavailable': '서비스를 일시적으로 사용할 수 없습니다',
    };
    return errorMessages[code] || '오류가 발생했습니다';
  }

  /**
   * 메인 에러 처리 메서드
   */
  handleError(error: unknown, context?: Partial<ErrorContext>): ErrorInfo {
    const { type, severity, code } = this.classifyError(error);
    const originalError = error instanceof Error ? error : new Error(String(error));

    // 사용자 친화적 메시지 생성
    let userMessage = '오류가 발생했습니다. 다시 시도해주세요.';
    if (code) {
      userMessage = this.getFirebaseErrorMessage(code);
    } else if (error instanceof APIError) {
      userMessage = error.message;
    }

    const errorInfo: ErrorInfo = {
      type,
      severity,
      message: originalError.message,
      userMessage,
      code,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
      },
      originalError,
      recoverable: severity !== ErrorSeverity.CRITICAL,
      retryable: this.isRetryable(error),
    };

    // 에러 히스토리에 추가
    this.addToHistory(errorInfo);

    // 리스너들에게 알림
    this.notifyListeners(errorInfo);

    // 심각한 에러의 경우 특별 처리
    if (severity === ErrorSeverity.CRITICAL) {
      this.handleCriticalError(errorInfo);
    }

    // 인증 에러의 경우 로그인 페이지로 리다이렉트
    if (type === ErrorType.AUTHENTICATION) {
      navigationManager.navigate('/login', { replace: true });
    }

    return errorInfo;
  }

  /**
   * 재시도 가능 여부 판단
   */
  private isRetryable(error: unknown): boolean {
    if (error instanceof APIError) {
      return error.statusCode >= 500 || error.statusCode === 0;
    }

    const retryableFirebaseCodes = [
      'unavailable',
      'deadline-exceeded',
      'resource-exhausted',
      'aborted',
      'internal',
    ];

    const code = typeof (error as any)?.code === 'string' ? (error as any).code : '';
    return retryableFirebaseCodes.includes(code);
  }

  /**
   * 재시도 로직을 포함한 함수 실행 (utils/error-handler.ts에서 통합)
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      delay = 1000,
      backoff = 'exponential',
      retryCondition = (error) => this.isRetryable(error),
    } = options;

    let lastError: Error | unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error;

        // 마지막 시도이거나 재시도 조건에 맞지 않으면 에러 던지기
        if (attempt === maxRetries || !retryCondition(error)) {
          this.handleError(error, { 
            action: 'retry-failed',
            metadata: { attempts: attempt + 1 }
          });
          throw error;
        }

        // 재시도 전 대기
        const waitTime = backoff === 'exponential' 
          ? delay * Math.pow(2, attempt)
          : delay * (attempt + 1);

        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw lastError;
  }

  /**
   * 에러 히스토리에 추가
   */
  private addToHistory(error: ErrorInfo) {
    this.errorHistory.unshift(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.pop();
    }
  }

  /**
   * 리스너들에게 알림
   */
  private notifyListeners(error: ErrorInfo) {
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }

  /**
   * 심각한 에러 처리
   */
  private handleCriticalError(error: ErrorInfo) {
    console.error('CRITICAL ERROR:', error);
    // 필요시 외부 모니터링 서비스로 전송
    // Sentry, LogRocket 등
  }

  /**
   * 에러 리스너 등록
   */
  subscribe(listener: ErrorListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 에러 히스토리 조회
   */
  getErrorHistory(): ErrorInfo[] {
    return [...this.errorHistory];
  }

  /**
   * 에러 히스토리 초기화
   */
  clearHistory() {
    this.errorHistory = [];
  }

  /**
   * 특정 타입의 에러만 필터링
   */
  getErrorsByType(type: ErrorType): ErrorInfo[] {
    return this.errorHistory.filter(error => error.type === type);
  }

  /**
   * 최근 에러 조회
   */
  getRecentErrors(count: number = 10): ErrorInfo[] {
    return this.errorHistory.slice(0, count);
  }
}

// 싱글톤 인스턴스 export
export const errorManager = ErrorManager.getInstance();

// 편의 함수들
export const handleError = (error: unknown, context?: Partial<ErrorContext>) => 
  errorManager.handleError(error, context);

export const withRetry = <T>(fn: () => Promise<T>, options?: RetryOptions) =>
  errorManager.withRetry(fn, options);

/**
 * 에러 로깅 함수 (utils/error/error-handler.ts에서 통합)
 */
export function logError(error: Error | unknown, context?: string): void {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context: context || 'Unknown',
    error: error instanceof APIError ? error.toJSON() : {
      name: typeof (error as any)?.name === 'string' ? (error as any).name : 'Error',
      message: typeof (error as any)?.message === 'string' ? (error as any).message : 'Unknown error',
      stack: typeof (error as any)?.stack === 'string' ? (error as any).stack : undefined,
    },
  };

  // 개발 환경에서는 콘솔에 출력
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Log]', errorInfo);
  }

  // ErrorManager에도 기록
  errorManager.handleError(error, { action: context });
}

/**
 * 에러 핸들러 래퍼
 */
export function createErrorHandler(
  onError?: (error: APIError) => void
) {
  return (error: unknown, context?: string) => {
    const apiError = APIError.fromError(error);
    logError(apiError, context);
    if (onError) {
      onError(apiError);
    }
    return apiError;
  };
}

/**
 * 안전한 비동기 함수 실행
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback?: T,
  onError?: (error: APIError) => void
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error: unknown) {
    const apiError = APIError.fromError(error);
    logError(apiError, 'safeAsync');
    if (onError) {
      onError(apiError);
    }
    return fallback;
  }
}
