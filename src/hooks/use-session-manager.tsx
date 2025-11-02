'use client';
import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuth, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
interface SessionConfig {
  idleTimeout?: number; // 유휴 시간 제한 (밀리초)
  warningTime?: number; // 경고 표시 시간 (만료 전 몇 초)
  checkInterval?: number; // 체크 간격
  now?: () => number; // 테스트 용 시간 주입
}
const DEFAULT_CONFIG: SessionConfig = {
  idleTimeout: 30 * 60 * 1000, // 30분
  warningTime: 5 * 60 * 1000, // 5분 전 경고
  checkInterval: 60 * 1000, // 1분마다 체크
};
/**
 * 세션 관리를 위한 커스텀 훅
 * - 자동 로그아웃 (유휴 시간 초과)
 * - 토큰 만료 감지
 * - 세션 연장 기능
 */
export function useSessionManager(config: SessionConfig = {}) {
  const auth = useAuth();
  const { _user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSessionExpiring, setIsSessionExpiring] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const nowFn = useRef<() => number>(config.now ?? (() => Date.now()));
  const lastActivityRef = useRef<number>(nowFn.current());
  const warningShownRef = useRef<boolean>(false);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { 
    idleTimeout = DEFAULT_CONFIG.idleTimeout!,
    warningTime = DEFAULT_CONFIG.warningTime!,
    checkInterval = DEFAULT_CONFIG.checkInterval!
  } = config;
  /**
   * 활동 시간 업데이트
   */
  const updateActivity = useCallback(() => {
    lastActivityRef.current = nowFn.current();
    warningShownRef.current = false;
    setIsSessionExpiring(false);
    setTimeRemaining(null);
    // 카운트다운 타이머 정리
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);
  /**
   * 세션 종료 처리
   */
  const endSession = useCallback(async (reason: 'timeout' | 'token_expired' | 'user_logout' = 'timeout') => {
    // 타이머 정리
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    // 로그아웃 처리
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (error: unknown) {
    }
    // 로컬 스토리지 정리
    localStorage.removeItem('lastActivity');
    localStorage.removeItem('sessionWarningShown');
    // 사용자에게 알림
    let message = '세션이 종료되었습니다.';
    switch (reason) {
      case 'timeout':
        message = '유휴 시간 초과로 자동 로그아웃되었습니다.';
        break;
      case 'token_expired':
        message = '인증이 만료되어 다시 로그인이 필요합니다.';
        break;
      case 'user_logout':
        message = '로그아웃되었습니다.';
        break;
    }
    toast({
      title: '세션 종료',
      description: message,
      variant: 'default',
    });
    // 로그인 페이지로 이동
    router.push('/login');
  }, [auth, router, toast]);
  /**
   * 세션 연장
   */
  const extendSession = useCallback(() => {
    updateActivity();
    toast({
      title: '세션 연장',
      description: '세션이 연장되었습니다.',
      variant: 'default',
    });
  }, [updateActivity, toast]);
  /**
   * 세션 체크
   */
  const checkSession = useCallback(async () => {
    if (!_user) return;
    const now = nowFn.current();
    const timeSinceActivity = now - lastActivityRef.current;
    const timeUntilTimeout = idleTimeout - timeSinceActivity;
    // 세션 만료
    if (timeUntilTimeout <= 0) {
      await endSession('timeout');
      return;
    }
    // 경고 표시
    if (timeUntilTimeout <= warningTime && !warningShownRef.current) {
      warningShownRef.current = true;
      setIsSessionExpiring(true);
      // 카운트다운 시작
      const startTime = nowFn.current();
      countdownTimerRef.current = setInterval(() => {
        const elapsed = nowFn.current() - startTime;
        const remaining = Math.max(0, warningTime - elapsed);
        setTimeRemaining(Math.floor(remaining / 1000));
        if (remaining <= 0) {
          endSession('timeout');
        }
      }, 1000);
      toast({
        title: '세션 만료 경고',
        description: `${Math.floor(warningTime / 60000)}분 후 자동 로그아웃됩니다. 계속하려면 페이지를 사용하세요.`,
        variant: 'destructive',
        action: (
          <button
            onClick={extendSession}
            className="text-sm font-medium"
          >
            연장하기
          </button>
        ),
      });
    }
    // Firebase 토큰 체크
    try {
      if (auth?.currentUser) {
        const token = await auth.currentUser.getIdTokenResult();
        // 토큰 만료 시간 체크 (1시간)
        const expirationTime = new Date(token.expirationTime).getTime();
        const timeUntilExpiry = expirationTime - now;
        if (timeUntilExpiry < 5 * 60 * 1000) { // 5분 미만 남음
          // 토큰 리프레시 시도
          await auth.currentUser.getIdToken(true);
        }
      }
    } catch (error: unknown) {
      await endSession('token_expired');
    }
  }, [_user, idleTimeout, warningTime, endSession, extendSession, toast, auth]);
  /**
   * 이벤트 리스너 설정
   */
  useEffect(() => {
    if (!_user) return;
    // 사용자 활동 감지 이벤트
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];
    const handleActivity = () => {
      updateActivity();
    };
    // 이벤트 리스너 등록
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });
    // 세션 체크 타이머 시작
    sessionTimerRef.current = setInterval(checkSession, checkInterval);
    // 초기 체크
    checkSession();
    // 페이지 언로드 시 활동 시간 저장
    const handleBeforeUnload = () => {
      localStorage.setItem('lastActivity', String(lastActivityRef.current));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    // 페이지 로드 시 이전 활동 시간 복원
    const savedActivity = localStorage.getItem('lastActivity');
    if (savedActivity) {
      const savedTime = parseInt(savedActivity, 10);
      const timeSinceSaved = nowFn.current() - savedTime;
      // 30분 이내면 세션 유지
      if (timeSinceSaved < idleTimeout) {
        lastActivityRef.current = savedTime;
      }
    }
    // 다른 탭에서의 로그아웃 감지
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_logout' && e.newValue === 'true') {
        endSession('user_logout');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      // 이벤트 리스너 정리
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('storage', handleStorageChange);
      // 타이머 정리
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [_user, updateActivity, checkSession, checkInterval, idleTimeout, endSession]);
  /**
   * 수동 로그아웃
   */
  const logout = useCallback(async () => {
    // 다른 탭에 로그아웃 알림
    localStorage.setItem('auth_logout', 'true');
    setTimeout(() => localStorage.removeItem('auth_logout'), 100);
    await endSession('user_logout');
  }, [endSession]);
  return {
    isSessionExpiring,
    timeRemaining,
    extendSession,
    logout,
    updateActivity,
    __test: config.now ? { triggerCheck: checkSession } : undefined,
  };
}
/**
 * 세션 만료 경고 컴포넌트
 */
export function SessionExpiryWarning() {
  const { isSessionExpiring, timeRemaining, extendSession } = useSessionManager();
  if (!isSessionExpiring || timeRemaining === null) {
    return null;
  }
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-destructive text-destructive-foreground p-4 rounded-lg shadow-lg max-w-sm">
        <h3 className="font-semibold mb-2">세션 만료 경고</h3>
        <p className="text-sm mb-3">
          {minutes > 0 
            ? `${minutes}분 ${seconds}초 후 자동 로그아웃됩니다.`
            : `${seconds}초 후 자동 로그아웃됩니다.`}
        </p>
        <button
          onClick={extendSession}
          className="w-full bg-background text-foreground px-3 py-2 rounded text-sm font-medium hover:bg-opacity-90"
        >
          세션 연장하기
        </button>
      </div>
    </div>
  );
}
