/**
 * 클럽 도메인 서비스 (순수 DI)
 */
import { ClubRepositoryPort, MemberRepositoryPort, AuditPort } from '@/ports';
import { Club } from '@/types/club';
import { Member } from '@/types/member';
import { ApiResponse, PaginatedResponse } from '@/types/api';

export class ClubService {
  constructor(
    private clubRepo: ClubRepositoryPort,
    private memberRepo: MemberRepositoryPort,
    private auditPort: AuditPort
  ) {}

  async createClub(clubData: Omit<Club, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Club>> {
    const club: Club = {
      ...clubData,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await this.clubRepo.save(club);
    
    if (result.success) {
      await this.auditPort.logEvent({
        action: 'CLUB_CREATED',
        resourceId: club.id,
        metadata: { name: club.name }
      });
    }

    return result;
  }

  async getClubById(id: string): Promise<Club | null> {
    return this.clubRepo.findById(id);
  }

  async updateClub(id: string, data: Partial<Club>): Promise<ApiResponse<Club>> {
    const result = await this.clubRepo.update(id, data);
    
    if (result.success) {
      await this.auditPort.logEvent({
        action: 'CLUB_UPDATED',
        resourceId: id,
        metadata: data
      });
    }

    return result;
  }

  async deleteClub(id: string): Promise<ApiResponse<{ id: string }>> {
    // 클럽에 소속된 멤버들 확인
    const membersResult = await this.memberRepo.findByClub(id);
    
    if (membersResult.success && membersResult.data && membersResult.data.length > 0) {
      return {
        success: false,
        error: {
          code: 'CLUB_HAS_MEMBERS',
          message: 'Cannot delete club with active members',
          statusCode: 400
        },
        timestamp: new Date().toISOString()
      };
    }

    const result = await this.clubRepo.delete(id);
    
    if (result.success) {
      await this.auditPort.logEvent({
        action: 'CLUB_DELETED',
        resourceId: id
      });
    }

    return result;
  }

  async getAllClubs(options?: {
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<Club>>> {
    return this.clubRepo.findAll(options);
  }

  async getClubMembers(clubId: string): Promise<ApiResponse<Member[]>> {
    return this.memberRepo.findByClub(clubId);
  }

  async getClubMemberCount(clubId: string): Promise<ApiResponse<number>> {
    const membersResult = await this.memberRepo.findByClub(clubId);
    
    if (!membersResult.success) {
      return {
        success: false,
        error: membersResult.error,
        timestamp: membersResult.timestamp
      };
    }

    return {
      success: true,
      data: membersResult.data?.length || 0,
      timestamp: new Date().toISOString()
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
