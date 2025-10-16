'use client';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Building2, MapPin, Phone, Mail, Loader2, Shield, Lock } from 'lucide-react';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import type { ClubOwnerRequest, UserProfile } from '@/types';
import { UserRole } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function ClubOwnerRegisterPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // 개인 정보
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
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
    
    if (!firestore || !auth) {
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '잠시 후 다시 시도해주세요.',
      });
      return;
    }

    // 비밀번호 확인
    if (formData.password !== formData.passwordConfirm) {
      toast({
        variant: 'destructive',
        title: '비밀번호 불일치',
        description: '비밀번호가 일치하지 않습니다.',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        variant: 'destructive',
        title: '비밀번호 오류',
        description: '비밀번호는 최소 6자 이상이어야 합니다.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('📤 클럽 오너 가입 시작...');

      // 1. Firebase Auth 계정 생성
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const newUser = userCredential.user;
      console.log('✅ Auth 계정 생성 완료:', newUser.uid);

      // 2. users 프로필 생성 (status: pending)
      const userProfile: UserProfile = {
        id: newUser.uid,
        uid: newUser.uid,
        email: formData.email,
        displayName: formData.name,
        phoneNumber: formData.phoneNumber,
        photoURL: `https://picsum.photos/seed/${newUser.uid}/40/40`,
        role: UserRole.CLUB_OWNER,
        clubName: formData.clubName,
        provider: 'email',
        status: 'pending', // 승인 대기
      };
      await setDoc(doc(firestore, 'users', newUser.uid), userProfile);
      console.log('✅ users 프로필 생성 완료 (status: pending)');

      // 3. clubOwnerRequests 생성 (참고용)
      const requestData: Omit<ClubOwnerRequest, 'id'> = {
        userId: newUser.uid,
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
      await addDoc(collection(firestore, 'clubOwnerRequests'), requestData);
      console.log('✅ clubOwnerRequests 생성 완료');
      
      toast({
        title: '가입 완료!',
        description: '계정이 생성되었습니다. 슈퍼 관리자의 승인을 기다려주세요.',
      });
      
      // 승인 대기 페이지로 이동
      router.push('/pending-approval');
    } catch (error: any) {
      console.error('❌ 가입 실패:', error);
      
      let errorMessage = '가입에 실패했습니다. 다시 시도해주세요.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = '이미 사용 중인 이메일입니다.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = '비밀번호가 너무 약합니다.';
      }
      
      toast({
        variant: 'destructive',
        title: '가입 실패',
        description: errorMessage,
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

              <div className="space-y-2">
                <Label htmlFor="password">
                  <Lock className="h-4 w-4 inline mr-2" />
                  비밀번호 *
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="최소 6자 이상"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">비밀번호 확인 *</Label>
                <Input
                  id="passwordConfirm"
                  type="password"
                  value={formData.passwordConfirm}
                  onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                  placeholder="비밀번호 재입력"
                  required
                  minLength={6}
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>안내:</strong> 가입 즉시 계정이 생성되며, 슈퍼 관리자의 승인 후 모든 기능을 이용할 수 있습니다.
                승인 전에는 "승인 대기중" 페이지가 표시됩니다.
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
                  !formData.password ||
                  !formData.passwordConfirm ||
                  !formData.clubName || 
                  !formData.clubAddress
                }
                className="flex-1"
              >
                {isSubmitting ? '가입 중...' : '가입하기'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
