'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RegisterSuccessPage() {
  const router = useRouter();

  return (
    <main className="flex-1 p-6 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">가입 신청 완료!</CardTitle>
          <CardDescription>
            클럽 관리자의 승인을 기다려주세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>다음 단계:</strong><br />
              1. 클럽 관리자가 신청 내용을 검토합니다<br />
              2. 승인되면 문자 또는 전화로 연락드립니다<br />
              3. 승인 후 클럽 이용이 가능합니다
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => router.push('/')}
              className="w-full"
            >
              홈으로 돌아가기
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
