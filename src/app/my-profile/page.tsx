'use client';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ROUTES } from '@/constants/routes';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { Member, MemberPass, PassTemplate } from '@/types';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { adminAPI } from '@/utils/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Ticket, History, CreditCard, Landmark, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
export default function MyProfilePage() {
  const { _user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PassTemplate | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [passNotes, setPassNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 1. Fetch members associated with this account
  // 1-a) As guardian by user uid (preferred)
  const membersByGuardianUidQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.uid) return null;
    return query(collection(firestore, 'members'), where('guardianUserIds', 'array-contains', _user.uid));
  }, [firestore, _user?.uid]);
  const { data: guardianUidMembers, isLoading: areGuardianUidMembersLoading } = useCollection<Member>(membersByGuardianUidQuery);
  // 1-b) Legacy fallback: guardianIds mistakenly stored as member ids; try user uid just in case
  const legacyGuardianQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.uid) return null;
    return query(collection(firestore, 'members'), where('guardianIds', 'array-contains', _user.uid));
  }, [firestore, _user?.uid]);
  const { data: legacyGuardianMembers, isLoading: areLegacyGuardianMembersLoading } = useCollection<Member>(legacyGuardianQuery);
  // 1-b) As self (individual member linked to this _user)
  const membersByUserQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.uid) return null;
    return query(collection(firestore, 'members'), where('userId', '==', _user.uid));
  }, [firestore, _user?.uid]);
  const { data: ownMembers, isLoading: areOwnMembersLoading } = useCollection<Member>(membersByUserQuery);
  // Merge unique
  const members = useMemo(() => {
    const map = new Map<string, Member>();
    (guardianUidMembers || []).forEach(m => map.set(m.id, m));
    (legacyGuardianMembers || []).forEach(m => map.set(m.id, m));
    (ownMembers || []).forEach(m => map.set(m.id, m));
    return Array.from(map.values());
  }, [guardianUidMembers, legacyGuardianMembers, ownMembers]);
  const areMembersLoading = (areGuardianUidMembersLoading || areLegacyGuardianMembersLoading || areOwnMembersLoading);
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
    if (!selectedMember || !paymentMethod || !selectedTemplate) return;
    setIsSubmitting(true);
    try {
      // API를 통한 이용권 요청
      await adminAPI.passes.requestPass({
        type: 'new',
        templateId: selectedTemplate.id,
        memberId: selectedMember.id,
        paymentMethod,
        notes: passNotes
      });
      toast({
        title: '이용권 신청 완료',
        description: `${selectedMember.name} 님의 이용권이 신청되었습니다. 클럽 관리자의 승인을 기다려주세요.`
      });
      // 폼 초기화
      setSelectedMember(null);
      setSelectedTemplate(null);
      setPaymentMethod('cash');
      setPassNotes('');
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: error instanceof Error ? error.message : String(error) || '이용권 신청 중 오류가 발생했습니다.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const getPassStatusBadge = (pass: MemberPass | undefined, member: Member) => {
    if (member.status === 'pending') {
      return <Badge variant="destructive">갱신/가입 승인 대기</Badge>;
    }
    if (!pass) return <Badge variant="secondary">이용권 없음</Badge>;
    switch (pass.status) {
      case 'active':
        if (pass.remainingSessions !== undefined) {
          return <Badge>{`활성: 사용 ${pass.usageCount}회 / 남은 ${pass.remainingSessions ?? 0}`}</Badge>;
        }
        return <Badge>활성 (기간제)</Badge>
      case 'expired':
        return <Badge variant="secondary">만료됨</Badge>;
      case 'suspended':
        return <Badge variant="secondary">일시중지</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">취소됨</Badge>;
      default:
        return <Badge variant="secondary">이용권 없음</Badge>;
    }
  };
  const openModal = (member: Member) => {
      setSelectedMember(member);
      setSelectedTemplate(null);
      setPaymentMethod('cash');
      setPassNotes('');
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
                src={_user?.photoURL || 'https://picsum.photos/seed/user/64/64'}
                alt={_user?.displayName || 'User'}
                width={64}
                height={64}
                className="rounded-full"
              />
            <div>
              <CardTitle className="text-2xl">{_user?.displayName}님</CardTitle>
              <CardDescription>학부모 계정</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">소속 선수/가족 목록</h2>
        {members && members.length > 0 ? members.map(member => {
           const memberPasses = passes?.filter(p => p.memberId === member.id) || [];
           const currentPass = memberPasses.find(p => p.status === 'active');
           const hasPendingPayment = memberPasses.some(p => p.paymentStatus === 'pending');
           const canRequestNewPass = !currentPass && !hasPendingPayment && member.status !== 'pending';
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
                        {getPassStatusBadge(currentPass, member)}
                    </div>
                </CardHeader>
              <CardContent>
                {memberPasses.length > 0 && (
                   <div className="space-y-2">
                        <h4 className="font-semibold flex items-center"><History className="mr-2 h-4 w-4"/>이용권 내역</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground pl-2">
                           {memberPasses.map(p => (
                           <li key={p.id}>{new Date(p.startDate || '').toLocaleDateString()} 시작 ({p.templateName}) - {p.status === 'expired' ? '만료' : p.status === 'active' ? '활성' : p.status === 'suspended' ? '중지' : '취소' }</li>
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
                <Link href={ROUTES.DYNAMIC.MEMBER_DETAIL(member.id)} passHref>
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
                                {template.duration && <p>• 유효기간: {template.duration}일</p>}
                                {template.sessionCount !== undefined && <p>• 총 {template.sessionCount}회 사용 가능</p>}
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
                        onValueChange={(value) => setPaymentMethod(value as 'cash' | 'card' | 'transfer')}
                        value={paymentMethod}
                    >
                        <Label htmlFor="transfer" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                            <RadioGroupItem value="transfer" id="transfer" className="sr-only" />
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
              {selectedTemplate && (
                <div>
                  <Label className="font-semibold">비고 (선택사항)</Label>
                  <textarea
                    className="w-full mt-2 p-3 border rounded-md text-sm"
                    rows={2}
                    value={passNotes}
                    onChange={(e) => setPassNotes(e.target.value)}
                    placeholder="추가 사항이 있으면 입력해주세요"
                  />
                </div>
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                신청 후 클럽 관리자의 승인이 필요합니다. &apos;계좌 이체&apos;를 선택한 경우, 클럽 계좌로 입금 후 승인 요청이 처리됩니다.
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
