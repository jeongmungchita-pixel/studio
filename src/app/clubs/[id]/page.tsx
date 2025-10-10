import Image from 'next/image';
import { AppHeader } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { clubs, members, attendanceRecords } from '@/lib/data';
import { notFound } from 'next/navigation';
import { MapPin, Users, Phone, Mail, Edit } from 'lucide-react';
import type { Attendance, Member } from '@/types';

const statusTranslations: Record<Member['status'], string> = {
  active: '활동중',
  inactive: '비활동',
}

const attendanceStatusTranslations: Record<Attendance['status'], string> = {
  present: '출석',
  absent: '결석',
  excused: '사유',
}

export default function ClubDetailsPage({ params }: { params: { id: string } }) {
  const club = clubs.find((c) => c.id === params.id);
  
  if (!club) {
    notFound();
  }

  const clubMembers = members.filter(m => m.club === club.name);

  return (
    <div className="flex flex-col h-full">
      <AppHeader />
      <main className="flex-1 p-6 space-y-6">
        <Card>
          <CardHeader className="relative">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <Image
                src={club.logo}
                alt={`${club.name} 로고`}
                width={96}
                height={96}
                className="rounded-xl border shrink-0"
                data-ai-hint="logo abstract"
              />
              <div className="flex-grow">
                <CardTitle className="text-3xl">{club.name}</CardTitle>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-muted-foreground">
                    <span className="flex items-center gap-2"><MapPin className="w-4 h-4"/>{club.location}</span>
                    <span className="flex items-center gap-2"><Users className="w-4 h-4"/>회원 {club.members}명</span>
                    <span className="flex items-center gap-2"><Phone className="w-4 h-4"/>+82 2-1234-5678</span>
                    <span className="flex items-center gap-2"><Mail className="w-4 h-4"/>contact@{club.id.toLowerCase()}.com</span>
                </div>
                <CardDescription className="mt-2">
                  헤드 코치: {club.coach}
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="icon" className="absolute top-6 right-6">
              <Edit className="w-4 h-4"/>
              <span className="sr-only">클럽 수정</span>
            </Button>
          </CardHeader>
        </Card>

        <Tabs defaultValue="members" className="w-full">
          <TabsList>
            <TabsTrigger value="members">회원</TabsTrigger>
            <TabsTrigger value="attendance">출석</TabsTrigger>
            <TabsTrigger value="payments">결제</TabsTrigger>
          </TabsList>
          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>소속 회원</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>레벨</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>등록일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clubMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>{member.level}</TableCell>
                        <TableCell>
                          <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                            {statusTranslations[member.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>{member.registrationDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="attendance">
             <div className="grid lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>일일 출석</CardTitle>
                        <CardDescription>오늘 기록, {new Date().toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>회원</TableHead>
                                    <TableHead>상태</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attendanceRecords.map(rec => (
                                    <TableRow key={rec.memberId}>
                                        <TableCell>{rec.memberName}</TableCell>
                                        <TableCell>
                                            <Badge variant={rec.status === 'present' ? 'default' : (rec.status === 'absent' ? 'destructive' : 'secondary')}>
                                                {attendanceStatusTranslations[rec.status]}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>날짜 선택</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Calendar
                            mode="single"
                            selected={new Date()}
                            className="rounded-md border"
                        />
                    </CardContent>
                </Card>
             </div>
          </TabsContent>
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>결제 현황</CardTitle>
                <CardDescription>회원 회비 결제 현황 개요.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground">결제 처리 모듈은 현재 준비 중입니다.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
