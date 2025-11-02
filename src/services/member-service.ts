/**
 * 멤버 서비스
 * 멤버(회원) 관련 비즈니스 로직을 처리합니다.
 */
import { apiClient, ApiClient } from './api-client';
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
  private readonly api: ApiClient;

  private constructor(api: ApiClient = apiClient) {
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
    return this.api.getPaginated<Member>(
      '/members',
      { page, pageSize, sortBy, sortOrder, ...filters },
      { loadingKey: 'fetch-members' }
    );
  }

  // 상세 조회
  async getMember(memberId: string): Promise<Member> {
    return this.api.get<Member>(`/members/${memberId}`, { loadingKey: 'fetch-member' });
  }

  // 생성
  async createMember(data: CreateMemberData): Promise<Member> {
    return this.api.post<Member>('/members', data, { loadingKey: 'create-member' });
  }

  // 수정
  async updateMember(memberId: string, data: UpdateMemberData): Promise<Member> {
    return this.api.put<Member>(`/members/${memberId}`, data, { loadingKey: 'update-member' });
  }

  // 삭제
  async deleteMember(memberId: string): Promise<{ id: string }> {
    return this.api.delete<{ id: string }>(`/members/${memberId}`, { loadingKey: 'delete-member' });
  }

  // 검색
  async searchMembers(query: string): Promise<Member[]> {
    return this.api.get<Member[]>('/members/search', { params: { q: query }, loadingKey: 'search-members' });
  }

  // 클럽별 조회
  async getMembersByClub(clubId: string): Promise<Member[]> {
    const res = await this.getMembers(1, 100, { clubId });
    return res.items;
  }

  // 통계 조회
  async getMemberStats(): Promise<MemberStats> {
    return this.api.get<MemberStats>('/members/stats', { loadingKey: 'fetch-member-stats' });
  }

  // 보호자 링크/해제 (간단 API 위임 형태)
  async linkGuardian(memberId: string, guardianMemberId: string): Promise<Member> {
    return this.api.post<Member>(`/members/${memberId}/guardians`, { guardianMemberId }, { loadingKey: 'link-guardian' });
  }

  async unlinkGuardian(memberId: string, guardianMemberId: string): Promise<Member> {
    return this.api.delete<Member>(`/members/${memberId}/guardians/${guardianMemberId}`, { loadingKey: 'unlink-guardian' });
  }

  // 활성/비활성 처리
  async changeMemberStatus(memberId: string, status: 'pending' | 'active' | 'inactive'): Promise<Member> {
    return this.updateMember(memberId, { status });
  }

  // 캐시 초기화 (확장 포인트)
  clearCache(): void {
    // 필요 시 구현
  }
}

export const memberService = MemberService.getInstance();
