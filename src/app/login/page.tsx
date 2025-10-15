'use client';

import { useState } from 'react';

// Disable static generation for this page
export const dynamic = 'force-dynamic';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Auth,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { Loader2, Trophy } from 'lucide-react';
import { UserProfile, UserRole } from '@/types';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!auth || !firestore) return;
    
    setIsSubmitting(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      // 사용자 프로필 가져오기
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (userDoc.exists()) {
        const userProfile = userDoc.data() as UserProfile;
        
        // 역할에 따라 리다이렉트
        if (userProfile.role === UserRole.SUPER_ADMIN) {
          router.push('/super-admin');
        } else if (userProfile.role === UserRole.CLUB_OWNER || userProfile.role === UserRole.CLUB_MANAGER) {
          router.push('/club-dashboard');
        } else if (userProfile.role === UserRole.FEDERATION_ADMIN) {
          router.push('/admin');
        } else {
          router.push('/my-profile');
        }
      } else {
        // 프로필이 없으면 기본 페이지로
        router.push('/my-profile');
      }
    } catch (error: any) {
      let errorMessage = '예상치 못한 오류가 발생했습니다.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
      }
      toast({
        variant: 'destructive',
        title: '로그인 실패',
        description: errorMessage,
      });
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
        
        // 역할에 따라 리다이렉트
        if (userProfile.role === UserRole.SUPER_ADMIN) {
          router.push('/super-admin');
        } else if (userProfile.role === UserRole.CLUB_OWNER || userProfile.role === UserRole.CLUB_MANAGER) {
          router.push('/club-dashboard');
        } else if (userProfile.role === UserRole.FEDERATION_ADMIN) {
          router.push('/admin');
        } else {
          router.push('/my-profile');
        }
      } else {
        // 프로필이 없으면 기본 페이지로
        router.push('/my-profile');
      }
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: '로그인 실패',
        description: 'Google 로그인 중 오류가 발생했습니다.',
      });
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

  // Force logout function
  const forceLogout = async () => {
    console.log('🔴 forceLogout 호출됨');
    // 먼저 스토리지 삭제
    localStorage.clear();
    sessionStorage.clear();
    
    try {
      if (auth) {
        console.log('🔴 signOut 시도');
        await signOut(auth);
        console.log('🔴 signOut 완료');
      }
    } catch (error) {
      console.error('🔴 로그아웃 에러:', error);
    } finally {
      console.log('🔴 페이지 완전 새로고침');
      // router.push 대신 window.location.reload() 사용
      window.location.reload();
    }
  };

  // If user is already logged in, show message
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>이미 로그인되어 있습니다</CardTitle>
            <CardDescription>대시보드로 이동하시겠습니까?</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button 
              onClick={() => {
                if (user.role === UserRole.SUPER_ADMIN) {
                  router.push('/super-admin');
                } else if (user.role === UserRole.CLUB_OWNER || user.role === UserRole.CLUB_MANAGER) {
                  router.push('/club-dashboard');
                } else if (user.role === UserRole.FEDERATION_ADMIN) {
                  router.push('/admin');
                } else {
                  router.push('/my-profile');
                }
              }}
              className="flex-1"
            >
              대시보드로 이동
            </Button>
            <Button 
              variant="outline"
              onClick={forceLogout}
              className="flex-1"
            >
              로그아웃
            </Button>
          </CardContent>
        </Card>
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
              <Button 
                type="submit" 
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors" 
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                로그인
              </Button>
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
              <Button 
                variant="outline" 
                className="w-full h-11 border-slate-200 hover:bg-slate-50 font-medium transition-colors" 
                onClick={handleGoogleSignIn} 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                    <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 261.8S109.8 11.6 244 11.6c70.3 0 129.8 27.8 174.4 72.4l-64 64c-21.5-20.5-51.5-33.5-98.4-33.5-83.3 0-151.8 68.1-151.8 151.8s68.5 151.8 151.8 151.8c92.2 0 131.3-64.4 136.8-98.2H244v-79.2h236.4c2.5 12.8 3.6 26.4 3.6 40.8z"></path>
                  </svg>
                )}
                Google 계정으로 계속하기
              </Button>
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
