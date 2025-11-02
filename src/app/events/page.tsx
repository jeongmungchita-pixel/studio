'use client';
import { useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, setDoc, updateDoc, increment, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { ClubEvent, EventRegistration } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, DollarSign, Users, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
const eventTypeLabels: Record<ClubEvent['type'], string> = {
  competition: '대회',
  workshop: '워크숍',
  performance: '공연',
  social: '소셜',
  training: '훈련',
};
export default function MemberEventsPage() {
  const { _user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Fetch available events
  const eventsQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.clubId) return null;
    const now = new Date().toISOString();
    return query(
      collection(firestore, 'events'),
      where('clubId', '==', _user.clubId),
      where('status', '==', 'registration-open'),
      orderBy('registrationEnd', 'asc')
    );
  }, [firestore, _user?.clubId]);
  const { data: events, isLoading: areEventsLoading } = useCollection<ClubEvent>(eventsQuery);
  // Fetch my registrations
  const myRegistrationsQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.uid) return null;
    return query(
      collection(firestore, 'event_registrations'),
      where('memberId', '==', _user.uid)
    );
  }, [firestore, _user?.uid]);
  const { data: myRegistrations } = useCollection<EventRegistration>(myRegistrationsQuery);
  const handleApply = async () => {
    if (!selectedEvent || !firestore || !_user) return;
    setIsSubmitting(true);
    try {
      const paymentAmount = selectedEvent.registrationFee ?? 0;
      // Create registration
      const regRef = doc(collection(firestore, 'event_registrations'));
      const registrationData: EventRegistration = {
        id: regRef.id,
        eventId: selectedEvent.id,
        eventTitle: selectedEvent.title,
        memberId: _user.uid,
        memberName: _user.displayName || _user.email || '회원',
        clubId: selectedEvent.clubId,
        registeredAt: new Date().toISOString(),
        status: 'registered',
        paymentStatus: 'pending',
        paymentAmount,
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
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
      setNotes('');
    } catch (error: unknown) {
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
    return myRegistrations?.some(reg => reg.eventId === eventId);
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
              const _event = events?.find(e => e.id === reg.eventId);
              return (
                <div key={reg.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-semibold">{_event?.title || reg.eventTitle || '이벤트'}</p>
                    {reg.notes && (
                      <p className="text-sm text-muted-foreground">메모: {reg.notes}</p>
                    )}
                    {typeof reg.paymentAmount === 'number' && (
                      <p className="text-sm text-muted-foreground">금액: {reg.paymentAmount.toLocaleString()}원</p>
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
              );
            })}
          </CardContent>
        </Card>
      )}
      {/* Available Events */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events?.map((_event) => {
          const isRegistered = isAlreadyRegistered(_event.id);
          const isFull = _event.maxParticipants && _event.currentParticipants >= _event.maxParticipants;
          const daysLeft = Math.ceil((new Date(_event.registrationEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return (
            <Card key={_event.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge>{eventTypeLabels[_event.type]}</Badge>
                  {isRegistered && (
                    <Badge variant="default">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      신청완료
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{_event.title}</CardTitle>
                <CardDescription className="line-clamp-3 mt-2">
                  {_event.description}
                </CardDescription>
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
                    신청 현황
                  </span>
                  <span className="font-semibold">
                    {_event.currentParticipants}
                    {_event.maxParticipants && `/${_event.maxParticipants}`}명
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
                {/* 최소 참가자 로직 제거: 타입에 존재하지 않음 */}
                <Button
                  className="w-full"
                  disabled={!!isRegistered || !!isFull}
                  onClick={() => setSelectedEvent(_event)}
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
            {/* 선택 옵션 로직 제거: 타입에 존재하지 않음 */}
            {/* 수량 로직 제거: 타입에 존재하지 않음 */}
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
                {selectedEvent ? (selectedEvent.registrationFee ?? 0).toLocaleString() : 0}원
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
