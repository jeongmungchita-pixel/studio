'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';

export default function InitialAdminSetupPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  });

  // 데이터베이스가 비어있는지 확인
  useEffect(() => {
    const checkDatabase = async () => {
      if (!firestore) return;

      try {
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          // 데이터베이스가 비어있음 - 설정 가능
          setIsAllowed(true);
        } else {
          // 이미 사용자가 있음 - 차단
          setIsAllowed(false);
        }
      } catch (error) {
        console.error('데이터베이스 확인 실패:', error);
        setIsAllowed(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkDatabase();
  }, [firestore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 비밀번호 확인
    if (formData.password !== formData.confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (formData.password.length < 6) {
      alert('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('최초 관리자 생성:', formData);
      
      // TODO: Firebase Authentication + Firestore
      // 1. createUserWithEmailAndPassword
      // 2. Firestore에 UserProfile 생성 (role: SUPER_ADMIN)
      
      alert('최초 관리자가 생성되었습니다! 로그인해주세요.');
      router.push('/login');
    } catch (error) {
      console.error('관리자 생성 실패:', error);
      alert('관리자 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 로딩 중
  if (isChecking) {
    return (
      <main className="flex-1 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">데이터베이스 확인 중...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  // 이미 관리자가 있음
  if (!isAllowed) {
    return (
      <main className="flex-1 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">접근 불가</h3>
            <p className="text-muted-foreground text-center mb-4">
              이미 관리자가 설정되어 있습니다.<br />
              이 페이지는 최초 설정 시에만 사용 가능합니다.
            </p>
            <Button onClick={() => router.push('/login')}>
              로그인 페이지로
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // 최초 설정 가능
  return (
    <main className="flex-1 p-6 flex items-center justify-center">
      <Card className="w-full max-w-2xl border-green-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-2xl text-green-600">최초 관리자 설정</CardTitle>
              <CardDescription>
                시스템의 첫 번째 최고 관리자를 생성합니다
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 안내 메시지 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                  <strong>데이터베이스가 비어있습니다!</strong><br />
                  최초 관리자를 생성할 수 있습니다. 이 계정은 시스템의 모든 권한을 가지게 됩니다.
                </div>
              </div>
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
              <Label htmlFor="email">이메일 * (로그인 ID)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@example.com"
                required
              />
            </div>

            {/* 비밀번호 */}
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호 * (6자 이상)</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••"
                required
                minLength={6}
              />
            </div>

            {/* 비밀번호 확인 */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인 *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••"
                required
                minLength={6}
              />
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

            {/* 권한 안내 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>최고 관리자 권한:</strong><br />
                • 모든 데이터 접근 및 수정<br />
                • 연맹 관리자, 클럽 오너 승인<br />
                • 시스템 설정 변경<br />
                • 모든 사용자 관리
              </p>
            </div>

            {/* 제출 버튼 */}
            <Button
              type="submit"
              disabled={
                isSubmitting || 
                !formData.name || 
                !formData.email || 
                !formData.password ||
                !formData.confirmPassword
              }
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  최고 관리자 생성
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
