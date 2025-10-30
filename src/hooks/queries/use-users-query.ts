/**
 * 사용자 관련 React Query 훅
 */

import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
  UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import { userService, UserFilters, CreateUserData, UpdateUserData } from '@/services/user-service';
import { UserProfile } from '@/types/auth';
import { PaginatedResponse } from '@/types/api';

// 쿼리 키 팩토리
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters?: UserFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  infinite: (filters?: UserFilters) => [...userKeys.all, 'infinite', filters] as const,
  me: () => ['user', 'me'] as const,
  stats: () => [...userKeys.all, 'stats'] as const,
};

/**
 * 사용자 목록 조회
 */
export function useUsersQuery(
  page: number = 1,
  pageSize: number = 20,
  filters?: UserFilters,
  options?: Omit<UseQueryOptions<PaginatedResponse<UserProfile>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userKeys.list({ ...filters, page, pageSize } as any),
    queryFn: () => userService.getUsers(page, pageSize, filters),
    ...options,
  });
}

/**
 * 사용자 상세 조회
 */
export function useUserQuery(
  userId: string,
  options?: Omit<UseQueryOptions<UserProfile>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => userService.getUser(userId),
    enabled: !!userId,
    ...options,
  });
}

/**
 * 내 정보 조회
 */
export function useMyProfileQuery(
  options?: Omit<UseQueryOptions<UserProfile>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: () => userService.getMyProfile(),
    staleTime: 1000 * 60 * 10, // 10분
    ...options,
  });
}

/**
 * 무한 스크롤 사용자 목록
 */
export function useUsersInfiniteQuery(
  pageSize: number = 20,
  filters?: UserFilters,
  options?: Omit<UseInfiniteQueryOptions<PaginatedResponse<UserProfile>>, 'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'>
) {
  return useInfiniteQuery({
    queryKey: userKeys.infinite(filters),
    queryFn: ({ pageParam }) => userService.getUsers(pageParam as number, pageSize, filters),
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNext) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    ...options,
  });
}

/**
 * 사용자 생성 뮤테이션
 */
export function useCreateUserMutation(
  options?: UseMutationOptions<UserProfile, Error, CreateUserData>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserData) => userService.createUser(data),
    onSuccess: (newUser) => {
      // 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      
      // 새 사용자를 캐시에 추가
      queryClient.setQueryData(userKeys.detail(newUser.uid), newUser);
    },
    ...options,
  });
}

/**
 * 사용자 수정 뮤테이션
 */
export function useUpdateUserMutation(
  options?: UseMutationOptions<UserProfile, Error, { userId: string; data: UpdateUserData }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }) => userService.updateUser(userId, data),
    onMutate: async ({ userId, data }): Promise<{ previousUser: UserProfile | undefined }> => {
      // 이전 데이터 백업
      await queryClient.cancelQueries({ queryKey: userKeys.detail(userId) });
      const previousUser = queryClient.getQueryData<UserProfile>(userKeys.detail(userId));

      // 옵티미스틱 업데이트
      if (previousUser) {
        queryClient.setQueryData(userKeys.detail(userId), {
          ...previousUser,
          ...data,
        });
      }

      return { previousUser };
    },
    onError: (err, { userId }, context) => {
      // 롤백
      if (context?.previousUser) {
        queryClient.setQueryData(userKeys.detail(userId), context.previousUser);
      }
    },
    onSettled: (data, error, { userId }) => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    ...options,
  });
}

/**
 * 사용자 삭제 뮤테이션
 */
export function useDeleteUserMutation(
  options?: UseMutationOptions<{ id: string }, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userService.deleteUser(userId),
    onMutate: async (userId): Promise<{ previousLists: [readonly unknown[], unknown][] }> => {
      // 목록에서 옵티미스틱 제거
      await queryClient.cancelQueries({ queryKey: userKeys.lists() });
      
      const previousLists = queryClient.getQueriesData({ queryKey: userKeys.lists() });
      
      queryClient.setQueriesData(
        { queryKey: userKeys.lists() },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items?.filter((user: UserProfile) => user.uid !== userId),
            total: old.total - 1,
          };
        }
      );

      return { previousLists };
    },
    onError: (err, userId, context) => {
      // 롤백
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    ...options,
  });
}

/**
 * 내 프로필 수정 뮤테이션
 */
export function useUpdateMyProfileMutation(
  options?: UseMutationOptions<UserProfile, Error, Pick<UpdateUserData, 'name' | 'phoneNumber'>>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => userService.updateMyProfile(data),
    onMutate: async (data): Promise<{ previousProfile: UserProfile | undefined }> => {
      await queryClient.cancelQueries({ queryKey: userKeys.me() });
      const previousProfile = queryClient.getQueryData<UserProfile>(userKeys.me());

      if (previousProfile) {
        queryClient.setQueryData(userKeys.me(), {
          ...previousProfile,
          ...data,
        });
      }

      return { previousProfile };
    },
    onError: (err, data, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(userKeys.me(), context.previousProfile);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me() });
    },
    ...options,
  });
}

/**
 * 사용자 통계 조회
 */
export function useUserStatsQuery(
  options?: UseQueryOptions<any>
) {
  return useQuery({
    queryKey: userKeys.stats(),
    queryFn: () => userService.getUserStats(),
    staleTime: 1000 * 60 * 30, // 30분
    ...options,
  });
}

/**
 * 프리페치 헬퍼
 */
export async function prefetchUser(queryClient: any, userId: string) {
  await queryClient.prefetchQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => userService.getUser(userId),
    staleTime: 1000 * 60 * 5,
  });
}

export async function prefetchUsers(queryClient: any, page = 1, pageSize = 20, filters?: UserFilters) {
  await queryClient.prefetchQuery({
    queryKey: userKeys.list({ ...filters, page, pageSize } as any),
    queryFn: () => userService.getUsers(page, pageSize, filters),
    staleTime: 1000 * 60 * 5,
  });
}
