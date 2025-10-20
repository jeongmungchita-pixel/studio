'use client';

export const dynamic = 'force-dynamic';
import { use, useEffect, useState } from 'react';
import { useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { GymnasticsCompetition, CompetitionSchedule, GymnasticsScore } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy } from 'lucide-react';

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

export default function ScoreboardPage({ params }: { params: Promise<{ competitionId: string }> }) {
  const { competitionId } = use(params);
  const firestore = useFirestore();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
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

  // Fetch current schedule (in_progress)
  const currentScheduleQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'competition_schedules'),
      where('competitionId', '==', competitionId),
      where('status', '==', 'in_progress')
    );
  }, [firestore, competitionId]);
  const { data: currentSchedules } = useCollection<CompetitionSchedule>(currentScheduleQuery);

  // Fetch recent scores
  const scoresQuery = useMemoFirebase(() => {
    if (!firestore || !currentSchedules || currentSchedules.length === 0) return null;
    const scheduleIds = currentSchedules.map(s => s.id);
    return query(
      collection(firestore, 'gymnastics_scores'),
      where('scheduleId', 'in', scheduleIds),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, currentSchedules]);
  const { data: scores } = useCollection<GymnasticsScore>(scoresQuery);

  if (!competition) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-900 to-purple-900">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  const currentSchedule = currentSchedules?.[0];
  const latestScores = scores?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 text-white p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-6xl font-bold mb-4 animate-pulse">{competition.title}</h1>
        <p className="text-3xl font-semibold">{competition.venue}</p>
        <p className="text-2xl mt-2">{currentTime.toLocaleTimeString('ko-KR')}</p>
      </div>

      {/* Current Event */}
      {currentSchedule && (
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-8 mb-8">
          <div className="text-center">
            <Badge className="text-2xl px-6 py-2 mb-4">현재 진행 중</Badge>
            <h2 className="text-5xl font-bold mb-2">
              {EVENT_NAMES[currentSchedule.eventId] || currentSchedule.eventName}
            </h2>
            <p className="text-3xl">
              {currentSchedule.categoryName} - {currentSchedule.gender === 'male' ? '남자' : '여자'}
            </p>
          </div>
        </Card>
      )}

      {/* Latest Scores */}
      {latestScores.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-4xl font-bold text-center mb-6">최근 점수</h3>
          {latestScores.map((score, index) => (
            <Card
              key={score.id}
              className={`bg-white/10 backdrop-blur-lg border-white/20 p-6 transform transition-all ${
                index === 0 ? 'scale-105 bg-yellow-500/20 border-yellow-400/50' : ''
              }`}
            >
              <div className="grid grid-cols-5 gap-4 items-center">
                {/* Rank */}
                <div className="text-center">
                  {score.rank && score.rank <= 3 ? (
                    <div className="text-6xl">
                      {score.rank === 1 ? '🥇' : score.rank === 2 ? '🥈' : '🥉'}
                    </div>
                  ) : (
                    <div className="text-5xl font-bold">{score.rank || '-'}</div>
                  )}
                </div>

                {/* Athlete Info */}
                <div className="col-span-2">
                  <p className="text-3xl font-bold">{score.memberName}</p>
                  <p className="text-xl text-white/70">{score.clubName}</p>
                </div>

                {/* Scores */}
                <div className="text-center">
                  <p className="text-sm text-white/70">D점 / E점</p>
                  <p className="text-2xl font-semibold">
                    {(score.dScore?.final ?? score.difficulty).toFixed(2)} / {(score.eScore?.final ?? score.execution).toFixed(2)}
                  </p>
                </div>

                {/* Final Score */}
                <div className="text-center">
                  <p className="text-sm text-white/70">최종 점수</p>
                  <p className="text-5xl font-bold text-yellow-400">{(score.finalScore ?? score.total).toFixed(2)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* No Activity */}
      {!currentSchedule && latestScores.length === 0 && (
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-12">
          <div className="text-center">
            <Trophy className="h-24 w-24 mx-auto mb-4 text-yellow-400" />
            <p className="text-4xl font-semibold">대기 중...</p>
            <p className="text-2xl text-white/70 mt-2">곧 경기가 시작됩니다</p>
          </div>
        </Card>
      )}

      {/* Auto Refresh Indicator */}
      <div className="fixed bottom-4 right-4 bg-green-500/20 backdrop-blur-lg border border-green-400/50 rounded-full px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          <span className="text-lg font-semibold">실시간 업데이트</span>
        </div>
      </div>
    </div>
  );
}
