'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { doc, onSnapshot, enableNetwork, disableNetwork } from 'firebase/firestore';

export interface ConnectionStatus {
  isOnline: boolean;
  isFirestoreConnected: boolean;
  lastConnected: Date | null;
  reconnectAttempts: number;
  latency: number | null;
}

export interface ConnectionStatusOptions {
  enableAutoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onReconnectAttempt?: (attempt: number) => void;
}

/**
 * 연결 상태 관리 Hook
 * 네트워크 및 Firestore 연결 상태를 모니터링합니다.
 */
export function useConnectionStatus(
  options: ConnectionStatusOptions = {}
): ConnectionStatus & {
  reconnect: () => Promise<void>;
  forceOffline: () => Promise<void>;
  forceOnline: () => Promise<void>;
} {
  const {
    enableAutoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectInterval = 5000,
    onConnect,
    onDisconnect,
    onReconnectAttempt,
  } = options;

  const firestore = useFirestore();

  const [status, setStatus] = useState<ConnectionStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isFirestoreConnected: false,
    lastConnected: null,
    reconnectAttempts: 0,
    latency: null,
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latencyTestRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // 네트워크 상태 감지
  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
      if (onConnect) {
        onConnect();
      }
    };

    const handleOffline = () => {
      setStatus(prev => ({ 
        ...prev, 
        isOnline: false,
        isFirestoreConnected: false 
      }));
      if (onDisconnect) {
        onDisconnect();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [onConnect, onDisconnect]);

  // Firestore 연결 상태 모니터링
  useEffect(() => {
    if (!firestore) return;

    // 더미 문서를 사용하여 연결 상태 확인
    const connectionTestDoc = doc(firestore, '.info/connected');
    
    const unsubscribe = onSnapshot(
      connectionTestDoc,
      { includeMetadataChanges: true },
      (snapshot) => {
        const isConnected = !snapshot.metadata.fromCache;
        
        setStatus(prev => ({
          ...prev,
          isFirestoreConnected: isConnected,
          lastConnected: isConnected ? new Date() : prev.lastConnected,
          reconnectAttempts: isConnected ? 0 : prev.reconnectAttempts,
        }));

        if (isConnected && onConnect) {
          onConnect();
        } else if (!isConnected && onDisconnect) {
          onDisconnect();
        }
      },
      (error) => {
        console.error('Connection monitoring error:', error);
        setStatus(prev => ({ 
          ...prev, 
          isFirestoreConnected: false 
        }));
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
    };
  }, [firestore, onConnect, onDisconnect]);

  // 자동 재연결 로직
  useEffect(() => {
    if (
      !status.isFirestoreConnected &&
      status.isOnline &&
      enableAutoReconnect &&
      status.reconnectAttempts < maxReconnectAttempts
    ) {
      reconnectTimeoutRef.current = setTimeout(() => {
        setStatus(prev => ({
          ...prev,
          reconnectAttempts: prev.reconnectAttempts + 1,
        }));

        if (onReconnectAttempt) {
          onReconnectAttempt(status.reconnectAttempts + 1);
        }

        // Firestore 재연결 시도
        if (firestore) {
          enableNetwork(firestore).catch(console.error);
        }
      }, reconnectInterval * Math.pow(2, status.reconnectAttempts)); // 지수 백오프
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [
    status.isFirestoreConnected,
    status.isOnline,
    status.reconnectAttempts,
    enableAutoReconnect,
    maxReconnectAttempts,
    reconnectInterval,
    onReconnectAttempt,
    firestore,
  ]);

  // 지연시간 측정
  useEffect(() => {
    if (status.isFirestoreConnected && firestore) {
      const measureLatency = async () => {
        try {
          const start = Date.now();
          const testDoc = doc(firestore, 'test', 'latency');
          
          // 간단한 읽기 작업으로 지연시간 측정
          await new Promise<void>((resolve, reject) => {
            const unsubscribe = onSnapshot(
              testDoc,
              () => {
                unsubscribe();
                resolve();
              },
              reject
            );
          });

          const latency = Date.now() - start;
          setStatus(prev => ({ ...prev, latency }));
        } catch (error) {
          // 지연시간 측정 실패는 무시
        }
      };

      // 30초마다 지연시간 측정
      latencyTestRef.current = setInterval(measureLatency, 30000);
      measureLatency(); // 즉시 한 번 실행

      return () => {
        if (latencyTestRef.current) {
          clearInterval(latencyTestRef.current);
        }
      };
    }
  }, [status.isFirestoreConnected, firestore]);

  // 수동 재연결
  const reconnect = useCallback(async () => {
    if (!firestore) return;

    try {
      setStatus(prev => ({ ...prev, reconnectAttempts: 0 }));
      await enableNetwork(firestore);
    } catch (error) {
      console.error('Manual reconnect failed:', error);
    }
  }, [firestore]);

  // 강제 오프라인
  const forceOffline = useCallback(async () => {
    if (!firestore) return;

    try {
      await disableNetwork(firestore);
      setStatus(prev => ({ 
        ...prev, 
        isFirestoreConnected: false 
      }));
    } catch (error) {
      console.error('Force offline failed:', error);
    }
  }, [firestore]);

  // 강제 온라인
  const forceOnline = useCallback(async () => {
    if (!firestore) return;

    try {
      await enableNetwork(firestore);
    } catch (error) {
      console.error('Force online failed:', error);
    }
  }, [firestore]);

  // 정리
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (latencyTestRef.current) {
        clearInterval(latencyTestRef.current);
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    ...status,
    reconnect,
    forceOffline,
    forceOnline,
  };
}

/**
 * 간단한 온라인 상태 Hook
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  return isOnline;
}
