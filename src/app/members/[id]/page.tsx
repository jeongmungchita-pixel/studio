'use client';

import { useMemo, useState, ChangeEvent, useRef } from 'react';
import Image from 'next/image';
import { notFound, useRouter } from 'next/navigation';
import { useUser, useDoc, useCollection, useFirestore, useStorage, uploadImage } from '@/firebase';
import type { Member, MemberPass, Attendance, MediaItem } from '@/types';
import { doc, collection, query, where, orderBy, writeBatch } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { differenceInYears, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, User, Calendar, GitCompareArrows, History, Upload, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

const attendanceStatusTranslations: Record<Attendance['status'], string> = {
  present: '출석',
  absent: '결석',
  excused: '사유',
};

export default function MemberProfilePage({ params }: { params: { id: string } }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 1. Fetch member data
  const memberRef = useMemoFirebase(() => (firestore ? doc(firestore, 'members', params.id) : null), [firestore, params.id]);
  const { data: member, isLoading: isMemberLoading } = useDoc<Member>(memberRef);

  // 2. Fetch all passes for this member
  const passesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'member_passes'), where('memberId', '==', params.id), orderBy('startDate', 'desc'));
  }, [firestore, params.id]);
  const { data: passes, isLoading: arePassesLoading } = useCollection<MemberPass>(passesQuery);
  
  // 3. Fetch all attendance records for this member
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'attendance'), where('memberId', '==', params.id), orderBy('date', 'desc'));
  }, [firestore, params.id]);
  const { data: allAttendance, isLoading: areAttendanceLoading } = useCollection<Attendance>(attendanceQuery);

  // 4. Fetch all media items for this member
  const mediaQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'media_items'), where('memberId', '==', params.id), orderBy('uploadDate', 'desc'));
  }, [firestore, params.id]);
  const { data: mediaItems, isLoading: areMediaLoading } = useCollection<MediaItem>(mediaQuery);

  const isLoading = isUserLoading || isMemberLoading || arePassesLoading || areAttendanceLoading || areMediaLoading;

  const age = useMemo(() => {
    if (!member?.dateOfBirth) return null;
    return differenceInYears(new Date(), new Date(member.dateOfBirth));
  }, [member]);

  const hasAccess = useMemo(() => {
    if (!user || !member) return false;
    // Guardian access
    if (member.guardianIds?.includes(user.uid)) return true;
    // Club admin access
    if (user.role === 'club-admin' && user.clubId === member.clubId) return true;
    // Super admin access
    if (user.role === 'admin') return true;
    return false;
  }, [user, member]);


  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!storage || !member || !event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    setIsUploading(true);

    try {
      const mediaRef = doc(collection(firestore, 'media_items'));
      const mediaId = mediaRef.id;

      const mediaURL = await uploadImage(storage, `media/${member.id}/${mediaId}`, file);

      const newMediaItem: MediaItem = {
        id: mediaId,
        memberId: member.id,
        clubId: member.clubId,
        mediaURL,
        mediaType: file.type.startsWith('image/') ? 'image' : 'video',
        uploadDate: new Date().toISOString(),
      };
      
      await writeBatch(firestore).set(mediaRef, newMediaItem).commit();

      toast({
        title: '업로드 성공',
        description: '미디어가 성공적으로 업로드되었습니다.',
      });
    } catch (error) {
      console.error("Media upload failed: ", error);
      toast({ variant: 'destructive', title: '업로드 실패', description: '미디어 업로드 중 오류가 발생했습니다.' });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Security: Check if the logged-in user is a guardian for this member OR the correct club admin
  if (!member || !user || !hasAccess) {
     toast({ variant: 'destructive', title: '접근 권한 없음', description: '이 페이지를 볼 수 있는 권한이 없습니다.' });
     const redirectUrl = user?.role === 'club-admin' ? '/club-dashboard' : '/my-profile';
     router.push(redirectUrl);
     return null; // or notFound();
  }
  
  const currentPass = passes?.find(p => p.status === 'active' || p.status === 'pending');
  const pastPasses = passes?.filter(p => p.status === 'expired');

  return (
    <main className="flex-1 p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-6">
            <Image
              src={member.photoURL || `https://picsum.photos/seed/${member.id}/96/96`}
              alt={member.name}
              width={96}
              height={96}
              className="rounded-full border-4 border-background shadow-md"
            />
            <div className="flex-grow">
              <CardTitle className="text-3xl">{member.name}</CardTitle>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-muted-foreground">
                <span className="flex items-center gap-2"><User className="w-4 h-4" />{member.gender === 'male' ? '남자' : '여자'}</span>
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4" />{format(new Date(member.dateOfBirth!), 'yyyy년 M월 d일')} ({age}세)</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <Tabs defaultValue="status">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="status">회원권/출석 현황</TabsTrigger>
          <TabsTrigger value="media">미디어</TabsTrigger>
        </TabsList>
        <TabsContent value="status">
            <Card>
                <CardHeader>
                    <CardTitle>현재 회원권</CardTitle>
                </CardHeader>
                <CardContent>
                    {currentPass ? (
                        <div className="p-4 rounded-lg bg-secondary">
                           <p className="font-bold text-lg">{currentPass.passName}</p>
                           {currentPass.status === 'pending' ? <Badge variant="destructive">승인 대기중</Badge> : <Badge>활성</Badge>}
                           <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                               {currentPass.totalSessions !== undefined && <p>총 횟수: {currentPass.totalSessions}회</p>}
                               {currentPass.attendableSessions !== undefined && <p>출석 필요: {currentPass.attendableSessions}회</p>}
                               {currentPass.attendanceCount !== undefined && <p>현재 출석: {currentPass.attendanceCount}회</p>}
                               {currentPass.remainingSessions !== undefined && <p>남은 기회: {currentPass.remainingSessions}회</p>}
                               {currentPass.endDate && <p>만료일: {format(new Date(currentPass.endDate), 'yyyy-MM-dd')}</p>}
                           </div>
                        </div>
                    ): (
                        <p className="text-muted-foreground">현재 활성 또는 대기중인 회원권이 없습니다.</p>
                    )}
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History className="w-5 h-5"/>지난 회원권 현황</CardTitle>
                    <CardDescription>지난 회원권을 선택하여 상세 출석 기록을 확인하세요.</CardDescription>
                </CardHeader>
                <CardContent>
                    {pastPasses && pastPasses.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                        {pastPasses.map(pass => {
                            const passAttendance = allAttendance?.filter(a => a.passId === pass.id);
                            return (
                            <AccordionItem key={pass.id} value={pass.id}>
                                <AccordionTrigger>
                                <div className="flex justify-between w-full pr-4">
                                    <span>{pass.passName} ({format(new Date(pass.startDate!), 'yy/MM/dd')} 시작)</span>
                                    <Badge variant="secondary">만료</Badge>
                                </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                {passAttendance && passAttendance.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                            <TableHead>날짜</TableHead>
                                            <TableHead>상태</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {passAttendance.map(att => (
                                                <TableRow key={att.id}>
                                                    <TableCell>{format(new Date(att.date), 'yyyy년 M월 d일')}</TableCell>
                                                    <TableCell><Badge variant={att.status === 'present' ? 'default': 'outline'}>{attendanceStatusTranslations[att.status]}</Badge></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <p className="text-sm text-muted-foreground p-4 text-center">해당 회원권의 출석 기록이 없습니다.</p>
                                )}
                                </AccordionContent>
                            </AccordionItem>
                            )
                        })}
                        </Accordion>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">지난 회원권이 없습니다.</p>
                    )}
                </CardContent>
            </Card>

        </TabsContent>
        <TabsContent value="media">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>미디어 갤러리</CardTitle>
                        <CardDescription>선수의 활동 사진이나 영상을 업로드하고 관리하세요.</CardDescription>
                    </div>
                     <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        미디어 업로드
                    </Button>
                    <Input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileUpload}
                        accept="image/*,video/*"
                    />
                </CardHeader>
                <CardContent>
                    {mediaItems && mediaItems.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {mediaItems.map(item => (
                                <div key={item.id} className="relative aspect-square group">
                                    <Image
                                        src={item.mediaURL}
                                        alt={item.caption || "Member media"}
                                        layout="fill"
                                        className="object-cover rounded-md"
                                    />
                                    <div className="absolute inset-0 bg-black/50 flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-white text-xs">{format(new Date(item.uploadDate), 'yyyy-MM-dd')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                            <ImageIcon className="w-12 h-12 text-muted-foreground" />
                            <p className="mt-2 text-muted-foreground">업로드된 미디어가 없습니다.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
