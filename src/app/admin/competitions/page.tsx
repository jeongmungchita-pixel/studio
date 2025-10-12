'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { GymnasticsCompetition, GymnasticsEvent, CompetitionCategory, CompetitionRegistration } from '@/types';
import { UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import * as z from 'zod';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import Link from 'next/link';

const MALE_EVENTS = [
  { id: 'FX', name: '마루운동', code: 'FX', gender: 'male' as const },
  { id: 'PH', name: '안마', code: 'PH', gender: 'male' as const },
  { id: 'SR', name: '링', code: 'SR', gender: 'male' as const },
  { id: 'VT', name: '도마', code: 'VT', gender: 'both' as const },
  { id: 'PB', name: '평행봉', code: 'PB', gender: 'male' as const },
  { id: 'HB', name: '철봉', code: 'HB', gender: 'male' as const },
];

const FEMALE_EVENTS = [
  { id: 'VT', name: '도마', code: 'VT', gender: 'both' as const },
  { id: 'UB', name: '이단평행봉', code: 'UB', gender: 'female' as const },
  { id: 'BB', name: '평균대', code: 'BB', gender: 'female' as const },
  { id: 'FX', name: '마루운동', code: 'FX', gender: 'both' as const },
];

const competitionFormSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요'),
  description: z.string().min(1, '설명을 입력하세요'),
  registrationStart: z.string(),
  registrationEnd: z.string(),
  competitionDate: z.string(),
  venue: z.string().optional(),
});

type CompetitionFormValues = z.infer<typeof competitionFormSchema>;

const statusLabels = {
  draft: '준비중',
  registration_open: '신청중',
  registration_closed: '신청마감',
  in_progress: '진행중',
  completed: '완료',
  cancelled: '취소',
};

export default function AdminCompetitionsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<GymnasticsCompetition | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<GymnasticsCompetition | null>(null);

  const form = useForm<CompetitionFormValues>({
    resolver: zodResolver(competitionFormSchema),
    defaultValues: {
      title: '',
      description: '',
      registrationStart: new Date().toISOString().split('T')[0],
      registrationEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      competitionDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      venue: '',
    },
  });

  // Fetch competitions
  const competitionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'competitions'),
      orderBy('competitionDate', 'desc')
    );
  }, [firestore]);
  const { data: competitions, isLoading } = useCollection<GymnasticsCompetition>(competitionsQuery);

  // Fetch registrations for selected competition
  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedCompetition) return null;
    return query(
      collection(firestore, 'competition_registrations'),
      where('competitionId', '==', selectedCompetition.id)
    );
  }, [firestore, selectedCompetition?.id]);
  const { data: registrations } = useCollection<CompetitionRegistration>(registrationsQuery);

  const onSubmit = async (values: CompetitionFormValues) => {
    if (!firestore || !user || selectedEvents.length === 0) {
      toast({ variant: 'destructive', title: '종목을 선택하세요' });
      return;
    }

    try {
      const events: GymnasticsEvent[] = [...MALE_EVENTS, ...FEMALE_EVENTS]
        .filter(e => selectedEvents.includes(e.id))
        .map(e => ({
          id: e.id,
          name: e.name,
          code: e.code,
          gender: e.gender,
          maxScore: 10,
          judgeCount: 4,
        }));

      const categories: CompetitionCategory[] = [
        { id: 'elem_1_2', type: 'grade', name: '초등 1-2학년', minAge: 7, maxAge: 8 },
        { id: 'elem_3_4', type: 'grade', name: '초등 3-4학년', minAge: 9, maxAge: 10 },
        { id: 'elem_5_6', type: 'grade', name: '초등 5-6학년', minAge: 11, maxAge: 12 },
        { id: 'middle', type: 'grade', name: '중등부', minAge: 13, maxAge: 15 },
        { id: 'high', type: 'grade', name: '고등부', minAge: 16, maxAge: 18 },
      ];

      if (editingCompetition) {
        await updateDoc(doc(firestore, 'competitions', editingCompetition.id), {
          ...values,
          events,
          categories,
          updatedAt: new Date().toISOString(),
        });
        toast({ title: '시합 수정 완료' });
      } else {
        const compRef = doc(collection(firestore, 'competitions'));
        const competitionData: GymnasticsCompetition = {
          ...values,
          id: compRef.id,
          events,
          categories,
          genderSeparate: true,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: user.uid,
        };
        await setDoc(compRef, competitionData);
        toast({ title: '시합 생성 완료' });
      }

      setIsDialogOpen(false);
      form.reset();
      setSelectedEvents([]);
      setEditingCompetition(null);
    } catch (error) {
      console.error('Competition save error:', error);
      toast({ variant: 'destructive', title: '저장 실패' });
    }
  };

  const handleEdit = (competition: GymnasticsCompetition) => {
    setEditingCompetition(competition);
    form.reset({
      title: competition.title,
      description: competition.description,
      registrationStart: competition.registrationStart.split('T')[0],
      registrationEnd: competition.registrationEnd.split('T')[0],
      competitionDate: competition.competitionDate.split('T')[0],
      venue: competition.venue,
    });
    setSelectedEvents(competition.events.map(e => e.id));
    setIsDialogOpen(true);
  };

  const handleDelete = async (competitionId: string) => {
    if (!firestore || !confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(firestore, 'competitions', competitionId));
      toast({ title: '시합 삭제 완료' });
    } catch (error) {
      toast({ variant: 'destructive', title: '삭제 실패' });
    }
  };

  const handleStatusChange = async (competitionId: string, newStatus: GymnasticsCompetition['status']) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'competitions', competitionId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      toast({ title: '상태 변경 완료' });
    } catch (error) {
      toast({ variant: 'destructive', title: '상태 변경 실패' });
    }
  };

  if (user?.role !== UserRole.FEDERATION_ADMIN && user?.role !== UserRole.SUPER_ADMIN) {
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
          <h1 className="text-2xl sm:text-3xl font-bold">시합 관리</h1>
          <p className="text-muted-foreground mt-1">기계체조 시합을 생성하고 관리하세요</p>
        </div>
        <Button onClick={() => {
          setEditingCompetition(null);
          form.reset();
          setSelectedEvents([]);
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          새 시합 생성
        </Button>
      </div>

      {/* Competitions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {competitions?.map((competition) => (
          <Card key={competition.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <Badge variant={
                  competition.status === 'registration_open' ? 'default' :
                  competition.status === 'in_progress' ? 'secondary' :
                  'outline'
                }>
                  {statusLabels[competition.status]}
                </Badge>
              </div>
              <CardTitle className="text-lg">{competition.title}</CardTitle>
              <CardDescription className="line-clamp-2">
                {competition.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="text-muted-foreground">시합일</p>
                <p className="font-semibold">{format(new Date(competition.competitionDate), 'PPP', { locale: ko })}</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">신청 기간</p>
                <p className="font-semibold">
                  {format(new Date(competition.registrationStart), 'M/d')} ~ {format(new Date(competition.registrationEnd), 'M/d')}
                </p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">종목</p>
                <p className="font-semibold">{competition.events.length}개</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {competition.status === 'draft' && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(competition.id, 'registration_open')}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    신청 시작
                  </Button>
                )}
                {competition.status === 'registration_open' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(competition.id, 'registration_closed')}
                  >
                    신청 마감
                  </Button>
                )}
                {competition.status === 'registration_closed' && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(competition.id, 'in_progress')}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    시합 시작
                  </Button>
                )}
                {competition.status === 'in_progress' && (
                  <>
                    <Link href={`/scoreboard/${competition.id}`}>
                      <Button size="sm" variant="outline">
                        전광판
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleStatusChange(competition.id, 'completed')}
                    >
                      <Square className="h-4 w-4 mr-1" />
                      시합 종료
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedCompetition(competition)}
                >
                  <Users className="h-4 w-4 mr-1" />
                  참가자
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(competition)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(competition.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!competitions || competitions.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground mb-4">생성된 시합이 없습니다</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              첫 시합 만들기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCompetition ? '시합 수정' : '새 시합 생성'}</DialogTitle>
            <DialogDescription>
              기계체조 시합 정보를 입력하세요
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
                      <Input placeholder="예: 2025 전국 기계체조 선수권대회" {...field} />
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
                      <Textarea placeholder="시합 상세 설명" rows={3} {...field} />
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
                  name="competitionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>시합 날짜</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>장소 (선택)</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 서울 올림픽체조경기장" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Event Selection */}
              <div className="space-y-3">
                <FormLabel>종목 선택</FormLabel>
                <div>
                  <p className="text-sm font-semibold mb-2">남자 종목</p>
                  <div className="grid grid-cols-3 gap-2">
                    {MALE_EVENTS.map(event => (
                      <div
                        key={event.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedEvents.includes(event.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => {
                          setSelectedEvents(prev =>
                            prev.includes(event.id)
                              ? prev.filter(id => id !== event.id)
                              : [...prev, event.id]
                          );
                        }}
                      >
                        <p className="font-semibold text-sm">{event.name}</p>
                        <p className="text-xs text-muted-foreground">{event.code}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">여자 종목</p>
                  <div className="grid grid-cols-3 gap-2">
                    {FEMALE_EVENTS.map(event => (
                      <div
                        key={event.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedEvents.includes(event.id)
                            ? 'border-pink-500 bg-pink-50'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => {
                          setSelectedEvents(prev =>
                            prev.includes(event.id)
                              ? prev.filter(id => id !== event.id)
                              : [...prev, event.id]
                          );
                        }}
                      >
                        <p className="font-semibold text-sm">{event.name}</p>
                        <p className="text-xs text-muted-foreground">{event.code}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button type="submit">
                  {editingCompetition ? '수정' : '생성'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Registrations Dialog */}
      <Dialog open={!!selectedCompetition} onOpenChange={() => setSelectedCompetition(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCompetition?.title} - 참가자 목록</DialogTitle>
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
                      {reg.clubName} | {reg.gender === 'male' ? '남자' : '여자'} | {reg.age}세
                    </p>
                    <p className="text-sm text-muted-foreground">
                      종목: {reg.registeredEvents.length}개
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
