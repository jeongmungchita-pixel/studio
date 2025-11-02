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
  Trophy, 
  Medal, 
  Calendar, 
  Target,
  Users,
  Star,
  Award,
  TrendingUp,
  MapPin,
  Crown
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CompetitionResult {
  id: string;
  memberId: string;
  competitionName: string;
  competitionDate: string;
  competitionType: string;
  category: string;
  rank?: number;
  score?: number;
  maxScore?: number;
  status: 'participated' | 'awarded' | 'pending';
  location?: string;
  organizer?: string;
  achievements?: {
    type: 'gold' | 'silver' | 'bronze' | 'participation';
    description: string;
  }[];
  notes?: string;
}

export default function MemberCompetitionsPage() {
  const { _user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'year' | '2years' | '3years'>('all');

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

  // 선택된 회원의 시합 기록 조회
  const competitionsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedMember) return null;

    let baseQuery = query(
      collection(firestore, 'competition_results'),
      where('memberId', '==', selectedMember.id),
      orderBy('competitionDate', 'desc'),
      limit(30)
    );

    // 기간 필터링
    if (selectedPeriod !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (selectedPeriod) {
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case '2years':
          startDate.setFullYear(now.getFullYear() - 2);
          break;
        case '3years':
          startDate.setFullYear(now.getFullYear() - 3);
          break;
      }
      
      baseQuery = query(
        collection(firestore, 'competition_results'),
        where('memberId', '==', selectedMember.id),
        where('competitionDate', '>=', startDate.toISOString().split('T')[0]),
        orderBy('competitionDate', 'desc'),
        limit(30)
      );
    }

    return baseQuery;
  }, [firestore, selectedMember, selectedPeriod]);

  const { data: competitionResults, isLoading: isCompetitionsLoading } = useCollection<CompetitionResult>(competitionsQuery);

  // 시합 통계
  const competitionStats = useMemo(() => {
    if (!competitionResults || competitionResults.length === 0) {
      return { 
        total: 0, 
        gold: 0, 
        silver: 0, 
        bronze: 0, 
        participated: 0,
        bestRank: null,
        totalScore: 0 
      };
    }

    const stats = competitionResults.reduce((acc, result) => {
      acc.total++;
      
      // 성적 집계
      if (result.achievements) {
        result.achievements.forEach(achievement => {
          switch (achievement.type) {
            case 'gold':
              acc.gold++;
              break;
            case 'silver':
              acc.silver++;
              break;
            case 'bronze':
              acc.bronze++;
              break;
            case 'participation':
              acc.participated++;
              break;
          }
        });
      } else {
        acc.participated++;
      }

      // 최고 순위
      if (result.rank && (!acc.bestRank || result.rank < acc.bestRank)) {
        acc.bestRank = result.rank;
      }

      // 총점
      if (result.score) {
        acc.totalScore += result.score;
      }

      return acc;
    }, { 
      total: 0, 
      gold: 0, 
      silver: 0, 
      bronze: 0, 
      participated: 0,
      bestRank: null as number | null,
      totalScore: 0 
    });

    return stats;
  }, [competitionResults]);

  // 상태 배지
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'awarded':
        return <Badge className="bg-yellow-100 text-yellow-800"><Trophy className="w-3 h-3 mr-1" />수상</Badge>;
      case 'participated':
        return <Badge className="bg-blue-100 text-blue-800"><Medal className="w-3 h-3 mr-1" />참가</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800">진행중</Badge>;
      default:
        return <Badge variant="secondary">알 수 없음</Badge>;
    }
  };

  // 순위 배지
  const getRankBadge = (rank?: number) => {
    if (!rank) return null;
    
    if (rank === 1) {
      return <Badge className="bg-yellow-100 text-yellow-800"><Crown className="w-3 h-3 mr-1" />1위</Badge>;
    } else if (rank === 2) {
      return <Badge className="bg-gray-100 text-gray-800">2위</Badge>;
    } else if (rank === 3) {
      return <Badge className="bg-orange-100 text-orange-800">3위</Badge>;
    } else if (rank <= 10) {
      return <Badge className="bg-green-100 text-green-800">{rank}위</Badge>;
    } else {
      return <Badge variant="outline">{rank}위</Badge>;
    }
  };

  // 성적 아이콘
  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'gold':
        return <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center"><Star className="w-3 h-3 text-white" /></div>;
      case 'silver':
        return <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center"><Medal className="w-3 h-3 text-white" /></div>;
      case 'bronze':
        return <div className="w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center"><Award className="w-3 h-3 text-white" /></div>;
      case 'participation':
        return <div className="w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center"><Users className="w-3 h-3 text-white" /></div>;
      default:
        return <div className="w-6 h-6 bg-gray-300 rounded-full" />;
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Trophy className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>시합 기록을 불러오는 중...</p>
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
            <CardDescription>시합 기록을 보려면 로그인이 필요합니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">시합 기록</h1>
          <p className="text-muted-foreground">개인별 시합 참가 기록과 성취를 확인하세요.</p>
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
                    <SelectItem value="year">최근 1년</SelectItem>
                    <SelectItem value="2years">최근 2년</SelectItem>
                    <SelectItem value="3years">최근 3년</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">총 참가</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{competitionStats.total}</div>
                <p className="text-xs text-muted-foreground">회</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Star className="w-4 h-4 mr-1 text-yellow-500" />
                  금메달
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{competitionStats.gold}</div>
                <p className="text-xs text-muted-foreground">개</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Medal className="w-4 h-4 mr-1 text-gray-500" />
                  은메달
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{competitionStats.silver}</div>
                <p className="text-xs text-muted-foreground">개</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Award className="w-4 h-4 mr-1 text-orange-500" />
                  동메달
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{competitionStats.bronze}</div>
                <p className="text-xs text-muted-foreground">개</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Target className="w-4 h-4 mr-1" />
                  최고 순위
                </CardTitle>
              </CardHeader>
              <CardContent>
                {competitionStats.bestRank ? (
                  <div className="text-2xl font-bold">
                    {getRankBadge(competitionStats.bestRank)}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">기록 없음</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 시합 상세 기록 */}
          <Card>
            <CardHeader>
              <CardTitle>시합 상세 기록</CardTitle>
              <CardDescription>
                {selectedMember.name}님의 시합 참가 기록 ({competitionResults?.length || 0}개)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCompetitionsLoading ? (
                <div className="text-center py-8">
                  <Trophy className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p>시합 기록을 불러오는 중...</p>
                </div>
              ) : competitionResults && competitionResults.length > 0 ? (
                <div className="space-y-4">
                  {competitionResults.map(result => (
                    <Card key={result.id} className="border-l-4 border-l-yellow-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div>
                              <h4 className="font-semibold">{result.competitionName}</h4>
                              <p className="text-sm text-muted-foreground">{result.competitionDate}</p>
                            </div>
                            {getStatusBadge(result.status)}
                          </div>
                          <div className="text-right">
                            {result.rank && getRankBadge(result.rank)}
                            {result.score && (
                              <div className="text-sm font-medium mt-1">
                                점수: {result.score}{result.maxScore && `/${result.maxScore}`}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 성적 정보 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-muted-foreground">종목</p>
                            <p className="font-medium">{result.category}</p>
                          </div>
                          {result.location && (
                            <div>
                              <p className="text-sm text-muted-foreground">장소</p>
                              <p className="font-medium flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {result.location}
                              </p>
                            </div>
                          )}
                          {result.organizer && (
                            <div>
                              <p className="text-sm text-muted-foreground">주최</p>
                              <p className="font-medium">{result.organizer}</p>
                            </div>
                          )}
                        </div>

                        {/* 성취 목록 */}
                        {result.achievements && result.achievements.length > 0 && (
                          <div className="space-y-2 mb-3">
                            <h5 className="text-sm font-medium">성취:</h5>
                            <div className="flex flex-wrap gap-2">
                              {result.achievements.map((achievement, index) => (
                                <div key={index} className="flex items-center space-x-2 bg-gray-50 rounded-full px-3 py-1">
                                  {getAchievementIcon(achievement.type)}
                                  <span className="text-sm">{achievement.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 메모 */}
                        {result.notes && (
                          <div className="p-3 bg-blue-50 rounded">
                            <p className="text-sm"><strong>메모:</strong> {result.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>시합 기록이 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
