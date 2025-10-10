'use client';

import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/sidebar';
import { AppHeader } from '@/components/layout/header';
import { useUser } from '@/firebase';
import { redirect, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();

  useEffect(() => {
    if (!isUserLoading && user) {
      if (user.role === 'club-admin' && user.status === 'approved' && pathname !== '/club-dashboard') {
        redirect('/club-dashboard');
      } else if ((user.role === 'admin' || user.role === 'member') && pathname === '/club-dashboard') {
        redirect('/dashboard');
      } else if (user.role === 'club-admin' && user.status === 'pending') {
        // Do nothing, they should be stuck on login page.
        // If they somehow get here, redirect to login to be safe.
        redirect('/login');
      }
    }
  }, [user, isUserLoading, pathname]);

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    redirect('/login');
    return null; // or a loading spinner
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebar />
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
