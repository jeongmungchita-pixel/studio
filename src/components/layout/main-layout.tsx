'use client';

import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/sidebar';
import { AppHeader } from '@/components/layout/header';
import { TopNav } from '@/components/layout/top-nav';
import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { UserRole } from '@/types';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) {
      return; 
    }

    if (!user) {
      // Allow access to login, register, and initial admin setup pages without authentication
      const publicPaths = ['/login', '/setup/initial-admin'];
      const isRegisterPath = pathname.startsWith('/register');
      
      if (!publicPaths.includes(pathname) && !isRegisterPath) {
         router.push('/login');
      }
      return;
    }

    // Role-based page access control
    if ((user.role === UserRole.CLUB_OWNER || user.role === UserRole.CLUB_MANAGER) && user.status === 'pending') {
        // If pending admin tries to access any protected page, send to login
        if (pathname !== '/login') {
          router.push('/login');
        }
    } else if (user.role === UserRole.CLUB_OWNER || user.role === UserRole.CLUB_MANAGER) {
      // Club owners should not access federation admin pages
      if (pathname === '/dashboard' || pathname.startsWith('/admin') || pathname.startsWith('/super-admin')) {
        router.push('/club-dashboard');
      }
    } else if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.FEDERATION_ADMIN) {
      // Admins should not access club dashboard
      if (pathname.startsWith('/club-dashboard')) {
        router.push('/admin');
      }
      // Redirect /dashboard to /admin for federation admins
      if (pathname === '/dashboard') {
        router.push('/admin');
      }
    }

  }, [user, isUserLoading, pathname, router]);

  // Show loader only while checking authentication
  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Allow unauthenticated access to specific pages
  if (!user && (pathname === '/login' || pathname === '/setup/initial-admin')) {
    return <>{children}</>;
  }

  // Show loader for unauthenticated users being redirected
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // Prevent flashing of content for users who will be redirected
  if ((user.role === 'CLUB_OWNER' || user.role === 'CLUB_MANAGER') && user.status === 'pending') {
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
