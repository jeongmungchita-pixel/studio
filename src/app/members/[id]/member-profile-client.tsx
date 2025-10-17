'use client';

import { useMemo, useState, ChangeEvent, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser, useDoc, useCollection, useFirestore, useStorage, uploadImage } from '@/firebase';
import { Member, MemberPass, Attendance, MediaItem, UserProfile, PassTemplate, PassRenewalRequest } from '@/types';
import { UserRole } from '@/types';
import { doc, collection, query, where, orderBy, writeBatch, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { differenceInYears, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Calendar, History, Upload, Image, Camera, File, Phone, Mail, CreditCard, Edit, Trash2, Baby } from 'lucide-react';
import { canUsePassTemplate, getMemberCategoryLabel, getTargetCategoryLabel } from '@/lib/member-utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const attendanceStatusTranslations: Record<Attendance['status'], string> = {
  present: '출석',
  absent: '결석',
  excused: '메모',
};

export default function MemberProfileClient({ id }: { id:string }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isRenewalDialogOpen, setIsRenewalDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PassTemplate | null>(null);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [editAttendanceStatus, setEditAttendanceStatus] = useState<Attendance['status']>('present');
  const [editAttendanceNote, setEditAttendanceNote] = useState('');

  // 1. Fetch member data
  const memberRef = useMemoFirebase(() => (firestore ? doc(firestore, 'members', id) : null), [firestore, id]);
  const { data: member, isLoading: isMemberLoading } = useDoc<Member>(memberRef);

  // 2. Fetch all passes for this member
  const passesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'member_passes'), where('memberId', '==', id), orderBy('startDate', 'desc'));
  }, [firestore, id]);
  const { data: passes, isLoading: arePassesLoading } = useCollection<MemberPass>(passesQuery);
  
  // 3. Fetch all attendance records for this member
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'attendance'), where('memberId', '==', id), orderBy('date', 'desc'));
  }, [firestore, id]);
  const { data: allAttendance, isLoading: areAttendanceLoading } = useCollection<Attendance>(attendanceQuery);

  // 4. Fetch all media items for this member
  const mediaQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'media'), where('memberId', '==', id));
  }, [firestore, id]);
  const { data: mediaItems, isLoading: areMediaLoading } = useCollection<MediaItem>(mediaQuery);

  // 5. Fetch guardian (parent) information if exists
  const guardianIds = member?.guardianIds || [];
  const guardianQuery = useMemoFirebase(() => {
    if (!firestore || guardianIds.length === 0) return null;
    return query(collection(firestore, 'users'), where('__name__', 'in', guardianIds));
  }, [firestore, guardianIds]);
  const { data: guardians, isLoading: areGuardiansLoading } = useCollection<UserProfile>(guardianQuery);

  // 6. Fetch pass templates for renewal
  const passTemplatesQuery = useMemoFirebase(() => {
    if (!firestore || !member?.clubId) return null;
    return query(collection(firestore, 'pass_templates'), where('clubId', '==', member.clubId));
  }, [firestore, member?.clubId]);
  const { data: passTemplates } = useCollection<PassTemplate>(passTemplatesQuery);

  // 7. Filter pass templates based on member category
  const availablePassTemplates = useMemo(() => {
    if (!passTemplates || !member) return [];
    return passTemplates.filter(template => canUsePassTemplate(member, template));
  }, [passTemplates, member]);

  const isLoading = isUserLoading || isMemberLoading || arePassesLoading || areAttendanceLoading || areMediaLoading || areGuardiansLoading;

  const age = useMemo(() => {
    if (!member?.dateOfBirth) return null;
    return differenceInYears(new Date(), new Date(member.dateOfBirth));
  }, [member]);

  const hasAccess = useMemo(() => {
    if (!user || !member) return false;
    // Check if user is admin or club manager
    if (user.role === 'FEDERATION_ADMIN' || user.role === 'SUPER_ADMIN') return true;
    if (user.role === 'CLUB_OWNER' || user.role === 'CLUB_MANAGER') {
      if (user.clubId === member.clubId) return true;
    }
    // Check if user is guardian
    if (member.guardianIds?.includes(user.uid)) return true;
    return false;
  }, [user, member]);

  // 편집 권한: 관리자만 가능
  const canEdit = useMemo(() => {
    if (!user || !member) return false;
    // Only admins and club managers can edit
    if (user.role === 'FEDERATION_ADMIN' || user.role === 'SUPER_ADMIN') return true;
    if (user.role === 'CLUB_OWNER' || user.role === 'CLUB_MANAGER') {
      if (user.clubId === member.clubId) return true;
    }
    return false;
  }, [user, member]);

  // 현재 활성 이용권 확인
  const activePass = useMemo(() => {
    if (!passes || passes.length === 0) return null;
    const now = new Date();
    return passes.find(pass => {
      if (!pass.endDate) return false;
      const endDate = new Date(pass.endDate);
      return endDate > now;
    });
  }, [passes]);

  // 이용권 갱신 가능 여부 (만료되었거나 이용권이 없는 경우)
  const canRequestRenewal = useMemo(() => {
    return !activePass;
  }, [activePass]);
  
  // Effect for handling camera permission and stream
  useEffect(() => {
    let stream: MediaStream;
    const getCameraPermission = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        setHasCameraPermission(false);
      }
    };

    if (isCameraOpen) {
      getCameraPermission();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOpen]);


  const uploadBlob = async (blob: Blob, type: 'image' | 'video') => {
    if (!storage || !member || !firestore) return;
    setIsUploading(true);

    try {
      const mediaRef = doc(collection(firestore, 'media'));
      const mediaId = mediaRef.id;
      const fileExtension = type === 'image' ? 'jpg' : 'webm';
      const mimeType = type === 'image' ? 'image/jpeg' : 'video/webm';
      const file = new (File as any)([blob], `capture.${fileExtension}`, { type: mimeType });

      const mediaURL = await uploadImage(storage, `media/${member.clubId}/${member.id}/${mediaId}`, file);

      const newMediaItem: MediaItem = {
        id: mediaId,
        memberId: member.id,
        clubId: member.clubId,
        mediaURL,
        mediaType: type,
        uploadDate: new Date().toISOString(),
      };
      
      const batch = writeBatch(firestore);
      batch.set(mediaRef, newMediaItem);
      await batch.commit();
      
      toast({ title: '업로드 성공', description: '미디어가 성공적으로 업로드되었습니다.' });
    } catch (error) {
      toast({ variant: 'destructive', title: '업로드 실패', description: '미디어 업로드 중 오류가 발생했습니다.' });
    } finally {
      setIsUploading(false);
      setIsCameraOpen(false); // Close camera dialog on finish
    }
  };

  // Handle attendance edit
  const handleEditAttendance = (attendance: Attendance) => {
    setEditingAttendance(attendance);
    setEditAttendanceStatus(attendance.status);
    setEditAttendanceNote(attendance.note || '');
  };

  // Handle attendance update
  const handleUpdateAttendance = async () => {
    if (!firestore || !editingAttendance) return;
    
    try {
      await updateDoc(doc(firestore, 'attendance', editingAttendance.id), {
        status: editAttendanceStatus,
        note: editAttendanceNote || null,
      });
      
      toast({
        title: '출석 기록 수정 완료',
        description: '출석 기록이 수정되었습니다.',
      });
      
      setEditingAttendance(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '수정 실패',
        description: '출석 기록 수정 중 오류가 발생했습니다.',
      });
    }
  };

  // Handle attendance delete
  const handleDeleteAttendance = async (attendanceId: string) => {
    if (!firestore || !confirm('정말 이 출석 기록을 삭제하시겠습니까?')) return;
    
    try {
      await deleteDoc(doc(firestore, 'attendance', attendanceId));
      
      toast({
        title: '출석 기록 삭제 완료',
        description: '출석 기록이 삭제되었습니다.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: '출석 기록 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  const handleProfilePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!storage || !member || !firestore || !event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    setIsUploading(true);

    try {
      const photoURL = await uploadImage(storage, `profiles/${member.id}/profile`, file);
      
      // Update member's photoURL in Firestore
      const memberRef = doc(firestore, 'members', member.id);
      await updateDoc(memberRef, { photoURL });
      
      toast({ title: '업로드 성공', description: '프로필 사진이 업데이트되었습니다.' });
    } catch (error) {
      toast({ variant: 'destructive', title: '업로드 실패', description: '프로필 사진 업로드 중 오류가 발생했습니다.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    canvas.toBlob((blob) => {
      if (blob) {
        uploadBlob(blob, 'image');
      }
    }, 'image/jpeg');
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!storage || !member || !firestore || !event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    setIsUploading(true);

    try {
      const mediaRef = doc(collection(firestore, 'media'));
      const mediaId = mediaRef.id;

      const mediaURL = await uploadImage(storage, `media/${member.clubId}/${member.id}/${mediaId}`, file);

      const newMediaItem: MediaItem = {
        id: mediaId,
        memberId: member.id,
        clubId: member.clubId,
        mediaURL,
        mediaType: file.type.startsWith('image/') ? 'image' : 'video',
        uploadDate: new Date().toISOString(),
      };
      
      const batch = writeBatch(firestore);
      batch.set(mediaRef, newMediaItem);
      await batch.commit();

      toast({ title: '업로드 성공', description: '미디어가 성공적으로 업로드되었습니다.' });
    } catch (error) {
      toast({ variant: 'destructive', title: '업로드 실패', description: '미디어 업로드 중 오류가 발생했습니다.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!firestore || !confirm('이 미디어를 삭제하시겠습니까?')) return;

    try {
      await deleteDoc(doc(firestore, 'media', mediaId));
      toast({ title: '삭제 완료', description: '미디어가 삭제되었습니다.' });
    } catch (error) {
      toast({ variant: 'destructive', title: '오류 발생', description: '미디어 삭제 중 오류가 발생했습니다.' });
    }
  };

  const handleRequestRenewal = async (template: PassTemplate) => {
    if (!firestore || !member || !user) return;

    try {
      const requestRef = doc(collection(firestore, 'pass_renewal_requests'));
      const renewalRequest: PassRenewalRequest = {
        id: requestRef.id,
        memberId: member.id,
        memberName: member.name,
        clubId: member.clubId,
        passTemplateId: template.id,
        passTemplateName: template.name,
        requestedAt: new Date().toISOString(),
        status: 'pending',
      };

      await setDoc(requestRef, renewalRequest);
      toast({ 
        title: '신청 완료', 
        description: `${template.name} 이용권 갱신 신청이 완료되었습니다. 클럽의 승인을 기다려주세요.` 
      });
      setIsRenewalDialogOpen(false);
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: '오류 발생', 
        description: '이용권 갱신 신청 중 오류가 발생했습니다.' 
      });
    }
  };


  if (isLoading) {
    return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!member || !user || !hasAccess) {
     toast({ variant: 'destructive', title: '접근 권한 없음', description: '이 페이지를 볼 수 있는 권한이 없습니다.' });
     const redirectUrl = (user?.role === 'CLUB_OWNER' || user?.role === 'CLUB_MANAGER') ? '/club-dashboard' : '/my-profile';
     router.push(redirectUrl);
     return null;
  }
  
  const currentPass = passes?.find(p => p.status === 'active' || p.status === 'pending');
  const pastPasses = passes?.filter(p => p.status === 'expired');

  return (
    <main className="flex-1 p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-6">
            <div className="relative">
              <Image src={member.photoURL || `https://picsum.photos/seed/${member.id}/96/96`} alt={member.name} width={96} height={96} className="rounded-full border-4 border-background shadow-md" />
              {canEdit && (
                <>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                    onClick={() => profilePhotoInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
                  </Button>
                  <Input
                    ref={profilePhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoUpload}
                    className="hidden"
                  />
                </>
              )}
            </div>
            <div className="flex-grow">
              <CardTitle className="text-3xl">{member.name}</CardTitle>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-muted-foreground">
                <span className="flex items-center gap-2"><User className="w-4 h-4" />{member.gender === 'male' ? '남자' : '여자'}</span>
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4" />{format(new Date(member.dateOfBirth!), 'yyyy년 M월 d일')} ({age}세)</span>
                {member.email && <span className="flex items-center gap-2"><Mail className="w-4 h-4" />{member.email}</span>}
                {member.phoneNumber && <span className="flex items-center gap-2"><Phone className="w-4 h-4" />{member.phoneNumber}</span>}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 부모 정보 카드 */}
      {guardians && guardians.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              부모/보호자 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {guardians.map((guardian) => (
                <div key={guardian.uid} className="p-4 rounded-lg bg-secondary">
                  <p className="font-semibold text-lg">{guardian.displayName}</p>
                  <div className="grid md:grid-cols-2 gap-2 mt-2 text-sm text-muted-foreground">
                    {guardian.email && (
                      <span className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {guardian.email}
                      </span>
                    )}
                    {guardian.phoneNumber && (
                      <span className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {guardian.phoneNumber}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs defaultValue="info">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">기본 정보</TabsTrigger>
          <TabsTrigger value="status">회원권/출석</TabsTrigger>
          <TabsTrigger value="media">미디어</TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>회원 상세 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">이름</Label>
                  <p className="font-medium">{member.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">성별</Label>
                  <p className="font-medium">{member.gender === 'male' ? '남자' : '여자'}</p>
                </div>
                {member.dateOfBirth && (
                  <div>
                    <Label className="text-muted-foreground">생년월일</Label>
                    <p className="font-medium">{format(new Date(member.dateOfBirth), 'yyyy년 M월 d일')} ({age}세)</p>
                  </div>
                )}
                {member.email && (
                  <div>
                    <Label className="text-muted-foreground">이메일</Label>
                    <p className="font-medium">{member.email}</p>
                  </div>
                )}
                {member.phoneNumber && (
                  <div>
                    <Label className="text-muted-foreground">전화번호</Label>
                    <p className="font-medium">{member.phoneNumber}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">회원 상태</Label>
                  <div className="font-medium">
                    <Badge variant={member.status === 'active' ? 'default' : member.status === 'pending' ? 'secondary' : 'destructive'}>
                      {member.status === 'active' ? '활성' : member.status === 'pending' ? '대기중' : '비활성'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">회원 유형</Label>
                  <p className="font-medium">{member.memberType === 'individual' ? '개인 회원' : '가족 회원'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">회원 분류</Label>
                  <div className="font-medium">
                    <Badge className={getMemberCategoryColor(member.memberCategory || (age && age >= 19 ? 'adult' : 'child')).badge}>
                      {(member.memberCategory || (age && age >= 19 ? 'adult' : 'child')) === 'adult' ? <User className="inline h-3 w-3 mr-1" /> : <Baby className="inline h-3 w-3 mr-1" />}
                      {getMemberCategoryLabel(member.memberCategory || (age && age >= 19 ? 'adult' : 'child'))}
                    </Badge>
                    {!member.memberCategory && (
                      <p className="text-xs text-muted-foreground mt-1">
                        * 나이를 기준으로 자동 분류됨
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="status">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>현재 회원권</CardTitle>
                    {canRequestRenewal && (
                      <Button onClick={() => setIsRenewalDialogOpen(true)} size="sm">
                        <CreditCard className="mr-2 h-4 w-4" />
                        이용권 갱신 신청
                      </Button>
                    )}
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

            {/* 최근 출석 이력 */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5"/>
                        최근 출석 이력
                    </CardTitle>
                    <CardDescription>최근 10회의 출석 기록입니다.</CardDescription>
                </CardHeader>
                <CardContent>
                    {allAttendance && allAttendance.length > 0 ? (
                        <div className="space-y-2">
                            {allAttendance.slice(0, 10).map(att => (
                                <div key={att.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className={`w-2 h-2 rounded-full ${
                                            att.status === 'present' ? 'bg-green-500' : 
                                            att.status === 'absent' ? 'bg-red-500' : 
                                            'bg-blue-500'
                                        }`} />
                                        <div className="flex-1">
                                            <p className="font-medium">{format(new Date(att.date), 'yyyy년 M월 d일 (E)', { locale: ko })}</p>
                                            <p className="text-xs text-muted-foreground">{format(new Date(att.date), 'HH:mm')}</p>
                                            {att.note && (
                                                <p className="text-xs text-muted-foreground mt-1">메모: {att.note}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={
                                            att.status === 'present' ? 'default' : 
                                            att.status === 'absent' ? 'destructive' : 
                                            'secondary'
                                        }>
                                            {attendanceStatusTranslations[att.status]}
                                        </Badge>
                                        {(user?.role === UserRole.CLUB_OWNER || user?.role === UserRole.CLUB_MANAGER) && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEditAttendance(att)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        수정
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        onClick={() => handleDeleteAttendance(att.id)}
                                                        className="text-red-600"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        삭제
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {allAttendance.length > 10 && (
                                <Button 
                                    variant="outline" 
                                    className="w-full mt-4"
                                    onClick={() => {
                                        const element = document.getElementById('past-passes');
                                        element?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                >
                                    <History className="mr-2 h-4 w-4" />
                                    과거 내역 더보기 ({allAttendance.length - 10}개)
                                </Button>
                            )}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">출석 기록이 없습니다.</p>
                    )}
                </CardContent>
            </Card>

            <Card className="mt-6" id="past-passes">
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
                                    <span>{pass.passName} ({format(new Date(pass.startDate || new Date()), 'yy/MM/dd')} 시작)</span>
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
                    {canEdit && (
                      <>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button disabled={isUploading}>
                              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                              미디어 업로드
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => setIsCameraOpen(true)}>
                              <Camera className="mr-2 h-4 w-4" />
                              <span>카메라로 촬영</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                              <File className="mr-2 h-4 w-4" />
                              <span>파일 선택</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,video/*"/>
                      </>
                    )}
                </CardHeader>
                <CardContent>
                    {mediaItems && mediaItems.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {mediaItems.map(item => (
                                <div key={item.id} className="relative aspect-square group">
                                  {item.mediaType === 'image' ? (
                                    <Image src={item.mediaURL} alt={item.caption || "Member media"} fill className="object-cover rounded-md" />
                                  ) : (
                                    <video src={item.mediaURL} className="object-cover rounded-md w-full h-full" controls />
                                  )}
                                    <div className="absolute inset-0 bg-black/50 flex items-end justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-white text-xs">{format(new Date(item.uploadDate), 'yyyy-MM-dd')}</p>
                                        {canEdit && (
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            className="h-6 w-6 p-0"
                                            onClick={() => handleDeleteMedia(item.id)}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        )}
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

      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>카메라 촬영</DialogTitle>
            <DialogDescription>
              사진을 촬영하여 바로 업로드합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
             {hasCameraPermission === null && (
                 <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="ml-2">카메라 권한 확인 중...</p>
                 </div>
             )}
             {hasCameraPermission === false && (
                <Alert variant="destructive">
                  <AlertTitle>카메라 접근 권한 필요</AlertTitle>
                  <AlertDescription>
                    브라우저 설정에서 카메라 접근을 허용해주세요.
                  </AlertDescription>
                </Alert>
             )}
             {hasCameraPermission && (
                <div className="relative">
                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-black" autoPlay muted playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                </div>
             )}
          </div>
          <DialogFooter>
             <DialogClose asChild><Button variant="outline">취소</Button></DialogClose>
             <Button onClick={handleCapturePhoto} disabled={!hasCameraPermission || isUploading}>
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Camera className="mr-2 h-4 w-4"/>}
                사진 촬영
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Attendance Dialog */}
      <Dialog open={!!editingAttendance} onOpenChange={() => setEditingAttendance(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>출석 기록 수정</DialogTitle>
            <DialogDescription>
              {editingAttendance && format(new Date(editingAttendance.date), 'yyyy년 M월 d일 (E) HH:mm', { locale: ko })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>출석 상태</Label>
              <select
                value={editAttendanceStatus}
                onChange={(e) => setEditAttendanceStatus(e.target.value as Attendance['status'])}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="present">출석</option>
                <option value="absent">결석</option>
                <option value="excused">메모</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>메모 (선택)</Label>
              <Input
                value={editAttendanceNote}
                onChange={(e) => setEditAttendanceNote(e.target.value)}
                placeholder="메모를 입력하세요..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAttendance(null)}>
              취소
            </Button>
            <Button onClick={handleUpdateAttendance}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 이용권 갱신 신청 다이얼로그 */}
      <Dialog open={isRenewalDialogOpen} onOpenChange={setIsRenewalDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>이용권 갱신 신청</DialogTitle>
            <DialogDescription>
              갱신할 이용권을 선택하세요. 클럽의 승인 후 이용권이 활성화됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {member && (
              <div className="mb-4 p-3 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>{member.name}</strong> 님은 <Badge variant="outline" className="ml-1">{getMemberCategoryLabel(member.memberCategory)}</Badge> 회원입니다.
                  {member.memberCategory ? ' 해당 분류에 맞는 이용권만 표시됩니다.' : ' 나이를 기준으로 자동 분류됩니다.'}
                </p>
              </div>
            )}
            {availablePassTemplates && availablePassTemplates.length > 0 ? (
              <div className="grid gap-4">
                {availablePassTemplates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:bg-secondary transition-colors" onClick={() => handleRequestRenewal(template)}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          {template.description && (
                            <CardDescription>{template.description}</CardDescription>
                          )}
                        </div>
                        <Badge variant={
                          template.targetCategory === 'adult' ? 'default' :
                          template.targetCategory === 'child' ? 'secondary' :
                          'outline'
                        }>
                          {template.targetCategory === 'adult' && <User className="inline h-3 w-3 mr-1" />}
                          {template.targetCategory === 'child' && <Baby className="inline h-3 w-3 mr-1" />}
                          {template.targetCategory === 'all' && <UsersIcon className="inline h-3 w-3 mr-1" />}
                          {getTargetCategoryLabel(template.targetCategory)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {template.passType === 'period' && <Badge variant="outline">기간제</Badge>}
                        {template.passType === 'session' && <Badge variant="outline">횟수제</Badge>}
                        {template.passType === 'unlimited' && <Badge variant="outline">기간+횟수제</Badge>}
                        {template.price && <p>가격: {template.price.toLocaleString()}원</p>}
                        {template.durationDays && <p>기간: {template.durationDays}일</p>}
                        {template.totalSessions && <p>총 횟수: {template.totalSessions}회</p>}
                        {template.attendableSessions && <p>필수 출석: {template.attendableSessions}회</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {member?.memberCategory 
                  ? `${getMemberCategoryLabel(member.memberCategory)} 회원이 사용할 수 있는 이용권이 없습니다.`
                  : '사용 가능한 이용권이 없습니다.'
                }
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
