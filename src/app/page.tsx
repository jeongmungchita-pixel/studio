'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { UserRole } from '@/types/auth';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) return;

    // 로그인하지 않은 사용자는 로그인 페이지로
    if (!user) {
      router.push('/login');
      return;
    }

    // 승인 대기 중인 사용자는 대기 페이지로
    if (user.status === 'pending') {
      router.push('/pending-approval');
      return;
    }

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
  }, [user, isUserLoading, router]);

  // 로딩 중 표시
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    </div>
  );
}
