'use client';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RequireAnyRole } from '@/components/require-role';
import { UserRole, PassRenewalRequest, PassTemplate, MemberPass } from '@/types';
import { CreditCard } from 'lucide-react';
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


  const handleApproveRenewal = async (request: PassRenewalRequest) => {
    if (!firestore) return;

    try {
      const template = passTemplates?.find(t => t.id === request.newTemplateId);
      if (!template) {
        toast({ variant: 'destructive', title: '오류', description: '이용권 템플릿을 찾을 수 없습니다.' });
        return;
      }

      const now = new Date();
      const endDateDate = template.duration ? addDays(now, template.duration) : undefined;

      // 새 이용권 생성
      const newPassRef = doc(collection(firestore, 'member_passes'));
      const newPass: MemberPass = {
        id: newPassRef.id,
        templateId: template.id,
        templateName: template.name,
        memberId: request.memberId,
        memberName: request.memberName,
        clubId: request.clubId,
        type: template.type,
        startDate: now.toISOString(),
        endDate: (endDateDate || now).toISOString(),
        remainingSessions: template.type === 'session-based' ? (template.sessionCount ?? 0) : undefined,
        price: template.price,
        paymentStatus: 'paid',
        status: 'active',
        usageCount: 0,
        createdAt: now.toISOString(),
      };

      await setDoc(newPassRef, newPass);

      // 요청 상태 업데이트
      await updateDoc(doc(firestore, 'pass_renewal_requests', request.id), {
        status: 'approved',
        processedAt: now.toISOString(),
        processedBy: user?.uid || '',
      });

      toast({ title: '승인 완료', description: `${request.memberName}님의 이용권이 활성화되었습니다.` });
    } catch (error) {
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
      toast({ variant: 'destructive', title: '오류 발생', description: '거부 중 오류가 발생했습니다.' });
    }
  };

  const totalPending = renewalRequests?.length || 0;

  return (
    <RequireAnyRole roles={[UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER]}>
      <main className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CreditCard className="h-8 w-8 text-primary" />
              이용권 갱신 승인
            </h1>
            <p className="text-muted-foreground mt-1">
              {user?.clubName || '클럽'}의 이용권 갱신 요청을 승인합니다
            </p>
          </div>
          {totalPending > 0 && (
            <div className="bg-red-500 text-white px-4 py-2 rounded-full font-bold">
              {totalPending}건 대기 중
            </div>
          )}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이용권 갱신 요청</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {renewalRequests?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">승인 대기</p>
          </CardContent>
        </Card>

        <div className="space-y-4">
            <div className="grid gap-4">
              {renewalRequests && renewalRequests.length > 0 ? (
                renewalRequests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{request.memberName}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {(passTemplates?.find(t => t.id === request.newTemplateId)?.name) || '이용권'} 신청
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
        </div>
      </main>
    </RequireAnyRole>
  );
}
