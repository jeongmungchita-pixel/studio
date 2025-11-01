'use client';
import React, { Component, ErrorInfo as ReactErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';
import { errorHandler, ErrorType, ErrorSeverity, ErrorInfo } from '@/services/error-handler';
import { navigationManager } from '@/services/navigation-manager';
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ReactErrorInfo) => void;
}
interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}
export class ErrorBoundaryEnhanced extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }
  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }
  componentDidCatch(error: Error, errorInfo: ReactErrorInfo) {
    // ErrorHandler로 에러 처리
    const processedError = errorHandler.handle(error, {
      component: 'ErrorBoundary',
      action: 'component-error',
      metadata: {
        componentStack: errorInfo.componentStack
      }
    });
    this.setState(prevState => ({
      errorInfo: processedError,
      errorCount: prevState.errorCount + 1
    }));
    // 부모 컴포넌트에 알림
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    // 개발 환경에서는 콘솔에 상세 정보 출력
    if (process.env.NODE_ENV === 'development') {
    }
  }
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };
  handleRefresh = () => {
    window.location.reload();
  };
  handleGoHome = () => {
    navigationManager.goHome();
  };
  handleReportBug = () => {
    // 버그 리포트 페이지로 이동 또는 모달 열기
    const bugReport = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    // 클립보드에 복사
    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(bugReport, null, 2));
      alert('오류 정보가 클립보드에 복사되었습니다.');
    }
  };
  render() {
    if (this.state.hasError) {
      // 커스텀 fallback이 있으면 사용
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }
      const { errorInfo } = this.state;
      const isRecoverable = errorInfo?.recoverable ?? false;
      const isRetryable = errorInfo?.retryable ?? false;
      const severity = errorInfo?.severity ?? ErrorSeverity.MEDIUM;
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className={`rounded-full p-4 ${
                  severity === ErrorSeverity.CRITICAL ? 'bg-red-100' :
                  severity === ErrorSeverity.HIGH ? 'bg-orange-100' :
                  'bg-yellow-100'
                }`}>
                  <AlertCircle className={`h-12 w-12 ${
                    severity === ErrorSeverity.CRITICAL ? 'text-red-600' :
                    severity === ErrorSeverity.HIGH ? 'text-orange-600' :
                    'text-yellow-600'
                  }`} />
                </div>
              </div>
              <CardTitle className="text-2xl">
                {severity === ErrorSeverity.CRITICAL ? '심각한 오류가 발생했습니다' :
                 severity === ErrorSeverity.HIGH ? '오류가 발생했습니다' :
                 '문제가 발생했습니다'}
              </CardTitle>
              <CardDescription className="mt-2">
                {errorInfo?.userMessage || '예상치 못한 오류가 발생했습니다. 불편을 드려 죄송합니다.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 개발 환경에서만 상세 정보 표시 */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm font-mono text-gray-700">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                  {errorInfo?.code && (
                    <p className="text-xs text-gray-500 mt-1">
                      Error Code: {errorInfo.code}
                    </p>
                  )}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-gray-500">
                      Stack Trace
                    </summary>
                    <pre className="text-xs text-gray-600 mt-2 overflow-auto max-h-40">
                      {this.state.error.stack}
                    </pre>
                  </details>
                </div>
              )}
              {/* 에러 발생 횟수 표시 */}
              {this.state.errorCount > 1 && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    이 오류가 {this.state.errorCount}번 발생했습니다.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              {/* 복구 가능한 경우 */}
              {isRecoverable && (
                <Button 
                  onClick={this.handleReset}
                  className="w-full"
                  variant="default"
                >
                  다시 시도
                </Button>
              )}
              {/* 재시도 가능한 경우 */}
              {isRetryable && !isRecoverable && (
                <Button 
                  onClick={this.handleRefresh}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  페이지 새로고침
                </Button>
              )}
              {/* 홈으로 이동 */}
              <Button 
                onClick={this.handleGoHome}
                className="w-full"
                variant="outline"
              >
                <Home className="mr-2 h-4 w-4" />
                홈으로 이동
              </Button>
              {/* 버그 리포트 */}
              <Button 
                onClick={this.handleReportBug}
                className="w-full"
                variant="ghost"
                size="sm"
              >
                <Bug className="mr-2 h-4 w-4" />
                오류 정보 복사
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
/**
 * 특정 컴포넌트를 에러 바운더리로 감싸는 HOC
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryEnhanced fallback={fallback}>
      <Component {...props} />
    </ErrorBoundaryEnhanced>
  );
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  return WrappedComponent;
}
