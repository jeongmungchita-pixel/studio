/**
 * 사용자 도메인 서비스 (순수 DI)
 * - 인프라에 직접 의존하지 않음
 * - 포트(인터페이스)에만 의존
 */

import { AuthPort, UserRepositoryPort, StatisticsPort } from '@/ports';
import { UserProfile, UserRole } from '@/types/auth';
import { ApiResponse, PaginatedResponse } from '@/types/api';

export class UserService {
  constructor(
    private authPort: AuthPort,
    private userRepo: UserRepositoryPort,
    private statisticsPort: StatisticsPort
  ) {}

  /**
   * 사용자 생성
   */
  async createUser(userData: {
    email: string;
    password: string;
    displayName: string;
    role?: UserRole;
  }): Promise<ApiResponse<UserProfile>> {
    return this.authPort.createUser({
      ...userData,
      role: userData.role || UserRole.MEMBER
    });
  }

  /**
   * ID로 사용자 조회
   */
  async getUserById(id: string): Promise<UserProfile | null> {
    return this.userRepo.findById(id);
  }

  /**
   * 이메일로 사용자 조회
   */
  async getUserByEmail(email: string): Promise<UserProfile | null> {
    return this.userRepo.findByEmail(email);
  }

  /**
   * 사용자 정보 업데이트
   */
  async updateUser(id: string, data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    return this.userRepo.update(id, data);
  }

  /**
   * 사용자 삭제
   */
  async deleteUser(id: string): Promise<ApiResponse<{ id: string }>> {
    return this.userRepo.delete(id);
  }

  /**
   * 사용자 목록 조회
   */
  async getUsers(options?: {
    page?: number;
    pageSize?: number;
    filters?: {
      role?: UserRole;
      status?: string;
      clubId?: string;
    };
  }): Promise<ApiResponse<PaginatedResponse<UserProfile>>> {
    return this.userRepo.findAll(options);
  }

  /**
   * 사용자 역할 변경
   */
  async changeUserRole(userId: string, role: UserRole): Promise<ApiResponse<UserProfile>> {
    return this.authPort.updateUserRole(userId, role);
  }

  /**
   * 사용자 활성화/비활성화
   */
  async changeUserStatus(userId: string, status: 'active' | 'inactive'): Promise<ApiResponse<UserProfile>> {
    return this.userRepo.update(userId, { status });
  }

  /**
   * 사용자 통계 조회
   */
  async getUserStatistics(): Promise<ApiResponse<{
    total: number;
    byRole: Record<UserRole, number>;
    byStatus: Record<string, number>;
    recentlyActive: number;
  }>> {
    return this.statisticsPort.getUserStatistics();
  }

  /**
   * 토큰 검증 및 사용자 정보 조회
   */
  async verifyTokenAndGetUser(token: string): Promise<UserProfile | null> {
    return this.authPort.verifyIdToken(token);
  }

  /**
   * 역할별 사용자 조회
   */
  async getUsersByRole(role: UserRole): Promise<ApiResponse<UserProfile[]>> {
    const result = await this.userRepo.findAll({
      page: 1,
      pageSize: 100,
      filters: { role }
    });

    if (!result.success || !result.data) {
      return result;
    }

    return {
      success: true,
      data: result.data.items,
      timestamp: result.timestamp
    };
  }

  /**
   * 클럽별 사용자 조회
   */
  async getUsersByClub(clubId: string): Promise<ApiResponse<UserProfile[]>> {
    const result = await this.userRepo.findAll({
      page: 1,
      pageSize: 100,
      filters: { clubId }
    });

    if (!result.success || !result.data) {
      return result;
    }

    return {
      success: true,
      data: result.data.items,
      timestamp: result.timestamp
    };
  }

  /**
   * 사용자 검색
   */
  async searchUsers(query: string, filters?: {
    role?: UserRole;
    clubId?: string;
  }): Promise<ApiResponse<UserProfile[]>> {
    // Note: 이 부분은 SearchPort를 추가하면 더 좋음
    const result = await this.userRepo.findAll({
      page: 1,
      pageSize: 50,
      filters: {
        ...filters,
        // displayName 검색은 Firestore의 한계로 인해 제한적
      }
    });

    if (!result.success || !result.data) {
      return result;
    }

    // 클라이언트에서 추가 필터링 필요
    const filteredUsers = result.data.items.filter(user => 
      user.displayName?.toLowerCase().includes(query.toLowerCase()) ||
      user.email?.toLowerCase().includes(query.toLowerCase())
    );

    return {
      success: true,
      data: filteredUsers,
      timestamp: result.timestamp
    };
  }
}
