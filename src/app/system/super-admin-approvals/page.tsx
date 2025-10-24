'use client';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ApprovalActions } from '@/components/approval-actions';
import { Shield, Mail, Phone, Building2, Briefcase, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { UserRole } from '@/types';

// 로컬 타입: 최고 관리자 요청
interface SuperAdminRequest {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  organization: string;
  position: string;
  reason: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  userId?: string;
}


export default function SuperAdminApprovalsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isProcessing, setIsProcessing] = useState(false);

  // Firestore에서 최고 관리자 신청 목록 가져오기
  const requestsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'superAdminRequests') : null),
    [firestore]
  );
  const { data: requests, isLoading: isRequestsLoading } = useCollection<SuperAdminRequest>(requestsCollection);

  const handleApprove = async (id: string) => {
    if (!firestore || !user) return;
    
    setIsProcessing(true);
    try {
      const request = requests?.find(r => r.id === id);
      if (!request) {
        alert('신청을 찾을 수 없습니다.');
        return;
      }

      // SuperAdminRequest 업데이트
      const requestRef = doc(firestore, 'superAdminRequests', id);
      await updateDoc(requestRef, {
        status: 'approved',
        approvedBy: user.uid,
        approvedAt: new Date().toISOString(),
      });

      // 사용자 프로필 업데이트 (이미 존재하는 경우)
      // 비회원 가입인 경우 로그인 시 프로필 생성됨
      if (request.userId && request.userId.trim() !== '') {
        const userRef = doc(firestore, 'users', request.userId);
        await updateDoc(userRef, {
          role: 'SUPER_ADMIN' as UserRole,
          status: 'approved',
          approvedBy: user.uid,
          approvedAt: new Date().toISOString(),
        });
      } else {
      }

      alert('최고 관리자로 승인되었습니다!');
    } catch (error) {
      alert('승인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    if (!firestore || !user) return;
    
    setIsProcessing(true);
    try {
      const request = requests?.find(r => r.id === id);
      if (!request) {
        alert('신청을 찾을 수 없습니다.');
        return;
      }

      // SuperAdminRequest 업데이트
      const requestRef = doc(firestore, 'superAdminRequests', id);
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectedBy: user.uid,
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason,
      });

      // 사용자 프로필 업데이트 (이미 존재하는 경우)
      if (request.userId && request.userId.trim() !== '') {
        const userRef = doc(firestore, 'users', request.userId);
        await updateDoc(userRef, {
          status: 'rejected',
          rejectedBy: user.uid,
          rejectedAt: new Date().toISOString(),
          rejectionReason: reason,
        });
      } else {
      }

      alert('신청이 거부되었습니다.');
    } catch (error) {
      alert('거부 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 로딩 상태
  if (isUserLoading || isRequestsLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = requests?.filter(r => r.status === 'pending').length || 0;

  return (
    <main className="flex-1 p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-red-600" />
            최고 관리자 승인
          </h1>
          <p className="text-muted-foreground mt-1">
            시스템 최고 권한 신청을 검토하고 승인합니다
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="bg-red-500 text-white px-4 py-2 rounded-full font-bold">
            {pendingCount}건 대기 중
          </div>
        )}
      </div>

      {/* 경고 메시지 */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <strong>중요:</strong> 최고 관리자는 시스템의 모든 권한을 가집니다. 
              신청자의 신원과 사유를 철저히 검토한 후 승인하세요.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통계 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">대기 중</CardTitle>
            <Shield className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {requests?.filter(r => r.status === 'pending').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">승인됨</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {requests?.filter(r => r.status === 'approved').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">거부됨</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {requests?.filter(r => r.status === 'rejected').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 신청 목록 */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">신청 목록</h2>
        
        {requests && requests.length > 0 ? (
          <div className="grid gap-4">
            {requests.map((request) => (
              <Card key={request.id} className={
                request.status === 'pending' ? 'border-red-200' :
                request.status === 'approved' ? 'border-green-200' :
                'border-gray-200'
              }>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                        <Shield className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{request.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {request.organization} • {request.position}
                        </p>
                      </div>
                    </div>
                    <Badge className={
                      request.status === 'pending' ? 'bg-yellow-500' :
                      request.status === 'approved' ? 'bg-green-500' :
                      'bg-red-500'
                    }>
                      {request.status === 'pending' ? '대기 중' :
                       request.status === 'approved' ? '승인됨' : '거부됨'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 연락처 정보 */}
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{request.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{request.phoneNumber}</span>
                      </div>
                    </div>

                    {/* 소속 정보 */}
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{request.organization}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span>{request.position}</span>
                      </div>
                    </div>

                    {/* 신청 사유 */}
                    <div className="border-t pt-3">
                      <div className="flex items-start gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="text-sm font-semibold">신청 사유:</span>
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">
                        {request.reason}
                      </p>
                    </div>

                    {/* 신청 날짜 */}
                    <div className="text-xs text-muted-foreground">
                      신청일: {new Date(request.requestedAt).toLocaleString()}
                    </div>

                    {/* 승인/거부 버튼 */}
                    {request.status === 'pending' && (
                      <div className="pt-3 border-t">
                        <ApprovalActions
                          onApprove={() => handleApprove(request.id)}
                          onReject={(reason) => handleReject(request.id, reason)}
                          disabled={isProcessing}
                        />
                      </div>
                    )}

                    {request.status === 'approved' && (
                      <div className="pt-3 border-t">
                        <p className="text-sm text-green-600 font-semibold">
                          ✓ 최고 관리자로 승인되었습니다
                        </p>
                      </div>
                    )}

                    {request.status === 'rejected' && (
                      <div className="pt-3 border-t">
                        <p className="text-sm text-red-600 font-semibold">
                          ✗ 신청이 거부되었습니다
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">신청 내역이 없습니다</h3>
              <p className="text-muted-foreground text-center">
                최고 관리자 신청이 들어오면 여기에 표시됩니다
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
