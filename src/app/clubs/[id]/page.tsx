'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { useCollection, useDoc, useFirestore } from '@/firebase';
import type { Member, Club, Attendance } from '@/types';
import { collection, doc, query, where, addDoc, updateDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { MapPin, Users, Phone, Mail, Edit, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, startOfDay, endOfDay } from 'date-fns';
import { upsertDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

const statusTranslations: Record<Member['status'], string> = {
  active: '활동중',
  inactive: '비활동',
  pending: '승인 대기',
};

const attendanceStatusTranslations: Record<Attendance['status'], string> = {
  present: '출석',
  absent: '결석',
  excused: '사유',
};

const getAttendanceStatusVariant = (status: Attendance['status']) => {
  switch (status) {
    case 'present':
      return 'default';
    case 'absent':
      return 'destructive';
    case 'excused':
      return 'secondary';
  }
};


export default function ClubDetailsPage({ params }: { params: { id: string } }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const clubRef = useMemoFirebase(() => (firestore ? doc(firestore, 'clubs', params.id) : null), [firestore, params.id]);
  const { data: club, isLoading: isClubLoading } = useDoc<Club>(clubRef);

  const membersQuery = useMemoFirebase(() => (
    firestore ? query(collection(firestore, 'members'), where('clubId', '==', params.id), where('status', '==', 'active')) : null
  ), [firestore, params.id]);
  const { data: clubMembers, isLoading: areMembersLoading } = useCollection<Member>(membersQuery);
  
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !selectedDate) return null;
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);
    return query(
      collection(firestore, 'attendance'), 
      where('clubId', '==', params.id),
      where('date', '>=', dayStart.toISOString()),
      where('date', '<=', dayEnd.toISOString())
    );
  }, [firestore, params.id, selectedDate]);

  const { data: attendanceRecords, isLoading: areAttendanceRecordsLoading } = useCollection<Attendance>(attendanceQuery);

  const handleStatusChange = (memberId: string, newStatus: Attendance['status']) => {
    if (!firestore || !selectedDate) return;

    const record = attendanceRecords?.find(r => r.memberId === memberId);
    const date = startOfDay(selectedDate).toISOString();

    if (record) {
      // Update existing record
      const recordRef = doc(firestore, 'attendance', record.id);
      upsertDocumentNonBlocking(recordRef, { status: newStatus }, {merge: true});
    } else {
      // Create new record
      const newRecord: Omit<Attendance, 'id'> = {
        memberId,
        clubId: params.id,
        date,
        status: newStatus,
      };
      const collectionRef = collection(firestore, 'attendance');
      upsertDocumentNonBlocking(collectionRef, newRecord);
    }

    toast({
      title: '출석 상태 변경',
      description: `${attendanceStatusTranslations[newStatus]}(으)로 업데이트되었습니다.`
    });
  };

  if (isClubLoading || areMembersLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!club) {
    notFound();
  }

  return (
    <main className="flex-1 p-6 space-y-6">
      <Card>
        <CardHeader className="relative">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Image
              src={`https://picsum.photos/seed/${club.id}/96/96`}
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
                <span className="flex items-center gap-2"><Users className="w-4 h-4"/>활동 선수 {clubMembers?.length || 0}명</span>
                <span className="flex items-center gap-2"><Phone className="w-4 h-4"/>{club.contactPhoneNumber}</span>
                <span className="flex items-center gap-2"><Mail className="w-4 h-4"/>{club.contactEmail}</span>
              </div>
              <CardDescription className="mt-2">
                담당자: {club.contactName}
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
                    <TableHead>생년월일</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>이메일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clubMembers?.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.firstName} {member.lastName}</TableCell>
                      <TableCell>{new Date(member.dateOfBirth).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                          {statusTranslations[member.status]}
                        </Badge>
                      </TableCell>
                       <TableCell>{member.email}</TableCell>
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
                      <CardTitle>일일 출석부</CardTitle>
                      <CardDescription>{selectedDate ? format(selectedDate, 'yyyy년 M월 d일') : ''} 출석 현황</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {areAttendanceRecordsLoading ? (
                       <div className="flex justify-center items-center h-40">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                       </div>
                    ) : (
                       <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>선수 이름</TableHead>
                                  <TableHead className="w-[150px]">상태</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {clubMembers?.map(member => {
                                const attendanceRecord = attendanceRecords?.find(rec => rec.memberId === member.id);
                                return (
                                  <TableRow key={member.id}>
                                      <TableCell>{member.firstName} {member.lastName}</TableCell>
                                      <TableCell>
                                          <Select 
                                            value={attendanceRecord?.status}
                                            onValueChange={(newStatus: Attendance['status']) => handleStatusChange(member.id, newStatus)}
                                          >
                                              <SelectTrigger>
                                                  <SelectValue placeholder="상태 선택" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                  <SelectItem value="present">출석</SelectItem>
                                                  <SelectItem value="absent">결석</SelectItem>
                                                  <SelectItem value="excused">사유</SelectItem>
                                              </SelectContent>
                                          </Select>
                                      </TableCell>
                                  </TableRow>
                                )
                              })}
                              {(!clubMembers || clubMembers.length === 0) &&
                                <TableRow><TableCell colSpan={2} className="text-center">활동중인 선수가 없습니다.</TableCell></TableRow>
                              }
                          </TableBody>
                       </Table>
                    )}
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <CardTitle>날짜 선택</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                      <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
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
  );
}
