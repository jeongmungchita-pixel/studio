'use client';

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { usePathname } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* metadata is not supported in client components, but we will add basic tags */}
        <title>KGF 넥서스</title>
        <meta
          name="description"
          content="대한검도연맹 통합 관리 시스템"
        />
        <meta name="theme-color" content="#667eea" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          {isLoginPage ? (
            children
          ) : (
            <MainLayout>{children}</MainLayout>
          )}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
