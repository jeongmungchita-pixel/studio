'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, writeBatch, deleteDoc, setDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { PassTemplate } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';


const templateFormSchema = z.object({
  name: z.string().min(1, '이용권 이름을 입력해주세요.'),
  description: z.string().optional(),
  passType: z.enum(['period', 'session', 'unlimited'], {
    required_error: '이용권 타입을 선택해주세요.',
  }),
  price: z.preprocess(
    (a) => (a === '' ? undefined : parseInt(z.string().parse(a), 10)),
    z.number().positive('가격은 0보다 커야 합니다.').optional()
  ),
  durationDays: z.preprocess(
    (a) => (a === '' ? undefined : parseInt(z.string().parse(a), 10)),
    z.number().positive('기간은 0보다 커야 합니다.').optional()
  ),
  totalSessions: z.preprocess(
    (a) => (a === '' ? undefined : parseInt(z.string().parse(a), 10)),
    z.number().positive('총 횟수는 0보다 커야 합니다.').optional()
  ),
  attendableSessions: z.preprocess(
    (a) => (a === '' ? undefined : parseInt(z.string().parse(a), 10)),
    z.number().positive('출석 횟수는 0보다 커야 합니다.').optional()
  ),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

export default function PassTemplatesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PassTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      description: '',
      passType: 'period' as any,
      price: '' as any,
      durationDays: '' as any,
      totalSessions: '' as any,
      attendableSessions: '' as any,
    },
  });

  const passType = form.watch('passType');

  const templatesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(collection(firestore, 'pass_templates'), where('clubId', '==', user.clubId));
  }, [firestore, user?.clubId]);
  const { data: templates, isLoading } = useCollection<PassTemplate>(templatesQuery);

  useEffect(() => {
    if (editingTemplate) {
      form.reset({
        name: editingTemplate.name,
        description: editingTemplate.description || '',
        price: editingTemplate.price,
        durationDays: editingTemplate.durationDays,
        totalSessions: editingTemplate.totalSessions,
        attendableSessions: editingTemplate.attendableSessions,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        price: undefined,
        durationDays: undefined,
        totalSessions: undefined,
        attendableSessions: undefined,
      });
    }
  }, [editingTemplate, form]);

  const handleOpenDialog = (template: PassTemplate | null = null) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: TemplateFormValues) => {
    console.log('Form submitted with values:', values);
    if (!firestore || !user?.clubId) {
      console.error('Missing firestore or clubId');
      return;
    }
    setIsSubmitting(true);

    const templateData: Omit<PassTemplate, 'id'> = {
      clubId: user.clubId,
      name: values.name,
      description: values.description,
      price: values.price,
      durationDays: values.durationDays,
      totalSessions: values.totalSessions,
      attendableSessions: values.attendableSessions,
    };

    console.log('Saving template data:', templateData);

    try {
      if (editingTemplate) {
        // Update existing template
        const templateRef = doc(firestore, 'pass_templates', editingTemplate.id);
        await setDoc(templateRef, templateData, { merge: true });
        toast({ title: '템플릿 수정 완료', description: `'${values.name}' 이용권 정보가 업데이트되었습니다.` });
      } else {
        // Create new template
        const newTemplateRef = doc(collection(firestore, 'pass_templates'));
        await setDoc(newTemplateRef, { ...templateData, id: newTemplateRef.id });
        toast({ title: '템플릿 생성 완료', description: `'${values.name}' 이용권이 생성되었습니다.` });
      }
      setIsDialogOpen(false);
      form.reset({
        name: '',
        description: '',
        passType: 'period' as any,
        price: '' as any,
        durationDays: '' as any,
        totalSessions: '' as any,
        attendableSessions: '' as any,
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({ variant: 'destructive', title: '오류 발생', description: '저장 중 오류가 발생했습니다.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async (templateId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'pass_templates', templateId));
      toast({ title: '삭제 완료', description: '이용권 템플릿이 삭제되었습니다.' });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({ variant: 'destructive', title: '오류 발생', description: '삭제 중 오류가 발생했습니다.' });
    }
  };


  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">이용권 종류 관리</h1>
          <p className="text-slate-600 mt-1">클럽에서 판매할 이용권 종류를 생성하고 관리하세요</p>
        </div>
        <Button onClick={() => handleOpenDialog(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          새 이용권 종류
        </Button>
      </div>
        <Card>
          <CardHeader>
            <CardTitle>이용권 종류 관리</CardTitle>
            <CardDescription>클럽에서 사용할 다양한 종류의 이용권을 생성하고 관리하세요.</CardDescription>
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
                    <TableHead>이름</TableHead>
                    <TableHead>기간</TableHead>
                    <TableHead>횟수 (출석/총)</TableHead>
                    <TableHead>가격</TableHead>
                    <TableHead className="text-right">기능</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates?.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{template.durationDays ? `${template.durationDays}일` : '무제한'}</TableCell>
                      <TableCell>
                        {template.attendableSessions !== undefined || template.totalSessions !== undefined
                          ? `${template.attendableSessions ?? '-'}/${template.totalSessions ?? '-'}`
                          : '무제한'}
                      </TableCell>
                       <TableCell>{template.price ? `${template.price.toLocaleString()}원` : '-'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleOpenDialog(template)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDelete(template.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!templates || templates.length === 0) && (
                      <TableRow><TableCell colSpan={5} className="text-center h-24">생성된 이용권 종류가 없습니다.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? '이용권 종류 수정' : '새 이용권 종류 생성'}</DialogTitle>
              <DialogDescription>
                이용권의 세부 정보를 입력하세요. 비워둔 항목은 '무제한' 또는 '설정 안함'으로 처리됩니다.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이용권 이름</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 주 3회 1개월권" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="passType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이용권 타입</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="타입 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="period">기간제 (무제한 출석)</SelectItem>
                          <SelectItem value="session">횟수제 (기간 무제한)</SelectItem>
                          <SelectItem value="unlimited">기간+횟수제</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  {(passType === 'period' || passType === 'unlimited') && (
                    <FormField
                      control={form.control}
                      name="durationDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>기간 (일)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="예: 30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>가격 (원)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="예: 150000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {(passType === 'session' || passType === 'unlimited') && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="totalSessions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>총 허용 횟수</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="예: 12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                    name="attendableSessions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>필수 출석 횟수</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="예: 4" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>설명</FormLabel>
                      <FormControl>
                        <Textarea placeholder="이용권에 대한 간단한 설명을 입력하세요. (선택사항)" {...field} />
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
  );
}
