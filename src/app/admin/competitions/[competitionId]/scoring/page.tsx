'use client';

export const dynamic = 'force-dynamic';
import { useState, use } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, setDoc, updateDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { GymnasticsCompetition, CompetitionRegistration, GymnasticsScore } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Calculator } from 'lucide-react';

interface PageProps {
  params: Promise<{ competitionId: string }>;
}

export default function ScoringPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const competitionId = resolvedParams.competitionId;
  
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [scores, setScores] = useState<Record<string, {
    dScore1: string;
    dScore2: string;
    eScore1: string;
    eScore2: string;
    eScore3: string;
    eScore4: string;
    deductions: string;
  }>>({});

  // Fetch competition
  const competitionQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'competitions'),
      where('__name__', '==', competitionId)
    );
  }, [firestore, competitionId]);
  const { data: competitions } = useCollection<GymnasticsCompetition>(competitionQuery);
  const competition = competitions?.[0];

  // Fetch approved registrations
  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'competition_registrations'),
      where('competitionId', '==', competitionId),
      where('status', '==', 'approved')
    );
  }, [firestore, competitionId]);
  const { data: registrations, isLoading } = useCollection<CompetitionRegistration>(registrationsQuery);

  const calculateFinalScore = (regId: string) => {
    const score = scores[regId];
    if (!score) return 0;

    const d1 = parseFloat(score.dScore1) || 0;
    const d2 = parseFloat(score.dScore2) || 0;
    const dFinal = (d1 + d2) / 2;

    const e1 = parseFloat(score.eScore1) || 0;
    const e2 = parseFloat(score.eScore2) || 0;
    const e3 = parseFloat(score.eScore3) || 0;
    const e4 = parseFloat(score.eScore4) || 0;
    
    // E점수: 최고/최저 제외하고 평균
    const eScores = [e1, e2, e3, e4].sort((a, b) => a - b);
    const eFinal = (eScores[1] + eScores[2]) / 2;

    const deductions = parseFloat(score.deductions) || 0;
    
    return Math.max(0, dFinal + eFinal - deductions);
  };

  const handleSaveScore = async (registration: CompetitionRegistration) => {
    if (!firestore || !selectedEvent) return;

    const score = scores[registration.id];
    if (!score) {
      toast({ variant: 'destructive', title: '점수를 입력하세요' });
      return;
    }

    try {
      const d1 = parseFloat(score.dScore1) || 0;
      const d2 = parseFloat(score.dScore2) || 0;
      const dFinal = (d1 + d2) / 2;

      const e1 = parseFloat(score.eScore1) || 0;
      const e2 = parseFloat(score.eScore2) || 0;
      const e3 = parseFloat(score.eScore3) || 0;
      const e4 = parseFloat(score.eScore4) || 0;
      const eScores = [e1, e2, e3, e4].sort((a, b) => a - b);
      const eFinal = (eScores[1] + eScores[2]) / 2;

      const deductions = parseFloat(score.deductions) || 0;
      const finalScore = Math.max(0, dFinal + eFinal - deductions);

      const event = competition?.events.find(e => e.id === selectedEvent);
      
      const scoreRef = doc(collection(firestore, 'gymnastics_scores'));
      const scoreData: GymnasticsScore = {
        id: scoreRef.id,
        competitionId,
        scheduleId: '', // 추후 스케줄 ID 연결
        registrationId: registration.id,
        memberId: registration.memberId,
        memberName: registration.memberName,
        clubName: registration.clubName,
        eventId: selectedEvent,
        eventName: event?.name || '',
        categoryId: '', // 추후 카테고리 연결
        gender: registration.gender,
        dScore: {
          judge1: d1,
          judge2: d2,
          final: dFinal,
        },
        eScore: {
          judge1: e1,
          judge2: e2,
          final: eFinal,
        },
        deductions: deductions > 0 ? [{ type: '감점', points: deductions }] : [],
        finalScore,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(scoreRef, scoreData);

      toast({ 
        title: '점수 저장 완료', 
        description: `${registration.memberName} - ${event?.name}: ${finalScore.toFixed(2)}점` 
      });

      // 점수 초기화
      const newScores = { ...scores };
      delete newScores[registration.id];
      setScores(newScores);

    } catch (error) {
      console.error('Score save error:', error);
      toast({ variant: 'destructive', title: '저장 실패' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-muted-foreground">시합을 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{competition.title}</h1>
        <p className="text-muted-foreground mt-1">점수 입력 시스템</p>
      </div>

      <Tabs value={selectedEvent} onValueChange={setSelectedEvent}>
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          {competition.events.map((event) => (
            <TabsTrigger key={event.id} value={event.id}>
              {event.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {competition.events.map((event) => (
          <TabsContent key={event.id} value={event.id} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {event.name} ({event.code})
                  <Badge variant={event.gender === 'male' ? 'default' : 'secondary'}>
                    {event.gender === 'male' ? '남자' : event.gender === 'female' ? '여자' : '공통'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {registrations
                  ?.filter(reg => reg.registeredEvents.includes(event.id))
                  .map((registration) => {
                    const regScore = scores[registration.id] || {
                      dScore1: '',
                      dScore2: '',
                      eScore1: '',
                      eScore2: '',
                      eScore3: '',
                      eScore4: '',
                      deductions: '',
                    };

                    return (
                      <Card key={registration.id} className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-lg">{registration.memberName}</p>
                              <p className="text-sm text-muted-foreground">
                                {registration.clubName} | {registration.age}세
                              </p>
                            </div>
                            {regScore.dScore1 && regScore.eScore1 && (
                              <div className="text-right">
                                <p className="text-2xl font-bold text-blue-600">
                                  {calculateFinalScore(registration.id).toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground">최종 점수</p>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* D점수 (난이도) */}
                            <div className="space-y-2">
                              <Label className="text-blue-600 font-semibold">D점수 (난이도)</Label>
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs">D1 심판</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    placeholder="0.0"
                                    value={regScore.dScore1}
                                    onChange={(e) => {
                                      setScores({
                                        ...scores,
                                        [registration.id]: { ...regScore, dScore1: e.target.value },
                                      });
                                    }}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">D2 심판</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    placeholder="0.0"
                                    value={regScore.dScore2}
                                    onChange={(e) => {
                                      setScores({
                                        ...scores,
                                        [registration.id]: { ...regScore, dScore2: e.target.value },
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* E점수 (실시) */}
                            <div className="space-y-2">
                              <Label className="text-green-600 font-semibold">E점수 (실시)</Label>
                              <div className="grid grid-cols-2 gap-2">
                                {[1, 2, 3, 4].map((num) => (
                                  <div key={num}>
                                    <Label className="text-xs">E{num} 심판</Label>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      placeholder="0.0"
                                      value={regScore[`eScore${num}` as keyof typeof regScore]}
                                      onChange={(e) => {
                                        setScores({
                                          ...scores,
                                          [registration.id]: {
                                            ...regScore,
                                            [`eScore${num}`]: e.target.value,
                                          },
                                        });
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* 감점 */}
                            <div className="space-y-2">
                              <Label className="text-red-600 font-semibold">감점</Label>
                              <Input
                                type="number"
                                step="0.1"
                                placeholder="0.0"
                                value={regScore.deductions}
                                onChange={(e) => {
                                  setScores({
                                    ...scores,
                                    [registration.id]: { ...regScore, deductions: e.target.value },
                                  });
                                }}
                              />
                              <p className="text-xs text-muted-foreground">
                                착지, 라인 이탈 등의 감점
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const final = calculateFinalScore(registration.id);
                                toast({
                                  title: '점수 계산',
                                  description: `최종 점수: ${final.toFixed(2)}점`,
                                });
                              }}
                            >
                              <Calculator className="mr-2 h-4 w-4" />
                              계산
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveScore(registration)}
                              disabled={!regScore.dScore1 || !regScore.eScore1}
                            >
                              <Save className="mr-2 h-4 w-4" />
                              저장
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}

                {registrations?.filter(reg => reg.registeredEvents.includes(event.id)).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    이 종목에 참가자가 없습니다
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </main>
  );
}
