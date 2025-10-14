'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, XCircle, Mail, Lock, User, Phone } from 'lucide-react';
import { FederationAdminInvite, UserRole } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const token = params.token as string;

  const [invite, setInvite] = useState<FederationAdminInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('signup');

  // 폼 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // 초대 정보 로드
  useEffect(() => {
    const loadInvite = async () => {
      if (!firestore || !token) return;

      try {
        const inviteDoc = await getDoc(doc(firestore, 'federationAdminInvites', token));
        
        if (!inviteDoc.exists()) {
          toast({
            variant: 'destructive',
            title: '초대를 찾을 수 없습니다',
            description: '유효하지 않은 초대 링크입니다.',
          });
          setLoading(false);
          return;
        }

        const inviteData = { id: inviteDoc.id, ...inviteDoc.data() } as FederationAdminInvite;

        // 상태 확인
        if (inviteData.status === 'accepted') {
          toast({
            variant: 'destructive',
            title: '이미 수락된 초대입니다',
            description: '이 초대는 이미 사용되었습니다.',
          });
          setLoading(false);
          return;
        }

        if (inviteData.status === 'expired') {
          toast({
            variant: 'destructive',
            title: '만료된 초대입니다',
            description: '초대 기간이 만료되었습니다. 새로운 초대를 요청하세요.',
          });
          setLoading(false);
          return;
        }

        // 만료 시간 확인
        const expiresAt = new Date(inviteData.expiresAt);
        if (expiresAt < new Date()) {
          await updateDoc(doc(firestore, 'federationAdminInvites', token), {
            status: 'expired',
          });
          toast({
            variant: 'destructive',
            title: '만료된 초대입니다',
            description: '초대 기간이 만료되었습니다.',
          });
          setLoading(false);
          return;
        }

        setInvite(inviteData);
        setEmail(inviteData.email);
        setDisplayName(inviteData.name);
        setPhoneNumber(inviteData.phoneNumber);
      } catch (error) {
        console.error('초대 로드 실패:', error);
        toast({
          variant: 'destructive',
          title: '오류 발생',
          description: '초대 정보를 불러오는 중 오류가 발생했습니다.',
        });
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [firestore, token, toast]);

  // 회원가입
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore || !invite) return;

    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: '비밀번호 불일치',
        description: '비밀번호가 일치하지 않습니다.',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: '비밀번호 오류',
        description: '비밀번호는 최소 6자 이상이어야 합니다.',
      });
      return;
    }

    setProcessing(true);

    try {
      // 1. Firebase Auth 계정 생성
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Firestore에 사용자 프로필 생성
      await setDoc(doc(firestore, 'users', user.uid), {
        id: user.uid,
        uid: user.uid,
        email: email,
        displayName: displayName,
        phoneNumber: phoneNumber,
        photoURL: user.photoURL || `https://picsum.photos/seed/${user.uid}/40/40`,
        provider: 'email',
        role: UserRole.FEDERATION_ADMIN,
        status: 'approved',
        createdAt: new Date().toISOString(),
        approvedBy: invite.invitedBy,
        approvedAt: new Date().toISOString(),
      });

      // 3. 초대 상태 업데이트
      await updateDoc(doc(firestore, 'federationAdminInvites', token), {
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      });

      toast({
        title: '환영합니다!',
        description: '연맹 관리자 계정이 생성되었습니다.',
      });

      // 대시보드로 이동
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (error: any) {
      console.error('회원가입 실패:', error);
      
      let errorMessage = '회원가입 중 오류가 발생했습니다.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = '이미 사용 중인 이메일입니다. 로그인을 시도하세요.';
        setMode('login');
      } else if (error.code === 'auth/weak-password') {
        errorMessage = '비밀번호가 너무 약합니다.';
      }

      toast({
        variant: 'destructive',
        title: '회원가입 실패',
        description: errorMessage,
      });
    } finally {
      setProcessing(false);
    }
  };

  // 로그인 (기존 계정)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore || !invite) return;

    setProcessing(true);

    try {
      // 1. 로그인
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. 사용자 프로필 업데이트 (연맹 관리자 권한 부여)
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        // 기존 사용자 프로필 업데이트
        await updateDoc(userDocRef, {
          role: UserRole.FEDERATION_ADMIN,
          status: 'approved',
          approvedBy: invite.invitedBy,
          approvedAt: new Date().toISOString(),
        });
      } else {
        // 프로필이 없으면 생성
        await setDoc(userDocRef, {
          id: user.uid,
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName || invite.name,
          phoneNumber: invite.phoneNumber,
          photoURL: user.photoURL || `https://picsum.photos/seed/${user.uid}/40/40`,
          provider: 'email',
          role: UserRole.FEDERATION_ADMIN,
          status: 'approved',
          approvedBy: invite.invitedBy,
          approvedAt: new Date().toISOString(),
        });
      }

      // 3. 초대 상태 업데이트
      await updateDoc(doc(firestore, 'federationAdminInvites', token), {
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      });

      toast({
        title: '환영합니다!',
        description: '연맹 관리자 권한이 부여되었습니다.',
      });

      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (error: any) {
      console.error('로그인 실패:', error);
      
      let errorMessage = '로그인 중 오류가 발생했습니다.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
      }

      toast({
        variant: 'destructive',
        title: '로그인 실패',
        description: errorMessage,
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle>유효하지 않은 초대</CardTitle>
            <CardDescription>
              초대 링크가 유효하지 않거나 만료되었습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle>연맹 관리자 초대</CardTitle>
          <CardDescription>
            {invite.invitedByName}님이 연맹 관리자로 초대하셨습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 초대 정보 */}
          <div className="rounded-lg bg-slate-50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">{invite.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">{invite.email}</span>
            </div>
            {invite.phoneNumber && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">{invite.phoneNumber}</span>
              </div>
            )}
          </div>

          {/* 탭 */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 pb-2 text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              회원가입
            </button>
            <button
              onClick={() => setMode('login')}
              className={`flex-1 pb-2 text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              로그인
            </button>
          </div>

          {/* 회원가입 폼 */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">이름 *</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="홍길동"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일 *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">전화번호</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="010-1234-5678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호 *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="최소 6자 이상"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인 *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호 재입력"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={processing}>
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    초대 수락 및 가입
                  </>
                )}
              </Button>
            </form>
          )}

          {/* 로그인 폼 */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">이메일 *</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">비밀번호 *</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={processing}>
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    초대 수락 및 로그인
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
