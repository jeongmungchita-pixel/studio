'use client';

export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, setDoc, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { LevelTest, LevelTestRegistration, Member } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trophy, Calendar, Target, CheckCircle2, Award } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const statusLabels: Record<'draft' | 'registration-open' | 'registration-closed' | 'in-progress' | 'completed', string> = {
  draft: '준비중',
  'registration-open': '신청중',
  'registration-closed': '신청마감',
  'in-progress': '진행중',
  completed: '완료',
};

export default function LevelTestsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedTest, setSelectedTest] = useState<LevelTest | null>(null);
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
  const { data: levelTests, isLoading } = useCollection<LevelTest>(testsQuery);
  
  // 로딩 스피너는 모든 훅 호출 뒤에서 한 번만 렌더

  // Fetch my registrations
  const myRegistrationsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'level_test_registrations'),
      where('memberId', '==', user.uid)
    );
  }, [firestore, user?.uid]);
  const { data: myRegistrations } = useCollection<LevelTestRegistration>(myRegistrationsQuery);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const handleApply = (test: LevelTest) => {
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
        testName: selectedTest.name,
        memberId: user.uid,
        memberName: member.name,
        clubId: member.clubId,
        currentLevel: member.currentLevel || '',
        targetLevel: selectedLevel,
        status: 'registered',
        registeredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      await setDoc(regRef, registrationData);

      toast({
        title: '신청 완료!',
        description: `${selectedTest.name} 레벨테스트 신청이 완료되었습니다.`,
      });

      setSelectedTest(null);
      setSelectedLevel('');
    } catch (error) {
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
    return myRegistrations?.some(r => r.testId === testId);
  };

  const canRegister = (test: LevelTest) => {
    const now = new Date();
    const regEnd = new Date(test.registrationDeadline);
    return test.status === 'registration-open' && now <= regEnd;
  };

  // 상단에서 이미 로딩 처리를 통일함

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">레벨테스트</h1>
        <p className="text-muted-foreground mt-1">레벨을 획득하고 실력을 인정받으세요</p>
      </div>

      {/* My Current Level */}
      {member?.currentLevel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              내 현재 레벨
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge className="text-lg px-4 py-2">
                {member.currentLevel}
              </Badge>
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
                    <p className="font-semibold">{test?.name || '레벨테스트'}</p>
                    <p className="text-sm text-muted-foreground">
                      목표: {reg.targetLevel}
                    </p>
                  </div>
                  <Badge variant={reg.status === 'passed' ? 'default' : (reg.status === 'failed' || reg.status === 'cancelled' || reg.status === 'absent') ? 'destructive' : 'secondary'}>
                    {reg.status === 'registered' ? '신청' : reg.status === 'tested' ? '심사완료' : reg.status === 'passed' ? '합격' : reg.status === 'failed' ? '불합격' : reg.status === 'absent' ? '결석' : reg.status === 'cancelled' ? '취소' : reg.status}
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
                    test.status === 'registration-open' ? 'default' :
                    test.status === 'in-progress' ? 'secondary' :
                    'outline'
                  }>
                    {statusLabels[test.status as keyof typeof statusLabels]}
                  </Badge>
                  {registered && (
                    <Badge variant="default">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      신청완료
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl">{test.name}</CardTitle>
                {test.description && (
                  <CardDescription className="line-clamp-2">
                    {test.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(test.testDate), 'PPP', { locale: ko })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span>{(test.criteria || []).length}개 심사 항목</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Trophy className="h-4 w-4" />
                  <span>신청 마감: {format(new Date(test.registrationDeadline), 'M/d')}</span>
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
            <DialogTitle>{selectedTest?.name}</DialogTitle>
            <DialogDescription>
              도전할 레벨을 선택하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {(selectedTest?.criteria || [])
              .sort((a: any, b: any) => a.maxScore - b.maxScore)
              .map((level: any) => (
                <div
                  key={level.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedLevel === level.skill
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedLevel(level.skill)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className="text-white">
                        {level.skill}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        최대 점수 {level.maxScore}점
                      </span>
                    </div>
                    {selectedLevel === level.skill && (
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
