'use client';

import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { collection, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
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
import { MoreHorizontal, Loader2, Eye, Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Member } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const statusTranslations: Record<Member['status'], string> = {
  active: '활동중',
  inactive: '비활동',
  pending: '승인대기',
};

export default function MembersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  const membersCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'members') : null), [firestore]);
  const { data: members, isLoading } = useCollection<Member>(membersCollection);

  const handleDelete = async () => {
    if (!firestore || !memberToDelete) return;

    try {
      await deleteDoc(doc(firestore, 'members', memberToDelete.id));
      toast({
        title: '삭제 완료',
        description: `${memberToDelete.name}님의 정보가 삭제되었습니다.`,
      });
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    } catch (error) {
      console.error('삭제 오류:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '회원 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  const handleStatusChange = async (member: Member, newStatus: Member['status']) => {
    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'members', member.id), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      toast({
        title: '상태 변경 완료',
        description: `${member.name}님의 상태가 ${statusTranslations[newStatus]}(으)로 변경되었습니다.`,
      });
    } catch (error) {
      console.error('상태 변경 오류:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '상태 변경 중 오류가 발생했습니다.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
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

  return (
    <main className="flex-1 p-6">
      <Card>
        <CardHeader>
          <CardTitle>전체 회원</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead className="hidden md:table-cell">클럽 ID</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="hidden lg:table-cell">생년월일</TableHead>
                <TableHead>
                  <span className="sr-only">메뉴</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members?.map((member) => (
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
                        <div className="text-sm text-muted-foreground hidden sm:block">{member.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{member.clubId}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(member.status)}>
                      {statusTranslations[member.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">메뉴 열기</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>기능</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/members/${member.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          프로필 보기
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>상태 변경</DropdownMenuLabel>
                        {member.status !== 'active' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(member, 'active')}>
                            활동중으로 변경
                          </DropdownMenuItem>
                        )}
                        {member.status !== 'inactive' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(member, 'inactive')}>
                            비활동으로 변경
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          onClick={() => {
                            setMemberToDelete(member);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>회원 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToDelete?.name}님의 정보를 삭제하시겠습니까?
              <br />
              <span className="text-destructive font-semibold">이 작업은 되돌릴 수 없습니다.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToDelete(null)}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
