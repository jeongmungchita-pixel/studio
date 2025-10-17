'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Home, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 에러를 콘솔에 로깅
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 p-3">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">문제가 발생했습니다</CardTitle>
          <CardDescription>
            죄송합니다. 예기치 않은 오류가 발생했습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <div className="rounded-lg bg-slate-100 p-4">
              <p className="text-sm font-mono text-slate-700 break-words">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-slate-500 mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <Button onClick={reset} className="w-full">
              <RefreshCcw className="mr-2 h-4 w-4" />
              다시 시도
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/dashboard')}
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              홈으로 돌아가기
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            문제가 계속되면 관리자에게 문의하세요.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
