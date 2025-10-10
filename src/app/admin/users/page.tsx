'use client';

import { useCollection, useUser } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
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
import type { UserProfile } from '@/types';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminUsersPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

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

  const handleApprove = async (userId: string) => {
    if (!firestore) return;
    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, { status: 'approved' });
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
  }

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
                    <TableCell>
                      {u.role === 'club-admin' && u.status === 'pending' && (
                        <Button size="sm" onClick={() => handleApprove(u.uid)}>
                          승인
                        </Button>
                      )}
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
