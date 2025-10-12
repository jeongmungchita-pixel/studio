'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, setDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { GymClass, Member, Attendance } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, CheckCircle2, XCircle, MessageSquare, LayoutGrid, Calendar as CalendarIcon } from 'lucide-react';
import { differenceInYears } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

type AttendanceStatus = 'present' | 'absent' | 'excused' | null;

const daysOfWeek = ['전체', '월', '화', '수', '목', '금', '토', '일'] as const;

export default function ClassStatusPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedDay, setSelectedDay] = useState<typeof daysOfWeek[number]>('전체');
  const [selectedClass, setSelectedClass] = useState<GymClass | null>(null);
  const [attendanceStates, setAttendanceStates] = useState<Record<string, AttendanceStatus>>({});
  const [attendanceNotes, setAttendanceNotes] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');

  // Fetch all classes for this club
  const classesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(collection(firestore, 'classes'), where('clubId', '==', user.clubId));
  }, [firestore, user?.clubId]);
  const { data: classes, isLoading: areClassesLoading } = useCollection<GymClass>(classesQuery);

  // Fetch all members for this club
  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(collection(firestore, 'members'), where('clubId', '==', user.clubId));
  }, [firestore, user?.clubId]);
  const { data: allMembers, isLoading: areMembersLoading } = useCollection<Member>(membersQuery);

  // Fetch today's attendance records
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayAttendanceQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'attendance'),
      where('clubId', '==', user.clubId),
      where('date', '>=', todayStart.toISOString())
    );
  }, [firestore, user?.clubId]);
  const { data: todayAttendance } = useCollection<Attendance>(todayAttendanceQuery);

  // Filter classes by selected day
  const filteredClasses = useMemo(() => {
    if (!classes) return [];
    if (selectedDay === '전체') return classes;
    return classes.filter(cls => cls.dayOfWeek === selectedDay);
  }, [classes, selectedDay]);

  // Get members for each class
  const getClassMembers = (classItem: GymClass) => {
    if (!allMembers) return [];
    return allMembers.filter(member => classItem.memberIds.includes(member.id));
  };

  const getMemberAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return null;
    return differenceInYears(new Date(), new Date(dateOfBirth));
  };

  // Check if member has attendance today
  const hasTodayAttendance = (memberId: string) => {
    if (!todayAttendance) return false;
    return todayAttendance.some(att => att.memberId === memberId);
  };

  // Get today's attendance status for member
  const getTodayAttendanceStatus = (memberId: string): AttendanceStatus => {
    if (!todayAttendance) return null;
    const attendance = todayAttendance.find(att => att.memberId === memberId);
    return attendance?.status || null;
  };

  const handleClassClick = (classItem: GymClass) => {
    setSelectedClass(classItem);
    // Initialize attendance states for all members
    const initialStates: Record<string, AttendanceStatus> = {};
    const initialNotes: Record<string, string> = {};
    classItem.memberIds.forEach(memberId => {
      initialStates[memberId] = null;
      initialNotes[memberId] = '';
    });
    setAttendanceStates(initialStates);
    setAttendanceNotes(initialNotes);
  };

  const handleAttendanceToggle = (memberId: string, status: AttendanceStatus) => {
    setAttendanceStates(prev => ({
      ...prev,
      [memberId]: prev[memberId] === status ? null : status
    }));
  };

  const handleSubmitAllAttendance = async () => {
    if (!firestore || !selectedClass || !user?.clubId) return;
    setIsSubmitting(true);

    try {
      const attendancePromises = Object.entries(attendanceStates)
        .filter(([_, status]) => status !== null)
        .map(async ([memberId, status]) => {
          const attendanceRef = doc(collection(firestore, 'attendance'));
          const member = allMembers?.find(m => m.id === memberId);
          const attendanceData: Attendance = {
            id: attendanceRef.id,
            memberId: memberId,
            clubId: user.clubId!,
            date: new Date().toISOString(),
            status: status as 'present' | 'absent' | 'excused',
            passId: member?.activePassId || '',
          };
          return setDoc(attendanceRef, attendanceData);
        });

      await Promise.all(attendancePromises);

      const checkedCount = Object.values(attendanceStates).filter(s => s !== null).length;
      toast({ 
        title: '출석 체크 완료', 
        description: `${checkedCount}명의 출석이 기록되었습니다.` 
      });

      setSelectedClass(null);
      setAttendanceStates({});
      setAttendanceNotes({});
    } catch (error) {
      console.error('Error recording attendance:', error);
      toast({ 
        variant: 'destructive', 
        title: '오류 발생', 
        description: '출석 체크 중 오류가 발생했습니다.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = areClassesLoading || areMembersLoading;

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">클래스 현황</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">클래스별 회원 현황 및 출석 체크</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">카드</span>
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">캘린더</span>
          </Button>
        </div>
      </div>

      {/* Day Filter Tabs */}
      <Tabs value={selectedDay} onValueChange={(value) => setSelectedDay(value as typeof daysOfWeek[number])}>
        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-8 gap-1">
          {daysOfWeek.map((day) => (
            <TabsTrigger key={day} value={day} className="text-xs sm:text-sm">
              {day}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Classes View */}
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredClasses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40">
            <p className="text-muted-foreground">선택한 요일에 클래스가 없습니다.</p>
          </CardContent>
        </Card>
      ) : viewMode === 'calendar' ? (
        /* Calendar View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {['월', '화', '수', '목', '금', '토', '일'].map((day) => {
            const dayClasses = classes?.filter(c => c.dayOfWeek === day) || [];
            return (
              <Card key={day} className="min-h-[200px]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-center text-lg">{day}요일</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dayClasses.length === 0 ? (
                    <p className="text-xs text-center text-muted-foreground py-4">클래스 없음</p>
                  ) : (
                    dayClasses.map((classItem) => {
                      const classMembers = getClassMembers(classItem);
                      return (
                        <div
                          key={classItem.id}
                          className="p-3 rounded-lg border hover:border-primary cursor-pointer transition-colors"
                          onClick={() => handleClassClick(classItem)}
                        >
                          <p className="font-semibold text-sm">{classItem.name}</p>
                          <p className="text-xs text-muted-foreground">{classItem.time}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Users className="h-3 w-3" />
                            <span className="text-xs">{classMembers.length}/{classItem.capacity}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredClasses.map((classItem) => {
            const classMembers = getClassMembers(classItem);
            return (
              <Card 
                key={classItem.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleClassClick(classItem)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{classItem.name}</CardTitle>
                    <Badge variant="secondary" className="ml-2">
                      {classItem.dayOfWeek}요일 {classItem.time}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <Users className="h-4 w-4" />
                    <span>
                      {classMembers.length} / {classItem.capacity}명
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {classMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      등록된 회원이 없습니다.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {classMembers.map((member) => {
                          const age = getMemberAge(member.dateOfBirth);
                          return (
                            <div 
                              key={member.id}
                              className="flex items-center justify-between p-2 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                              <span className="text-sm font-medium truncate">{member.name}</span>
                              {age && (
                                <span className="text-xs text-muted-foreground ml-2">{age}세</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-center text-primary font-medium pt-2 border-t">
                        클릭하여 출석 체크
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Attendance Dialog */}
      <Dialog open={!!selectedClass} onOpenChange={(open) => !open && setSelectedClass(null)}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedClass?.name} - 출석 체크
            </DialogTitle>
            <DialogDescription>
              {selectedClass?.dayOfWeek}요일 {selectedClass?.time} | 각 회원의 출석 상태를 선택하세요
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {selectedClass && getClassMembers(selectedClass).map((member) => {
              const age = getMemberAge(member.dateOfBirth);
              const currentStatus = attendanceStates[member.id];
              const todayStatus = getTodayAttendanceStatus(member.id);
              const hasAttendanceToday = hasTodayAttendance(member.id);
              
              return (
                <Card key={member.id} className={`p-4 ${hasAttendanceToday ? 'border-2 border-primary/30 bg-primary/5' : ''}`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{member.name}</h3>
                          {hasAttendanceToday && (
                            <Badge variant={
                              todayStatus === 'present' ? 'default' : 
                              todayStatus === 'absent' ? 'destructive' : 
                              'secondary'
                            } className="text-xs">
                              {todayStatus === 'present' ? '✓ 출석' : 
                               todayStatus === 'absent' ? '✗ 결석' : 
                               '📝 메모'}
                            </Badge>
                          )}
                        </div>
                        {age && (
                          <p className="text-sm text-muted-foreground">{age}세</p>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={currentStatus === 'present' ? 'default' : 'outline'}
                          onClick={() => handleAttendanceToggle(member.id, 'present')}
                          className={`${currentStatus === 'present' ? 'bg-green-600 hover:bg-green-700' : ''} text-xs sm:text-sm`}
                        >
                          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          출석
                        </Button>
                        
                        <Button
                          size="sm"
                          variant={currentStatus === 'absent' ? 'default' : 'outline'}
                          onClick={() => handleAttendanceToggle(member.id, 'absent')}
                          className={`${currentStatus === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''} text-xs sm:text-sm`}
                        >
                          <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          결석
                        </Button>
                        
                        <Button
                          size="sm"
                          variant={currentStatus === 'excused' ? 'default' : 'outline'}
                          onClick={() => handleAttendanceToggle(member.id, 'excused')}
                          className={`${currentStatus === 'excused' ? 'bg-blue-600 hover:bg-blue-700' : ''} text-xs sm:text-sm`}
                        >
                          <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          메모
                        </Button>
                      </div>
                    </div>
                    
                    {/* Show note input when excused is selected */}
                    {currentStatus === 'excused' && (
                      <div className="space-y-2 pt-2 border-t">
                        <label className="text-sm font-medium text-muted-foreground">
                          메모 입력
                        </label>
                        <Textarea
                          placeholder="메모를 입력하세요... (예: 감기, 가족 행사, 지각 등)"
                          value={attendanceNotes[member.id] || ''}
                          onChange={(e) => setAttendanceNotes(prev => ({
                            ...prev,
                            [member.id]: e.target.value
                          }))}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedClass(null);
                setAttendanceStates({});
                setAttendanceNotes({});
              }}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              onClick={handleSubmitAllAttendance}
              disabled={isSubmitting || Object.values(attendanceStates).every(s => s === null)}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              출석 저장 ({Object.values(attendanceStates).filter(s => s !== null).length}명)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
