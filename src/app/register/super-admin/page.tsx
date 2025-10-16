'use client';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertTriangle } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import type { SuperAdminRequest } from '@/types';

export default function SuperAdminRegisterPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    organization: '', // 소속 기관
    position: '', // 직책
    reason: '', // 신청 사유
    secretCode: '', // 비밀 코드 (보안용)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firestore) {
      alert('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      // SuperAdminRequest 생성 (비회원도 가능, 단 보안 코드 필요)
      const requestData: Omit<SuperAdminRequest, 'id'> = {
        userId: user?.uid || '', // 로그인 안 했으면 빈 문자열
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        organization: formData.organization,
        position: formData.position,
        reason: formData.reason,
        secretCode: formData.secretCode,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };

      console.log('📤 슬퍼 관리자 신청 데이터:', requestData);

      // Firestore에 저장
      const docRef = await addDoc(collection(firestore, 'superAdminRequests'), requestData);
      console.log('✅ 슬퍼 관리자 신청 성공! Doc ID:', docRef.id);
      
      alert('최고관리자 신청이 완료되었습니다. 시스템 관리자의 검토 후 승인됩니다.');
      router.push('/dashboard');
    } catch (error) {
      console.error('❌ 슬퍼 관리자 신청 실패:', error);
      console.error('에러 상세:', error instanceof Error ? error.message : error);
      alert('신청에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 p-6 flex items-center justify-center">
      <Card className="w-full max-w-2xl border-red-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-2xl text-red-600">최고 관리자 신청</CardTitle>
              <CardDescription>
                시스템 최고 권한 - 신중한 검토가 필요합니다
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 경고 메시지 */}
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <strong>중요 안내:</strong><br />
                  • 최고 관리자는 시스템의 모든 권한을 가집니다<br />
                  • 신청 후 시스템 관리자의 직접 승인이 필요합니다<br />
                  • 허위 신청 시 법적 책임이 따를 수 있습니다<br />
                  • 승인까지 1-3일 소요될 수 있습니다
                </div>
              </div>
            </div>

            {/* 개인 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5" />
                신청자 정보
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
                  placeholder="admin@example.com"
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

            {/* 소속 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">소속 및 직책</h3>

              <div className="space-y-2">
                <Label htmlFor="organization">소속 기관 *</Label>
                <Input
                  id="organization"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  placeholder="대한체조협회"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">직책 *</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="사무총장"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">신청 사유 *</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="최고 관리자 권한이 필요한 구체적인 사유를 입력하세요..."
                  rows={4}
                  required
                />
              </div>
            </div>

            <div className="border-t pt-6" />

            {/* 보안 코드 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-red-600">보안 인증</h3>

              <div className="space-y-2">
                <Label htmlFor="secretCode">비밀 코드 *</Label>
                <Input
                  id="secretCode"
                  type="password"
                  value={formData.secretCode}
                  onChange={(e) => setFormData({ ...formData, secretCode: e.target.value })}
                  placeholder="시스템 관리자로부터 받은 코드"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  시스템 관리자로부터 사전에 받은 비밀 코드를 입력하세요
                </p>
              </div>
            </div>

            {/* 동의 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <strong>개인정보 수집 및 이용 동의</strong><br />
                신청자의 정보는 최고 관리자 승인 검토 목적으로만 사용되며,
                승인 후 안전하게 보관됩니다.
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
                  !formData.phoneNumber ||
                  !formData.organization ||
                  !formData.position ||
                  !formData.reason ||
                  !formData.secretCode
                }
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isSubmitting ? '신청 중...' : '최고 관리자 신청'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
