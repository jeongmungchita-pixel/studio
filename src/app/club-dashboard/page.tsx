'use client';

import { useUser, useCollection } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { redirect } from 'next/navigation';
import { useFirestore } from '@/firebase/provider';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { useMemo } from 'react';
import type { Member } from '@/types';
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

    const handleStatusChange = async (memberId: string, newStatus: 'active' | 'inactive') => {
        if (!firestore) return;
        const memberRef = doc(firestore, 'members', memberId);
        try {
            await updateDoc(memberRef, { status: newStatus });
            toast({ title: '상태 업데이트 완료', description: '선수 상태가 성공적으로 변경되었습니다.' });
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
    }
    
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
                    <CardTitle>클럽 대시보드: {user.clubName}</CardTitle>
                    <CardDescription>
                        {user.displayName} 관리자님, 환영합니다. 클럽의 선수들을 관리하세요.
                    </CardDescription>
                </CardHeader>
            </Card>

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
                            {members && members.length > 0 ? members.map(member => (
                                 <TableRow key={member.id}>
                                    <TableCell>{member.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(member.status)}>{statusTranslations[member.status]}</Badge>
                                    </TableCell>
                                    <TableCell>{member.email}</TableCell>
                                    <TableCell className="space-x-2">
                                        {member.status === 'active' ? (
                                            <Button size="sm" variant="outline" onClick={() => handleStatusChange(member.id, 'inactive')}>비활성화</Button>
                                        ) : member.status === 'inactive' ? (
                                            <Button size="sm" onClick={() => handleStatusChange(member.id, 'active')}>활성화</Button>
                                        ) : null}
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={4} className="text-center">소속된 선수가 없습니다.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </main>
    );
}
