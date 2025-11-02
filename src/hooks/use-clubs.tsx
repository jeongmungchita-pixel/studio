'use client';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useCachedCollection } from './use-cached-collection';
import { Club } from '@/types';
interface UseClubsOptions {
  enabled?: boolean;
  status?: 'active' | 'inactive' | 'all';
  cacheDuration?: number;
}
export function useClubs(options: UseClubsOptions = {}) {
  const { 
    enabled = true, 
    status = 'all',
    cacheDuration = 10 * 60 * 1000 // 클럽 데이터는 10분간 캐시
  } = options;
  const firestore = useFirestore();
  // 쿼리 생성 (상태별 필터링)
  const clubsQuery = useMemoFirebase(() => {
    if (!firestore || !enabled) return null;
    const baseQuery = collection(firestore, 'clubs');
    if (status === 'all') {
      return query(baseQuery, orderBy('name', 'asc'));
    } else {
      return query(
        baseQuery, 
        where('status', '==', status),
        orderBy('name', 'asc')
      );
    }
  }, [firestore, enabled, status]);
  // 캐시 키 생성 (상태별로 다른 캐시)
  const cacheKey = `clubs_${status}`;
  return useCachedCollection<Club>(clubsQuery, {
    cacheKey,
    cacheDuration,
    enabled,
    staleWhileRevalidate: true // 오래된 데이터를 보여주면서 백그라운드에서 업데이트
  });
}
// 특정 클럽 조회 (단일 클럽)
export function useClub(clubId: string | null, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const firestore = useFirestore();
  const clubQuery = useMemoFirebase(() => {
    if (!firestore || !clubId || !enabled) return null;
    return query(
      collection(firestore, 'clubs'),
      where('__name__', '==', clubId)
    );
  }, [firestore, clubId, enabled]);
  const result = useCachedCollection<Club>(clubQuery, {
    cacheKey: `club_${clubId}`,
    cacheDuration: 15 * 60 * 1000, // 단일 클럽은 15분간 캐시
    enabled: enabled && !!clubId,
    staleWhileRevalidate: true
  });
  return {
    ...result,
    data: result.data?.[0] || null // 단일 클럽 반환
  };
}
