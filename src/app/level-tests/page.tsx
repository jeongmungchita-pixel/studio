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
import { levelTests } from '@/lib/data';
import type { LevelTest } from '@/types';

const statusTranslations: Record<LevelTest['status'], string> = {
  scheduled: '예정',
  completed: '완료',
}

export default function LevelTestsPage() {
  return (
    <div className="flex flex-col h-full">
      <AppHeader showAddButton={true} addButtonLabel="테스트 일정 추가" />
      <main className="flex-1 p-6">
        <Card>
          <CardHeader>
            <CardTitle>레벨 테스트</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>테스트명</TableHead>
                  <TableHead>날짜</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>응시자</TableHead>
                  <TableHead>
                    <span className="sr-only">기능</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levelTests.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="font-medium">{test.name}</TableCell>
                    <TableCell>{test.date}</TableCell>
                    <TableCell>
                      <Badge variant={test.status === 'scheduled' ? 'default' : 'secondary'}>
                        {statusTranslations[test.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{test.candidates}</TableCell>
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
                          <DropdownMenuItem>결과 입력</DropdownMenuItem>
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
