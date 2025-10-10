'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useUser, useCollection, useFirestore } from '@/firebase';
import type { Member, MemberPass, Club } from '@/types';
import { collection, query, where, doc, writeBatch, getDocs, orderBy, limit } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

  const handleRequestPass = async () => {
    if (!firestore || !selectedMember || !paymentMethod) return;
    setIsSubmitting(true);

    try {
      const batch = writeBatch(firestore);

      // 1. Create a new pending pass document
      const newPassRef = doc(collection(firestore, 'member_passes'));
      const newPass: MemberPass = {
        id: newPassRef.id,
        memberId: selectedMember.id,
        clubId: selectedMember.clubId,
        passType: 'standard-5-4',
        paymentMethod: paymentMethod,
        totalSessions: 5,
        attendableSessions: 4,
        remainingSessions: 5,
        attendanceCount: 0,
        status: 'pending',
      };
      batch.set(newPassRef, newPass);

      // 2. Update the member's status to 'pending' to trigger admin approval
      const memberRef = doc(firestore, 'members', selectedMember.id);
      batch.update(memberRef, { status: 'pending' });

      await batch.commit();
      
      toast({
        title: '이용권 신청 완료',
        description: `${selectedMember.name} 님의 이용권이 신청되었습니다. 클럽 관리자의 승인을 기다려주세요.`
      });
      setSelectedMember(null);
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
        return <Badge>{`활성: ${pass.attendanceCount}/${pass.attendableSessions} (남은 기회 ${pass.remainingSessions})`}</Badge>;
      case 'pending':
        return <Badge variant="destructive">승인 대기중</Badge>;
      case 'expired':
        return <Badge variant="secondary">만료됨</Badge>;
    }
  };

  const isLoading = isUserLoading || areMembersLoading || arePassesLoading;

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
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <Image
                      src={member.photoURL || `https://picsum.photos/seed/${member.id}/48/48`}
                      alt={member.name}
                      width={48}
                      height={48}
                      className="rounded-full"
                  />
                  <div>
                    <p className="font-bold">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{new Date(member.dateOfBirth || '').toLocaleDateString()}</p>
                  </div>
                </div>
                 {getPassStatusBadge(currentPass)}
              </CardHeader>
              <CardContent>
                {memberPasses.length > 0 && (
                   <div className="space-y-2">
                        <h4 className="font-semibold flex items-center"><History className="mr-2 h-4 w-4"/>이용권 내역</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground pl-2">
                           {memberPasses.map(p => (
                            <li key={p.id}>{new Date(p.startDate || '').toLocaleDateString()} 시작 - {p.status === 'expired' ? '만료' : p.status === 'active' ? '활성' : '대기' }</li>
                           ))}
                        </ul>
                   </div>
                )}
              </CardContent>
              <CardFooter>
                 <Button onClick={() => setSelectedMember(member)} disabled={!canRequestNewPass}>
                  <Ticket className="mr-2 h-4 w-4"/>
                  {canRequestNewPass ? '신규 이용권 신청' : '활성/대기중인 이용권 있음'}
                </Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>신규 이용권 신청</DialogTitle>
            <DialogDescription>
              {selectedMember?.name} 선수의 새로운 이용권을 신청합니다. 결제 방법을 선택해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
              <p><strong>신청 대상:</strong> {selectedMember?.name}</p>
              <p><strong>이용권 유형:</strong> 표준 이용권 (총 5회, 출석 4회 필요)</p>
              <div>
                <Label className="font-semibold">결제 방법</Label>
                <RadioGroup 
                    className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4"
                    onValueChange={(value: 'bank-transfer' | 'card') => setPaymentMethod(value)}
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
              <p className="mt-2 text-sm text-muted-foreground">
                신청 후 클럽 관리자의 승인이 필요합니다. '계좌 이체'를 선택한 경우, 클럽 계좌로 입금 후 승인 요청이 처리됩니다.
              </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button onClick={handleRequestPass} disabled={isSubmitting || !paymentMethod}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              신청하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
