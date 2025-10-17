'use client';

export const dynamic = 'force-dynamic';
import { use, useEffect, useState } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { GymnasticsCompetition, CompetitionRegistration, CompetitionSchedule, GymnasticsScore } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

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

export default function CompetitionLivePage({ params }: { params: Promise<{ competitionId: string }> }) {
  const { competitionId } = use(params);
  const { user } = useUser();
  const firestore = useFirestore();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch competition
  const competitionRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'competitions', competitionId) : null),
    [firestore, competitionId]
  );
  const { data: competition } = useDoc<GymnasticsCompetition>(competitionRef);

  // Fetch my registration
  const myRegistrationQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'competition_registrations'),
      where('competitionId', '==', competitionId),
      where('memberId', '==', user.uid)
    );
  }, [firestore, competitionId, user?.uid]);
  const { data: myRegistrations } = useCollection<CompetitionRegistration>(myRegistrationQuery);
  const myRegistration = myRegistrations?.[0];

  // Fetch my scores
  const myScoresQuery = useMemoFirebase(() => {
    if (!firestore || !myRegistration) return null;
    return query(
      collection(firestore, 'gymnastics_scores'),
      where('registrationId', '==', myRegistration.id),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, myRegistration?.id]);
  const { data: myScores } = useCollection<GymnasticsScore>(myScoresQuery);

  // Fetch current schedule
  const currentScheduleQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'competition_schedules'),
      where('competitionId', '==', competitionId),
      where('status', '==', 'in_progress')
    );
  }, [firestore, competitionId]);
  const { data: currentSchedules } = useCollection<CompetitionSchedule>(currentScheduleQuery);

  if (!competition || !myRegistration) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const currentSchedule = currentSchedules?.[0];
  const completedEvents = myScores?.length || 0;
  const totalEvents = myRegistration.registeredEvents.length;
  const totalScore = myScores?.reduce((sum, score) => sum + score.finalScore, 0) || 0;

  // Check if I'm competing now
  const isMyTurn = currentSchedule?.participants.some(p => p.memberId === user?.uid);

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{competition.title}</h1>
          <p className="text-muted-foreground">{format(new Date(competition.competitionDate), 'PPP', { locale: ko })}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">현재 시각</p>
          <p className="text-2xl font-bold">{currentTime.toLocaleTimeString('ko-KR')}</p>
        </div>
      </div>

      {/* My Status */}
      <Card className={isMyTurn ? 'border-2 border-green-500 animate-pulse' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>내 현황</span>
            {isMyTurn && (
              <Badge className="bg-green-500 text-lg px-4 py-1">
                🎯 지금 내 차례!
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">완료 종목</p>
              <p className="text-3xl font-bold">{completedEvents}/{totalEvents}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">현재 총점</p>
              <p className="text-3xl font-bold text-blue-600">{totalScore.toFixed(2)}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">평균 점수</p>
              <p className="text-3xl font-bold">
                {completedEvents > 0 ? (totalScore / completedEvents).toFixed(2) : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Event */}
      {currentSchedule && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              현재 진행 중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <Badge className="mb-2">{currentSchedule.categoryName}</Badge>
              <h3 className="text-2xl font-bold mb-1">
                {EVENT_NAMES[currentSchedule.eventId] || currentSchedule.eventName}
              </h3>
              <p className="text-muted-foreground">
                {currentSchedule.gender === 'male' ? '남자' : '여자'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            내 점수
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myScores && myScores.length > 0 ? (
            <div className="space-y-3">
              {myScores.map((score) => (
                <div key={score.id} className="p-4 border rounded-lg hover:bg-accent transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <h4 className="font-semibold text-lg">
                        {EVENT_NAMES[score.eventId] || score.eventName}
                      </h4>
                    </div>
                    {score.rank && (
                      <Badge variant={score.rank <= 3 ? 'default' : 'secondary'}>
                        {score.rank}위
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">D점</p>
                      <p className="text-xl font-bold">{score.dScore.final.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">E점</p>
                      <p className="text-xl font-bold">{score.eScore.final.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">최종</p>
                      <p className="text-2xl font-bold text-blue-600">{score.finalScore.toFixed(2)}</p>
                    </div>
                  </div>
                  {score.deductions && score.deductions.length > 0 && (
                    <div className="mt-2 text-sm text-red-600">
                      감점: {score.deductions.map(d => `${d.type} (-${d.points})`).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              아직 점수가 없습니다
            </p>
          )}
        </CardContent>
      </Card>

      {/* Registered Events */}
      <Card>
        <CardHeader>
          <CardTitle>신청 종목</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {myRegistration.registeredEvents.map((eventId) => {
              const hasScore = myScores?.some(s => s.eventId === eventId);
              return (
                <div
                  key={eventId}
                  className={`p-3 rounded-lg border text-center ${
                    hasScore ? 'bg-green-50 border-green-200' : 'bg-muted'
                  }`}
                >
                  <p className="font-semibold">{EVENT_NAMES[eventId] || eventId}</p>
                  {hasScore && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto mt-1" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Auto Refresh Indicator */}
      <div className="fixed bottom-4 right-4 bg-green-500/10 border border-green-500 rounded-full px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-semibold">실시간 업데이트</span>
        </div>
      </div>
    </main>
  );
}
