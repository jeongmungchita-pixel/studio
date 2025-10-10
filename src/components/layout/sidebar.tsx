'use client';
import { usePathname, redirect } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  Building,
  Trophy,
  ClipboardList,
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
    </>
  );
}
