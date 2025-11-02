'use client';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseProvider, initializeFirebase } from '@/firebase';
import { usePathname } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { LoadingIndicator } from '@/components/loading-indicator';
import { registerDefaultServices } from '@/services/container';
import { useEffect } from 'react';
export function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  useEffect(() => {
    registerDefaultServices();
  }, []);
  const isPublicPage =
    pathname === '/login' ||
    pathname === '/pending-approval' ||
    pathname.startsWith('/register');
  const { firebaseApp, firestore, auth, storage } = initializeFirebase();
  return (
    <FirebaseProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth} storage={storage}>
      {isPublicPage ? (
        children
      ) : (
        <MainLayout>{children}</MainLayout>
      )}
      <LoadingIndicator position="top" showDetails />
      <Toaster />
    </FirebaseProvider>
  );
}
