'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldOff, Home, ArrowLeft, Lock, UserX } from 'lucide-react';
import { useUser } from '@/firebase';
import { getDefaultRoute } from '@/utils/route-guard';
export default function ForbiddenPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { _user } = useUser();
  // URL 파라미터에서 정보 가져오기
  const attemptedPath = searchParams.get('path') || '';
  const reason = searchParams.get('reason') || 'permission_denied';
  // 거부 이유에 따른 메시지
  const getReasonMessage = () => {
    switch (reason) {
      case 'role_required':
        return '이 페이지에 접근하려면 더 높은 권한이 필요합니다.';
      case 'club_access':
        return '이 클럽의 구성원만 접근할 수 있습니다.';
      case 'admin_only':
        return '관리자만 접근할 수 있는 페이지입니다.';
      case 'owner_only':
        return '소유자만 접근할 수 있는 페이지입니다.';
      case 'pending_approval':
        return '계정 승인이 완료된 후 접근할 수 있습니다.';
      default:
        return '이 페이지에 접근할 권한이 없습니다.';
    }
  };
  // 권한별 제안 액션
  const getSuggestedAction = () => {
    if (!_user) {
      return {
        text: '로그인이 필요합니다.',
        action: () => router.push('/login'),
        buttonText: '로그인하기',
      };
    }
    if (_user.status === 'pending') {
      return {
        text: '계정 승인을 기다리고 있습니다.',
        action: () => router.push('/pending-approval'),
        buttonText: '승인 상태 확인',
      };
    }
    const defaultRoute = getDefaultRoute(_user.role, _user.status);
    return {
      text: '접근 가능한 페이지로 이동하세요.',
      action: () => router.push(defaultRoute),
      buttonText: '대시보드로 이동',
    };
  };
  const suggestedAction = getSuggestedAction();
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-orange-100 p-4">
              <ShieldOff className="h-12 w-12 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">접근 거부</CardTitle>
          <CardDescription className="mt-2">
            {getReasonMessage()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 시도한 경로 표시 */}
          {attemptedPath && (
            <div className="rounded-lg bg-slate-100 p-4">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-slate-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">
                    접근 시도한 페이지
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    {attemptedPath}
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* 현재 사용자 정보 */}
          {_user && (
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <UserX className="h-5 w-5 text-slate-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">
                    현재 권한
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    역할: {_user.role || '일반 사용자'}
                  </p>
                  {_user.status === 'pending' && (
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ 계정 승인 대기 중
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* 제안 액션 */}
          <div className="space-y-3">
            <p className="text-sm text-center text-slate-600">
              {suggestedAction.text}
            </p>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={suggestedAction.action}
                className="w-full"
              >
                {suggestedAction.buttonText}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                이전 페이지로 돌아가기
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push('/')}
                className="w-full"
              >
                <Home className="mr-2 h-4 w-4" />
                홈으로 가기
              </Button>
            </div>
          </div>
          {/* 도움말 */}
          <div className="border-t pt-4">
            <p className="text-xs text-center text-muted-foreground">
              권한이 있다고 생각되시나요?
            </p>
            <p className="text-xs text-center text-muted-foreground mt-1">
              관리자에게 문의하거나 다시 로그인해보세요.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-3 p-2 bg-yellow-50 rounded text-xs">
                <p className="font-semibold text-yellow-800">개발 모드 정보:</p>
                <p className="text-yellow-700 mt-1">
                  거부 이유: {reason}
                </p>
                {_user && (
                  <p className="text-yellow-700">
                    사용자 역할: {_user.role}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
