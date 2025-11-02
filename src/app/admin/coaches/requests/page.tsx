'use client';
import { useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { RequireAnyRole } from '@/components/require-role';
import { UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
interface CoachRequest {
  id: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  role: UserRole;
  clubId: string;
  clubName?: string;
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}
export default function AdminCoachRequestsPage() {
  const { _user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const requestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'coach_requests'), orderBy('requestedAt', 'desc'));
  }, [firestore]);
  const { data: requests, isLoading } = useCollection<CoachRequest>(requestsQuery);
  const handleApprove = async (_req: CoachRequest) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'coach_requests', _req.id), {
        status: 'approved',
      });
      toast({ title: '승인 완료', description: `${_req.displayName} 요청 승인` });
    } catch (e: unknown) {
      toast({ variant: 'destructive', title: '오류', description: '승인 처리 중 오류가 발생했습니다.' });
    }
  };
  const handleReject = async (_req: CoachRequest) => {
    if (!firestore) return;
    const reason = rejectReason[_req.id] || '요청이 거절되었습니다.';
    try {
      await updateDoc(doc(firestore, 'coach_requests', _req.id), {
        status: 'rejected',
        rejectionReason: reason,
      });
      toast({ title: '거부 완료', description: `${_req.displayName} 요청 거부` });
    } catch (e: unknown) {
      toast({ variant: 'destructive', title: '오류', description: '거절 처리 중 오류가 발생했습니다.' });
    }
  };
  return (
    <RequireAnyRole roles={[UserRole.SUPER_ADMIN, UserRole.FEDERATION_ADMIN]}>
      <main className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">코치 요청 승인</h1>
            <p className="text-muted-foreground mt-1">클럽에서 요청한 코치 계정을 승인/거절합니다</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>요청 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (requests && requests.length > 0) ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>클럽</TableHead>
                    <TableHead>역할</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((_req) => (
                    <TableRow key={_req.id}>
                      <TableCell className="font-medium">{_req.displayName}</TableCell>
                      <TableCell>{_req.email}</TableCell>
                      <TableCell>{_req.clubName || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{_req.role === UserRole.HEAD_COACH ? '수석 코치' : '보조 코치'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          _req.status === 'approved' ? 'default' :
                          _req.status === 'pending' ? 'secondary' : 'outline'
                        }>
                          {_req.status === 'approved' ? '승인' : _req.status === 'pending' ? '대기중' : '거절'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {_req.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              placeholder="거절 사유(선택)"
                              value={rejectReason[_req.id] || ''}
                              onChange={(e) => setRejectReason(prev => ({ ...prev, [_req.id]: e.target.value }))}
                              className="max-w-[200px]"
                            />
                            <Button size="sm" variant="outline" onClick={() => handleReject(_req)}>거절</Button>
                            <Button size="sm" onClick={() => handleApprove(_req)}>승인</Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">대기 중인 요청이 없습니다</p>
            )}
          </CardContent>
        </Card>
      </main>
    </RequireAnyRole>
  );
}
