'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { UserRole, CommitteeType } from '@/types';
import { Committee } from '@/types';
const committeeTypeLabels: Record<CommitteeType, string> = {
  COMPETITION: '대회',
  EDUCATION: '교육',
  MARKETING: '마케팅',
};
export default function NewCommitteePage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { _user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'COMPETITION' as CommitteeType,
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !_user) return;
    setIsSubmitting(true);
    try {
      const committeeRef = doc(collection(firestore, 'committees'));
      const committeeData: Committee = {
        id: committeeRef.id,
        name: formData.name,
        description: formData.description,
        type: formData.type,
        chairId: _user.uid,
        chairName: _user.displayName || _user.email || '관리자',
        memberIds: [_user.uid],
        memberCount: 1,
        status: 'active',
        establishedDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(committeeRef, committeeData);
      toast({
        title: '위원회 생성 완료',
        description: `${formData.name} 위원회가 생성되었습니다.`,
      });
      router.push('/committees');
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: '생성 실패',
        description: '위원회 생성 중 오류가 발생했습니다.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  if (!_user || _user.role !== UserRole.FEDERATION_ADMIN) {
    router.push('/dashboard');
    return null;
  }
  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/committees')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">새 위원회 만들기</h1>
          <p className="text-muted-foreground mt-1">
            대회, 교육, 마케팅 위원회를 생성하세요
          </p>
        </div>
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>위원회 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">위원회 이름 *</Label>
              <Input
                id="name"
                placeholder="예: 2025 전국대회 운영위원회"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">위원회 유형 *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: CommitteeType) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(committeeTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label} 위원회
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {formData.type === 'COMPETITION' && '체조 대회 기획, 운영 및 심사'}
                {formData.type === 'EDUCATION' && '코치 교육 및 선수 육성 프로그램'}
                {formData.type === 'MARKETING' && '홍보, 스폰서십, 미디어 관리'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명 *</Label>
              <Textarea
                id="description"
                placeholder="위원회의 목적과 활동 내용을 입력하세요"
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/committees')}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  '위원회 생성'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
