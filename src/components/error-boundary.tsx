'use client';

import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, RefreshCcw, Shield } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * 인증 관련 에러를 우아하게 처리하는 Error Boundary
 */
export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 에러 로깅
    console.error('AuthErrorBoundary caught an error:', error, errorInfo);
    
    // 부모 컴포넌트에 에러 전달
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Firebase 에러인 경우 특별 처리
    if (error.message?.includes('Firebase') || error.message?.includes('auth')) {
      // Firebase 에러 추적
      this.logFirebaseError(error);
    }
  }

  private logFirebaseError(error: Error) {
    // 프로덕션에서는 에러 추적 서비스로 전송
    const errorLog = {
      type: 'AUTH_ERROR',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
    };
    
    // TODO: Sentry, LogRocket 등으로 전송
    console.log('Firebase Error Log:', errorLog);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleRelogin = () => {
    // 로컬 스토리지 클리어 후 로그인 페이지로
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      // 커스텀 fallback이 있으면 사용
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const { error } = this.state;
      const isAuthError = error?.message?.toLowerCase().includes('auth') || 
                         error?.message?.toLowerCase().includes('permission');
      const isNetworkError = error?.message?.toLowerCase().includes('network') ||
                            error?.message?.toLowerCase().includes('fetch');

      return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-red-100 p-3">
                  {isAuthError ? (
                    <Shield className="h-10 w-10 text-red-600" />
                  ) : (
                    <AlertCircle className="h-10 w-10 text-red-600" />
                  )}
                </div>
              </div>
              <CardTitle className="text-2xl">
                {isAuthError ? '인증 오류' : isNetworkError ? '연결 오류' : '문제가 발생했습니다'}
              </CardTitle>
              <CardDescription>
                {isAuthError 
                  ? '인증 정보를 확인할 수 없습니다. 다시 로그인해주세요.'
                  : isNetworkError
                  ? '네트워크 연결을 확인해주세요.'
                  : '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 개발 환경에서만 에러 상세 표시 */}
              {process.env.NODE_ENV === 'development' && error && (
                <div className="rounded-lg bg-slate-100 p-4">
                  <p className="text-sm font-mono text-slate-700 break-words">
                    {error.message}
                  </p>
                  {error.stack && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-500 cursor-pointer">
                        스택 트레이스 보기
                      </summary>
                      <pre className="text-xs text-slate-500 mt-2 overflow-auto max-h-40">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                {isAuthError ? (
                  <>
                    <Button 
                      onClick={this.handleRelogin} 
                      className="w-full"
                      variant="default"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      다시 로그인
                    </Button>
                    <Button 
                      onClick={this.handleReset}
                      variant="outline"
                      className="w-full"
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      다시 시도
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      onClick={this.handleReset} 
                      className="w-full"
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      다시 시도
                    </Button>
                    <Button
                      variant="outline"
                      onClick={this.handleGoHome}
                      className="w-full"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      홈으로 돌아가기
                    </Button>
                  </>
                )}
              </div>

              <p className="text-xs text-center text-muted-foreground">
                문제가 계속되면 관리자에게 문의하세요.
                {error && (
                  <span className="block mt-1">
                    에러 코드: {error.name || 'UNKNOWN'}
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 일반 에러 바운더리
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div className="flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>오류 발생</CardTitle>
              <CardDescription>
                페이지를 표시하는 중 문제가 발생했습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                페이지 새로고침
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
