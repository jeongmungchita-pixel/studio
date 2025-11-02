'use client';
import { useMemo, useState } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { Member } from '@/types';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle, XCircle, Clock, TrendingUp, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AttendanceRecord {
  id: string;
  memberId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
  classType: string;
}

export default function MemberAttendancePage() {
  const { _user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

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

  // 선택된 회원의 출결 기록 조회
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !selectedMember) return null;
    
    const now = new Date();
    let startDate = new Date();
    
    switch (selectedPeriod) {
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return query(
      collection(firestore, 'attendance_records'),
      where('memberId', '==', selectedMember.id),
      where('date', '>=', startDate.toISOString().split('T')[0]),
      orderBy('date', 'desc'),
      limit(100)
    );
  }, [firestore, selectedMember, selectedPeriod]);

  const { data: attendanceRecords, isLoading: isAttendanceLoading } = useCollection<AttendanceRecord>(attendanceQuery);

  // 출결 통계 계산
  const attendanceStats = useMemo(() => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return { total: 0, present: 0, absent: 0, late: 0, excused: 0, rate: 0 };
    }

    const stats = attendanceRecords.reduce((acc, record) => {
      acc.total++;
      acc[record.status]++;
      return acc;
    }, { total: 0, present: 0, absent: 0, late: 0, excused: 0 } as any);

    stats.rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
    return stats;
  }, [attendanceRecords]);

  // 상태 배지 컴포넌트
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />출석</Badge>;
      case 'absent':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />결석</Badge>;
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />지각</Badge>;
      case 'excused':
        return <Badge className="bg-blue-100 text-blue-800">사유결석</Badge>;
      default:
        return <Badge variant="secondary">미정</Badge>;
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Calendar className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>출결 현황을 불러오는 중...</p>
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
            <CardDescription>출결 현황을 보려면 로그인이 필요합니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">출결 현황</h1>
          <p className="text-muted-foreground">개인별 출결 기록과 통계를 확인하세요.</p>
        </div>
      </div>

      {/* 회원 선택 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            회원 선택
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedMember?.id || ''} onValueChange={(value) => {
            const member = members.find(m => m.id === value);
            setSelectedMember(member || null);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="조회할 회원을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {members.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name} ({member.status === 'active' ? '활성' : '비활성'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedMember && (
        <>
          {/* 기간 선택 및 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">조회 기간</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">최근 1개월</SelectItem>
                    <SelectItem value="quarter">최근 3개월</SelectItem>
                    <SelectItem value="year">최근 1년</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-600">출석</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{attendanceStats.present}</div>
                <p className="text-xs text-muted-foreground">회</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-600">결석</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{attendanceStats.absent}</div>
                <p className="text-xs text-muted-foreground">회</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  출석률
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{attendanceStats.rate}%</div>
                <p className="text-xs text-muted-foreground">
                  {attendanceStats.total > 0 ? `${attendanceStats.present}/${attendanceStats.total}회` : '데이터 없음'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 출결 상세 기록 */}
          <Card>
            <CardHeader>
              <CardTitle>출결 상세 기록</CardTitle>
              <CardDescription>
                {selectedMember.name}님의 최근 출결 기록 ({selectedPeriod === 'month' ? '1개월' : selectedPeriod === 'quarter' ? '3개월' : '1년'})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAttendanceLoading ? (
                <div className="text-center py-8">
                  <Calendar className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p>출결 기록을 불러오는 중...</p>
                </div>
              ) : attendanceRecords && attendanceRecords.length > 0 ? (
                <div className="space-y-3">
                  {attendanceRecords.map(record => (
                    <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm">
                          <div className="font-medium">{record.date}</div>
                          <div className="text-muted-foreground">{record.classType}</div>
                          {record.notes && (
                            <div className="text-xs text-muted-foreground mt-1">메모: {record.notes}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(record.status)}
                        {(record.checkInTime || record.checkOutTime) && (
                          <div className="text-xs text-muted-foreground">
                            {record.checkInTime && <div>입장: {record.checkInTime}</div>}
                            {record.checkOutTime && <div>퇴장: {record.checkOutTime}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>출결 기록이 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
