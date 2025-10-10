import Image from 'next/image';
import { AppHeader } from '@/components/layout/header';
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
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { members } from '@/lib/data';
import { Member } from '@/types';

const statusTranslations: Record<Member['status'], string> = {
  active: '활동중',
  inactive: '비활동',
}

export default function MembersPage() {
  return (
    <div className="flex flex-col h-full">
      <AppHeader showAddButton={true} addButtonLabel="회원 추가" />
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
                  <TableHead className="hidden md:table-cell">클럽</TableHead>
                  <TableHead className="hidden md:table-cell">레벨</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="hidden lg:table-cell">등록일</TableHead>
                  <TableHead>
                    <span className="sr-only">메뉴</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Image
                          src={member.avatar}
                          alt={member.name}
                          width={40}
                          height={40}
                          className="rounded-full"
                          data-ai-hint="person gymnastics"
                        />
                        <div>
                          <div>{member.name}</div>
                          <div className="text-sm text-muted-foreground hidden sm:block">{member.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{member.club}</TableCell>
                    <TableCell className="hidden md:table-cell">{member.level}</TableCell>
                    <TableCell>
                      <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className={member.status === 'active' ? 'bg-green-500/20 text-green-700 border-green-500/30' : ''}>
                        {statusTranslations[member.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{member.registrationDate}</TableCell>
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
    </div>
  );
}
