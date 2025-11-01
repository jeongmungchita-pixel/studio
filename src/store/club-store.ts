'use client';
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { Club } from '@/types/club';
import { APIError } from '@/utils/error/api-error';
interface ClubStore {
  // 상태
  clubs: Club[];
  currentClub: Club | null;
  isLoading: boolean;
  error: APIError | null;
  lastUpdated: Date | null;
  // 액션
  setClubs: (clubs: Club[]) => void;
  setCurrentClub: (club: Club | null) => void;
  addClub: (club: Club) => void;
  updateClub: (clubId: string, updates: Partial<Club>) => void;
  removeClub: (clubId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: APIError | null) => void;
  reset: () => void;
  // 선택자 (computed values)
  getClubById: (clubId: string) => Club | undefined;
  getActiveClubs: () => Club[];
  getClubsByRegion: (region: string) => Club[];
}
/**
 * 클럽 상태 관리 Store
 */
export const useClubStore = create<ClubStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // 초기 상태
        clubs: [],
        currentClub: null,
        isLoading: false,
        error: null,
        lastUpdated: null,
        // 클럽 목록 설정
        setClubs: (clubs) => {
          set({
            clubs,
            lastUpdated: new Date(),
            error: null,
          });
        },
        // 현재 클럽 설정
        setCurrentClub: (club) => {
          set({ currentClub: club });
        },
        // 클럽 추가
        addClub: (club) => {
          set((state) => ({
            clubs: [...state.clubs, club],
            lastUpdated: new Date(),
          }));
        },
        // 클럽 업데이트
        updateClub: (clubId, updates) => {
          set((state) => ({
            clubs: state.clubs.map((club) =>
              club.id === clubId ? { ...club, ...updates } : club
            ),
            currentClub:
              state.currentClub?.id === clubId
                ? { ...state.currentClub, ...updates }
                : state.currentClub,
            lastUpdated: new Date(),
          }));
        },
        // 클럽 제거
        removeClub: (clubId) => {
          set((state) => ({
            clubs: state.clubs.filter((club) => club.id !== clubId),
            currentClub:
              state.currentClub?.id === clubId ? null : state.currentClub,
            lastUpdated: new Date(),
          }));
        },
        // 로딩 상태 설정
        setLoading: (isLoading) => {
          set({ isLoading });
        },
        // 에러 설정
        setError: (error) => {
          set({ error, isLoading: false });
        },
        // 상태 초기화
        reset: () => {
          set({
            clubs: [],
            currentClub: null,
            isLoading: false,
            error: null,
            lastUpdated: null,
          });
        },
        // 선택자들
        getClubById: (clubId) => {
          return get().clubs.find((club) => club.id === clubId);
        },
        getActiveClubs: () => {
          return get().clubs.filter((club) => club.status === 'active');
        },
        getClubsByRegion: (region) => {
          return get().clubs.filter((club) => club.address.includes(region));
        },
      }),
      {
        name: 'club-store',
        partialize: (state) => ({
          clubs: state.clubs,
          currentClub: state.currentClub,
          lastUpdated: state.lastUpdated,
        }),
      }
    )
  )
);
// 편의를 위한 선택자들
export const useClubs = () => useClubStore((state) => state.clubs);
export const useCurrentClub = () => useClubStore((state) => state.currentClub);
export const useClubLoading = () => useClubStore((state) => state.isLoading);
export const useClubError = () => useClubStore((state) => state.error);
// 특정 클럽 선택자
export const useClubById = (clubId: string) =>
  useClubStore((state) => state.getClubById(clubId));
// 활성 클럽 선택자
export const useActiveClubs = () =>
  useClubStore((state) => state.getActiveClubs());
// 지역별 클럽 선택자
export const useClubsByRegion = (region: string) =>
  useClubStore((state) => state.getClubsByRegion(region));
