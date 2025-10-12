'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PendingApprovalCard } from '@/components/pending-approval-card';
import { RequireRole } from '@/components/require-role';
import { UserRole } from '@/types';
import { Shield, Users, Building2, Trophy } from 'lucide-react';
import { useState } from 'react';

// TODO: Firestore에서 실제 승인 요청 데이터를 가져와야 합니다
const mockApprovals = {
  federationAdmin: [] as any[],
  clubOwner: [] as any[],
};

export default function AdminApprovalsPage() {
  const [approvals, setApprovals] = useState(mockApprovals);

  const handleApprove = async (userId: string, category: keyof typeof mockApprovals) => {
    console.log('승인:', userId);
    setApprovals(prev => ({
      ...prev,
      [category]: prev[category].map(item =>
        item.userId === userId ? { ...item, status: 'approved' as const } : item
      ),
    }));
  };

  const handleReject = async (userId: string, reason: string, category: keyof typeof mockApprovals) => {
    console.log('거부:', userId, reason);
    setApprovals(prev => ({
      ...prev,
      [category]: prev[category].map(item =>
        item.userId === userId ? { ...item, status: 'rejected' as const } : item
      ),
    }));
  };

  const totalPending = 
    approvals.federationAdmin.filter(a => a.status === 'pending').length +
    approvals.clubOwner.filter(a => a.status === 'pending').length;

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
                {approvals.federationAdmin.filter(a => a.status === 'pending').length}
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
                {approvals.clubOwner.filter(a => a.status === 'pending').length}
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
              연맹 관리자 ({approvals.federationAdmin.filter(a => a.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="club">
              클럽 오너 ({approvals.clubOwner.filter(a => a.status === 'pending').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {[...approvals.federationAdmin, ...approvals.clubOwner]
                .filter(a => a.status === 'pending')
                .map((approval) => (
                  <PendingApprovalCard
                    key={approval.userId}
                    {...approval}
                    onApprove={() => handleApprove(approval.userId, 
                      approvals.federationAdmin.includes(approval) ? 'federationAdmin' : 'clubOwner'
                    )}
                    onReject={(reason) => handleReject(approval.userId, reason,
                      approvals.federationAdmin.includes(approval) ? 'federationAdmin' : 'clubOwner'
                    )}
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
              {approvals.federationAdmin.filter(a => a.status === 'pending').map((approval) => (
                <PendingApprovalCard
                  key={approval.userId}
                  {...approval}
                  onApprove={() => handleApprove(approval.userId, 'federationAdmin')}
                  onReject={(reason) => handleReject(approval.userId, reason, 'federationAdmin')}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="club" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {approvals.clubOwner.filter(a => a.status === 'pending').map((approval) => (
                <PendingApprovalCard
                  key={approval.userId}
                  {...approval}
                  onApprove={() => handleApprove(approval.userId, 'clubOwner')}
                  onReject={(reason) => handleReject(approval.userId, reason, 'clubOwner')}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </RequireRole>
  );
}
