/**
 * 사용자 상태 관리 스토어
 */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { UserStoreState } from './types';
import { UserProfile, UserRole } from '@/types/auth';
import { userService, UserFilters } from '@/services/user-service';
import { errorHandler } from '@/services/error-handler';

interface UserStoreActions {
  // 인증 액션
  setCurrentUser: (user: UserProfile | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  
  // 사용자 목록 액션
  fetchUsers: (page?: number, pageSize?: number) => Promise<void>;
  createUser: (data: any) => Promise<UserProfile>;
  updateUser: (userId: string, data: any) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  
  // 필터 액션
  setFilters: (filters: Partial<UserStoreState['filters']>) => void;
  clearFilters: () => void;
  search: (query: string) => void;
  
  // 선택 액션
  selectUser: (userId: string) => void;
  deselectUser: (userId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  
  // 페이지네이션 액션
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  setPageSize: (size: number) => Promise<void>;
  
  // 캐시 액션
  invalidateCache: () => void;
  refreshIfNeeded: () => Promise<void>;
  
  // 유틸리티
  getUserById: (userId: string) => UserProfile | undefined;
  getUsersByRole: (role: UserRole) => UserProfile[];
  getSelectedUsers: () => UserProfile[];
  reset: () => void;
}

type UserStore = UserStoreState & UserStoreActions;

const initialState: UserStoreState = {
  // 기본 상태
  isLoading: false,
  error: null,
  lastUpdated: null,
  
  // 현재 사용자
  currentUser: null,
  isAuthenticated: false,
  
  // 사용자 목록
  users: [],
  userMap: new Map(),
  
  // 페이지네이션
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    hasNext: false,
    hasPrev: false
  },
  
  // 필터
  filters: {},
  
  // 선택
  selectedUsers: new Set(),
  
  // 캐시
  cache: {
    timestamp: 0,
    ttl: 5 * 60 * 1000 // 5분
  }
};

export const useUserStore = create<UserStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,

          // 인증 액션
          setCurrentUser: (user) => set((state) => {
            state.currentUser = user;
            state.isAuthenticated = !!user;
          }),

          login: async (email, password) => {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            try {
              // 로그인 로직 (Firebase Auth 사용)
              // const user = await authService.login(email, password);
              // set((state) => {
              //   state.currentUser = user;
              //   state.isAuthenticated = true;
              // });
            } catch (error) {
              const errorInfo = errorHandler.handle(error, {
                action: 'login',
                component: 'UserStore'
              });
              set((state) => {
                state.error = new Error(errorInfo.userMessage);
              });
              throw error;
            } finally {
              set((state) => {
                state.isLoading = false;
              });
            }
          },

          logout: async () => {
            try {
              // 로그아웃 로직
              // await authService.logout();
              set((state) => {
                state.currentUser = null;
                state.isAuthenticated = false;
              });
            } catch (error) {
              errorHandler.handle(error, {
                action: 'logout',
                component: 'UserStore'
              });
            }
          },

          updateProfile: async (data) => {
            const { currentUser } = get();
            if (!currentUser) return;

            set((state) => {
              state.isLoading = true;
            });

            try {
              const updated = await userService.updateUser(currentUser.uid, data);
              set((state) => {
                state.currentUser = updated;
                // 목록에도 업데이트
                const index = state.users.findIndex(u => u.uid === updated.uid);
                if (index !== -1) {
                  state.users[index] = updated;
                }
                state.userMap.set(updated.uid, updated);
              });
            } catch (error) {
              errorHandler.handle(error, {
                action: 'updateProfile',
                component: 'UserStore'
              });
              throw error;
            } finally {
              set((state) => {
                state.isLoading = false;
              });
            }
          },

          // 사용자 목록 액션
          fetchUsers: async (page = 1, pageSize = 20) => {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            try {
              const { filters } = get();
              const response = await userService.getUsers(
                page,
                pageSize,
                filters,
                'createdAt',
                'desc'
              );

              set((state) => {
                state.users = response.items;
                state.userMap.clear();
                response.items.forEach(user => {
                  state.userMap.set(user.uid, user);
                });
                state.pagination = {
                  page: response.page,
                  pageSize: response.pageSize,
                  total: response.total,
                  hasNext: response.hasNext,
                  hasPrev: response.hasPrev
                };
                state.lastUpdated = new Date();
                state.cache.timestamp = Date.now();
              });
            } catch (error) {
              const errorInfo = errorHandler.handle(error, {
                action: 'fetchUsers',
                component: 'UserStore'
              });
              set((state) => {
                state.error = new Error(errorInfo.userMessage);
              });
            } finally {
              set((state) => {
                state.isLoading = false;
              });
            }
          },

          createUser: async (data) => {
            set((state) => {
              state.isLoading = true;
            });

            try {
              const newUser = await userService.createUser(data);
              
              // 옵티미스틱 업데이트
              set((state) => {
                state.users.unshift(newUser);
                state.userMap.set(newUser.uid, newUser);
                state.pagination.total += 1;
              });

              // 캐시 무효화
              get().invalidateCache();
              
              return newUser;
            } catch (error) {
              errorHandler.handle(error, {
                action: 'createUser',
                component: 'UserStore'
              });
              throw error;
            } finally {
              set((state) => {
                state.isLoading = false;
              });
            }
          },

          updateUser: async (userId, data) => {
            const originalUser = get().userMap.get(userId);
            
            // 옵티미스틱 업데이트
            set((state) => {
              const user = state.userMap.get(userId);
              if (user) {
                const updated = { ...user, ...data };
                state.userMap.set(userId, updated);
                const index = state.users.findIndex(u => u.uid === userId);
                if (index !== -1) {
                  state.users[index] = updated;
                }
              }
            });

            try {
              const updated = await userService.updateUser(userId, data);
              
              // 실제 데이터로 업데이트
              set((state) => {
                state.userMap.set(userId, updated);
                const index = state.users.findIndex(u => u.uid === userId);
                if (index !== -1) {
                  state.users[index] = updated;
                }
              });
            } catch (error) {
              // 롤백
              if (originalUser) {
                set((state) => {
                  state.userMap.set(userId, originalUser);
                  const index = state.users.findIndex(u => u.uid === userId);
                  if (index !== -1) {
                    state.users[index] = originalUser;
                  }
                });
              }
              errorHandler.handle(error, {
                action: 'updateUser',
                component: 'UserStore'
              });
              throw error;
            }
          },

          deleteUser: async (userId) => {
            const originalUser = get().userMap.get(userId);
            
            // 옵티미스틱 삭제
            set((state) => {
              state.userMap.delete(userId);
              state.users = state.users.filter(u => u.uid !== userId);
              state.selectedUsers.delete(userId);
              state.pagination.total -= 1;
            });

            try {
              await userService.deleteUser(userId);
            } catch (error) {
              // 롤백
              if (originalUser) {
                set((state) => {
                  state.userMap.set(userId, originalUser);
                  state.users.push(originalUser);
                  state.pagination.total += 1;
                });
              }
              errorHandler.handle(error, {
                action: 'deleteUser',
                component: 'UserStore'
              });
              throw error;
            }
          },

          // 필터 액션
          setFilters: (filters) => {
            set((state) => {
              state.filters = { ...state.filters, ...filters };
              state.pagination.page = 1; // 필터 변경 시 첫 페이지로
            });
            get().fetchUsers();
          },

          clearFilters: () => {
            set((state) => {
              state.filters = {};
              state.pagination.page = 1;
            });
            get().fetchUsers();
          },

          search: (query) => {
            set((state) => {
              state.filters.search = query;
              state.pagination.page = 1;
            });
            get().fetchUsers();
          },

          // 선택 액션
          selectUser: (userId) => {
            set((state) => {
              state.selectedUsers.add(userId);
            });
          },

          deselectUser: (userId) => {
            set((state) => {
              state.selectedUsers.delete(userId);
            });
          },

          selectAll: () => {
            set((state) => {
              state.users.forEach(user => {
                state.selectedUsers.add(user.uid);
              });
            });
          },

          clearSelection: () => {
            set((state) => {
              state.selectedUsers.clear();
            });
          },

          // 페이지네이션 액션
          nextPage: async () => {
            const { pagination } = get();
            if (pagination.hasNext) {
              await get().fetchUsers(pagination.page + 1, pagination.pageSize);
            }
          },

          prevPage: async () => {
            const { pagination } = get();
            if (pagination.hasPrev) {
              await get().fetchUsers(pagination.page - 1, pagination.pageSize);
            }
          },

          goToPage: async (page) => {
            const { pagination } = get();
            await get().fetchUsers(page, pagination.pageSize);
          },

          setPageSize: async (size) => {
            await get().fetchUsers(1, size);
          },

          // 캐시 액션
          invalidateCache: () => {
            set((state) => {
              state.cache.timestamp = 0;
            });
          },

          refreshIfNeeded: async () => {
            const { cache, pagination } = get();
            const now = Date.now();
            
            if (now - cache.timestamp > cache.ttl) {
              await get().fetchUsers(pagination.page, pagination.pageSize);
            }
          },

          // 유틸리티
          getUserById: (userId) => {
            return get().userMap.get(userId);
          },

          getUsersByRole: (role) => {
            return get().users.filter(user => user.role === role);
          },

          getSelectedUsers: () => {
            const { selectedUsers, userMap } = get();
            return Array.from(selectedUsers)
              .map(id => userMap.get(id))
              .filter(Boolean) as UserProfile[];
          },

          reset: () => {
            set(initialState);
          }
        }))
      ),
      {
        name: 'user-store',
        partialize: (state) => ({
          currentUser: state.currentUser,
          isAuthenticated: state.isAuthenticated
        })
      }
    ),
    {
      name: 'UserStore'
    }
  )
);

// 선택자 (Selectors)
export const useCurrentUser = () => useUserStore((state) => state.currentUser);
export const useIsAuthenticated = () => useUserStore((state) => state.isAuthenticated);
export const useUsers = () => useUserStore((state) => state.users);
export const useUsersPagination = () => useUserStore((state) => state.pagination);
export const useUsersFilters = () => useUserStore((state) => state.filters);
export const useSelectedUsers = () => useUserStore((state) => state.getSelectedUsers());

// 액션 선택자
export const useUserActions = () => useUserStore((state) => ({
  fetchUsers: state.fetchUsers,
  createUser: state.createUser,
  updateUser: state.updateUser,
  deleteUser: state.deleteUser,
  setFilters: state.setFilters,
  search: state.search
}));
