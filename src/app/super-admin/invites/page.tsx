'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Mail, Phone, Calendar, CheckCircle2, XCircle, Clock, Copy, Trash2 } from 'lucide-react';
import { FederationAdminInvite, UserRole } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const statusLabels = {
  pending: '대기중',
  accepted: '수락됨',
  expired: '만료됨',
  cancelled: '취소됨',
};

const statusColors = {
  pending: 'secondary',
  accepted: 'default',
  expired: 'destructive',
  cancelled: 'outline',
} as const;

export default function InvitesManagementPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  // 초대 목록 조회
  const invitesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, 'federationAdminInvites'),
            orderBy('invitedAt', 'desc')
          )
        : null,
    [firestore]
  );
  const { data: invites, isLoading: isInvitesLoading } = useCollection<FederationAdminInvite>(invitesQuery);

  if (isUserLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== UserRole.SUPER_ADMIN) {
    router.push('/dashboard');
    return null;
  }

  // 초대 링크 복사
  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: '복사 완료',
      description: '초대 링크가 클립보드에 복사되었습니다.',
    });
  };

  // 초대 취소
  const handleCancelInvite = async (inviteId: string) => {
    if (!firestore) return;
    if (!confirm('이 초대를 취소하시겠습니까?')) return;

    try {
      await updateDoc(doc(firestore, 'federationAdminInvites', inviteId), {
        status: 'cancelled',
      });

      toast({
        title: '초대 취소',
        description: '초대가 취소되었습니다.',
      });
    } catch (error) {
      console.error('초대 취소 실패:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '초대 취소 중 오류가 발생했습니다.',
      });
    }
  };

  // 초대 삭제
  const handleDeleteInvite = async (inviteId: string) => {
    if (!firestore) return;
    if (!confirm('이 초대를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    try {
      await deleteDoc(doc(firestore, 'federationAdminInvites', inviteId));

      toast({
        title: '삭제 완료',
        description: '초대가 삭제되었습니다.',
      });
    } catch (error) {
      console.error('초대 삭제 실패:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '초대 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  // 검색 필터링
  const filteredInvites = invites?.filter((invite) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      invite.name.toLowerCase().includes(searchLower) ||
      invite.email.toLowerCase().includes(searchLower) ||
      invite.phoneNumber.toLowerCase().includes(searchLower)
    );
  });

  // 통계
  const stats = {
    total: invites?.length || 0,
    pending: invites?.filter((i) => i.status === 'pending').length || 0,
    accepted: invites?.filter((i) => i.status === 'accepted').length || 0,
    expired: invites?.filter((i) => i.status === 'expired').length || 0,
  };

  return (
    <main className="flex-1 p-8 space-y-8 bg-white">
      {/* 헤더 */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">초대 관리</h1>
          <p className="text-sm text-slate-600 mt-1">
            연맹 관리자 초대 현황을 확인하고 관리하세요
          </p>
        </div>
        
        {/* 이메일 설정 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">초대 링크 전달 방법</h3>
              <p className="text-sm text-blue-800">
                이메일 자동 발송이 설정되지 않은 경우, 아래 목록에서 <strong>복사 버튼</strong>을 클릭하여 초대 링크를 복사한 후 수동으로 전달하세요.
              </p>
            </div>
          </div>
        </div>
        
        <div className="h-px bg-slate-200" />
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">전체 초대</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">대기중</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">수락됨</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-green-600">{stats.accepted}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">만료됨</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-red-600">{stats.expired}</p>
          </CardContent>
        </Card>
      </div>

      {/* 초대 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>초대 목록</CardTitle>
              <CardDescription>발송된 모든 초대를 확인하세요</CardDescription>
            </div>
            <Button onClick={() => router.push('/super-admin')}>
              새 초대 보내기
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 검색 */}
          <Input
            placeholder="이름, 이메일, 전화번호로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />

          {/* 테이블 */}
          {isInvitesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredInvites && filteredInvites.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>전화번호</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>초대일</TableHead>
                    <TableHead>만료일</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium">{invite.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {invite.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {invite.phoneNumber ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-slate-400" />
                            {invite.phoneNumber}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[invite.status]}>
                          {statusLabels[invite.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(invite.invitedAt), 'PPP', { locale: ko })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="h-4 w-4" />
                          {format(new Date(invite.expiresAt), 'PPP', { locale: ko })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {invite.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyInviteLink(invite.inviteToken)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelInvite(invite.id)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteInvite(invite.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-200 rounded-lg">
              <Mail className="h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-base font-semibold text-slate-900 mb-1">초대가 없습니다</h3>
              <p className="text-sm text-slate-600 text-center max-w-md">
                {searchQuery
                  ? '검색 결과가 없습니다'
                  : '새로운 연맹 관리자를 초대하세요'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
