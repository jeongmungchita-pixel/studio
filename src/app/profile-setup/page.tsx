'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCollection, useFirebase, useUser, uploadImage } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Club, Member } from '@/types';
import { useMemoFirebase } from '@/firebase/provider';
import { ChangeEvent, useRef } from 'react';
import Image from 'next/image';

const personSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요.'),
  dateOfBirth: z.string().min(1, '생년월일을 입력하세요.'),
  gender: z.enum(['male', 'female'], { required_error: '성별을 선택하세요.' }),
  photo: z.instanceof(File).optional(),
  photoPreview: z.string().optional(),
});

const formSchema = z.object({
  adultsInfo: z.array(personSchema).min(1, '최소 한 명의 성인 정보를 등록해야 합니다.'),
  childrenInfo: z.array(personSchema).optional(),
  phoneNumber: z.string().min(1, '전화번호를 입력하세요.'),
  clubId: z.string().min(1, '클럽을 선택하세요.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function ProfileSetupPage() {
  const { firestore, storage } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const adultFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const childFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, fieldName: `adultsInfo.${number}.photo` | `childrenInfo.${number}.photo`, previewFieldName: `adultsInfo.${number}.photoPreview` | `childrenInfo.${number}.photoPreview`) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      form.setValue(fieldName, file);
      const previewUrl = URL.createObjectURL(file);
      form.setValue(previewFieldName, previewUrl);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !user || !storage) return;

    try {
      const batch = writeBatch(firestore);
      const adultUids: string[] = [];

      // Process adults
      for (let i = 0; i < values.adultsInfo.length; i++) {
        const adult = values.adultsInfo[i];
        const memberRef = doc(collection(firestore, 'members'));
        const guardianId = i === 0 ? user.uid : doc(collection(firestore, 'users')).id;
        adultUids.push(guardianId);

        let photoURL: string | undefined = undefined;
        if (adult.photo) {
          photoURL = await uploadImage(storage, `profile_pictures/${memberRef.id}`, adult.photo);
        }
        
        const memberPayload: Omit<Member, 'guardianIds'> & { guardianIds: string[] } = {
          id: memberRef.id,
          name: adult.name,
          dateOfBirth: new Date(adult.dateOfBirth).toISOString(),
          gender: adult.gender,
          ...(i === 0 && { email: user.email }), // Only set email for the primary user
          ...(i === 0 && { phoneNumber: values.phoneNumber }),
          clubId: values.clubId,
          status: 'pending',
          guardianIds: [guardianId],
          ...(photoURL && { photoURL }),
        };
        batch.set(memberRef, memberPayload);
      }

      // Process children
      if (values.childrenInfo) {
        for (let i = 0; i < values.childrenInfo.length; i++) {
          const child = values.childrenInfo[i];
          const memberRef = doc(collection(firestore, 'members'));
          
          let photoURL: string | undefined = undefined;
          if (child.photo) {
            photoURL = await uploadImage(storage, `profile_pictures/${memberRef.id}`, child.photo);
          }

          const memberPayload: Omit<Member, 'email' | 'phoneNumber'> & { email?: string; phoneNumber?: string; guardianIds: string[] } = {
            id: memberRef.id,
            name: child.name,
            dateOfBirth: new Date(child.dateOfBirth).toISOString(),
            gender: child.gender,
            clubId: values.clubId,
            status: 'pending',
            guardianIds: adultUids,
            ...(photoURL && { photoURL }),
          };
          batch.set(memberRef, memberPayload);
        }
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                           <FormField control={form.control} name={`adultsInfo.${index}.name`} render={({ field }) => (
                              <FormItem><FormLabel>이름</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                           )}/>
                           <div className="flex items-center gap-4 pt-6">
                            {form.watch(`adultsInfo.${index}.photoPreview`) ? (
                                <Image src={form.watch(`adultsInfo.${index}.photoPreview`)!} alt="프로필 사진 미리보기" width={40} height={40} className="rounded-full" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                  <Upload className="w-5 h-5"/>
                                </div>
                            )}
                            <Button type="button" variant="outline" onClick={() => adultFileInputRefs.current[index]?.click()}>
                                사진 업로드
                            </Button>
                            <FormField control={form.control} name={`adultsInfo.${index}.photo`} render={({ field }) => (
                                <FormItem className="hidden">
                                <FormControl>
                                    <Input
                                    type="file"
                                    accept="image/*"
                                    ref={(el) => (adultFileInputRefs.current[index] = el)}
                                    onChange={(e) => handleFileChange(e, `adultsInfo.${index}.photo`, `adultsInfo.${index}.photoPreview`)}
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                           </div>
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
                        </div>
                        {adultFields.length > 0 && (
                          <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removeAdult(index)}>
                              <Trash2 className="h-4 w-4 text-destructive"/>
                          </Button>
                        )}
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendAdult({ name: '', dateOfBirth: '', gender: 'male' })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> 성인 추가
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">자녀 정보</h3>
                {childFields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-md relative space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name={`childrenInfo.${index}.name`} render={({ field }) => (
                                <FormItem><FormLabel>이름</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <div className="flex items-center gap-4 pt-6">
                            {form.watch(`childrenInfo.${index}.photoPreview`) ? (
                                <Image src={form.watch(`childrenInfo.${index}.photoPreview`)!} alt="프로필 사진 미리보기" width={40} height={40} className="rounded-full" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                  <Upload className="w-5 h-5"/>
                                </div>
                            )}
                            <Button type="button" variant="outline" onClick={() => childFileInputRefs.current[index]?.click()}>
                                사진 업로드
                            </Button>
                            <FormField control={form.control} name={`childrenInfo.${index}.photo`} render={({ field }) => (
                                <FormItem className="hidden">
                                <FormControl>
                                    <Input
                                    type="file"
                                    accept="image/*"
                                    ref={(el) => (childFileInputRefs.current[index] = el)}
                                    onChange={(e) => handleFileChange(e, `childrenInfo.${index}.photo`, `childrenInfo.${index}.photoPreview`)}
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                           </div>
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
                <Button type="button" variant="outline" size="sm" onClick={() => appendChild({ name: '', dateOfBirth: '', gender: 'male' })}>
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
