'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserRole } from '@/types';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Building2, UserPlus } from 'lucide-react';

// 임시 클럽 데이터
const mockClubs = [
  { id: '1', name: '서울체조클럽' },
  { id: '2', name: '부산체조센터' },
  { id: '3', name: '대전체조아카데미' },
  { id: '4', name: '광주체조교실' },
];

export default function MemberRegisterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    clubId: '',
    familyType: 'individual' as 'individual' | 'parent' | 'child',
    birthDate: '',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('회원 가입 신청:', formData);
      // TODO: Firestore에 저장
      // await createMemberRequest(formData);
      
      alert('가입 신청이 완료되었습니다! 클럽 오너의 승인을 기다려주세요.');
      router.push('/dashboard');
    } catch (error) {
      console.error('가입 신청 실패:', error);
      alert('가입 신청에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 p-6 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">회원 가입 신청</CardTitle>
              <CardDescription>
                클럽을 선택하고 정보를 입력하세요
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 가입 유형 */}
            <div className="space-y-2">
              <Label>가입 유형</Label>
              <RadioGroup
                value={formData.familyType}
                onValueChange={(value: any) => setFormData({ ...formData, familyType: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual" className="cursor-pointer">
                    개인 회원
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="parent" id="parent" />
                  <Label htmlFor="parent" className="cursor-pointer">
                    부모 회원 (가족 회원)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="child" id="child" />
                  <Label htmlFor="child" className="cursor-pointer">
                    자녀 회원 (가족 회원)
                  </Label>
                </div>
              </RadioGroup>
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
                  {mockClubs.map((club) => (
                    <SelectItem key={club.id} value={club.id}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 이름 */}
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@email.com"
                required
              />
            </div>

            {/* 전화번호 */}
            <div className="space-y-2">
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
            <div className="space-y-2">
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

            {/* 안내 메시지 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>안내:</strong> 가입 신청 후 클럽 오너의 승인이 필요합니다. 
                승인이 완료되면 이메일로 알림을 받게 됩니다.
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
                disabled={isSubmitting || !formData.name || !formData.email || !formData.clubId}
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
