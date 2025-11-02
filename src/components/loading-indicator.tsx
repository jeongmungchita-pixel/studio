'use client';
import React, { useEffect, useState } from 'react';
import { useLoading } from '@/hooks/use-loading';
import { Progress } from '@/components/ui/progress';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
interface LoadingIndicatorProps {
  position?: 'top' | 'bottom' | 'center';
  showDetails?: boolean;
  className?: string;
}
/**
 * 글로벌 로딩 인디케이터
 */
export function LoadingIndicator({ 
  position = 'top',
  showDetails = false,
  className 
}: LoadingIndicatorProps) {
  const { loadingStates, activeCount, stopAll } = useLoading();
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  // 로딩 상태 변경 감지
  useEffect(() => {
    if (activeCount > 0) {
      setVisible(true);
    } else {
      // 애니메이션을 위해 약간의 지연 후 숨김
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [activeCount]);
  if (!visible) return null;
  // 첫 번째 로딩 상태 (주요 표시용)
  const primaryState = loadingStates[0];
  // 전체 진행률 계산
  const totalProgress = loadingStates.reduce((acc, state) => {
    if (state.progress !== undefined) {
      return acc + state.progress;
    }
    return acc;
  }, 0) / Math.max(loadingStates.filter(s => s.progress !== undefined).length, 1);
  const positionClasses = {
    top: 'top-0 left-0 right-0',
    bottom: 'bottom-0 left-0 right-0',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
  };
  return (
    <div 
      className={cn(
        "fixed z-50 transition-all duration-300",
        positionClasses[position],
        position === 'center' && 'max-w-md w-full px-4',
        className
      )}
    >
      {/* 메인 로딩 바 */}
      {position !== 'center' && (
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          {/* 진행률 바 */}
          {totalProgress > 0 && (
            <Progress value={totalProgress} className="h-1" />
          )}
          <div className="px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">
                  {primaryState?.message || '처리 중...'}
                </span>
                {activeCount > 1 && (
                  <span className="text-xs text-muted-foreground">
                    (+{activeCount - 1}개 작업)
                  </span>
                )}
              </div>
              {showDetails && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMinimized(!minimized)}
                  className="h-6 px-2"
                >
                  {minimized ? '자세히' : '간단히'}
                </Button>
              )}
            </div>
            {/* 상세 정보 */}
            {showDetails && !minimized && activeCount > 1 && (
              <div className="mt-2 space-y-1">
                {loadingStates.slice(1).map((state) => (
                  <div key={state.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>{state.message}</span>
                    {state.progress !== undefined && (
                      <span className="ml-auto">{Math.round(state.progress)}%</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* 중앙 모달 스타일 */}
      {position === 'center' && (
        <div className="bg-background rounded-lg shadow-lg border p-6">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <p className="font-medium">
                {primaryState?.message || '처리 중...'}
              </p>
              {totalProgress > 0 && (
                <div className="w-48">
                  <Progress value={totalProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(totalProgress)}% 완료
                  </p>
                </div>
              )}
              {activeCount > 1 && (
                <p className="text-sm text-muted-foreground">
                  {activeCount}개 작업 진행 중
                </p>
              )}
            </div>
            {/* 상세 작업 목록 */}
            {showDetails && activeCount > 1 && (
              <div className="w-full space-y-2 max-h-32 overflow-y-auto">
                {loadingStates.map((state) => (
                  <div key={state.key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate">
                      {state.message}
                    </span>
                    {state.progress !== undefined && (
                      <span className="text-xs ml-2">
                        {Math.round(state.progress)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
/**
 * 페이지 로딩 스피너
 */
export function PageLoader({ 
  message = '페이지를 불러오는 중...',
  className 
}: { 
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-[400px] space-y-4",
      className
    )}>
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
/**
 * 인라인 로딩 스피너
 */
export function InlineLoader({ 
  size = 'default',
  className 
}: { 
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    default: 'h-4 w-4',
    lg: 'h-6 w-6'
  };
  return (
    <Loader2 
      className={cn(
        "animate-spin text-primary inline-block",
        sizeClasses[size],
        className
      )} 
    />
  );
}
/**
 * 버튼 로딩 상태
 */
export function ButtonLoader({ 
  loading,
  children,
  loadingText = '처리 중...',
  ...props
}: React.ComponentProps<typeof Button> & {
  loading?: boolean;
  loadingText?: string;
}) {
  return (
    <Button {...props} disabled={loading || props.disabled}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
/**
 * 오버레이 로더
 */
export function OverlayLoader({ 
  visible,
  message,
  onCancel,
  className 
}: { 
  visible: boolean;
  message?: string;
  onCancel?: () => void;
  className?: string;
}) {
  if (!visible) return null;
  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center",
      className
    )}>
      <div className="bg-background rounded-lg shadow-lg border p-6 max-w-sm w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          {message && (
            <p className="text-center font-medium">{message}</p>
          )}
          {onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="mt-2"
            >
              <X className="mr-2 h-4 w-4" />
              취소
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
