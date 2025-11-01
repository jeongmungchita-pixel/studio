'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useRole } from '@/hooks/use-role';
import { UserRole } from '@/types';
import { Loader2, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RoleBadge } from '@/components/role-badge';
import { ModernNav } from '@/components/layout/modern-nav';
import { GlobalSearch } from '@/components/layout/global-search';
import { LogoutButton } from '@/components/logout-button';
interface ModernLayoutProps {
  children: React.ReactNode;
}
export function ModernLayout({ children }: ModernLayoutProps) {
  const { _user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { userRole } = useRole();
  useEffect(() => {
    if (isUserLoading) return;
    if (!_user) {
      if (pathname !== '/login' && pathname !== '/setup/initial-admin') {
        router.push('/login');
      }
      return;
    }
    // Role-based page access control (not login redirect)
    if ((_user.role === UserRole.CLUB_OWNER || _user.role === UserRole.CLUB_MANAGER) && _user.status === 'pending') {
      if (pathname !== '/login') {
        router.push('/login');
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
  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  if (!_user && (pathname === '/login' || pathname === '/setup/initial-admin')) {
    return <>{children}</>;
  }
  if (!_user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  if ((_user.role === UserRole.CLUB_OWNER || _user.role === UserRole.CLUB_MANAGER) && _user.status === 'pending') {
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
                    <AvatarImage src={_user.photoURL} alt={_user.displayName} />
                    <AvatarFallback className="text-xs bg-slate-200 text-slate-700">
                      {_user.displayName?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:inline text-sm text-slate-700">
                    {_user.displayName}
                  </span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{_user.displayName}</p>
                    <p className="text-xs text-slate-500">{_user.email}</p>
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
                <DropdownMenuItem asChild>
                  <LogoutButton 
                    variant="ghost" 
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" 
                  />
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
