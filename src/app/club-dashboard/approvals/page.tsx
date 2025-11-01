'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RequireAnyRole } from '@/components/require-role';
import { UserRole, PassRequest } from '@/types';
import { CreditCard, Loader2 } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { adminAPI } from '@/utils/api-client';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
export default function ClubApprovalsPage() {
  const { _user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PassRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  // 이용권 요청 가져오기 (신규 pass_requests 콜렉션)
  const passRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.clubId) return null;
    return query(
      collection(firestore, 'pass_requests'),
      where('clubId', '==', _user.clubId),
      where('status', '==', 'pending')
    );
  }, [firestore, _user?.clubId]);
  const { data: passRequests, isLoading } = useCollection<PassRequest>(passRequestsQuery);
  const handleApprove = async (request: PassRequest) => {
    setProcessingId(request.id);
    try {
      await adminAPI.passes.approve(request.id);
      toast({ 
        title: '승인 완료', 
        description: `${request.memberName}님의 이용권이 활성화되었습니다.` 
      });
    } catch (error: unknown) {
      toast({ 
        variant: 'destructive', 
        title: '오류 발생', 
        description: error instanceof Error ? error.message : String(error) || '승인 중 오류가 발생했습니다.' 
      });
    } finally {
      setProcessingId(null);
    }
  };
  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) {
      toast({ 
        variant: 'destructive', 
        title: '거부 사유를 입력해주세요' 
      });
      return;
    }
    setProcessingId(selectedRequest.id);
    try {
      await adminAPI.passes.reject(selectedRequest.id, rejectReason);
      toast({ 
        title: '거부 완료', 
        description: '이용권 요청이 거부되었습니다.' 
      });
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectReason('');
    } catch (error: unknown) {
      toast({ 
        variant: 'destructive', 
        title: '오류 발생', 
        description: error instanceof Error ? error.message : String(error) || '거부 중 오류가 발생했습니다.' 
      });
    } finally {
      setProcessingId(null);
    }
  };
  const totalPending = passRequests?.length || 0;
  return (
    <RequireAnyRole roles={[UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER]}>
      <main className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CreditCard className="h-8 w-8 text-primary" />
              이용권 요청 승인
            </h1>
            <p className="text-muted-foreground mt-1">
              {_user?.clubName || '클럽'}의 이용권 요청을 승인합니다
            </p>
          </div>
          {totalPending > 0 && (
            <div className="bg-red-500 text-white px-4 py-2 rounded-full font-bold">
              {totalPending}건 대기 중
            </div>
          )}
        </div>
        {isLoading ? (
          <Card>
            <CardContent className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : (
          <>
            {passRequests && passRequests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>회원</TableHead>
                    <TableHead>이용권 유형</TableHead>
                    <TableHead>결제 방법</TableHead>
                    <TableHead>신청일</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {passRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.memberName}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.templateName}</div>
                          <div className="text-sm text-muted-foreground">
                            {request.type === 'new' ? '신규' : '갱신'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {request.paymentMethod === 'cash' && '현금'}
                          {request.paymentMethod === 'card' && '카드'}
                          {request.paymentMethod === 'transfer' && '계좌이체'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.requestedAt), 'MM/dd HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">대기중</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setRejectDialogOpen(true);
                            }}
                            disabled={processingId === request.id}
                          >
                            거부
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request)}
                            disabled={processingId === request.id}
                          >
                            {processingId === request.id && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            승인
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">이용권 요청이 없습니다</h3>
                  <p className="text-sm text-muted-foreground">회원들의 이용권 요청이 있으면 여기에 표시됩니다.</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>이용권 요청 거부</DialogTitle>
              <DialogDescription>
                {selectedRequest?.memberName}님의 이용권 요청을 거부합니다.
                거부 사유를 입력해주세요.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="reason" className="mb-2 block">거부 사유</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="거부 사유를 입력하세요..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">취소</Button>
              </DialogClose>
              <Button
                onClick={handleReject}
                disabled={processingId !== null || !rejectReason.trim()}
                variant="destructive"
              >
                {processingId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                거부
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </RequireAnyRole>
  );
}
