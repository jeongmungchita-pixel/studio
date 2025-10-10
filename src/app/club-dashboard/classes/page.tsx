'use client';
import { useState, useEffect } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit, Trash2 } from 'lucide-react';
import { AppHeader } from '@/components/layout/header';


const classFormSchema = z.object({
  name: z.string().min(1, '클래스 이름을 입력해주세요.'),
  dayOfWeek: z.enum(['월', '화', '수', '목', '금', '토', '일'], { required_error: '요일을 선택해주세요.'}),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'HH:MM 형식으로 시간을 입력해주세요.'),
  capacity: z.preprocess(
    (a) => (a === '' ? undefined : parseInt(z.string().parse(a), 10)),
    z.number().positive('정원은 0보다 커야 합니다.')
  ),
});

type ClassFormValues = z.infer<typeof classFormSchema>;
const daysOfWeek: Array<ClassFormValues['dayOfWeek']> = ['월', '화', '수', '목', '금', '토', '일'];

export default function ClassesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<GymClass | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: '',
      time: '14:00',
      dayOfWeek: '월',
    },
  });

  const classesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(collection(firestore, 'classes'), where('clubId', '==', user.clubId));
  }, [firestore, user?.clubId]);
  const { data: classes, isLoading } = useCollection<GymClass>(classesQuery);

  useEffect(() => {
    if (editingClass) {
      form.reset({
        name: editingClass.name,
        dayOfWeek: editingClass.dayOfWeek,
        time: editingClass.time,
        capacity: editingClass.capacity,
      });
    } else {
      form.reset({
        name: '',
        dayOfWeek: '월',
        time: '14:00',
        capacity: 10,
      });
    }
  }, [editingClass, form]);

  const handleOpenDialog = (gymClass: GymClass | null = null) => {
    setEditingClass(gymClass);
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: ClassFormValues) => {
    if (!firestore || !user?.clubId) return;
    setIsSubmitting(true);

    try {
      if (editingClass) {
        // Update existing class
        const classRef = doc(firestore, 'classes', editingClass.id);
        const updatedData: Partial<GymClass> = { ...values };
        await setDoc(classRef, updatedData, { merge: true });
        toast({ title: '클래스 수정 완료', description: `'${values.name}' 클래스 정보가 업데이트되었습니다.` });
      } else {
        // Create new class
        const newClassRef = doc(collection(firestore, 'classes'));
        const classData: GymClass = {
            ...values,
            id: newClassRef.id,
            clubId: user.clubId,
            memberIds: [],
        };
        await setDoc(newClassRef, classData);
        toast({ title: '클래스 생성 완료', description: `'${values.name}' 클래스가 생성되었습니다.` });
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving class:', error);
      toast({ variant: 'destructive', title: '오류 발생', description: '저장 중 오류가 발생했습니다.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async (classId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'classes', classId));
      toast({ title: '삭제 완료', description: '클래스가 삭제되었습니다.' });
    } catch (error) {
      console.error('Error deleting class:', error);
      toast({ variant: 'destructive', title: '오류 발생', description: '삭제 중 오류가 발생했습니다.' });
    }
  };


  return (
    <>
      <AppHeader
        showAddButton={true}
        addButtonLabel="새 클래스 생성"
        onAddClick={() => handleOpenDialog(null)}
      />
      <main className="flex-1 p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>클래스 관리</CardTitle>
            <CardDescription>클럽에서 운영할 클래스(수업)를 생성하고 관리하세요.</CardDescription>
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
                    <TableHead>요일</TableHead>
                    <TableHead>시간</TableHead>
                    <TableHead>정원</TableHead>
                    <TableHead className="text-right">기능</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes?.map((gymClass) => (
                    <TableRow key={gymClass.id}>
                      <TableCell className="font-medium">{gymClass.name}</TableCell>
                      <TableCell>{gymClass.dayOfWeek}</TableCell>
                      <TableCell>{gymClass.time}</TableCell>
                      <TableCell>{gymClass.memberIds.length} / {gymClass.capacity}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleOpenDialog(gymClass)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDelete(gymClass.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!classes || classes.length === 0) && (
                      <TableRow><TableCell colSpan={5} className="text-center h-24">생성된 클래스가 없습니다.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingClass ? '클래스 수정' : '새 클래스 생성'}</DialogTitle>
              <DialogDescription>
                클래스의 세부 정보를 입력하세요.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="요일 선택" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {daysOfWeek.map(day => (
                                    <SelectItem key={day} value={day}>{day}요일</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                          <Input type="number" placeholder="예: 10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">취소</Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    저장
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
