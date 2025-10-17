'use client';

export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, setDoc, updateDoc, increment, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { ClubEvent, EventRegistration } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, DollarSign, Users, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const eventTypeLabels = {
  merchandise: '굿즈/티셔츠',
  uniform: '유니폼',
  special_class: '특강/캠프',
  competition: '대회',
  event: '행사',
  other: '기타',
};

export default function MemberEventsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available events
  const eventsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    const now = new Date().toISOString();
    return query(
      collection(firestore, 'events'),
      where('clubId', '==', user.clubId),
      where('status', '==', 'open'),
      orderBy('registrationEnd', 'asc')
    );
  }, [firestore, user?.clubId]);
  const { data: events, isLoading: areEventsLoading } = useCollection<ClubEvent>(eventsQuery);

  // Fetch my registrations
  const myRegistrationsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'event_registrations'),
      where('memberId', '==', user.uid)
    );
  }, [firestore, user?.uid]);
  const { data: myRegistrations } = useCollection<EventRegistration>(myRegistrationsQuery);

  const handleApply = async () => {
    if (!selectedEvent || !firestore || !user) return;

    // Validate options
    const requiredOptions = selectedEvent.options?.filter(opt => opt.required) || [];
    for (const opt of requiredOptions) {
      if (!selectedOptions[opt.name]) {
        toast({
          variant: 'destructive',
          title: '필수 옵션 선택',
          description: `${opt.name}을(를) 선택해주세요.`
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const totalPrice = selectedEvent.price * quantity;
      
      // Create registration
      const regRef = doc(collection(firestore, 'event_registrations'));
      const registrationData: EventRegistration = {
        id: regRef.id,
        eventId: selectedEvent.id,
        memberId: user.uid,
        memberName: user.displayName || user.email || '회원',
        clubId: selectedEvent.clubId,
        selectedOptions,
        quantity,
        totalPrice,
        paymentStatus: 'pending',
        registeredAt: new Date().toISOString(),
        notes,
      };
      
      await setDoc(regRef, registrationData);
      
      // Update event participant count
      await updateDoc(doc(firestore, 'events', selectedEvent.id), {
        currentParticipants: increment(1)
      });
      
      toast({
        title: '신청 완료!',
        description: '이벤트 신청이 완료되었습니다. 관리자 확인 후 연락드리겠습니다.'
      });
      
      setSelectedEvent(null);
      setSelectedOptions({});
      setQuantity(1);
      setNotes('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '신청 실패',
        description: '신청 중 오류가 발생했습니다.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAlreadyRegistered = (eventId: string) => {
    return myRegistrations?.some(reg => reg.eventId === eventId && reg.paymentStatus !== 'cancelled');
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">이벤트</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          클럽에서 진행하는 다양한 이벤트에 참여하세요
        </p>
      </div>

      {/* My Registrations */}
      {myRegistrations && myRegistrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>내 신청 내역</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myRegistrations.map((reg) => {
              const event = events?.find(e => e.id === reg.eventId);
              return (
                <div key={reg.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-semibold">{event?.title || '이벤트'}</p>
                    <p className="text-sm text-muted-foreground">
                      {Object.entries(reg.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      수량: {reg.quantity}개 | {reg.totalPrice.toLocaleString()}원
                    </p>
                  </div>
                  <Badge variant={
                    reg.paymentStatus === 'paid' ? 'default' :
                    reg.paymentStatus === 'cancelled' ? 'destructive' :
                    'secondary'
                  }>
                    {reg.paymentStatus === 'paid' ? '결제완료' :
                     reg.paymentStatus === 'cancelled' ? '취소' : '대기중'}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Available Events */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events?.map((event) => {
          const isRegistered = isAlreadyRegistered(event.id);
          const isFull = event.maxParticipants && event.currentParticipants >= event.maxParticipants;
          const daysLeft = Math.ceil((new Date(event.registrationEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          
          return (
            <Card key={event.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge>{eventTypeLabels[event.eventType]}</Badge>
                  {isRegistered && (
                    <Badge variant="default">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      신청완료
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{event.title}</CardTitle>
                <CardDescription className="line-clamp-3 mt-2">
                  {event.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    가격
                  </span>
                  <span className="font-semibold">
                    {event.price.toLocaleString()}원
                    {event.priceUnit === 'per_person' ? '/인' : '/개'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    신청 현황
                  </span>
                  <span className="font-semibold">
                    {event.currentParticipants}
                    {event.maxParticipants && `/${event.maxParticipants}`}명
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    마감
                  </span>
                  <span className={`font-semibold ${daysLeft <= 3 ? 'text-red-600' : ''}`}>
                    {daysLeft > 0 ? `D-${daysLeft}` : '오늘 마감'}
                  </span>
                </div>
                
                {event.minParticipants && event.currentParticipants < event.minParticipants && (
                  <p className="text-xs text-amber-600">
                    최소 {event.minParticipants}명 이상 신청 시 진행됩니다
                  </p>
                )}
                
                <Button
                  className="w-full"
                  disabled={!!isRegistered || !!isFull}
                  onClick={() => setSelectedEvent(event)}
                >
                  {isRegistered ? '신청 완료' :
                   isFull ? '마감' : '신청하기'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!events || events.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground">현재 진행 중인 이벤트가 없습니다</p>
          </CardContent>
        </Card>
      )}

      {/* Application Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              {selectedEvent?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Options */}
            {selectedEvent?.options?.map((option) => (
              <div key={option.id} className="space-y-2">
                <label className="text-sm font-medium">
                  {option.name} {option.required && <span className="text-red-600">*</span>}
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedOptions[option.name] || ''}
                  onChange={(e) => setSelectedOptions({ ...selectedOptions, [option.name]: e.target.value })}
                >
                  <option value="">선택하세요</option>
                  {option.values.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
            ))}

            {/* Quantity */}
            {selectedEvent?.allowMultipleQuantity && (
              <div className="space-y-2">
                <label className="text-sm font-medium">수량</label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">요청사항 (선택)</label>
              <Textarea
                placeholder="특별한 요청사항이 있으시면 입력해주세요"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Total Price */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="font-semibold">총 금액</span>
              <span className="text-2xl font-bold">
                {selectedEvent && (selectedEvent.price * quantity).toLocaleString()}원
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>
              취소
            </Button>
            <Button onClick={handleApply} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  신청 중...
                </>
              ) : (
                '신청하기'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
