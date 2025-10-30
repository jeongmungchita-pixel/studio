'use client';

import { useEffect } from 'react';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { useNavigation } from '@/hooks/use-navigation';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const { navigateByRole } = useNavigation();

  useEffect(() => {
    // 로딩 중이면 기다림
    if (isUserLoading) {
      return;
    }

    // NavigationManager를 통한 역할 기반 리다이렉트
    navigateByRole();
  }, [isUserLoading, navigateByRole]);

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
