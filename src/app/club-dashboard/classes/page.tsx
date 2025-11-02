'use client';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { GymClass } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit, Trash2, PlusCircle, Users, User, Baby } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getTargetCategoryLabel } from '@/lib/member-utils';
// FirebaseDebug removed - debugging integrated into ErrorManager
import { ROUTES } from '@/constants/routes';
const classFormSchema = z.object({
  name: z.string().min(1, '클래스 이름을 입력해주세요.'),
  dayOfWeek: z.enum(['월', '화', '수', '목', '금', '토', '일'], { message: '요일을 선택해주세요.'}),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'HH:MM 형식으로 시간을 입력해주세요.'),
  capacity: z.number().int().positive('정원은 0보다 커야 합니다.'),
  targetCategory: z.enum(['adult', 'child', 'all'], { message: '대상 회원을 선택해주세요.' }).optional(),
});
type ClassFormValues = z.infer<typeof classFormSchema>;
const daysOfWeek: Array<ClassFormValues['dayOfWeek']> = ['월', '화', '수', '목', '금', '토', '일'];
type DayOfWeek = (typeof daysOfWeek)[number]
type UIGymClass = GymClass & {
  dayOfWeek: DayOfWeek
  time: string
  capacity: number
  memberIds: string[]
}
export default function ClassesPage() {
  const { _user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<UIGymClass | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingClass, setDeletingClass] = useState<UIGymClass | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'adult' | 'child' | 'general'>('all');
  // 전역 에러 핸들러 추가
  useEffect(() => {
    const handleError = (_event: ErrorEvent) => {
    };
    const handleUnhandledRejection = (_event: PromiseRejectionEvent) => {
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: '',
      time: '14:00',
      dayOfWeek: '월',
      capacity: 10,
      targetCategory: 'all',
    },
  });
  // 컴포넌트 마운트 시 디버깅 정보
  useEffect(() => {
  }, []);
  // 사용자나 firestore 상태 변경 시 로깅
  useEffect(() => {
  }, [_user, firestore]);
  const classesQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.clubId) return null;
    return query(collection(firestore, 'classes'), where('clubId', '==', _user.clubId));
  }, [firestore, _user?.clubId]);
  const { data: classes, isLoading } = useCollection<UIGymClass>(classesQuery);
  // Filter and sort classes
  const filteredClasses = useMemo(() => {
    if (!classes) return [];
    let filtered: UIGymClass[] = classes;
    // Apply category filter
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'general') {
        filtered = filtered.filter(c => !c.targetCategory || c.targetCategory === 'all');
      } else {
        filtered = filtered.filter(c => c.targetCategory === categoryFilter);
      }
    }
    // Sort by day of week and time
    const dayOrder: Record<DayOfWeek, number> = { '월': 0, '화': 1, '수': 2, '목': 3, '금': 4, '토': 5, '일': 6 };
    return filtered.sort((a, b) => {
      const dayDiff = dayOrder[a.dayOfWeek] - dayOrder[b.dayOfWeek];
      if (dayDiff !== 0) return dayDiff;
      return a.time.localeCompare(b.time);
    });
  }, [classes, categoryFilter]);
  const handleOpenDialog = (gymClass: UIGymClass | null = null) => {
    setEditingClass(gymClass);
    // Reset form with proper values
    if (gymClass) {
      form.reset({
        name: gymClass.name,
        dayOfWeek: gymClass.dayOfWeek,
        time: gymClass.time,
        capacity: gymClass.capacity,
        targetCategory: gymClass.targetCategory || 'all',
      });
    } else {
      form.reset({
        name: '',
        dayOfWeek: '월',
        time: '14:00',
        capacity: 10,
        targetCategory: 'all',
      });
    }
    setIsDialogOpen(true);
  };
  const onSubmit = async (values: ClassFormValues) => {
    // 강제로 Firebase 재초기화 시도
    if (!firestore) {
      toast({ 
        variant: 'destructive', 
        title: 'Firebase 연결 오류', 
        description: 'Firebase 연결에 문제가 있습니다. 페이지를 새로고침 후 다시 시도해주세요.' 
      });
      return;
    }
    if (!_user) {
      toast({ 
        variant: 'destructive', 
        title: '로그인 필요', 
        description: '로그인이 필요합니다. 다시 로그인해주세요.' 
      });
      return;
    }
    if (!_user.clubId) {
      toast({ 
        variant: 'destructive', 
        title: '클럽 정보 없음', 
        description: '클럽 정보를 찾을 수 없습니다. 관리자에게 문의하세요.' 
      });
      return;
    }
    setIsSubmitting(true);
    // 추가 검증: Firestore 연결 테스트
    try {
      const testRef = doc(firestore, 'test', 'connection');
      // 실제로 읽기 시도하지 않고 reference만 생성해서 연결 확인
    } catch (error: unknown) {
      toast({ 
        variant: 'destructive', 
        title: 'Firebase 연결 실패', 
        description: 'Firebase 연결에 문제가 있습니다.' 
      });
      setIsSubmitting(false);
      return;
    }
    try {
      if (editingClass) {
        // Update existing class
        const classRef = doc(firestore, 'classes', editingClass.id);
        const updatedData: Partial<GymClass> = {
          name: values.name,
          dayOfWeek: values.dayOfWeek,
          time: values.time,
          capacity: values.capacity,
          targetCategory: values.targetCategory,
        } as any;
        await setDoc(classRef, updatedData as any, { merge: true });
        toast({ title: '클래스 수정 완료', description: `'${values.name}' 클래스가 수정되었습니다.` });
      } else {
        // Create new class
        const newClassRef = doc(collection(firestore, 'classes'));
        const classData: GymClass = {
            id: newClassRef.id,
            clubId: _user.clubId,
            name: values.name,
            dayOfWeek: values.dayOfWeek,
            time: values.time,
            capacity: values.capacity,
            targetCategory: values.targetCategory,
            memberIds: [],
        } as any;
        await setDoc(newClassRef, classData as any);
        toast({ title: '클래스 생성 완료', description: `'${values.name}' 클래스가 생성되었습니다.` });
      }
      setIsDialogOpen(false);
      form.reset();
      setEditingClass(null);
    } catch (error: unknown) {
      const e = error as { code?: string; message?: string } | undefined;
      let errorMessage = '저장 중 오류가 발생했습니다.';
      if (e?.code === 'permission-denied') {
        errorMessage = '권한이 없습니다. 관리자에게 문의하세요.';
      } else if (e?.code === 'unavailable') {
        errorMessage = 'Firebase 서비스에 연결할 수 없습니다. 네트워크를 확인해주세요.';
      } else if (e?.message) {
        errorMessage = `오류: ${e.message}`;
      }
      toast({ 
        variant: 'destructive', 
        title: '저장 실패', 
        description: errorMessage 
      });
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
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: '오류 발생', description: '삭제 중 오류가 발생했습니다.' });
    }
  };
  return (
    <main className="flex-1 p-6 space-y-6">
        {/* 디버깅용 테스트 버튼 */}
        <div className="bg-yellow-100 p-4 rounded-lg border border-yellow-300">
          <h3 className="font-bold text-yellow-800 mb-2">🔧 디버깅 테스트</h3>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                alert('테스트 버튼이 작동합니다!');
              }}
              variant="outline"
              size="sm"
            >
              기본 클릭 테스트
            </Button>
            <Button 
              onClick={() => {
              }}
              variant="outline"
              size="sm"
            >
              상태 확인
            </Button>
            <Button 
              onClick={() => {
                setIsDialogOpen(true);
              }}
              variant="outline"
              size="sm"
            >
              다이얼로그 열기
            </Button>
          </div>
        </div>
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
                <Users className="mr-2 h-4 w-4" />
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
                <Users className="mr-2 h-4 w-4" />
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
                            {gymClass.targetCategory === 'all' && <Users className="inline h-3 w-3 mr-1" />}
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
                          onClick={() => router.push(ROUTES.DYNAMIC.CLASS_DETAIL(gymClass.id))}
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
          onOpenChange={(open: boolean) => {
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
              <form 
                onSubmit={(e) => {
                  // React Hook Form의 handleSubmit 호출
                  form.handleSubmit((values) => {
                    onSubmit(values);
                  }, (errors) => {
                    toast({ 
                      variant: 'destructive', 
                      title: '입력 오류', 
                      description: '모든 필수 필드를 올바르게 입력해주세요.' 
                    });
                  })(e);
                }}
                className="space-y-4 py-4"
              >
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
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              field.onChange(v === '' ? undefined : parseInt(v) || 0);
                            }}
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
                              <Users className="inline h-4 w-4 mr-2" />
                              전체 (성인+주니어)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">취소</Button>
                  </DialogClose>
                  <Button 
                    type="button"
                    disabled={isSubmitting}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // 수동으로 폼 검증 및 제출
                      const isValid = await form.trigger();
                      if (isValid) {
                        const values = form.getValues();
                        await onSubmit(values as any);
                      } else {
                      }
                    }}
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
        <AlertDialog open={!!deletingClass} onOpenChange={(open: boolean) => { if (!open) setDeletingClass(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>클래스 삭제 확인</AlertDialogTitle>
              <AlertDialogDescription>
                &apos;{deletingClass?.name}&apos; 클래스를 삭제하시겠습니까?
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
