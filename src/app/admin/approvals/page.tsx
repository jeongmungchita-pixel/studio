'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PendingApprovalCard } from '@/components/pending-approval-card';
import { RequireRole } from '@/components/require-role';
import { UserRole, ApprovalRequest } from '@/types';
import { Shield, Users, Building2, Trophy, Loader2 } from 'lucide-react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';

export default function AdminApprovalsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  // Firestore에서 승인 요청 조회
  const approvalsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'approvalRequests'),
      where('status', '==', 'pending')
    );
  }, [firestore]);

  const { data: allApprovals, isLoading } = useCollection<ApprovalRequest>(approvalsQuery);

  // 역할별로 분류
  const federationAdminApprovals = allApprovals?.filter(
    a => a.requestedRole === UserRole.FEDERATION_ADMIN
  ) || [];
  
  const clubOwnerApprovals = allApprovals?.filter(
    a => a.requestedRole === UserRole.CLUB_OWNER
  ) || [];

  const handleApprove = async (userId: string) => {
    if (!firestore) return;
    
    try {
      // approvalRequests 컬렉션에서 해당 요청 찾기
      const approval = allApprovals?.find(a => a.userId === userId);
      if (!approval) return;

      const approvalRef = doc(firestore, 'approvalRequests', approval.id);
      await updateDoc(approvalRef, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
      });

      toast({
        title: '승인 완료',
        description: `${approval.userName}님의 요청이 승인되었습니다.`,
      });
    } catch (error) {
      console.error('승인 오류:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '승인 처리 중 오류가 발생했습니다.',
      });
    }
  };

  const handleReject = async (userId: string, reason: string) => {
    if (!firestore) return;

    try {
      const approval = allApprovals?.find(a => a.userId === userId);
      if (!approval) return;

      const approvalRef = doc(firestore, 'approvalRequests', approval.id);
      await updateDoc(approvalRef, {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason,
      });

      toast({
        title: '거부 완료',
        description: `${approval.userName}님의 요청이 거부되었습니다.`,
      });
    } catch (error) {
      console.error('거부 오류:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '거부 처리 중 오류가 발생했습니다.',
      });
    }
  };

  const totalPending = (allApprovals?.length || 0);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <RequireRole role={UserRole.SUPER_ADMIN}>
      <main className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              승인 관리
            </h1>
            <p className="text-muted-foreground mt-1">
              연맹 관리자, 클럽 오너 등의 가입 신청을 승인합니다
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
              <CardTitle className="text-sm font-medium">연맹 관리자</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {federationAdminApprovals.length}
              </div>
              <p className="text-xs text-muted-foreground">승인 대기</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">클럽 오너</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clubOwnerApprovals.length}
              </div>
              <p className="text-xs text-muted-foreground">승인 대기</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              전체 ({totalPending})
            </TabsTrigger>
            <TabsTrigger value="federation">
              연맹 관리자 ({federationAdminApprovals.length})
            </TabsTrigger>
            <TabsTrigger value="club">
              클럽 오너 ({clubOwnerApprovals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {allApprovals?.map((approval) => (
                <PendingApprovalCard
                  key={approval.userId}
                  {...approval}
                  onApprove={() => handleApprove(approval.userId)}
                  onReject={(reason) => handleReject(approval.userId, reason)}
                />
              ))}
            </div>
            {totalPending === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">승인 대기 중인 요청이 없습니다</h3>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="federation" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {federationAdminApprovals.map((approval) => (
                <PendingApprovalCard
                  key={approval.userId}
                  {...approval}
                  onApprove={() => handleApprove(approval.userId)}
                  onReject={(reason) => handleReject(approval.userId, reason)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="club" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {clubOwnerApprovals.map((approval) => (
                <PendingApprovalCard
                  key={approval.userId}
                  {...approval}
                  onApprove={() => handleApprove(approval.userId)}
                  onReject={(reason) => handleReject(approval.userId, reason)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </RequireRole>
  );
}
