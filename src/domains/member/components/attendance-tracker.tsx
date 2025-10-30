'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Member, Attendance } from '@/types/member';
import { AvatarImage } from '@/components/optimized-image';
import { CheckCircle, XCircle, Clock, AlertCircle, CalendarIcon, TrendingUp } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';

// ============================================
// 📅 출석 추적 컴포넌트
// ============================================

interface AttendanceTrackerProps {
  member: Member;
  attendanceRecords: Attendance[];
  onCheckIn?: (memberId: string) => void;
  onCheckOut?: (attendanceId: string) => void;
  variant?: 'calendar' | 'list' | 'summary';
  className?: string;
}

export function AttendanceTracker({
  member,
  attendanceRecords,
  onCheckIn,
  onCheckOut,
  variant = 'calendar',
  className
}: AttendanceTrackerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // 출석 상태별 아이콘 및 색상
  const getStatusIcon = (status: Attendance['status']) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'late':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'excused':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: Attendance['status']) => {
    const labels = {
      present: '출석',
      late: '지각',
      absent: '결석',
      excused: '사유결석'
    };
    return labels[status];
  };

  const getStatusColor = (status: Attendance['status']) => {
    const colors = {
      present: 'bg-green-100 text-green-800',
      late: 'bg-yellow-100 text-yellow-800',
      absent: 'bg-red-100 text-red-800',
      excused: 'bg-blue-100 text-blue-800'
    };
    return colors[status];
  };

  // 선택된 월의 출석 기록
  const monthlyRecords = attendanceRecords.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate.getMonth() === selectedDate.getMonth() && 
           recordDate.getFullYear() === selectedDate.getFullYear();
  });

  // 출석률 계산
  const calculateAttendanceRate = () => {
    if (monthlyRecords.length === 0) return 0;
    const presentCount = monthlyRecords.filter(r => 
      r.status === 'present' || r.status === 'late'
    ).length;
    return Math.round((presentCount / monthlyRecords.length) * 100);
  };

  // 오늘 출석 기록
  const todayRecord = attendanceRecords.find(record => 
    isSameDay(new Date(record.date), new Date())
  );

  // 캘린더 변형
  if (variant === 'calendar') {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              출석 캘린더
            </CardTitle>
            <Badge variant="outline">
              출석률 {calculateAttendanceRate()}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 캘린더 */}
            <div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ko}
                className="rounded-md border"
                modifiers={{
                  present: (date) => monthlyRecords.some(r => 
                    isSameDay(new Date(r.date), date) && r.status === 'present'
                  ),
                  late: (date) => monthlyRecords.some(r => 
                    isSameDay(new Date(r.date), date) && r.status === 'late'
                  ),
                  absent: (date) => monthlyRecords.some(r => 
                    isSameDay(new Date(r.date), date) && r.status === 'absent'
                  ),
                  excused: (date) => monthlyRecords.some(r => 
                    isSameDay(new Date(r.date), date) && r.status === 'excused'
                  ),
                }}
                modifiersStyles={{
                  present: { backgroundColor: '#dcfce7', color: '#166534' },
                  late: { backgroundColor: '#fef3c7', color: '#92400e' },
                  absent: { backgroundColor: '#fee2e2', color: '#991b1b' },
                  excused: { backgroundColor: '#dbeafe', color: '#1e40af' },
                }}
              />
            </div>

            {/* 출석 통계 및 상세 정보 */}
            <div className="space-y-4">
              {/* 월간 통계 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {monthlyRecords.filter(r => r.status === 'present').length}
                  </div>
                  <div className="text-sm text-green-700">출석</div>
                </div>
                
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {monthlyRecords.filter(r => r.status === 'late').length}
                  </div>
                  <div className="text-sm text-yellow-700">지각</div>
                </div>
                
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {monthlyRecords.filter(r => r.status === 'absent').length}
                  </div>
                  <div className="text-sm text-red-700">결석</div>
                </div>
                
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {monthlyRecords.filter(r => r.status === 'excused').length}
                  </div>
                  <div className="text-sm text-blue-700">사유결석</div>
                </div>
              </div>

              {/* 오늘 출석 상태 */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">오늘 출석</h4>
                {todayRecord ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(todayRecord.status)}
                      <Badge className={getStatusColor(todayRecord.status)}>
                        {getStatusLabel(todayRecord.status)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(todayRecord.checkInTime), 'HH:mm')}
                      {todayRecord.checkOutTime && (
                        <span> - {format(new Date(todayRecord.checkOutTime), 'HH:mm')}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">출석 기록 없음</span>
                    {onCheckIn && (
                      <Button size="sm" onClick={() => onCheckIn(member.id)}>
                        출석 체크
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 목록 변형
  if (variant === 'list') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AvatarImage src={member.photoURL} alt={member.name} size={32} />
            {member.name} 출석 기록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {attendanceRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                출석 기록이 없습니다.
              </div>
            ) : (
              attendanceRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(record.status)}
                    <div>
                      <div className="font-medium">
                        {format(new Date(record.date), 'yyyy년 MM월 dd일', { locale: ko })}
                      </div>
                      {record.className && (
                        <div className="text-sm text-muted-foreground">{record.className}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge className={getStatusColor(record.status)}>
                      {getStatusLabel(record.status)}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">
                      {format(new Date(record.checkInTime), 'HH:mm')}
                      {record.checkOutTime && (
                        <span> - {format(new Date(record.checkOutTime), 'HH:mm')}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 요약 변형
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <AvatarImage src={member.photoURL} alt={member.name} size={48} />
          
          <div className="flex-1">
            <h3 className="font-semibold">{member.name}</h3>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  출석률 {calculateAttendanceRate()}%
                </span>
              </div>
              
              {todayRecord && (
                <div className="flex items-center gap-1">
                  {getStatusIcon(todayRecord.status)}
                  <span className="text-sm">
                    오늘 {getStatusLabel(todayRecord.status)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {!todayRecord && onCheckIn && (
            <Button size="sm" onClick={() => onCheckIn(member.id)}>
              출석 체크
            </Button>
          )}
          
          {todayRecord && !todayRecord.checkOutTime && onCheckOut && (
            <Button size="sm" variant="outline" onClick={() => onCheckOut(todayRecord.id)}>
              퇴실 체크
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
