'use client';
import { useState, useEffect } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { GymnasticsCompetition, CompetitionResult } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Trophy, 
  Medal, 
  Calculator, 
  Download, 
  Eye,
  Users,
  Target,
  Award
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function CompetitionResultsPage() {
  const { _user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedCompetition, setSelectedCompetition] = useState<GymnasticsCompetition | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // 시합 목록 조회
  const competitionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'competitions'),
      orderBy('competitionDate', 'desc')
    );
  }, [firestore]);
  const { data: competitions, isLoading: isCompetitionsLoading } = useCollection<GymnasticsCompetition>(competitionsQuery);

  // 선택된 시합 결과 조회
  const resultsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedCompetition) return null;
    return query(
      collection(firestore, 'competition_results'),
      where('competitionId', '==', selectedCompetition.id),
      orderBy('overallRank', 'asc')
    );
  }, [firestore, selectedCompetition?.id]);
  const { data: results, isLoading: isResultsLoading } = useCollection<CompetitionResult>(resultsQuery);

  // 결과 집계 실행
  const handleCalculateResults = async () => {
    if (!selectedCompetition || !firestore) return;

    setIsCalculating(true);
    try {
      const response = await fetch('/api/admin/competitions/calculate-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          competitionId: selectedCompetition.id
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: '결과 집계 완료',
          description: `${data.results}명의 참가자, ${data.medals}개의 메달이 집계되었습니다.`
        });
      } else {
        toast({
          variant: 'destructive',
          title: '집계 실패',
          description: data.error || '오류가 발생했습니다.'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '집계 실패',
        description: '네트워크 오류가 발생했습니다.'
      });
    } finally {
      setIsCalculating(false);
    }
  };

  // 메달 아이콘
  const getMedalIcon = (type: 'gold' | 'silver' | 'bronze') => {
    switch (type) {
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
      default: return '';
    }
  };

  // 순위 배지 색상
  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-200';
    if (rank === 3) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  if (isCompetitionsLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">시합 결과 관리</h1>
          <p className="text-muted-foreground mt-1">시합 결과를 집계하고 관리하세요</p>
        </div>
      </div>

      {/* Competition Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {competitions?.map((competition) => (
          <Card 
            key={competition.id} 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedCompetition?.id === competition.id 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : ''
            }`}
            onClick={() => setSelectedCompetition(competition)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <Badge variant={
                  competition.status === 'completed' ? 'default' :
                  competition.status === 'in_progress' ? 'secondary' :
                  'outline'
                }>
                  {competition.status === 'completed' ? '완료' :
                   competition.status === 'in_progress' ? '진행중' :
                   competition.status === 'registration_closed' ? '신청마감' :
                   '준비중'}
                </Badge>
                {competition.status === 'completed' && (
                  <Trophy className="h-5 w-5 text-yellow-500" />
                )}
              </div>
              <CardTitle className="text-lg">{competition.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>참가자: {results?.length || 0}명</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span>종목: {(competition.events?.length || 0)}개</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span>메달: {results?.reduce((sum, r) => sum + (r.medals?.length || 0), 0) || 0}개</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Results Display */}
      {selectedCompetition && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {selectedCompetition.title} - 결과
              </CardTitle>
              <div className="flex gap-2">
                {selectedCompetition.status === 'completed' && (
                  <Button
                    onClick={handleCalculateResults}
                    disabled={isCalculating}
                    variant="outline"
                  >
                    {isCalculating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        집계 중...
                      </>
                    ) : (
                      <>
                        <Calculator className="mr-2 h-4 w-4" />
                        재집계
                      </>
                    )}
                  </Button>
                )}
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  내보내기
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isResultsLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : results && results.length > 0 ? (
              <Tabs defaultValue="overall" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overall">전체 순위</TabsTrigger>
                  <TabsTrigger value="events">종목별 순위</TabsTrigger>
                  <TabsTrigger value="medals">메달 집계</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overall" className="space-y-4">
                  <div className="rounded-lg border">
                    {results.map((result, index) => (
                      <div 
                        key={result.id} 
                        className={`flex items-center justify-between p-4 ${
                          index < results.length - 1 ? 'border-b' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {index < 3 ? getMedalIcon(result.medals?.find(m => m.category === 'overall')?.type as any) : result.overallRank}
                            </div>
                            <div className="text-xs text-muted-foreground">순위</div>
                          </div>
                          <div>
                            <p className="font-semibold text-lg">{result.memberName}</p>
                            <p className="text-sm text-muted-foreground">
                              {result.clubName} | {result.gender === 'male' ? '남자' : '여자'} | {result.age}세
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">
                            {result.totalScore.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">총점</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="events" className="space-y-4">
                  {selectedCompetition.events?.map((_event) => (
                    <Card key={_event.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{_event.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-lg border">
                          {results
                            .filter(r => r.eventScores?.some(e => e.eventId === _event.id))
                            .sort((a, b) => {
                              const aScore = a.eventScores?.find(e => e.eventId === _event.id)?.total || 0;
                              const bScore = b.eventScores?.find(e => e.eventId === _event.id)?.total || 0;
                              return bScore - aScore;
                            })
                            .map((result, index) => {
                              const eventScore = result.eventScores?.find(e => e.eventId === _event.id);
                              if (!eventScore) return null;
                              
                              return (
                                <div 
                                  key={result.id} 
                                  className={`flex items-center justify-between p-4 ${
                                    index < results.length - 1 ? 'border-b' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="text-center">
                                      <div className="text-xl font-bold">
                                        {index < 3 ? getMedalIcon(result.medals?.find(m => m.eventId === _event.id)?.type as any) : eventScore.rank}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="font-semibold">{result.memberName}</p>
                                      <p className="text-sm text-muted-foreground">{result.clubName}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xl font-bold text-blue-600">
                                      {eventScore.total.toFixed(2)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      D: {eventScore.difficulty.toFixed(1)} | E: {eventScore.execution.toFixed(1)}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="medals" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['gold', 'silver', 'bronze'].map((medalType) => {
                      const medalResults = results.filter(r => 
                        r.medals?.some(m => m.type === medalType)
                      );
                      
                      return (
                        <Card key={medalType}>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <span className="text-2xl">
                                {medalType === 'gold' ? '🥇' : medalType === 'silver' ? '🥈' : '🥉'}
                              </span>
                              {medalType === 'gold' ? '금메달' : medalType === 'silver' ? '은메달' : '동메달'}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {medalResults.map((result) => (
                                <div key={result.id} className="flex items-center justify-between p-2 rounded bg-muted">
                                  <div>
                                    <p className="font-semibold text-sm">{result.memberName}</p>
                                    <p className="text-xs text-muted-foreground">{result.clubName}</p>
                                  </div>
                                  <Badge variant="outline">
                                    {result.medals?.filter(m => m.type === medalType).length}개
                                  </Badge>
                                </div>
                              ))}
                              {medalResults.length === 0 && (
                                <p className="text-center text-muted-foreground py-4">수상자 없음</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold">결과가 없습니다</p>
                <p className="text-muted-foreground">시합이 완료된 후 결과를 집계하세요</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
