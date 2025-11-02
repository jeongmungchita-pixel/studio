'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
interface LogoutButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showIcon?: boolean;
  showText?: boolean;
  onSuccess?: () => void;
}
export function LogoutButton({
  className,
  variant = 'ghost',
  size = 'default',
  showIcon = true,
  showText = true,
  onSuccess,
}: LogoutButtonProps) {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const handleLogout = async () => {
    if (!auth) {
      toast({
        title: '로그아웃 실패',
        description: '인증 서비스를 사용할 수 없습니다.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoggingOut(true);
    try {
      // 로컬 스토리지 정리
      localStorage.clear();
      sessionStorage.clear();
      // Firebase 로그아웃
      await signOut(auth);
      // 성공 콜백 실행
      if (onSuccess) {
        onSuccess();
      }
      // 로그인 페이지로 리다이렉트
      router.push('/login');
      toast({
        title: '로그아웃 완료',
        description: '안전하게 로그아웃되었습니다.',
      });
    } catch (error: unknown) {
      toast({
        title: '로그아웃 실패',
        description: '로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
      // 에러가 발생해도 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/login');
      }, 1000);
    } finally {
      setIsLoggingOut(false);
    }
  };
  return (
    <Button
      onClick={handleLogout}
      disabled={isLoggingOut}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoggingOut ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {showText && <span className="ml-2">로그아웃 중...</span>}
        </>
      ) : (
        <>
          {showIcon && <LogOut className="h-4 w-4" />}
          {showText && <span className={showIcon ? 'ml-2' : ''}>로그아웃</span>}
        </>
      )}
    </Button>
  );
}
