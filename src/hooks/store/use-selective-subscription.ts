'use client';
import { useEffect, useRef, useMemo } from 'react';
import { useUserStore } from '@/stores/user-store';
import { useClubStore } from '@/stores/club-store';
import { useUIStore } from '@/stores/ui-store'; // Replaced app-store with ui-store
/**
 * 선택적 구독 패턴 Hook
 * 필요한 상태만 구독하여 불필요한 리렌더링을 방지합니다.
 */
// 사용자 상태 선택적 구독
export function useSelectiveUserSubscription<T>(
  selector: (state: ReturnType<typeof useUserStore.getState>) => T,
  equalityFn?: (a: T, b: T) => boolean
) {
  const selectedState = useUserStore(selector);
  const renderCountRef = useRef(0);
  useEffect(() => {
    renderCountRef.current += 1;
  });
  return useMemo(() => ({
    ...selectedState,
    _renderCount: renderCountRef.current,
  }), [selectedState]);
}
// 클럽 상태 선택적 구독
export function useSelectiveClubSubscription<T>(
  selector: (state: ReturnType<typeof useClubStore.getState>) => T,
  equalityFn?: (a: T, b: T) => boolean
) {
  const selectedState = useClubStore(selector);
  const renderCountRef = useRef(0);
  useEffect(() => {
    renderCountRef.current += 1;
  });
  return useMemo(() => ({
    ...selectedState,
    _renderCount: renderCountRef.current,
  }), [selectedState]);
}
// 앱 상태 선택적 구독
export function useSelectiveUISubscription<T>(
  selector: (state: ReturnType<typeof useUIStore.getState>) => T,
  equalityFn?: (a: T, b: T) => boolean
) {
  const selectedState = useUIStore(selector);
  const renderCountRef = useRef(0);
  useEffect(() => {
    renderCountRef.current += 1;
  });
  return useMemo(() => ({
    ...selectedState,
    _renderCount: renderCountRef.current,
  }), [selectedState]);
}
/**
 * 깊은 비교 함수들
 */
export const equalityFunctions = {
  // 얕은 비교 (기본값)
  shallow: <T>(a: T, b: T): boolean => {
    if (Object.is(a, b)) return true;
    if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
      return false;
    }
    const keysA = Object.keys(a as any);
    const keysB = Object.keys(b as any);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key) || 
          !Object.is((a as any)[key], (b as any)[key])) {
        return false;
      }
    }
    return true;
  },
  // 깊은 비교
  deep: <T>(a: T, b: T): boolean => {
    if (Object.is(a, b)) return true;
    if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
      return false;
    }
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => equalityFunctions.deep(item, b[index]));
    }
    const keysA = Object.keys(a as any);
    const keysB = Object.keys(b as any);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key) || 
          !equalityFunctions.deep((a as any)[key], (b as any)[key])) {
        return false;
      }
    }
    return true;
  },
  // 특정 필드만 비교
  byFields: <T extends Record<string, unknown>>(fields: (keyof T)[]) => 
    (a: T, b: T): boolean => {
      return fields.every(field => Object.is(a[field], b[field]));
    },
};
/**
 * 성능 최적화된 선택자들
 */
export const optimizedSelectors = {
  // 사용자 기본 정보만 (자주 변경되지 않는 정보)
  userBasicInfo: (state: ReturnType<typeof useUserStore.getState>) => ({
    uid: state._user?.uid,
    email: state._user?.email,
    displayName: state._user?.displayName,
    role: state._user?.role,
  }),
  // 사용자 상태 정보만 (자주 변경될 수 있는 정보)
  userStatus: (state: ReturnType<typeof useUserStore.getState>) => ({
    isLoading: state.isLoading,
    error: state.error,
    status: state._user?.status,
  }),
  // 클럽 기본 정보만
  clubBasicInfo: (state: ReturnType<typeof useClubStore.getState>) => ({
    currentClub: state.currentClub ? {
      id: state.currentClub.id,
      name: state.currentClub.name,
      status: state.currentClub.status,
    } : null,
  }),
  // 클럽 목록 (ID와 이름만)
  clubList: (state: ReturnType<typeof useClubStore.getState>) => 
    state.clubs.map(club => ({
      id: club.id,
      name: club.name,
      status: club.status,
    })),
  // 앱 UI 상태만
  appUIState: (state: ReturnType<typeof useUIStore.getState>) => ({
    theme: state.theme,
    sidebarOpen: state.sidebarOpen,
  }),
  // 알림 상태만
  notificationState: (state: ReturnType<typeof useUIStore.getState>) => ({
    unreadCount: state.notifications.filter(n => !n.read).length,
    hasNotifications: state.notifications.length > 0,
  }),
};
/**
 * 편의를 위한 커스텀 Hook들
 */
// 사용자 기본 정보 (리렌더링 최소화)
export function useUserBasicInfo() {
  return useSelectiveUserSubscription(
    optimizedSelectors.userBasicInfo,
    equalityFunctions.shallow
  );
}
// 사용자 상태 정보
export function useUserStatus() {
  return useSelectiveUserSubscription(
    optimizedSelectors.userStatus,
    equalityFunctions.shallow
  );
}
// 현재 클럽 기본 정보
export function useCurrentClubInfo() {
  return useSelectiveClubSubscription(
    optimizedSelectors.clubBasicInfo,
    equalityFunctions.deep
  );
}
// 클럽 목록 (최적화됨)
export function useOptimizedClubList() {
  return useSelectiveClubSubscription(
    optimizedSelectors.clubList,
    equalityFunctions.deep
  );
}
// 앱 UI 상태
export function useTheme() {
  return useSelectiveUISubscription(
    optimizedSelectors.appUIState,
    equalityFunctions.shallow
  );
}
// 알림 상태
export function useNotifications() {
  return useSelectiveUISubscription(
    optimizedSelectors.notificationState,
    equalityFunctions.shallow
  );
}
/**
 * 성능 모니터링 Hook
 */
export function useRenderPerformance(componentName: string) {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  useEffect(() => {
    renderCountRef.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    lastRenderTimeRef.current = now;
    if (process.env.NODE_ENV === 'development') {
    }
  });
  return {
    renderCount: renderCountRef.current,
    logPerformance: () => {
      if (process.env.NODE_ENV === 'development') {
      }
    },
  };
}
/**
 * 메모리 누수 방지 Hook
 */
export function useMemoryLeakPrevention() {
  const subscriptionsRef = useRef<Array<() => void>>([]);
  const addSubscription = (unsubscribe: () => void) => {
    subscriptionsRef.current.push(unsubscribe);
  };
  const cleanup = () => {
    subscriptionsRef.current.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error: unknown) {
      }
    });
    subscriptionsRef.current = [];
  };
  useEffect(() => {
    return cleanup;
  }, []);
  return {
    addSubscription,
    cleanup,
  };
}
