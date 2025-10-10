'use client';

import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/sidebar';
import { AppHeader } from '@/components/layout/header';
import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Wait until user loading is complete before doing anything.
    if (isUserLoading) {
      return;
    }

    // If user is not logged in, redirect to login page.
    if (!user) {
      router.push('/login');
      return;
    }
    
    // User is logged in, handle role-based redirection.
    if (user.role === 'club-admin' && user.status === 'approved') {
        // If approved club-admin is not on their dashboard, redirect them.
        if(pathname !== '/club-dashboard') {
            router.push('/club-dashboard');
        }
    } else if (user.role === 'club-admin' && user.status === 'pending') {
        // If a pending club-admin somehow gets here, send them back to login.
        router.push('/login');
    } else if ((user.role === 'admin' || user.role === 'member')) {
        // If an admin or member lands on the club-dashboard, redirect them.
        if (pathname === '/club-dashboard') {
            router.push('/dashboard');
        }
    }

  }, [user, isUserLoading, pathname, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
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

    