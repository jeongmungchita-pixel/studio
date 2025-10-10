'use client';
import { usePathname, redirect } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Users,
  Building,
  Trophy,
  ClipboardList,
  Settings,
  LogOut,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import type { UserProfile } from '@/types';

const menuItems = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/members', label: '회원', icon: Users },
  { href: '/clubs', label: '클럽', icon: Building },
  { href: '/competitions', label: '대회', icon: Trophy },
  { href: '/level-tests', label: '레벨 테스트', icon: ClipboardList },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
        redirect('/login');
      }
    } catch (error) {
      console.error('로그아웃 실패', error);
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };
  
  const currentUser = user as UserProfile | null;

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg">
            <Trophy className="text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">KGF 넥서스</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={isActive(item.href)}
                  tooltip={{ children: item.label, side: 'right' }}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator className="my-2" />
      <SidebarFooter className="p-2">
         <SidebarMenu>
            <SidebarMenuItem>
                <Link href="/settings">
                    <SidebarMenuButton isActive={isActive('/settings')} tooltip={{ children: '설정', side: 'right' }}>
                        <Settings />
                        <span>설정</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
                 <SidebarMenuButton onClick={handleLogout} tooltip={{ children: '로그아웃', side: 'right' }}>
                     <LogOut />
                     <span>로그아웃</span>
                 </SidebarMenuButton>
             </SidebarMenuItem>
         </SidebarMenu>
        <Separator className="my-2"/>
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-sidebar-accent cursor-pointer">
            {isUserLoading ? (
                <div className="flex items-center gap-3 w-full">
                    <Loader2 className="w-4 h-4 animate-spin"/>
                    <span className="text-sm">로딩 중...</span>
                </div>
            ) : user ? (
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={currentUser?.photoURL} data-ai-hint="person portrait" />
                    <AvatarFallback>
                      {currentUser?.displayName?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="font-semibold text-sm">{currentUser?.displayName}</span>
                    <span className="text-xs text-muted-foreground capitalize">{currentUser?.role === 'admin' ? '관리자' : '회원'}</span>
                </div>
            </div>
            ) : null}
            {!isUserLoading && user && <ChevronDown className="w-4 h-4" />}
        </div>
      </SidebarFooter>
    </>
  );
}
