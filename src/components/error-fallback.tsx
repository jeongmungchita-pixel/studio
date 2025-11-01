'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
interface ErrorFallbackProps {
  error: Error | { message: string; code?: string };
  title?: string;
  onRetry?: () => void;
}
export function ErrorFallback({ error, title = '데이터 조회 오류', onRetry }: ErrorFallbackProps) {
  const errorCode = 'code' in error ? error.code : 'unknown';
  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            데이터를 불러오는 중 문제가 발생했습니다.
          </p>
          {error.message && (
            <p className="text-sm font-mono bg-muted p-2 rounded">
              {error.message}
            </p>
          )}
          {errorCode !== 'unknown' && (
            <p className="text-xs text-muted-foreground">
              오류 코드: {errorCode}
            </p>
          )}
        </div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
/**
 * 인라인 에러 표시 (작은 UI용)
 */
export function InlineError({ error }: { error: Error | { message: string } }) {
  return (
    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
      <AlertCircle className="h-4 w-4" />
      <span>{error.message}</span>
    </div>
  );
}
