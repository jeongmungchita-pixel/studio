/**
 * 멤버 도메인 서비스 (순수 DI)
 */
import { MemberRepositoryPort, AuditPort } from '@/ports';
import { Member } from '@/types/member';
import { ApiResponse, PaginatedResponse } from '@/types/api';

export class MemberService {
  constructor(
    private memberRepo: MemberRepositoryPort,
    private auditPort: AuditPort
  ) {}

  async createMember(memberData: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Member>> {
    const member: Member = {
      ...memberData,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await this.memberRepo.save(member);
    
    if (result.success) {
      await this.auditPort.logEvent({
        action: 'MEMBER_CREATED',
        resourceId: member.id,
        metadata: { clubId: member.clubId }
      });
    }

    return result;
  }

  async getMemberById(id: string): Promise<Member | null> {
    return this.memberRepo.findById(id);
  }

  async getMembersByUserId(userId: string): Promise<Member[]> {
    return this.memberRepo.findByUserId(userId);
  }

  async updateMember(id: string, data: Partial<Member>): Promise<ApiResponse<Member>> {
    const result = await this.memberRepo.update(id, data);
    
    if (result.success) {
      await this.auditPort.logEvent({
        action: 'MEMBER_UPDATED',
        resourceId: id,
        metadata: data
      });
    }

    return result;
  }

  async deleteMember(id: string): Promise<ApiResponse<{ id: string }>> {
    const result = await this.memberRepo.delete(id);
    
    if (result.success) {
      await this.auditPort.logEvent({
        action: 'MEMBER_DELETED',
        resourceId: id
      });
    }

    return result;
  }

  async getMembersByClub(clubId: string): Promise<ApiResponse<Member[]>> {
    return this.memberRepo.findByClub(clubId);
  }

  async getAllMembers(options?: {
    page?: number;
    pageSize?: number;
    filters?: Record<string, any>;
  }): Promise<ApiResponse<PaginatedResponse<Member>>> {
    return this.memberRepo.findAll(options);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
