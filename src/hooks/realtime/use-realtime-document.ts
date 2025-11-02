'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  doc, 
  onSnapshot, 
  DocumentData,
  FirestoreError,
  Unsubscribe
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { APIError } from '@/lib/error/error-manager';
import { logError } from '@/lib/error/error-manager';
export interface RealtimeDocumentOptions {
  enabled?: boolean;
  onError?: (error: APIError) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onDocumentChange?: (data: unknown, exists: boolean) => void;
  retryOnError?: boolean;
  maxRetries?: number;
}
export interface RealtimeDocumentResult<T> {
  data: (T & { id: string }) | null;
  exists: boolean;
  isLoading: boolean;
  error: APIError | null;
  isConnected: boolean;
  retryCount: number;
  refetch: () => void;
  unsubscribe: () => void;
}
/**
 * 실시간 문서 동기화 Hook
 * Firestore 문서의 실시간 변경사항을 감지하고 상태를 업데이트합니다.
 */
export function useRealtimeDocument<T extends DocumentData>(
  collectionName: string,
  documentId: string,
  options: RealtimeDocumentOptions = {}
): RealtimeDocumentResult<T> {
  const {
    enabled = true,
    onError,
    onConnect,
    onDisconnect,
    onDocumentChange,
    retryOnError = true,
    maxRetries = 3,
  } = options;
  const firestore = useFirestore();
  const [data, setData] = useState<(T & { id: string }) | null>(null);
  const [exists, setExists] = useState(false);
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
    if (!firestore || !enabled || !documentId) {
      setIsLoading(false);
      return;
    }
    try {
      const docRef = doc(firestore, collectionName, documentId);
      setIsLoading(true);
      setError(null);
      const unsubscribeFn = onSnapshot(
        docRef,
        {
          includeMetadataChanges: true,
        },
        (snapshot) => {
          try {
            // 실제 데이터 변경인지 확인
            if (!snapshot.metadata.hasPendingWrites && !snapshot.metadata.fromCache) {
              const documentExists = snapshot.exists();
              setExists(documentExists);
              if (documentExists) {
                const documentData = {
                  ...snapshot.data(),
                  id: snapshot.id,
                } as T & { id: string };
                setData(documentData);
                if (onDocumentChange) {
                  onDocumentChange(documentData, true);
                }
              } else {
                setData(null);
                if (onDocumentChange) {
                  onDocumentChange(null, false);
                }
              }
              setIsConnected(true);
              setIsLoading(false);
              setRetryCount(0);
              if (onConnect && !isConnected) {
                onConnect();
              }
            }
          } catch (err: unknown) {
            const apiError = APIError.fromError(err);
            setError(apiError);
            setIsLoading(false);
            logError(apiError, `useRealtimeDocument:${collectionName}/${documentId}`);
            if (onError) {
              onError(apiError);
            }
          }
        },
        (firestoreError: FirestoreError) => {
          const apiError = new APIError(
            firestoreError.message || 'Firestore error',
            firestoreError.code === 'permission-denied' ? 403 : 500,
            firestoreError.code || 'FIRESTORE_ERROR'
          );
          setError(apiError);
          setIsLoading(false);
          setIsConnected(false);
          logError(apiError, `useRealtimeDocument:${collectionName}/${documentId}`);
          if (onError) {
            onError(apiError);
          }
          // 재시도 로직
          if (retryOnError && retryCount < maxRetries) {
            const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
            retryTimeoutRef.current = setTimeout(() => {
              setRetryCount(prev => prev + 1);
              setupListener();
            }, retryDelay);
          }
        }
      );
      unsubscribeRef.current = unsubscribeFn;
    } catch (err: unknown) {
      const apiError = APIError.fromError(err);
      setError(apiError);
      setIsLoading(false);
      logError(apiError, `useRealtimeDocument:${collectionName}/${documentId}`);
      if (onError) {
        onError(apiError);
      }
    }
  }, [
    firestore,
    collectionName,
    documentId,
    enabled,
    onError,
    onConnect,
    onDocumentChange,
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
    exists,
    isLoading,
    error,
    isConnected,
    retryCount,
    refetch,
    unsubscribe,
  };
}
/**
 * 사용자 프로필 실시간 동기화 Hook
 * 현재 로그인한 사용자의 프로필을 실시간으로 동기화합니다.
 */
export function useRealtimeUserProfile(userId?: string) {
  return useRealtimeDocument('users', userId || '', {
    enabled: !!userId,
    onDocumentChange: (userData, exists) => {
      if (exists && userData) {
        // 사용자 권한이 변경된 경우 처리
        // 예: 역할 변경, 상태 변경 등
      }
    },
  });
}
/**
 * 클럽 정보 실시간 동기화 Hook
 */
export function useRealtimeClub(clubId?: string) {
  return useRealtimeDocument('clubs', clubId || '', {
    enabled: !!clubId,
  });
}
