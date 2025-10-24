'use client';

import { Toaster } from '@/components/ui/toaster';
import { FirebaseProvider, initializeFirebase } from '@/firebase';
import { usePathname } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';

export function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/login' || pathname.startsWith('/register');
  const { firebaseApp, firestore, auth, storage } = initializeFirebase();

  return (
    <FirebaseProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth} storage={storage}>
      {isPublicPage ? (
        children
      ) : (
        <MainLayout>{children}</MainLayout>
      )}
      <Toaster />
    </FirebaseProvider>
  );
}
