/**
 * 새로운 클럽 서비스 (Composition Root 기반)
 * - 기존 API와 호환성 유지
 */

import { Club } from '@/types/club';
import { Member } from '@/types/member';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { getClubService } from '@/composition-root';

export interface CreateClubData {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  establishedDate?: Date;
  type?: 'sports' | 'academic' | 'cultural' | 'social' | 'other';
  status?: 'active' | 'inactive';
}

export interface UpdateClubData {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  establishedDate?: Date;
  type?: 'sports' | 'academic' | 'cultural' | 'social' | 'other';
  status?: 'active' | 'inactive';
}

/**
 * 새로운 클럽 서비스 (호환성 래퍼)
 */
export class ClubServiceNew {
  private domainService = getClubService();

  /**
   * 클럽 목록 조회
   */
  async getClubs(
    page: number = 1,
    pageSize: number = 20,
    filters?: Record<string, any>,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<ApiResponse<PaginatedResponse<Club>>> {
    return this.domainService.getAllClubs({
      page,
      pageSize
    });
  }

  /**
   * ID로 클럽 조회
   */
  async getClubById(id: string): Promise<ApiResponse<Club>> {
    try {
      const club = await this.domainService.getClubById(id);
      if (!club) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Club not found',
            statusCode: 404
          },
          timestamp: new Date().toISOString()
        };
      }
      return {
        success: true,
        data: club,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error.message || 'Failed to fetch club',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 클럽 생성
   */
  async createClub(clubData: CreateClubData): Promise<ApiResponse<Club>> {
    const fullClubData: Omit<Club, 'id' | 'createdAt' | 'updatedAt'> = {
      name: clubData.name,
      description: clubData.description || '',
      address: clubData.address || '',
      phoneNumber: clubData.phone || '',
      email: clubData.email || '',
      website: clubData.website,
      ownerId: '', // TODO: Get from context/auth
      ownerName: '', // TODO: Get from context/auth
      contactName: '',
      contactEmail: '',
      contactPhoneNumber: '',
      status: clubData.status || 'active',
      facilities: [],
      capacity: 0,
      operatingHours: {},
      location: undefined,
      logoURL: undefined,
      images: undefined,
      memberCount: 0,
      activeClassCount: 0,
      coachCount: 0
    };
    
    return this.domainService.createClub(fullClubData);
  }

  /**
   * 클럽 업데이트
   */
  async updateClub(id: string, data: UpdateClubData): Promise<ApiResponse<Club>> {
    return this.domainService.updateClub(id, data);
  }

  /**
   * 클럽 삭제
   */
  async deleteClub(id: string): Promise<ApiResponse<{ id: string }>> {
    return this.domainService.deleteClub(id);
  }

  /**
   * 클럽 멤버들 조회
   */
  async getClubMembers(clubId: string): Promise<ApiResponse<Member[]>> {
    return this.domainService.getClubMembers(clubId);
  }

  /**
   * 클럽 멤버 수 조회
   */
  async getClubMemberCount(clubId: string): Promise<ApiResponse<number>> {
    return this.domainService.getClubMemberCount(clubId);
  }

  /**
   * 클럽 활성화
   */
  async activateClub(id: string): Promise<ApiResponse<Club>> {
    return this.domainService.updateClub(id, { status: 'active' });
  }

  /**
   * 클럽 비활성화
   */
  async deactivateClub(id: string): Promise<ApiResponse<Club>> {
    return this.domainService.updateClub(id, { status: 'inactive' });
  }

  // ============================================
  // 싱글톤 패턴 (기존 호환성)
  // ============================================

  private static instance: ClubServiceNew;

  static getInstance(): ClubServiceNew {
    if (!ClubServiceNew.instance) {
      ClubServiceNew.instance = new ClubServiceNew();
    }
    return ClubServiceNew.instance;
  }

  static getClubService(): ClubServiceNew {
    return ClubServiceNew.getInstance();
  }
}

/**
 * 전역 인스턴스 export
 */
export const clubServiceNew = ClubServiceNew.getInstance();
