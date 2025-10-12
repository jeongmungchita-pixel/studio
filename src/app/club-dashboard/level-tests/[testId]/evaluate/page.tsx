'use client';

import { use, useState } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, updateDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { ClubLevelTest, LevelTestRegistration, LevelTestScore, Member } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, Award } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function EvaluatePage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = use(params);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [selectedReg, setSelectedReg] = useState<LevelTestRegistration | null>(null);
  const [itemScores, setItemScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch test
  const testRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'level_tests', testId) : null),
    [firestore, testId]
  );
  const { data: test } = useDoc<ClubLevelTest>(testRef);

  // Fetch registrations
  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'level_test_registrations'),
      where('testId', '==', testId),
      where('status', '==', 'approved')
    );
  }, [firestore, testId]);
  const { data: registrations } = useCollection<LevelTestRegistration>(registrationsQuery);

  // Fetch scores
  const scoresQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'level_test_scores'),
      where('testId', '==', testId)
    );
  }, [firestore, testId]);
  const { data: scores } = useCollection<LevelTestScore>(scoresQuery);

  const handleEvaluate = (reg: LevelTestRegistration) => {
    setSelectedReg(reg);
    setItemScores({});
    setNotes('');
  };

  const calculateTotalScore = () => {
    if (!test) return 0;
    return test.evaluationItems.reduce((sum, item) => {
      return sum + (itemScores[item.id] || 0);
    }, 0);
  };

  const calculatePercentage = () => {
    if (!test) return 0;
    const maxTotal = test.evaluationItems.reduce((sum, item) => sum + item.maxScore, 0);
    return (calculateTotalScore() / maxTotal) * 100;
  };

  const determineLevel = () => {
    if (!test) return null;
    const percentage = calculatePercentage();
    return test.levels.find(level => percentage >= level.minScore && percentage <= level.maxScore);
  };

  const handleSubmit = async () => {
    if (!selectedReg || !test || !firestore || !user) return;

    const totalScore = calculateTotalScore();
    const percentage = calculatePercentage();
    const achievedLevel = determineLevel();

    if (!achievedLevel) {
      toast({ variant: 'destructive', title: '점수를 확인하세요' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Save score
      const scoreRef = doc(collection(firestore, 'level_test_scores'));
      const scoreData: LevelTestScore = {
        id: scoreRef.id,
        testId: test.id,
        registrationId: selectedReg.id,
        memberId: selectedReg.memberId,
        memberName: selectedReg.memberName,
        targetLevel: selectedReg.targetLevel,
        itemScores: test.evaluationItems.map(item => ({
          itemId: item.id,
          itemName: item.name,
          score: itemScores[item.id] || 0,
          maxScore: item.maxScore,
        })),
        totalScore,
        percentage,
        passed: percentage >= (test.levels.find(l => l.name === selectedReg.targetLevel)?.minScore || 0),
        achievedLevel: achievedLevel.name,
        evaluatorId: user.uid,
        evaluatorName: user.displayName || user.email || '평가자',
        notes,
        createdAt: new Date().toISOString(),
      };

      await setDoc(scoreRef, scoreData);

      // Calculate rank for this level
      const levelScores = scores?.filter(s => s.achievedLevel === achievedLevel.name) || [];
      const allScores = [...levelScores, scoreData].sort((a, b) => b.totalScore - a.totalScore);
      const rank = allScores.findIndex(s => s.id === scoreData.id) + 1;

      // Update score with rank
      await updateDoc(doc(firestore, 'level_test_scores', scoreRef.id), { rank });

      // Update member level if top 3 or passed
      if (rank <= 3 || scoreData.passed) {
        const memberRef = doc(firestore, 'members', selectedReg.memberId);
        await updateDoc(memberRef, {
          level: achievedLevel.name,
          levelCode: achievedLevel.code,
          levelColor: achievedLevel.color,
          levelIcon: achievedLevel.icon,
          levelRank: rank <= 3 ? rank : undefined,
        });
      }

      toast({
        title: '평가 완료!',
        description: `${selectedReg.memberName} - ${achievedLevel.name} ${rank <= 3 ? `${rank}위` : '획득'}`,
      });

      setSelectedReg(null);
      setItemScores({});
      setNotes('');
    } catch (error) {
      console.error('Score save error:', error);
      toast({ variant: 'destructive', title: '저장 실패' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasScore = (regId: string) => {
    return scores?.some(s => s.registrationId === regId);
  };

  if (!test) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{test.title}</h1>
        <p className="text-muted-foreground mt-1">참가자를 평가하세요</p>
      </div>

      {/* Participants */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {registrations?.map((reg) => {
          const completed = hasScore(reg.id);
          const score = scores?.find(s => s.registrationId === reg.id);

          return (
            <Card key={reg.id} className={completed ? 'border-green-500' : ''}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{reg.memberName}</span>
                  {completed && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <p className="text-muted-foreground">현재 레벨</p>
                  <p className="font-semibold">{reg.currentLevel || '없음'}</p>
                </div>
                <div className="text-sm">
                  <p className="text-muted-foreground">목표 레벨</p>
                  <Badge>{reg.targetLevel}</Badge>
                </div>
                {completed && score && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">결과</p>
                    <div className="flex items-center gap-2">
                      <Badge style={{ backgroundColor: test.levels.find(l => l.name === score.achievedLevel)?.color }}>
                        {score.achievedLevel}
                      </Badge>
                      {score.rank && score.rank <= 3 && (
                        <span className="text-lg">
                          {score.rank === 1 ? '🏆' : score.rank === 2 ? '🥈' : '🥉'}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold">{score.totalScore}점 ({score.percentage.toFixed(1)}%)</p>
                  </div>
                )}
                {!completed && (
                  <Button onClick={() => handleEvaluate(reg)} className="w-full">
                    평가하기
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!registrations || registrations.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground">승인된 참가자가 없습니다</p>
          </CardContent>
        </Card>
      )}

      {/* Evaluation Dialog */}
      <Dialog open={!!selectedReg} onOpenChange={() => setSelectedReg(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedReg?.memberName} 평가</DialogTitle>
            <DialogDescription>
              목표 레벨: {selectedReg?.targetLevel}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Score Inputs */}
            {test.evaluationItems.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    {item.name} (최대 {item.maxScore}점)
                  </label>
                  <span className="text-sm text-muted-foreground">{item.weight}%</span>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={item.maxScore}
                  step={0.1}
                  value={itemScores[item.id] || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setItemScores(prev => ({
                      ...prev,
                      [item.id]: Math.min(value, item.maxScore)
                    }));
                  }}
                  placeholder={`0 ~ ${item.maxScore}`}
                />
              </div>
            ))}

            {/* Total Score */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">총점</span>
                <span className="text-2xl font-bold">{calculateTotalScore().toFixed(1)}점</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">백분율</span>
                <span className="text-xl font-bold">{calculatePercentage().toFixed(1)}%</span>
              </div>
              {determineLevel() && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold">획득 레벨</span>
                  <Badge 
                    style={{ backgroundColor: determineLevel()?.color }}
                    className="text-white text-lg px-3 py-1"
                  >
                    {determineLevel()?.icon} {determineLevel()?.name}
                  </Badge>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">메모 (선택)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="평가 메모..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReg(null)}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || Object.keys(itemScores).length !== test.evaluationItems.length}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Award className="mr-2 h-4 w-4" />
                  평가 완료
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
