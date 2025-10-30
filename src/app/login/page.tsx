'use client';

import { useState, useCallback, useEffect } from 'react';

// Disable static generation for this page
export const dynamic = 'force-dynamic';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { Loader2, Trophy } from 'lucide-react';
import { UserProfile, UserRole } from '@/types';
import { useNavigation } from '@/hooks/use-navigation';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { useLoading } from '@/hooks/use-loading';
import { ButtonLoader } from '@/components/loading-indicator';

const formSchema = z.object({
  email: z.string().email({ message: '유효하지 않은 이메일 주소입니다.' }),
  password: z.string().min(6, { message: '비밀번호는 6자 이상이어야 합니다.' }),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const { navigate, navigateByRole } = useNavigation();
  const { handleError } = useErrorHandler({ component: 'LoginPage' });
  const { measureLoading } = useLoading();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // 이미 로그인된 사용자 자동 리다이렉트 (NavigationManager 사용)
  useEffect(() => {
    if (isUserLoading) return;
    if (!user) return;

    // NavigationManager를 통한 역할 기반 리다이렉트
    navigateByRole();
  }, [user, isUserLoading, navigateByRole]);

  // 역할별 리다이렉트 경로 헬퍼 함수
  const getRedirectPath = (role: UserRole): string => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return '/super-admin';
      case UserRole.FEDERATION_ADMIN:
        return '/admin';
      case UserRole.CLUB_OWNER:
      case UserRole.CLUB_MANAGER:
        return '/club-dashboard';
      default:
        return '/my-profile';
    }
  };

  // Force logout function - 컴포넌트 최상위에 위치
  const forceLogout = useCallback(async () => {
    // 먼저 스토리지 삭제
    localStorage.clear();
    sessionStorage.clear();
    
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (error) {
    } finally {
      // 완전히 새로운 페이지로 이동 (캐시 무시)
      router.push('/login');
    }
  }, [auth, router]);

  const onSubmit = async (values: FormValues) => {
    if (!auth || !firestore) return;
    
    setIsSubmitting(true);
    
    try {
      await measureLoading('auth-login', async () => {
        const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
        const user = userCredential.user;
        
        // 사용자 프로필 가져오기
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const userProfile = userDoc.data() as UserProfile;
          
          // NavigationManager를 통한 리다이렉트
          const targetPath = userProfile.status === 'pending' 
            ? '/pending-approval'
            : getRedirectPath(userProfile.role);
          navigate(targetPath, { replace: true });
        } else {
          // 프로필이 없으면 기본 페이지로
          navigate('/my-profile', { replace: true });
        }
      }, { message: '로그인 중...' });
    } catch (error: unknown) {
      // ErrorHandler를 통한 에러 처리
      handleError(error, 'login-submit', { email: values.email });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) return;
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      // 사용자 프로필 가져오기
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (userDoc.exists()) {
        const userProfile = userDoc.data() as UserProfile;
        
        // NavigationManager를 통한 리다이렉트
        const targetPath = userProfile.status === 'pending' 
          ? '/pending-approval'
          : getRedirectPath(userProfile.role);
        navigate(targetPath, { replace: true });
      } else {
        // 프로필이 없으면 기본 페이지로
        navigate('/my-profile', { replace: true });
      }
    } catch (error: unknown) {
      // ErrorHandler를 통한 에러 처리
      handleError(error, 'google-signin');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If user is already logged in, show loading (redirect will happen automatically)
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">대시보드로 이동 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      {/* Windsurf 스타일 배경 그리드 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      <Card className="w-full max-w-md border border-slate-200 shadow-sm relative bg-white">
        <CardHeader className="space-y-6 pt-12 pb-8">
          <div className="flex flex-col items-center gap-6">
            {/* 미니멀한 로고 */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-900 rounded-lg">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                  KGF Nexus
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Korea Gymnastics Federation
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">로그인</h2>
            <p className="text-sm text-slate-600">계정에 액세스하려면 정보를 입력하세요</p>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} autoComplete="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} autoComplete="current-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <ButtonLoader 
                type="submit" 
                className="w-full" 
                loading={isSubmitting}
                loadingText="로그인 중..."
              >
                로그인
              </ButtonLoader>
            </form>
          </Form>
          <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-500">또는</span>
                </div>
              </div>
              <ButtonLoader
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                loading={isSubmitting}
                loadingText="Google 로그인 중..."
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
                Google로 로그인
              </ButtonLoader>
            </>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pb-8 pt-6">
          <div className="w-full h-px bg-slate-100" />
          
          {/* 일반 회원 가입 */}
          <div className="text-center space-y-3">
            <p className="text-sm text-slate-600">
              계정이 없으신가요?
            </p>
            <Link href="/register" className="block">
              <Button 
                variant="ghost" 
                className="w-full h-11 text-slate-900 hover:bg-slate-50 font-medium transition-colors"
                type="button"
              >
                회원가입하기
              </Button>
            </Link>
          </div>

          <div className="w-full h-px bg-slate-100" />

          {/* 관리자 가입 */}
          <div className="text-center space-y-3">
            <p className="text-sm text-slate-600">
              클럽 관리자이신가요?
            </p>
            <Link href="/register/club-owner" className="block">
              <Button 
                variant="outline" 
                className="w-full h-11 text-slate-700 hover:bg-slate-50 font-medium transition-colors border-slate-200"
                type="button"
              >
                클럽 관리자 가입
              </Button>
            </Link>
            <p className="text-xs text-slate-500">
              * 연맹 관리자는 이메일 초대를 통해서만 가입 가능합니다
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
