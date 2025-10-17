'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';
import { useRole } from '@/hooks/use-role';
import { LayoutDashboard, Users, Building, Trophy, ClipboardList, UserCog, Shield } from 'lucide-react';

interface NavSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  basePath: string;
  roles: UserRole[];
}

const navSections: NavSection[] = [
  {
    id: 'dashboard',
    label: '대시보드',
    icon: LayoutDashboard,
    basePath: '/dashboard',
    roles: [UserRole.SUPER_ADMIN, UserRole.FEDERATION_ADMIN],
  },
  {
    id: 'club-dashboard',
    label: '클럽 대시보드',
    icon: LayoutDashboard,
    basePath: '/club-dashboard',
    roles: [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER],
  },
  {
    id: 'my-profile',
    label: '내 정보',
    icon: UserIcon,
    basePath: '/my-profile',
    roles: [UserRole.MEMBER, UserRole.PARENT],
  },
  {
    id: 'super-admin',
    label: '시스템 관리',
    icon: Shield,
    basePath: '/super-admin',
    roles: [UserRole.SUPER_ADMIN],
  },
  {
    id: 'users',
    label: '사용자',
    icon: UserCog,
    basePath: '/admin/users',
    roles: [UserRole.SUPER_ADMIN, UserRole.FEDERATION_ADMIN],
  },
  {
    id: 'members',
    label: '회원',
    icon: Users,
    basePath: '/members',
    roles: [UserRole.SUPER_ADMIN, UserRole.FEDERATION_ADMIN],
  },
  {
    id: 'clubs',
    label: '클럽',
    icon: Building,
    basePath: '/clubs',
    roles: [UserRole.SUPER_ADMIN, UserRole.FEDERATION_ADMIN],
  },
  {
    id: 'competitions',
    label: '대회',
    icon: Trophy,
    basePath: '/competitions',
    roles: [UserRole.SUPER_ADMIN, UserRole.FEDERATION_ADMIN, UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER],
  },
  {
    id: 'level-tests',
    label: '레벨 테스트',
    icon: ClipboardList,
    basePath: '/level-tests',
    roles: [UserRole.SUPER_ADMIN, UserRole.FEDERATION_ADMIN, UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER],
  },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { userRole } = useRole();

  const filteredSections = navSections.filter(
    section => userRole && section.roles.includes(userRole)
  );

  const isActive = (basePath: string) => {
    if (basePath === '/dashboard' || basePath === '/club-dashboard' || basePath === '/my-profile') {
      return pathname === basePath;
    }
    return pathname.startsWith(basePath);
  };

  return (
    <nav className="border-b bg-background">
      <div className="flex h-14 items-center px-6 gap-1">
        {filteredSections.map((section) => {
          const Icon = section.icon;
          const active = isActive(section.basePath);
          
          return (
            <button
              key={section.id}
              onClick={() => router.push(section.basePath)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{section.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
