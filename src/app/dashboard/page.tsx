'use client';
import { useUser } from '@/firebase';
import { UserRole } from '@/types';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
export default function DashboardPage() {
  const { _user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (isUserLoading) return;
    if (!_user) {
      if (pathname !== '/login') router.replace('/login');
      return;
    }
    // 승인 대기 중이면 pending 페이지로
    if (_user.status === 'pending') {
      if (pathname !== '/pending-approval') router.replace('/pending-approval');
      return;
    }
    // 역할별 리다이렉트 (완전한 페이지 리로드)
    let target = '/my-profile';
    if (_user.role === UserRole.SUPER_ADMIN) {
      target = '/super-admin';
    } else if (_user.role === UserRole.FEDERATION_ADMIN) {
      target = '/admin';
    } else if (_user.role === UserRole.CLUB_OWNER || _user.role === UserRole.CLUB_MANAGER) {
      target = '/club-dashboard';
    }
    if (pathname !== target) router.replace(target);
  }, [_user, isUserLoading, pathname, router]);
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
