'use client';
import { useState, useEffect } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { GymnasticsCompetition, CompetitionResult, Certificate } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Trophy, 
  TrendingUp, 
  Users, 
  Target,
  Medal,
  Award,
  Calendar,
  Download,
  BarChart3
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function StatisticsPage() {
  const { _user } = useUser();
  const firestore = useFirestore();
  const [selectedPeriod, setSelectedPeriod] = useState<'3months' | '6months' | '1year' | 'all'>('6months');

  // 모든 시합 결과 조회
  const resultsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'competition_results'),
      orderBy('calculatedAt', 'desc')
    );
  }, [firestore]);
  const { data: allResults, isLoading: isResultsLoading } = useCollection<CompetitionResult>(resultsQuery);

  // 모든 시합 조회
  const competitionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'competitions'),
      orderBy('competitionDate', 'desc')
    );
  }, [firestore]);
  const { data: competitions } = useCollection<GymnasticsCompetition>(competitionsQuery);

  // 모든 인증서 조회
  const certificatesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'certificates'),
      orderBy('issuedAt', 'desc')
    );
  }, [firestore]);
  const { data: certificates } = useCollection<Certificate>(certificatesQuery);

  // 기간별 데이터 필터링
  const getFilteredData = () => {
    if (!allResults || !competitions || !certificates) return { results: [], competitions: [], certificates: [] };

    let fromDate: Date;
    const now = new Date();

    switch (selectedPeriod) {
      case '3months':
        fromDate = subMonths(now, 3);
        break;
      case '6months':
        fromDate = subMonths(now, 6);
        break;
      case '1year':
        fromDate = subMonths(now, 12);
        break;
      default:
        return { results: allResults, competitions, certificates };
    }

    return {
      results: allResults.filter(r => new Date(r.calculatedAt) >= fromDate),
      competitions: competitions.filter(c => c.competitionDate && new Date(c.competitionDate) >= fromDate),
      certificates: certificates.filter(c => new Date(c.issuedAt) >= fromDate)
    };
  };

  const { results, competitions: filteredCompetitions, certificates: filteredCertificates } = getFilteredData();

  // 통계 계산
  const stats = {
    totalCompetitions: filteredCompetitions?.length || 0,
    totalParticipants: results?.length || 0,
    totalCertificates: filteredCertificates?.length || 0,
    totalMedals: results?.reduce((sum, r) => sum + (r.medals?.length || 0), 0) || 0,
    averageScore: results?.length > 0 
      ? results.reduce((sum, r) => sum + r.totalScore, 0) / results.length 
      : 0,
    topScore: results?.length > 0 
      ? Math.max(...results.map(r => r.totalScore))
      : 0
  };

  // 클럽별 통계
  const clubStats = results?.reduce((acc, result) => {
    const clubName = result.clubName || '미분류';
    if (!acc[clubName]) {
      acc[clubName] = {
        name: clubName,
        participants: 0,
        medals: 0,
        totalScore: 0,
        averageScore: 0,
        topScore: 0,
        rankings: [] as number[]
      };
    }
    acc[clubName].participants++;
    acc[clubName].medals += result.medals?.length || 0;
    acc[clubName].totalScore += result.totalScore;
    acc[clubName].topScore = Math.max(acc[clubName].topScore, result.totalScore);
    acc[clubName].rankings.push(result.overallRank);
    return acc;
  }, {} as Record<string, any>) || {};

  // 클럽별 평균 점수 계산
  Object.values(clubStats).forEach((club: any) => {
    club.averageScore = club.participants > 0 ? club.totalScore / club.participants : 0;
    club.averageRank = club.rankings.length > 0 
      ? club.rankings.reduce((sum: number, rank: number) => sum + rank, 0) / club.rankings.length 
      : 0;
  });

  // 클럽 순위 (메달 수 기준)
  const topClubs = Object.values(clubStats)
    .sort((a: any, b: any) => b.medals - a.medals)
    .slice(0, 10);

  // 개인별 통계
  const individualStats = results?.reduce((acc, result) => {
    if (!acc[result.memberId]) {
      acc[result.memberId] = {
        name: result.memberName,
        clubName: result.clubName,
        participations: 0,
        medals: 0,
        totalScore: 0,
        averageScore: 0,
        bestRank: Infinity,
        competitions: [] as string[]
      };
    }
    acc[result.memberId].participations++;
    acc[result.memberId].medals += result.medals?.length || 0;
    acc[result.memberId].totalScore += result.totalScore;
    acc[result.memberId].bestRank = Math.min(acc[result.memberId].bestRank, result.overallRank);
    acc[result.memberId].competitions.push(result.competitionId);
    return acc;
  }, {} as Record<string, any>) || {};

  // 개인별 평균 점수 계산
  Object.values(individualStats).forEach((individual: any) => {
    individual.averageScore = individual.participations > 0 
      ? individual.totalScore / individual.participations 
      : 0;
  });

  // 개인 순위 (메달 수 기준)
  const topIndividuals = Object.values(individualStats)
    .sort((a: any, b: any) => b.medals - a.medals)
    .slice(0, 10);

  // 월별 참가자 수
  const monthlyParticipation = results?.reduce((acc, result) => {
    const month = format(new Date(result.calculatedAt), 'yyyy-MM');
    if (!acc[month]) {
      acc[month] = { month, participants: 0, competitions: new Set() };
    }
    acc[month].participants++;
    acc[month].competitions.add(result.competitionId);
    return acc;
  }, {} as Record<string, any>) || {};

  const monthlyData = Object.values(monthlyParticipation)
    .map((data: any) => ({
      month: data.month,
      participants: data.participants,
      competitions: data.competitions.size
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12); // 최근 12개월

  if (isResultsLoading) {
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
          <h1 className="text-2xl sm:text-3xl font-bold">통계 대시보드</h1>
          <p className="text-muted-foreground mt-1">시합 통계와 성적 분석을 확인하세요</p>
        </div>
        <div className="flex gap-2">
          <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as any)}>
            <TabsList>
              <TabsTrigger value="3months">3개월</TabsTrigger>
              <TabsTrigger value="6months">6개월</TabsTrigger>
              <TabsTrigger value="1year">1년</TabsTrigger>
              <TabsTrigger value="all">전체</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            내보내기
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 시합 수</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompetitions}</div>
            <p className="text-xs text-muted-foreground">
              최근 {selectedPeriod === 'all' ? '전체 기간' : selectedPeriod}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 참가자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParticipants}</div>
            <p className="text-xs text-muted-foreground">
              명의 선수 참가
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 메달 수</CardTitle>
            <Medal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMedals}</div>
            <p className="text-xs text-muted-foreground">
              개의 메달 수여
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 점수</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              최고 점수: {stats.topScore.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <Tabs defaultValue="clubs" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="clubs">클럽 순위</TabsTrigger>
          <TabsTrigger value="individuals">개인 순위</TabsTrigger>
          <TabsTrigger value="monthly">월별 참가</TabsTrigger>
          <TabsTrigger value="events">종목별 분석</TabsTrigger>
        </TabsList>

        <TabsContent value="clubs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                클럽별 순위
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <div className="grid grid-cols-6 bg-muted p-3 text-sm font-semibold">
                  <div>순위</div>
                  <div>클럽명</div>
                  <div>참가자</div>
                  <div>메달</div>
                  <div>평균 점수</div>
                  <div>평균 순위</div>
                </div>
                {topClubs.map((club: any, index: number) => (
                  <div key={club.name} className="grid grid-cols-6 p-3 items-center border-t">
                    <div className="font-semibold">
                      {index < 3 ? (index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉') : index + 1}
                    </div>
                    <div className="font-medium">{club.name}</div>
                    <div>{club.participants}명</div>
                    <div>
                      <Badge variant="outline">{club.medals}개</Badge>
                    </div>
                    <div>{club.averageScore.toFixed(2)}</div>
                    <div>{club.averageRank.toFixed(1)}위</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individuals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                개인별 순위
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <div className="grid grid-cols-6 bg-muted p-3 text-sm font-semibold">
                  <div>순위</div>
                  <div>선수명</div>
                  <div>클럽</div>
                  <div>참가 횟수</div>
                  <div>메달</div>
                  <div>최고 순위</div>
                </div>
                {topIndividuals.map((individual: any, index: number) => (
                  <div key={individual.name} className="grid grid-cols-6 p-3 items-center border-t">
                    <div className="font-semibold">
                      {index < 3 ? (index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉') : index + 1}
                    </div>
                    <div className="font-medium">{individual.name}</div>
                    <div className="text-sm text-muted-foreground">{individual.clubName}</div>
                    <div>{individual.participations}회</div>
                    <div>
                      <Badge variant="outline">{individual.medals}개</Badge>
                    </div>
                    <div>
                      <Badge variant={individual.bestRank === 1 ? 'default' : 'secondary'}>
                        {individual.bestRank}위
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                월별 참가 통계
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlyData.map((data) => (
                  <div key={data.month} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">{data.month}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.competitions}개 시합 개최
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        {data.participants}
                      </p>
                      <p className="text-sm text-muted-foreground">참가자</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                종목별 분석
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold">종목별 통계</p>
                <p className="text-muted-foreground">종목별 참가자 수, 평균 점수 등 상세 분석</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
