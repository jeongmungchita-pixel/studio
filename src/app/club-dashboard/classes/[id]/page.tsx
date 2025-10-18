'use client';
import { useState, useMemo, use } from 'react';
export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { collection, query, where, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { GymClass, Member } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, UserPlus, UserMinus, Users, User, Baby, AlertTriangle } from 'lucide-react';
import { differenceInYears } from 'date-fns';
import { canJoinClass, calculateAge, getMemberCategoryLabel, getMemberCategoryColor } from '@/lib/member-utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const getClassDayLabel = (classData: GymClass): string => {
  if (classData.dayOfWeek) return classData.dayOfWeek;
  const schedule = classData.schedule?.[0];
  if (schedule) {
    return DAY_LABELS[schedule.dayOfWeek] ?? '미정';
  }
  return '미정';
};

const getClassTimeLabel = (classData: GymClass): string => {
  if (classData.time) return classData.time;
  const schedule = classData.schedule?.[0];
  if (schedule) {
    const { startTime, endTime } = schedule;
    return `${startTime}${endTime ? ` ~ ${endTime}` : ''}`;
  }
  return '시간 미정';
};

const getClassCapacity = (classData: GymClass): number => {
  if (typeof classData.capacity === 'number') return classData.capacity;
  if (typeof classData.maxCapacity === 'number') return classData.maxCapacity;
  return 0;
};

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch class data
  const classRef = useMemoFirebase(() => (firestore ? doc(firestore, 'classes', id) : null), [firestore, id]);
  const { data: classData, isLoading: isClassLoading } = useDoc<GymClass>(classRef);

  // Fetch all members for this club
  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(collection(firestore, 'members'), where('clubId', '==', user.clubId), where('status', '==', 'active'));
  }, [firestore, user?.clubId]);
  const { data: allMembers, isLoading: areMembersLoading } = useCollection<Member>(membersQuery);

  // Get members in this class
  const classMembers = useMemo(() => {
    if (!allMembers || !classData) return [];
    const memberIds = classData.memberIds ?? [];
    if (memberIds.length === 0) return [];
    return allMembers.filter((member) => memberIds.includes(member.id));
  }, [allMembers, classData]);

  // Get available members (not in this class) with eligibility check
  const availableMembers = useMemo(() => {
    if (!allMembers || !classData) return [];
    const memberIds = classData.memberIds ?? [];
    return allMembers
      .filter((member) => !memberIds.includes(member.id))
      .map(member => ({
        ...member,
        canJoin: canJoinClass(member, classData),
      }))
      .sort((a, b) => {
        // Sort eligible members first
        if (a.canJoin && !b.canJoin) return -1;
        if (!a.canJoin && b.canJoin) return 1;
        return 0;
      });
  }, [allMembers, classData]);

  const getMemberAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return null;
    return differenceInYears(new Date(), new Date(dateOfBirth));
  };

  const handleAddMembers = async () => {
    if (!firestore || !classData || selectedMemberIds.length === 0) return;
    setIsSubmitting(true);

    try {
      const classRef = doc(firestore, 'classes', id);
      
      // Add members to class
      for (const memberId of selectedMemberIds) {
        await updateDoc(classRef, {
          memberIds: arrayUnion(memberId)
        });
      }

      toast({ 
        title: '회원 추가 완료', 
        description: `${selectedMemberIds.length}명의 회원이 추가되었습니다.` 
      });

      setIsAddMemberDialogOpen(false);
      setSelectedMemberIds([]);
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: '오류 발생', 
        description: '회원 추가 중 오류가 발생했습니다.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!firestore || !classData) return;

    try {
      const classRef = doc(firestore, 'classes', id);
      await updateDoc(classRef, {
        memberIds: arrayRemove(memberId)
      });

      toast({ 
        title: '회원 제거 완료', 
        description: '회원이 클래스에서 제거되었습니다.' 
      });
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: '오류 발생', 
        description: '회원 제거 중 오류가 발생했습니다.' 
      });
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const isLoading = isClassLoading || areMembersLoading;

  if (isLoading) {
    return (
      <main className="flex-1 p-6">
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </main>
    );
  }

  if (!classData) {
    return (
      <main className="flex-1 p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40">
            <p className="text-muted-foreground">클래스를 찾을 수 없습니다.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">{classData.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">
              {getClassDayLabel(classData)}요일 {getClassTimeLabel(classData)}
            </Badge>
            {classData.targetCategory && (
              <Badge variant={
                classData.targetCategory === 'adult' ? 'default' :
                classData.targetCategory === 'child' ? 'secondary' :
                'outline'
              }>
                {classData.targetCategory === 'adult' && <User className="inline h-3 w-3 mr-1" />}
                {classData.targetCategory === 'child' && <Baby className="inline h-3 w-3 mr-1" />}
                {classData.targetCategory === 'all' && <Users className="inline h-3 w-3 mr-1" />}
                {classData.targetCategory === 'adult' ? '성인 전용' : classData.targetCategory === 'child' ? '주니어 전용' : '전체'}
              </Badge>
            )}
            {classData.ageRange && (classData.ageRange.min || classData.ageRange.max) && (
              <Badge variant="outline">
                {classData.ageRange.min && `${classData.ageRange.min}세`}
                {classData.ageRange.min && classData.ageRange.max && ' ~ '}
                {classData.ageRange.max && `${classData.ageRange.max}세`}
              </Badge>
            )}
            <span className="text-slate-600">
              정원: {classMembers.length} / {getClassCapacity(classData)}명
            </span>
          </div>
        </div>
        <Button onClick={() => setIsAddMemberDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          회원 추가
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            등록 회원 ({classMembers.length}명)
          </CardTitle>
          <CardDescription>이 클래스에 등록된 회원 목록입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {classMembers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              등록된 회원이 없습니다.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classMembers.map((member) => {
                const age = getMemberAge(member.dateOfBirth);
                const memberCategory = member.memberCategory || 
                  (calculateAge(member.dateOfBirth) >= 19 ? 'adult' : 'child');
                const categoryColors = getMemberCategoryColor(memberCategory);
                return (
                  <Card key={member.id} className="relative">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{member.name}</h3>
                            <Badge className={categoryColors.badge}>
                              {memberCategory === 'adult' ? <User className="inline h-3 w-3 mr-1" /> : <Baby className="inline h-3 w-3 mr-1" />}
                              {getMemberCategoryLabel(memberCategory)}
                            </Badge>
                          </div>
                          {age && (
                            <p className="text-sm text-muted-foreground">{age}세</p>
                          )}
                          {member.phoneNumber && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {member.phoneNumber}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Members Dialog */}
      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>회원 추가</DialogTitle>
            <DialogDescription>
              클래스에 추가할 회원을 선택하세요. 자격 요건을 충족하지 않는 회원은 회색으로 표시됩니다.
            </DialogDescription>
          </DialogHeader>
          
          {classData.targetCategory && classData.targetCategory !== 'all' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>클래스 제한 사항</AlertTitle>
              <AlertDescription>
                이 클래스는 <strong>{classData.targetCategory === 'adult' ? '성인' : '주니어'} 전용</strong>입니다.
                {classData.ageRange && (classData.ageRange.min || classData.ageRange.max) && (
                  <span>
                    {' '}연령 범위: 
                    {classData.ageRange.min && `${classData.ageRange.min}세`}
                    {classData.ageRange.min && classData.ageRange.max && ' ~ '}
                    {classData.ageRange.max && `${classData.ageRange.max}세`}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="max-h-96 overflow-y-auto space-y-2 py-4">
            {availableMembers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                추가 가능한 회원이 없습니다.
              </p>
            ) : (
              availableMembers.map((member) => {
                const age = getMemberAge(member.dateOfBirth);
                const isSelected = selectedMemberIds.includes(member.id);
                const canJoin = member.canJoin;
                const memberCategory = member.memberCategory || 
                  (calculateAge(member.dateOfBirth) >= 19 ? 'adult' : 'child');
                const categoryColors = getMemberCategoryColor(memberCategory);
                
                return (
                  <div
                    key={member.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border ${
                      canJoin 
                        ? 'hover:bg-accent cursor-pointer' 
                        : 'opacity-50 cursor-not-allowed bg-muted'
                    }`}
                    onClick={() => canJoin && toggleMemberSelection(member.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={!canJoin}
                      onCheckedChange={() => canJoin && toggleMemberSelection(member.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{member.name}</p>
                        <Badge className={categoryColors.badge}>
                          {memberCategory === 'adult' ? <User className="inline h-3 w-3 mr-1" /> : <Baby className="inline h-3 w-3 mr-1" />}
                          {getMemberCategoryLabel(memberCategory)}
                        </Badge>
                      </div>
                      {age && (
                        <p className="text-sm text-muted-foreground">{age}세</p>
                      )}
                      {!canJoin && (
                        <p className="text-xs text-destructive mt-1">
                          ⚠️ 이 클래스의 자격 요건을 충족하지 않습니다
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddMemberDialogOpen(false);
                setSelectedMemberIds([]);
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={selectedMemberIds.length === 0 || isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              추가 ({selectedMemberIds.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
