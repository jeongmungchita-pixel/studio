'use client';

import { useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCollection, useFirebase, useUser } from '@/firebase';
import {
  collection,
  writeBatch,
  doc,
} from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Club, Member } from '@/types';
import { useMemoFirebase } from '@/firebase/provider';

const childSchema = z.object({
  firstName: z.string().min(1, '성을 입력하세요.'),
  lastName: z.string().min(1, '이름을 입력하세요.'),
  dateOfBirth: z.string().min(1, '생년월일을 입력하세요.'),
  gender: z.enum(['male', 'female'], { required_error: '성별을 선택하세요.' }),
  guardianPhoneNumber: z.string().optional(),
});

const formSchema = z.object({
  registrationType: z.enum(['self', 'children', 'both'], {
    required_error: '가입 유형을 선택하세요.',
  }),
  selfInfo: childSchema.optional(),
  childrenInfo: z.array(childSchema).optional(),
  clubId: z.string().min(1, '클럽을 선택하세요.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function ProfileSetupPage() {
  const { firestore, auth } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const clubsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'clubs') : null),
    [firestore]
  );
  const { data: clubs, isLoading: areClubsLoading } = useCollection<Club>(clubsCollection);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      registrationType: undefined,
      selfInfo: { firstName: '', lastName: '', dateOfBirth: '', gender: undefined },
      childrenInfo: [],
      clubId: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'childrenInfo',
  });

  const registrationType = form.watch('registrationType');

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !user) return;

    try {
      const batch = writeBatch(firestore);

      // Case 1 & 3: Register self
      if ((values.registrationType === 'self' || values.registrationType === 'both') && values.selfInfo) {
        const selfData = values.selfInfo;
        const memberRef = doc(collection(firestore, 'members'));
        const memberPayload: Member = {
            id: memberRef.id,
            firstName: selfData.firstName,
            lastName: selfData.lastName,
            dateOfBirth: new Date(selfData.dateOfBirth).toISOString(),
            gender: selfData.gender,
            email: user.email!,
            phoneNumber: user.phoneNumber,
            clubId: values.clubId,
            status: 'pending',
            guardianId: (values.registrationType === 'both' || values.registrationType === 'self') ? user.uid : undefined,
            guardianName: (values.registrationType === 'both' || values.registrationType === 'self') ? user.displayName : undefined,
            guardianPhoneNumber: selfData.guardianPhoneNumber,
        };
        batch.set(memberRef, memberPayload);
      }

      // Case 2 & 3: Register children
      if ((values.registrationType === 'children' || values.registrationType === 'both') && values.childrenInfo) {
        values.childrenInfo?.forEach(child => {
            const memberRef = doc(collection(firestore, 'members'));
            const memberPayload: Member = {
                id: memberRef.id,
                firstName: child.firstName,
                lastName: child.lastName,
                dateOfBirth: new Date(child.dateOfBirth).toISOString(),
                gender: child.gender,
                email: user.email!, // Guardian's email
                clubId: values.clubId,
                status: 'pending',
                guardianId: user.uid,
                guardianName: user.displayName || '',
                guardianPhoneNumber: child.guardianPhoneNumber,
            };
            batch.set(memberRef, memberPayload);
        });
      }
      
      await batch.commit();

      toast({
        title: '프로필 저장 완료',
        description: '정보가 성공적으로 저장되었습니다. 클럽 승인을 기다려주세요.',
      });
      router.push('/dashboard');
    } catch (error) {
      console.error('Error setting up profile:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '프로필을 저장하는 중 오류가 발생했습니다.',
      });
    }
  };
  
  if (isUserLoading || areClubsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>프로필 설정</CardTitle>
          <CardDescription>
            선수 또는 학부모 정보를 입력하여 KGF 넥서스 활동을 시작하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="registrationType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>가입 유형</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col sm:flex-row gap-4"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="self" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            본인 등록 (선수)
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="children" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            자녀만 등록 (학부모)
                          </FormLabel>
                        </FormItem>
                         <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="both" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            본인과 자녀 모두 등록
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(registrationType === 'self' || registrationType === 'both') && (
                 <div className="space-y-4 p-4 border rounded-md">
                    <h3 className="font-medium">본인 정보</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <FormField control={form.control} name="selfInfo.firstName" render={({ field }) => (
                            <FormItem><FormLabel>성</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                         )}/>
                         <FormField control={form.control} name="selfInfo.lastName" render={({ field }) => (
                            <FormItem><FormLabel>이름</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                         )}/>
                         <FormField control={form.control} name="selfInfo.dateOfBirth" render={({ field }) => (
                            <FormItem><FormLabel>생년월일</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                         )}/>
                         <FormField control={form.control} name="selfInfo.gender" render={({ field }) => (
                            <FormItem><FormLabel>성별</FormLabel>
                                <FormControl>
                                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormControl><RadioGroupItem value="male" /></FormControl>
                                      <FormLabel className="font-normal">남자</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormControl><RadioGroupItem value="female" /></FormControl>
                                      <FormLabel className="font-normal">여자</FormLabel>
                                    </FormItem>
                                  </RadioGroup>
                                </FormControl>
                            <FormMessage /></FormItem>
                         )}/>
                         <FormField control={form.control} name="selfInfo.guardianPhoneNumber" render={({ field }) => (
                            <FormItem><FormLabel>부모님 전화번호</FormLabel><FormControl><Input type="tel" {...field} placeholder="선택사항" /></FormControl><FormMessage /></FormItem>
                         )}/>
                    </div>
                 </div>
              )}

              {(registrationType === 'children' || registrationType === 'both') && (
                 <div className="space-y-4">
                    <h3 className="font-medium">자녀 정보</h3>
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-md relative space-y-4">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name={`childrenInfo.${index}.firstName`} render={({ field }) => (
                                    <FormItem><FormLabel>성</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name={`childrenInfo.${index}.lastName`} render={({ field }) => (
                                    <FormItem><FormLabel>이름</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name={`childrenInfo.${index}.dateOfBirth`} render={({ field }) => (
                                    <FormItem><FormLabel>생년월일</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name={`childrenInfo.${index}.gender`} render={({ field }) => (
                                    <FormItem><FormLabel>성별</FormLabel>
                                        <FormControl>
                                          <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                              <FormControl><RadioGroupItem value="male" /></FormControl>
                                              <FormLabel className="font-normal">남자</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                              <FormControl><RadioGroupItem value="female" /></FormControl>
                                              <FormLabel className="font-normal">여자</FormLabel>
                                            </FormItem>
                                          </RadioGroup>
                                        </FormControl>
                                    <FormMessage /></FormItem>
                                 )}/>
                                 <FormField control={form.control} name={`childrenInfo.${index}.guardianPhoneNumber`} render={({ field }) => (
                                    <FormItem><FormLabel>부모님 전화번호</FormLabel><FormControl><Input type="tel" {...field} placeholder="선택사항" /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4 text-destructive"/>
                            </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ firstName: '', lastName: '', dateOfBirth: '', gender: undefined, guardianPhoneNumber: '' })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> 자녀 추가
                    </Button>
                 </div>
              )}

              {registrationType && (
                <FormField
                  control={form.control}
                  name="clubId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>소속 클럽</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="등록할 클럽을 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clubs?.map((club) => (
                            <SelectItem key={club.id} value={club.id}>
                              {club.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        선수 또는 자녀가 소속될 클럽을 선택해주세요.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button type="submit" disabled={!registrationType || form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                저장 및 승인 요청
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
