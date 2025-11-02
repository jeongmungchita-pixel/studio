'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Clock, Shield, LogOut } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types/auth';
export default function PendingApprovalPage() {
  const router = useRouter();
  const { _user, isUserLoading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({
        title: '로그아웃 완료',
        description: '다시 로그인해주세요.',
      });
      window.location.href = '/login';
    } catch (error: unknown) {
    }
  };
  // 로딩 중
  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin">⏳</div>
      </div>
    );
  }
  // 사용자가 없으면 로그인 페이지로 리디렉션하지 않음 (무한루프 방지)
  if (!_user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p>로그인이 필요합니다.</p>
            <Button onClick={() => router.push('/login')} className="mt-4">
              로그인하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  // 승인 완료된 사용자는 역할에 맞는 페이지로 리디렉션
  if (_user.status === 'active') {
    // 현재 경로가 /pending-approval이 아니면 리턴 (무한루프 방지)
    if (typeof window !== 'undefined' && window.location.pathname !== '/pending-approval') {
      return null;
    }
    let targetPath = '/';
    switch (_user.role) {
      case UserRole.SUPER_ADMIN:
        targetPath = '/super-admin';
        break;
      case UserRole.FEDERATION_ADMIN:
        targetPath = '/admin';
        break;
      case UserRole.CLUB_OWNER:
      case UserRole.CLUB_MANAGER:
      case UserRole.HEAD_COACH:
      case UserRole.ASSISTANT_COACH:
        targetPath = '/club-dashboard';
        break;
      case UserRole.MEMBER:
      case UserRole.PARENT:
        targetPath = '/my-profile';
        break;
    }
    // 자동 리디렉션
    window.location.href = targetPath;
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p>승인이 완료되었습니다! 리디렉션 중...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="h-10 w-10 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl text-center">승인 대기 중</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 사용자 정보 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-sm text-gray-600">계정 정보</p>
            <p className="font-semibold">{_user?.displayName}</p>
            <p className="text-sm text-gray-600">{_user?.email}</p>
            {_user?.clubName && (
              <p className="text-sm">
                <span className="text-gray-600">클럽:</span> {_user.clubName}
              </p>
            )}
            <p className="text-sm">
              <span className="text-gray-600">역할:</span>{' '}
              {_user?.role === UserRole.CLUB_OWNER ? '클럽 오너' : 
               _user?.role === UserRole.MEMBER ? '일반 회원' : 
               _user?.role === UserRole.SUPER_ADMIN ? '슈퍼 관리자' : '회원'}
            </p>
          </div>
          {/* 안내 메시지 */}
          <div className="space-y-3 text-center">
            <div className="flex items-center justify-center gap-2 text-yellow-700">
              <Shield className="h-5 w-5" />
              <span className="font-medium">관리자 승인 필요</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              계정이 생성되었습니다! 
              {_user?.role === UserRole.CLUB_OWNER && ' 슈퍼 관리자'}
              {_user?.role === UserRole.MEMBER && ' 클럽 오너'}
              {_user?.role === UserRole.SUPER_ADMIN && ' 시스템 관리자'}
              의 승인을 기다려주세요.
            </p>
            <p className="text-sm text-gray-600">
              승인이 완료되면 이메일로 알려드리며, 
              로그인 후 모든 기능을 이용하실 수 있습니다.
            </p>
          </div>
          {/* 예상 시간 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 text-center">
              ⏰ 승인은 보통 <strong>1-2일</strong> 이내에 완료됩니다
            </p>
          </div>
          {/* 액션 버튼 */}
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="w-full"
            >
              홈으로 돌아가기
            </Button>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </div>
          {/* 추가 안내 */}
          <p className="text-xs text-center text-gray-500">
            승인 관련 문의: support@example.com
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
