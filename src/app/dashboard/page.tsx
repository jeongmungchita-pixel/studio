'use client';

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
      router.push('/login');
      return;
    }

    // 역할별 리다이렉트
    if (user.role === UserRole.SUPER_ADMIN) {
      router.push('/super-admin');
    } else if (user.role === UserRole.FEDERATION_ADMIN) {
      router.push('/admin');
    } else if (user.role === UserRole.CLUB_OWNER || user.role === UserRole.CLUB_MANAGER) {
      router.push('/club-dashboard');
    } else {
      router.push('/my-profile');
    }
  }, [user, isUserLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
