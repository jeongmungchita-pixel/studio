'use client';

export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, query, where, doc, setDoc, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { GymnasticsCompetition, CompetitionRegistration, Member } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Trophy, Calendar, MapPin, Users, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInYears } from 'date-fns';
import { ko } from 'date-fns/locale';
import Link from 'next/link';

const EVENT_NAMES: Record<string, string> = {
  FX: '마루운동',
  PH: '안마',
  SR: '링',
  VT: '도마',
  PB: '평행봉',
  HB: '철봉',
  UB: '이단평행봉',
  BB: '평균대',
};

const statusLabels = {
  draft: '준비중',
  registration_open: '신청중',
  registration_closed: '신청마감',
  in_progress: '진행중',
  completed: '완료',
  cancelled: '취소',
};

export default function CompetitionsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedCompetition, setSelectedCompetition] = useState<GymnasticsCompetition | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch competitions
  const competitionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'competitions'),
      orderBy('competitionDate', 'desc')
    );
  }, [firestore]);
  const { data: competitions, isLoading } = useCollection<GymnasticsCompetition>(competitionsQuery);

  // Fetch my registrations
  const myRegistrationsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'competition_registrations'),
      where('memberId', '==', user.uid)
    );
  }, [firestore, user?.uid]);
  const { data: myRegistrations } = useCollection<CompetitionRegistration>(myRegistrationsQuery);

  // Fetch member info
  const memberQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'members'),
      where('userId', '==', user.uid)
    );
  }, [firestore, user?.uid]);
  const { data: members } = useCollection<Member>(memberQuery);
  const member = members?.[0];

  const handleApply = (competition: GymnasticsCompetition) => {
    setSelectedCompetition(competition);
    setSelectedEvents([]);
  };

  const handleSubmit = async () => {
    if (!selectedCompetition || !firestore || !user || !member || selectedEvents.length === 0) return;

    setIsSubmitting(true);
    try {
      const regRef = doc(collection(firestore, 'competition_registrations'));
      const birthDate = member.dateOfBirth || '';
      const age = member.dateOfBirth ? differenceInYears(new Date(), new Date(member.dateOfBirth)) : 0;
      
      const registrationData: CompetitionRegistration = {
        id: regRef.id,
        competitionId: selectedCompetition.id,
        memberId: user.uid,
        memberName: member.name,
        clubId: member.clubId,
        clubName: member.clubName || '',
        gender: member.gender || 'male',
        birthDate,
        age,
        grade: member.grade,
        level: member.level,
        registeredEvents: selectedEvents,
        status: 'pending',
        registeredAt: new Date().toISOString(),
      };

      await setDoc(regRef, registrationData);

      toast({
        title: '신청 완료!',
        description: `${selectedCompetition.title} 시합 신청이 완료되었습니다.`,
      });

      setSelectedCompetition(null);
      setSelectedEvents([]);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '신청 실패',
        description: '시합 신청 중 오류가 발생했습니다.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRegistered = (competitionId: string) => {
    return myRegistrations?.some(r => r.competitionId === competitionId && r.status !== 'rejected');
  };

  const canRegister = (competition: GymnasticsCompetition) => {
    const now = new Date();
    const regStart = new Date(competition.registrationStart);
    const regEnd = new Date(competition.registrationEnd);
    return competition.status === 'registration_open' && now >= regStart && now <= regEnd;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">시합</h1>
        <p className="text-muted-foreground mt-1">기계체조 시합에 참가하세요</p>
      </div>

      {/* My Registrations */}
      {myRegistrations && myRegistrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>내 신청 내역</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myRegistrations.map((reg) => {
              const comp = competitions?.find(c => c.id === reg.competitionId);
              return (
                <div key={reg.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-semibold">{comp?.title || '시합'}</p>
                    <p className="text-sm text-muted-foreground">
                      {reg.registeredEvents.length}개 종목 신청
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={reg.status === 'approved' ? 'default' : 'secondary'}>
                      {reg.status === 'approved' ? '승인' : reg.status === 'rejected' ? '거절' : '대기'}
                    </Badge>
                    {comp && comp.status === 'in_progress' && (
                      <Link href={`/competitions/${comp.id}/live`}>
                        <Button size="sm">실시간 보기</Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Available Competitions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {competitions?.map((competition) => {
          const registered = isRegistered(competition.id);
          const canApply = canRegister(competition);

          return (
            <Card key={competition.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant={
                    competition.status === 'registration_open' ? 'default' :
                    competition.status === 'in_progress' ? 'secondary' :
                    'outline'
                  }>
                    {statusLabels[competition.status]}
                  </Badge>
                  {registered && (
                    <Badge variant="default">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      신청완료
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl">{competition.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {competition.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(competition.competitionDate), 'PPP', { locale: ko })}</span>
                </div>
                {competition.venue && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{competition.venue}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{competition.events.length}개 종목</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Trophy className="h-4 w-4" />
                  <span>
                    신청: {format(new Date(competition.registrationStart), 'M/d')} ~ {format(new Date(competition.registrationEnd), 'M/d')}
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  {competition.status === 'in_progress' && (
                    <Link href={`/scoreboard/${competition.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        전광판 보기
                      </Button>
                    </Link>
                  )}
                  {canApply && !registered && (
                    <Button onClick={() => handleApply(competition)} className="flex-1">
                      신청하기
                    </Button>
                  )}
                  {registered && competition.status === 'in_progress' && (
                    <Link href={`/competitions/${competition.id}/live`} className="flex-1">
                      <Button className="w-full">실시간 현황</Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!competitions || competitions.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Trophy className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">진행 중인 시합이 없습니다</p>
          </CardContent>
        </Card>
      )}

      {/* Application Dialog */}
      <Dialog open={!!selectedCompetition} onOpenChange={() => setSelectedCompetition(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedCompetition?.title}</DialogTitle>
            <DialogDescription>
              참가할 종목을 선택하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              {selectedCompetition?.events
                .filter(event => member?.gender === 'male' ? event.gender !== 'female' : event.gender !== 'male')
                .map((event) => (
                  <div
                    key={event.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedEvents.includes(event.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => {
                      setSelectedEvents(prev =>
                        prev.includes(event.id)
                          ? prev.filter(id => id !== event.id)
                          : [...prev, event.id]
                      );
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox checked={selectedEvents.includes(event.id)} />
                      <div>
                        <p className="font-semibold">{EVENT_NAMES[event.code] || event.name}</p>
                        <p className="text-xs text-muted-foreground">{event.code}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {selectedEvents.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-semibold mb-2">선택한 종목 ({selectedEvents.length}개)</p>
                <div className="flex flex-wrap gap-2">
                  {selectedEvents.map(eventId => {
                    const event = selectedCompetition?.events.find(e => e.id === eventId);
                    return (
                      <Badge key={eventId}>
                        {EVENT_NAMES[event?.code || ''] || event?.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCompetition(null)}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedEvents.length === 0}
            >
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
