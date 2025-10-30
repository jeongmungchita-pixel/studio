'use client';

import { useState, useCallback, useRef } from 'react';
import { APIError } from '@/utils/error/api-error';
import { logError } from '@/utils/error/error-handler';

export interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: APIError, rollbackData?: T) => void;
  onRollback?: (originalData: T) => void;
  enableRollback?: boolean;
  rollbackDelay?: number;
}

export interface OptimisticUpdateResult<T, TVariables> {
  data: T | null;
  isLoading: boolean;
  error: APIError | null;
  optimisticUpdate: (
    optimisticData: T,
    updateFn: (variables: TVariables) => Promise<T>,
    variables: TVariables
  ) => Promise<void>;
  rollback: () => void;
  reset: () => void;
}

/**
 * 낙관적 업데이트 Hook
 * UI를 즉시 업데이트하고, 서버 요청이 실패하면 롤백합니다.
 */
export function useOptimisticUpdate<T, TVariables = any>(
  initialData: T | null = null,
  options: OptimisticUpdateOptions<T> = {}
): OptimisticUpdateResult<T, TVariables> {
  const {
    onSuccess,
    onError,
    onRollback,
    enableRollback = true,
    rollbackDelay = 0,
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<APIError | null>(null);

  // 롤백을 위한 원본 데이터 저장
  const originalDataRef = useRef<T | null>(null);
  const rollbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 롤백 함수
  const rollback = useCallback(() => {
    if (originalDataRef.current !== null) {
      setData(originalDataRef.current);
      
      if (onRollback) {
        onRollback(originalDataRef.current);
      }
    }
    
    originalDataRef.current = null;
    
    if (rollbackTimeoutRef.current) {
      clearTimeout(rollbackTimeoutRef.current);
      rollbackTimeoutRef.current = null;
    }
  }, [onRollback]);

  // 상태 초기화
  const reset = useCallback(() => {
    setData(initialData);
    setIsLoading(false);
    setError(null);
    originalDataRef.current = null;
    
    if (rollbackTimeoutRef.current) {
      clearTimeout(rollbackTimeoutRef.current);
      rollbackTimeoutRef.current = null;
    }
  }, [initialData]);

  // 낙관적 업데이트 실행
  const optimisticUpdate = useCallback(async (
    optimisticData: T,
    updateFn: (variables: TVariables) => Promise<T>,
    variables: TVariables
  ) => {
    try {
      // 현재 데이터를 원본으로 저장 (롤백용)
      originalDataRef.current = data;
      
      // 즉시 UI 업데이트 (낙관적)
      setData(optimisticData);
      setIsLoading(true);
      setError(null);

      // 실제 서버 요청 실행
      const result = await updateFn(variables);
      
      // 성공 시 서버 응답으로 데이터 업데이트
      setData(result);
      setIsLoading(false);
      originalDataRef.current = null;

      if (onSuccess) {
        onSuccess(result);
      }

    } catch (err) {
      const apiError = APIError.fromError(err);
      setError(apiError);
      setIsLoading(false);
      
      logError(apiError, 'useOptimisticUpdate');

      // 롤백 처리
      if (enableRollback) {
        if (rollbackDelay > 0) {
          // 지연 롤백
          rollbackTimeoutRef.current = setTimeout(() => {
            rollback();
          }, rollbackDelay);
        } else {
          // 즉시 롤백
          rollback();
        }
      }

      if (onError) {
        onError(apiError, originalDataRef.current || undefined);
      }

      throw apiError;
    }
  }, [data, onSuccess, onError, enableRollback, rollbackDelay, rollback]);

  return {
    data,
    isLoading,
    error,
    optimisticUpdate,
    rollback,
    reset,
  };
}

/**
 * 리스트 아이템 낙관적 업데이트 Hook
 * 리스트에서 특정 아이템을 낙관적으로 업데이트합니다.
 */
export function useOptimisticListUpdate<T extends { id: string }>(
  initialList: T[] = []
) {
  const [list, setList] = useState<T[]>(initialList);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<APIError | null>(null);

  const originalListRef = useRef<T[]>([]);

  // 아이템 추가 (낙관적)
  const addItem = useCallback(async (
    newItem: T,
    addFn: () => Promise<T>
  ) => {
    try {
      originalListRef.current = [...list];
      
      // 즉시 UI에 추가
      setList(prev => [...prev, newItem]);
      setIsLoading(true);
      setError(null);

      // 서버 요청
      const result = await addFn();
      
      // 서버 응답으로 업데이트
      setList(prev => prev.map(item => 
        item.id === newItem.id ? result : item
      ));
      setIsLoading(false);

    } catch (err) {
      const apiError = APIError.fromError(err);
      setError(apiError);
      setIsLoading(false);
      
      // 롤백
      setList(originalListRef.current);
      
      throw apiError;
    }
  }, [list]);

  // 아이템 업데이트 (낙관적)
  const updateItem = useCallback(async (
    itemId: string,
    updates: Partial<T>,
    updateFn: () => Promise<T>
  ) => {
    try {
      originalListRef.current = [...list];
      
      // 즉시 UI 업데이트
      setList(prev => prev.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      ));
      setIsLoading(true);
      setError(null);

      // 서버 요청
      const result = await updateFn();
      
      // 서버 응답으로 업데이트
      setList(prev => prev.map(item => 
        item.id === itemId ? result : item
      ));
      setIsLoading(false);

    } catch (err) {
      const apiError = APIError.fromError(err);
      setError(apiError);
      setIsLoading(false);
      
      // 롤백
      setList(originalListRef.current);
      
      throw apiError;
    }
  }, [list]);

  // 아이템 삭제 (낙관적)
  const removeItem = useCallback(async (
    itemId: string,
    deleteFn: () => Promise<void>
  ) => {
    try {
      originalListRef.current = [...list];
      
      // 즉시 UI에서 제거
      setList(prev => prev.filter(item => item.id !== itemId));
      setIsLoading(true);
      setError(null);

      // 서버 요청
      await deleteFn();
      setIsLoading(false);

    } catch (err) {
      const apiError = APIError.fromError(err);
      setError(apiError);
      setIsLoading(false);
      
      // 롤백
      setList(originalListRef.current);
      
      throw apiError;
    }
  }, [list]);

  // 전체 리스트 설정
  const setOptimisticList = useCallback((newList: T[]) => {
    setList(newList);
  }, []);

  return {
    list,
    isLoading,
    error,
    addItem,
    updateItem,
    removeItem,
    setList: setOptimisticList,
  };
}
