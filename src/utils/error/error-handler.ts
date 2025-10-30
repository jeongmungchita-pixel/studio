import { APIError } from './api-error';

/**
 * 재시도 옵션 인터페이스
 */
export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  retryCondition?: (error: any) => boolean;
}

/**
 * 기본 재시도 조건
 * 네트워크 오류나 일시적인 서버 오류에 대해서만 재시도
 */
const defaultRetryCondition = (error: any): boolean => {
  if (error instanceof APIError) {
    // 5xx 서버 오류나 네트워크 오류에 대해서만 재시도
    return error.statusCode >= 500 || error.statusCode === 0;
  }
  
  // Firebase 에러 중 재시도 가능한 것들
  const retryableFirebaseCodes = [
    'unavailable',
    'deadline-exceeded',
    'resource-exhausted',
    'aborted',
    'internal',
  ];
  
  return retryableFirebaseCodes.includes(error.code);
};

/**
 * 재시도 로직을 포함한 함수 실행
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 'exponential',
    retryCondition = defaultRetryCondition,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 마지막 시도이거나 재시도 조건에 맞지 않으면 에러 던지기
      if (attempt === maxRetries || !retryCondition(error)) {
        throw APIError.fromError(error);
      }

      // 재시도 전 대기
      const waitTime = backoff === 'exponential' 
        ? delay * Math.pow(2, attempt)
        : delay * (attempt + 1);

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw APIError.fromError(lastError);
}

/**
 * 타임아웃을 포함한 함수 실행
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 10000
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new APIError(
          `요청 시간이 초과되었습니다. (${timeoutMs}ms)`,
          'TIMEOUT_ERROR',
          408
        ));
      }, timeoutMs);
    }),
  ]);
}

/**
 * 재시도와 타임아웃을 모두 포함한 함수 실행
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  retryOptions: RetryOptions = {},
  timeoutMs: number = 10000
): Promise<T> {
  return withRetry(
    () => withTimeout(fn, timeoutMs),
    retryOptions
  );
}

/**
 * 에러 로깅 유틸리티
 */
export function logError(error: any, context?: string): void {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context: context || 'Unknown',
    error: error instanceof APIError ? error.toJSON() : {
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
      stack: error.stack,
    },
  };

  // 개발 환경에서는 콘솔에 출력
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', errorInfo);
  }

  // 프로덕션 환경에서는 외부 로깅 서비스로 전송
  // TODO: 외부 로깅 서비스 연동 (예: Sentry, LogRocket 등)
}

/**
 * 에러 핸들러 래퍼
 * React 컴포넌트나 Hook에서 사용할 수 있는 에러 핸들러
 */
export function createErrorHandler(
  onError?: (error: APIError) => void
) {
  return (error: any, context?: string) => {
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
 * 에러가 발생해도 앱이 크래시되지 않도록 보장
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback?: T,
  onError?: (error: APIError) => void
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    const apiError = APIError.fromError(error);
    
    logError(apiError, 'safeAsync');
    
    if (onError) {
      onError(apiError);
    }
    
    return fallback;
  }
}
