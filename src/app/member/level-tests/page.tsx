'use client';
import { useMemo, useState } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { Member } from '@/types';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Award, 
  TrendingUp, 
  Calendar, 
  Star, 
  Target,
  Users,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LevelTestResult {
  id: string;
  memberId: string;
  testDate: string;
  testType: string;
  level: string;
  score: number;
  maxScore: number;
  status: 'passed' | 'failed' | 'pending';
  judgeName?: string;
  feedback?: string;
  nextTestDate?: string;
  scores: {
    [category: string]: {
      score: number;
      maxScore: number;
      notes?: string;
    };
  };
}

export default function MemberLevelTestsPage() {
  const { _user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'year' | '6months' | '3months'>('all');

  // 1. 회원 정보 조회 (자신 + 자녀)
  const membersByGuardianUidQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.uid) return null;
    return query(collection(firestore, 'members'), where('guardianUserIds', 'array-contains', _user.uid));
  }, [firestore, _user?.uid]);

  const membersByUserQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.uid) return null;
    return query(collection(firestore, 'members'), where('userId', '==', _user.uid));
  }, [firestore, _user?.uid]);

  const { data: guardianMembers } = useCollection<Member>(membersByGuardianUidQuery);
  const { data: ownMembers } = useCollection<Member>(membersByUserQuery);

  // 회원 목록 병합
  const members = useMemo(() => {
    const map = new Map<string, Member>();
    [...(guardianMembers || []), ...(ownMembers || [])].forEach(m => map.set(m.id, m));
    return Array.from(map.values());
  }, [guardianMembers, ownMembers]);

  // 선택된 회원의 레벨테스트 결과 조회
  const levelTestsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedMember) return null;

    let baseQuery = query(
      collection(firestore, 'level_test_results'),
      where('memberId', '==', selectedMember.id),
      orderBy('testDate', 'desc'),
      limit(20)
    );

    // 기간 필터링
    if (selectedPeriod !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (selectedPeriod) {
        case '3months':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(now.getMonth() - 6);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      baseQuery = query(
        collection(firestore, 'level_test_results'),
        where('memberId', '==', selectedMember.id),
        where('testDate', '>=', startDate.toISOString().split('T')[0]),
        orderBy('testDate', 'desc'),
        limit(20)
      );
    }

    return baseQuery;
  }, [firestore, selectedMember, selectedPeriod]);

  const { data: testResults, isLoading: isTestResultsLoading } = useCollection<LevelTestResult>(levelTestsQuery);

  // 레벨테스트 통계
  const testStats = useMemo(() => {
    if (!testResults || testResults.length === 0) {
      return { total: 0, passed: 0, failed: 0, pending: 0, passRate: 0, currentLevel: null };
    }

    const stats = testResults.reduce((acc, result) => {
      acc.total++;
      if (result.status === 'passed') acc.passed++;
      if (result.status === 'failed') acc.failed++;
      if (result.status === 'pending') acc.pending++;
      return acc;
    }, { total: 0, passed: 0, failed: 0, pending: 0, passRate: 0, currentLevel: null as string | null });

    stats.passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
    stats.currentLevel = testResults.find(r => r.status === 'passed')?.level || null;
    
    return stats;
  }, [testResults]);

  // 상태 배지
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />합격</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />불합격</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />심사중</Badge>;
      default:
        return <Badge variant="secondary">알 수 없음</Badge>;
    }
  };

  // 점수 표시
  const getScoreDisplay = (score: number, maxScore: number) => {
    const percentage = Math.round((score / maxScore) * 100);
    const color = percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-yellow-600' : 'text-red-600';
    return (
      <span className={`font-medium ${color}`}>
        {score}/{maxScore} ({percentage}%)
      </span>
    );
  };

  // 레벨 색상
  const getLevelColor = (level: string) => {
    const levelColors: { [key: string]: string } = {
      '초급': 'bg-green-100 text-green-800',
      '중급': 'bg-blue-100 text-blue-800',
      '고급': 'bg-purple-100 text-purple-800',
      '최상급': 'bg-red-100 text-red-800'
    };
    return levelColors[level] || 'bg-gray-100 text-gray-800';
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Award className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>레벨테스트 결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!_user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>로그인 필요</CardTitle>
            <CardDescription>레벨테스트 결과를 보려면 로그인이 필요합니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">레벨테스트 결과</h1>
          <p className="text-muted-foreground">개인별 레벨테스트 기록과 성취를 확인하세요.</p>
        </div>
      </div>

      {/* 회원 선택 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            회원 선택
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedMember?.id || ''} onValueChange={(value) => {
            const member = members.find(m => m.id === value);
            setSelectedMember(member || null);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="조회할 회원을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {members.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name} ({member.status === 'active' ? '활성' : '비활성'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedMember && (
        <>
          {/* 기간 선택 및 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">조회 기간</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="3months">최근 3개월</SelectItem>
                    <SelectItem value="6months">최근 6개월</SelectItem>
                    <SelectItem value="year">최근 1년</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-600">합격</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{testStats.passed}</div>
                <p className="text-xs text-muted-foreground">회</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-600">불합격</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{testStats.failed}</div>
                <p className="text-xs text-muted-foreground">회</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Target className="w-4 h-4 mr-1" />
                  합격률
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{testStats.passRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {testStats.total > 0 ? `${testStats.passed}/${testStats.total}회` : '데이터 없음'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Star className="w-4 h-4 mr-1" />
                  현재 레벨
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testStats.currentLevel ? (
                  <Badge className={getLevelColor(testStats.currentLevel)}>
                    {testStats.currentLevel}
                  </Badge>
                ) : (
                  <div className="text-sm text-muted-foreground">미정</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 레벨테스트 상세 기록 */}
          <Card>
            <CardHeader>
              <CardTitle>레벨테스트 상세 기록</CardTitle>
              <CardDescription>
                {selectedMember.name}님의 레벨테스트 결과 ({testResults?.length || 0}개)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isTestResultsLoading ? (
                <div className="text-center py-8">
                  <Award className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p>레벨테스트 결과를 불러오는 중...</p>
                </div>
              ) : testResults && testResults.length > 0 ? (
                <div className="space-y-4">
                  {testResults.map(result => (
                    <Card key={result.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div>
                              <h4 className="font-semibold">{result.testType}</h4>
                              <p className="text-sm text-muted-foreground">{result.testDate}</p>
                            </div>
                            {getStatusBadge(result.status)}
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{getScoreDisplay(result.score, result.maxScore)}</div>
                            <Badge className={getLevelColor(result.level)}>
                              {result.level}
                            </Badge>
                          </div>
                        </div>

                        {/* 세부 점수 */}
                        <div className="space-y-2 mb-3">
                          <h5 className="text-sm font-medium">세부 점수:</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {Object.entries(result.scores).map(([category, scoreData]) => (
                              <div key={category} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm">{category}</span>
                                <span className="text-sm font-medium">
                                  {getScoreDisplay(scoreData.score, scoreData.maxScore)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 추가 정보 */}
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div>
                            {result.judgeName && <span>심사: {result.judgeName}</span>}
                            {result.nextTestDate && <span className="ml-4">다음 테스트: {result.nextTestDate}</span>}
                          </div>
                        </div>

                        {result.feedback && (
                          <div className="mt-3 p-3 bg-blue-50 rounded">
                            <p className="text-sm"><strong>피드백:</strong> {result.feedback}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>레벨테스트 결과가 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
