'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useUser, useFirebase } from '@/firebase';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { canAccessRoute, getDefaultRoute } from '@/utils/route-guard';
import { UserRole, UserProfile } from '@/types';
interface PermissionChange {
  type: 'role_changed' | 'status_changed' | 'access_granted' | 'access_revoked';
  from?: string;
  to?: string;
  timestamp: Date;
}
/**
 * 실시간 권한 모니터링 Hook
 * - Firestore 실시간 리스너로 권한 변경 감지
 * - 자동 페이지 리다이렉트
 * - 권한 변경 알림
 */
export function useRealtimePermissions() {
  const { _user: currentUser, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<UserProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastChange, setLastChange] = useState<PermissionChange | null>(null);
  // Cleanup을 위한 ref
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const toastIdRef = useRef<string | null>(null);
  /**
   * 권한 변경 처리
   */
  const handlePermissionChange = useCallback((
    oldData: UserProfile | null,
    newData: UserProfile
  ) => {
    // 역할 변경 감지
    if (oldData && oldData.role !== newData.role) {
      setLastChange({
        type: 'role_changed',
        from: oldData.role,
        to: newData.role,
        timestamp: new Date(),
      });
      // 토스트 알림
      const toastId = Math.random().toString();
      toastIdRef.current = toastId;
      toast({
        title: '권한 변경됨',
        description: `역할이 ${oldData.role}에서 ${newData.role}로 변경되었습니다.`,
        variant: 'default',
      });
      // 현재 페이지 접근 권한 확인
      if (pathname && !canAccessRoute(pathname, newData.role as UserRole, newData.status)) {
        const newRoute = getDefaultRoute(newData.role as UserRole, newData.status);
        toast({
          title: '페이지 이동',
          description: '권한 변경으로 인해 페이지를 이동합니다.',
          variant: 'default',
        });
        setTimeout(() => {
          router.push(newRoute);
        }, 2000);
      }
    }
    // 상태 변경 감지 (pending -> active)
    if (oldData && oldData.status !== newData.status) {
      setLastChange({
        type: 'status_changed',
        from: oldData.status,
        to: newData.status,
        timestamp: new Date(),
      });
      if (newData.status === 'active' && oldData.status === 'pending') {
        toast({
          title: '🎉 계정 승인 완료!',
          description: '이제 모든 기능을 사용할 수 있습니다.',
          variant: 'default',
        });
        // 대시보드로 이동
        const dashboardRoute = getDefaultRoute(newData.role as UserRole, 'active');
        setTimeout(() => {
          router.push(dashboardRoute);
        }, 2000);
      }
    }
    setPermissions(newData);
  }, [pathname, router, toast]);
  /**
   * Firestore 실시간 리스너 설정
   */
  useEffect(() => {
    if (!firestore || !currentUser || isUserLoading) {
      return;
    }
    setIsUpdating(true);
    // 이전 리스너 정리
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    // 새 리스너 설정
    const userRef = doc(firestore, 'users', currentUser.uid);
    unsubscribeRef.current = onSnapshot(
      userRef,
      {
        // 캐시와 서버 모두에서 업데이트 받기
        includeMetadataChanges: false,
      },
      (snapshot) => {
        if (snapshot.exists()) {
          const newData = snapshot.data() as UserProfile;
          // 메타데이터 확인 (캐시인지 서버인지)
          const isFromCache = snapshot.metadata.fromCache;
          if (!isFromCache) {
            // 서버에서 온 실제 변경사항만 처리
            handlePermissionChange(permissions, newData);
          }
        }
        setIsUpdating(false);
      },
      (error) => {
        toast({
          title: '권한 모니터링 오류',
          description: '권한 변경을 감지할 수 없습니다.',
          variant: 'destructive',
        });
        setIsUpdating(false);
      }
    );
    // Cleanup 함수
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [firestore, currentUser, isUserLoading, handlePermissionChange, permissions, toast]);
  /**
   * 수동 권한 새로고침
   */
  const refreshPermissions = useCallback(async () => {
    if (!firestore || !currentUser) return;
    setIsUpdating(true);
    try {
      const userRef = doc(firestore, 'users', currentUser.uid);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfile;
        setPermissions(data);
        toast({
          title: '권한 새로고침',
          description: '권한 정보가 업데이트되었습니다.',
          variant: 'default',
        });
      }
    } catch (error: unknown) {
      toast({
        title: '새로고침 실패',
        description: '권한 정보를 가져올 수 없습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  }, [firestore, currentUser, toast]);
  /**
   * 특정 권한 확인
   */
  const hasPermission = useCallback((permission: string): boolean => {
    if (!permissions) return false;
    // 슈퍼 관리자는 모든 권한
    if (permissions.role === UserRole.SUPER_ADMIN) return true;
    // 권한별 체크 로직
    switch (permission) {
      case 'admin':
        return [UserRole.SUPER_ADMIN, UserRole.FEDERATION_ADMIN].includes(permissions.role as UserRole);
      case 'club_manage':
        return [UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER].includes(permissions.role as UserRole);
      case 'coach':
        return [UserRole.HEAD_COACH, UserRole.ASSISTANT_COACH].includes(permissions.role as UserRole);
      default:
        return false;
    }
  }, [permissions]);
  /**
   * 권한 변경 이력
   */
  const [changeHistory, setChangeHistory] = useState<PermissionChange[]>([]);
  useEffect(() => {
    if (lastChange) {
      setChangeHistory(prev => [...prev, lastChange].slice(-5)); // 최근 5개만 유지
    }
  }, [lastChange]);
  return {
    permissions: permissions || currentUser,
    isUpdating,
    lastChange,
    changeHistory,
    refreshPermissions,
    hasPermission,
  };
}
/**
 * 권한 변경 모니터 컴포넌트
 */
export function PermissionMonitor({ children }: { children: React.ReactNode }) {
  const { permissions, isUpdating, lastChange } = useRealtimePermissions();
  return (
    <>
      {children}
      {/* 개발 환경에서만 권한 모니터 표시 */}
      {process.env.NODE_ENV === 'development' && lastChange && (
        <div className="fixed bottom-20 right-4 z-40">
          <div className="bg-blue-500 text-white p-3 rounded-lg shadow-lg text-xs max-w-xs">
            <p className="font-semibold">권한 변경 감지</p>
            <p className="mt-1">
              {lastChange.type}: {lastChange.from} → {lastChange.to}
            </p>
            <p className="text-xs opacity-75 mt-1">
              {lastChange.timestamp.toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}
      {/* 업데이트 중 인디케이터 */}
      {isUpdating && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg shadow-md text-sm flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-yellow-800 border-t-transparent rounded-full" />
            권한 정보 업데이트 중...
          </div>
        </div>
      )}
    </>
  );
}
// getDoc import 추가
import { getDoc } from 'firebase/firestore';
