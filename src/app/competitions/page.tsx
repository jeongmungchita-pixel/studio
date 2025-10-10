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
import { competitions } from '@/lib/data';
import type { Competition } from '@/types';

const statusTranslations: Record<Competition['status'], string> = {
  upcoming: '예정',
  ongoing: '진행중',
  completed: '완료',
}

export default function CompetitionsPage() {
  const getBadgeVariant = (status: Competition['status']): 'default' | 'outline' | 'secondary' | 'destructive' => {
    switch (status) {
      case 'upcoming': return 'default';
      case 'ongoing': return 'outline';
      case 'completed': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <AppHeader showAddButton={true} addButtonLabel="대회 생성" />
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
                  <TableHead>날짜</TableHead>
                  <TableHead className="hidden md:table-cell">장소</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="hidden md:table-cell">참가자</TableHead>
                  <TableHead>
                    <span className="sr-only">기능</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitions.map((comp) => (
                  <TableRow key={comp.id}>
                    <TableCell className="font-medium">{comp.name}</TableCell>
                    <TableCell>{comp.date}</TableCell>
                    <TableCell className="hidden md:table-cell">{comp.location}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(comp.status)}>{statusTranslations[comp.status]}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{comp.participants}</TableCell>
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
    </div>
  );
}
