'use client';
import { useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, setDoc, deleteDoc, updateDoc, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { ClubEvent, EventRegistration } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, Trash2, Users, Calendar, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
const eventFormSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요'),
  description: z.string().min(1, '설명을 입력하세요'),
  type: z.enum(['competition', 'workshop', 'performance', 'social', 'training']),
  status: z.enum(['draft', 'published', 'registration-open', 'registration-closed', 'in-progress', 'completed', 'cancelled']).default('published'),
  registrationStart: z.string(),
  registrationEnd: z.string(),
  registrationFee: z.number().optional(),
  maxParticipants: z.number().optional(),
});
type EventFormValues = z.infer<typeof eventFormSchema>;
type UIEventRegistration = {
  id: string
  eventId: string
  memberId: string
  memberName: string
  selectedOptions: Record<string, string>
  quantity: number
  totalPrice: number
  paymentStatus: 'pending' | 'paid' | 'cancelled'
  createdAt: string
}
// Display uses ClubEvent directly
const eventTypeLabels: Record<ClubEvent['type'], string> = {
  competition: '대회',
  workshop: '워크숍',
  performance: '공연',
  social: '소셜',
  training: '훈련',
};
const statusLabels: Record<ClubEvent['status'], string> = {
  draft: '초안',
  published: '게시됨',
  'registration-open': '신청중',
  'registration-closed': '마감',
  'in-progress': '진행중',
  completed: '완료',
  cancelled: '취소',
};
export default function ClubEventsPage() {
  const { _user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ClubEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'training',
      status: 'published',
      registrationStart: new Date().toISOString().split('T')[0],
      registrationEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  });
  // Fetch events
  const eventsQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.clubId) return null;
    return query(
      collection(firestore, 'events'),
      where('clubId', '==', _user.clubId),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, _user?.clubId]);
  const { data: events, isLoading: areEventsLoading } = useCollection<ClubEvent>(eventsQuery);
  // Fetch registrations for selected event
  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedEvent) return null;
    return query(
      collection(firestore, 'event_registrations'),
      where('eventId', '==', selectedEvent.id)
    );
  }, [firestore, selectedEvent?.id]);
  const { data: registrations } = useCollection<EventRegistration>(registrationsQuery);
  const onSubmit = async (values: EventFormValues) => {
    if (!firestore || !_user?.clubId) return;
    try {
      if (editingEvent) {
        // Update
        await updateDoc(doc(firestore, 'events', editingEvent.id), {
          title: values.title,
          description: values.description,
          type: values.type,
          status: values.status,
          registrationStart: values.registrationStart,
          registrationEnd: values.registrationEnd,
          registrationFee: values.registrationFee,
          maxParticipants: values.maxParticipants,
          updatedAt: new Date().toISOString(),
        } as any);
        toast({ title: '이벤트 수정 완료' });
      } else {
        // Create (temporary minimal payload; full ClubEvent creation flow to be aligned later)
        const eventRef = doc(collection(firestore, 'events'));
        const eventData = {
          id: eventRef.id,
          title: values.title,
          description: values.description,
          clubId: _user.clubId,
          currentParticipants: 0,
          registrationStart: values.registrationStart,
          registrationEnd: values.registrationEnd,
          status: values.status,
          type: values.type,
          registrationFee: values.registrationFee,
          maxParticipants: values.maxParticipants,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any;
        await setDoc(eventRef, eventData);
        toast({ title: '이벤트 생성 완료' });
      }
      setIsDialogOpen(false);
      form.reset();
      setEditingEvent(null);
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: '저장 실패' });
    }
  };
  const handleEdit = (_event: ClubEvent) => {
    setEditingEvent(_event);
    form.reset({
      title: _event.title,
      description: _event.description,
      type: _event.type,
      status: _event.status,
      registrationStart: _event.registrationStart.split('T')[0],
      registrationEnd: _event.registrationEnd.split('T')[0],
      registrationFee: _event.registrationFee,
      maxParticipants: _event.maxParticipants,
    });
    setIsDialogOpen(true);
  };
  const handleDelete = async (eventId: string) => {
    if (!firestore || !confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(firestore, 'events', eventId));
      toast({ title: '이벤트 삭제 완료' });
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: '삭제 실패' });
    }
  };
  if (areEventsLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">이벤트 관리</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            공동구매, 특강, 대회 등 다양한 이벤트를 생성하고 관리하세요
          </p>
        </div>
        <Button onClick={() => {
          setEditingEvent(null);
          form.reset();
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          새 이벤트 생성
        </Button>
      </div>
      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events?.map((_event) => (
          <Card key={_event.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>{eventTypeLabels[_event.type as keyof typeof eventTypeLabels]}</Badge>
                    <Badge variant={
                      _event.status === 'registration-open' ? 'default' :
                      _event.status === 'registration-closed' ? 'destructive' :
                      _event.status === 'in-progress' ? 'secondary' :
                      _event.status === 'completed' ? 'secondary' :
                      _event.status === 'cancelled' ? 'destructive' : 'outline'
                    }>{statusLabels[_event.status as keyof typeof statusLabels]}</Badge>
                  </div>
                  <CardTitle className="text-lg">{_event.title}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-2">
                    {_event.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  가격
                </span>
                <span className="font-semibold">
                  {(_event.registrationFee ?? 0).toLocaleString()}원
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  신청자
                </span>
                <span className="font-semibold">
                  {_event.currentParticipants}
                  {_event.maxParticipants && `/${_event.maxParticipants}`}명
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  신청 마감
                </span>
                <span className="font-semibold">
                  {format(new Date(_event.registrationEnd), 'MM/dd', { locale: ko })}
                </span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedEvent(_event)}
                >
                  <Users className="h-4 w-4 mr-1" />
                  신청자 보기
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(_event)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(_event.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {(!events || events.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground mb-4">생성된 이벤트가 없습니다</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              첫 이벤트 만들기
            </Button>
          </CardContent>
        </Card>
      )}
      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? '이벤트 수정' : '새 이벤트 생성'}</DialogTitle>
            <DialogDescription>
              공동구매, 특강, 대회 등 다양한 이벤트를 만들어보세요
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>제목</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 2025 봄 유니폼 공동구매" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명</FormLabel>
                    <FormControl>
                      <Textarea placeholder="이벤트 상세 설명" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이벤트 종류</FormLabel>
                      <FormControl>
                        <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          {Object.entries(eventTypeLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>상태</FormLabel>
                      <FormControl>
                        <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="registrationFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>참가비 (원, 선택)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="50000"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="registrationStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>신청 시작일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="registrationEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>신청 마감일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxParticipants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>최대 인원 (선택)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="30"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button type="submit">
                  {editingEvent ? '수정' : '생성'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {/* Registrations Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title} - 신청자 목록</DialogTitle>
            <DialogDescription>
              총 {registrations?.length || 0}명이 신청했습니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {registrations?.map((reg) => (
              <Card key={reg.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{reg.memberName}</p>
                    {typeof reg.paymentAmount === 'number' && (
                      <p className="text-sm text-muted-foreground">결제금액: {reg.paymentAmount.toLocaleString()}원</p>
                    )}
                  </div>
                  <Badge variant={
                    reg.paymentStatus === 'paid' ? 'default' :
                    reg.paymentStatus === 'refunded' ? 'outline' :
                    'secondary'
                  }>
                    {reg.paymentStatus === 'paid' ? '결제완료' :
                     reg.paymentStatus === 'refunded' ? '환불' : '대기중'}
                  </Badge>
                </div>
              </Card>
            ))}
            {(!registrations || registrations.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                아직 신청자가 없습니다
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
