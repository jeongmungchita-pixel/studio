'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { Users, UserPlus } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function AddFamilyMemberPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    birthDate: '',
    relationship: 'child' as 'parent' | 'child',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    setIsSubmitting(true);

    try {
      // Firestore에 가족 회원 추가 (승인 대기 상태)
      await addDoc(collection(firestore, 'members'), {
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        birthDate: formData.birthDate,
        guardianIds: [user.uid], // 부모 UID
        clubId: user.clubId,
        memberType: 'family',
        familyRole: formData.relationship, // 'parent' or 'child'
        status: 'pending', // 클럽 오너 승인 필요
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      toast({
        title: '신청 완료',
        description: '가족 회원 추가 신청이 완료되었습니다! 클럽 오너의 승인을 기다려주세요.',
      });
      router.push('/my-profile/family');
    } catch (error) {
      console.error('가족 회원 추가 실패:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '가족 회원 추가에 실패했습니다. 다시 시도해주세요.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <main className="flex-1 p-6 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">가족 회원 추가</CardTitle>
              <CardDescription>
                가족 구성원을 추가하세요 (부모 또는 자녀)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 관계 선택 */}
            <div className="space-y-2">
              <Label>관계 *</Label>
              <RadioGroup
                value={formData.relationship}
                onValueChange={(value) => setFormData({ ...formData, relationship: value as 'parent' | 'child' })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="parent" id="parent" />
                  <Label htmlFor="parent" className="cursor-pointer">
                    부모
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="child" id="child" />
                  <Label htmlFor="child" className="cursor-pointer">
                    자녀
                  </Label>
                </div>
              </RadioGroup>
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
                placeholder="family@example.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                가족 구성원이 로그인할 때 사용할 이메일입니다
              </p>
            </div>

            {/* 전화번호 */}
            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="010-1234-5678"
              />
            </div>

            {/* 생년월일 */}
            <div className="space-y-2">
              <Label htmlFor="birthDate">생년월일 *</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                required
              />
            </div>

            {/* 현재 클럽 정보 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-semibold text-blue-900">
                  클럽 정보
                </p>
              </div>
              <p className="text-sm text-blue-800">
                가족 구성원은 자동으로 <strong>{user.clubName || '현재 클럽'}</strong>에 
                가입 신청됩니다.
              </p>
            </div>

            {/* 안내 메시지 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>안내:</strong> 가족 회원 추가 후 클럽 오너의 승인이 필요합니다. 
                승인이 완료되면 이메일로 초대 링크가 전송됩니다.
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
                disabled={
                  isSubmitting || 
                  !formData.name || 
                  !formData.email || 
                  !formData.birthDate
                }
                className="flex-1"
              >
                {isSubmitting ? '추가 중...' : '가족 회원 추가'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
