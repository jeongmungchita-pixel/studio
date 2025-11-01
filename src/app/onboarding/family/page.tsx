'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
export default function OnboardingFamilyPage() {
  const router = useRouter();
  return (
    <main className="flex-1 p-6 flex items-center justify-center">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>가족 회원 온보딩</CardTitle>
          <CardDescription>단계별로 정보를 입력하고 제출하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full h-12 gap-2" onClick={() => router.push('/register/family')}>
            <Users className="h-5 w-5" /> 기존 가족 가입 폼으로 진행
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
