'use client';

import { useCollection, useUser } from '@/firebase';
import { collection, doc, writeBatch, deleteDoc } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { UserProfile, Club } from '@/types';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function AdminUsersPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const usersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: users, isLoading: isUsersLoading } =
    useCollection<UserProfile>(usersCollection);

  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // This page is for admins only
  if (user.role !== 'admin') {
    router.push('/dashboard');
    return null;
  }

  const handleApprove = async (userToApprove: UserProfile) => {
    if (!firestore || !userToApprove.clubName) return;

    try {
      const batch = writeBatch(firestore);

      // 1. Update user status to 'approved'
      const userRef = doc(firestore, 'users', userToApprove.uid);
      batch.update(userRef, { status: 'approved' });

      // 2. Create a new club document
      const clubRef = doc(collection(firestore, 'clubs'));
      const newClub: Club = {
        id: clubRef.id,
        name: userToApprove.clubName,
        contactName: userToApprove.displayName,
        contactEmail: userToApprove.email,
        contactPhoneNumber: userToApprove.phoneNumber || '',
        location: '미정', // Default location
      };
      batch.set(clubRef, newClub);

      // 3. Update the club-admin's profile with the new clubId
      batch.update(userRef, { clubId: clubRef.id });

      await batch.commit();

      toast({
        title: '승인 완료',
        description: `${userToApprove.clubName} 클럽이 생성되고 ${userToApprove.displayName} 님의 계정이 승인되었습니다.`,
      });
    } catch (error) {
      console.error('Error approving user and creating club:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '사용자 승인 및 클럽 생성 중 오류가 발생했습니다.',
      });
    }
  };

  const handleDelete = async (userToDelete: UserProfile) => {
    if (!firestore) return;
    if (userToDelete.uid === user.uid) {
      toast({
        variant: 'destructive',
        title: '삭제 불가',
        description: '자신의 계정은 삭제할 수 없습니다.',
      });
      return;
    }
    const userRef = doc(firestore, 'users', userToDelete.uid);
    try {
      await deleteDoc(userRef);
      toast({
        title: '사용자 삭제 완료',
        description: `${userToDelete.displayName} 님의 계정이 삭제되었습니다.`,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '사용자 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  const getStatusVariant = (
    status?: 'pending' | 'approved'
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (!status) return 'secondary';
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getRoleDisplayName = (role: UserProfile['role']) => {
    switch (role) {
      case 'admin':
        return '최고 관리자';
      case 'club-admin':
        return '클럽 관리자';
      case 'member':
        return '일반 회원';
      default:
        return role;
    }
  };

  return (
    <main className="flex-1 p-6">
      <Card>
        <CardHeader>
          <CardTitle>사용자 관리</CardTitle>
        </CardHeader>
        <CardContent>
          {isUsersLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이메일</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>클럽명</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>기능</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((u) => (
                  <TableRow key={u.uid}>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{getRoleDisplayName(u.role)}</TableCell>
                    <TableCell>{u.clubName || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(u.status)}>
                        {u.status === 'pending' ? '승인 대기' : '승인됨'}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-2">
                      {u.role === 'club-admin' && u.status === 'pending' ? (
                        <>
                          <Button size="sm" onClick={() => handleApprove(u)}>
                            승인
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(u)}
                          >
                            거절
                          </Button>
                        </>
                      ) : u.uid !== user.uid ? ( // Do not show delete button for the current admin's own account
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(u)}
                        >
                          삭제
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
