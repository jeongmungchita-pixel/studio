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
import {
  LayoutDashboard,
  Users,
  Building,
  Trophy,
  ClipboardList,
  UserCog,
  LogOut,
} from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import type { UserProfile } from '@/types';

const menuItems = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard, roles: ['admin', 'member'] },
  { href: '/club-dashboard', label: '클럽 대시보드', icon: LayoutDashboard, roles: ['club-admin'] },
  { href: '/admin/users', label: '사용자 관리', icon: UserCog, roles: ['admin']},
  { href: '/members', label: '회원', icon: Users, roles: ['admin'] },
  { href: '/clubs', label: '클럽', icon: Building, roles: ['admin'] },
  { href: '/competitions', label: '대회', icon: Trophy, roles: ['admin', 'club-admin'] },
  { href: '/level-tests', label: '레벨 테스트', icon: ClipboardList, roles: ['admin', 'club-admin'] },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/club-dashboard') return pathname === href;
    return pathname.startsWith(href);
  };
  
  const currentUser = user as UserProfile | null;

  const filteredMenuItems = menuItems.filter(item => 
    currentUser?.role && item.roles.includes(currentUser.role)
  );
  
  const handleLogout = () => {
    if(auth) {
        signOut(auth);
    }
  }

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
          {filteredMenuItems.map((item) => (
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
       <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip={{ children: '로그아웃', side: 'right' }}>
              <LogOut />
              <span>로그아웃</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
