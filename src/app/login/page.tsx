'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!isUserLoading && user) {
      // User is already logged in, redirect based on role
      if (user.role === UserRole.SUPER_ADMIN) {
        router.push('/super-admin');
      } else if (user.role === UserRole.CLUB_OWNER || user.role === UserRole.CLUB_MANAGER) {
        router.push('/club-dashboard');
      } else if (user.role === UserRole.FEDERATION_ADMIN) {
        router.push('/admin');
      } else {
        router.push('/my-profile');
      }
    }
  }, [user, isUserLoading, router]);


  const onSubmit = async (values: FormValues) => {
    if (!auth) return;
    
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
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
    if (!auth) return;
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
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

  if (isUserLoading || (!isUserLoading && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
          <div className="text-center space-y-3">
            <p className="text-sm text-slate-600">
              계정이 없으신가요?
            </p>
            <Button 
              variant="ghost" 
              className="w-full h-11 text-slate-900 hover:bg-slate-50 font-medium transition-colors" 
              onClick={() => router.push('/register')}
            >
              회원가입하기
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
