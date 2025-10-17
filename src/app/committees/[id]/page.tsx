'use client';

export const dynamic = 'force-dynamic';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, deleteDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Edit, Trash2, Users, Calendar } from 'lucide-react';
import { UserRole, CommitteeType } from '@/types';
import { Committee, UserProfile } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

const committeeTypeLabels: Record<CommitteeType, string> = {
  COMPETITION: '대회',
  EDUCATION: '교육',
  MARKETING: '마케팅',
};

const committeeTypeColors: Record<CommitteeType, string> = {
  COMPETITION: 'bg-blue-500/10 text-blue-700 border-blue-200',
  EDUCATION: 'bg-green-500/10 text-green-700 border-green-200',
  MARKETING: 'bg-purple-500/10 text-purple-700 border-purple-200',
};

export default function CommitteeDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const committeeId = resolvedParams.id;
  
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Fetch committee
  const committeeQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'committees'),
      where('__name__', '==', committeeId)
    );
  }, [firestore, committeeId]);
  const { data: committees, isLoading } = useCollection<Committee>(committeeQuery);
  const committee = committees?.[0];

  // Fetch committee members (users with committeeId)
  const membersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'users'),
      where('committeeId', '==', committeeId)
    );
  }, [firestore, committeeId]);
  const { data: members } = useCollection<UserProfile>(membersQuery);

  const handleDelete = async () => {
    if (!firestore || !committee) return;
    if (!confirm('정말 이 위원회를 삭제하시겠습니까?')) return;

    try {
      await deleteDoc(doc(firestore, 'committees', committeeId));
      toast({
        title: '삭제 완료',
        description: '위원회가 삭제되었습니다.',
      });
      router.push('/committees');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: '위원회 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!committee) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">위원회를 찾을 수 없습니다</h2>
          <Button onClick={() => router.push('/committees')}>
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const chairperson = members?.find(m => m.role === UserRole.COMMITTEE_CHAIR);

  return (
    <main className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/committees')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{committee.name}</h1>
              <Badge className={`${committeeTypeColors[committee.type]} border`}>
                {committeeTypeLabels[committee.type]}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">{committee.description}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            수정
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 위원회 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>위원회 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">생성일</p>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">
                  {new Date(committee.createdAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {chairperson && (
              <div>
                <p className="text-sm text-muted-foreground">위원장</p>
                <div className="flex items-center gap-2 mt-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{chairperson.displayName}</p>
                </div>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground">위원 수</p>
              <div className="flex items-center gap-2 mt-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{members?.length || 0}명</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 위원 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>위원 목록</CardTitle>
            <CardDescription>
              이 위원회에 소속된 위원들입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            {members && members.length > 0 ? (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.uid}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{member.displayName}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <Badge variant={member.role === UserRole.COMMITTEE_CHAIR ? 'default' : 'secondary'}>
                      {member.role === UserRole.COMMITTEE_CHAIR ? '위원장' : '위원'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">아직 위원이 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 활동 내역 */}
      <Card>
        <CardHeader>
          <CardTitle>활동 내역</CardTitle>
          <CardDescription>위원회의 주요 활동과 결정사항</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">활동 내역이 없습니다</p>
            <p className="text-sm text-muted-foreground mt-1">
              향후 회의록, 결정사항 등이 표시됩니다
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
