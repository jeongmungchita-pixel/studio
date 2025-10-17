'use client';

export const dynamic = 'force-dynamic';
import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Member } from '@/types';

const statusTranslations: Record<Member['status'], string> = {
  active: '활동중',
  inactive: '비활동',
  pending: '승인대기',
};

export default function MembersPage() {
  const firestore = useFirestore();
  const membersCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'members') : null), [firestore]);
  const { data: members, isLoading } = useCollection<Member>(membersCollection);

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
                        <DropdownMenuItem>수정</DropdownMenuItem>
                        <DropdownMenuItem>프로필 보기</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">삭제</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
