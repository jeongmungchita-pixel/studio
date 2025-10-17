'use client';

export const dynamic = 'force-dynamic';
import { useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Member, Attendance, MemberPass } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, TrendingUp, Calendar, Award, UserCheck } from 'lucide-react';
import { startOfMonth, endOfMonth, differenceInYears } from 'date-fns';

export default function AnalyticsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  // Fetch members
  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'members'),
      where('clubId', '==', user.clubId)
    );
  }, [firestore, user?.clubId]);
  const { data: members, isLoading: membersLoading } = useCollection<Member>(membersQuery);

  // Fetch attendance this month
  const monthStart = startOfMonth(new Date()).toISOString();
  const monthEnd = endOfMonth(new Date()).toISOString();
  
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'attendance'),
      where('clubId', '==', user.clubId),
      where('date', '>=', monthStart),
      where('date', '<=', monthEnd)
    );
  }, [firestore, user?.clubId, monthStart, monthEnd]);
  const { data: attendances } = useCollection<Attendance>(attendanceQuery);

  // Fetch active passes
  const passesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'member_passes'),
      where('clubId', '==', user.clubId),
      where('status', '==', 'active')
    );
  }, [firestore, user?.clubId]);
  const { data: passes } = useCollection<MemberPass>(passesQuery);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!members) return null;

    const totalMembers = members.length;
    const activeMembers = passes?.length || 0;
    
    // New members this month
    const newMembers = members.filter(m => {
      if (!m.joinDate) return false;
      const joinDate = new Date(m.joinDate);
      return joinDate >= new Date(monthStart) && joinDate <= new Date(monthEnd);
    }).length;

    // Attendance stats
    const presentCount = attendances?.filter(a => a.status === 'present').length || 0;
    const totalAttendance = attendances?.length || 0;
    const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

    // Level distribution
    const levelDist: Record<string, number> = {};
    members.forEach(m => {
      const level = m.level || '미설정';
      levelDist[level] = (levelDist[level] || 0) + 1;
    });

    // Age distribution
    const ageDist: Record<string, number> = {
      '유아 (0-6세)': 0,
      '초등 (7-12세)': 0,
      '중등 (13-15세)': 0,
      '고등 (16-18세)': 0,
      '성인 (19세+)': 0,
    };
    
    members.forEach(m => {
      if (!m.dateOfBirth) return;
      const age = differenceInYears(new Date(), new Date(m.dateOfBirth));
      if (age <= 6) ageDist['유아 (0-6세)']++;
      else if (age <= 12) ageDist['초등 (7-12세)']++;
      else if (age <= 15) ageDist['중등 (13-15세)']++;
      else if (age <= 18) ageDist['고등 (16-18세)']++;
      else ageDist['성인 (19세+)']++;
    });

    // Gender distribution
    const genderDist = {
      male: members.filter(m => m.gender === 'male').length,
      female: members.filter(m => m.gender === 'female').length,
    };

    return {
      totalMembers,
      activeMembers,
      newMembers,
      presentCount,
      attendanceRate,
      levelDist,
      ageDist,
      genderDist,
    };
  }, [members, passes, attendances, monthStart, monthEnd]);

  if (membersLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">통계 및 분석</h1>
        <p className="text-muted-foreground mt-1">클럽 운영 현황을 한눈에 확인하세요</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 회원</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}명</div>
            <p className="text-xs text-muted-foreground mt-1">
              이번 달 +{stats.newMembers}명
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 회원</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeMembers}명</div>
            <p className="text-xs text-muted-foreground mt-1">
              이용권 보유 회원
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 출석</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.presentCount}회</div>
            <p className="text-xs text-muted-foreground mt-1">
              출석률 {stats.attendanceRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활동률</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalMembers > 0 ? ((stats.activeMembers / stats.totalMembers) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              활성 회원 비율
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Level Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              레벨 분포
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats.levelDist).map(([level, count]) => (
              <div key={level} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{level}</span>
                  <span className="text-muted-foreground">{count}명 ({((count / stats.totalMembers) * 100).toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(count / stats.totalMembers) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Age Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              연령 분포
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats.ageDist).map(([age, count]) => (
              <div key={age} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{age}</span>
                  <span className="text-muted-foreground">{count}명 ({((count / stats.totalMembers) * 100).toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${(count / stats.totalMembers) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              성별 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-2xl">👦</span>
                  </div>
                  <div>
                    <p className="font-semibold">남자</p>
                    <p className="text-sm text-muted-foreground">{stats.genderDist.male}명</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {((stats.genderDist.male / stats.totalMembers) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
                    <span className="text-2xl">👧</span>
                  </div>
                  <div>
                    <p className="font-semibold">여자</p>
                    <p className="text-sm text-muted-foreground">{stats.genderDist.female}명</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-pink-600">
                  {((stats.genderDist.female / stats.totalMembers) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              이번 달 요약
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="font-medium">신규 회원</span>
              <span className="text-2xl font-bold text-green-600">+{stats.newMembers}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="font-medium">총 출석</span>
              <span className="text-2xl font-bold text-blue-600">{stats.presentCount}회</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="font-medium">출석률</span>
              <span className="text-2xl font-bold text-purple-600">{stats.attendanceRate.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
