'use client';

export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Users, ArrowRight } from 'lucide-react';

export default function RegisterLandingPage() {
  const router = useRouter();

  return (
    <main className="flex-1 p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-4xl space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">회원 가입</h1>
          <p className="text-muted-foreground text-lg">
            가입 유형을 선택하세요
          </p>
        </div>

        {/* 가입 유형 선택 */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* 성인 개인 회원 */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
            onClick={() => router.push('/register/adult')}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <User className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">성인 회원</CardTitle>
              <CardDescription className="text-base">
                19세 이상 본인만 등록
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>빠른 가입 절차</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>개인 관리</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>간편한 이용권 관리</span>
                </li>
              </ul>
              <Button className="w-full mt-4" size="lg">
                성인 회원 가입하기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* 가족 회원 */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary border-2 border-primary/50 relative"
            onClick={() => router.push('/register/family')}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                추천
              </span>
            </div>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">가족 회원</CardTitle>
              <CardDescription className="text-base">
                부모와 자녀 함께 등록
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>한번에 가족 전체 등록</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>부모만, 자녀만, 함께 모두 가능</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>가족 할인 혜택</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>통합 관리</span>
                </li>
              </ul>
              <Button className="w-full mt-4" size="lg">
                가족 회원 가입하기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 안내 문구 */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>가입 후 클럽의 승인이 필요합니다.</p>
          <p>승인 완료 시 이메일 또는 문자로 안내드립니다.</p>
        </div>
      </div>
    </main>
  );
}
