'use client';

export const dynamic = 'force-dynamic';
import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { Member, MemberPass } from '@/types';
import { collection, query, where, writeBatch, doc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Ticket, User, Baby, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getMemberCategoryLabel, getMemberCategoryColor, calculateAge } from '@/lib/member-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

export default function ClubPassesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'adult' | 'child'>('all');

  // 1. Fetch ONLY active members for the current club admin
  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(collection(firestore, 'members'), where('clubId', '==', user.clubId), where('status', '==', 'active'));
  }, [firestore, user?.clubId]);
  const { data: members, isLoading: areMembersLoading } = useCollection<Member>(membersQuery);

  // Filter members by category
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (categoryFilter === 'all') return members;
    
    return members.filter(member => {
      const memberCategory = member.memberCategory || 
        (calculateAge(member.dateOfBirth) >= 19 ? 'adult' : 'child');
      return memberCategory === categoryFilter;
    });
  }, [members, categoryFilter]);

  // Count members by category
  const memberCounts = useMemo(() => {
    if (!members) return { all: 0, adult: 0, child: 0 };
    
    const counts = { all: members.length, adult: 0, child: 0 };
    members.forEach(member => {
      const memberCategory = member.memberCategory || 
        (calculateAge(member.dateOfBirth) >= 19 ? 'adult' : 'child');
      if (memberCategory === 'adult') counts.adult++;
      else counts.child++;
    });
    
    return counts;
  }, [members]);

  // 2. Fetch all passes for the active members of this club
  const memberIds = useMemo(() => members?.map(m => m.id) || [], [members]);
  const passesQuery = useMemoFirebase(() => {
    if (!firestore || memberIds.length === 0) return null;
    return query(collection(firestore, 'member_passes'), where('memberId', 'in', memberIds));
  }, [firestore, memberIds]);
  const { data: passes, isLoading: arePassesLoading } = useCollection<MemberPass>(passesQuery);

  const handleIssuePass = async () => {
    if (!firestore || !selectedMember) return;
    setIsIssuing(true);

    try {
      const batch = writeBatch(firestore);

      const newPassRef = doc(collection(firestore, 'member_passes'));
      const now = new Date();
      const end = new Date(now);
      end.setMonth(end.getMonth() + 1);
      const newPass: MemberPass = {
        id: newPassRef.id,
        templateId: 'manual',
        templateName: '수동 발급 이용권',
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        clubId: selectedMember.clubId,
        type: 'session-based',
        startDate: now.toISOString(),
        endDate: end.toISOString(),
        remainingSessions: 5,
        price: 0,
        paymentStatus: 'paid',
        status: 'active',
        usageCount: 0,
        createdAt: now.toISOString(),
      };
      batch.set(newPassRef, newPass);

      const memberRef = doc(firestore, 'members', selectedMember.id);
      batch.update(memberRef, { activePassId: newPass.id });

      await batch.commit();
      
      toast({
        title: '이용권 수동 발급 완료',
        description: `${selectedMember.name} 님에게 새로운 이용권이 수동으로 발급되었습니다.`
      });
      setSelectedMember(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '이용권 발급 중 오류가 발생했습니다.'
      });
    } finally {
      setIsIssuing(false);
    }
  };
  
  const getPassStatusBadge = (pass: MemberPass | undefined) => {
    if (!pass) return <Badge variant="secondary">이용권 없음 / 만료</Badge>;
    if (pass.type === 'session-based') {
      const used = pass.usageCount ?? 0;
      const remaining = pass.remainingSessions ?? 0;
      return <Badge>{`세션권 (사용 ${used}회 / 남은 ${remaining}회)`}</Badge>;
    }
    if (pass.endDate) {
      const remainingDays = Math.ceil((new Date(pass.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return <Badge>{`기간권 (${remainingDays > 0 ? `${remainingDays}일 남음` : '만료'})`}</Badge>;
    }
    return <Badge>활성 (무제한)</Badge>;
  };

  const isLoading = areMembersLoading || arePassesLoading;

  const renderMemberTable = (membersList: Member[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>선수 이름</TableHead>
          <TableHead>분류</TableHead>
          <TableHead>이용권 상태</TableHead>
          <TableHead className="text-right">수동 발급 (예외용)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {membersList.map(member => {
          const currentPass = passes?.find(p => p.id === member.activePassId);
          const canIssueNewPass = !currentPass || currentPass.status === 'expired';
          const memberCategory = member.memberCategory || 
            (calculateAge(member.dateOfBirth) >= 19 ? 'adult' : 'child');
          const categoryColors = getMemberCategoryColor(memberCategory);
          
          return (
            <TableRow key={member.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <Image
                    src={member.photoURL || `https://picsum.photos/seed/${member.id}/40/40`}
                    alt={member.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                    data-ai-hint="person gymnastics"
                  />
                  <span>{member.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={categoryColors.badge}>
                  {memberCategory === 'adult' ? <User className="inline h-3 w-3 mr-1" /> : <Baby className="inline h-3 w-3 mr-1" />}
                  {getMemberCategoryLabel(memberCategory)}
                </Badge>
              </TableCell>
              <TableCell>
                {getPassStatusBadge(currentPass)}
              </TableCell>
              <TableCell className="text-right">
                <Button 
                  size="sm"
                  onClick={() => setSelectedMember(member)}
                  disabled={!canIssueNewPass}
                  title={!canIssueNewPass ? "활성 또는 대기중인 이용권이 이미 있습니다." : "새 이용권을 수동으로 발급합니다."}
                >
                  <Ticket className="mr-2 h-4 w-4" />
                  수동 발급
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
        {membersList.length === 0 &&
          <TableRow><TableCell colSpan={4} className="text-center">해당 분류의 활동중인 선수가 없습니다.</TableCell></TableRow>
        }
      </TableBody>
    </Table>
  );

  return (
    <main className="flex-1 p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>이용권 현황</CardTitle>
          <CardDescription>클럽 소속 선수의 이용권 현황을 보고, 필요시 예외적인 상황에만 수동으로 발급합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : (
            <Tabs value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as 'all' | 'adult' | 'child')}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="all">
                  <Users className="mr-2 h-4 w-4" />
                  전체 ({memberCounts.all})
                </TabsTrigger>
                <TabsTrigger value="adult">
                  <User className="mr-2 h-4 w-4" />
                  성인 ({memberCounts.adult})
                </TabsTrigger>
                <TabsTrigger value="child">
                  <Baby className="mr-2 h-4 w-4" />
                  주니어 ({memberCounts.child})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                {renderMemberTable(filteredMembers)}
              </TabsContent>
              <TabsContent value="adult">
                {renderMemberTable(filteredMembers)}
              </TabsContent>
              <TabsContent value="child">
                {renderMemberTable(filteredMembers)}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedMember} onOpenChange={(isOpen) => !isOpen && setSelectedMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이용권 수동 발급 확인</DialogTitle>
            <DialogDescription>
              {selectedMember?.name} 선수에게 새로운 이용권을 수동으로 발급하시겠습니까? 이 기능은 선결제 등 예외적인 상황에만 사용해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
              <p><strong>발급 대상:</strong> {selectedMember?.name}</p>
              <p><strong>이용권 유형:</strong> 수동 발급 표준 이용권 (총 5회, 출석 4회 필요)</p>
              <p className="mt-2 text-sm text-muted-foreground">
                발급 즉시 이용권이 활성화되며, 선수의 activePassId가 갱신됩니다.
              </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button onClick={handleIssuePass} disabled={isIssuing}>
              {isIssuing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              발급
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
