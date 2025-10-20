'use client';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query, limit, doc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { UserRole } from '@/types';

export default function InitialAdminSetupPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: 'wo1109ok@me.com', // 기본 이메일
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

    if (!firestore) {
      alert('Firebase 초기화 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Firebase Authentication으로 계정 생성
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      const user = userCredential.user;
      
      // 2. Firestore에 UserProfile 생성 (SUPER_ADMIN)
      const userRef = doc(firestore, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: formData.email,
        displayName: formData.name,
        photoURL: '',
        role: UserRole.SUPER_ADMIN,
        provider: 'email',
        status: 'approved', // 최초 관리자는 자동 승인
        phoneNumber: formData.phoneNumber || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      alert(`최초 관리자가 생성되었습니다!\n이메일: ${formData.email}\n\n로그인해주세요.`);
      router.push('/login');
    } catch (error: unknown) {
      
      let errorMessage = '관리자 생성에 실패했습니다.';
      const e = error as any;
      if (e?.code === 'auth/email-already-in-use') {
        errorMessage = '이미 사용 중인 이메일입니다.';
      } else if (e?.code === 'auth/invalid-email') {
        errorMessage = '유효하지 않은 이메일 형식입니다.';
      } else if (e?.code === 'auth/weak-password') {
        errorMessage = '비밀번호가 너무 약합니다. (최소 6자)';
      }
      
      alert(errorMessage);
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
    <main className="flex min-h-screen items-center justify-center bg-white p-4">
      {/* Windsurf 스타일 배경 그리드 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      <Card className="w-full max-w-2xl border border-slate-200 shadow-sm relative bg-white">
        <CardHeader className="space-y-6 pt-12 pb-8">
          <div className="flex flex-col items-center gap-6">
            <div className="p-3 bg-slate-900 rounded-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl font-semibold text-slate-900">최초 관리자 설정</CardTitle>
              <CardDescription className="text-sm text-slate-600 mt-2">
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
