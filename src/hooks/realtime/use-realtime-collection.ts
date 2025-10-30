'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  QueryConstraint,
  DocumentData,
  FirestoreError,
  Unsubscribe
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { APIError } from '@/utils/error/api-error';
import { logError } from '@/utils/error/error-handler';

export interface RealtimeCollectionOptions {
  enabled?: boolean;
  onError?: (error: APIError) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  retryOnError?: boolean;
  maxRetries?: number;
}

export interface RealtimeCollectionResult<T> {
  data: (T & { id: string })[];
  isLoading: boolean;
  error: APIError | null;
  isConnected: boolean;
  retryCount: number;
  refetch: () => void;
  unsubscribe: () => void;
}

/**
 * 실시간 컬렉션 동기화 Hook
 * Firestore 컬렉션의 실시간 변경사항을 감지하고 상태를 업데이트합니다.
 */
export function useRealtimeCollection<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  options: RealtimeCollectionOptions = {}
): RealtimeCollectionResult<T> {
  const {
    enabled = true,
    onError,
    onConnect,
    onDisconnect,
    retryOnError = true,
    maxRetries = 3,
  } = options;

  const firestore = useFirestore();
  
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<APIError | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 연결 해제 함수
  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setIsConnected(false);
    if (onDisconnect) {
      onDisconnect();
    }
  }, [onDisconnect]);

  // 실시간 리스너 설정
  const setupListener = useCallback(() => {
    if (!firestore || !enabled) {
      setIsLoading(false);
      return;
    }

    try {
      const collectionRef = collection(firestore, collectionName);
      const q = constraints.length > 0 
        ? query(collectionRef, ...constraints)
        : collectionRef;

      setIsLoading(true);
      setError(null);

      const unsubscribeFn = onSnapshot(
        q,
        {
          // 메타데이터 변경도 감지 (캐시에서 로드되었는지 등)
          includeMetadataChanges: true,
        },
        (snapshot) => {
          try {
            // 실제 데이터 변경인지 확인 (메타데이터만 변경된 것이 아닌지)
            if (!snapshot.metadata.hasPendingWrites && !snapshot.metadata.fromCache) {
              const documents = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
              })) as (T & { id: string })[];

              setData(documents);
              setIsConnected(true);
              setIsLoading(false);
              setRetryCount(0);

              if (onConnect && !isConnected) {
                onConnect();
              }
            }
          } catch (err) {
            const apiError = APIError.fromError(err);
            setError(apiError);
            setIsLoading(false);
            logError(apiError, `useRealtimeCollection:${collectionName}`);
            
            if (onError) {
              onError(apiError);
            }
          }
        },
        (firestoreError: FirestoreError) => {
          const apiError = APIError.fromFirebaseError(firestoreError);
          setError(apiError);
          setIsLoading(false);
          setIsConnected(false);
          
          logError(apiError, `useRealtimeCollection:${collectionName}`);
          
          if (onError) {
            onError(apiError);
          }

          // 재시도 로직
          if (retryOnError && retryCount < maxRetries) {
            const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // 최대 10초
            
            retryTimeoutRef.current = setTimeout(() => {
              setRetryCount(prev => prev + 1);
              setupListener();
            }, retryDelay);
          }
        }
      );

      unsubscribeRef.current = unsubscribeFn;
    } catch (err) {
      const apiError = APIError.fromError(err);
      setError(apiError);
      setIsLoading(false);
      logError(apiError, `useRealtimeCollection:${collectionName}`);
      
      if (onError) {
        onError(apiError);
      }
    }
  }, [
    firestore,
    collectionName,
    constraints,
    enabled,
    onError,
    onConnect,
    retryOnError,
    maxRetries,
    retryCount,
    isConnected,
  ]);

  // 수동 재시도 함수
  const refetch = useCallback(() => {
    unsubscribe();
    setRetryCount(0);
    setupListener();
  }, [unsubscribe, setupListener]);

  // 초기 설정 및 정리
  useEffect(() => {
    setupListener();

    return () => {
      unsubscribe();
    };
  }, [setupListener, unsubscribe]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    data,
    isLoading,
    error,
    isConnected,
    retryCount,
    refetch,
    unsubscribe,
  };
}

/**
 * 실시간 컬렉션 Hook의 간편 버전
 * 기본 옵션으로 실시간 컬렉션을 구독합니다.
 */
export function useRealtimeCollectionSimple<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = []
) {
  return useRealtimeCollection<T>(collectionName, constraints, {
    enabled: true,
    retryOnError: true,
    maxRetries: 3,
  });
}
