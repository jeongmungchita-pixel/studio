/**
 * 멤버 서비스 (클라이언트 사이드)
 * 멤버(회원) 관련 비즈니스 로직을 처리합니다.
 */
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

/**
 * 멤버 서비스 래퍼 (클라이언트 사이드)
 * - API 클라이언트를 통한 서버 통신
 * - 기존 API와 호환성 유지
 */
export class MemberService {
  private static instance: MemberService;

  private constructor() {}

  static getInstance(): MemberService {
    if (!MemberService.instance) {
      MemberService.instance = new MemberService();
    }
    return MemberService.instance;
  }

  /**
   * 멤버 목록 조회
   */
  async getMembers(options?: {
    page?: number;
    pageSize?: number;
    filters?: MemberFilters;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Member>> {
    // TODO: API 클라이언트를 통한 구현
    throw new Error('Client-side MemberService.getMembers not implemented yet');
  }

  /**
   * ID로 멤버 조회
   */
  async getMemberById(id: string): Promise<Member | null> {
    // TODO: API 클라이언트를 통한 구현
    throw new Error('Client-side MemberService.getMemberById not implemented yet');
  }

  /**
   * 사용자 ID로 멤버 조회
   */
  async getMemberByUserId(userId: string): Promise<Member | null> {
    // TODO: API 클라이언트를 통한 구현
    throw new Error('Client-side MemberService.getMemberByUserId not implemented yet');
  }

  /**
   * 멤버 생성
   */
  async createMember(memberData: CreateMemberData): Promise<Member> {
    // TODO: API 클라이언트를 통한 구현
    throw new Error('Client-side MemberService.createMember not implemented yet');
  }

  /**
   * 멤버 정보 업데이트
   */
  async updateMember(id: string, memberData: UpdateMemberData): Promise<Member> {
    // TODO: API 클라이언트를 통한 구현
    throw new Error('Client-side MemberService.updateMember not implemented yet');
  }

  /**
   * 멤버 삭제
   */
  async deleteMember(id: string): Promise<void> {
    // TODO: API 클라이언트를 통한 구현
    throw new Error('Client-side MemberService.deleteMember not implemented yet');
  }

  /**
   * 멤버 역할 변경
   */
  async changeMemberRole(id: string, role: string): Promise<Member> {
    // TODO: API 클라이언트를 통한 구현
    throw new Error('Client-side MemberService.changeMemberRole not implemented yet');
  }

  /**
   * 멤버 상태 변경
   */
  async changeMemberStatus(id: string, status: string): Promise<Member> {
    // TODO: API 클라이언트를 통한 구현
    throw new Error('Client-side MemberService.changeMemberStatus not implemented yet');
  }

  /**
   * 멤버 통계 조회
   */
  async getMemberStatistics(options?: {
    clubId?: string;
    category?: string;
  }): Promise<MemberStats> {
    // TODO: API 클라이언트를 통한 구현
    throw new Error('Client-side MemberService.getMemberStatistics not implemented yet');
  }

  /**
   * 멤버 검색
   */
  async searchMembers(query: string, options?: {
    clubId?: string;
    category?: string;
  }): Promise<Member[]> {
    // TODO: API 클라이언트를 통한 구현
    throw new Error('Client-side MemberService.searchMembers not implemented yet');
  }
}

/**
 * 싱글톤 인스턴스 내보내기
 */
export const memberService = MemberService.getInstance();

/**
 * 기존 코드와의 호환성을 위한 기본 내보내기
 */
export default memberService;
