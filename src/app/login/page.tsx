'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
import { doc, setDoc, getDoc, writeBatch, collection } from 'firebase/firestore';
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
import { useCollection, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { Loader2, Trophy, PlusCircle, Trash2 } from 'lucide-react';
import type { UserProfile, Club } from '@/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const memberDetailsSchema = z.object({
  firstName: z.string().min(1, '이름을 입력하세요.'),
  lastName: z.string().min(1, '성을 입력하세요.'),
  dateOfBirth: z.string().min(1, '생년월일을 입력하세요.'),
  gymnasticsLevel: z.string().min(1, '체조 레벨을 선택하세요.'),
});

const formSchema = z.object({
  email: z.string().email({ message: '유효하지 않은 이메일 주소입니다.' }),
  password: z.string().min(6, { message: '비밀번호는 6자 이상이어야 합니다.' }),
  confirmPassword: z.string().optional(),
  role: z.enum(['member', 'club-admin'], {
    required_error: '역할을 선택해야 합니다.',
  }),
  clubId: z.string().optional(),
  clubName: z.string().optional(), // For club admins
  phoneNumber: z.string().optional(), // For club admins and general users
  signupType: z.enum(['self', 'children', 'both']).optional(),
  selfDetails: memberDetailsSchema.optional(),
  childrenDetails: z.array(memberDetailsSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [currentFormType, setCurrentFormType] = useState<'login' | 'member-signup' | 'admin-signup'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clubsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'clubs') : null),
    [firestore]
  );
  const { data: clubs, isLoading: areClubsLoading } = useCollection<Club>(clubsCollection);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema.refine(
        (data) => {
            if (currentFormType !== 'login' && data.password !== data.confirmPassword) {
                return false;
            }
            return true;
        },
        {
            message: '비밀번호가 일치하지 않습니다.',
            path: ['confirmPassword'],
        }
    ).refine(
        (data) => {
             if (currentFormType === 'member-signup' && !data.clubId) {
                return false;
            }
            return true;
        },
        {
            message: '소속 클럽을 선택하세요.',
            path: ['clubId'],
        }
    )),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      role: 'member',
      clubId: '',
      signupType: 'self',
      childrenDetails: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'childrenDetails',
  });

  const signupType = form.watch('signupType');

  useEffect(() => {
    if (!isUserLoading && user) {
        if (user.role === 'club-admin' && user.status === 'approved') {
            router.push('/club-dashboard');
        } else {
            router.push('/dashboard');
        }
    }
  }, [user, isUserLoading, router]);

  const getFormTitle = () => {
    switch (currentFormType) {
      case 'login': return '로그인';
      case 'member-signup': return '일반/학부모 회원가입';
      case 'admin-signup': return '클럽 관리자 가입';
    }
  };

  const getFormDescription = () => {
    switch (currentFormType) {
      case 'login': return '계정에 액세스하려면 정보를 입력하세요';
      case 'member-signup': return '가입 유형을 선택하고 정보를 입력하세요';
      case 'admin-signup': return '클럽 정보를 입력하고 승인을 요청하세요';
    }
  };

  useEffect(() => {
    form.reset();
    form.setValue('role', currentFormType === 'admin-signup' ? 'club-admin' : 'member');
    if (currentFormType === 'member-signup') {
      form.setValue('signupType', 'self');
    }
  }, [currentFormType, form]);

  const onSubmit = async (values: FormValues) => {
    if (!auth || !firestore) return;
    
    setIsSubmitting(true);
    try {
      if (currentFormType !== 'login') {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const newUser = userCredential.user;
        await createUserProfile(newUser, values);
        toast({
          title: '회원가입 성공!',
          description: values.role === 'club-admin' ? '관리자 승인 후 로그인이 가능합니다.' : '로그인 되었습니다.',
        });
        
        if (values.role === 'club-admin') {
          await signOut(auth);
          setCurrentFormType('login');
        }
      } else {
        await signInWithEmailAndPassword(auth, values.email, values.password);
      }
    } catch (error: any) {
      console.error('Authentication Error:', error);
      let errorMessage = '예상치 못한 오류가 발생했습니다.';
      if (error.code === 'auth/invalid-credential') {
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
    const batch = writeBatch(firestore);

    const userRef = doc(firestore, 'users', user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) return;

    let role: UserProfile['role'] = values.role || 'member';
    if (user.email === 'wo1109ok@me.com') {
      role = 'admin';
    }

    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || values.selfDetails?.firstName || user.email!.split('@')[0],
      photoURL: user.photoURL || `https://picsum.photos/seed/${user.uid}/40/40`,
      role: role,
      provider: (user.providerData[0]?.providerId as 'google' | 'password') || 'password',
      status: role === 'club-admin' ? 'pending' : 'approved',
      isGuardian: values.signupType === 'children' || values.signupType === 'both',
      ...(role === 'club-admin' && { clubName: values.clubName, phoneNumber: values.phoneNumber }),
    };
    batch.set(userRef, userProfile);

    // Create Member documents
    if (role === 'member') {
      const memberBase = {
        email: user.email!,
        phoneNumber: values.phoneNumber!,
        clubId: values.clubId!,
        status: 'active' as const,
      };

      // Register self
      if ((values.signupType === 'self' || values.signupType === 'both') && values.selfDetails) {
        const selfMemberRef = doc(collection(firestore, 'members'));
        batch.set(selfMemberRef, {
          ...memberBase,
          ...values.selfDetails,
          id: selfMemberRef.id,
          guardianId: null,
          guardianName: null,
        });
      }

      // Register children
      if ((values.signupType === 'children' || values.signupType === 'both') && values.childrenDetails) {
        values.childrenDetails.forEach(child => {
          const childMemberRef = doc(collection(firestore, 'members'));
          batch.set(childMemberRef, {
            ...memberBase,
            ...child,
            id: childMemberRef.id,
            guardianId: user.uid,
            guardianName: `${values.selfDetails?.lastName || ''}${values.selfDetails?.firstName || userProfile.displayName}`,
          });
        });
      }
    }

    await batch.commit();
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
      <Card className="w-full max-w-lg shadow-2xl">
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
              {currentFormType !== 'login' && (
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

                  {currentFormType === 'admin-signup' && (
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

                  {currentFormType === 'member-signup' && (
                    <>
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>연락처</FormLabel>
                            <FormControl>
                              <Input placeholder="연락 가능한 전화번호를 입력하세요" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                       <FormField
                        control={form.control}
                        name="clubId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>소속 클럽</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger disabled={areClubsLoading}>
                                  <SelectValue placeholder={areClubsLoading ? "클럽 목록을 불러오는 중..." : "클럽을 선택하세요"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clubs?.map(club => (
                                  <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Separator />

                      <FormField
                        control={form.control}
                        name="signupType"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>가입 유형</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                              >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="self" />
                                  </FormControl>
                                  <FormLabel className="font-normal">본인만 등록 (선수/일반)</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="children" />
                                  </FormControl>
                                  <FormLabel className="font-normal">자녀만 등록 (학부모)</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="both" />
                                  </FormControl>
                                  <FormLabel className="font-normal">본인과 자녀 모두 등록</FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {(signupType === 'self' || signupType === 'both') && (
                        <div className="space-y-4 rounded-md border p-4">
                          <h3 className="font-medium">본인 정보</h3>
                           <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="selfDetails.lastName" render={({ field }) => ( <FormItem><FormLabel>성</FormLabel><FormControl><Input placeholder="김" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="selfDetails.firstName" render={({ field }) => ( <FormItem><FormLabel>이름</FormLabel><FormControl><Input placeholder="연아" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                          </div>
                          <FormField control={form.control} name="selfDetails.dateOfBirth" render={({ field }) => ( <FormItem><FormLabel>생년월일</FormLabel><FormControl><Input placeholder="YYYY-MM-DD" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={form.control} name="selfDetails.gymnasticsLevel" render={({ field }) => ( <FormItem><FormLabel>체조 레벨</FormLabel><FormControl><Input placeholder="예: Level 3" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                      )}

                      {(signupType === 'children' || signupType === 'both') && (
                        <div className="space-y-4">
                          <Separator />
                          <h3 className="font-medium">자녀 정보</h3>
                          {fields.map((item, index) => (
                            <div key={item.id} className="space-y-4 rounded-md border p-4 relative">
                               <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4 text-destructive"/>
                              </Button>
                              <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name={`childrenDetails.${index}.lastName`} render={({ field }) => ( <FormItem><FormLabel>성</FormLabel><FormControl><Input placeholder="박" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name={`childrenDetails.${index}.firstName`} render={({ field }) => ( <FormItem><FormLabel>이름</FormLabel><FormControl><Input placeholder="태환" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                              </div>
                              <FormField control={form.control} name={`childrenDetails.${index}.dateOfBirth`} render={({ field }) => ( <FormItem><FormLabel>생년월일</FormLabel><FormControl><Input placeholder="YYYY-MM-DD" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                              <FormField control={form.control} name={`childrenDetails.${index}.gymnasticsLevel`} render={({ field }) => ( <FormItem><FormLabel>체조 레벨</FormLabel><FormControl><Input placeholder="예: Level 1" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" onClick={() => append({ firstName: '', lastName: '', dateOfBirth: '', gymnasticsLevel: ''})}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            자녀 추가
                          </Button>
                        </div>
                      )}
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
        <CardFooter className="flex-col gap-4">
          {currentFormType !== 'login' ? (
            <Button variant="link" onClick={() => setCurrentFormType('login')}>
              이미 계정이 있으신가요? 로그인
            </Button>
          ) : (
            <div className="flex justify-center items-center w-full space-x-4">
              <Button variant="link" onClick={() => setCurrentFormType('member-signup')}>
                일반/학부모 회원가입
              </Button>
              <span className="text-muted-foreground">|</span>
              <Button variant="link" onClick={() => setCurrentFormType('admin-signup')}>
                관리자이신가요?
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
