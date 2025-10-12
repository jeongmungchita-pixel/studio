'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PendingApprovalCard } from '@/components/pending-approval-card';
import { RequireAnyRole } from '@/components/require-role';
import { UserRole, PassRenewalRequest, PassTemplate, MemberPass, Member } from '@/types';
import { Users, UserCheck, CreditCard, Loader2 } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, updateDoc, setDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { addDays, format } from 'date-fns';

export default function ClubApprovalsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // 승인 대기 중인 회원 가져오기
  const pendingMembersQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'members'),
      where('clubId', '==', user.clubId),
      where('status', '==', 'pending')
    );
  }, [firestore, user?.clubId]);
  const { data: pendingMembers, isLoading: isMembersLoading } = useCollection<Member>(pendingMembersQuery);

  // 이용권 갱신 요청 가져오기
  const renewalRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'pass_renewal_requests'),
      where('clubId', '==', user.clubId),
      where('status', '==', 'pending')
    );
  }, [firestore, user?.clubId]);
  const { data: renewalRequests } = useCollection<PassRenewalRequest>(renewalRequestsQuery);

  // 이용권 템플릿 가져오기
  const passTemplatesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(collection(firestore, 'pass_templates'), where('clubId', '==', user.clubId));
  }, [firestore, user?.clubId]);
  const { data: passTemplates } = useCollection<PassTemplate>(passTemplatesQuery);

  const handleApproveMember = async (memberId: string) => {
    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'members', memberId), {
        status: 'active',
        approvedAt: new Date().toISOString(),
        approvedBy: user?.uid,
      });

      toast({
        title: '승인 완료',
        description: '회원이 승인되었습니다.',
      });
    } catch (error) {
      console.error('승인 실패:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '승인 중 오류가 발생했습니다.',
      });
    }
  };

  const handleRejectMember = async (memberId: string, reason: string) => {
    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'members', memberId), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: user?.uid,
        rejectionReason: reason,
      });

      toast({
        title: '거부 완료',
        description: '회원 신청이 거부되었습니다.',
      });
    } catch (error) {
      console.error('거부 실패:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '거부 중 오류가 발생했습니다.',
      });
    }
  };

  const handleApproveRenewal = async (request: PassRenewalRequest) => {
    if (!firestore) return;

    try {
      const template = passTemplates?.find(t => t.id === request.passTemplateId);
      if (!template) {
        toast({ variant: 'destructive', title: '오류', description: '이용권 템플릿을 찾을 수 없습니다.' });
        return;
      }

      const now = new Date();
      const endDate = template.durationDays ? addDays(now, template.durationDays) : undefined;

      // 새 이용권 생성
      const newPassRef = doc(collection(firestore, 'member_passes'));
      const newPass: MemberPass = {
        id: newPassRef.id,
        memberId: request.memberId,
        clubId: request.clubId,
        passName: template.name,
        passType: template.passType || 'unlimited',
        startDate: now.toISOString(),
        endDate: endDate?.toISOString(),
        totalSessions: template.totalSessions,
        attendableSessions: template.attendableSessions,
        remainingSessions: template.totalSessions,
        attendanceCount: 0,
        status: 'active',
      };

      await setDoc(newPassRef, newPass);

      // 요청 상태 업데이트
      await updateDoc(doc(firestore, 'pass_renewal_requests', request.id), {
        status: 'approved',
      });

      toast({ title: '승인 완료', description: `${request.memberName}님의 이용권이 활성화되었습니다.` });
    } catch (error) {
      console.error('Error approving renewal:', error);
      toast({ variant: 'destructive', title: '오류 발생', description: '승인 중 오류가 발생했습니다.' });
    }
  };

  const handleRejectRenewal = async (requestId: string, reason: string) => {
    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'pass_renewal_requests', requestId), {
        status: 'rejected',
        rejectionReason: reason,
      });

      toast({ title: '거부 완료', description: '이용권 갱신 요청이 거부되었습니다.' });
    } catch (error) {
      console.error('Error rejecting renewal:', error);
      toast({ variant: 'destructive', title: '오류 발생', description: '거부 중 오류가 발생했습니다.' });
    }
  };

  if (isMembersLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const totalPending = (pendingMembers?.length || 0) + (renewalRequests?.length || 0);

  return (
    <RequireAnyRole roles={[UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER]}>
      <main className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <UserCheck className="h-8 w-8 text-primary" />
              회원 승인 관리
            </h1>
            <p className="text-muted-foreground mt-1">
              {user?.clubName || '클럽'}의 가입 신청을 승인합니다
            </p>
          </div>
          {totalPending > 0 && (
            <div className="bg-red-500 text-white px-4 py-2 rounded-full font-bold">
              {totalPending}건 대기 중
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">회원 승인</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingMembers?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">승인 대기</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">이용권 갱신</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {renewalRequests?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">승인 대기</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="members" className="space-y-4">
          <TabsList>
            <TabsTrigger value="members">
              회원 승인 ({pendingMembers?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="renewals">
              이용권 갱신 ({renewalRequests?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            {pendingMembers && pendingMembers.length > 0 ? (
              <div className="grid gap-4">
                {pendingMembers.map((member) => (
                  <Card key={member.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{member.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {member.email || '이메일 없음'} • {member.phoneNumber || '전화번호 없음'}
                          </p>
                        </div>
                        <Badge variant="secondary">대기중</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          <p>가족 역할: {member.familyRole || '일반 회원'}</p>
                          <p>상태: 승인 대기</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectMember(member.id, '클럽 사정으로 거부')}
                          >
                            거부
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApproveMember(member.id)}
                          >
                            승인
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">승인 대기 중인 회원이 없습니다</h3>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="renewals" className="space-y-4">
            <div className="grid gap-4">
              {renewalRequests && renewalRequests.length > 0 ? (
                renewalRequests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{request.memberName}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {request.passTemplateName} 신청
                          </p>
                        </div>
                        <Badge variant="secondary">대기중</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          신청일: {format(new Date(request.requestedAt), 'yyyy-MM-dd HH:mm')}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectRenewal(request.id, '클럽 사정으로 거부')}
                          >
                            거부
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApproveRenewal(request)}
                          >
                            승인
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">이용권 갱신 요청이 없습니다</h3>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </RequireAnyRole>
  );
}
