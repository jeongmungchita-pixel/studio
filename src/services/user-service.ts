/**
 * 사용자 서비스
 * 사용자 관련 비즈니스 로직을 처리합니다.
 */
import { apiClient, UnifiedAPIClient } from '@/lib/api/unified-api-client';
import { UserProfile, UserRole } from '@/types/auth';
import { PaginatedResponse } from '@/types/api';
export interface UserFilters {
  role?: UserRole;
  status?: 'pending' | 'active' | 'inactive' | 'deleted';
  clubId?: string;
}
export interface CreateUserData {
  email: string;
  name: string;
  role: UserRole;
  clubId?: string;
  phoneNumber?: string;
}
export interface UpdateUserData {
  name?: string;
  phoneNumber?: string;
  role?: UserRole;
  status?: 'pending' | 'active' | 'inactive';
  clubId?: string;
}
export class UserService {
  private static instance: UserService;
  private readonly api: UnifiedAPIClient;
  private constructor(api: UnifiedAPIClient = apiClient) {
    this.api = api;
  }
  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }
  /**
   * 사용자 목록 조회
   */
  async getUsers(
    page: number = 1,
    pageSize: number = 20,
    filters?: UserFilters,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedResponse<UserProfile>> {
    return this.api.paginated<UserProfile>(
      '/users',
      page,
      pageSize,
      {
        sortBy,
        sortOrder,
        ...filters
      }
    );
  }

  /**
   * 사용자 상세 조회
   */
  async getUser(userId: string): Promise<UserProfile> {
    const response = await this.api.get<UserProfile>(`/users/${userId}`);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get user');
    }
    return response.data;
  }

  /**
   * 사용자 생성
   */
  async createUser(data: CreateUserData): Promise<UserProfile> {
    const response = await this.api.post<UserProfile>('/users', data);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to create user');
    }
    return response.data;
  }

  /**
   * 사용자 정보 수정
   */
  async updateUser(userId: string, data: UpdateUserData): Promise<UserProfile> {
    const response = await this.api.put<UserProfile>(`/users/${userId}`, data);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to update user');
    }
    return response.data;
  }

  /**
   * 사용자 삭제
   */
  async deleteUser(userId: string): Promise<{ id: string }> {
    const response = await this.api.delete<{ id: string }>(`/users/${userId}`);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to delete user');
    }
    return response.data;
  }

  /**
   * 내 정보 조회
   */
  async getMyProfile(): Promise<UserProfile> {
    const response = await this.api.get<UserProfile>('/users/me');
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get my profile');
    }
    return response.data;
  }

  /**
   * 내 정보 수정
   */
  async updateMyProfile(data: Pick<UpdateUserData, 'name' | 'phoneNumber'>): Promise<UserProfile> {
    const response = await this.api.put<UserProfile>('/users/me', data);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to update my profile');
    }
    return response.data;
  }

  /**
   * 프로필 이미지 업로드
   */
  async uploadProfileImage(userId: string, file: File): Promise<{ url: string }> {
    const response = await this.api.upload(`/users/${userId}/photo`, file);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to upload photo');
    }
    return response.data as { url: string };
  }

  /**
   * 역할별 사용자 조회
   */
  async getUsersByRole(role: UserRole): Promise<UserProfile[]> {
    const response = await this.getUsers(1, 100, { role });
    return response.items;
  }
  /**
   * 클럽별 사용자 조회
   */
  async getUsersByClub(clubId: string): Promise<UserProfile[]> {
    const response = await this.getUsers(1, 100, { clubId });
    return response.items;
  }

  /**
   * 사용자 검색
   */
  async searchUsers(query: string): Promise<UserProfile[]> {
    const response = await this.api.get<UserProfile[]>('/users/search', {
      params: { q: query },
      loadingKey: 'search-users'
    });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to search users');
    }
    return response.data;
  }

  /**
   * 사용자 상태 변경
   */
  async changeUserStatus(
    userId: string, 
    status: 'pending' | 'active' | 'inactive'
  ): Promise<UserProfile> {
    return this.updateUser(userId, { status });
  }

  /**
   * 사용자 역할 변경
   */
  async changeUserRole(userId: string, role: UserRole): Promise<UserProfile> {
    return this.updateUser(userId, { role });
  }

  /**
   * 사용자 클럽 변경
   */
  async changeUserClub(userId: string, clubId: string | null): Promise<UserProfile> {
    return this.updateUser(userId, { clubId: clubId || undefined });
  }

  /**
   * 사용자 활성화
   */
  async activateUser(userId: string): Promise<UserProfile> {
    return this.changeUserStatus(userId, 'active');
  }

  /**
   * 사용자 비활성화
   */
  async deactivateUser(userId: string): Promise<UserProfile> {
    return this.changeUserStatus(userId, 'inactive');
  }

  /**
   * 대량 사용자 생성
   */
  async createBulkUsers(users: CreateUserData[]): Promise<UserProfile[]> {
    const response = await this.api.post<UserProfile[]>('/users/bulk', { users }, {
      loadingKey: 'create-bulk-users'
    });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to create bulk users');
    }
    return response.data;
  }

  /**
   * 대량 사용자 상태 변경
   */
  async bulkUpdateStatus(userIds: string[], status: UserProfile['status']): Promise<UserProfile[]> {
    const response = await this.api.post<UserProfile[]>('/users/bulk/status', {
      userIds,
      status
    });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to bulk update status');
    }
    return response.data;
  }

  /**
   * 사용자 내보내기 (CSV)
   */
  async exportUsers(filters?: UserFilters): Promise<void> {
    const params = filters ? { ...filters } : undefined;
    await this.api.download('/users/export', 'users.csv', { params });
  }

  /**
   * 사용자 통계 조회
   */
  async getStatistics(): Promise<{
    total: number;
    byRole: Record<UserRole, number>;
    byStatus: Record<string, number>;
    recentlyActive: number;
  }> {
    const response = await this.api.get<{
      total: number;
      byRole: Record<UserRole, number>;
      byStatus: Record<string, number>;
      recentlyActive: number;
    }>('/users/statistics');
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get statistics');
    }
    return response.data;
  }

  /**
   * 권한 확인
   */
  hasPermission(_user: UserProfile, requiredRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      [UserRole.SUPER_ADMIN]: 100,
      [UserRole.FEDERATION_ADMIN]: 90,
      [UserRole.FEDERATION_SECRETARIAT]: 85,
      [UserRole.COMMITTEE_CHAIR]: 80,
      [UserRole.COMMITTEE_MEMBER]: 75,
      [UserRole.CLUB_OWNER]: 70,
      [UserRole.CLUB_MANAGER]: 65,
      [UserRole.CLUB_STAFF]: 60,
      [UserRole.MEDIA_MANAGER]: 55,
      [UserRole.HEAD_COACH]: 50,
      [UserRole.ASSISTANT_COACH]: 45,
      [UserRole.MEMBER]: 30,
      [UserRole.PARENT]: 20,
      [UserRole.VENDOR]: 10
    };
    const userLevel = _user.role ? roleHierarchy[_user.role] ?? 0 : 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    return userLevel >= requiredLevel;
  }
  /**
   * 캐시 초기화
   */
  clearCache(): void {
    // 필요시 구현
  }
}
// 전역 인스턴스 export
export const userService = UserService.getInstance();
