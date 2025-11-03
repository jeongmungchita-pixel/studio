/**
 * 새로운 사용자 서비스 (Composition Root 기반)
 * - 기존 API와 호환성 유지
 * - 내부적으로는 새로운 DI 구조 사용
 */

import { UserProfile, UserRole } from '@/types/auth';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { getUserService } from '@/composition-root';

// 기존 인터페이스 유지를 위한 타입
export interface CreateUserData {
  email: string;
  password: string;
  displayName: string;
  role?: UserRole;
  clubId?: string;
  phoneNumber?: string;
}

export interface UpdateUserData {
  displayName?: string;
  role?: UserRole;
  clubId?: string;
  phoneNumber?: string;
  status?: 'active' | 'inactive' | 'pending';
}

export interface UserFilters {
  role?: UserRole;
  status?: string;
  clubId?: string;
}

/**
 * 새로운 사용자 서비스 (호환성 래퍼)
 */
export class UserServiceNew {
  private domainService = getUserService();

  /**
   * 사용자 목록 조회
   */
  async getUsers(
    page: number = 1,
    pageSize: number = 20,
    filters?: UserFilters,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<ApiResponse<PaginatedResponse<UserProfile>>> {
    // Note: sortBy/sortOrder는 현재 Firebase 어댑터에서 구현되지 않음
    return this.domainService.getUsers({
      page,
      pageSize,
      filters
    });
  }

  /**
   * ID로 사용자 조회
   */
  async getUserById(id: string): Promise<ApiResponse<UserProfile>> {
    try {
      const user = await this.domainService.getUserById(id);
      if (!user) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
            statusCode: 404
          },
          timestamp: new Date().toISOString()
        };
      }
      return {
        success: true,
        data: user,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error.message || 'Failed to fetch user',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 내 프로필 조회
   */
  async getMyProfile(): Promise<ApiResponse<UserProfile>> {
    // Note: 이 부분은 현재 사용자 컨텍스트가 필요
    // 실제 구현에서는 토큰에서 userId를 추출해야 함
    return {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'getMyProfile requires user context',
        statusCode: 501
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 내 프로필 업데이트
   */
  async updateMyProfile(data: UpdateUserData): Promise<ApiResponse<UserProfile>> {
    // Note: 이 부분은 현재 사용자 컨텍스트가 필요
    return {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'updateMyProfile requires user context',
        statusCode: 501
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 사용자 생성
   */
  async createUser(userData: CreateUserData): Promise<ApiResponse<UserProfile>> {
    return this.domainService.createUser(userData);
  }

  /**
   * 사용자 업데이트
   */
  async updateUser(id: string, data: UpdateUserData): Promise<ApiResponse<UserProfile>> {
    return this.domainService.updateUser(id, data);
  }

  /**
   * 사용자 삭제
   */
  async deleteUser(id: string): Promise<ApiResponse<{ id: string }>> {
    return this.domainService.deleteUser(id);
  }

  /**
   * 이메일로 사용자 찾기
   */
  async findUserByEmail(email: string): Promise<ApiResponse<UserProfile | null>> {
    try {
      const user = await this.domainService.getUserByEmail(email);
      return {
        success: true,
        data: user,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: error.message || 'Failed to find user by email',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 역할별 사용자 조회
   */
  async getUsersByRole(role: UserRole): Promise<ApiResponse<UserProfile[]>> {
    return this.domainService.getUsersByRole(role);
  }

  /**
   * 클럽별 사용자 조회
   */
  async getUsersByClub(clubId: string): Promise<ApiResponse<UserProfile[]>> {
    return this.domainService.getUsersByClub(clubId);
  }

  /**
   * 사용자 검색
   */
  async searchUsers(query: string, filters?: {
    role?: UserRole;
    clubId?: string;
  }): Promise<ApiResponse<UserProfile[]>> {
    return this.domainService.searchUsers(query, filters);
  }

  /**
   * 사용자 상태 변경
   */
  async changeUserStatus(userId: string, status: 'active' | 'inactive'): Promise<ApiResponse<UserProfile>> {
    return this.domainService.changeUserStatus(userId, status);
  }

  /**
   * 사용자 역할 변경
   */
  async changeUserRole(userId: string, role: UserRole): Promise<ApiResponse<UserProfile>> {
    return this.domainService.changeUserRole(userId, role);
  }

  /**
   * 사용자 클럽 변경
   */
  async changeUserClub(userId: string, clubId: string | null): Promise<ApiResponse<UserProfile>> {
    return this.domainService.updateUser(userId, { clubId: clubId || undefined });
  }

  /**
   * 사용자 활성화
   */
  async activateUser(userId: string): Promise<ApiResponse<UserProfile>> {
    return this.domainService.changeUserStatus(userId, 'active');
  }

  /**
   * 사용자 비활성화
   */
  async deactivateUser(userId: string): Promise<ApiResponse<UserProfile>> {
    return this.domainService.changeUserStatus(userId, 'inactive');
  }

  /**
   * 통계 조회
   */
  async getStatistics(): Promise<ApiResponse<{
    total: number;
    byRole: Record<UserRole, number>;
    byStatus: Record<string, number>;
    recentlyActive: number;
  }>> {
    return this.domainService.getUserStatistics();
  }

  // ============================================
  // 기존 호환성 메서드들
  // ============================================

  /**
   * Firebase 사용자 생성 처리 (내부용)
   */
  async handleFirebaseUserCreation(_user: any, _additionalData?: any): Promise<ApiResponse<UserProfile>> {
    // Note: 이 부분은 Firebase Auth 트리거용으로 별도 구현 필요
    return {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'handleFirebaseUserCreation requires Firebase Auth trigger context',
        statusCode: 501
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 캐시 초기화 (호환성)
   */
  clearCache(): void {
    // 새로운 구조에서는 캐시가 인프라 레벨에서 관리됨
    console.log('Cache clearing is now handled at infrastructure level');
  }

  // ============================================
  // 싱글톤 패턴 (기존 호환성)
  // ============================================

  private static instance: UserServiceNew;

  static getInstance(): UserServiceNew {
    if (!UserServiceNew.instance) {
      UserServiceNew.instance = new UserServiceNew();
    }
    return UserServiceNew.instance;
  }

  static getUserService(): UserServiceNew {
    return UserServiceNew.getInstance();
  }
}

/**
 * 전역 인스턴스 export
 */
export const userServiceNew = UserServiceNew.getInstance();
