'use client';

import { useUser, useCollection } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { redirect } from 'next/navigation';
import { useFirestore } from '@/firebase/provider';
import { collection, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useMemo } from 'react';
import type { Member } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function ClubDashboardPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const membersQuery = useMemo(() => {
        if (!firestore || !user?.clubId) return null;
        return query(collection(firestore, 'members'), where('clubId', '==', user.clubId));
    }, [firestore, user?.clubId]);

    const { data: members, isLoading: areMembersLoading } = useCollection<Member>(membersQuery);

    const handleApproval = async (memberId: string, newStatus: 'active' | 'inactive') => {
        if (!firestore) return;
        const memberRef = doc(firestore, 'members', memberId);
        try {
            await updateDoc(memberRef, { status: newStatus });
            toast({ title: '상태 업데이트 완료', description: '선수 상태가 성공적으로 변경되었습니다.' });
        } catch (error) {
            toast({ variant: 'destructive', title: '오류', description: '상태 업데이트 중 오류가 발생했습니다.' });
        }
    };
    
    const handleRejection = async (memberId: string) => {
        if (!firestore) return;
        const memberRef = doc(firestore, 'members', memberId);
        try {
            await deleteDoc(memberRef);
            toast({ title: '요청 거절 완료', description: '가입 요청이 삭제되었습니다.' });
        } catch (error) {
            toast({ variant: 'destructive', title: '오류', description: '요청 삭제 중 오류가 발생했습니다.' });
        }
    }

    if (isUserLoading || areMembersLoading) {
        return (
          <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        );
    }
    
    if (!user || user.role !== 'club-admin') {
        redirect('/dashboard');
    }

    const pendingMembers = members?.filter(m => m.status === 'pending') || [];
    const activeMembers = members?.filter(m => m.status === 'active' || m.status === 'inactive') || [];
    
    const getStatusVariant = (status: Member['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
        if (!status) return 'secondary';
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

    return (
        <main className="flex-1 p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>클럽 대시보드</CardTitle>
                    <CardDescription>{user.clubName} 관리자님, 환영합니다. 클럽의 선수들을 관리하세요.</CardDescription>
                </CardHeader>
            </Card>

            <Tabs defaultValue="requests" className="w-full">
                <TabsList>
                    <TabsTrigger value="requests">
                        가입 요청 <Badge variant="destructive" className="ml-2">{pendingMembers.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="members">소속 선수</TabsTrigger>
                </TabsList>
                <TabsContent value="requests">
                    <Card>
                        <CardHeader>
                            <CardTitle>가입 요청 관리</CardTitle>
                            <CardDescription>클럽에 들어오고 싶어하는 선수들의 가입 요청을 관리합니다.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>이름</TableHead>
                                        <TableHead>생년월일</TableHead>
                                        <TableHead>기능</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingMembers.length > 0 ? pendingMembers.map(member => (
                                        <TableRow key={member.id}>
                                            <TableCell>{member.firstName} {member.lastName}</TableCell>
                                            <TableCell>{new Date(member.dateOfBirth).toLocaleDateString()}</TableCell>
                                            <TableCell className="space-x-2">
                                                <Button size="sm" onClick={() => handleApproval(member.id, 'active')}>승인</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleRejection(member.id)}>거절</Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={3} className="text-center">새로운 가입 요청이 없습니다.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="members">
                    <Card>
                        <CardHeader>
                            <CardTitle>소속 선수 관리</CardTitle>
                            <CardDescription>현재 클럽에 소속된 모든 선수들의 목록입니다.</CardDescription>
                        </CardHeader>
                        <CardContent>
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
                                    {activeMembers.length > 0 ? activeMembers.map(member => (
                                         <TableRow key={member.id}>
                                            <TableCell>{member.firstName} {member.lastName}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(member.status)}>{statusTranslations[member.status]}</Badge>
                                            </TableCell>
                                            <TableCell>{member.email}</TableCell>
                                            <TableCell className="space-x-2">
                                                {member.status === 'active' ? (
                                                    <Button size="sm" variant="outline" onClick={() => handleApproval(member.id, 'inactive')}>비활성화</Button>
                                                ) : (
                                                    <Button size="sm" onClick={() => handleApproval(member.id, 'active')}>활성화</Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={4} className="text-center">소속된 선수가 없습니다.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </main>
    );
}
