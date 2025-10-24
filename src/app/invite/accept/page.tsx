export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { ROUTES } from '@/constants/routes';

export default function InviteAcceptRootPage() {
  return (
    <main className="flex-1 p-6 flex items-center justify-center">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-semibold">초대 수락</h1>
        <p className="text-muted-foreground">
          유효한 초대 토큰이 필요합니다. 받은 초대 링크를 통해 접속해주세요.
        </p>
        <div className="pt-2">
          <Link href={ROUTES.SUPER_ADMIN.INVITES} className="underline text-primary">
            초대 관리로 이동
          </Link>
        </div>
      </div>
    </main>
  );
}
