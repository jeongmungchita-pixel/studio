'use client';
import { usePathname, useRouter } from 'next/navigation';
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
  Ticket,
  User as UserIcon,
  Archive,
} from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import type { UserProfile } from '@/types';

const menuItems = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard, roles: ['admin'] },
  { href: '/my-profile', label: '내 정보/이용권', icon: UserIcon, roles: ['member'] },
  { href: '/club-dashboard', label: '클럽 대시보드', icon: LayoutDashboard, roles: ['club-admin'] },
  { href: '/club-dashboard/passes', label: '이용권 현황', icon: Ticket, roles: ['club-admin'] },
  { href: '/club-dashboard/pass-templates', label: '이용권 종류 관리', icon: Archive, roles: ['club-admin'] },
  { href: '/admin/users', label: '사용자 관리', icon: UserCog, roles: ['admin']},
  { href: '/members', label: '회원', icon: Users, roles: ['admin'] },
  { href: '/clubs', label: '클럽', icon: Building, roles: ['admin'] },
  { href: '/competitions', label: '대회', icon: Trophy, roles: ['admin', 'club-admin'] },
  { href: '/level-tests', label: '레벨 테스트', icon: ClipboardList, roles: ['admin', 'club-admin'] },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const isActive = (href: string) => {
    // Exact match for dashboard routes
    if (href === '/dashboard' || href === '/club-dashboard' || href === '/my-profile') return pathname === href;
    // StartsWith for nested routes
    return pathname.startsWith(href);
  };
  
  const currentUser = user as UserProfile | null;

  const filteredMenuItems = menuItems.filter(item => 
    currentUser?.role && item.roles.includes(currentUser.role)
  );
  
  const handleLogout = async () => {
    if(auth) {
        await signOut(auth);
        router.push('/login');
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
                  tooltip={item.label}
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
            <SidebarMenuButton onClick={handleLogout} tooltip='로그아웃'>
              <LogOut />
              <span>로그아웃</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
