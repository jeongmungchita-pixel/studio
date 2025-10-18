'use client';

import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { usePathname } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';

export function RootLayoutClient({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/login' || pathname.startsWith('/register');

  return (
    <FirebaseClientProvider>
      {isPublicPage ? (
        children
      ) : (
        <MainLayout>{children}</MainLayout>
      )}
      <Toaster />
    </FirebaseClientProvider>
  );
}
