'use client';

import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { usePathname } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';

export function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <FirebaseClientProvider>
      {isLoginPage ? (
        children
      ) : (
        <MainLayout>{children}</MainLayout>
      )}
      <Toaster />
    </FirebaseClientProvider>
  );
}
