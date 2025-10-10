'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useUser, useCollection, useFirestore } from '@/firebase';
import type { Member, MemberPass, PassTemplate } from '@/types';
import { collection, query, where, doc, writeBatch, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Ticket, History, CreditCard, Landmark, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export default function MyProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PassTemplate | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'bank-transfer' | 'card'>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch all members associated with the current guardian user
  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'members'), where('guardianIds', 'array-contains', user.uid));
  }, [firestore, user?.uid]);
  const { data: members, isLoading: areMembersLoading } = useCollection<Member>(membersQuery);

  const memberIds = useMemo(() => members?.map(m => m.id) || [], [members]);

  // 2. Fetch all passes for these members to show history and current status
  const passesQuery = useMemoFirebase(() => {
    if (!firestore || memberIds.length === 0) return null;
    return query(collection(firestore, 'member_passes'), where('memberId', 'in', memberIds), orderBy('startDate', 'desc'));
  }, [firestore, memberIds]);
  const { data: passes, isLoading: arePassesLoading } = useCollection<MemberPass>(passesQuery);

  // 3. Fetch available pass templates for the club
  const clubId = useMemo(() => members?.[0]?.clubId, [members]);
  const passTemplatesQuery = useMemoFirebase(() => {
    if (!firestore || !clubId) return null;
    return query(collection(firestore, 'pass_templates'), where('clubId', '==', clubId));
  }, [firestore, clubId]);
  const { data: passTemplates, isLoading: areTemplatesLoading } = useCollection<PassTemplate>(passTemplatesQuery);

  const handleRequestPass = async () => {
    if (!firestore || !selectedMember || !paymentMethod || !selectedTemplate) return;
    setIsSubmitting(true);

    try {
      const batch = writeBatch(firestore);
      const newPassRef = doc(collection(firestore, 'member_passes'));
      
      const newPass: MemberPass = {
        id: newPassRef.id,
        memberId: selectedMember.id,
        clubId: selectedMember.clubId,
        passType: selectedTemplate.id, // Storing template id as passType for reference
        passName: selectedTemplate.name,
        paymentMethod: paymentMethod,
        totalSessions: selectedTemplate.totalSessions,
        attendableSessions: selectedTemplate.attendableSessions,
        remainingSessions: selectedTemplate.totalSessions,
        attendanceCount: 0,
        status: 'pending',
        ...(selectedTemplate.durationDays && { endDate: new Date(new Date().setDate(new Date().getDate() + selectedTemplate.durationDays)).toISOString() })
      };
      
      batch.set(newPassRef, newPass);

      const memberRef = doc(firestore, 'members', selectedMember.id);
      batch.update(memberRef, { status: 'pending' });

      await batch.commit();
      
      toast({
        title: '이용권 신청 완료',
        description: `${selectedMember.name} 님의 이용권이 신청되었습니다. 클럽 관리자의 승인을 기다려주세요.`
      });
      setSelectedMember(null);
      setSelectedTemplate(null);
    } catch (error) {
      console.error("Error requesting pass: ", error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '이용권 신청 중 오류가 발생했습니다.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getPassStatusBadge = (pass: MemberPass | undefined) => {
    if (!pass) return <Badge variant="secondary">이용권 없음</Badge>;
    switch (pass.status) {
      case 'active':
        if (pass.totalSessions !== undefined) {
             return <Badge>{`활성: ${pass.attendanceCount}/${pass.attendableSessions} (남은 기회 ${pass.remainingSessions})`}</Badge>;
        }
        return <Badge>활성 (무제한)</Badge>
      case 'pending':
        return <Badge variant="destructive">승인 대기중</Badge>;
      case 'expired':
        return <Badge variant="secondary">만료됨</Badge>;
    }
  };

  const openModal = (member: Member) => {
      setSelectedMember(member);
      setSelectedTemplate(null);
      setPaymentMethod(undefined);
  }

  const isLoading = isUserLoading || areMembersLoading || arePassesLoading || areTemplatesLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
             <Image
                src={user?.photoURL || 'https://picsum.photos/seed/user/64/64'}
                alt={user?.displayName || 'User'}
                width={64}
                height={64}
                className="rounded-full"
              />
            <div>
              <CardTitle className="text-2xl">{user?.displayName}님</CardTitle>
              <CardDescription>학부모 계정</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">소속 선수/가족 목록</h2>
        {members && members.length > 0 ? members.map(member => {
           const memberPasses = passes?.filter(p => p.memberId === member.id) || [];
           const currentPass = memberPasses.find(p => p.status === 'active' || p.status === 'pending');
           const canRequestNewPass = !currentPass;

          return (
            <Card key={member.id}>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Image
                                src={member.photoURL || `https://picsum.photos/seed/${member.id}/48/48`}
                                alt={member.name}
                                width={48}
                                height={48}
                                className="rounded-full"
                            />
                            <div>
                                <p className="font-bold text-lg">{member.name}</p>
                                <p className="text-sm text-muted-foreground">{new Date(member.dateOfBirth || '').toLocaleDateString()}</p>
                            </div>
                        </div>
                        {getPassStatusBadge(currentPass)}
                    </div>
                </CardHeader>
              <CardContent>
                {memberPasses.length > 0 && (
                   <div className="space-y-2">
                        <h4 className="font-semibold flex items-center"><History className="mr-2 h-4 w-4"/>이용권 내역</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground pl-2">
                           {memberPasses.map(p => (
                            <li key={p.id}>{new Date(p.startDate || '').toLocaleDateString()} 시작 ({p.passName}) - {p.status === 'expired' ? '만료' : p.status === 'active' ? '활성' : '대기' }</li>
                           ))}
                        </ul>
                   </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                 <Button onClick={() => openModal(member)} disabled={!canRequestNewPass}>
                  <Ticket className="mr-2 h-4 w-4"/>
                  {canRequestNewPass ? '신규 이용권 신청' : '활성/대기중인 이용권 있음'}
                </Button>
                <Link href={`/members/${member.id}`} passHref>
                    <Button variant="outline">
                        상세보기 <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                </Link>
              </CardFooter>
            </Card>
          )
        }) : (
             <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                    등록된 선수가 없습니다. 프로필 설정에서 선수를 추가해주세요.
                </CardContent>
            </Card>
        )}
      </div>

       <Dialog open={!!selectedMember} onOpenChange={(isOpen) => !isOpen && setSelectedMember(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>신규 이용권 신청: {selectedMember?.name}</DialogTitle>
            <DialogDescription>
              아래 목록에서 원하는 이용권을 선택하고 결제 방법을 정해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
              <div>
                <Label className="font-semibold">이용권 종류 선택</Label>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto p-1">
                    {passTemplates?.map(template => (
                        <div key={template.id} 
                            onClick={() => setSelectedTemplate(template)}
                            className={
                                `flex flex-col justify-between rounded-lg border-2 p-4 cursor-pointer transition-all
                                ${selectedTemplate?.id === template.id ? 'border-primary' : 'border-muted'}`
                            }>
                            <div>
                                <h4 className="font-bold">{template.name}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{template.description || "상세 설명 없음"}</p>
                            </div>
                            <div className="text-xs mt-2 space-y-1">
                                {template.durationDays && <p>• 유효기간: {template.durationDays}일</p>}
                                {template.totalSessions !== undefined && <p>• 총 {template.totalSessions}회 사용 가능</p>}
                                {template.attendableSessions !== undefined && <p>• {template.attendableSessions}회 출석 필요</p>}
                                {template.price && <p className="font-semibold mt-2">{template.price.toLocaleString()}원</p>}
                            </div>
                        </div>
                    ))}
                    {(!passTemplates || passTemplates.length === 0) && <p className="text-sm text-muted-foreground col-span-full text-center">신청 가능한 이용권이 없습니다.</p>}
                </div>
              </div>

              {selectedTemplate && (
                <div>
                    <Label className="font-semibold">결제 방법 선택</Label>
                    <RadioGroup 
                        className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4"
                        onValueChange={(value: 'bank-transfer' | 'card') => setPaymentMethod(value)}
                        value={paymentMethod}
                    >
                        <Label htmlFor="bank-transfer" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                            <RadioGroupItem value="bank-transfer" id="bank-transfer" className="sr-only" />
                            <Landmark className="mb-3 h-6 w-6" />
                            계좌 이체
                        </Label>
                        <Label htmlFor="card" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                            <RadioGroupItem value="card" id="card" className="sr-only" />
                            <CreditCard className="mb-3 h-6 w-6" />
                            현장 카드 결제
                        </Label>
                    </RadioGroup>
                </div>
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                신청 후 클럽 관리자의 승인이 필요합니다. '계좌 이체'를 선택한 경우, 클럽 계좌로 입금 후 승인 요청이 처리됩니다.
              </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button onClick={handleRequestPass} disabled={isSubmitting || !paymentMethod || !selectedTemplate}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              신청하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
