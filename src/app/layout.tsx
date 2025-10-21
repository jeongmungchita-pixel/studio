import type { ReactNode } from 'react';
import { Metadata, Viewport } from 'next';
import './globals.css';
import { RootLayoutClient } from './layout-client';
import { PT_Sans } from 'next/font/google';

// Force dynamic rendering for all pages - THIS WORKS IN SERVER COMPONENTS
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'KGF 넥서스',
  description: '대한체조협회 관리 플랫폼',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#667eea',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head />
      <body className={`${ptSans.className} font-body antialiased`}>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
