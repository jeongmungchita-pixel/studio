/**
 * 새로운 멤버 서비스 (Composition Root 기반)
 * - 기존 API와 호환성 유지
 */

import { Member } from '@/types/member';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { getMemberService } from '@/composition-root';

export interface CreateMemberData {
  userId: string;
  clubId: string;
  name: string;
  email: string;
  phoneNumber?: string;
  birthDate?: Date;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  status?: 'active' | 'inactive';
}

export interface UpdateMemberData {
  name?: string;
  phoneNumber?: string;
  birthDate?: Date;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  status?: 'active' | 'inactive';
}

/**
 * 새로운 멤버 서비스 (호환성 래퍼)
 */
export class MemberServiceNew {
  private domainService = getMemberService();

  /**
   * 멤버 목록 조회
   */
  async getMembers(
    page: number = 1,
    pageSize: number = 20,
    filters?: Record<string, any>,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<ApiResponse<PaginatedResponse<Member>>> {
    return this.domainService.getAllMembers({
      page,
      pageSize,
      filters
    });
  }

  /**
   * ID로 멤버 조회
   */
  async getMemberById(id: string): Promise<ApiResponse<Member>> {
    try {
      const member = await this.domainService.getMemberById(id);
      if (!member) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Member not found',
            statusCode: 404
          },
          timestamp: new Date().toISOString()
        };
      }
      return {
        success: true,
        data: member,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error.message || 'Failed to fetch member',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 사용자 ID로 멤버들 조회
   */
  async getMembersByUserId(userId: string): Promise<ApiResponse<Member[]>> {
    try {
      const members = await this.domainService.getMembersByUserId(userId);
      return {
        success: true,
        data: members,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error.message || 'Failed to fetch members by user ID',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 클럽 ID로 멤버들 조회
   */
  async getMembersByClub(clubId: string): Promise<ApiResponse<Member[]>> {
    return this.domainService.getMembersByClub(clubId);
  }

  /**
   * 멤버 생성
   */
  async createMember(memberData: CreateMemberData): Promise<ApiResponse<Member>> {
    return this.domainService.createMember(memberData);
  }

  /**
   * 멤버 업데이트
   */
  async updateMember(id: string, data: UpdateMemberData): Promise<ApiResponse<Member>> {
    return this.domainService.updateMember(id, data);
  }

  /**
   * 멤버 삭제
   */
  async deleteMember(id: string): Promise<ApiResponse<{ id: string }>> {
    return this.domainService.deleteMember(id);
  }

  /**
   * 멤버 활성화
   */
  async activateMember(id: string): Promise<ApiResponse<Member>> {
    return this.domainService.updateMember(id, { status: 'active' });
  }

  /**
   * 멤버 비활성화
   */
  async deactivateMember(id: string): Promise<ApiResponse<Member>> {
    return this.domainService.updateMember(id, { status: 'inactive' });
  }

  // ============================================
  // 싱글톤 패턴 (기존 호환성)
  // ============================================

  private static instance: MemberServiceNew;

  static getInstance(): MemberServiceNew {
    if (!MemberServiceNew.instance) {
      MemberServiceNew.instance = new MemberServiceNew();
    }
    return MemberServiceNew.instance;
  }

  static getMemberService(): MemberServiceNew {
    return MemberServiceNew.getInstance();
  }
}

/**
 * 전역 인스턴스 export
 */
export const memberServiceNew = MemberServiceNew.getInstance();
