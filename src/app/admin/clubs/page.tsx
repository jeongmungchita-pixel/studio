'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { Club, Member } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, MapPin, Loader2, Building2, Mail } from 'lucide-react';
import { useMemo } from 'react';

export default function ClubsPage() {
  const firestore = useFirestore();
  
  // 임시: 모든 클럽 조회 (status 확인용)
  const clubsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'clubs');
  }, [firestore]);
  const { data: clubs, isLoading: isClubsLoading, error: clubsError } = useCollection<Club>(clubsQuery);
  
  // 디버깅: 클럽 데이터 콘솔 출력
  console.log('🔍 전체 클럽 데이터:', clubs);
  console.log('📊 각 클럽의 status:', clubs?.map(c => ({ name: c.name, status: c.status })));
  console.log('❌ 클럽 조회 에러:', clubsError);

  // 전체 회원 조회 (클럽별 회원 수 계산용)
  const membersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'members') : null),
    [firestore]
  );
  const { data: allMembers, isLoading: isMembersLoading } = useCollection<Member>(membersCollection);

  // 클럽별 회원 수 계산
  const clubMemberCounts = useMemo(() => {
    if (!allMembers) return {};
    const counts: Record<string, number> = {};
    allMembers.forEach(member => {
      if (member.clubId) {
        counts[member.clubId] = (counts[member.clubId] || 0) + 1;
      }
    });
    return counts;
  }, [allMembers]);

  if (isClubsLoading || isMembersLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">클럽 관리</h1>
          <p className="mt-1 text-sm text-slate-600">
            승인된 클럽 목록 및 소속 회원 현황
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Building2 className="mr-1 h-3 w-3" />
            총 {clubs?.length || 0}개 클럽
          </Badge>
        </div>
      </div>

      {/* 클럽 카드 그리드 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {clubs?.map((club) => (
          <Card key={club.id} className="flex flex-col hover:shadow-lg transition-shadow border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{club.name}</CardTitle>
                  <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                    <MapPin className="h-3 w-3" />
                    {club.location || '위치 미등록'}
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-grow space-y-3 pt-0">
              {/* 담당자 정보 */}
              <div className="space-y-2 text-sm">
                {club.contactName && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="h-4 w-4" />
                    <span>담당자: {club.contactName}</span>
                  </div>
                )}
                {club.contactEmail && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{club.contactEmail}</span>
                  </div>
                )}
              </div>

              {/* 회원 수 */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">소속 회원</span>
                  <Badge variant="secondary" className="font-semibold">
                    {clubMemberCounts[club.id] || 0}명
                  </Badge>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="pt-3">
              <Link href={`/clubs/${club.id}`} className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  상세보기
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* 클럽이 없을 때 */}
      {clubs && clubs.length === 0 && (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-slate-400 mb-4" />
            <p className="text-lg font-medium text-slate-900">등록된 클럽이 없습니다</p>
            <p className="text-sm text-slate-500 mt-1">
              최고 관리자가 클럽을 승인하면 여기에 표시됩니다
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
