'use client';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, Calendar, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { RequireRole } from '@/components/require-role';
import { UserRole, Committee, CommitteeType } from '@/types';
import { RoleBadge } from '@/components/role-badge';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';

const committeeTypeNames: Record<CommitteeType, string> = {
  COMPETITION: '대회',
  EDUCATION: '교육',
  MARKETING: '마케팅',
};

const committeeTypeColors: Record<CommitteeType, string> = {
  COMPETITION: 'bg-blue-500/10 text-blue-700 border-blue-200',
  EDUCATION: 'bg-green-500/10 text-green-700 border-green-200',
  MARKETING: 'bg-purple-500/10 text-purple-700 border-purple-200',
};

export default function CommitteesPage() {
  const router = useRouter();
  const firestore = useFirestore();

  // 위원회 목록 조회
  const committeesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'committees'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore]);

  const { data: committees, isLoading } = useCollection<Committee>(committeesQuery);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">위원회 관리</h1>
          <p className="text-muted-foreground mt-1">
            대회, 교육, 마케팅 위원회를 관리합니다
          </p>
        </div>
        
        {/* 연맹 관리자만 위원회 생성 가능 */}
        <RequireRole role={UserRole.FEDERATION_ADMIN}>
          <Button onClick={() => router.push('/committees/new')}>
            <Plus className="h-4 w-4 mr-2" />
            새 위원회 만들기
          </Button>
        </RequireRole>
      </div>

      {/* 위원회 목록 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {committees && committees.length > 0 && committees.map((committee) => (
          <Card 
            key={committee.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push(`/committees/${committee.id}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {committee.name}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {committee.description}
                  </CardDescription>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${committeeTypeColors[committee.type]}`}>
                  {committeeTypeNames[committee.type]}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>생성일: {new Date(committee.createdAt).toLocaleDateString()}</span>
                </div>
                {committee.chairId && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">위원장 지정됨</span>
                      <RoleBadge role={UserRole.COMMITTEE_CHAIR} />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 위원회가 없을 때 */}
      {(!committees || committees.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">위원회가 없습니다</h3>
            <p className="text-muted-foreground text-center mb-4">
              첫 번째 위원회를 만들어보세요
            </p>
            <RequireRole role={UserRole.FEDERATION_ADMIN}>
              <Button onClick={() => router.push('/committees/new')}>
                <Plus className="h-4 w-4 mr-2" />
                위원회 만들기
              </Button>
            </RequireRole>
          </CardContent>
        </Card>
      )}

      {/* 안내 메시지 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">위원회 시스템</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• <strong>대회 위원회:</strong> 체조 대회 기획, 운영 및 심사</li>
            <li>• <strong>교육 위원회:</strong> 코치 교육 및 선수 육성 프로그램</li>
            <li>• <strong>마케팅 위원회:</strong> 홍보, 스폰서십, 미디어 관리</li>
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
