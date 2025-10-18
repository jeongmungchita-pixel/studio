'use client';

export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, setDoc, deleteDoc, updateDoc, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { ClubEvent, EventRegistration, EventOption } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, Trash2, Users, Calendar, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm, ControllerRenderProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { z } from 'zod';

const eventFormSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요'),
  description: z.string().min(1, '설명을 입력하세요'),
  eventType: z.enum(['merchandise', 'uniform', 'special_class', 'competition', 'event', 'other']),
  price: z.number().min(0, '가격은 0 이상이어야 합니다'),
  priceUnit: z.enum(['per_person', 'per_item']),
  registrationStart: z.string(),
  registrationEnd: z.string(),
  eventDate: z.string().optional(),
  minParticipants: z.number().optional(),
  maxParticipants: z.number().optional(),
  allowMultipleQuantity: z.boolean(),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

const eventTypeLabels: Record<EventFormValues['eventType'], string> = {
  merchandise: '굿즈/티셔츠',
  uniform: '유니폼',
  special_class: '특강/캠프',
  competition: '대회',
  event: '행사',
  other: '기타',
};

const statusLabels: Record<ClubEvent['status'], string> = {
  draft: '초안',
  published: '공개',
  'registration-open': '신청중',
  'registration-closed': '신청 마감',
  'in-progress': '진행중',
  completed: '완료',
  cancelled: '취소',
  upcoming: '예정',
  open: '신청중',
  closed: '마감',
};

const createDefaultFormValues = (): EventFormValues => {
  const today = new Date();
  const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return {
    title: '',
    description: '',
    eventType: 'merchandise',
    price: 0,
    priceUnit: 'per_item',
    registrationStart: today.toISOString().split('T')[0],
    registrationEnd: weekLater.toISOString().split('T')[0],
    eventDate: undefined,
    minParticipants: undefined,
    maxParticipants: undefined,
    allowMultipleQuantity: true,
  };
};

export default function ClubEventsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ClubEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);
  const [options, setOptions] = useState<EventOption[]>([]);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: createDefaultFormValues(),
  });

  // Fetch events
  const eventsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'events'),
      where('clubId', '==', user.clubId),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.clubId]);
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
    if (!firestore || !user?.clubId) return;

    try {
      const timestamp = new Date().toISOString();
      if (editingEvent) {
        const updatePayload: Partial<ClubEvent> = {
          title: values.title,
          description: values.description,
          eventType: values.eventType,
          price: values.price,
          priceUnit: values.priceUnit,
          registrationStart: values.registrationStart,
          registrationEnd: values.registrationEnd,
          eventDate: values.eventDate ?? null,
          minParticipants: values.minParticipants ?? null,
          maxParticipants: values.maxParticipants ?? null,
          allowMultipleQuantity: values.allowMultipleQuantity,
          options,
          updatedAt: timestamp,
        };
        await updateDoc(doc(firestore, 'events', editingEvent.id), updatePayload);
        toast({ title: '이벤트 수정 완료' });
      } else {
        const eventRef = doc(collection(firestore, 'events'));
        const eventData: ClubEvent = {
          id: eventRef.id,
          clubId: user.clubId,
          clubName: user.clubName,
          title: values.title,
          description: values.description,
          eventType: values.eventType,
          price: values.price,
          priceUnit: values.priceUnit,
          registrationStart: values.registrationStart,
          registrationEnd: values.registrationEnd,
          eventDate: values.eventDate,
          minParticipants: values.minParticipants,
          maxParticipants: values.maxParticipants,
          allowMultipleQuantity: values.allowMultipleQuantity,
          currentParticipants: 0,
          options,
          status: 'upcoming',
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        await setDoc(eventRef, eventData);
        toast({ title: '이벤트 생성 완료' });
      }
      setIsDialogOpen(false);
      form.reset(createDefaultFormValues());
      setOptions([]);
      setEditingEvent(null);
    } catch (error) {
      toast({ variant: 'destructive', title: '저장 실패' });
    }
  };

  const handleEdit = (event: ClubEvent) => {
    setEditingEvent(event);
    form.reset({
      title: event.title,
      description: event.description,
      eventType: event.eventType ?? 'event',
      price: event.price ?? 0,
      priceUnit: event.priceUnit ?? 'per_item',
      registrationStart: event.registrationStart ? event.registrationStart.split('T')[0] : new Date().toISOString().split('T')[0],
      registrationEnd: event.registrationEnd ? event.registrationEnd.split('T')[0] : new Date().toISOString().split('T')[0],
      eventDate: event.eventDate ? event.eventDate.split('T')[0] : undefined,
      minParticipants: event.minParticipants ?? undefined,
      maxParticipants: event.maxParticipants ?? undefined,
      allowMultipleQuantity: event.allowMultipleQuantity ?? true,
    });
    setOptions(event.options ?? []);
    setIsDialogOpen(true);
  };

  const handleDelete = async (eventId: string) => {
    if (!firestore || !confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(firestore, 'events', eventId));
      toast({ title: '이벤트 삭제 완료' });
    } catch (error) {
      toast({ variant: 'destructive', title: '삭제 실패' });
    }
  };

  const addOption = () => {
    setOptions((prev) => [...prev, { id: Date.now().toString(), name: '', values: [], required: false }]);
  };

  const updateOption = <K extends keyof EventOption>(index: number, field: K, value: EventOption[K]) => {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
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
          form.reset(createDefaultFormValues());
          setOptions([]);
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          새 이벤트 생성
        </Button>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events?.map((event) => {
          const eventTypeKey: EventFormValues['eventType'] = (event.eventType as EventFormValues['eventType']) ?? 'event';
          const eventStatus = event.status ?? 'upcoming';
          const price = event.price ?? 0;
          const priceUnit = event.priceUnit ?? 'per_item';
          const registrationEndDate = event.registrationEnd ? new Date(event.registrationEnd) : null;
          const registrationEndDisplay = registrationEndDate && !Number.isNaN(registrationEndDate.getTime())
            ? format(registrationEndDate, 'MM/dd', { locale: ko })
            : '미정';
          const statusVariant =
            eventStatus === 'cancelled' || eventStatus === 'closed' || eventStatus === 'registration-closed'
              ? 'destructive'
              : eventStatus === 'open' || eventStatus === 'registration-open' || eventStatus === 'upcoming'
              ? 'default'
              : 'secondary';

          return (
          <Card key={event.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>{eventTypeLabels[eventTypeKey]}</Badge>
                    <Badge variant={statusVariant}>
                      {statusLabels[eventStatus] ?? '상태 미정'}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-2">
                    {event.description}
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
                  {price.toLocaleString()}원
                  {priceUnit === 'per_person' ? '/인' : '/개'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  신청자
                </span>
                <span className="font-semibold">
                  {event.currentParticipants ?? 0}
                  {event.maxParticipants && `/${event.maxParticipants}`}명
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  신청 마감
                </span>
                <span className="font-semibold">
                  {registrationEndDisplay}
                </span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedEvent(event)}
                >
                  <Users className="h-4 w-4 mr-1" />
                  신청자 보기
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(event)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(event.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
          );
        })}
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
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open: boolean) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingEvent(null);
            setOptions([]);
            form.reset(createDefaultFormValues());
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? '이벤트 수정' : '새 이벤트 생성'}</DialogTitle>
            <DialogDescription>
              공동구매, 특강, 대회 등 다양한 이벤트를 만들어보세요
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField<EventFormValues, 'title'>
                control={form.control}
                name="title"
                render={({ field }: { field: ControllerRenderProps<EventFormValues, 'title'> }) => (
                  <FormItem>
                    <FormLabel>제목</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 2025 봄 유니폼 공동구매" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField<EventFormValues, 'description'>
                control={form.control}
                name="description"
                render={({ field }: { field: ControllerRenderProps<EventFormValues, 'description'> }) => (
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
                <FormField<EventFormValues, 'eventType'>
                  control={form.control}
                  name="eventType"
                  render={({ field }: { field: ControllerRenderProps<EventFormValues, 'eventType'> }) => (
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

                <FormField<EventFormValues, 'priceUnit'>
                  control={form.control}
                  name="priceUnit"
                  render={({ field }: { field: ControllerRenderProps<EventFormValues, 'priceUnit'> }) => (
                    <FormItem>
                      <FormLabel>가격 단위</FormLabel>
                      <FormControl>
                        <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="per_item">개당</option>
                          <option value="per_person">인당</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField<EventFormValues, 'price'>
                control={form.control}
                name="price"
                render={({ field }: { field: ControllerRenderProps<EventFormValues, 'price'> }) => (
                  <FormItem>
                    <FormLabel>가격 (원)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="50000"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField<EventFormValues, 'registrationStart'>
                  control={form.control}
                  name="registrationStart"
                  render={({ field }: { field: ControllerRenderProps<EventFormValues, 'registrationStart'> }) => (
                    <FormItem>
                      <FormLabel>신청 시작일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField<EventFormValues, 'registrationEnd'>
                  control={form.control}
                  name="registrationEnd"
                  render={({ field }: { field: ControllerRenderProps<EventFormValues, 'registrationEnd'> }) => (
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
                <FormField<EventFormValues, 'minParticipants'>
                  control={form.control}
                  name="minParticipants"
                  render={({ field }: { field: ControllerRenderProps<EventFormValues, 'minParticipants'> }) => (
                    <FormItem>
                      <FormLabel>최소 인원 (선택)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="10"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField<EventFormValues, 'maxParticipants'>
                  control={form.control}
                  name="maxParticipants"
                  render={({ field }: { field: ControllerRenderProps<EventFormValues, 'maxParticipants'> }) => (
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

              {/* Options */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>옵션 (사이즈, 색상 등)</FormLabel>
                  <Button type="button" size="sm" variant="outline" onClick={addOption}>
                    <Plus className="h-4 w-4 mr-1" />
                    옵션 추가
                  </Button>
                </div>
                {options.map((option, index) => (
                  <Card key={option.id} className="p-3">
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="옵션명 (예: 사이즈)"
                          value={option.name}
                          onChange={(e) => updateOption(index, 'name', e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => removeOption(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        placeholder="값 (쉼표로 구분, 예: S,M,L,XL)"
                        value={option.values.join(',')}
                        onChange={(e) => {
                          const values = e.target.value
                            .split(',')
                            .map((v) => v.trim())
                            .filter((v) => v.length > 0);
                          updateOption(index, 'values', values);
                        }}
                      />
                    </div>
                  </Card>
                ))}
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
      <Dialog open={!!selectedEvent} onOpenChange={(open: boolean) => {
        if (!open) setSelectedEvent(null);
      }}>
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
                    <p className="text-sm text-muted-foreground">
                      {reg.selectedOptions
                        ? Object.entries(reg.selectedOptions).map(([key, value]) => `${key}: ${value}`).join(', ')
                        : '선택 옵션 없음'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      수량: {(reg.quantity ?? 1).toLocaleString()}개 | 총액: {reg.totalPrice != null ? `${reg.totalPrice.toLocaleString()}원` : '미정'}
                    </p>
                  </div>
                  <Badge variant={
                    reg.paymentStatus === 'paid'
                      ? 'default'
                      : reg.paymentStatus === 'cancelled'
                      ? 'destructive'
                      : reg.paymentStatus === 'refunded'
                      ? 'secondary'
                      : 'secondary'
                  }>
                    {reg.paymentStatus === 'paid'
                      ? '결제완료'
                      : reg.paymentStatus === 'cancelled'
                      ? '취소'
                      : reg.paymentStatus === 'refunded'
                      ? '환불'
                      : '대기중'}
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
