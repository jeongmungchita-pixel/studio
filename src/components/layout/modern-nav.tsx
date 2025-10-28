'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';
import { useRole } from '@/hooks/use-role';
import { LayoutDashboard, Building, Trophy, ClipboardList, Shield, ChevronRight, User } from 'lucide-react';

interface NavSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles: UserRole[];
  badge?: string;
  subItems?: {
    label: string;
    href: string;
  }[];
}

const navSections: NavSection[] = [
  {
    id: 'admin',
    label: '연맹 관리',
    icon: LayoutDashboard,
    href: '/admin',
    roles: [UserRole.FEDERATION_ADMIN],
  },
  {
    id: 'club-dashboard',
    label: '클럽 관리',
    icon: Building,
    href: '/club-dashboard',
    roles: [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER],
    subItems: [
      { label: '대시보드', href: '/club-dashboard' },
      { label: '회원 승인', href: '/club-dashboard/approvals' },
      { label: '이용권 관리', href: '/club-dashboard/passes' },
      { label: '클래스 관리', href: '/club-dashboard/classes' },
      { label: '코치 계정', href: '/club-dashboard/coaches' },
    ],
  },
  {
    id: 'my-profile',
    label: '내 정보',
    icon: User,
    href: '/my-profile',
    roles: [UserRole.MEMBER, UserRole.PARENT],
  },
  {
    id: 'super-admin',
    label: '시스템 관리',
    icon: Shield,
    href: '/super-admin',
    roles: [UserRole.SUPER_ADMIN],
    subItems: [
      { label: '시스템', href: '/super-admin' },
      { label: '사용자', href: '/admin/users' },
      { label: '승인 요청', href: '/system/super-admin-approvals' },
    ],
  },
  {
    id: 'competitions',
    label: '대회',
    icon: Trophy,
    href: '/competitions',
    roles: [UserRole.SUPER_ADMIN, UserRole.FEDERATION_ADMIN, UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER],
  },
  {
    id: 'level-tests',
    label: '레벨 테스트',
    icon: ClipboardList,
    href: '/level-tests',
    roles: [UserRole.SUPER_ADMIN, UserRole.FEDERATION_ADMIN, UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER],
  },
];

interface ModernNavProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

export function ModernNav({ mobile = false, onNavigate }: ModernNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { userRole } = useRole();

  const filteredSections = navSections.filter(
    section => userRole && section.roles.includes(userRole)
  );

  const isActive = (href: string) => {
    if (href === '/admin' || href === '/club-dashboard' || href === '/my-profile') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const handleNavigate = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  if (mobile) {
    return (
      <div className="space-y-1">
        {filteredSections.map((section) => {
          const Icon = section.icon;
          const active = isActive(section.href);
          
          return (
            <div key={section.id}>
              <button
                onClick={() => handleNavigate(section.href)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1 text-left">{section.label}</span>
                {section.badge && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                    {section.badge}
                  </span>
                )}
              </button>
              
              {section.subItems && active && (
                <div className="ml-8 mt-1 space-y-1">
                  {section.subItems.map((subItem) => (
                    <button
                      key={subItem.href}
                      onClick={() => handleNavigate(subItem.href)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                        pathname === subItem.href
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      <ChevronRight className="h-4 w-4" />
                      {subItem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {filteredSections.map((section) => {
        const Icon = section.icon;
        const active = isActive(section.href);
        
        return (
          <button
            key={section.id}
            onClick={() => handleNavigate(section.href)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{section.label}</span>
            {section.badge && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {section.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
