/**
 * 클럽 서비스
 * 클럽 도메인 비즈니스 로직을 처리합니다.
 */
import { apiClient, ApiClient } from './api-client';
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
  private readonly api: ApiClient;

  private constructor(api: ApiClient = apiClient) {
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
    return this.api.getPaginated<Club>(
      '/clubs',
      { page, pageSize, sortBy, sortOrder, ...filters },
      { loadingKey: 'fetch-clubs' }
    );
  }

  // 상세 조회
  async getClub(clubId: string): Promise<Club> {
    return this.api.get<Club>(`/clubs/${clubId}`, { loadingKey: 'fetch-club' });
  }

  // 생성
  async createClub(data: CreateClubData): Promise<Club> {
    return this.api.post<Club>('/clubs', data, { loadingKey: 'create-club' });
  }

  // 수정
  async updateClub(clubId: string, data: UpdateClubData): Promise<Club> {
    return this.api.put<Club>(`/clubs/${clubId}`, data, { loadingKey: 'update-club' });
  }

  // 삭제
  async deleteClub(clubId: string): Promise<{ id: string }> {
    return this.api.delete<{ id: string }>(`/clubs/${clubId}`, { loadingKey: 'delete-club' });
  }

  // 검색
  async searchClubs(query: string): Promise<Club[]> {
    return this.api.get<Club[]>('/clubs/search', { params: { q: query }, loadingKey: 'search-clubs' });
  }

  // 지역별 목록 (filters.region 활용)
  async getClubsByRegion(region: string): Promise<Club[]> {
    const res = await this.getClubs(1, 100, { region });
    return res.items;
  }

  // 통계 조회
  async getClubStats(clubId: string): Promise<ClubStats> {
    return this.api.get<ClubStats>(`/clubs/${clubId}/stats`, { loadingKey: 'fetch-club-stats' });
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
