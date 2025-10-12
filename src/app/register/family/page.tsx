'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Building2, Loader2 } from 'lucide-react';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { FamilyRequest, Club } from '@/types';

export default function FamilyRegisterPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // 대표자 정보 (부모)
    name: '',
    email: '',
    phoneNumber: '',
    clubId: '',
    birthDate: '',
    address: '',
  });

  // Firestore에서 클럽 목록 가져오기
  const clubsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'clubs') : null),
    [firestore]
  );
  const { data: clubs, isLoading: isClubsLoading } = useCollection<Club>(clubsCollection);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firestore || !user) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedClub = clubs?.find(c => c.id === formData.clubId);
      if (!selectedClub) {
        alert('클럽을 선택해주세요.');
        return;
      }

      // FamilyRequest 생성 (자녀 정보는 승인 후 추가)
      const requestData: Omit<FamilyRequest, 'id'> = {
        userId: user.uid,
        parentName: formData.name,
        parentEmail: formData.email,
        parentPhone: formData.phoneNumber,
        clubId: formData.clubId,
        clubName: selectedClub.name,
        children: [], // 승인 후 추가
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };

      // Firestore에 저장
      await addDoc(collection(firestore, 'familyRequests'), requestData);
      
      alert('가입 신청이 완료되었습니다! 클럽 오너의 승인 후 자녀를 추가할 수 있습니다.');
      router.push('/dashboard');
    } catch (error) {
      console.error('가입 신청 실패:', error);
      alert('가입 신청에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isClubsLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">가족 회원 가입</CardTitle>
              <CardDescription>
                대표자 정보를 입력하세요 (승인 후 자녀 추가 가능)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 안내 메시지 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>가족 회원이란?</strong><br />
                대표자(부모) 1명의 이메일로 여러 자녀를 관리할 수 있습니다.
                각 자녀는 개별적으로 출석, 수업, 이용권이 관리됩니다.
              </p>
            </div>

            {/* 클럽 선택 */}
            <div className="space-y-2">
              <Label htmlFor="club">
                <Building2 className="h-4 w-4 inline mr-2" />
                클럽 선택 *
              </Label>
              <Select
                value={formData.clubId}
                onValueChange={(value) => setFormData({ ...formData, clubId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="가입할 클럽을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {clubs && clubs.length > 0 ? (
                    clubs.map((club) => (
                      <SelectItem key={club.id} value={club.id}>
                        {club.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      등록된 클럽이 없습니다
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">대표자 정보 (부모)</h3>

              {/* 이름 */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="홍길동"
                  required
                />
              </div>

              {/* 이메일 */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="email">이메일 * (로그인용)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="parent@example.com"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  이 이메일로 로그인하여 모든 자녀를 관리합니다
                </p>
              </div>

              {/* 전화번호 */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="phone">전화번호 *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="010-1234-5678"
                  required
                />
              </div>

              {/* 생년월일 */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="birthDate">생년월일</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
              </div>

              {/* 주소 */}
              <div className="space-y-2">
                <Label htmlFor="address">주소</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="서울시 강남구..."
                />
              </div>
            </div>

            {/* 다음 단계 안내 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>다음 단계:</strong><br />
                1. 가입 신청 → 클럽 오너 승인 대기<br />
                2. 승인 완료 → 로그인<br />
                3. 내 프로필에서 자녀 추가
              </p>
            </div>

            {/* 제출 버튼 */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.name || !formData.email || !formData.clubId || !formData.phoneNumber}
                className="flex-1"
              >
                {isSubmitting ? '신청 중...' : '가입 신청'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
