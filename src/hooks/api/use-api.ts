'use client';
import { useState, useEffect, useCallback } from 'react';
import { APIError } from '@/utils/error/api-error';
export interface UseAPIOptions {
  enabled?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: unknown) => void;
  onError?: (error: APIError) => void;
}
export interface UseAPIResult<T> {
  data: T | null;
  isLoading: boolean;
  error: APIError | null;
  refetch: () => Promise<void>;
}
/**
 * API 호출을 위한 커스텀 Hook
 * React Query와 유사한 인터페이스를 제공합니다.
 */
export function useAPI<T>(
  queryFn: () => Promise<{ data: T; success: boolean }>,
  options: UseAPIOptions = {}
): UseAPIResult<T> {
  const {
    enabled = true,
    refetchInterval,
    onSuccess,
    onError,
  } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<APIError | null>(null);
  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await queryFn();
      setData(result.data);
      if (onSuccess) {
        onSuccess(result.data);
      }
    } catch (err: unknown) {
      const apiError = APIError.fromError(err);
      setError(apiError);
      if (onError) {
        onError(apiError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [queryFn, enabled, onSuccess, onError]);
  // 초기 데이터 로드
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [fetchData, enabled]);
  // 주기적 refetch
  useEffect(() => {
    if (refetchInterval && enabled) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [fetchData, refetchInterval, enabled]);
  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
/**
 * 뮤테이션을 위한 Hook
 */
export interface UseMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: APIError, variables: TVariables) => void;
  onSettled?: (data: TData | null, error: APIError | null, variables: TVariables) => void;
}
export interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<void>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | null;
  isLoading: boolean;
  error: APIError | null;
  reset: () => void;
}
export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<{ data: TData; success: boolean }>,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationResult<TData, TVariables> {
  const { onSuccess, onError, onSettled } = options;
  const [data, setData] = useState<TData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<APIError | null>(null);
  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);
  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await mutationFn(variables);
      setData(result.data);
      if (onSuccess) {
        onSuccess(result.data, variables);
      }
      if (onSettled) {
        onSettled(result.data, null, variables);
      }
      return result.data;
    } catch (err: unknown) {
      const apiError = APIError.fromError(err);
      setError(apiError);
      if (onError) {
        onError(apiError, variables);
      }
      if (onSettled) {
        onSettled(null, apiError, variables);
      }
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn, onSuccess, onError, onSettled]);
  const mutate = useCallback(async (variables: TVariables) => {
    try {
      await mutateAsync(variables);
    } catch {
      // mutateAsync에서 이미 에러 처리됨
    }
  }, [mutateAsync]);
  return {
    mutate,
    mutateAsync,
    data,
    isLoading,
    error,
    reset,
  };
}
