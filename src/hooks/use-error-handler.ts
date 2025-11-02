/**
 * ErrorHandler를 사용하기 위한 React Hook
 */
import { useCallback, useEffect, useState } from 'react';
import { errorManager, ErrorInfo, ErrorContext, ErrorType, ErrorSeverity } from '@/lib/error/error-manager';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
interface UseErrorHandlerOptions {
  showToast?: boolean;
  component?: string;
}
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { showToast = true, component } = options;
  const { toast } = useToast();
  const { _user } = useUser();
  const [recentError, setRecentError] = useState<ErrorInfo | null>(null);
  const [errorHistory, setErrorHistory] = useState<ErrorInfo[]>([]);
  /**
   * 에러 Toast 표시
   */
  const showErrorToast = useCallback((errorInfo: ErrorInfo) => {
    // 심각도에 따른 Toast 스타일 결정
    const variant = getToastVariant(errorInfo.severity);
    toast({
      variant,
      title: getErrorTitle(errorInfo.type),
      description: errorInfo.userMessage,
      duration: errorInfo.severity === ErrorSeverity.CRITICAL ? 10000 : 5000
    });
  }, [toast]);
  /**
   * 에러 처리 함수
   */
  const handleError = useCallback((error: Error | unknown, action?: string, metadata?: Record<string, unknown>) => {
    const context: ErrorContext = {
      userId: _user?.uid,
      component,
      action,
      metadata
    };
    const errorInfo = errorManager.handleError(error, context);
    setRecentError(errorInfo);
    // Toast 표시
    if (showToast) {
      showErrorToast(errorInfo);
    }
    return errorInfo;
  }, [_user, component, showToast, showErrorToast]);
  /**
   * Toast variant 결정
   */
  const getToastVariant = (severity: ErrorSeverity): 'default' | 'destructive' => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'destructive';
      default:
        return 'default';
    }
  };
  /**
   * 에러 제목 결정
   */
  const getErrorTitle = (type: ErrorType): string => {
    const titles: Record<ErrorType, string> = {
      [ErrorType.AUTHENTICATION]: '인증 오류',
      [ErrorType.AUTHORIZATION]: '권한 오류',
      [ErrorType.NETWORK]: '네트워크 오류',
      [ErrorType.VALIDATION]: '입력 오류',
      [ErrorType.FIREBASE]: 'Firebase 오류',
      [ErrorType.SYSTEM]: '시스템 오류',
      [ErrorType.UNKNOWN]: '알 수 없는 오류'
    };
    return titles[type] || '오류';
  };
  /**
   * 비동기 함수 래퍼
   */
  const wrapAsync = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    action?: string
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      try {
        return await fn(...args);
      } catch (error: unknown) {
        handleError(error, action);
        return undefined;
      }
    };
  }, [handleError]);
  /**
   * Try-Catch 래퍼
   */
  const tryCatch = useCallback(<T>(
    fn: () => T,
    action?: string
  ): T | undefined => {
    try {
      return fn();
    } catch (error: unknown) {
      handleError(error, action);
      return undefined;
    }
  }, [handleError]);
  /**
   * 에러 리스너 등록
   */
  useEffect(() => {
    const unsubscribe = errorManager.subscribe((errorInfo) => {
      setErrorHistory(prev => [errorInfo, ...prev].slice(0, 10));
    });
    return unsubscribe;
  }, []);
  /**
   * 에러 히스토리 가져오기
   */
  const getErrorHistory = useCallback(() => {
    return errorManager.getErrorHistory();
  }, []);
  /**
   * 에러 히스토리 초기화
   */
  const clearErrorHistory = useCallback(() => {
    errorManager.clearHistory();
    setErrorHistory([]);
    setRecentError(null);
  }, []);
  /**
   * 특정 타입의 에러 개수
   */
  const getErrorCount = useCallback((type?: ErrorType) => {
    if (type) {
      return errorManager.getErrorsByType(type).length;
    }
    return errorManager.getErrorHistory().length;
  }, []);
  /**
   * 디버그 정보
   */
  const debug = useCallback(() => {
    // Retry operations not directly available in errorManager
    console.warn('Retry operations not available in unified error manager');
  }, []);
  return {
    handleError,
    wrapAsync,
    tryCatch,
    recentError,
    errorHistory,
    getErrorHistory,
    clearErrorHistory,
    getErrorCount,
    debug
  };
}
