'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useUser, useCollection, useFirestore } from '@/firebase';
import type { Member, MemberPass } from '@/types';
import { collection, query, where, writeBatch, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Ticket } from 'lucide-react';
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

export default function ClubPassesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);

  // 1. Fetch active members for the current club admin
  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(collection(firestore, 'members'), where('clubId', '==', user.clubId));
  }, [firestore, user?.clubId]);
  const { data: members, isLoading: areMembersLoading } = useCollection<Member>(membersQuery);

  // 2. Fetch all passes for the members of this club (active, pending, and expired)
  const memberIds = members?.map(m => m.id) || [];
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

      // New pass document with 'active' status
      const newPassRef = doc(collection(firestore, 'member_passes'));
      const newPass: MemberPass = {
        id: newPassRef.id,
        memberId: selectedMember.id,
        clubId: selectedMember.clubId,
        passType: 'manual-issue',
        passName: '수동 발급 이용권',
        startDate: new Date().toISOString(),
        totalSessions: 5,
        attendableSessions: 4,
        remainingSessions: 5,
        attendanceCount: 0,
        status: 'active', // Manually issued pass is active immediately
      };
      batch.set(newPassRef, newPass);

      // Update member's activePassId and status
      const memberRef = doc(firestore, 'members', selectedMember.id);
      batch.update(memberRef, { activePassId: newPass.id, status: 'active' });

      await batch.commit();
      
      toast({
        title: '이용권 수동 발급 완료',
        description: `${selectedMember.name} 님에게 새로운 이용권이 수동으로 발급되었습니다.`
      });
      setSelectedMember(null);
    } catch (error) {
      console.error("Error issuing pass: ", error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '이용권 발급 중 오류가 발생했습니다.'
      });
    } finally {
      setIsIssuing(false);
    }
  };
  
  const getPassStatusBadge = (pass: MemberPass | undefined, member: Member) => {
      if(member.status === 'pending') {
         return <Badge variant="destructive">가입/갱신 대기</Badge>
      }
      if (pass) {
          if (pass.status === 'active') {
             if (pass.totalSessions !== undefined) {
                return <Badge>{`${pass.attendanceCount} / ${pass.attendableSessions} (남은 기회: ${pass.remainingSessions})`}</Badge>;
             }
             return <Badge>활성 (무제한)</Badge>;
          }
          if (pass.status === 'pending') {
             return <Badge variant="destructive">갱신 승인 대기</Badge>;
          }
           if (pass.status === 'expired') {
             return <Badge variant="secondary">만료됨</Badge>;
          }
      }
      return <Badge variant="secondary">이용권 없음</Badge>;
  }

  const isLoading = areMembersLoading || arePassesLoading;

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>선수 이름</TableHead>
                  <TableHead>이용권 상태</TableHead>
                  <TableHead className="text-right">수동 발급 (예외용)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members?.map(member => {
                  const currentPass = passes?.find(p => p.id === member.activePassId);
                  const hasPendingPass = passes?.some(p => p.memberId === member.id && p.status === 'pending');
                  const canIssueNewPass = !currentPass || currentPass.status === 'expired';
                  
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
                        {getPassStatusBadge(currentPass, member)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm"
                          onClick={() => setSelectedMember(member)}
                          disabled={!canIssueNewPass || hasPendingPass}
                          title={!canIssueNewPass ? "활성 또는 대기중인 이용권이 이미 있습니다." : ""}
                        >
                          <Ticket className="mr-2 h-4 w-4" />
                          수동 발급
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                 {(!members || members.length === 0) &&
                    <TableRow><TableCell colSpan={3} className="text-center">활동중인 선수가 없습니다.</TableCell></TableRow>
                  }
              </TableBody>
            </Table>
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
                발급 즉시 이용권이 활성화되며, 선수의 상태도 '활동중'으로 변경됩니다.
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
