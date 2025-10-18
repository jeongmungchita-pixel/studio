'use client';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Building, Trophy, Award, Loader2, ArrowRight, TrendingUp, Calendar, UserPlus, Building2 } from 'lucide-react';
import { Member, Club, GymnasticsCompetition, Committee } from '@/types';
import { useRouter } from 'next/navigation';
import { useRole } from '@/hooks/use-role';
import { usePageLoading } from '@/hooks/use-page-loading';
import { ErrorFallback } from '@/components/error-fallback';

export default function FederationAdminDashboard() {
  const { user, isUserLoading } = useUser();
  const { hasRole, isFederationAdmin, isSuperAdmin } = useRole();
  const firestore = useFirestore();
  const router = useRouter();

  // 디버깅: 사용자 정보 출력

  // 권한 체크: FEDERATION_ADMIN 또는 SUPER_ADMIN만 접근 가능
  if (!isUserLoading && user) {
    if (!isFederationAdmin && !isSuperAdmin) {
      router.push('/dashboard');
      return (
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }
  }
  
  // 로그인 안 됨
  if (!isUserLoading && !user) {
    router.push('/login');
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // 전체 회원 수
  const membersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'members') : null),
    [firestore]
  );
  const { data: allMembers, isLoading: isMembersLoading, error: membersError } = useCollection<Member>(membersCollection);
  
  // 디버깅: 회원 데이터

  // 에러 처리
  if (membersError) {
    return <ErrorFallback error={membersError} title="회원 데이터 조회 오류" />;
  }

  // 전체 클럽 수
  const clubsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'clubs') : null),
    [firestore]
  );
  const { data: allClubs, isLoading: isClubsLoading, error: clubsError } = useCollection<Club>(clubsCollection);
  
  // 디버깅: 클럽 데이터

  // 에러 처리
  if (clubsError) {
    return <ErrorFallback error={clubsError} title="클럽 데이터 조회 오류" />;
  }

  // 전체 대회
  const competitionsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'competitions') : null),
    [firestore]
  );
  const { data: competitions, isLoading: isCompetitionsLoading, error: competitionsError } = useCollection<GymnasticsCompetition>(competitionsCollection);
  
  // 디버깅: 대회 데이터

  // 에러 처리
  if (competitionsError) {
    return <ErrorFallback error={competitionsError} title="대회 데이터 조회 오류" />;
  }

  // 위원회
  const committeesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'committees') : null),
    [firestore]
  );
  const { data: committees, isLoading: isCommitteesLoading } = useCollection<Committee>(committeesCollection);

  // 최근 가입 회원 (최근 5명)
  const recentMembersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'members'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
  }, [firestore]);
  const { data: recentMembers } = useCollection<Member>(recentMembersQuery);

  // 최근 등록 클럽 (최근 5개)
  const recentClubsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'clubs'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
  }, [firestore]);
  const { data: recentClubs } = useCollection<Club>(recentClubsQuery);

  // 통합 로딩 체크
  const isLoading = usePageLoading(
    isUserLoading,
    isMembersLoading,
    isClubsLoading,
    isCompetitionsLoading,
    isCommitteesLoading
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // 통계 계산
  const activeCompetitions = competitions?.filter(
    (c) => c.status === 'in_progress' || c.status === 'registration_open'
  ) ?? [];

  const activeClubs = allClubs?.filter(
    (c) => c.status === 'active'
  ) ?? [];

  return (
    <div className="p-8 space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">연맹 관리 대시보드</h1>
        <p className="mt-1 text-sm text-slate-600">
          대한검도연맹 전체 현황 및 관리
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/admin/clubs')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">활동 중인 클럽</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{activeClubs.length}</p>
                <p className="mt-1 text-xs text-slate-500">전체 {allClubs?.length || 0}개</p>
              </div>
              <Building className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/admin/members')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">총 회원 수</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{allMembers?.length || 0}</p>
                <p className="mt-1 text-xs text-slate-500">전체 연맹 회원</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/admin/competitions')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">진행 중인 대회</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{activeCompetitions.length}</p>
                <p className="mt-1 text-xs text-slate-500">이번 달 기준</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/admin/committees')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">위원회</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{committees?.length || 0}</p>
                <p className="mt-1 text-xs text-slate-500">활동 중인 위원회</p>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 빠른 액세스 */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">빠른 액세스</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={() => router.push('/admin/clubs')}
            >
              <Building2 className="mr-3 h-5 w-5 text-blue-500" />
              <div className="text-left">
                <div className="font-medium">클럽 관리</div>
                <div className="text-xs text-slate-500">클럽 등록 및 관리</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={() => router.push('/admin/members')}
            >
              <Users className="mr-3 h-5 w-5 text-green-500" />
              <div className="text-left">
                <div className="font-medium">회원 관리</div>
                <div className="text-xs text-slate-500">전체 회원 조회</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={() => router.push('/admin/competitions')}
            >
              <Trophy className="mr-3 h-5 w-5 text-yellow-500" />
              <div className="text-left">
                <div className="font-medium">대회 관리</div>
                <div className="text-xs text-slate-500">대회 등록 및 운영</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={() => router.push('/admin/committees')}
            >
              <TrendingUp className="mr-3 h-5 w-5 text-indigo-500" />
              <div className="text-left">
                <div className="font-medium">위원회 관리</div>
                <div className="text-xs text-slate-500">위원회 및 위원 관리</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={() => router.push('/admin/judges')}
            >
              <Award className="mr-3 h-5 w-5 text-purple-500" />
              <div className="text-left">
                <div className="font-medium">심판 관리</div>
                <div className="text-xs text-slate-500">심판 등록 및 관리</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 최근 가입 회원 */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900">최근 가입 회원</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin/members')}>
              전체 보기 <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentMembers && recentMembers.length > 0 ? (
              <div className="space-y-3">
                {recentMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
                    onClick={() => router.push(`/members/${member.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                        <UserPlus className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{member.name}</p>
                        <p className="text-sm text-slate-500">{member.clubName || '클럽 미지정'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        최근 가입
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">최근 가입 회원이 없습니다</p>
            )}
          </CardContent>
        </Card>

        {/* 최근 등록 클럽 */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900">최근 등록 클럽</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin/clubs')}>
              전체 보기 <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentClubs && recentClubs.length > 0 ? (
              <div className="space-y-3">
                {recentClubs.map((club) => (
                  <div
                    key={club.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
                    onClick={() => router.push(`/clubs/${club.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{club.name}</p>
                        <p className="text-sm text-slate-500">{club.address || '주소 미등록'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        최근 등록
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">최근 등록 클럽이 없습니다</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 예정된 대회 */}
      {activeCompetitions.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900">예정된 대회</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin/competitions')}>
              전체 보기 <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeCompetitions.slice(0, 5).map((comp) => (
                <div
                  key={comp.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
                  onClick={() => router.push('/admin/competitions')}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                      <Trophy className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{comp.title || comp.name}</p>
                      <p className="text-sm text-slate-500">{comp.venue || '장소 미정'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      {comp.competitionDate ? new Date(comp.competitionDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) : '일자 미정'}
                    </p>
                    <p className="text-xs text-slate-500">
                      <Calendar className="inline h-3 w-3 mr-1" />
                      {comp.competitionDate ? new Date(comp.competitionDate).toLocaleDateString('ko-KR') : '-'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
