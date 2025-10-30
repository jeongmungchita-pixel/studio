import { Firestore } from 'firebase/firestore';
import { BaseAPI } from '../base/base-api';
import { Club } from '@/types/club';

/**
 * ClubAPI 클래스
 * 클럽 관련 API 작업을 처리합니다.
 */
export class ClubAPI extends BaseAPI<Club> {
  protected collectionName = 'clubs';

  constructor(firestore: Firestore) {
    super(firestore);
  }

  /**
   * 클럽 정보 조회
   */
  async getClub(clubId: string) {
    return this.findById(clubId);
  }

  /**
   * 클럽 정보 업데이트
   */
  async updateClub(clubId: string, updates: Partial<Club>) {
    // Firestore 호환 타입으로 변환
    const firestoreUpdates = { ...updates } as any;
    return this.update(clubId, firestoreUpdates);
  }

  /**
   * 활성 클럽 목록 조회
   */
  async getActiveClubs() {
    return this.findMany({
      where: [{ field: 'status', operator: '==', value: 'active' }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    });
  }

  /**
   * 클럽 검색
   */
  async searchClubs(searchTerm: string, limit: number = 20) {
    return this.findMany({
      where: [
        { field: 'name', operator: '>=', value: searchTerm },
        { field: 'name', operator: '<=', value: searchTerm + '\uf8ff' }
      ],
      limit,
    });
  }

  /**
   * 클럽 회원 수 조회
   */
  async getClubMemberCount(clubId: string) {
    // 실제로는 members 컬렉션을 조회해야 하지만
    // 여기서는 간단히 클럽 정보의 memberCount 필드 사용
    const club = await this.findById(clubId);
    return {
      data: club.data?.memberCount || 0,
      success: true,
    };
  }

  /**
   * 클럽 통계 조회
   */
  async getClubStats() {
    const [totalClubs, activeClubs] = await Promise.all([
      this.findMany(),
      this.findMany({
        where: [{ field: 'status', operator: '==', value: 'active' }],
      }),
    ]);

    return {
      data: {
        total: totalClubs.data.length,
        active: activeClubs.data.length,
        inactive: totalClubs.data.length - activeClubs.data.length,
      },
      success: true,
    };
  }
}
