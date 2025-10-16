'use client';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PendingApprovalCard } from '@/components/pending-approval-card';
import { RequireRole } from '@/components/require-role';
import { UserRole, ApprovalRequest, ClubOwnerRequest, Club } from '@/types';
import { Shield, Users, Building2, Trophy, Loader2 } from 'lucide-react';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, query, where, doc, updateDoc, setDoc, writeBatch } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';

export default function AdminApprovalsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // 클럽 오너 가입 신청 조회
  const clubOwnerRequestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'clubOwnerRequests'),
      where('status', '==', 'pending')
    );
  }, [firestore]);

  const { data: clubOwnerRequests, isLoading } = useCollection<ClubOwnerRequest>(clubOwnerRequestsQuery);

  console.log('📊 클럽 오너 신청:', clubOwnerRequests);

  // 클럽 오너 신청만 있음
  const clubOwnerApprovals = clubOwnerRequests || [];
  const federationAdminApprovals: any[] = []; // 추후 구현

  const handleApprove = async (requestId: string) => {
    if (!firestore || !user) return;
    
    try {
      const request = clubOwnerRequests?.find(r => r.id === requestId);
      if (!request) {
        toast({
          variant: 'destructive',
          title: '오류',
          description: '신청을 찾을 수 없습니다.',
        });
        return;
      }

      console.log('👉 승인 처리 시작:', request);

      const batch = writeBatch(firestore);

      // 1. clubOwnerRequest 상태 업데이트
      const requestRef = doc(firestore, 'clubOwnerRequests', requestId);
      batch.update(requestRef, {
        status: 'approved',
        approvedBy: user.uid,
        approvedAt: new Date().toISOString(),
      });

      // 2. 클럽 생성
      const clubRef = doc(collection(firestore, 'clubs'));
      const newClub: Club = {
        id: clubRef.id,
        name: request.clubName,
        contactName: request.name,
        contactEmail: request.email,
        contactPhoneNumber: request.phoneNumber,
        location: request.clubAddress,
        status: 'approved',
      };
      batch.set(clubRef, newClub);

      console.log('🏢 새 클럽 생성:', newClub);

      // 3. 사용자 프로필 업데이트 (이미 존재하는 경우) 또는 생성
      // 비회원 가입인 경우(userId가 빈 문자열) 사용자 프로필은 나중에 로그인 시 생성됨
      if (request.userId && request.userId.trim() !== '') {
        const userRef = doc(firestore, 'users', request.userId);
        batch.set(userRef, {
          id: request.userId,
          uid: request.userId,
          email: request.email,
          displayName: request.name,
          phoneNumber: request.phoneNumber,
          role: UserRole.CLUB_OWNER,
          clubId: clubRef.id,
          clubName: request.clubName,
          status: 'approved',
          approvedBy: user.uid,
          approvedAt: new Date().toISOString(),
        }, { merge: true });
        console.log('👤 사용자 프로필 업데이트:', request.userId);
      } else {
        console.log('⚠️ 비회원 가입 - 사용자 프로필은 로그인 시 생성됩니다');
      }

      await batch.commit();

      console.log('✅ 승인 완료!');

      toast({
        title: '승인 완료',
        description: `${request.name}님의 클럽 오너 신청이 승인되었습니다.`,
      });
    } catch (error) {
      console.error('❌ 승인 오류:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '승인 처리 중 오류가 발생했습니다.',
      });
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    if (!firestore || !user) return;

    try {
      const request = clubOwnerRequests?.find(r => r.id === requestId);
      if (!request) return;

      const requestRef = doc(firestore, 'clubOwnerRequests', requestId);
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectedBy: user.uid,
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason,
      });

      console.log('❌ 거부 완료:', requestId);

      toast({
        title: '거부 완료',
        description: `${request.name}님의 요청이 거부되었습니다.`,
      });
    } catch (error) {
      console.error('❌ 거부 오류:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '거부 처리 중 오류가 발생했습니다.',
      });
    }
  };

  const totalPending = clubOwnerApprovals.length;

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
              {clubOwnerApprovals.map((request) => (
                <PendingApprovalCard
                  key={request.id}
                  userId={request.userId || ''}
                  userName={request.name}
                  userEmail={request.email}
                  requestedRole={UserRole.CLUB_OWNER}
                  requestedAt={request.requestedAt}
                  clubName={request.clubName}
                  phoneNumber={request.phoneNumber}
                  clubAddress={request.clubAddress}
                  status={request.status}
                  onApprove={() => handleApprove(request.id)}
                  onReject={(reason) => handleReject(request.id, reason)}
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
              {clubOwnerApprovals.map((request) => (
                <PendingApprovalCard
                  key={request.id}
                  userId={request.userId || ''}
                  userName={request.name}
                  userEmail={request.email}
                  requestedRole={UserRole.CLUB_OWNER}
                  requestedAt={request.requestedAt}
                  clubName={request.clubName}
                  phoneNumber={request.phoneNumber}
                  clubAddress={request.clubAddress}
                  status={request.status}
                  onApprove={() => handleApprove(request.id)}
                  onReject={(reason) => handleReject(request.id, reason)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </RequireRole>
  );
}
