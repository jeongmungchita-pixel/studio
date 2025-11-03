/**
 * 사용자 서비스 Hook (DI 적용)
 * - Composition Root에서 서비스 주입
 */
'use client';

import { useMemo } from 'react';
import { getUserService } from '@/composition-root';
import { UserService } from '@/domain/services/user.service';
import { UserProfile, UserRole } from '@/types/auth';
import { ApiResponse, PaginatedResponse } from '@/types/api';

/**
 * DI 적용 사용자 서비스 Hook
 */
export function useUserService(): UserService {
  return useMemo(() => getUserService(), []);
}

/**
 * 사용자 정보 조회 Hook
 */
export function useUser(id: string) {
  const userService = useUserService();

  return useMemo(() => ({
    getUser: async () => userService.getUserById(id),
    updateUser: async (data: Partial<UserProfile>) => 
      userService.updateUser(id, data),
    deleteUser: async () => userService.deleteUser(id),
  }), [userService, id]);
}

/**
 * 사용자 목록 조회 Hook
 */
export function useUsers(options?: {
  page?: number;
  pageSize?: number;
  filters?: {
    role?: UserRole;
    status?: string;
    clubId?: string;
  };
}) {
  const userService = useUserService();

  return useMemo(() => ({
    getUsers: async () => userService.getUsers(options),
    createUser: async (userData: {
      email: string;
      password: string;
      displayName: string;
      role: UserRole;
    }) => userService.createUser(userData),
  }), [userService, options]);
}

/**
 * 역할 관리 Hook
 */
export function useUserRoles() {
  const userService = useUserService();

  return useMemo(() => ({
    updateRole: async (userId: string, role: UserRole) => 
      userService.changeUserRole(userId, role),
    getUsersByRole: async (role: UserRole) => 
      userService.getUsers({ filters: { role } }),
  }), [userService]);
}
