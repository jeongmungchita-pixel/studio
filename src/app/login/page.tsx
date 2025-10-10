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
import { doc, setDoc, getDoc } from 'firebase/firestore';
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
import type { UserProfile } from '@/types';

const formSchema = z.object({
  email: z.string().email({ message: '유효하지 않은 이메일 주소입니다.' }),
  password: z.string().min(6, { message: '비밀번호는 6자 이상이어야 합니다.' }),
  confirmPassword: z.string().optional(),
  role: z.enum(['member', 'club-admin'], {
    required_error: '역할을 선택해야 합니다.',
  }),
  clubName: z.string().optional(), // For club admins
  phoneNumber: z.string().optional(), // For club admins
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [currentFormType, setCurrentFormType] = useState<'login' | 'signup'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema.refine(
        (data) => {
            if (currentFormType === 'signup' && data.password !== data.confirmPassword) {
                return false;
            }
            return true;
        },
        {
            message: '비밀번호가 일치하지 않습니다.',
            path: ['confirmPassword'],
        }
    )),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      role: 'member',
    },
  });

  const role = form.watch('role');

  useEffect(() => {
    if (!isUserLoading && user) {
        // Redirection logic is now primarily handled in MainLayout
        router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const getFormTitle = () => {
    return currentFormType === 'login' ? '로그인' : '회원가입';
  };

  const getFormDescription = () => {
     return currentFormType === 'login' ? '계정에 액세스하려면 정보를 입력하세요' : '계정을 만들려면 정보를 입력하세요';
  };

  const handleFormTypeChange = (type: 'login' | 'signup') => {
    form.reset();
    setCurrentFormType(type);
    if(type === 'signup') {
        form.setValue('role', 'member');
    }
  }

  const onSubmit = async (values: FormValues) => {
    if (!auth || !firestore) return;
    
    setIsSubmitting(true);
    try {
      if (currentFormType === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        await createUserProfile(userCredential.user, values);
        toast({
          title: '회원가입 성공!',
          description: values.role === 'club-admin' ? '관리자 승인 후 로그인이 가능합니다.' : '로그인 되었습니다.',
        });
        
        if (values.role === 'club-admin') {
          await signOut(auth);
          setCurrentFormType('login');
        }
        // For 'member' role, onAuthStateChanged will handle the redirect.
      } else {
        await signInWithEmailAndPassword(auth, values.email, values.password);
      }
    } catch (error: any) {
      let errorMessage = '예상치 못한 오류가 발생했습니다.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = '이미 사용 중인 이메일입니다.';
      }
      toast({
        variant: 'destructive',
        title: '인증 실패',
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
      const result = await signInWithPopup(auth, provider);
      await createUserProfile(result.user, { role: 'member', email: result.user.email! });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: '인증 실패',
        description: 'Google 로그인 중 오류가 발생했습니다.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const createUserProfile = async (user: User, values: Partial<FormValues>) => {
    if (!firestore) return;

    const userRef = doc(firestore, 'users', user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) return;

    let role: UserProfile['role'] = values.role || 'member';
    // Super admin check
    if (user.email === 'wo1109ok@me.com') {
      role = 'admin';
    }

    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || user.email!.split('@')[0],
      photoURL: user.photoURL || `https://picsum.photos/seed/${user.uid}/40/40`,
      role: role,
      provider: (user.providerData[0]?.providerId as 'google' | 'password') || 'password',
      status: role === 'club-admin' ? 'pending' : 'approved',
      ...(role === 'club-admin' && { clubName: values.clubName, phoneNumber: values.phoneNumber }),
    };

    await setDoc(userRef, userProfile);
  };

  if (isUserLoading || (!isUserLoading && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6 flex flex-col items-center gap-4">
            <div className="rounded-lg bg-primary p-3">
              <Trophy className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl">KGF 넥서스</CardTitle>
          </div>
          <CardTitle className="text-2xl">{getFormTitle()}</CardTitle>
          <CardDescription>{getFormDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
               {currentFormType === 'signup' && (
                 <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>가입 유형</FormLabel>
                        <FormControl>
                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    variant={field.value === 'member' ? 'default' : 'outline'}
                                    className="flex-1"
                                    onClick={() => field.onChange('member')}
                                >
                                    일반/학부모 회원
                                </Button>
                                <Button
                                    type="button"
                                    variant={field.value === 'club-admin' ? 'default' : 'outline'}
                                    className="flex-1"
                                    onClick={() => field.onChange('club-admin')}
                                >
                                    클럽 관리자
                                </Button>
                            </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
               )}

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
                      <Input type="password" placeholder="••••••••" {...field} autoComplete={currentFormType === 'login' ? 'current-password' : 'new-password'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {currentFormType === 'signup' && (
                <>
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>비밀번호 확인</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} autoComplete="new-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {role === 'club-admin' && (
                    <>
                      <FormField
                        control={form.control}
                        name="clubName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>클럽 이름</FormLabel>
                            <FormControl>
                              <Input placeholder="소속 클럽의 이름을 입력하세요" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>클럽 전화번호</FormLabel>
                            <FormControl>
                              <Input placeholder="연락 가능한 클럽 전화번호를 입력하세요" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {currentFormType === 'login' ? '로그인' : '회원가입'}
              </Button>
            </form>
          </Form>
          {currentFormType === 'login' && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">또는</span>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isSubmitting}>
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
          )}
        </CardContent>
        <CardFooter>
          {currentFormType === 'login' ? (
            <Button variant="link" className="w-full" onClick={() => handleFormTypeChange('signup')}>
              계정이 없으신가요? 회원가입
            </Button>
          ) : (
            <Button variant="link" className="w-full" onClick={() => handleFormTypeChange('login')}>
              이미 계정이 있으신가요? 로그인
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
