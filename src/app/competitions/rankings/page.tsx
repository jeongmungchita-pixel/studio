'use client';
import { useState, useEffect } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { GymnasticsCompetition, CompetitionResult } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Trophy, Medal, Download, Eye, Award } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import Link from 'next/link';

export default function CompetitionRankingsPage() {
  const { _user } = useUser();
  const firestore = useFirestore();
  const [selectedCompetition, setSelectedCompetition] = useState<GymnasticsCompetition | null>(null);

  // 완료된 시합 목록 조회
  const competitionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'competitions'),
      where('status', '==', 'completed'),
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

  // 내 결과 조회
  const myResultsQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.uid) return null;
    return query(
      collection(firestore, 'competition_results'),
      where('memberId', '==', _user.uid),
      orderBy('calculatedAt', 'desc')
    );
  }, [firestore, _user?.uid]);
  const { data: myResults } = useCollection<CompetitionResult>(myResultsQuery);

  // 메달 아이콘
  const getMedalIcon = (type: 'gold' | 'silver' | 'bronze') => {
    switch (type) {
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
      default: return '';
    }
  };

  // 순위 배지
  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-100 text-yellow-800">🥇 1위</Badge>;
    if (rank === 2) return <Badge className="bg-gray-100 text-gray-800">🥈 2위</Badge>;
    if (rank === 3) return <Badge className="bg-orange-100 text-orange-800">🥉 3위</Badge>;
    return <Badge variant="outline">{rank}위</Badge>;
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">순위표</h1>
        <p className="text-muted-foreground mt-1">시합 순위와 수상 내역을 확인하세요</p>
      </div>

      {/* 나의 최근 성적 */}
      {myResults && myResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              나의 최근 성적
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myResults.slice(0, 6).map((result) => (
                <div key={result.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{result.memberName}</h4>
                    {getRankBadge(result.overallRank)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {result.clubName} | 총점: {result.totalScore.toFixed(2)}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {result.medals?.map((medal, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {getMedalIcon(medal.type)} {medal.eventName || '종합'}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 시합 선택 */}
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
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                {competition.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">참가자</span>
                  <span className="font-semibold">
                    {results?.filter(r => r.competitionId === competition.id).length || 0}명
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">날짜</span>
                  <span className="font-semibold">
                    {competition.competitionDate ? 
                      format(new Date(competition.competitionDate), 'MM/dd', { locale: ko }) : 
                      ''
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">종목</span>
                  <span className="font-semibold">{competition.events?.length || 0}개</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 상세 순위표 */}
      {selectedCompetition && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {selectedCompetition.title} - 순위표
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
                <Button variant="outline" size="sm">
                  <Eye className="mr-2 h-4 w-4" />
                  전광판
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
              <div className="space-y-6">
                {/* 전체 순위 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">전체 순위</h3>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="grid grid-cols-12 bg-muted p-3 text-sm font-semibold">
                      <div className="col-span-1">순위</div>
                      <div className="col-span-3">선수</div>
                      <div className="col-span-2">클럽</div>
                      <div className="col-span-1">성별</div>
                      <div className="col-span-1">나이</div>
                      <div className="col-span-2">총점</div>
                      <div className="col-span-2">메달</div>
                    </div>
                    {results.map((result, index) => (
                      <div 
                        key={result.id} 
                        className={`grid grid-cols-12 p-3 items-center ${
                          index % 2 === 0 ? 'bg-background' : '-muted/30'
                        } ${result.memberId === _user?.uid ? 'bg-blue-50/50' : ''}`}
                      >
                        <div className="col-span-1">
                          <div className="text-lg font-bold">
                            {index < 3 ? 
                              getMedalIcon(result.medals?.find(m => m.category === 'overall')?.type as any) : 
                              result.overallRank
                            }
                          </div>
                        </div>
                        <div className="col-span-3">
                          <p className="font-semibold">
                            {result.memberName}
                            {result.memberId === _user?.uid && (
                              <Badge variant="outline" className="ml-2 text-xs">나</Badge>
                            )}
                          </p>
                        </div>
                        <div className="col-span-2 text-sm text-muted-foreground">
                          {result.clubName}
                        </div>
                        <div className="col-span-1 text-sm">
                          {result.gender === 'male' ? '남' : '여'}
                        </div>
                        <div className="col-span-1 text-sm">
                          {result.age}세
                        </div>
                        <div className="col-span-2">
                          <p className="font-bold text-blue-600">
                            {result.totalScore.toFixed(2)}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <div className="flex flex-wrap gap-1">
                            {result.medals?.slice(0, 3).map((medal, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {getMedalIcon(medal.type)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 종목별 순위 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">종목별 순위</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCompetition.events?.map((_event) => (
                      <Card key={_event.id}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{_event.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {results
                              .filter(r => r.eventScores?.some(e => e.eventId === _event.id))
                              .sort((a, b) => {
                                const aScore = a.eventScores?.find(e => e.eventId === _event.id)?.total || 0;
                                const bScore = b.eventScores?.find(e => e.eventId === _event.id)?.total || 0;
                                return bScore - aScore;
                              })
                              .slice(0, 5)
                              .map((result) => {
                                const eventScore = result.eventScores?.find(e => e.eventId === _event.id);
                                if (!eventScore) return null;
                                
                                return (
                                  <div 
                                    key={result.id} 
                                    className={`flex items-center justify-between p-2 rounded ${
                                      result.memberId === _user?.uid ? 'bg-blue-50' : 'bg-muted/50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold w-6">
                                        {eventScore.rank || '-'}
                                      </span>
                                      <div>
                                        <p className="text-sm font-medium">
                                          {result.memberName}
                                          {result.memberId === _user?.uid && (
                                            <Badge variant="outline" className="ml-1 text-xs">나</Badge>
                                          )}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{result.clubName}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-bold text-blue-600">
                                        {eventScore.total.toFixed(2)}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        D:{eventScore.difficulty.toFixed(1)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold">결과가 없습니다</p>
                <p className="text-muted-foreground">아직 결과가 집계되지 않았습니다</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
