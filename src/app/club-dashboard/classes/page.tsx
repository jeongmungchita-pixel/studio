'use client';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { GymClass } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit, Trash2, PlusCircle, Users, User, Baby, Users as UsersIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getTargetCategoryLabel } from '@/lib/member-utils';


const classFormSchema = z.object({
  name: z.string().min(1, '클래스 이름을 입력해주세요.'),
  dayOfWeek: z.enum(['월', '화', '수', '목', '금', '토', '일'], { required_error: '요일을 선택해주세요.'}),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'HH:MM 형식으로 시간을 입력해주세요.'),
  capacity: z.number().int().positive('정원은 0보다 커야 합니다.'),
  targetCategory: z.enum(['adult', 'child', 'all']).optional(),
  ageMin: z.number().int().min(0).max(100).optional().nullable(),
  ageMax: z.number().int().min(0).max(100).optional().nullable(),
});

type ClassFormValues = z.infer<typeof classFormSchema>;
const daysOfWeek: Array<ClassFormValues['dayOfWeek']> = ['월', '화', '수', '목', '금', '토', '일'];

export default function ClassesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<GymClass | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingClass, setDeletingClass] = useState<GymClass | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'adult' | 'child' | 'general'>('all');

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: '',
      time: '14:00',
      dayOfWeek: '월',
      capacity: 10,
      targetCategory: 'all',
      ageMin: null,
      ageMax: null,
    },
  });

  const classesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(collection(firestore, 'classes'), where('clubId', '==', user.clubId));
  }, [firestore, user?.clubId]);
  const { data: classes, isLoading } = useCollection<GymClass>(classesQuery);

  // Filter and sort classes
  const filteredClasses = useMemo(() => {
    if (!classes) return [];
    
    let filtered = classes;
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'general') {
        filtered = filtered.filter(c => !c.targetCategory || c.targetCategory === 'all');
      } else {
        filtered = filtered.filter(c => c.targetCategory === categoryFilter);
      }
    }
    
    // Sort by day of week and time
    const dayOrder = {'월': 0, '화': 1, '수': 2, '목': 3, '금': 4, '토': 5, '일': 6};
    return filtered.sort((a, b) => {
      const dayDiff = dayOrder[a.dayOfWeek] - dayOrder[b.dayOfWeek];
      if (dayDiff !== 0) return dayDiff;
      return a.time.localeCompare(b.time);
    });
  }, [classes, categoryFilter]);

  const handleOpenDialog = (gymClass: GymClass | null = null) => {
    setEditingClass(gymClass);
    
    // Reset form with proper values
    if (gymClass) {
      form.reset({
        name: gymClass.name,
        dayOfWeek: gymClass.dayOfWeek,
        time: gymClass.time,
        capacity: gymClass.capacity,
        targetCategory: gymClass.targetCategory || 'all',
        ageMin: gymClass.ageRange?.min ?? null,
        ageMax: gymClass.ageRange?.max ?? null,
      });
    } else {
      form.reset({
        name: '',
        dayOfWeek: '월',
        time: '14:00',
        capacity: 10,
        targetCategory: 'all',
        ageMin: null,
        ageMax: null,
      });
    }
    
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: ClassFormValues) => {
    console.log('=== 클래스 생성 시작 ===');
    console.log('입력값:', values);
    console.log('firestore:', !!firestore);
    console.log('user.clubId:', user?.clubId);
    
    if (!firestore || !user?.clubId) {
      console.error('Firebase 또는 클럽 정보 없음');
      toast({ variant: 'destructive', title: '오류', description: 'Firebase 또는 클럽 정보가 없습니다.' });
      return;
    }
    
    setIsSubmitting(true);

    try {
      if (editingClass) {
        // Update existing class
        console.log('클래스 수정 모드');
        const classRef = doc(firestore, 'classes', editingClass.id);
        const updatedData: Partial<GymClass> = {
          name: values.name,
          dayOfWeek: values.dayOfWeek,
          time: values.time,
          capacity: values.capacity,
          targetCategory: values.targetCategory,
          ageRange: (values.ageMin !== null || values.ageMax !== null) ? {
            min: values.ageMin ?? undefined,
            max: values.ageMax ?? undefined,
          } : undefined,
        };
        await setDoc(classRef, updatedData, { merge: true });
        console.log('클래스 수정 완료');
        toast({ title: '클래스 수정 완료', description: `'${values.name}' 클래스 정보가 업데이트되었습니다.` });
      } else {
        // Create new class
        console.log('새 클래스 생성 모드');
        const newClassRef = doc(collection(firestore, 'classes'));
        const classData: GymClass = {
            id: newClassRef.id,
            clubId: user.clubId,
            name: values.name,
            dayOfWeek: values.dayOfWeek,
            time: values.time,
            capacity: values.capacity,
            targetCategory: values.targetCategory,
            ageRange: (values.ageMin !== null || values.ageMax !== null) ? {
              min: values.ageMin ?? undefined,
              max: values.ageMax ?? undefined,
            } : undefined,
            memberIds: [],
        };
        console.log('생성할 클래스 데이터:', classData);
        await setDoc(newClassRef, classData);
        console.log('클래스 생성 완료');
        toast({ title: '클래스 생성 완료', description: `'${values.name}' 클래스가 생성되었습니다.` });
      }
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error('=== 클래스 저장 에러 ===');
      console.error('에러 상세:', error);
      toast({ variant: 'destructive', title: '오류 발생', description: '저장 중 오류가 발생했습니다.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async () => {
    if (!firestore || !deletingClass) return;
    try {
      await deleteDoc(doc(firestore, 'classes', deletingClass.id));
      toast({ title: '삭제 완료', description: `'${deletingClass.name}' 클래스가 삭제되었습니다.` });
      setDeletingClass(null);
    } catch (error) {
      console.error('Error deleting class:', error);
      toast({ variant: 'destructive', title: '오류 발생', description: '삭제 중 오류가 발생했습니다.' });
    }
  };


  return (
    <main className="flex-1 p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <CardTitle>클래스 관리</CardTitle>
                <CardDescription>클럽에서 운영할 클래스(수업)를 생성하고 관리하세요.</CardDescription>
              </div>
              <Button 
                onClick={() => handleOpenDialog(null)}
                className="shrink-0 relative z-10"
                type="button"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                새 클래스 생성
              </Button>
            </div>
            
            {/* Filter Tabs */}
            <div className="flex gap-2 mt-4">
              <Button
                variant={categoryFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter('all')}
              >
                <UsersIcon className="mr-2 h-4 w-4" />
                전체 ({classes?.length || 0})
              </Button>
              <Button
                variant={categoryFilter === 'adult' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter('adult')}
              >
                <User className="mr-2 h-4 w-4" />
                성인 ({classes?.filter(c => c.targetCategory === 'adult').length || 0})
              </Button>
              <Button
                variant={categoryFilter === 'child' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter('child')}
              >
                <Baby className="mr-2 h-4 w-4" />
                주니어 ({classes?.filter(c => c.targetCategory === 'child').length || 0})
              </Button>
              <Button
                variant={categoryFilter === 'general' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter('general')}
              >
                <UsersIcon className="mr-2 h-4 w-4" />
                일반 ({classes?.filter(c => !c.targetCategory || c.targetCategory === 'all').length || 0})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>클래스명</TableHead>
                    <TableHead>대상</TableHead>
                    <TableHead>요일</TableHead>
                    <TableHead>시간</TableHead>
                    <TableHead>정원</TableHead>
                    <TableHead className="text-right">기능</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClasses.map((gymClass) => (
                    <TableRow key={gymClass.id}>
                      <TableCell className="font-medium">{gymClass.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={
                            gymClass.targetCategory === 'adult' ? 'default' :
                            gymClass.targetCategory === 'child' ? 'secondary' :
                            'outline'
                          }>
                            {gymClass.targetCategory === 'adult' && <User className="inline h-3 w-3 mr-1" />}
                            {gymClass.targetCategory === 'child' && <Baby className="inline h-3 w-3 mr-1" />}
                            {gymClass.targetCategory === 'all' && <UsersIcon className="inline h-3 w-3 mr-1" />}
                            {getTargetCategoryLabel(gymClass.targetCategory)}
                          </Badge>
                          {gymClass.ageRange && (gymClass.ageRange.min || gymClass.ageRange.max) && (
                            <span className="text-xs text-muted-foreground">
                              {gymClass.ageRange.min && `${gymClass.ageRange.min}세`}
                              {gymClass.ageRange.min && gymClass.ageRange.max && ' ~ '}
                              {gymClass.ageRange.max && `${gymClass.ageRange.max}세`}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{gymClass.dayOfWeek}</TableCell>
                      <TableCell>{gymClass.time}</TableCell>
                      <TableCell>{gymClass.memberIds.length} / {gymClass.capacity}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => router.push(`/club-dashboard/classes/${gymClass.id}`)}
                          title="회원 관리"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleOpenDialog(gymClass)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => setDeletingClass(gymClass)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredClasses.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center h-24">
                        {categoryFilter === 'all' ? '생성된 클래스가 없습니다.' : '해당 분류의 클래스가 없습니다.'}
                      </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog 
          open={isDialogOpen} 
          onOpenChange={(open) => {
            setIsDialogOpen(open);
              if (!open) {
              // Reset form when dialog closes
              setEditingClass(null);
              form.reset({
                name: '',
                dayOfWeek: '월',
                time: '14:00',
                capacity: 10,
                targetCategory: 'all',
                ageMin: null,
                ageMax: null,
              });
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingClass ? '클래스 수정' : '새 클래스 생성'}</DialogTitle>
              <DialogDescription>
                클래스의 세부 정보를 입력하세요.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((values) => {
                console.log('폼 제출 이벤트 발생');
                console.log('현재 폼 값:', values);
                console.log('폼 에러:', form.formState.errors);
                onSubmit(values);
              }, (errors) => {
                console.log('폼 검증 실패:', errors);
              })} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>클래스 이름</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 초급반" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="dayOfWeek"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>요일</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            {daysOfWeek.map(day => (
                              <option key={day} value={day}>{day}요일</option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     <FormField
                        control={form.control}
                        name="time"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>시작 시간</FormLabel>
                            <FormControl>
                            <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>정원</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="예: 10"
                            value={field.value}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="targetCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>대상 회원</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="대상 선택" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="adult">
                              <User className="inline h-4 w-4 mr-2" />
                              성인 전용
                            </SelectItem>
                            <SelectItem value="child">
                              <Baby className="inline h-4 w-4 mr-2" />
                              주니어 전용
                            </SelectItem>
                            <SelectItem value="all">
                              <UsersIcon className="inline h-4 w-4 mr-2" />
                              전체 (성인+주니어)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ageMin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>최소 나이 (선택)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="예: 7"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ageMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>최대 나이 (선택)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="예: 13"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">취소</Button>
                  </DialogClose>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    onClick={() => console.log('저장 버튼 클릭됨')}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    저장
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingClass} onOpenChange={(open) => !open && setDeletingClass(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>클래스 삭제 확인</AlertDialogTitle>
              <AlertDialogDescription>
                '{deletingClass?.name}' 클래스를 삭제하시겠습니까?
                <br />
                <span className="text-destructive font-medium">이 작업은 되돌릴 수 없습니다.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </main>
  );
}
