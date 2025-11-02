'use client';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/sidebar';
import { AppHeader } from '@/components/layout/header';
import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { UserRole } from '@/types';
export function MainLayout({ children }: { children: React.ReactNode }) {
  const { _user, isUserLoading } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (isUserLoading) {
      return; 
    }
    if (!_user) {
      // Allow access to login, register, pending-approval (to prevent loops during auth transitions), and initial admin setup
      const publicPaths = ['/login', '/pending-approval', '/setup/initial-admin'];
      const isRegisterPath = pathname.startsWith('/register');
      if (!publicPaths.includes(pathname) && !isRegisterPath) {
         router.push('/login');
      }
      return;
    }
    // Role-based page access control
    if ((_user.role === UserRole.CLUB_OWNER || _user.role === UserRole.CLUB_MANAGER) && _user.status === 'pending') {
        // Pending club users should be directed to pending approval page
        if (pathname !== '/pending-approval') {
          router.push('/pending-approval');
        }
    } else if (_user.role === UserRole.CLUB_OWNER || _user.role === UserRole.CLUB_MANAGER) {
      // Club owners should not access federation admin pages
      if (pathname === '/dashboard' || pathname.startsWith('/admin') || pathname.startsWith('/super-admin')) {
        router.push('/club-dashboard');
      }
    } else if (_user.role === UserRole.SUPER_ADMIN || _user.role === UserRole.FEDERATION_ADMIN) {
      // Admins should not access club dashboard
      if (pathname.startsWith('/club-dashboard')) {
        router.push('/admin');
      }
      // Redirect /dashboard to /admin for federation admins
      if (pathname === '/dashboard') {
        router.push('/admin');
      }
    }
  }, [_user, isUserLoading, pathname, router]);
  // Show loader only while checking authentication
  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  // Allow unauthenticated access to specific pages
  if (!_user && (pathname === '/login' || pathname === '/setup/initial-admin')) {
    return <>{children}</>;
  }
  // Show loader for unauthenticated users being redirected
  if (!_user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  // Prevent flashing of content for users who will be redirected
  if ((_user.role === UserRole.CLUB_OWNER || _user.role === UserRole.CLUB_MANAGER) && _user.status === 'pending' && pathname !== '/pending-approval') {
     // Show loader while redirecting to pending-approval
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
