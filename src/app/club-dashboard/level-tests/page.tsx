'use client';

export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, setDoc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { ClubLevelTest, TestLevel, EvaluationItem, LevelTestRegistration } from '@/types';
import { UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, Trash2, Users, Play, Square } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import Link from 'next/link';

const DEFAULT_LEVELS: TestLevel[] = [
  { id: 'beginner', name: '입문', code: 'BEGINNER', color: '#8B4513', minScore: 0, maxScore: 59, order: 1, icon: '🟤' },
  { id: 'elementary', name: '초급', code: 'ELEMENTARY', color: '#22C55E', minScore: 60, maxScore: 69, order: 2, icon: '🟢' },
  { id: 'intermediate', name: '중급', code: 'INTERMEDIATE', color: '#3B82F6', minScore: 70, maxScore: 79, order: 3, icon: '🔵' },
  { id: 'advanced', name: '상급', code: 'ADVANCED', color: '#A855F7', minScore: 80, maxScore: 89, order: 4, icon: '🟣' },
  { id: 'elite', name: '엘리트', code: 'ELITE', color: '#EAB308', minScore: 90, maxScore: 100, order: 5, icon: '🟡' },
];

const DEFAULT_ITEMS: EvaluationItem[] = [
  { id: 'posture', name: '기본자세', maxScore: 30, weight: 30 },
  { id: 'rotation', name: '회전', maxScore: 25, weight: 25 },
  { id: 'landing', name: '착지', maxScore: 25, weight: 25 },
  { id: 'difficulty', name: '난이도', maxScore: 20, weight: 20 },
];

const testFormSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요'),
  description: z.string().min(1, '설명을 입력하세요'),
  registrationStart: z.string(),
  registrationEnd: z.string(),
  testDate: z.string(),
});

type TestFormValues = z.infer<typeof testFormSchema>;

const statusLabels = {
  draft: '준비중',
  registration_open: '신청중',
  registration_closed: '신청마감',
  in_progress: '진행중',
  completed: '완료',
};

export default function ClubLevelTestsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<ClubLevelTest | null>(null);
  const [selectedTest, setSelectedTest] = useState<ClubLevelTest | null>(null);

  const form = useForm<TestFormValues>({
    resolver: zodResolver(testFormSchema),
    defaultValues: {
      title: '',
      description: '',
      registrationStart: new Date().toISOString().split('T')[0],
      registrationEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      testDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  });

  // Fetch level tests
  const testsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'level_tests'),
      where('clubId', '==', user.clubId),
      orderBy('testDate', 'desc')
    );
  }, [firestore, user?.clubId]);
  const { data: levelTests, isLoading } = useCollection<ClubLevelTest>(testsQuery);

  // Fetch registrations for selected test
  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedTest) return null;
    return query(
      collection(firestore, 'level_test_registrations'),
      where('testId', '==', selectedTest.id)
    );
  }, [firestore, selectedTest?.id]);
  const { data: registrations } = useCollection<LevelTestRegistration>(registrationsQuery);

  const onSubmit = async (values: TestFormValues) => {
    if (!firestore || !user?.clubId) return;

    try {
      if (editingTest) {
        await updateDoc(doc(firestore, 'level_tests', editingTest.id), {
          ...values,
          updatedAt: new Date().toISOString(),
        });
        toast({ title: '레벨테스트 수정 완료' });
      } else {
        const testRef = doc(collection(firestore, 'level_tests'));
        const testData: ClubLevelTest = {
          ...values,
          id: testRef.id,
          clubId: user.clubId,
          levels: DEFAULT_LEVELS,
          evaluationItems: DEFAULT_ITEMS,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(testRef, testData);
        toast({ title: '레벨테스트 생성 완료' });
      }

      setIsDialogOpen(false);
      form.reset();
      setEditingTest(null);
    } catch (error) {
      toast({ variant: 'destructive', title: '저장 실패' });
    }
  };

  const handleEdit = (test: ClubLevelTest) => {
    setEditingTest(test);
    form.reset({
      title: test.title,
      description: test.description,
      registrationStart: test.registrationStart.split('T')[0],
      registrationEnd: test.registrationEnd.split('T')[0],
      testDate: test.testDate.split('T')[0],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (testId: string) => {
    if (!firestore || !confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(firestore, 'level_tests', testId));
      toast({ title: '레벨테스트 삭제 완료' });
    } catch (error) {
      toast({ variant: 'destructive', title: '삭제 실패' });
    }
  };

  const handleStatusChange = async (testId: string, newStatus: ClubLevelTest['status']) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'level_tests', testId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      toast({ title: '상태 변경 완료' });
    } catch (error) {
      toast({ variant: 'destructive', title: '상태 변경 실패' });
    }
  };

  if (user?.role !== UserRole.CLUB_OWNER && user?.role !== UserRole.CLUB_MANAGER) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-muted-foreground">접근 권한이 없습니다</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">레벨테스트 관리</h1>
          <p className="text-muted-foreground mt-1">회원들의 레벨을 평가하고 관리하세요</p>
        </div>
        <Button onClick={() => {
          setEditingTest(null);
          form.reset();
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          새 레벨테스트 생성
        </Button>
      </div>

      {/* Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {levelTests?.map((test) => (
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
              </div>
              <CardTitle className="text-lg">{test.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="text-muted-foreground">테스트 날짜</p>
                <p className="font-semibold">{format(new Date(test.testDate), 'PPP', { locale: ko })}</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">신청 기간</p>
                <p className="font-semibold">
                  {format(new Date(test.registrationStart), 'M/d')} ~ {format(new Date(test.registrationEnd), 'M/d')}
                </p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">레벨</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {test.levels.map(level => (
                    <Badge key={level.id} style={{ backgroundColor: level.color }} className="text-white text-xs">
                      {level.icon}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {test.status === 'draft' && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(test.id, 'registration_open')}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    신청 시작
                  </Button>
                )}
                {test.status === 'registration_open' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(test.id, 'registration_closed')}
                  >
                    신청 마감
                  </Button>
                )}
                {test.status === 'registration_closed' && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(test.id, 'in_progress')}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    테스트 시작
                  </Button>
                )}
                {test.status === 'in_progress' && (
                  <>
                    <Link href={`/club-dashboard/level-tests/${test.id}/evaluate`}>
                      <Button size="sm">
                        점수 입력
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleStatusChange(test.id, 'completed')}
                    >
                      <Square className="h-4 w-4 mr-1" />
                      테스트 종료
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedTest(test)}
                >
                  <Users className="h-4 w-4 mr-1" />
                  참가자
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(test)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(test.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!levelTests || levelTests.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground mb-4">생성된 레벨테스트가 없습니다</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              첫 레벨테스트 만들기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTest ? '레벨테스트 수정' : '새 레벨테스트 생성'}</DialogTitle>
            <DialogDescription>
              회원들의 레벨을 평가할 테스트를 만드세요
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>제목</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 2025 봄 레벨테스트" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명</FormLabel>
                    <FormControl>
                      <Textarea placeholder="테스트 상세 설명" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="registrationStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>신청 시작일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="registrationEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>신청 마감일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="testDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>테스트 날짜</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <FormLabel>레벨 (자동 설정)</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_LEVELS.map(level => (
                    <Badge key={level.id} style={{ backgroundColor: level.color }} className="text-white">
                      {level.icon} {level.name} ({level.minScore}~{level.maxScore}점)
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel>평가 항목 (자동 설정)</FormLabel>
                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_ITEMS.map(item => (
                    <div key={item.id} className="p-2 border rounded text-sm">
                      <span className="font-semibold">{item.name}</span>
                      <span className="text-muted-foreground ml-2">
                        {item.maxScore}점 ({item.weight}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button type="submit">
                  {editingTest ? '수정' : '생성'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Registrations Dialog */}
      <Dialog open={!!selectedTest} onOpenChange={() => setSelectedTest(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTest?.title} - 참가자 목록</DialogTitle>
            <DialogDescription>
              총 {registrations?.length || 0}명이 신청했습니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {registrations?.map((reg) => (
              <Card key={reg.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{reg.memberName}</p>
                    <p className="text-sm text-muted-foreground">
                      현재: {reg.currentLevel || '없음'} → 목표: {reg.targetLevel}
                    </p>
                  </div>
                  <Badge variant={
                    reg.status === 'approved' ? 'default' :
                    reg.status === 'rejected' ? 'destructive' :
                    'secondary'
                  }>
                    {reg.status === 'approved' ? '승인' : reg.status === 'rejected' ? '거절' : '대기'}
                  </Badge>
                </div>
              </Card>
            ))}
            {(!registrations || registrations.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                아직 신청자가 없습니다
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
