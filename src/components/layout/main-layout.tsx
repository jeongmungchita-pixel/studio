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
    if (isUserLoading) {
      return; 
    }

    if (!user) {
      if (pathname !== '/login') {
         router.push('/login');
      }
      return;
    }

    // Role-based redirection logic
    if (pathname.startsWith('/login')) {
      if(user.role === 'club-admin' && user.status === 'approved') {
          router.push('/club-dashboard');
      } else {
          router.push('/dashboard');
      }
    } else if (user.role === 'club-admin' && user.status === 'pending') {
        // If pending admin tries to access any protected page, send to login
        if (pathname !== '/login') {
          router.push('/login');
        }
    } else if (user.role === 'admin' && pathname.startsWith('/club-dashboard')) {
        router.push('/dashboard');
    }

  }, [user, isUserLoading, pathname, router]);

  if (isUserLoading || !user) {
    // Show a global loader while user is being authenticated or if they are being redirected.
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // Prevent flashing of content for users who will be redirected
  if (user.role === 'club-admin' && user.status === 'pending') {
     // Show loader instead of login to prevent flashing login page
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
