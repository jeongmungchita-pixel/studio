'use client';

import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { useCollection, useDoc, useFirestore } from '@/firebase';
import type { Member, Club, Attendance, MemberPass } from '@/types';
import { collection, doc, query, where, writeBatch, runTransaction, getDocs } from 'firebase/firestore';
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
import { format, startOfDay, endOfDay, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

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

export default function ClubDetailsClient({ id: clubId }: { id: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});

  const clubRef = useMemoFirebase(() => (firestore ? doc(firestore, 'clubs', clubId) : null), [firestore, clubId]);
  const { data: club, isLoading: isClubLoading } = useDoc<Club>(clubRef);

  const membersQuery = useMemoFirebase(() => (
    firestore ? query(collection(firestore, 'members'), where('clubId', '==', clubId), where('status', '==', 'active')) : null
  ), [firestore, clubId]);
  const { data: clubMembers, isLoading: areMembersLoading } = useCollection<Member>(membersQuery);
  
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !selectedDate) return null;
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);
    return query(
      collection(firestore, 'attendance'), 
      where('clubId', '==', clubId),
      where('date', '>=', dayStart.toISOString()),
      where('date', '<=', dayEnd.toISOString())
    );
  }, [firestore, clubId, selectedDate]);

  const { data: attendanceRecords, isLoading: areAttendanceRecordsLoading } = useCollection<Attendance>(attendanceQuery);
  
  const memberIds = useMemo(() => clubMembers?.map(m => m.id) || [], [clubMembers]);
  const memberPassesQuery = useMemoFirebase(() => {
    if (!firestore || memberIds.length === 0) return null;
    return query(collection(firestore, 'member_passes'), where('memberId', 'in', memberIds));
  }, [firestore, memberIds]);
  const { data: memberPasses, isLoading: arePassesLoading } = useCollection<MemberPass>(memberPassesQuery);
  
  // Check for expired duration-based passes on page load
  useEffect(() => {
    if (!firestore || !memberPasses || memberPasses.length === 0) return;
    
    const checkAndExpirePasses = async () => {
        const batch = writeBatch(firestore);
        let passesToExpire = 0;
        const now = new Date();

        memberPasses.forEach(pass => {
            if (pass.status === 'active' && pass.endDate) {
                if (now > new Date(pass.endDate)) {
                    const passRef = doc(firestore, 'member_passes', pass.id);
                    batch.update(passRef, { status: 'expired' });
                    passesToExpire++;
                }
            }
        });

        if (passesToExpire > 0) {
            try {
                await batch.commit();
                toast({ title: '이용권 만료 처리', description: `${passesToExpire}개의 기간 만료 이용권이 업데이트되었습니다.` });
            } catch (error) {
                console.error("Error expiring passes:", error);
            }
        }
    };
    
    checkAndExpirePasses();

  }, [firestore, memberPasses, toast]);


 const handleStatusChange = async (member: Member, newStatus: Attendance['status']) => {
    if (!firestore || !selectedDate || !member.activePassId) return;
    
    setIsSubmitting(prevState => ({ ...prevState, [member.id]: true }));

    try {
      await runTransaction(firestore, async (transaction) => {
        const dateKey = startOfDay(selectedDate).toISOString();
        const attendanceCollectionRef = collection(firestore, 'attendance');
        const passRef = doc(firestore, 'member_passes', member.activePassId!);
        
        const passSnap = await transaction.get(passRef);
        if (!passSnap.exists()) throw new Error("이용권을 찾을 수 없습니다.");
        
        const passData = passSnap.data() as MemberPass;
        
        // Prevent updates if pass is not session-based
        if (passData.totalSessions === undefined || passData.attendableSessions === undefined || passData.remainingSessions === undefined) {
             toast({ variant: "destructive", title: "업데이트 불가", description: "기간제 또는 무제한 이용권은 출석으로 차감되지 않습니다." });
             return;
        }

        const q = query(attendanceCollectionRef, where('memberId', '==', member.id), where('date', '==', dateKey));
        const attendanceSnap = await getDocs(q); // getDocs is not available in transaction, must be called before
        const existingAttendanceSnap = attendanceSnap.docs[0];
        const existingAttendance = existingAttendanceSnap ? { ...existingAttendanceSnap.data(), id: existingAttendanceSnap.id } as Attendance : null;
        
        const oldStatus = existingAttendance?.status;
        if (oldStatus === newStatus) return;

        let { attendanceCount = 0, remainingSessions = 0 } = passData;

        // Revert old status effect
        if (oldStatus) {
            if (oldStatus === 'present') attendanceCount--;
            if (oldStatus === 'present' || oldStatus === 'absent') remainingSessions++;
        }

        // Apply new status effect
        if (newStatus) {
            if (newStatus === 'present') attendanceCount++;
            if (newStatus === 'present' || newStatus === 'absent') remainingSessions--;
        }

        const shouldExpire = (remainingSessions <= 0) || (attendanceCount >= passData.attendableSessions!);
        const passUpdate: Partial<MemberPass> = {
            attendanceCount,
            remainingSessions: Math.max(0, remainingSessions),
            status: shouldExpire ? 'expired' : 'active'
        };

        transaction.update(passRef, passUpdate);
        
        if (existingAttendance) {
            transaction.update(doc(firestore, 'attendance', existingAttendance.id), { status: newStatus });
        } else {
            const newAttendanceRef = doc(attendanceCollectionRef);
            transaction.set(newAttendanceRef, {
                id: newAttendanceRef.id,
                memberId: member.id,
                clubId: clubId,
                date: dateKey,
                status: newStatus,
                passId: passData.id,
            });
        }
      });

      toast({
        title: '출석 상태 변경',
        description: `${member.name}님의 상태가 ${attendanceStatusTranslations[newStatus]}(으)로 업데이트되었습니다.`
      });
    } catch (error: any) {
        console.error("Transaction failed: ", error);
        toast({
            variant: "destructive",
            title: "오류 발생",
            description: error.message || "출석 상태 변경 중 오류가 발생했습니다."
        });
    } finally {
        setIsSubmitting(prevState => ({ ...prevState, [member.id]: false }));
    }
 };


  if (isClubLoading || areMembersLoading || arePassesLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!club) {
    notFound();
  }

 const getPassBadge = (pass: MemberPass | undefined) => {
    if (!pass) return <Badge variant="secondary">이용권 없음</Badge>;

    if (pass.status === 'expired') return <Badge variant="destructive">만료</Badge>;

    if (pass.totalSessions !== undefined && pass.attendableSessions !== undefined) {
      return <Badge>{`${pass.attendanceCount} / ${pass.attendableSessions} (남은 기회: ${pass.remainingSessions})`}</Badge>;
    }
    
    if (pass.endDate) {
      const remainingDays = Math.ceil((new Date(pass.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return <Badge>{`기간권 (${remainingDays > 0 ? `${remainingDays}일 남음` : '만료'})`}</Badge>;
    }

    return <Badge>무제한 이용권</Badge>;
  };

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

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList>
          <TabsTrigger value="attendance">출석</TabsTrigger>
          <TabsTrigger value="members">회원</TabsTrigger>
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
                      <TableCell className="font-medium">
                        <Link href={`/members/${member.id}`} className="flex items-center gap-3 hover:underline">
                            <Image
                                src={member.photoURL || `https://picsum.photos/seed/${member.id}/40/40`}
                                alt={member.name}
                                width={40}
                                height={40}
                                className="rounded-full object-cover"
                                data-ai-hint="person gymnastics"
                            />
                            <div>{member.name}</div>
                        </Link>
                      </TableCell>
                      <TableCell>{member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : '-'}</TableCell>
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
                                  <TableHead>이용권 상태</TableHead>
                                  <TableHead className="w-[150px]">출석 상태</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {clubMembers?.map(member => {
                                const attendanceRecord = attendanceRecords?.find(rec => rec.memberId === member.id);
                                const pass = memberPasses?.find(p => p.id === member.activePassId);
                                const isPassInvalid = !pass || pass.status === 'expired';

                                return (
                                  <TableRow key={member.id} className={isPassInvalid ? 'bg-muted/50' : ''}>
                                      <TableCell>
                                        <Link href={`/members/${member.id}`} className="hover:underline">
                                          {member.name}
                                        </Link>
                                      </TableCell>
                                      <TableCell>
                                        {getPassBadge(pass)}
                                      </TableCell>
                                      <TableCell>
                                          <Select 
                                            value={attendanceRecord?.status}
                                            onValueChange={(newStatus: Attendance['status']) => handleStatusChange(member, newStatus)}
                                            disabled={isPassInvalid || isSubmitting[member.id]}
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
                                <TableRow><TableCell colSpan={3} className="text-center">활동중인 선수가 없습니다.</TableCell></TableRow>
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
