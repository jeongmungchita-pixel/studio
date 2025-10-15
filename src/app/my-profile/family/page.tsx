'use client';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { Users, UserPlus, Calendar, User, Mail, Phone, Loader2 } from 'lucide-react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { Member } from '@/types';

export default function FamilyManagementPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  // 자녀 목록 조회
  const childrenQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'members'),
      where('guardianIds', 'array-contains', user.uid)
    );
  }, [firestore, user]);

  const { data: children, isLoading: isChildrenLoading } = useCollection<Member>(childrenQuery);

  if (!user) {
    return (
      <main className="flex-1 p-6 flex items-center justify-center">
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              로그인이 필요합니다.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (isChildrenLoading) {
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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            내 가족
          </h1>
          <p className="text-muted-foreground mt-1">
            가족 구성원을 관리하고 자녀를 추가하세요
          </p>
        </div>
        <Button onClick={() => router.push('/my-profile/add-child')}>
          <UserPlus className="h-4 w-4 mr-2" />
          자녀 추가
        </Button>
      </div>

      {/* 대표자 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            대표자 (부모)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{user.displayName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
            {user.phoneNumber && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{user.phoneNumber}</span>
              </div>
            )}
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                클럽: <strong>{user.clubName || '미지정'}</strong>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 자녀 목록 */}
      <div>
        <h2 className="text-2xl font-bold mb-4">자녀 ({children?.length || 0}명)</h2>
        
        {children && children.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {children.map((child: Member) => (
              <Card key={child.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{child.name}</CardTitle>
                      <CardDescription>
                        {child.gender === 'male' ? '남' : '여'}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-primary">
                        {child.status === 'active' ? '활동중' : '비활동'}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {child.phoneNumber && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {child.phoneNumber}
                        </span>
                      </div>
                    )}

                    {child.activePassId && (
                      <div className="pt-3 border-t">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">이용권</span>
                          <span className="text-sm text-primary">
                            활성
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/members/${child.id}`)}
                        className="flex-1"
                      >
                        상세보기
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">등록된 자녀가 없습니다</h3>
              <p className="text-muted-foreground text-center mb-4">
                자녀를 추가하여 출석, 수업, 이용권을 관리하세요
              </p>
              <Button onClick={() => router.push('/my-profile/add-child')}>
                <UserPlus className="h-4 w-4 mr-2" />
                첫 자녀 추가하기
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 안내 메시지 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">가족 회원 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• 대표자(부모) 1명의 이메일로 모든 자녀를 관리합니다</li>
            <li>• 각 자녀는 개별적으로 출석, 수업, 이용권이 관리됩니다</li>
            <li>• 자녀 추가는 언제든지 가능합니다</li>
            <li>• 자녀별 성적, 사진, 영상을 개별 확인할 수 있습니다</li>
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
