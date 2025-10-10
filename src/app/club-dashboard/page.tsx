'use client';

import { useUser, useCollection } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { redirect } from 'next/navigation';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query, where, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useMemo } from 'react';
import type { Member, MemberPass } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';

export default function ClubDashboardPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    // Query for all members (regular and pending) in the club
    const membersQuery = useMemoFirebase(() => {
        if (!firestore || !user?.clubId) return null;
        return query(collection(firestore, 'members'), where('clubId', '==', user.clubId));
    }, [firestore, user?.clubId]);

    const { data: members, isLoading: areMembersLoading } = useCollection<Member>(membersQuery);
    
    // Filter members based on their status
    const pendingMembers = useMemo(() => members?.filter(m => m.status === 'pending') || [], [members]);
    const regularMembers = useMemo(() => members?.filter(m => m.status === 'active' || m.status === 'inactive') || [], [members]);


    const handleApproval = async (memberId: string, approve: boolean) => {
        if (!firestore) return;

        const memberRef = doc(firestore, 'members', memberId);

        if (!approve) {
            try {
                await deleteDoc(memberRef);
                toast({ title: '요청 거절', description: '가입/갱신 요청이 거절되었습니다.' });
            } catch (error) {
                toast({ variant: 'destructive', title: '오류', description: '요청 거절 중 오류가 발생했습니다.' });
            }
            return;
        }

        // Approve logic
        try {
            const batch = writeBatch(firestore);

            // 1. Update member status to 'active'
            batch.update(memberRef, { status: 'active' });

            // 2. Find the pending pass for this member and activate it
            const passesRef = collection(firestore, 'member_passes');
            const pendingPassQuery = query(passesRef, where('memberId', '==', memberId), where('status', '==', 'pending'));
            
            // Because we don't have getDocs in a batch, we do it before. This is not perfectly transactional.
            const { getDocs } = await import('firebase/firestore');
            const pendingPassSnap = await getDocs(pendingPassQuery);

            if (!pendingPassSnap.empty) {
                const passDoc = pendingPassSnap.docs[0];
                const passRef = doc(firestore, 'member_passes', passDoc.id);
                batch.update(passRef, { 
                    status: 'active',
                    startDate: new Date().toISOString() 
                });
                // 3. Update the member's activePassId
                batch.update(memberRef, { activePassId: passDoc.id });
            }

            await batch.commit();
            toast({ title: '승인 완료', description: '요청이 승인되었습니다.' });

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: '오류', description: '승인 처리 중 오류가 발생했습니다.' });
        }
    };
    
     const handleStatusChange = async (memberId: string, newStatus: 'active' | 'inactive') => {
        if (!firestore) return;
        const memberRef = doc(firestore, 'members', memberId);
        try {
            await updateDoc(memberRef, { status: newStatus });
            const message = newStatus === 'active' ? '선수 상태가 활성화되었습니다.' : '선수 상태가 비활성화되었습니다.';
            toast({ title: '상태 업데이트 완료', description: message });
        } catch (error) {
            toast({ variant: 'destructive', title: '오류', description: '상태 업데이트 중 오류가 발생했습니다.' });
        }
    };

    if (isUserLoading || areMembersLoading) {
        return (
          <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        );
    }
    
    if (!user || user.role !== 'club-admin') {
        redirect('/dashboard');
        return null;
    }
    
    const getStatusVariant = (status: Member['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
        switch (status) {
        case 'active':
            return 'default';
        case 'pending':
            return 'destructive';
        case 'inactive':
        default:
            return 'secondary';
        }
    };
    
    const statusTranslations: Record<Member['status'], string> = {
      active: '활동중',
      inactive: '비활동',
      pending: '승인 대기',
    };

    const MemberTable = ({ memberList, listType }: { memberList: Member[], listType: 'regular' | 'pending' }) => (
      <Table>
          <TableHeader>
              <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>기능</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
              {memberList.length > 0 ? memberList.map(member => (
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
                            <div>
                                <div>{member.name}</div>
                                <div className="text-sm text-muted-foreground hidden sm:block">
                                    {new Date(member.dateOfBirth || '').toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                      </TableCell>
                      <TableCell>
                          <Badge variant={getStatusVariant(member.status)}>{statusTranslations[member.status]}</Badge>
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell className="space-x-2">
                          {listType === 'regular' && member.status === 'active' && (
                              <Button size="sm" variant="outline" onClick={() => handleStatusChange(member.id, 'inactive')}>비활성화</Button>
                          )}
                          {listType === 'regular' && member.status === 'inactive' && (
                               <Button size="sm" onClick={() => handleStatusChange(member.id, 'active')}>활성화</Button>
                          )}
                           {listType === 'pending' && (
                            <>
                                <Button size="sm" onClick={() => handleApproval(member.id, true)}>승인</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleApproval(member.id, false)}>거절</Button>
                            </>
                          )}
                      </TableCell>
                  </TableRow>
              )) : <TableRow><TableCell colSpan={4} className="text-center">해당하는 선수가 없습니다.</TableCell></TableRow>}
          </TableBody>
      </Table>
    );

    return (
        <main className="flex-1 p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>클럽 대시보드: {user.clubName}</CardTitle>
                    <CardDescription>
                        {user.displayName} 관리자님, 환영합니다. 클럽의 선수들을 관리하세요.
                    </CardDescription>
                </CardHeader>
            </Card>

             <Tabs defaultValue="members" className="w-full">
                <TabsList>
                    <TabsTrigger value="members">소속 선수 명단</TabsTrigger>
                    <TabsTrigger value="requests">
                        가입/갱신 요청
                        {pendingMembers.length > 0 && <Badge className="ml-2">{pendingMembers.length}</Badge>}
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="members">
                    <Card>
                        <CardHeader>
                            <CardTitle>소속 선수 관리</CardTitle>
                            <CardDescription>현재 클럽에 소속된 활동중 또는 비활동 상태의 선수 목록입니다.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <MemberTable memberList={regularMembers} listType="regular" />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="requests">
                     <Card>
                        <CardHeader>
                            <CardTitle>가입/갱신 요청 관리</CardTitle>
                            <CardDescription>신규 가입 또는 이용권 갱신을 요청한 선수 목록입니다.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MemberTable memberList={pendingMembers} listType="pending" />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </main>
    );
}
