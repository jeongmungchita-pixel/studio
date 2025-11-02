'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Users, User } from 'lucide-react';
export default function OnboardingPage() {
  const router = useRouter();
  return (
    <main className="flex-1 p-6 flex items-center justify-center">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>회원 유형 선택</CardTitle>
          <CardDescription>가입을 진행할 회원 유형을 선택하세요.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Button className="h-24 flex-col gap-2" onClick={() => router.push('/onboarding/adult')}>
            <User className="h-6 w-6" />
            성인 회원
          </Button>
          <Button className="h-24 flex-col gap-2" onClick={() => router.push('/onboarding/family')}>
            <Users className="h-6 w-6" />
            가족 회원
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
