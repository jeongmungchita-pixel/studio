'use client';
import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { Member, MemberPass } from '@/types';
import { collection, query, where } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Ticket, User, Baby, Users, AlertCircle, Calendar, CreditCard, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getMemberCategoryLabel, getMemberCategoryColor, calculateAge } from '@/lib/member-utils';
import { format } from 'date-fns';
export default function ClubPassesPage() {
  const { _user } = useUser();
  const firestore = useFirestore();
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'adult' | 'child'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'none'>('all');
  // 1. Fetch ONLY active members for the current club admin
  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.clubId) return null;
    return query(collection(firestore, 'members'), where('clubId', '==', _user.clubId), where('status', '==', 'active'));
  }, [firestore, _user?.clubId]);
  const { data: members, isLoading: areMembersLoading } = useCollection<Member>(membersQuery);
  // Filter members by category
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (categoryFilter === 'all') return members;
    return members.filter(member => {
      const memberCategory = member.memberCategory || 
        (calculateAge(member.dateOfBirth) >= 19 ? 'adult' : 'child');
      return memberCategory === categoryFilter;
    });
  }, [members, categoryFilter]);
  // Count members by category
  const memberCounts = useMemo(() => {
    if (!members) return { all: 0, adult: 0, child: 0 };
    const counts = { all: members.length, adult: 0, child: 0 };
    members.forEach(member => {
      const memberCategory = member.memberCategory || 
        (calculateAge(member.dateOfBirth) >= 19 ? 'adult' : 'child');
      if (memberCategory === 'adult') counts.adult++;
      else counts.child++;
    });
    return counts;
  }, [members]);
  // 2. Fetch all passes for the active members of this club
  const memberIds = useMemo(() => members?.map(m => m.id) || [], [members]);
  const passesQuery = useMemoFirebase(() => {
    if (!firestore || memberIds.length === 0) return null;
    return query(collection(firestore, 'member_passes'), where('memberId', 'in', memberIds));
  }, [firestore, memberIds]);
  const { data: passes, isLoading: arePassesLoading } = useCollection<MemberPass>(passesQuery);
  // 이용권 통계 계산
  const passStats = useMemo(() => {
    if (!passes || !members) return { total: 0, active: 0, expired: 0, none: 0, revenue: 0 };
    const stats = {
      total: members.length,
      active: 0,
      expired: 0, 
      none: 0,
      revenue: 0
    };
    members.forEach(member => {
      const memberPass = passes.find(p => p.id === member.activePassId);
      if (!memberPass) {
        stats.none++;
      } else if (memberPass.status === 'active') {
        stats.active++;
        stats.revenue += memberPass.price || 0;
      } else {
        stats.expired++;
      }
    });
    return stats;
  }, [passes, members]);
  const getPassStatusBadge = (pass: MemberPass | undefined) => {
    if (!pass) return <Badge variant="secondary">이용권 없음 / 만료</Badge>;
    if (pass.type === 'session-based') {
      const used = pass.usageCount ?? 0;
      const remaining = pass.remainingSessions ?? 0;
      return <Badge>{`세션권 (사용 ${used}회 / 남은 ${remaining}회)`}</Badge>;
    }
    if (pass.endDate) {
      const remainingDays = Math.ceil((new Date(pass.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return <Badge>{`기간권 (${remainingDays > 0 ? `${remainingDays}일 남음` : '만료'})`}</Badge>;
    }
    return <Badge>활성 (무제한)</Badge>;
  };
  const isLoading = areMembersLoading || arePassesLoading;
  const renderMemberTable = (membersList: Member[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>선수 이름</TableHead>
          <TableHead>분류</TableHead>
          <TableHead>이용권 상태</TableHead>
          <TableHead>시작일</TableHead>
          <TableHead className="text-right">가격</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {membersList.map(member => {
          const currentPass = passes?.find(p => p.id === member.activePassId);
          const canIssueNewPass = !currentPass || currentPass.status === 'expired';
          const memberCategory = member.memberCategory || 
            (calculateAge(member.dateOfBirth) >= 19 ? 'adult' : 'child');
          const categoryColors = getMemberCategoryColor(memberCategory);
          return (
            <TableRow key={member.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <Image
                    src={
                      member.photoURL ||
                      'https://firebasestorage.googleapis.com/v0/b/studio-2481293716-bdd83.appspot.com/o/public%2Fdefault-avatar.png?alt=media'
                    }
                    alt={member.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                    data-ai-hint="person gymnastics"
                  />
                  <span>{member.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={categoryColors.badge}>
                  {memberCategory === 'adult' ? <User className="inline h-3 w-3 mr-1" /> : <Baby className="inline h-3 w-3 mr-1" />}
                  {getMemberCategoryLabel(memberCategory)}
                </Badge>
              </TableCell>
              <TableCell>
                {getPassStatusBadge(currentPass)}
              </TableCell>
              <TableCell>
                {currentPass ? format(new Date(currentPass.startDate), 'yyyy-MM-dd') : '-'}
              </TableCell>
              <TableCell className="text-right">
                {currentPass ? `${(currentPass.price || 0).toLocaleString()}원` : '-'}
              </TableCell>
            </TableRow>
          )
        })}
        {membersList.length === 0 &&
          <TableRow><TableCell colSpan={4} className="text-center">해당 분류의 활동중인 선수가 없습니다.</TableCell></TableRow>
        }
      </TableBody>
    </Table>
  );
  return (
    <main className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <Ticket className="mr-3 h-8 w-8" />
          이용권 관리
        </h1>
        <p className="text-muted-foreground mb-6">{_user?.clubName || '클럽'}의 전체 이용권 현황입니다</p>
      </div>
      {isLoading ? (
         <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
      ) : (
        <>
              <div className="grid gap-4 mb-6 grid-cols-1 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">전체 회원</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{passStats.total}</div>
                    <p className="text-xs text-muted-foreground">+{memberCounts.adult} 성인, {memberCounts.child} 유소년</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">활성 이용권</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{passStats.active}</div>
                    <p className="text-xs text-muted-foreground">사용 가능</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">이용권 없음</CardTitle>
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{passStats.none}</div>
                    <p className="text-xs text-muted-foreground">신청 필요</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">이번달 매출</CardTitle>
                    <CreditCard className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{passStats.revenue.toLocaleString()}원</div>
                    <p className="text-xs text-muted-foreground">활성 이용권 기준</p>
                  </CardContent>
                </Card>
              </div>
              <Tabs value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as 'all' | 'adult' | 'child')}>
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="all">
                    <Users className="mr-2 h-4 w-4" />
                    전체 ({memberCounts.all})
                  </TabsTrigger>
                  <TabsTrigger value="adult">
                    <User className="mr-2 h-4 w-4" />
                    성인 ({memberCounts.adult})
                  </TabsTrigger>
                  <TabsTrigger value="child">
                    <Baby className="mr-2 h-4 w-4" />
                    주니어 ({memberCounts.child})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="all">
                  {renderMemberTable(filteredMembers)}
                </TabsContent>
                <TabsContent value="adult">
                  {renderMemberTable(filteredMembers)}
                </TabsContent>
                <TabsContent value="child">
                  {renderMemberTable(filteredMembers)}
                </TabsContent>
              </Tabs>
        </>
      )}
    </main>
  );
}
