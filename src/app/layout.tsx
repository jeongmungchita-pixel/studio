import { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import { RootLayoutClient } from './layout-client';
import './globals.css';

const ptSans = PT_Sans({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
});

// Force dynamic rendering for all pages - THIS WORKS IN SERVER COMPONENTS
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'KGF 넥서스',
  description: '대한체조협회 관리 플랫폼',
  themeColor: '#667eea',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className={`${ptSans.className} font-body antialiased`}>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
