'use client';
import { useState, useEffect, useCallback } from 'react';
import { useService, useFirebaseService } from '@/lib/di/global-di';
import type { IFirebaseService, IQueryService } from '@/lib/di/interfaces';
import { 
  DocumentData, 
  DocumentReference, 
  CollectionReference, 
  Query, 
  QueryConstraint,
  onSnapshot,
  getDoc,
  getDocs,
  doc,
  collection,
  query as firestoreQuery,
  where,
  orderBy,
  limit,
  startAfter,
  endBefore
} from 'firebase/firestore';

// 공통 타입
export interface QueryResult<T = DocumentData> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export interface DocumentResult<T = DocumentData> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export interface PaginatedResult<T = DocumentData> extends QueryResult<T> {
  hasMore: boolean;
  hasPrevious: boolean;
  loadMore: () => Promise<void>;
  loadPrevious: () => Promise<void>;
}

/**
 * DI 기반 Collection Hook
 * 실시간 컬렉션 데이터를 DI 컨테이너를 통해 조회
 */
export function useCollectionDI<T = DocumentData>(
  queryFn: () => Query | null,
  deps: any[] = []
): QueryResult<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // DI를 통해 서비스 주입
  const firebaseService = useFirebaseService();
  const queryService = useService<IQueryService>('queryService');

  const refresh = useCallback(async () => {
    const query = queryFn();
    if (!query) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const fs = firebaseService as any;
      const firestore = fs.getFirestore();
      if (!firestore) {
        throw new Error('Firestore is not available');
      }

      const snapshot = await fs.getFirestore().getDocs(query);
      const documents = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as T[];

      setData(documents);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [queryFn, firebaseService, queryService]);

  // 실시간 업데이트
  useEffect(() => {
    const query = queryFn();
    if (!query) {
      setData(null);
      setLoading(false);
      return;
    }

    const fs = firebaseService as any;
    const firestore = fs.getFirestore();
    if (!firestore) {
      setError(new Error('Firestore is not available'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const documents = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        })) as T[];
        setData(documents);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setData(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, deps);

  return { data, loading, error, refresh };
}

/**
 * DI 기반 Document Hook
 * 실시간 문서 데이터를 DI 컨테이너를 통해 조회
 */
export function useDocumentDI<T = DocumentData>(
  docRefFn: () => DocumentReference | null,
  deps: any[] = []
): DocumentResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const firebaseService = useFirebaseService();

  const refresh = useCallback(async () => {
    const docRef = docRefFn();
    if (!docRef) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const firestore = (firebaseService as any).getFirestore();
      if (!firestore) {
        throw new Error('Firestore is not available');
      }

      const snapshot = await (firebaseService as any).getFirestore().getDoc(docRef);
      if (snapshot.exists()) {
        setData({
          id: snapshot.id,
          ...snapshot.data()
        } as T);
      } else {
        setData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [docRefFn, firebaseService]);

  // 실시간 업데이트
  useEffect(() => {
    const docRef = docRefFn();
    if (!docRef) {
      setData(null);
      setLoading(false);
      return;
    }

    const firestore = (firebaseService as any).getFirestore();
    if (!firestore) {
      setError(new Error('Firestore is not available'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData({
            id: snapshot.id,
            ...snapshot.data()
          } as T);
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setData(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, deps);

  return { data, loading, error, refresh };
}

/**
 * DI 기반 Paginated Collection Hook
 */
export function usePaginatedCollectionDI<T = DocumentData>(
  queryFn: () => Query | null,
  pageSize: number = 20,
  deps: any[] = []
): PaginatedResult<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [firstDoc, setFirstDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  
  const firebaseService = useFirebaseService();

  const refresh = useCallback(async () => {
    const query = queryFn();
    if (!query) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const firestore = (firebaseService as any).getFirestore();
      if (!firestore) {
        throw new Error('Firestore is not available');
      }

      const snapshot = await (firebaseService as any).getFirestore().getDocs(query);
      const documents = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as T[];

      setData(documents);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setFirstDoc(snapshot.docs[0] || null);
      setHasMore(snapshot.docs.length === pageSize);
      setHasPrevious(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [queryFn, firebaseService, pageSize]);

  const loadMore = useCallback(async () => {
    if (!lastDoc || hasMore === false) return;

    try {
      setLoading(true);
      
      const baseQuery = queryFn();
      if (!baseQuery) return;

      const firestore = (firebaseService as any).getFirestore();
      if (!firestore) return;

      const nextQuery = firestoreQuery(baseQuery, startAfter(lastDoc), limit(pageSize));
      const snapshot = await (firebaseService as any).getFirestore().getDocs(nextQuery);
      const documents = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as T[];

      setData(prev => prev ? [...prev, ...documents] : documents);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [lastDoc, hasMore, queryFn, firebaseService, pageSize]);

  const loadPrevious = useCallback(async () => {
    if (!firstDoc || hasPrevious === false) return;

    try {
      setLoading(true);
      
      const baseQuery = queryFn();
      if (!baseQuery) return;

      const firestore = (firebaseService as any).getFirestore();
      if (!firestore) return;

      const prevQuery = firestoreQuery(baseQuery, endBefore(firstDoc), limit(pageSize));
      const snapshot = await (firebaseService as any).getFirestore().getDocs(prevQuery);
      const documents = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as T[];

      setData(documents);
      setFirstDoc(snapshot.docs[0] || null);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasPrevious(snapshot.docs.length === pageSize);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [firstDoc, hasPrevious, queryFn, firebaseService, pageSize]);

  // 초기 로드
  useEffect(() => {
    refresh();
  }, deps);

  return { 
    data, 
    loading, 
    error, 
    refresh, 
    hasMore, 
    hasPrevious, 
    loadMore, 
    loadPrevious 
  };
}
