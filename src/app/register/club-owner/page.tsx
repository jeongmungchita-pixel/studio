'use client';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Building2, MapPin, Phone, Mail, Loader2, Shield } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import type { ClubOwnerRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function ClubOwnerRegisterPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // 개인 정보
    name: '',
    email: '',
    phoneNumber: '',
    
    // 클럽 정보
    clubName: '',
    clubAddress: '',
    clubPhone: '',
    clubEmail: '',
    clubDescription: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '잠시 후 다시 시도해주세요.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // ClubOwnerRequest 생성 (비회원도 가능)
      const requestData: Omit<ClubOwnerRequest, 'id'> = {
        userId: user?.uid || '', // 로그인 안 했으면 빈 문자열
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        clubName: formData.clubName,
        clubAddress: formData.clubAddress,
        clubPhone: formData.clubPhone,
        clubEmail: formData.clubEmail || undefined,
        clubDescription: formData.clubDescription || undefined,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };

      console.log('📤 가입 신청 데이터:', requestData);

      // Firestore에 저장
      const docRef = await addDoc(collection(firestore, 'clubOwnerRequests'), requestData);
      console.log('✅ 가입 신청 성공! Doc ID:', docRef.id);
      
      toast({
        title: '신청 완료',
        description: '가입 신청이 완료되었습니다! 슈퍼 어드민의 승인을 기다려주세요.',
      });
      router.push('/dashboard');
    } catch (error) {
      console.error('❌ 가입 신청 실패:', error);
      console.error('에러 상세:', error instanceof Error ? error.message : error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '가입 신청에 실패했습니다. 다시 시도해주세요.',
      });
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
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">클럽 오너 가입 신청</CardTitle>
              <CardDescription>
                클럽 정보와 담당자 정보를 입력하세요
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 개인 정보 섹션 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5" />
                담당자 정보
              </h3>

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

              <div className="space-y-2">
                <Label htmlFor="email">이메일 *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="owner@example.com"
                  required
                />
              </div>

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
            </div>

            <div className="border-t pt-6" />

            {/* 클럽 정보 섹션 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                클럽 정보
              </h3>

              <div className="space-y-2">
                <Label htmlFor="clubName">클럽 이름 *</Label>
                <Input
                  id="clubName"
                  value={formData.clubName}
                  onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                  placeholder="서울체조클럽"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clubAddress">클럽 주소 *</Label>
                <Input
                  id="clubAddress"
                  value={formData.clubAddress}
                  onChange={(e) => setFormData({ ...formData, clubAddress: e.target.value })}
                  placeholder="서울시 강남구..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clubPhone">클럽 전화번호 *</Label>
                <Input
                  id="clubPhone"
                  type="tel"
                  value={formData.clubPhone}
                  onChange={(e) => setFormData({ ...formData, clubPhone: e.target.value })}
                  placeholder="02-1234-5678"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clubEmail">클럽 이메일</Label>
                <Input
                  id="clubEmail"
                  type="email"
                  value={formData.clubEmail}
                  onChange={(e) => setFormData({ ...formData, clubEmail: e.target.value })}
                  placeholder="info@club.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clubDescription">클럽 소개</Label>
                <Textarea
                  id="clubDescription"
                  value={formData.clubDescription}
                  onChange={(e) => setFormData({ ...formData, clubDescription: e.target.value })}
                  placeholder="클럽에 대한 간단한 소개를 입력하세요..."
                  rows={4}
                />
              </div>
            </div>

            {/* 안내 메시지 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>안내:</strong> 클럽 오너 가입 신청 후 슈퍼 어드민의 승인이 필요합니다. 
                승인 절차는 1-2일 정도 소요될 수 있으며, 승인 결과는 이메일로 알려드립니다.
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
                  !formData.clubName || 
                  !formData.clubAddress
                }
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
