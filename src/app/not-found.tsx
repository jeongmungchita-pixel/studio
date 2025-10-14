import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-blue-100 p-3">
              <FileQuestion className="h-10 w-10 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">404 - 페이지를 찾을 수 없습니다</CardTitle>
          <CardDescription>
            요청하신 페이지가 존재하지 않거나 이동되었습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Link href="/dashboard" className="w-full">
              <Button className="w-full">
                <Home className="mr-2 h-4 w-4" />
                홈으로 돌아가기
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              이전 페이지로
            </Button>
          </div>

          <div className="rounded-lg bg-slate-100 p-4">
            <p className="text-sm text-slate-700 font-semibold mb-2">
              자주 찾는 페이지
            </p>
            <ul className="space-y-1 text-sm text-slate-600">
              <li>
                <Link href="/dashboard" className="hover:text-blue-600 hover:underline">
                  • 대시보드
                </Link>
              </li>
              <li>
                <Link href="/my-profile" className="hover:text-blue-600 hover:underline">
                  • 내 프로필
                </Link>
              </li>
              <li>
                <Link href="/competitions" className="hover:text-blue-600 hover:underline">
                  • 시합 목록
                </Link>
              </li>
              <li>
                <Link href="/committees" className="hover:text-blue-600 hover:underline">
                  • 위원회
                </Link>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
