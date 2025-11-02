'use client';
import { useMemo, useState } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { Member, MemberPass } from '@/types';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Calendar, 
  Camera, 
  TrendingUp, 
  Users, 
  Ticket, 
  CheckCircle, 
  XCircle, 
  Clock,
  Eye,
  Image as ImageIcon,
  Video,
  Play
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface AttendanceRecord {
  id: string;
  memberId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  classType: string;
}

interface MediaFile {
  id: string;
  memberId: string;
  fileName: string;
  fileUrl: string;
  fileType: 'image' | 'video';
  category: string;
  uploadedAt: string;
}

export default function MemberDashboardPage() {
  const { _user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // 1. 회원 정보 조회 (자신 + 자녀)
  const membersByGuardianUidQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.uid) return null;
    return query(collection(firestore, 'members'), where('guardianUserIds', 'array-contains', _user.uid));
  }, [firestore, _user?.uid]);

  const membersByUserQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.uid) return null;
    return query(collection(firestore, 'members'), where('userId', '==', _user.uid));
  }, [firestore, _user?.uid]);

  const { data: guardianMembers } = useCollection<Member>(membersByGuardianUidQuery);
  const { data: ownMembers } = useCollection<Member>(membersByUserQuery);

  // 회원 목록 병합
  const members = useMemo(() => {
    const map = new Map<string, Member>();
    [...(guardianMembers || []), ...(ownMembers || [])].forEach(m => map.set(m.id, m));
    return Array.from(map.values());
  }, [guardianMembers, ownMembers]);

  // 자동으로 첫 번째 회원 선택
  useMemo(() => {
    if (members.length > 0 && !selectedMember) {
      setSelectedMember(members[0]);
    }
  }, [members, selectedMember]);

  // 선택된 회원의 이용권 조회
  const passesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedMember) return null;
    return query(
      collection(firestore, 'member_passes'),
      where('memberId', '==', selectedMember.id),
      orderBy('startDate', 'desc'),
      limit(5)
    );
  }, [firestore, selectedMember]);

  const { data: passes } = useCollection<MemberPass>(passesQuery);

  // 최근 출결 기록 조회
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !selectedMember) return null;
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    return query(
      collection(firestore, 'attendance_records'),
      where('memberId', '==', selectedMember.id),
      where('date', '>=', oneMonthAgo.toISOString().split('T')[0]),
      orderBy('date', 'desc'),
      limit(10)
    );
  }, [firestore, selectedMember]);

  const { data: attendanceRecords } = useCollection<AttendanceRecord>(attendanceQuery);

  // 최근 미디어 파일 조회
  const mediaQuery = useMemoFirebase(() => {
    if (!firestore || !selectedMember) return null;
    return query(
      collection(firestore, 'media_files'),
      where('memberId', '==', selectedMember.id),
      orderBy('uploadedAt', 'desc'),
      limit(6)
    );
  }, [firestore, selectedMember]);

  const { data: mediaFiles } = useCollection<MediaFile>(mediaQuery);

  // 이용권 상태 계산
  const currentPass = useMemo(() => {
    if (!passes || passes.length === 0) return null;
    return passes.find(pass => pass.status === 'active') || passes[0];
  }, [passes]);

  // 출결 통계 계산
  const attendanceStats = useMemo(() => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return { total: 0, present: 0, absent: 0, rate: 0 };
    }

    const stats = attendanceRecords.reduce((acc, record) => {
      acc.total++;
      if (record.status === 'present') acc.present++;
      if (record.status === 'absent') acc.absent++;
      return acc;
    }, { total: 0, present: 0, absent: 0, rate: 0 });

    stats.rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
    return stats;
  }, [attendanceRecords]);

  // 이용권 상태 배지
  const getPassStatusBadge = (pass: MemberPass | undefined | null) => {
    if (!pass) return <Badge variant="secondary">이용권 없음</Badge>;
    
    switch (pass.status) {
      case 'active':
        if (pass.remainingSessions !== undefined) {
          return <Badge className="bg-green-100 text-green-800">
            <Ticket className="w-3 h-3 mr-1" />
            활성: {pass.remainingSessions}회 남음
          </Badge>;
        }
        return <Badge className="bg-green-100 text-green-800">활성</Badge>;
      case 'expired':
        return <Badge variant="destructive">만료</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">승인 대기</Badge>;
      default:
        return <Badge variant="secondary">알 수 없음</Badge>;
    }
  };

  // 출결 상태 아이콘
  const getAttendanceIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'late':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Home className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>대시보드를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!_user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>로그인 필요</CardTitle>
            <CardDescription>대시보드를 보려면 로그인이 필요합니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">회원 대시보드</h1>
          <p className="text-muted-foreground">개인정보, 이용권, 출결, 미디어 현황을 한눈에 확인하세요.</p>
        </div>
      </div>

      {/* 회원 선택 */}
      {members.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              회원 선택
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {members.map(member => (
                <Button
                  key={member.id}
                  variant={selectedMember?.id === member.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMember(member)}
                >
                  {member.name}
                  {member.status === 'active' && (
                    <Badge className="ml-2 bg-green-100 text-green-800">활성</Badge>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedMember && (
        <>
          {/* 기본 정보 및 이용권 상태 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  {selectedMember.name}님 정보
                </CardTitle>
                <CardDescription>
                  {selectedMember.status === 'active' ? '활성 회원' : '비활성 회원'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">생년월일</p>
                    <p className="font-medium">{selectedMember.birthDate || '미등록'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">성별</p>
                    <p className="font-medium">{selectedMember.gender === 'male' ? '남' : '여'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">연락처</p>
                    <p className="font-medium">{selectedMember.phone || '미등록'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">소속 클럽</p>
                    <p className="font-medium">{selectedMember.clubName || '미등록'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Ticket className="w-5 h-5 mr-2" />
                  이용권 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getPassStatusBadge(currentPass)}
                  {currentPass && (
                    <div className="text-sm text-muted-foreground">
                      <p>시작일: {new Date(currentPass.startDate).toLocaleDateString()}</p>
                      <p>종료일: {new Date(currentPass.endDate).toLocaleDateString()}</p>
                      {currentPass.usageCount !== undefined && (
                        <p>사용 횟수: {currentPass.usageCount}회</p>
                      )}
                    </div>
                  )}
                  <Link href="/my-profile">
                    <Button variant="outline" className="w-full">
                      이용권 관리
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 출결 및 미디어 현황 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    최근 출결 현황
                  </CardTitle>
                  <CardDescription>최근 1개월 출결 기록</CardDescription>
                </div>
                <Link href="/member/attendance">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-1" />
                    전체보기
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{attendanceStats.present}</div>
                      <p className="text-xs text-muted-foreground">출석</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{attendanceStats.absent}</div>
                      <p className="text-xs text-muted-foreground">결석</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{attendanceStats.rate}%</div>
                      <p className="text-xs text-muted-foreground">출석률</p>
                    </div>
                  </div>
                  
                  {attendanceRecords && attendanceRecords.length > 0 ? (
                    <div className="space-y-2">
                      {attendanceRecords.slice(0, 5).map(record => (
                        <div key={record.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center space-x-2">
                            {getAttendanceIcon(record.status)}
                            <span className="text-sm">{record.date}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{record.classType}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">출결 기록이 없습니다.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Camera className="w-5 h-5 mr-2" />
                    최근 미디어
                  </CardTitle>
                  <CardDescription>최근 업로드된 사진/영상</CardDescription>
                </div>
                <Link href="/member/media">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-1" />
                    전체보기
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {mediaFiles && mediaFiles.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {mediaFiles.slice(0, 6).map(mediaFile => (
                      <div key={mediaFile.id} className="relative aspect-square bg-gray-100 rounded overflow-hidden group">
                        {mediaFile.fileType === 'image' ? (
                          <Image
                            src={mediaFile.fileUrl}
                            alt={mediaFile.fileName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Video className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={() => window.open(mediaFile.fileUrl, '_blank')}
                          >
                            {mediaFile.fileType === 'video' ? (
                              <Play className="w-4 h-4 text-white" />
                            ) : (
                              <Eye className="w-4 h-4 text-white" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">미디어 파일이 없습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 빠른 메뉴 */}
          <Card>
            <CardHeader>
              <CardTitle>빠른 메뉴</CardTitle>
              <CardDescription>자주 사용하는 기능으로 바로 이동하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/my-profile">
                  <Button variant="outline" className="w-full h-16 flex flex-col">
                    <Users className="w-5 h-5 mb-1" />
                    <span className="text-xs">내 정보</span>
                  </Button>
                </Link>
                <Link href="/member/attendance">
                  <Button variant="outline" className="w-full h-16 flex flex-col">
                    <Calendar className="w-5 h-5 mb-1" />
                    <span className="text-xs">출결 현황</span>
                  </Button>
                </Link>
                <Link href="/member/media">
                  <Button variant="outline" className="w-full h-16 flex flex-col">
                    <Camera className="w-5 h-5 mb-1" />
                    <span className="text-xs">미디어</span>
                  </Button>
                </Link>
                <Link href="/events">
                  <Button variant="outline" className="w-full h-16 flex flex-col">
                    <TrendingUp className="w-5 h-5 mb-1" />
                    <span className="text-xs">이벤트</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
