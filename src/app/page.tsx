'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        // Redirect authenticated users based on role
        if (user.role === 'SUPER_ADMIN') {
          router.push('/super-admin');
        } else if (user.role === 'CLUB_OWNER' || user.role === 'CLUB_MANAGER') {
          router.push('/club-dashboard');
        } else if (user.role === 'FEDERATION_ADMIN') {
          router.push('/admin');
        } else {
          router.push('/my-profile');
        }
      } else {
        // Redirect non-authenticated users to login
        router.push('/login');
      }
    }
  }, [user, isUserLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
