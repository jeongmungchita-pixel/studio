'use client';

import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { Competition } from '@/types';
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
import { MoreHorizontal, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusTranslations: Record<Competition['status'], string> = {
  upcoming: '예정',
  ongoing: '진행중',
  completed: '완료',
};

export default function CompetitionsPage() {
  const firestore = useFirestore();
  const competitionsCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'competitions') : null), [firestore]);
  const { data: competitions, isLoading } = useCollection<Competition>(competitionsCollection);

  const getBadgeVariant = (status: Competition['status']): 'default' | 'outline' | 'secondary' | 'destructive' => {
    switch (status) {
      case 'upcoming': return 'default';
      case 'ongoing': return 'outline';
      case 'completed': return 'secondary';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-6">
      <Card>
        <CardHeader>
          <CardTitle>전체 대회</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>대회명</TableHead>
                <TableHead>시작일</TableHead>
                <TableHead>종료일</TableHead>
                <TableHead className="hidden md:table-cell">장소</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>
                  <span className="sr-only">기능</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitions?.map((comp) => (
                <TableRow key={comp.id}>
                  <TableCell className="font-medium">{comp.name}</TableCell>
                  <TableCell>{new Date(comp.startDate).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(comp.endDate).toLocaleDateString()}</TableCell>
                  <TableCell className="hidden md:table-cell">{comp.location}</TableCell>
                  <TableCell>
                    {/* Status logic might need to be implemented based on dates */}
                    <Badge variant={getBadgeVariant('upcoming')}>{statusTranslations['upcoming']}</Badge>
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
                        <DropdownMenuItem>관리</DropdownMenuItem>
                        <DropdownMenuItem>결과 보기</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">취소</DropdownMenuItem>
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
