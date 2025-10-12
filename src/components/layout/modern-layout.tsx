'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useRole } from '@/hooks/use-role';
import { UserRole } from '@/types';
import { Loader2, Menu, X, Search, Bell, Settings, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RoleBadge } from '@/components/role-badge';
import { ModernNav } from '@/components/layout/modern-nav';
import { GlobalSearch } from '@/components/layout/global-search';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';

interface ModernLayoutProps {
  children: React.ReactNode;
}

export function ModernLayout({ children }: ModernLayoutProps) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { userRole } = useRole();
  const auth = useAuth();

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      if (pathname !== '/login' && pathname !== '/setup/initial-admin') {
        router.push('/login');
      }
      return;
    }

    // Role-based page access control (not login redirect)
    if ((user.role === UserRole.CLUB_OWNER || user.role === UserRole.CLUB_MANAGER) && user.status === 'pending') {
      if (pathname !== '/login') {
        router.push('/login');
      }
    } else if (user.role === UserRole.CLUB_OWNER || user.role === UserRole.CLUB_MANAGER) {
      // Club owners should not access federation admin pages
      if (pathname === '/dashboard' || pathname.startsWith('/admin') || pathname.startsWith('/super-admin')) {
        console.log('Club owner trying to access admin page, redirecting to /club-dashboard');
        router.push('/club-dashboard');
      }
    } else if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.FEDERATION_ADMIN) {
      // Admins should not access club dashboard
      if (pathname.startsWith('/club-dashboard')) {
        console.log('Admin trying to access club dashboard, redirecting to /dashboard');
        router.push('/dashboard');
      }
    }
  }, [user, isUserLoading, pathname, router]);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && (pathname === '/login' || pathname === '/setup/initial-admin')) {
    return <>{children}</>;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if ((user.role === 'CLUB_OWNER' || user.role === 'CLUB_MANAGER') && user.status === 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Windsurf 스타일 헤더 */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-6">
          {/* 좌측: 로고 + 네비게이션 */}
          <div className="flex items-center gap-8">
            {/* 로고 */}
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white font-semibold text-sm">
                K
              </div>
              <span className="text-sm font-semibold text-slate-900">KGF 넥서스</span>
            </div>

            {/* 네비게이션 */}
            <nav className="flex-1">
              <ModernNav />
            </nav>
          </div>

          {/* 우측: 검색 + 사용자 */}
          <div className="flex items-center gap-3">
            {/* 검색 */}
            <div className="hidden md:block">
              <GlobalSearch />
            </div>

            {/* 사용자 메뉴 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="gap-2 px-2 h-8 hover:bg-slate-100"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.photoURL} alt={user.displayName} />
                    <AvatarFallback className="text-xs bg-slate-200 text-slate-700">
                      {user.displayName?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:inline text-sm text-slate-700">
                    {user.displayName}
                  </span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{user.displayName}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                    {userRole && (
                      <div className="mt-1">
                        <RoleBadge role={userRole} />
                      </div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/my-profile')}>
                  <Settings className="mr-2 h-4 w-4" />
                  내 프로필
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 - Windsurf 스타일 */}
      <main className="mx-auto max-w-screen-2xl">
        {children}
      </main>
    </div>
  );
}
