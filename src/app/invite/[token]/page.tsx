'use client';

export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Mail, User, Phone, Calendar } from 'lucide-react';
import { FederationAdminInvite } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const token = params.token as string;

  const [invite, setInvite] = useState<FederationAdminInvite | null>(null);
  const [loading, setLoading] = useState(true);

  // 초대 정보 로드
  useEffect(() => {
    const loadInvite = async () => {
      if (!firestore || !token) return;

      try {
        const inviteDoc = await getDoc(doc(firestore, 'federationAdminInvites', token));
        
        if (!inviteDoc.exists()) {
          toast({
            variant: 'destructive',
            title: '초대를 찾을 수 없습니다',
            description: '유효하지 않은 초대 링크입니다.',
          });
          setLoading(false);
          return;
        }

        const inviteData = { id: inviteDoc.id, ...inviteDoc.data() } as FederationAdminInvite;

        // 상태 확인
        if (inviteData.status === 'accepted') {
          toast({
            variant: 'destructive',
            title: '이미 수락된 초대입니다',
            description: '이 초대는 이미 사용되었습니다.',
          });
          setLoading(false);
          return;
        }

        if (inviteData.status === 'expired') {
          toast({
            variant: 'destructive',
            title: '만료된 초대입니다',
            description: '초대 기간이 만료되었습니다. 새로운 초대를 요청하세요.',
          });
          setLoading(false);
          return;
        }

        // 만료 시간 확인
        const expiresAt = new Date(inviteData.expiresAt);
        if (expiresAt < new Date()) {
          await updateDoc(doc(firestore, 'federationAdminInvites', token), {
            status: 'expired',
          });
          toast({
            variant: 'destructive',
            title: '만료된 초대입니다',
            description: '초대 기간이 만료되었습니다.',
          });
          setLoading(false);
          return;
        }

        setInvite(inviteData);
      } catch (error) {
        console.error('초대 로드 실패:', error);
        toast({
          variant: 'destructive',
          title: '오류 발생',
          description: '초대 정보를 불러오는 중 오류가 발생했습니다.',
        });
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [firestore, token, toast]);

  // 초대 수락하기 - 가입 페이지로 이동
  const handleAcceptInvite = () => {
    router.push(`/register/super-admin?token=${token}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle>유효하지 않은 초대</CardTitle>
            <CardDescription>
              초대 링크가 유효하지 않거나 만료되었습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full">
              로그인 페이지로 이동
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">연맹 관리자 초대</CardTitle>
          <CardDescription className="text-base">
            {invite.invitedByName}님이 연맹 관리자로 초대하셨습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 초대 정보 */}
          <div className="rounded-lg bg-slate-50 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">이름</p>
                <p className="text-sm font-medium text-slate-700">{invite.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">이메일</p>
                <p className="text-sm font-medium text-slate-700">{invite.email}</p>
              </div>
            </div>
            {invite.phoneNumber && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">전화번호</p>
                  <p className="text-sm font-medium text-slate-700">{invite.phoneNumber}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">초대 만료일</p>
                <p className="text-sm font-medium text-slate-700">
                  {new Date(invite.expiresAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>
          </div>

          {/* 안내 메시지 */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              초대 수락 시 제공되는 권한
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 연맹 관리자 대시보드 접근</li>
              <li>• 클럽 및 회원 관리</li>
              <li>• 대회 및 위원회 관리</li>
              <li>• 전체 시스템 관리 권한</li>
            </ul>
          </div>

          {/* 초대 수락 버튼 */}
          <Button 
            onClick={handleAcceptInvite} 
            className="w-full h-12 text-base" 
            size="lg"
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            초대 수락하고 가입하기
          </Button>

          {/* 취소 버튼 */}
          <Button 
            onClick={() => router.push('/login')} 
            variant="outline" 
            className="w-full"
          >
            나중에 하기
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
