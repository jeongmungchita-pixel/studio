/**
 * LoadingManager를 사용하기 위한 React Hook
 */
import { useCallback, useEffect, useState } from 'react';
import { loadingManager, LoadingState, LoadingOptions } from '@/services/loading-manager';
interface UseLoadingReturn {
  startLoading: (key: string, options?: LoadingOptions) => void;
  stopLoading: (key: string) => void;
  updateProgress: (key: string, progress: number, message?: string) => void;
  updateMessage: (key: string, message: string) => void;
  isLoading: (key?: string) => boolean;
  isLoadingPattern: (pattern: string) => boolean;
  loadingStates: LoadingState[];
  activeCount: number;
  stopAll: () => void;
  measureLoading: <T>(key: string, fn: () => Promise<T>, options?: LoadingOptions) => Promise<T>;
}
export function useLoading(): UseLoadingReturn {
  const [loadingStates, setLoadingStates] = useState<LoadingState[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  // LoadingManager 구독
  useEffect(() => {
    const unsubscribe = loadingManager.subscribe((states) => {
      setLoadingStates(Array.from(states.values()));
      setActiveCount(states.size);
    });
    return unsubscribe;
  }, []);
  // 로딩 시작
  const startLoading = useCallback((key: string, options?: LoadingOptions) => {
    loadingManager.startLoading(key, options);
  }, []);
  // 로딩 종료
  const stopLoading = useCallback((key: string) => {
    loadingManager.stopLoading(key);
  }, []);
  // 진행률 업데이트
  const updateProgress = useCallback((key: string, progress: number, message?: string) => {
    loadingManager.updateProgress(key, progress, message);
  }, []);
  // 메시지 업데이트
  const updateMessage = useCallback((key: string, message: string) => {
    loadingManager.updateMessage(key, message);
  }, []);
  // 로딩 중인지 확인
  const isLoading = useCallback((key?: string) => {
    return loadingManager.isLoading(key);
  }, []);
  // 패턴으로 로딩 확인
  const isLoadingPattern = useCallback((pattern: string) => {
    return loadingManager.isLoadingPattern(pattern);
  }, []);
  // 모든 로딩 종료
  const stopAll = useCallback(() => {
    loadingManager.stopAll();
  }, []);
  // 로딩 시간 측정
  const measureLoading = useCallback(<T,>(
    key: string,
    fn: () => Promise<T>,
    options?: LoadingOptions
  ): Promise<T> => {
    return loadingManager.measureLoading(key, fn, options);
  }, []);
  return {
    startLoading,
    stopLoading,
    updateProgress,
    updateMessage,
    isLoading,
    isLoadingPattern,
    loadingStates,
    activeCount,
    stopAll,
    measureLoading
  };
}
/**
 * 특정 키의 로딩 상태만 추적하는 Hook
 */
export function useLoadingState(key: string): {
  isLoading: boolean;
  state: LoadingState | undefined;
  start: (options?: LoadingOptions) => void;
  stop: () => void;
  updateProgress: (progress: number, message?: string) => void;
} {
  const [state, setState] = useState<LoadingState | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    const unsubscribe = loadingManager.subscribe((states) => {
      const currentState = states.get(key);
      setState(currentState);
      setIsLoading(!!currentState);
    });
    return unsubscribe;
  }, [key]);
  const start = useCallback((options?: LoadingOptions) => {
    loadingManager.startLoading(key, options);
  }, [key]);
  const stop = useCallback(() => {
    loadingManager.stopLoading(key);
  }, [key]);
  const updateProgress = useCallback((progress: number, message?: string) => {
    loadingManager.updateProgress(key, progress, message);
  }, [key]);
  return {
    isLoading,
    state,
    start,
    stop,
    updateProgress
  };
}
/**
 * 자동 로딩 관리 Hook
 */
export function useAutoLoading(
  key: string,
  deps: React.DependencyList = []
): {
  isLoading: boolean;
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
} {
  const { isLoading, start, stop } = useLoadingState(key);
  const withLoading = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    start();
    try {
      return await fn();
    } finally {
      stop();
    }
  }, [start, stop]);
  // 컴포넌트 언마운트 시 로딩 중지
  useEffect(() => {
    return () => {
      if (isLoading) {
        stop();
      }
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return {
    isLoading,
    withLoading
  };
}
