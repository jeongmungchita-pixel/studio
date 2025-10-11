'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PendingApprovalCard } from '@/components/pending-approval-card';
import { RequireRole } from '@/components/require-role';
import { UserRole } from '@/types';
import { Users, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { useUser } from '@/hooks/use-user';

// 임시 데이터
const mockApprovals = {
  familyParents: [
    {
      userId: '1',
      userName: '김부모',
      userEmail: 'parent1@example.com',
      requestedRole: UserRole.PARENT,
      familyType: 'individual' as const,
      requestedAt: new Date().toISOString(),
      status: 'pending' as const,
    },
    {
      userId: '2',
      userName: '이가족',
      userEmail: 'family@example.com',
      requestedRole: UserRole.PARENT,
      familyType: 'parent' as const,
      requestedAt: new Date().toISOString(),
      status: 'pending' as const,
    },
  ],
  coaches: [
    {
      userId: '3',
      userName: '최코치',
      userEmail: 'coach@example.com',
      requestedRole: UserRole.HEAD_COACH,
      requestedAt: new Date().toISOString(),
      status: 'pending' as const,
    },
  ],
};

export default function ClubApprovalsPage() {
  const { user } = useUser();
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
    approvals.familyParents.filter(a => a.status === 'pending').length +
    approvals.coaches.filter(a => a.status === 'pending').length;

  return (
    <RequireRole role={UserRole.CLUB_OWNER}>
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
              <CardTitle className="text-sm font-medium">부모/가족</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {approvals.familyParents.filter(a => a.status === 'pending').length}
              </div>
              <p className="text-xs text-muted-foreground">승인 대기</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">코치/직원</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {approvals.coaches.filter(a => a.status === 'pending').length}
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
            <TabsTrigger value="parents">
              부모/가족 ({approvals.familyParents.filter(a => a.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="coaches">
              코치/직원 ({approvals.coaches.filter(a => a.status === 'pending').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {[...approvals.familyParents, ...approvals.coaches]
                .filter(a => a.status === 'pending')
                .map((approval) => (
                  <PendingApprovalCard
                    key={approval.userId}
                    {...approval}
                    clubName={user?.clubName}
                    onApprove={() => handleApprove(approval.userId, 
                      approvals.familyParents.includes(approval) ? 'familyParents' : 'coaches'
                    )}
                    onReject={(reason) => handleReject(approval.userId, reason,
                      approvals.familyParents.includes(approval) ? 'familyParents' : 'coaches'
                    )}
                  />
                ))}
            </div>
            {totalPending === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">승인 대기 중인 요청이 없습니다</h3>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="parents" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {approvals.familyParents.filter(a => a.status === 'pending').map((approval) => (
                <PendingApprovalCard
                  key={approval.userId}
                  {...approval}
                  clubName={user?.clubName}
                  onApprove={() => handleApprove(approval.userId, 'familyParents')}
                  onReject={(reason) => handleReject(approval.userId, reason, 'familyParents')}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="coaches" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {approvals.coaches.filter(a => a.status === 'pending').map((approval) => (
                <PendingApprovalCard
                  key={approval.userId}
                  {...approval}
                  clubName={user?.clubName}
                  onApprove={() => handleApprove(approval.userId, 'coaches')}
                  onReject={(reason) => handleReject(approval.userId, reason, 'coaches')}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </RequireRole>
  );
}
