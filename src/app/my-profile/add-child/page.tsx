'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { UserPlus, AlertCircle } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function AddChildPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [children, setChildren] = useState([
    {
      name: '',
      birthDate: '',
      gender: 'male' as 'male' | 'female',
    }
  ]);

  const addChild = () => {
    setChildren([...children, {
      name: '',
      birthDate: '',
      gender: 'male' as 'male' | 'female',
    }]);
  };

  const removeChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const updateChild = (index: number, field: string, value: any) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    setIsSubmitting(true);

    try {
      // Firestore에 각 자녀를 Member로 생성
      for (const child of children) {
        await addDoc(collection(firestore, 'members'), {
          name: child.name,
          birthDate: child.birthDate,
          gender: child.gender,
          guardianIds: [user.uid], // 부모 UID 배열
          clubId: user.clubId,
          memberType: 'family',
          familyRole: 'child',
          status: 'active', // 이미 부모가 승인됨
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      
      alert(`${children.length}명의 자녀가 추가되었습니다!`);
      router.push('/my-profile/family');
    } catch (error) {
      console.error('자녀 추가 실패:', error);
      alert('자녀 추가에 실패했습니다. 다시 시도해주세요.');
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

  const isFormValid = children.every(child => child.name && child.birthDate);

  return (
    <main className="flex-1 p-6 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">자녀 추가</CardTitle>
              <CardDescription>
                자녀 정보를 입력하세요 (여러 명 동시 추가 가능)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 안내 메시지 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>안내:</strong><br />
                  • 자녀는 이메일 없이 추가됩니다<br />
                  • 각 자녀는 개별적으로 출석, 수업, 이용권이 관리됩니다<br />
                  • 부모님이 로그인하여 모든 자녀를 확인할 수 있습니다
                </div>
              </div>
            </div>

            {/* 자녀 목록 */}
            {children.map((child, index) => (
              <Card key={index} className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      자녀 {index + 1}
                    </CardTitle>
                    {children.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChild(index)}
                      >
                        삭제
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 이름 */}
                  <div className="space-y-2">
                    <Label htmlFor={`name-${index}`}>이름 *</Label>
                    <Input
                      id={`name-${index}`}
                      value={child.name}
                      onChange={(e) => updateChild(index, 'name', e.target.value)}
                      placeholder="홍길동"
                      required
                    />
                  </div>

                  {/* 생년월일 */}
                  <div className="space-y-2">
                    <Label htmlFor={`birthDate-${index}`}>생년월일 *</Label>
                    <Input
                      id={`birthDate-${index}`}
                      type="date"
                      value={child.birthDate}
                      onChange={(e) => updateChild(index, 'birthDate', e.target.value)}
                      required
                    />
                  </div>

                  {/* 성별 */}
                  <div className="space-y-2">
                    <Label>성별 *</Label>
                    <RadioGroup
                      value={child.gender}
                      onValueChange={(value: any) => updateChild(index, 'gender', value)}
                    >
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="male" id={`male-${index}`} />
                          <Label htmlFor={`male-${index}`} className="cursor-pointer">
                            남자
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="female" id={`female-${index}`} />
                          <Label htmlFor={`female-${index}`} className="cursor-pointer">
                            여자
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* 자녀 추가 버튼 */}
            <Button
              type="button"
              variant="outline"
              onClick={addChild}
              className="w-full"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              다른 자녀 추가
            </Button>

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
                disabled={isSubmitting || !isFormValid}
                className="flex-1"
              >
                {isSubmitting ? '추가 중...' : `${children.length}명 추가`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
