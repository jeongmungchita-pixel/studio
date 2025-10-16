'use client';

export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, query, where, doc, updateDoc, addDoc, writeBatch } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, Users, User, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { AdultRegistrationRequest, FamilyRegistrationRequest, MemberRequest } from '@/types';

export default function MemberApprovalsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // 성인 회원 가입 요청 조회
  const adultRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'adultRegistrationRequests'),
      where('clubId', '==', user.clubId),
      where('status', '==', 'pending')
    );
  }, [firestore, user?.clubId]);
  const { data: adultRequests, isLoading: isAdultLoading } = useCollection<AdultRegistrationRequest>(adultRequestsQuery);

  // 가족 회원 가입 요청 조회
  const familyRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'familyRegistrationRequests'),
      where('clubId', '==', user.clubId),
      where('status', '==', 'pending')
    );
  }, [firestore, user?.clubId]);
  const { data: familyRequests, isLoading: isFamilyLoading } = useCollection<FamilyRegistrationRequest>(familyRequestsQuery);

  // 일반 회원 가입 요청 조회 (memberRegistrationRequests)
  const memberRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'memberRegistrationRequests'),
      where('clubId', '==', user.clubId),
      where('status', '==', 'pending')
    );
  }, [firestore, user?.clubId]);
  const { data: memberRequests, isLoading: isMemberLoading } = useCollection<MemberRequest>(memberRequestsQuery);

  const isLoading = isAdultLoading || isFamilyLoading || isMemberLoading;
  const totalPending = (adultRequests?.length || 0) + (familyRequests?.length || 0) + (memberRequests?.length || 0);

  // 성인 회원 승인
  const handleApproveAdult = async (request: AdultRegistrationRequest) => {
    if (!firestore || !user) return;
    setIsProcessing(true);

    try {
      // members 컬렉션에 생성
      await addDoc(collection(firestore, 'members'), {
        name: request.name,
        dateOfBirth: request.birthDate,
        gender: request.gender,
        phoneNumber: request.phoneNumber,
        email: request.email,
        clubId: request.clubId,
        memberCategory: 'adult',
        memberType: 'individual',
        status: 'active',
        createdAt: new Date().toISOString(),
        approvedBy: user.uid,
        approvedAt: new Date().toISOString(),
      });

      // 요청 상태 업데이트
      await updateDoc(doc(firestore, 'adultRegistrationRequests', request.id), {
        status: 'approved',
        approvedBy: user.uid,
        approvedAt: new Date().toISOString(),
      });

      toast({
        title: '승인 완료',
        description: `${request.name}님의 가입이 승인되었습니다.`,
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

  // 가족 회원 승인
  const handleApproveFamily = async (request: FamilyRegistrationRequest) => {
    if (!firestore || !user) return;
    setIsProcessing(true);

    try {
      const batch = writeBatch(firestore);
      const parentMemberIds: string[] = [];

      // 1. 부모들 생성
      for (const parent of request.parents) {
        const parentRef = doc(collection(firestore, 'members'));
        parentMemberIds.push(parentRef.id);

        batch.set(parentRef, {
          id: parentRef.id,
          name: parent.name,
          dateOfBirth: parent.birthDate,
          gender: parent.gender,
          phoneNumber: parent.phoneNumber,
          email: parent.email,
          clubId: request.clubId,
          memberCategory: 'adult',
          memberType: 'family',
          familyRole: 'parent',
          status: 'active',
          createdAt: new Date().toISOString(),
          approvedBy: user.uid,
          approvedAt: new Date().toISOString(),
        });
      }

      // 2. 자녀들 생성
      for (const child of request.children) {
        const childRef = doc(collection(firestore, 'members'));

        batch.set(childRef, {
          id: childRef.id,
          name: child.name,
          dateOfBirth: child.birthDate,
          gender: child.gender,
          grade: child.grade,
          clubId: request.clubId,
          memberCategory: 'child',
          memberType: 'family',
          familyRole: 'child',
          guardianIds: parentMemberIds,
          guardianName: parentMemberIds.length > 0 
            ? request.parents[0].name 
            : request.externalGuardian?.name,
          guardianPhone: parentMemberIds.length > 0 
            ? request.parents[0].phoneNumber 
            : request.externalGuardian?.phoneNumber,
          guardianRelation: request.externalGuardian?.relation,
          status: 'active',
          createdAt: new Date().toISOString(),
          approvedBy: user.uid,
          approvedAt: new Date().toISOString(),
        });
      }

      // 3. 요청 상태 업데이트
      batch.update(doc(firestore, 'familyRegistrationRequests', request.id), {
        status: 'approved',
        approvedBy: user.uid,
        approvedAt: new Date().toISOString(),
        createdMemberIds: [...parentMemberIds],
      });

      await batch.commit();

      const message = [];
      if (request.parents.length > 0) message.push(`부모 ${request.parents.length}명`);
      if (request.children.length > 0) message.push(`자녀 ${request.children.length}명`);

      toast({
        title: '승인 완료',
        description: `${message.join(' + ')} 가입이 승인되었습니다.`,
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

  // 일반 회원 승인
  const handleApproveMember = async (request: MemberRequest) => {
    if (!firestore || !user) return;
    setIsProcessing(true);

    try {
      console.log('👉 일반 회원 승인 시작:', request);

      // members 컬렉션에 생성
      await addDoc(collection(firestore, 'members'), {
        name: request.name,
        dateOfBirth: request.dateOfBirth,
        gender: request.gender,
        phoneNumber: request.phoneNumber,
        email: request.email,
        clubId: request.clubId,
        memberCategory: 'adult', // 기본값
        memberType: request.memberType || 'individual',
        familyRole: request.familyRole,
        status: 'active',
        createdAt: new Date().toISOString(),
        approvedBy: user.uid,
        approvedAt: new Date().toISOString(),
      });

      console.log('✅ members 컬렉션 생성 완료');

      // 요청 상태 업데이트
      if (request.id) {
        await updateDoc(doc(firestore, 'memberRegistrationRequests', request.id), {
          status: 'approved',
          approvedBy: user.uid,
          approvedAt: new Date().toISOString(),
        });
      }

      console.log('✅ 승인 완료!');

      toast({
        title: '승인 완료',
        description: `${request.name}님의 가입이 승인되었습니다.`,
      });
    } catch (error) {
      console.error('❌ 승인 실패:', error);
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
    if (!firestore || !user) return;
    setIsProcessing(true);

    try {
      const collectionName = 
        type === 'adult' ? 'adultRegistrationRequests' : 
        type === 'family' ? 'familyRegistrationRequests' :
        'memberRegistrationRequests';
      await updateDoc(doc(firestore, collectionName, requestId), {
        status: 'rejected',
        rejectedBy: user.uid,
        rejectedAt: new Date().toISOString(),
      });

      toast({
        title: '거절 완료',
        description: '가입 신청이 거절되었습니다.',
      });
    } catch (error) {
      console.error('거절 실패:', error);
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
