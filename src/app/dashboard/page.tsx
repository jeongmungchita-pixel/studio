'use client';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Building, Trophy, CalendarCheck, Loader2 } from 'lucide-react';
import type { Member, Club, Competition } from '@/types';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useRole } from '@/hooks/use-role';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const { userRole } = useRole();
  const firestore = useFirestore();
  const router = useRouter();
  
  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'members'), where('guardianIds', 'array-contains', user.uid));
  }, [firestore, user]);
  
  const { data: userAssociatedMembers, isLoading: isMembersLoading } = useCollection<Member>(membersQuery);

  // 역할별로 다른 데이터 쿼리
  const allMembersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    // 클럽 관리자는 자신의 클럽 회원만
    if ((user.role === UserRole.CLUB_OWNER || user.role === UserRole.CLUB_MANAGER) && user.clubId) {
      return query(collection(firestore, 'members'), where('clubId', '==', user.clubId));
    }
    // 연맹 관리자는 모든 회원
    return collection(firestore, 'members');
  }, [firestore, user]);
  const { data: allMembers, isLoading: areAllMembersLoading } = useCollection<Member>(allMembersQuery);

  const clubsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    // 클럽 관리자는 자신의 클럽만
    if ((user.role === UserRole.CLUB_OWNER || user.role === UserRole.CLUB_MANAGER) && user.clubId) {
      return query(collection(firestore, 'clubs'), where('__name__', '==', user.clubId));
    }
    // 연맹 관리자는 모든 클럽
    return collection(firestore, 'clubs');
  }, [firestore, user]);
  const { data: clubs, isLoading: isClubsLoading } = useCollection<Club>(clubsQuery);

  const competitionsCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'competitions') : null), [firestore]);
  const { data: competitions, isLoading: isCompetitionsLoading } = useCollection<Competition>(competitionsCollection);

  const isProfileComplete = useMemo(() => {
    if (!user || !userAssociatedMembers) return false;
    // For members, check if they are associated with any member profiles.
    if (user.role === UserRole.MEMBER || user.role === UserRole.PARENT) {
      return userAssociatedMembers.length > 0;
    }
    // For admins and club-admins, profile is always considered complete in this context.
    return true;
  }, [user, userAssociatedMembers]);

  if (isUserLoading || isMembersLoading || isClubsLoading || isCompetitionsLoading || areAllMembersLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Only redirect 'member' role if their profile is incomplete.
  if (user && (user.role === UserRole.MEMBER || user.role === UserRole.PARENT) && !isProfileComplete) {
    return (
      <main className="flex-1 p-6 flex items-center justify-center">
        <Card className="w-full max-w-lg text-center">
            <CardHeader>
                <CardTitle>프로필 완성하기</CardTitle>
                <CardDescription>
                    KGF 넥서스의 모든 기능을 사용하려면 선수 또는 학부모 정보를 등록해야 합니다.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                    아래 버튼을 눌러 선수 및 학부모 정보를 입력하고 클럽에 승인을 요청하세요.
                </p>
                <Button onClick={() => router.push('/profile-setup')}>정보 입력하기</Button>
            </CardContent>
        </Card>
      </main>
    )
  }

  const upcomingCompetitions = competitions?.filter(
    (c) => new Date(c.startDate) > new Date()
  ) || [];

  // 역할별 레이블 설정
  const getMembersLabel = () => {
    if (userRole === UserRole.CLUB_OWNER || userRole === UserRole.CLUB_MANAGER) {
      return '클럽 회원 수';
    }
    if (userRole === UserRole.MEMBER || userRole === UserRole.PARENT) {
      return '내 가족 회원';
    }
    return '총 회원 수';
  };

  const getClubsLabel = () => {
    if (userRole === UserRole.CLUB_OWNER || userRole === UserRole.CLUB_MANAGER) {
      return '내 클럽';
    }
    return '활동 중인 클럽';
  };

  const displayMembers = userRole === UserRole.MEMBER || userRole === UserRole.PARENT 
    ? userAssociatedMembers 
    : allMembers;

  return (
    <div className="p-8 space-y-6">
      {/* 간단한 헤더 */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">대시보드</h1>
        <p className="mt-1 text-sm text-slate-600">
          {userRole === UserRole.CLUB_OWNER || userRole === UserRole.CLUB_MANAGER 
            ? '클럽 현황' 
            : userRole === UserRole.MEMBER || userRole === UserRole.PARENT
            ? '내 정보'
            : 'KGF 넥서스 전체 현황'}
        </p>
      </div>

      {/* 통계 카드 - 간결하게 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">{getMembersLabel()}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{displayMembers?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">{getClubsLabel()}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{clubs?.length || 0}</p>
              </div>
              <Building className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">예정된 대회</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{upcomingCompetitions.length}</p>
              </div>
              <Trophy className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">이번 달 활동</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">-</p>
              </div>
              <CalendarCheck className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* 예정된 대회 */}
      {upcomingCompetitions.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">예정된 대회</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingCompetitions.slice(0, 5).map((comp) => (
                <div 
                  key={comp.id} 
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
                  onClick={() => router.push(`/competitions/${comp.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                      <Trophy className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{comp.name}</p>
                      <p className="text-sm text-slate-500">{comp.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(comp.startDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
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
