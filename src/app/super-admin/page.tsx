'use client';

export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, doc, updateDoc, addDoc, query, where } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Shield, 
  Building2, 
  Users, 
  Loader2, 
  CheckCircle, 
  XCircle,
  UserPlus,
  Mail,
  Phone,
  Clock,
  TrendingUp,
  Activity,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { UserRole, UserProfile, ClubOwnerRequest, Club } from '@/types';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function SuperAdminDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // 클럽 오너 신청 목록
  const clubOwnerRequestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'clubOwnerRequests'),
      where('status', '==', 'pending')
    );
  }, [firestore]);
  const { data: clubOwnerRequests, isLoading: isRequestsLoading } = useCollection<ClubOwnerRequest>(clubOwnerRequestsQuery);
  
  // 디버깅 로그
  console.log('🔍 clubOwnerRequests:', clubOwnerRequests);
  console.log('🔍 isRequestsLoading:', isRequestsLoading);
  console.log('🔍 firestore:', firestore);

  // 최고 관리자 신청 목록
  const superAdminRequestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'superAdminRequests'),
      where('status', '==', 'pending')
    );
  }, [firestore]);
  const { data: superAdminRequests } = useCollection(superAdminRequestsQuery);

  // 연맹 관리자 임명 폼
  const [federationAdminForm, setFederationAdminForm] = useState({
    email: '',
    name: '',
    phoneNumber: '',
  });

  // 권한 체크
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

  // 클럽 오너 승인
  const handleApproveClubOwner = async (request: ClubOwnerRequest) => {
    if (!firestore) return;
    setIsProcessing(true);

    try {
      // 1. 클럽 생성
      const clubData: Omit<Club, 'id'> = {
        name: request.clubName,
        contactName: request.name,
        contactEmail: request.email,
        contactPhoneNumber: request.phoneNumber,
        location: request.clubAddress,
        status: 'approved',
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        approvedBy: user.uid,
      };
      const clubRef = await addDoc(collection(firestore, 'clubs'), clubData);

      // 2. 사용자 프로필 업데이트 (역할을 CLUB_OWNER로, 상태를 approved로)
      const userRef = doc(firestore, 'users', request.userId);
      await updateDoc(userRef, {
        role: UserRole.CLUB_OWNER,
        status: 'approved',
        clubId: clubRef.id,
        clubName: request.clubName,
        approvedBy: user.uid,
        approvedAt: new Date().toISOString(),
      });

      // 3. 신청 상태 업데이트
      const requestRef = doc(firestore, 'clubOwnerRequests', request.id);
      await updateDoc(requestRef, {
        status: 'approved',
        approvedBy: user.uid,
        approvedAt: new Date().toISOString(),
      });

      toast({
        title: '승인 완료',
        description: `${request.clubName} 클럽이 승인되었습니다!`,
      });
    } catch (error) {
      console.error('승인 실패:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '승인 처리 중 오류가 발생했습니다.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 클럽 오너 거부
  const handleRejectClubOwner = async () => {
    if (!firestore || !selectedRequestId || !rejectionReason.trim()) return;
    setIsProcessing(true);

    try {
      const request = clubOwnerRequests?.find(r => r.id === selectedRequestId);
      if (!request) return;

      // 1. 사용자 프로필 업데이트
      const userRef = doc(firestore, 'users', request.userId);
      await updateDoc(userRef, {
        status: 'rejected',
        rejectedBy: user.uid,
        rejectedAt: new Date().toISOString(),
        rejectionReason,
      });

      // 2. 신청 상태 업데이트
      const requestRef = doc(firestore, 'clubOwnerRequests', selectedRequestId);
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectedBy: user.uid,
        rejectedAt: new Date().toISOString(),
        rejectionReason,
      });

      toast({
        title: '거부 완료',
        description: '신청이 거부되었습니다.',
      });
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedRequestId(null);
    } catch (error) {
      console.error('거부 실패:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '거부 처리 중 오류가 발생했습니다.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 연맹 관리자 임명
  const handleAppointFederationAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    setIsProcessing(true);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7일 후 만료

      // 초대 생성 (Firestore Trigger가 자동으로 이메일 발송)
      const inviteDocRef = await addDoc(collection(firestore, 'federationAdminInvites'), {
        email: federationAdminForm.email,
        name: federationAdminForm.name,
        phoneNumber: federationAdminForm.phoneNumber,
        inviteToken: '', // 임시값, 아래에서 업데이트
        status: 'pending',
        invitedBy: user.uid,
        invitedByName: user.displayName || user.email || '최고 관리자',
        invitedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      });

      // 생성된 문서 ID를 inviteToken으로 업데이트
      await updateDoc(inviteDocRef, {
        inviteToken: inviteDocRef.id,
      });

      // 초대 링크 생성
      const inviteLink = `${window.location.origin}/invite/${inviteDocRef.id}`;

      toast({
        title: '초대 생성 완료',
        description: `초대가 생성되었습니다. 초대 관리 페이지에서 링크를 복사하여 전달하세요.`,
      });
      
      // 초대 관리 페이지로 이동
      router.push('/super-admin/invites');
      
      setFederationAdminForm({ email: '', name: '', phoneNumber: '' });
    } catch (error) {
      console.error('임명 실패:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '임명 처리 중 오류가 발생했습니다.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Firestore 데이터 초기화
  const handleResetFirestore = async () => {
    if (confirmText !== 'RESET') {
      toast({
        variant: 'destructive',
        title: '확인 필요',
        description: 'RESET을 정확히 입력해주세요.',
      });
      return;
    }

    setIsResetting(true);
    try {
      // Firebase Auth 토큰 가져오기
      const auth = (await import('firebase/auth')).getAuth();
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        throw new Error('인증 토큰을 가져올 수 없습니다.');
      }

      const response = await fetch('/api/admin/reset-firestore', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '초기화 실패');
      }

      toast({
        title: '초기화 완료',
        description: `Firestore: ${data.totalDeleted}개 문서, Auth: ${data.deletedAuthUsers}개 계정 삭제됨`,
      });

      setResetDialogOpen(false);
      setConfirmText('');
      
      // 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('초기화 실패:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: error instanceof Error ? error.message : '초기화 중 오류가 발생했습니다.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <main className="flex-1 p-8 space-y-8 bg-white">
      {/* Windsurf 스타일 헤더 */}
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-900 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
                  최고 관리자
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  시스템 전체 관리 및 주요 승인 처리
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setResetDialogOpen(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              데이터 초기화
            </Button>
            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 px-3 py-1.5">
              <Activity className="h-3.5 w-3.5 mr-1.5" />
              시스템 정상
            </Badge>
          </div>
        </div>
        <div className="h-px bg-slate-200" />
      </div>

      {/* Windsurf 스타일 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-slate-200 hover:border-slate-300 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Building2 className="h-4 w-4 text-slate-700" />
              </div>
              <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                대기중
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm font-medium text-slate-600">클럽 승인 대기</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-semibold text-slate-900">
                {clubOwnerRequests?.length || 0}
              </p>
              <span className="text-sm text-slate-500">건</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 hover:border-slate-300 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Shield className="h-4 w-4 text-slate-700" />
              </div>
              <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                검토중
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm font-medium text-slate-600">최고 관리자 신청</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-semibold text-slate-900">
                {superAdminRequests?.length || 0}
              </p>
              <span className="text-sm text-slate-500">건</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 hover:border-slate-300 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Users className="h-4 w-4 text-slate-700" />
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                활성
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm font-medium text-slate-600">연맹 관리</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-semibold text-slate-900">정상</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Windsurf 스타일 탭 */}
      <Tabs defaultValue="clubs" className="space-y-6">
        <TabsList className="bg-slate-50 border border-slate-200 p-1 h-auto">
          <TabsTrigger 
            value="clubs" 
            className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm px-4 py-2 text-slate-600"
          >
            <Building2 className="h-4 w-4 mr-2" />
            클럽 승인
          </TabsTrigger>
          <TabsTrigger 
            value="federation" 
            className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm px-4 py-2 text-slate-600"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            연맹 관리자
          </TabsTrigger>
          <TabsTrigger 
            value="super-admin" 
            className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm px-4 py-2 text-slate-600"
          >
            <Shield className="h-4 w-4 mr-2" />
            최고 관리자
          </TabsTrigger>
        </TabsList>

        {/* 클럽 승인 탭 */}
        <TabsContent value="clubs" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">클럽 오너 신청 목록</h3>
                <p className="text-sm text-slate-600 mt-0.5">
                  클럽 오너 신청을 검토하고 승인하세요
                </p>
              </div>
            </div>
            <div className="h-px bg-slate-200" />
            <div>
              {isRequestsLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-3" />
                  <p className="text-sm text-slate-600">신청 목록을 불러오는 중...</p>
                </div>
              ) : clubOwnerRequests && clubOwnerRequests.length > 0 ? (
                <div className="space-y-3">
                  {clubOwnerRequests.map((request) => (
                    <Card key={request.id} className="border border-slate-200 hover:border-slate-300 transition-colors">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="text-lg font-semibold text-slate-900">{request.clubName}</h4>
                            <p className="text-sm text-slate-600">담당자: {request.name}</p>
                          </div>
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            대기중
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* 연락처 정보 */}
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-600">{request.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-600">{request.phoneNumber}</span>
                          </div>
                          {request.clubAddress && (
                            <div className="flex items-center gap-2 text-sm md:col-span-2">
                              <Building2 className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-600">{request.clubAddress}</span>
                            </div>
                          )}
                        </div>

                        {request.clubDescription && (
                          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                            <p className="text-sm text-slate-700">{request.clubDescription}</p>
                          </div>
                        )}

                        {/* 액션 버튼 */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => handleApproveClubOwner(request)}
                            disabled={isProcessing}
                            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-10"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            승인
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedRequestId(request.id);
                              setRejectDialogOpen(true);
                            }}
                            disabled={isProcessing}
                            variant="outline"
                            className="flex-1 border-slate-200 hover:bg-slate-50 h-10"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            거부
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-200 rounded-lg">
                  <div className="p-4 bg-slate-50 rounded-full mb-3">
                    <Building2 className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">대기 중인 신청이 없습니다</h3>
                  <p className="text-sm text-slate-600 text-center max-w-md">
                    새로운 클럽 오너 신청이 들어오면 여기에 표시됩니다
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 연맹 관리자 임명 탭 */}
        <TabsContent value="federation">
          <Card>
            <CardHeader>
              <CardTitle>연맹 관리자 임명</CardTitle>
              <CardDescription>
                새로운 연맹 관리자를 임명하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAppointFederationAdmin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">이름 *</Label>
                  <Input
                    id="name"
                    value={federationAdminForm.name}
                    onChange={(e) => setFederationAdminForm({ ...federationAdminForm, name: e.target.value })}
                    placeholder="홍길동"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">이메일 *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={federationAdminForm.email}
                    onChange={(e) => setFederationAdminForm({ ...federationAdminForm, email: e.target.value })}
                    placeholder="admin@federation.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">전화번호</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={federationAdminForm.phoneNumber}
                    onChange={(e) => setFederationAdminForm({ ...federationAdminForm, phoneNumber: e.target.value })}
                    placeholder="010-1234-5678"
                  />
                </div>

                <Button type="submit" disabled={isProcessing}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  연맹 관리자 임명
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 최고 관리자 승인 탭 */}
        <TabsContent value="super-admin">
          <Card>
            <CardHeader>
              <CardTitle>최고 관리자 신청</CardTitle>
              <CardDescription>
                최고 관리자 신청을 검토하고 승인하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                대기 중인 최고 관리자 신청: {superAdminRequests?.length || 0}건
              </div>
              <p className="text-sm text-muted-foreground text-center">
                최고 관리자 승인은 /system/super-admin-approvals 페이지에서 처리하세요
              </p>
              <div className="flex justify-center mt-4">
                <Button onClick={() => router.push('/system/super-admin-approvals')}>
                  승인 페이지로 이동
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 거부 다이얼로그 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>신청 거부</DialogTitle>
            <DialogDescription>
              거부 사유를 입력해주세요. 신청자에게 전달됩니다.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="거부 사유를 입력하세요..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectClubOwner}
              disabled={!rejectionReason.trim() || isProcessing}
            >
              거부
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 데이터 초기화 확인 다이얼로그 */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Firestore 데이터 초기화
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
                  <p className="font-semibold text-red-900">⚠️ 경고: 이 작업은 되돌릴 수 없습니다!</p>
                  <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                    <li>모든 Firestore 컬렉션 데이터가 삭제됩니다</li>
                    <li>모든 Firebase Auth 계정이 삭제됩니다</li>
                    <li>회원, 클럽, 이용권, 출석 등 모든 데이터가 사라집니다</li>
                    <li>최상위 관리자 계정만 보존됩니다</li>
                  </ul>
                </div>
                <p className="text-sm text-slate-600">
                  계속하려면 아래에 <span className="font-mono font-bold text-red-600">RESET</span>을 입력하세요:
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="RESET 입력"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="font-mono"
          />
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setResetDialogOpen(false);
                setConfirmText('');
              }}
              disabled={isResetting}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetFirestore}
              disabled={confirmText !== 'RESET' || isResetting}
              className="gap-2"
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  초기화 중...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  데이터 초기화
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
