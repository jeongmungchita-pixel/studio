/**
 * 클럽 서비스
 * 클럽 도메인 비즈니스 로직을 처리합니다.
 */
import { apiClient, UnifiedAPIClient } from '@/lib/api/unified-api-client';
import { PaginatedResponse } from '@/types/api';
import { Club, ClubStats } from '@/types/club';

export interface ClubFilters {
  status?: 'active' | 'inactive' | 'pending' | 'suspended';
  region?: string;
  search?: string;
}

export interface CreateClubData extends Omit<Club, 'id' | 'createdAt' | 'updatedAt' | 'approvedAt' | 'approvedBy'> {}
export interface UpdateClubData extends Partial<Omit<Club, 'id' | 'createdAt'>> {}

export class ClubService {
  private static instance: ClubService;
  private readonly api: UnifiedAPIClient;

  private constructor(api: UnifiedAPIClient = apiClient) {
    this.api = api;
  }

  static getInstance(): ClubService {
    if (!ClubService.instance) {
      ClubService.instance = new ClubService();
    }
    return ClubService.instance;
  }

  // 목록 조회
  async getClubs(
    page: number = 1,
    pageSize: number = 20,
    filters?: ClubFilters,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedResponse<Club>> {
    return this.api.paginated<Club>(
      '/clubs',
      page,
      pageSize,
      { sortBy, sortOrder, ...filters }
    );
  }

  // 상세 조회
  async getClub(clubId: string): Promise<Club> {
    const response = await this.api.get<Club>(`/clubs/${clubId}`);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get club');
    }
    return response.data;
  }

  // 생성
  async createClub(data: CreateClubData): Promise<Club> {
    const response = await this.api.post<Club>('/clubs', data);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to create club');
    }
    return response.data;
  }

  // 수정
  async updateClub(clubId: string, data: UpdateClubData): Promise<Club> {
    const response = await this.api.put<Club>(`/clubs/${clubId}`, data);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to update club');
    }
    return response.data;
  }

  // 삭제
  async deleteClub(clubId: string): Promise<{ id: string }> {
    const response = await this.api.delete<{ id: string }>(`/clubs/${clubId}`);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to delete club');
    }
    return response.data;
  }

  // 검색
  async searchClubs(query: string): Promise<Club[]> {
    const response = await this.api.get<Club[]>('/clubs/search', { params: { q: query } });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to search clubs');
    }
    return response.data;
  }

  // 지역별 목록 (filters.region 활용)
  async getClubsByRegion(region: string): Promise<Club[]> {
    const response = await this.getClubs(1, 100, { region });
    return response.items;
  }

  // 전체 목록
  async getAll(): Promise<Club[]> {
    const response = await this.api.get<Club[]>('/clubs');
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get all clubs');
    }
    return response.data;
  }

  // 통계 조회
  async getClubStats(clubId: string): Promise<ClubStats> {
    const response = await this.api.get<ClubStats>(`/clubs/${clubId}/stats`);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get club stats');
    }
    return response.data;
  }

  // 상태 변경 (간단 위임)
  async changeClubStatus(clubId: string, status: 'active' | 'inactive' | 'pending' | 'suspended'): Promise<Club> {
    return this.updateClub(clubId, { status });
  }

  clearCache(): void {
    // 필요 시 구현
  }
}

export const clubService = ClubService.getInstance();
