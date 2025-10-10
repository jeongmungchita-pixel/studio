'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCollection, useFirebase, useUser } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Club, Member } from '@/types';
import { useMemoFirebase } from '@/firebase/provider';

const adultSchema = z.object({
  firstName: z.string().min(1, '성을 입력하세요.'),
  lastName: z.string().min(1, '이름을 입력하세요.'),
  dateOfBirth: z.string().min(1, '생년월일을 입력하세요.'),
  gender: z.enum(['male', 'female'], { required_error: '성별을 선택하세요.' }),
  email: z.string().email('올바른 이메일 주소를 입력하세요.'),
});

const childSchema = z.object({
  firstName: z.string().min(1, '성을 입력하세요.'),
  lastName: z.string().min(1, '이름을 입력하세요.'),
  dateOfBirth: z.string().min(1, '생년월일을 입력하세요.'),
  gender: z.enum(['male', 'female'], { required_error: '성별을 선택하세요.' }),
});

const formSchema = z.object({
  adultsInfo: z.array(adultSchema).min(1, '최소 한 명의 성인 정보를 등록해야 합니다.'),
  childrenInfo: z.array(childSchema).optional(),
  phoneNumber: z.string().min(1, '전화번호를 입력하세요.'),
  clubId: z.string().min(1, '클럽을 선택하세요.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function ProfileSetupPage() {
  const { firestore } = useFirebase();
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
      adultsInfo: [],
      childrenInfo: [],
      phoneNumber: '',
      clubId: '',
    },
  });

  const { fields: adultFields, append: appendAdult, remove: removeAdult } = useFieldArray({
    control: form.control,
    name: 'adultsInfo',
  });

  const { fields: childFields, append: appendChild, remove: removeChild } = useFieldArray({
    control: form.control,
    name: 'childrenInfo',
  });

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !user) return;

    try {
      const batch = writeBatch(firestore);
      
      const adultUids: string[] = [];

      // Register adults
      values.adultsInfo.forEach((adult, index) => {
        const memberRef = doc(collection(firestore, 'members'));
        // The first adult registered gets linked to the currently logged in user account.
        const guardianId = index === 0 ? user.uid : doc(collection(firestore, 'users')).id;
        adultUids.push(guardianId);
        
        const memberPayload: Omit<Member, 'guardianIds'> & { guardianIds: string[] } = {
            id: memberRef.id,
            ...adult,
            ...(index === 0 && { phoneNumber: values.phoneNumber }), // Add phone number only to the first adult
            dateOfBirth: new Date(adult.dateOfBirth).toISOString(),
            clubId: values.clubId,
            status: 'pending',
            guardianIds: [guardianId],
        };
        batch.set(memberRef, memberPayload);
      });

      // Register children
      values.childrenInfo?.forEach(child => {
          const memberRef = doc(collection(firestore, 'members'));
          const memberPayload: Omit<Member, 'email' | 'phoneNumber'> & { email?: string; phoneNumber?: string; guardianIds: string[] } = {
              id: memberRef.id,
              ...child,
              dateOfBirth: new Date(child.dateOfBirth).toISOString(),
              clubId: values.clubId,
              status: 'pending',
              guardianIds: adultUids, // Link all registered adults as guardians
          };
          batch.set(memberRef, memberPayload);
      });
      
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
            선수 또는 학부모 정보를 입력하여 KGF 넥서스 활동을 시작하세요. 한 번에 여러 명의 성인과 자녀를 등록할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="space-y-4">
                <h3 className="font-medium">성인 정보</h3>
                {adultFields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-md relative space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <FormField control={form.control} name={`adultsInfo.${index}.firstName`} render={({ field }) => (
                              <FormItem><FormLabel>성</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                           )}/>
                           <FormField control={form.control} name={`adultsInfo.${index}.lastName`} render={({ field }) => (
                              <FormItem><FormLabel>이름</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                           )}/>
                           <FormField control={form.control} name={`adultsInfo.${index}.dateOfBirth`} render={({ field }) => (
                              <FormItem><FormLabel>생년월일</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                           )}/>
                           <FormField control={form.control} name={`adultsInfo.${index}.gender`} render={({ field }) => (
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
                            <FormField control={form.control} name={`adultsInfo.${index}.email`} render={({ field }) => (
                                <FormItem><FormLabel>이메일</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        {adultFields.length > 0 && (
                          <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removeAdult(index)}>
                              <Trash2 className="h-4 w-4 text-destructive"/>
                          </Button>
                        )}
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendAdult({ firstName: '', lastName: '', dateOfBirth: '', gender: 'male', email: '' })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> 성인 추가
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">자녀 정보</h3>
                {childFields.map((field, index) => (
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
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removeChild(index)}>
                            <Trash2 className="h-4 w-4 text-destructive"/>
                        </Button>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendChild({ firstName: '', lastName: '', dateOfBirth: '', gender: 'male' })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> 자녀 추가
                </Button>
              </div>
              
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>대표 전화번호</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} placeholder="연락 가능한 대표 전화번호를 입력하세요" />
                    </FormControl>
                    <FormDescription>
                      계정의 대표 연락처로 사용됩니다.
                    </FormDescription>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={areClubsLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="등록할 클럽을 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {areClubsLoading ? (
                            <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-5 w-5 animate-spin"/>
                            </div>
                        ) : clubs && clubs.length > 0 ? (
                          clubs.map((club) => (
                            <SelectItem key={club.id} value={club.id}>
                              {club.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            불러올 클럽이 없습니다.
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      등록하는 모든 가족 구성원이 소속될 클럽을 선택해주세요.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={form.formState.isSubmitting}>
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
