/**
 * 실시간 동기화 상태 관리 스토어
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { RealtimeState, RealtimeConnection, RealtimeSubscription } from './types';
import { 
  onSnapshot, 
  Query, 
  DocumentReference,
  Unsubscribe,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { errorManager } from '@/lib/error/error-manager';
interface RealtimeStoreActions {
  // 연결 관리
  connect: (id: string) => void;
  disconnect: (id: string) => void;
  reconnect: (id: string) => void;
  updateConnectionStatus: (id: string, status: RealtimeConnection['status']) => void;
  // 구독 관리
  subscribe: (
    _collection: string,
    _query: Query | DocumentReference,
    callback: (data: unknown) => void,
    options?: {
      includeMetadata?: boolean;
      errorHandler?: (error: Error) => void;
    }
  ) => string;
  unsubscribe: (id: string) => void;
  unsubscribeAll: () => void;
  // 상태 관리
  getConnection: (id: string) => RealtimeConnection | undefined;
  getSubscription: (id: string) => RealtimeSubscription | undefined;
  isConnected: (id: string) => boolean;
  getActiveSubscriptions: () => RealtimeSubscription[];
  // 유틸리티
  ping: (id: string) => void;
  cleanup: () => void;
  reset: () => void;
}
type RealtimeStore = RealtimeState & RealtimeStoreActions;
const initialState: RealtimeState = {
  connections: new Map(),
  subscriptions: new Map()
};
export const useRealtimeStore = create<RealtimeStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,
      // 연결 관리
      connect: (id) => {
        set((state) => {
          state.connections.set(id, {
            id,
            status: 'connecting',
            lastPing: new Date(),
            retryCount: 0
          });
        });
        // 연결 시뮬레이션 (실제로는 WebSocket 등 사용)
        setTimeout(() => {
          get().updateConnectionStatus(id, 'connected');
        }, 1000);
      },
      disconnect: (id) => {
        const connection = get().connections.get(id);
        if (connection) {
          set((state) => {
            state.connections.delete(id);
          });
        }
      },
      reconnect: (id) => {
        const connection = get().connections.get(id);
        if (connection) {
          set((state) => {
            const conn = state.connections.get(id);
            if (conn) {
              conn.status = 'connecting';
              conn.retryCount += 1;
            }
          });
          // 재연결 시도
          setTimeout(() => {
            const maxRetries = 5;
            const conn = get().connections.get(id);
            if (conn && conn.retryCount <= maxRetries) {
              get().updateConnectionStatus(id, 'connected');
            } else {
              get().updateConnectionStatus(id, 'error');
            }
          }, Math.min(1000 * Math.pow(2, connection.retryCount), 30000));
        }
      },
      updateConnectionStatus: (id, status) => {
        set((state) => {
          const connection = state.connections.get(id);
          if (connection) {
            connection.status = status;
            connection.lastPing = new Date();
            if (status === 'connected') {
              connection.retryCount = 0;
            }
          }
        });
      },
      // 구독 관리
      subscribe: (_collection, _query, callback, options = {}) => {
        const id = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // Firestore 실시간 리스너 설정
        let unsubscribe: Unsubscribe;
        if (_query instanceof DocumentReference) {
          // 단일 문서 구독
          unsubscribe = onSnapshot(
            _query,
            {
              includeMetadataChanges: options.includeMetadata
            },
            (snapshot) => {
              callback({
                id: snapshot.id,
                data: snapshot.data(),
                exists: snapshot.exists(),
                metadata: snapshot.metadata
              });
            },
            (error) => {
              if (options.errorHandler) {
                options.errorHandler(error);
              } else {
                errorManager.handleError(error, {
                  action: 'document-subscription',
                  component: 'RealtimeStore',
                  metadata: { _collection, subscriptionId: id }
                });
              }
              get().unsubscribe(id);
            }
          );
        } else {
          // 컬렉션 구독
          unsubscribe = onSnapshot(
            _query as Query<DocumentData>,
            {
              includeMetadataChanges: options.includeMetadata
            },
            (snapshot: QuerySnapshot<DocumentData>) => {
              // 컬렉션
              const changes = snapshot.docChanges().map(change => ({
                type: change.type,
                doc: {
                  id: change.doc.id,
                  data: change.doc.data()
                }
              }));
              const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              callback({
                docs,
                changes,
                size: snapshot.size,
                empty: snapshot.empty,
                metadata: snapshot.metadata
              });
            },
            (error) => {
              if (options.errorHandler) {
                options.errorHandler(error);
              } else {
                errorManager.handleError(error, {
                  action: 'collection-subscription',
                  component: 'RealtimeStore',
                  metadata: { _collection, subscriptionId: id }
                });
              }
              get().unsubscribe(id);
            }
          );
        }
        // 구독 저장
        set((state) => {
          state.subscriptions.set(id, {
            id,
            _collection,
            query: _query,
            callback,
            unsubscribe
          });
        });
        return id;
      },
      unsubscribe: (id) => {
        const subscription = get().subscriptions.get(id);
        if (subscription) {
          // Firestore 리스너 해제
          subscription.unsubscribe?.();
          // 구독 제거
          set((state) => {
            state.subscriptions.delete(id);
          });
        }
      },
      unsubscribeAll: () => {
        const subscriptions = get().subscriptions;
        // 모든 리스너 해제
        subscriptions.forEach(subscription => {
          subscription.unsubscribe?.();
        });
        // 구독 초기화
        set((state) => {
          state.subscriptions.clear();
        });
      },
      // 상태 관리
      getConnection: (id) => {
        return get().connections.get(id);
      },
      getSubscription: (id) => {
        return get().subscriptions.get(id);
      },
      isConnected: (id) => {
        const connection = get().connections.get(id);
        return connection?.status === 'connected';
      },
      getActiveSubscriptions: () => {
        return Array.from(get().subscriptions.values());
      },
      // 유틸리티
      ping: (id) => {
        set((state) => {
          const connection = state.connections.get(id);
          if (connection) {
            connection.lastPing = new Date();
          }
        });
      },
      cleanup: () => {
        // 오래된 연결 정리
        const now = Date.now();
        const timeout = 5 * 60 * 1000; // 5분
        set((state) => {
          state.connections.forEach((connection, id) => {
            if (now - connection.lastPing.getTime() > timeout) {
              state.connections.delete(id);
            }
          });
        });
      },
      reset: () => {
        // 모든 구독 해제
        get().unsubscribeAll();
        // 상태 초기화
        set(initialState);
      }
    })),
    {
      name: 'RealtimeStore'
    }
  )
);
// 선택자 (Selectors)
export const useConnections = () => useRealtimeStore((state) => Array.from(state.connections.values()));
export const useSubscriptions = () => useRealtimeStore((state) => Array.from(state.subscriptions.values()));
export const useConnectionStatus = (id: string) => useRealtimeStore((state) => state.connections.get(id)?.status);
// 헬퍼 함수
export const realtime = {
  /**
   * 컬렉션 구독
   */
  subscribeToCollection: (
    _query: Query,
    callback: (docs: DocumentData[]) => void,
    options?: { includeMetadata?: boolean }
  ) => {
    return useRealtimeStore.getState().subscribe(
      'collection',
      _query,
      (snapshot: any) => {
        if (snapshot?.docs) {
          callback(snapshot.docs);
        }
      },
      options
    );
  },
  /**
   * 문서 구독
   */
  subscribeToDocument: (
    docRef: DocumentReference,
    callback: (doc: unknown) => void,
    options?: { includeMetadata?: boolean }
  ) => {
    return useRealtimeStore.getState().subscribe(
      'document',
      docRef,
      (snapshot: any) => {
        callback({
          id: snapshot?.id,
          ...(snapshot?.data || {})
        });
      },
      options
    );
  },
  /**
   * 구독 해제
   */
  unsubscribe: (id: string) => {
    useRealtimeStore.getState().unsubscribe(id);
  },
  /**
   * 모든 구독 해제
   */
  unsubscribeAll: () => {
    useRealtimeStore.getState().unsubscribeAll();
  }
};
// 자동 정리 (5분마다)
if (typeof window !== 'undefined') {
  setInterval(() => {
    useRealtimeStore.getState().cleanup();
  }, 5 * 60 * 1000);
}
