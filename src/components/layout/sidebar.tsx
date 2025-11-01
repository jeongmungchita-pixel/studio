'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from '@/components/ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Ticket, Archive, BookMarked, CheckSquare, Camera, Settings, UserPlus, Home, ArrowLeft, PartyPopper, Trophy, Award, Bell, TrendingUp, MessageSquare, CreditCard, DollarSign, ChevronDown, Users, Mail, Building, Gavel } from 'lucide-react';
import { useUser } from '@/firebase';
import { LogoutButton } from '@/components/logout-button';
import { UserRole } from '@/types';
interface SubMenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: string; // 어느 섹션의 서브메뉴인지
  group?: string; // 그룹 (main, operations, finance, system 등)
  roles: UserRole[];
}
// 섹션별 서브메뉴 정의
const subMenuItems: SubMenuItem[] = [
  // 시스템 관리 서브메뉴
  { 
    href: '/super-admin', 
    label: '개요', 
    icon: Home, 
    section: 'super-admin',
    roles: [UserRole.SUPER_ADMIN] 
  },
  { 
    href: '/super-admin/invites', 
    label: '초대 관리', 
    icon: Mail, 
    section: 'super-admin',
    roles: [UserRole.SUPER_ADMIN] 
  },
  { 
    href: '/system/super-admin-approvals', 
    label: '최고 관리자 승인', 
    icon: CheckSquare, 
    section: 'super-admin',
    roles: [UserRole.SUPER_ADMIN] 
  },
  // 클럽 대시보드 - 자주 사용 (항상 표시)
  { 
    href: '/club-dashboard', 
    label: '대시보드', 
    icon: Home, 
    section: 'club-dashboard',
    group: 'main',
    roles: [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER] 
  },
  { 
    href: '/club-dashboard/approvals', 
    label: '회원 관리', 
    icon: Users, 
    section: 'club-dashboard',
    group: 'main',
    roles: [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER] 
  },
  { 
    href: '/club-dashboard/class-status', 
    label: '출석 관리', 
    icon: CheckSquare, 
    section: 'club-dashboard',
    group: 'main',
    roles: [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER] 
  },
  { 
    href: '/club-dashboard/media', 
    label: '미디어 관리', 
    icon: Camera, 
    section: 'club-dashboard',
    group: 'main',
    roles: [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER] 
  },
  { 
    href: '/club-dashboard/payments', 
    label: '결제 관리', 
    icon: CreditCard, 
    section: 'club-dashboard',
    group: 'main',
    roles: [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER] 
  },
  { 
    href: '/club-dashboard/announcements', 
    label: '공지사항', 
    icon: Bell, 
    section: 'club-dashboard',
    group: 'main',
    roles: [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER] 
  },
  { 
    href: '/club-dashboard/member-approvals', 
    label: '회원 가입 승인', 
    icon: UserPlus, 
    section: 'club-dashboard',
    group: 'main',
    roles: [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER] 
  },
  // 클럽 대시보드 - 운영 관리 (접을 수 있음)
  { 
    href: '/club-dashboard/passes', 
    label: '이용권 현황', 
    icon: Ticket, 
    section: 'club-dashboard',
    group: 'operations',
    roles: [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER] 
  },
  { 
    href: '/club-dashboard/pass-templates', 
    label: '이용권 종류', 
    icon: Archive, 
    section: 'club-dashboard',
    group: 'operations',
    roles: [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER] 
  },
  { 
    href: '/club-dashboard/events', 
    label: '이벤트 관리', 
    icon: PartyPopper, 
    section: 'club-dashboard',
    group: 'operations',
    roles: [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER] 
  },
  { 
    href: '/club-dashboard/level-tests', 
    label: '레벨테스트', 
    icon: Award, 
    section: 'club-dashboard',
    group: 'operations',
    roles: [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER] 
  },
  { 
    href: '/club-dashboard/classes', 
    label: '클래스 관리', 
    icon: BookMarked, 
    section: 'club-dashboard',
    group: 'operations',
    roles: [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER] 
  },
  // 클럽 대시보드 - 재무/분석 (접을 수 있음)
  { 
    href: '/club-dashboard/finance', 
    label: '재무 관리', 
    icon: DollarSign, 
    section: 'club-dashboard',
    group: 'finance',
    roles: [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER] 
  },
  { 
    href: '/club-dashboard/analytics', 
    label: '통계 분석', 
    icon: TrendingUp, 
    section: 'club-dashboard',
    group: 'finance',
    roles: [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER] 
  },
  // 클럽 대시보드 - 시스템 (접을 수 있음)
  { 
    href: '/club-dashboard/messages', 
    label: '단체문자', 
    icon: MessageSquare, 
    section: 'club-dashboard',
    group: 'system',
    roles: [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER] 
  },
  { 
    href: '/club-dashboard/settings', 
    label: '설정', 
    icon: Settings, 
    section: 'club-dashboard',
    group: 'system',
    roles: [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER] 
  },
  // 연맹 관리자 대시보드 서브메뉴
  { 
    href: '/admin', 
    label: '대시보드', 
    icon: Home, 
    section: 'admin',
    roles: [UserRole.FEDERATION_ADMIN, UserRole.SUPER_ADMIN] 
  },
  { 
    href: '/admin/members', 
    label: '회원 관리', 
    icon: Users, 
    section: 'admin',
    roles: [UserRole.FEDERATION_ADMIN, UserRole.SUPER_ADMIN] 
  },
  { 
    href: '/admin/clubs', 
    label: '클럽 관리', 
    icon: Building, 
    section: 'admin',
    roles: [UserRole.FEDERATION_ADMIN, UserRole.SUPER_ADMIN] 
  },
  { 
    href: '/admin/competitions', 
    label: '대회 관리', 
    icon: Trophy, 
    section: 'admin',
    roles: [UserRole.FEDERATION_ADMIN, UserRole.SUPER_ADMIN] 
  },
  { 
    href: '/admin/committees', 
    label: '위원회 관리', 
    icon: Users, 
    section: 'admin',
    roles: [UserRole.FEDERATION_ADMIN, UserRole.SUPER_ADMIN] 
  },
  { 
    href: '/admin/judges', 
    label: '심판 관리', 
    icon: Gavel, 
    section: 'admin',
    roles: [UserRole.FEDERATION_ADMIN, UserRole.SUPER_ADMIN] 
  },
  // 내 정보 서브메뉴
  { 
    href: '/dashboard', 
    label: '대시보드', 
    icon: Home, 
    section: 'member',
    roles: [UserRole.MEMBER] 
  },
  { 
    href: '/events', 
    label: '이벤트', 
    icon: PartyPopper, 
    section: 'member',
    roles: [UserRole.MEMBER] 
  },
  { 
    href: '/competitions', 
    label: '시합', 
    icon: Trophy, 
    section: 'member',
    roles: [UserRole.MEMBER] 
  },
  { 
    href: '/level-tests', 
    label: '레벨테스트', 
    icon: Award, 
    section: 'member',
    roles: [UserRole.MEMBER] 
  },
  { 
    href: '/announcements', 
    label: '공지사항', 
    icon: Bell, 
    section: 'member',
    roles: [UserRole.MEMBER] 
  },
  { 
    href: '/my-profile', 
    label: '내 정보', 
    icon: Home, 
    section: 'my-profile',
    roles: [UserRole.MEMBER, UserRole.PARENT] 
  },
  { 
    href: '/my-profile/family', 
    label: '가족 관리', 
    icon: UserPlus, 
    section: 'my-profile',
    roles: [UserRole.MEMBER, UserRole.PARENT] 
  },
  // 회원 상세 페이지 서브메뉴
  { 
    href: '/club-dashboard', 
    label: '클럽 대시보드로', 
    icon: ArrowLeft, 
    section: 'member-detail',
    roles: [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER] 
  },
];
// 현재 경로에서 섹션 추출
function getCurrentSection(pathname: string): string {
  if (pathname.startsWith('/super-admin') || pathname.startsWith('/system')) return 'super-admin';
  if (pathname.startsWith('/club-dashboard')) return 'club-dashboard';
  if (pathname.startsWith('/admin')) return 'admin'; // 연맹 관리자 섹션 (모든 /admin/* 포함)
  if (pathname.startsWith('/my-profile')) return 'my-profile';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  return '';
}
export function AppSidebar() {
  const pathname = usePathname();
  const { _user: currentUser } = useUser();
  const router = useRouter();
  const isActive = (href: string) => {
    return pathname === href;
  };
  const currentSection = getCurrentSection(pathname);
  // 현재 섹션의 서브메뉴만 필터링
  const filteredSubMenuItems = subMenuItems.filter(item => 
    item.section === currentSection &&
    currentUser?.role && 
    item.roles.includes(currentUser.role)
  );
  // 서브메뉴가 없으면 사이드바를 표시하지 않음
  if (filteredSubMenuItems.length === 0) {
    return (
      <>
        <SidebarHeader>
          <div className="flex items-center gap-3 px-2">
            <span className="text-lg font-semibold">KGF 넥서스</span>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <div className="text-sm text-muted-foreground px-4 py-8 text-center">
            서브메뉴가 없습니다
          </div>
        </SidebarContent>
        <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <LogoutButton 
                variant="ghost" 
                size="default"
                className="w-full justify-start" 
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </>
    );
  }
  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2">
          <span className="text-lg font-semibold">KGF 넥서스</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        {/* Main menu items (always visible) */}
        {filteredSubMenuItems.filter(item => !item.group || item.group === 'main').length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredSubMenuItems
                  .filter(item => !item.group || item.group === 'main')
                  .map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <Link href={item.href}>
                        <SidebarMenuButton
                          isActive={isActive(item.href)}
                          tooltip={item.label}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {/* Operations group (collapsible) */}
        {filteredSubMenuItems.filter(item => item.group === 'operations').length > 0 && (
          <Collapsible defaultOpen={false} className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  <span>운영 관리</span>
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredSubMenuItems
                      .filter(item => item.group === 'operations')
                      .map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <Link href={item.href}>
                            <SidebarMenuButton
                              isActive={isActive(item.href)}
                              tooltip={item.label}
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                      ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}
        {/* Finance group (collapsible) */}
        {filteredSubMenuItems.filter(item => item.group === 'finance').length > 0 && (
          <Collapsible defaultOpen={false} className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  <span>재무/분석</span>
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredSubMenuItems
                      .filter(item => item.group === 'finance')
                      .map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <Link href={item.href}>
                            <SidebarMenuButton
                              isActive={isActive(item.href)}
                              tooltip={item.label}
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                      ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}
        {/* System group (collapsible) */}
        {filteredSubMenuItems.filter(item => item.group === 'system').length > 0 && (
          <Collapsible defaultOpen={false} className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  <span>시스템</span>
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredSubMenuItems
                      .filter(item => item.group === 'system')
                      .map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <Link href={item.href}>
                            <SidebarMenuButton
                              isActive={isActive(item.href)}
                              tooltip={item.label}
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                      ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <LogoutButton 
              variant="ghost" 
              size="default"
              className="w-full justify-start" 
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
