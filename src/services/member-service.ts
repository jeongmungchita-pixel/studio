/**
 * 멤버 서비스
 * 멤버(회원) 관련 비즈니스 로직을 처리합니다.
 */
import { apiClient, UnifiedAPIClient } from '@/lib/api/unified-api-client';
import { PaginatedResponse } from '@/types/api';
import { Member, MemberStats } from '@/types/member';

export interface MemberFilters {
  status?: 'pending' | 'active' | 'inactive';
  clubId?: string;
  category?: 'adult' | 'child';
  search?: string;
}

export interface CreateMemberData extends Omit<Member, 'id' | 'createdAt' | 'updatedAt'> {}
export interface UpdateMemberData extends Partial<Omit<Member, 'id' | 'createdAt'>> {}

export class MemberService {
  private static instance: MemberService;
  private readonly api: UnifiedAPIClient;

  private constructor(api: UnifiedAPIClient = apiClient) {
    this.api = api;
  }

  static getInstance(): MemberService {
    if (!MemberService.instance) {
      MemberService.instance = new MemberService();
    }
    return MemberService.instance;
  }

  // 목록 조회
  async getMembers(
    page: number = 1,
    pageSize: number = 20,
    filters?: MemberFilters,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedResponse<Member>> {
    return this.api.paginated<Member>(
      '/members',
      page,
      pageSize,
      { sortBy, sortOrder, ...filters }
    );
  }

  // 상세 조회
  async getById(memberId: string): Promise<Member> {
    const response = await this.api.get<Member>(`/members/${memberId}`);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get member');
    }
    return response.data;
  }

  // 생성
  async create(data: CreateMemberData): Promise<Member> {
    const response = await this.api.post<Member>('/members', data);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to create member');
    }
    return response.data;
  }

  // 수정
  async update(memberId: string, data: UpdateMemberData): Promise<Member> {
    const response = await this.api.put<Member>(`/members/${memberId}`, data);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to update member');
    }
    return response.data;
  }

  // 삭제
  async delete(memberId: string): Promise<{ id: string }> {
    const response = await this.api.delete<{ id: string }>(`/members/${memberId}`);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to delete member');
    }
    return response.data;
  }

  // 검색
  async searchMembers(query: string): Promise<Member[]> {
    const response = await this.api.get<Member[]>('/members/search', { params: { q: query } });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to search members');
    }
    return response.data;
  }

  // 클럽별 조회
  async getMembersByClub(clubId: string): Promise<Member[]> {
    const res = await this.getMembers(1, 100, { clubId });
    return res.items;
  }

  // 통계 조회
  async getMemberStats(memberId?: string): Promise<MemberStats> {
    const url = memberId ? `/members/${memberId}/stats` : '/members/stats';
    const response = await this.api.get<MemberStats>(url);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get member stats');
    }
    return response.data;
  }

  // 보호자 링크/해제 (간단 API 위임 형태)
  async linkGuardian(memberId: string, guardianMemberId: string): Promise<Member> {
    const response = await this.api.post<Member>(`/members/${memberId}/guardians`, { guardianMemberId }, { loadingKey: 'link-guardian' });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to link guardian');
    }
    return response.data;
  }

  async unlinkGuardian(memberId: string, guardianMemberId: string): Promise<Member> {
    const response = await this.api.delete<Member>(`/members/${memberId}/guardians/${guardianMemberId}`, { loadingKey: 'unlink-guardian' });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to unlink guardian');
    }
    return response.data;
  }

  // 활성/비활성 처리
  async changeMemberStatus(memberId: string, status: Member['status']): Promise<Member> {
    return this.update(memberId, { status });
  }

  // 캐시 초기화 (확장 포인트)
  clearCache(): void {
    // 필요 시 구현
  }
}

export const memberService = MemberService.getInstance();
