/**
 * 사용자 서비스 (DI 기반)
 * 사용자 관련 비즈니스 로직을 처리합니다.
 */
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

/**
 * 사용자 서비스 래퍼 (클라이언트 사이드)
 * - API 클라이언트를 통한 서버 통신
 * - 기존 API와 호환성 유지
 */
export class UserService {
  private static instance: UserService;

  private constructor() {}

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * 사용자 목록 조회
   */
  async getUsers(options?: {
    page?: number;
    pageSize?: number;
    filters?: UserFilters;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<UserProfile>> {
    // TODO: API 클라이언트를 통한 구현
    throw new Error('Client-side UserService.getUsers not implemented yet');
  }

  /**
   * ID로 사용자 조회
   */
  async getUserById(id: string): Promise<UserProfile | null> {
    // TODO: API 클라이언트를 통한 구현
    throw new Error('Client-side UserService.getUserById not implemented yet');
  }

  /**
   * 이메일로 사용자 조회
   */
  async getUserByEmail(email: string): Promise<UserProfile | null> {
    // TODO: API 클라이언트를 통한 구현
    throw new Error('Client-side UserService.getUserByEmail not implemented yet');
  }

  /**
   * 사용자 생성
   */
  async createUser(userData: CreateUserData & { password?: string; displayName?: string; createdBy?: string }): Promise<UserProfile> {
    // TODO: API 클라이언트를 통한 구현
    throw new Error('Client-side UserService.createUser not implemented yet');
  }

  /**
   * 사용자 정보 업데이트
   */
  async updateUser(id: string, userData: UpdateUserData & { updatedAt?: Date; deletedAt?: Date; deletedBy?: string }): Promise<UserProfile> {
    // TODO: API 클라이언트를 통한 구현
    throw new Error('Client-side UserService.updateUser not implemented yet');
  }

  /**
   * 사용자 삭제
   */
  async deleteUser(id: string): Promise<void> {
    // TODO: API 클라이언트를 통한 구현
    throw new Error('Client-side UserService.deleteUser not implemented yet');
  }

  /**
   * 사용자 역할 변경
   */
  async changeUserRole(id: string, role: UserRole): Promise<UserProfile> {
    // TODO: API 클라이언트를 통한 구현
    throw new Error('Client-side UserService.changeUserRole not implemented yet');
  }
}

/**
 * 싱글톤 인스턴스 내보내기
 */
export const userService = UserService.getInstance();

/**
 * 기존 코드와의 호환성을 위한 기본 내보내기
 */
export default userService;
