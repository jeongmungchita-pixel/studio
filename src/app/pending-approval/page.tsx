'use client';

export const dynamic = 'force-dynamic';
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
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();

  // 승인되면 자동으로 적절한 대시보드로 이동
  if (!isUserLoading && user?.status === 'active') {
    // 역할별 적절한 대시보드로 리다이렉트
    switch (user.role) {
      case UserRole.SUPER_ADMIN:
        router.push('/super-admin');
        break;
      case UserRole.FEDERATION_ADMIN:
        router.push('/admin');
        break;
      case UserRole.CLUB_OWNER:
      case UserRole.CLUB_MANAGER:
        router.push('/club-dashboard');
        break;
      case UserRole.HEAD_COACH:
      case UserRole.ASSISTANT_COACH:
        router.push('/club-dashboard');
        break;
      default:
        router.push('/my-profile');
    }
    return null;
  }

  const handleLogout = async () => {
    if (!auth) return;
    
    try {
      await signOut(auth);
      toast({
        title: '로그아웃 완료',
        description: '다시 로그인해주세요.',
      });
      router.push('/login');
    } catch (error) {
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin">⏳</div>
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
            <p className="font-semibold">{user?.displayName}</p>
            <p className="text-sm text-gray-600">{user?.email}</p>
            {user?.clubName && (
              <p className="text-sm">
                <span className="text-gray-600">클럽:</span> {user.clubName}
              </p>
            )}
            <p className="text-sm">
              <span className="text-gray-600">역할:</span>{' '}
              {user?.role === UserRole.CLUB_OWNER ? '클럽 오너' : 
               user?.role === UserRole.MEMBER ? '일반 회원' : 
               user?.role === UserRole.SUPER_ADMIN ? '슈퍼 관리자' : '회원'}
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
              {user?.role === UserRole.CLUB_OWNER && ' 슈퍼 관리자'}
              {user?.role === UserRole.MEMBER && ' 클럽 오너'}
              {user?.role === UserRole.SUPER_ADMIN && ' 시스템 관리자'}
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
