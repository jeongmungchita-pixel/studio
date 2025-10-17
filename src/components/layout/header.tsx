'use client';
import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { GlobalSearch } from '@/components/layout/global-search';

function toTitleCase(str: string) {
  const koreanMap: { [key: string]: string } = {
    'dashboard': '대시보드',
    'club-dashboard': '클럽 대시보드',
    'my-profile': '내 정보',
    'super-admin': '시스템 관리',
    'members': '회원',
    'clubs': '클럽',
    'competitions': '대회',
    'level-tests': '레벨 테스트',
    'admin': '관리',
    'users': '사용자',
    'classes': '클래스',
    'passes': '이용권',
    'pass-templates': '이용권 종류',
    'approvals': '승인 요청',
    'family': '가족',
    'system': '시스템',
    'super-admin-approvals': '최고 관리자 승인',
    'pending': '승인 대기',
  }
  if (koreanMap[str]) {
    return koreanMap[str];
  }
  return str.replace(/-/g, ' ').replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
}

export function AppHeader({
  showAddButton = false,
  addButtonLabel = "새로 추가",
  onAddClick,
}: {
  showAddButton?: boolean;
  addButtonLabel?: string;
  onAddClick?: () => void;
}) {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden"/>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <GlobalSearch />

        {showAddButton && (
          <Button onClick={onAddClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {addButtonLabel}
          </Button>
        )}
      </div>
    </header>
  );
}
