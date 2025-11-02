'use client';
import React, { useState } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, query, where, doc, updateDoc, addDoc, writeBatch, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, Users, User, Loader2, CheckCircle2, XCircle } from 'lucide-react';
// 로컬 타입: 이 화면에서 사용하는 필드만 정의
interface AdultRegistrationRequest {
  id: string;
  name: string;
  birthDate: string;
  gender: 'male' | 'female';
  phoneNumber: string;
  email?: string;
  clubId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy?: string;
}
interface FamilyRegistrationRequestLocal {
  id: string;
  clubId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy?: string;
  parents: Array<{
    name: string;
    birthDate: string;
    gender: 'male' | 'female';
    phoneNumber: string;
    email?: string;
  }>;
  children: Array<{
    name: string;
    birthDate: string;
    gender: 'male' | 'female';
    grade?: string;
  }>;
  externalGuardian?: {
    name: string;
    phoneNumber: string;
    relation: 'parent' | 'grandparent' | 'legal_guardian' | 'other';
  };
}
interface MemberRegistrationRequestLocal {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  clubId: string;
  memberType?: 'individual' | 'family';
  familyRole?: 'parent' | 'child';
  status: 'pending' | 'approved' | 'rejected';
}
export default function MemberApprovalsPage() {
  const { _user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  // remove undefined fields to avoid Firestore 400 Bad Request
  const sanitize = (obj: Record<string, unknown>) => {
    const clean: Record<string, unknown> = {};
    Object.keys(obj).forEach((k) => {
      const v = obj[k];
      if (v !== undefined) clean[k] = v;
    });
    return clean;
  };
  // Activate user (pending -> active) only if allowed by rules, otherwise skip
  const activateAndLinkUser = async (
    targetUserId: string,
    linkMemberId: string | null,
    clubId?: string,
    clubName?: string | null
  ) => {
    if (!firestore) return;
    try {
      const userRef = doc(firestore, 'users', targetUserId);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return;
      const current = snap.data() as any;
      const update: any = {};
      // Only staff-approved transition pending -> active is allowed by rules
      if (current.status === 'pending') {
        update.status = 'active';
        if (clubId) update.requestedClubId = clubId;
        if (clubName !== undefined) update.requestedClubName = clubName ?? null;
      }
      if (linkMemberId && current.linkedMemberId !== linkMemberId) {
        // Link only when we're already allowed to update users doc
        if (update.status === 'active') update.linkedMemberId = linkMemberId;
      }
      if (Object.keys(update).length > 0) {
        await updateDoc(userRef, sanitize(update));
      }
    } catch (e: unknown) {
      // Surface the failure to console for diagnostics (was previously swallowed)
    }
  };
  // Debug logging
  React.useEffect(() => {
    if (_user) {
      if (!_user.clubId && !(_user as any)?.clubName) {
        toast({
          variant: 'destructive',
          title: '클럽 정보 없음',
          description: '관리자 계정에 클럽 정보가 설정되지 않았습니다. 시스템 관리자에게 문의하세요.',
        });
      }
    } else if (!isUserLoading) {
    }
  }, [_user, isUserLoading, toast]);
  // 성인 회원 가입 요청 조회
  const adultRequestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (_user?.clubId) {
      return query(
        collection(firestore, 'adultRegistrationRequests'),
        where('clubId', '==', _user.clubId),
        where('status', '==', 'pending')
      );
    }
    if (_user && (_user as any).clubName) {
      return query(
        collection(firestore, 'adultRegistrationRequests'),
        where('clubName', '==', (_user as any).clubName as string),
        where('status', '==', 'pending')
      );
    }
    return null;
  }, [firestore, _user?.clubId, (_user as any)?.clubName]);
  const { data: adultRequests, isLoading: isAdultLoading } = useCollection<AdultRegistrationRequest>(adultRequestsQuery);
  // 가족 회원 가입 요청 조회
  const familyRequestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (_user?.clubId) {
      return query(
        collection(firestore, 'familyRegistrationRequests'),
        where('clubId', '==', _user.clubId),
        where('status', '==', 'pending')
      );
    }
    if (_user && (_user as any).clubName) {
      return query(
        collection(firestore, 'familyRegistrationRequests'),
        where('clubName', '==', (_user as any).clubName as string),
        where('status', '==', 'pending')
      );
    }
    return null;
  }, [firestore, _user?.clubId, (_user as any)?.clubName]);
  const { data: familyRequests, isLoading: isFamilyLoading, error: familyError } = useCollection<FamilyRegistrationRequestLocal>(familyRequestsQuery);
  // 에러 로깅
  React.useEffect(() => {
    if (familyError) {
      toast({
        variant: 'destructive',
        title: '조회 오류',
        description: `가족 회원 요청 조회 실패: ${familyError.message || familyError}`,
      });
    }
  }, [familyError, toast]);
  // 일반 회원 가입 요청 조회 (memberRegistrationRequests)
  const memberRequestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (_user?.clubId) {
      return query(
        collection(firestore, 'memberRegistrationRequests'),
        where('clubId', '==', _user.clubId),
        where('status', '==', 'pending')
      );
    }
    if (_user && (_user as any).clubName) {
      return query(
        collection(firestore, 'memberRegistrationRequests'),
        where('clubName', '==', (_user as any).clubName as string),
        where('status', '==', 'pending')
      );
    }
    return null;
  }, [firestore, _user?.clubId, (_user as any)?.clubName]);
  const { data: memberRequests, isLoading: isMemberLoading } = useCollection<MemberRegistrationRequestLocal>(memberRequestsQuery);
  const isLoading = isAdultLoading || isFamilyLoading || isMemberLoading;
  const totalPending = (adultRequests?.length || 0) + (familyRequests?.length || 0) + (memberRequests?.length || 0);
  // Debug query results
  React.useEffect(() => {
  }, [adultRequests, familyRequests, memberRequests]);
  // 성인 회원 승인
  const handleApproveAdult = async (request: AdultRegistrationRequest) => {
    if (!_user) return;
    try {
      // Use Admin API for approval
      const { adminAPI } = await import('@/lib/api/unified-api-client');
      const result = await adminAPI.approvals.approveAdult(request.id);
      toast({
        title: '승인 완료',
        description: result.message || `${request.name}님의 가입이 승인되었습니다.`,
      });
      // Refresh the page to show updated data
      router.refresh();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '승인 처리 중 오류가 발생했습니다.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  // 가족 회원 승인
  const handleApproveFamily = async (request: FamilyRegistrationRequestLocal) => {
    if (!_user) return;
    setIsProcessing(true);
    try {
      // Use Admin API for approval
      const { adminAPI } = await import('@/lib/api/unified-api-client');
      const result = await adminAPI.approvals.approveFamily(request.id);
      const message = [];
      if (request.parents.length > 0) message.push(`부모 ${request.parents.length}명`);
      if (request.children.length > 0) message.push(`자녀 ${request.children.length}명`);
      toast({
        title: '승인 완료',
        description: result.message || `${message.join(' + ')} 가입이 승인되었습니다.`,
      });
      // Refresh the page to show updated data
      router.refresh();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '승인 처리 중 오류가 발생했습니다.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  // 일반 회원 승인
  const handleApproveMember = async (request: MemberRegistrationRequestLocal) => {
    if (!firestore || !_user) return;
    setIsProcessing(true);
    try {
      // 1. members 컬렉션에 생성
      const memberPayload2 = sanitize({
        name: request.name,
        dateOfBirth: request.dateOfBirth,
        gender: request.gender,
        phoneNumber: request.phoneNumber,
        email: request.email,
        clubId: request.clubId,
        memberCategory: 'adult', // 기본값
        memberType: request.memberType || 'individual',
        familyRole: request.familyRole,
        userId: request.userId || null,
        status: 'active',
        createdAt: new Date().toISOString(),
        approvedBy: _user.uid,
        approvedAt: new Date().toISOString(),
      });
      const memberRef = await addDoc(collection(firestore, 'members'), memberPayload2);
      // 2. users 프로필 활성화 (pending일 때만) + 링크
      if (request.userId && request.userId.trim() !== '') {
        await activateAndLinkUser(
          request.userId,
          memberRef.id,
          request.clubId,
          (request as any)?.clubName ?? (_user as any)?.clubName ?? null
        );
      } else if (request.email) {
        // 이메일 폴백: 해당 이메일의 사용자 1명만 존재하면 활성화 + 링크
        const { getDocs } = await import('firebase/firestore');
        const userSnap = await getDocs(
          query(collection(firestore, 'users'), where('email', '==', request.email))
        );
        if (userSnap.size === 1) {
          const u = userSnap.docs[0];
          await activateAndLinkUser(
            u.id,
            memberRef.id,
            request.clubId,
            (request as any)?.clubName ?? (_user as any)?.clubName ?? null
          );
          // member.userId 연결
          await updateDoc(doc(firestore, 'members', memberRef.id), { userId: u.id });
        }
      }
      // 3. memberRegistrationRequests 상태 업데이트
      if (request.id) {
        await updateDoc(doc(firestore, 'memberRegistrationRequests', request.id), sanitize({
          status: 'approved',
          approvedBy: _user.uid,
          approvedAt: new Date().toISOString(),
        }));
      }
      toast({
        title: '승인 완료',
        description: `${request.name}님의 가입이 승인되었습니다.`,
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '승인 처리 중 오류가 발생했습니다.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  // 거절
  const handleReject = async (requestId: string, type: 'adult' | 'family' | 'member') => {
    if (!_user) return;
    setIsProcessing(true);
    try {
      // Use Admin API for rejection
      const { adminAPI } = await import('@/lib/api/unified-api-client');
      const result = await adminAPI.approvals.reject(requestId, type);
      toast({
        title: '거절 완료',
        description: result.message || '가입 신청이 거절되었습니다.',
      });
      // Refresh the page to show updated data
      router.refresh();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '거절 처리 중 오류가 발생했습니다.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <div className="p-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCheck className="h-8 w-8 text-primary" />
            회원 가입 승인
          </h1>
          <p className="text-muted-foreground mt-1">
            회원 가입 신청을 검토하고 승인/거절합니다
          </p>
        </div>
        {totalPending > 0 && (
          <div className="bg-red-500 text-white px-4 py-2 rounded-full font-bold">
            {totalPending}건 대기 중
          </div>
        )}
      </div>
      {/* 통계 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              일반 회원
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberRequests?.length || 0}</div>
            <p className="text-xs text-muted-foreground">승인 대기</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              성인 회원
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adultRequests?.length || 0}</div>
            <p className="text-xs text-muted-foreground">승인 대기</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              가족 회원
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{familyRequests?.length || 0}</div>
            <p className="text-xs text-muted-foreground">승인 대기</p>
          </CardContent>
        </Card>
      </div>
      {/* 승인 요청 목록 */}
      <Tabs defaultValue="member" className="space-y-4">
        <TabsList>
          <TabsTrigger value="member">
            일반 회원 ({memberRequests?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="adult">
            성인 회원 ({adultRequests?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="family">
            가족 회원 ({familyRequests?.length || 0})
          </TabsTrigger>
        </TabsList>
        {/* 일반 회원 탭 */}
        <TabsContent value="member" className="space-y-4">
          {memberRequests && memberRequests.length > 0 ? (
            memberRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{request.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {request.memberType === 'individual' ? '개인 회원' : 
                             request.familyRole === 'parent' ? '부모 회원' : 
                             request.familyRole === 'child' ? '자녀 회원' : '일반 회원'}
                          </p>
                        </div>
                        <Badge variant="secondary">일반</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">연락처:</span> {request.phoneNumber || '-'}
                        </div>
                        <div>
                          <span className="text-muted-foreground">이메일:</span> {request.email || '-'}
                        </div>
                        {request.dateOfBirth && (
                          <div>
                            <span className="text-muted-foreground">생년월일:</span> {request.dateOfBirth}
                          </div>
                        )}
                        {request.gender && (
                          <div>
                            <span className="text-muted-foreground">성별:</span> {request.gender === 'male' ? '남성' : '여성'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(request.id, 'member')}
                        disabled={isProcessing}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        거절
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApproveMember(request)}
                        disabled={isProcessing}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
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
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">승인 대기 중인 일반 회원이 없습니다</h3>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        {/* 성인 회원 탭 */}
        <TabsContent value="adult" className="space-y-4">
          {adultRequests && adultRequests.length > 0 ? (
            adultRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{request.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {request.gender === 'male' ? '남성' : '여성'} · {request.birthDate}
                          </p>
                        </div>
                        <Badge variant="secondary">성인 개인</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">연락처:</span> {request.phoneNumber}
                        </div>
                        <div>
                          <span className="text-muted-foreground">이메일:</span> {request.email || '-'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(request.id, 'adult')}
                        disabled={isProcessing}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        거절
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApproveAdult(request)}
                        disabled={isProcessing}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
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
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">승인 대기 중인 성인 회원이 없습니다</h3>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        {/* 가족 회원 탭 */}
        <TabsContent value="family" className="space-y-4">
          {familyRequests && familyRequests.length > 0 ? (
            familyRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">가족 회원 신청</h3>
                          <p className="text-sm text-muted-foreground">
                            {request.parents.length > 0 && `부모 ${request.parents.length}명`}
                            {request.parents.length > 0 && request.children.length > 0 && ' · '}
                            {request.children.length > 0 && `자녀 ${request.children.length}명`}
                          </p>
                        </div>
                        <Badge variant="secondary">가족</Badge>
                      </div>
                      {/* 부모 정보 */}
                      {request.parents.length > 0 && (
                        <div className="pl-4 border-l-2 border-primary/20">
                          <p className="text-sm font-semibold mb-2">부모</p>
                          {request.parents.map((parent, idx) => (
                            <div key={idx} className="text-sm text-muted-foreground">
                              {parent.name} ({parent.gender === 'male' ? '남' : '여'}) - {parent.phoneNumber}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* 자녀 정보 */}
                      {request.children.length > 0 && (
                        <div className="pl-4 border-l-2 border-primary/20">
                          <p className="text-sm font-semibold mb-2">자녀</p>
                          {request.children.map((child, idx) => (
                            <div key={idx} className="text-sm text-muted-foreground">
                              {child.name} ({child.gender === 'male' ? '남' : '여'}) - {child.birthDate}
                              {child.grade && ` · ${child.grade}`}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* 외부 보호자 정보 */}
                      {request.externalGuardian && (
                        <div className="pl-4 border-l-2 border-amber-200">
                          <p className="text-sm font-semibold mb-2">외부 보호자</p>
                          <div className="text-sm text-muted-foreground">
                            {request.externalGuardian.name} - {request.externalGuardian.phoneNumber}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(request.id, 'family')}
                        disabled={isProcessing}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        거절
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApproveFamily(request)}
                        disabled={isProcessing}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
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
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">승인 대기 중인 가족 회원이 없습니다</h3>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
