'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, Mail, UserCheck } from 'lucide-react';
import { Invitation, UserRole } from '@/types';
import { useToast } from '@/hooks/use-toast';
export default function FederationAdminSignupPage() {
  const params = useParams();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { _user, isUserLoading } = useUser();
  const { toast } = useToast();
  const token = params.token as string;
  const [invite, setInvite] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  // 폼 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // 이미 로그인된 사용자 처리
  useEffect(() => {
    if (isUserLoading || !invite || !_user) return;
    
    // 초대된 이메일과 현재 로그인된 이메일이 다른 경우
    if (_user.email !== invite.email) {
      toast({
        variant: 'destructive',
        title: '이메일 불일치',
        description: '초대된 이메일과 현재 로그인된 이메일이 다릅니다.',
      });
      // 로그아웃 후 다시 시도
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return;
    }

    // 이미 연맹 관리자 권한이 있는 경우
    if (_user.role === UserRole.FEDERATION_ADMIN) {
      toast({
        title: '이미 연맹 관리자입니다',
        description: '현재 계정은 이미 연맹 관리자 권한을 가지고 있습니다.',
      });
      setTimeout(() => {
        window.location.href = '/admin';
      }, 1500);
      return;
    }

    // 자동으로 권한 부여 처리
    handleAutoGrantPermission();
  }, [_user, isUserLoading, invite, toast]);

  // 자동 권한 부여
  const handleAutoGrantPermission = async () => {
    if (!_user || !firestore || !invite) return;
    
    setProcessing(true);
    try {
      // 사용자 프로필 업데이트 (연맹 관리자 권한 부여)
      const userDocRef = doc(firestore, 'users', _user.uid);
      await updateDoc(userDocRef, {
        role: UserRole.FEDERATION_ADMIN,
        status: 'active',
      });

      // 초대 상태 업데이트
      await updateDoc(doc(firestore, 'federationAdminInvites', token), {
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      });

      toast({
        title: '환영합니다!',
        description: '연맹 관리자 권한이 부여되었습니다.',
      });

      setTimeout(() => {
        window.location.href = '/admin';
      }, 1500);
    } catch (error: unknown) {
      console.error('자동 권한 부여 오류:', error);
      toast({
        variant: 'destructive',
        title: '권한 부여 실패',
        description: '연맹 관리자 권한 부여 중 오류가 발생했습니다.',
      });
    } finally {
      setProcessing(false);
    }
  };
  // 초대 정보 로드
  useEffect(() => {
    const loadInvite = async () => {
      if (!firestore || !token) return;
      try {
        const inviteDoc = await getDoc(doc(firestore, 'federationAdminInvites', token));
        if (!inviteDoc?.exists()) {
          toast({
            variant: 'destructive',
            title: '초대를 찾을 수 없습니다',
            description: '유효하지 않은 초대 링크입니다.',
          });
          // 메인 페이지로 리다이렉트
          router.push('/');
          return;
        }
        const inviteData = { id: inviteDoc.id, ...inviteDoc?.data() } as Invitation;
        // 상태 확인
        if (inviteData.status === 'accepted') {
          toast({
            variant: 'destructive',
            title: '이미 수락된 초대입니다',
            description: '이 초대는 이미 사용되었습니다.',
          });
          // 메인 페이지로 리다이렉트
          router.push('/');
          return;
        }
        if (inviteData.status === 'expired') {
          toast({
            variant: 'destructive',
            title: '만료된 초대입니다',
            description: '초대 기간이 만료되었습니다.',
          });
          // 메인 페이지로 리다이렉트
          router.push('/');
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
          // 메인 페이지로 리다이렉트
          router.push('/');
          return;
        }
        setInvite(inviteData);
        setEmail(inviteData.email);
        setDisplayName(inviteData.email.split('@')[0]);
        setPhoneNumber('');
      } catch (error: unknown) {
        console.error('초대 정보 로드 오류:', error);
        toast({
          variant: 'destructive',
          title: '오류 발생',
          description: '초대 정보를 불러오는 중 오류가 발생했습니다.',
        });
        // 로그인 페이지 대신 초대 페이지로 리다이렉트
        router.push(`/invite/${token}`);
      } finally {
        setLoading(false);
      }
    };
    loadInvite();
  }, [firestore, token, toast, router]);
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
      const _user = userCredential.user;
      // 2. Firestore에 사용자 프로필 생성
      await setDoc(doc(firestore, 'users', _user.uid), {
        id: _user.uid,
        uid: _user.uid,
        email: email,
        displayName: displayName,
        phoneNumber: phoneNumber,
        photoURL: _user.photoURL || `https://picsum.photos/seed/${_user.uid}/40/40`,
        provider: 'email',
        role: UserRole.FEDERATION_ADMIN,
        status: 'active',
        createdAt: new Date().toISOString(),
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
      // 대시보드로 이동 (완전한 페이지 새로고침)
      setTimeout(() => {
        window.location.href = '/admin';
      }, 1500);
    } catch (error: unknown) {
      let errorMessage = '회원가입 중 오류가 발생했습니다.';
      const code = typeof error === 'object' && error && 'code' in error ? (error as any).code : undefined;
      if (code === 'auth/email-already-in-use') {
        errorMessage = '이미 사용 중인 이메일입니다. 로그인을 시도하세요.';
        setMode('login');
      } else if (code === 'auth/weak-password') {
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
      const _user = userCredential.user;
      // 2. 사용자 프로필 업데이트 (연맹 관리자 권한 부여)
      const userDocRef = doc(firestore, 'users', _user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc?.exists()) {
        // 기존 사용자 프로필 업데이트
        await updateDoc(userDocRef, {
          role: UserRole.FEDERATION_ADMIN,
          status: 'active',
        });
      } else {
        // 프로필이 없으면 생성
        await setDoc(userDocRef, {
          id: _user.uid,
          uid: _user.uid,
          email: _user.email!,
          displayName: _user.displayName || invite.email.split('@')[0],
          phoneNumber: '',
          photoURL: _user.photoURL || `https://picsum.photos/seed/${_user.uid}/40/40`,
          provider: 'email',
          role: UserRole.FEDERATION_ADMIN,
          status: 'active',
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
        // 완전한 페이지 새로고침으로 리다이렉트
        window.location.href = '/admin';
      }, 1500);
    } catch (error: unknown) {
      let errorMessage = '로그인 중 오류가 발생했습니다.';
      const code = typeof error === 'object' && error && 'code' in error ? (error as any).code : undefined;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
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
    return null; // 이미 리다이렉트됨
  }

  // 이미 로그인된 사용자 처리 중인 경우
  if (processing && _user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <UserCheck className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">권한 부여 중</CardTitle>
            <CardDescription>
              연맹 관리자 권한을 부여하고 있습니다...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          <CardTitle className="text-2xl">연맹 관리자 가입</CardTitle>
          <CardDescription>
            {invite.invitedByName}님의 초대로 연맹 관리자 계정을 생성합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 초대 정보 */}
          <div className="rounded-lg bg-slate-50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">{invite.email}</span>
            </div>
          </div>
          
          {/* 이미 로그인된 사용자 안내 */}
          {_user && _user.email === invite.email && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <h4 className="text-sm font-semibold text-green-900 mb-2">
                현재 로그인된 계정
              </h4>
              <p className="text-sm text-green-800">
                {_user.displayName || _user.email}님으로 로그인되어 있습니다.
                연맹 관리자 권한을 자동으로 부여합니다.
              </p>
            </div>
          )}
          
          {/* 탭 - 로그인된 사용자가 있으면 탭 숨김 */}
          {!_user && (
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
          )}
          
          {/* 회원가입/로그인 폼 - 로그인된 사용자가 없을 때만 표시 */}
          {!_user && (
            <>
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
                    연맹 관리자로 가입
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
                  disabled
                />
                <p className="text-xs text-slate-500">
                  초대된 이메일로만 로그인할 수 있습니다
                </p>
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
                    로그인 및 권한 부여
                  </>
                )}
              </Button>
            </form>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
