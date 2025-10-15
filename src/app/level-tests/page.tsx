'use client';

export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, setDoc, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { ClubLevelTest, LevelTestRegistration, Member, MemberLevel } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trophy, Calendar, Target, CheckCircle2, Award } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const statusLabels = {
  draft: '준비중',
  registration_open: '신청중',
  registration_closed: '신청마감',
  in_progress: '진행중',
  completed: '완료',
};

export default function LevelTestsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedTest, setSelectedTest] = useState<ClubLevelTest | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch member info
  const memberQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'members'),
      where('userId', '==', user.uid)
    );
  }, [firestore, user?.uid]);
  const { data: members } = useCollection<Member>(memberQuery);
  const member = members?.[0];

  // Fetch level tests
  const testsQuery = useMemoFirebase(() => {
    if (!firestore || !member?.clubId) return null;
    return query(
      collection(firestore, 'level_tests'),
      where('clubId', '==', member.clubId),
      orderBy('testDate', 'desc')
    );
  }, [firestore, member?.clubId]);
  const { data: levelTests, isLoading } = useCollection<ClubLevelTest>(testsQuery);
  
  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Fetch my registrations
  const myRegistrationsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'level_test_registrations'),
      where('memberId', '==', user.uid)
    );
  }, [firestore, user?.uid]);
  const { data: myRegistrations } = useCollection<LevelTestRegistration>(myRegistrationsQuery);

  const handleApply = (test: ClubLevelTest) => {
    setSelectedTest(test);
    setSelectedLevel('');
  };

  const handleSubmit = async () => {
    if (!selectedTest || !firestore || !user || !member || !selectedLevel) return;

    setIsSubmitting(true);
    try {
      const regRef = doc(collection(firestore, 'level_test_registrations'));
      const registrationData: LevelTestRegistration = {
        id: regRef.id,
        testId: selectedTest.id,
        memberId: user.uid,
        memberName: member.name,
        clubId: member.clubId,
        currentLevel: member.level,
        targetLevel: selectedLevel,
        status: 'pending',
        registeredAt: new Date().toISOString(),
      };

      await setDoc(regRef, registrationData);

      toast({
        title: '신청 완료!',
        description: `${selectedTest.title} 레벨테스트 신청이 완료되었습니다.`,
      });

      setSelectedTest(null);
      setSelectedLevel('');
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        variant: 'destructive',
        title: '신청 실패',
        description: '레벨테스트 신청 중 오류가 발생했습니다.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRegistered = (testId: string) => {
    return myRegistrations?.some(r => r.testId === testId && r.status !== 'rejected');
  };

  const canRegister = (test: ClubLevelTest) => {
    const now = new Date();
    const regStart = new Date(test.registrationStart);
    const regEnd = new Date(test.registrationEnd);
    return test.status === 'registration_open' && now >= regStart && now <= regEnd;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">레벨테스트</h1>
        <p className="text-muted-foreground mt-1">레벨을 획득하고 실력을 인정받으세요</p>
      </div>

      {/* My Current Level */}
      {member?.level && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              내 현재 레벨
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge 
                className="text-lg px-4 py-2"
                style={{ backgroundColor: member.levelColor || '#3B82F6' }}
              >
                {member.level}
              </Badge>
              {member.levelRank && member.levelRank <= 3 && (
                <span className="text-2xl">
                  {member.levelRank === 1 ? '🏆' : member.levelRank === 2 ? '🥈' : '🥉'}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Registrations */}
      {myRegistrations && myRegistrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>내 신청 내역</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myRegistrations.map((reg) => {
              const test = levelTests?.find(t => t.id === reg.testId);
              return (
                <div key={reg.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-semibold">{test?.title || '레벨테스트'}</p>
                    <p className="text-sm text-muted-foreground">
                      목표: {reg.targetLevel}
                    </p>
                  </div>
                  <Badge variant={reg.status === 'approved' ? 'default' : 'secondary'}>
                    {reg.status === 'approved' ? '승인' : reg.status === 'rejected' ? '거절' : '대기'}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Available Tests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {levelTests?.map((test) => {
          const registered = isRegistered(test.id);
          const canApply = canRegister(test);

          return (
            <Card key={test.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant={
                    test.status === 'registration_open' ? 'default' :
                    test.status === 'in_progress' ? 'secondary' :
                    'outline'
                  }>
                    {statusLabels[test.status]}
                  </Badge>
                  {registered && (
                    <Badge variant="default">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      신청완료
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl">{test.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {test.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(test.testDate), 'PPP', { locale: ko })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span>{test.levels.length}개 레벨</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Trophy className="h-4 w-4" />
                  <span>
                    신청: {format(new Date(test.registrationStart), 'M/d')} ~ {format(new Date(test.registrationEnd), 'M/d')}
                  </span>
                </div>

                {canApply && !registered && (
                  <Button onClick={() => handleApply(test)} className="w-full">
                    신청하기
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!levelTests || levelTests.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Trophy className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">진행 중인 레벨테스트가 없습니다</p>
          </CardContent>
        </Card>
      )}

      {/* Application Dialog */}
      <Dialog open={!!selectedTest} onOpenChange={() => setSelectedTest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTest?.title}</DialogTitle>
            <DialogDescription>
              도전할 레벨을 선택하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {selectedTest?.levels
              .sort((a, b) => a.order - b.order)
              .map((level) => (
                <div
                  key={level.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedLevel === level.name
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedLevel(level.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge style={{ backgroundColor: level.color }} className="text-white">
                        {level.icon} {level.name}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {level.minScore}~{level.maxScore}점
                      </span>
                    </div>
                    {selectedLevel === level.name && (
                      <CheckCircle2 className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                </div>
              ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTest(null)}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedLevel}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  신청 중...
                </>
              ) : (
                '신청하기'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
