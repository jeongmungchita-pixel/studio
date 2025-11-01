export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { ROUTES } from '@/constants/routes';
export default function SystemIndexPage() {
  return (
    <main className="flex-1 p-6 flex items-center justify-center">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-semibold">시스템</h1>
        <p className="text-muted-foreground">시스템 관련 페이지로 이동하세요.</p>
        <div className="pt-2">
          <Link href={ROUTES.SYSTEM.SUPER_ADMIN_APPROVALS} className="underline text-primary">
            최고 관리자 승인으로 이동
          </Link>
        </div>
      </div>
    </main>
  );
}
