'use client';

export const dynamic = 'force-dynamic';
import { useUser } from '@/firebase';
import { UserRole } from '@/types';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) return;
    
    if (!user) {
      window.location.href = '/login';
      return;
    }

    // 승인 대기 중이면 pending 페이지로
    if (user.status === 'pending') {
      window.location.href = '/pending-approval';
      return;
    }

    // 역할별 리다이렉트 (완전한 페이지 리로드)
    if (user.role === UserRole.SUPER_ADMIN) {
      window.location.href = '/super-admin';
    } else if (user.role === UserRole.FEDERATION_ADMIN) {
      window.location.href = '/admin';
    } else if (user.role === UserRole.CLUB_OWNER || user.role === UserRole.CLUB_MANAGER) {
      window.location.href = '/club-dashboard';
    } else {
      window.location.href = '/my-profile';
    }
  }, [user, isUserLoading]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
