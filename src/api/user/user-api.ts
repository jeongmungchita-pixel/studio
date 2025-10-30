import { Firestore, collection, query, where, getDocs } from 'firebase/firestore';
import { BaseAPI } from '../base/base-api';
import { UserProfile, UserRole } from '@/types/auth';

/**
 * UserAPI 클래스
 * 사용자 관련 API 작업을 처리합니다.
 */
export class UserAPI extends BaseAPI<UserProfile> {
  protected collectionName = 'users';

  constructor(firestore: Firestore) {
    super(firestore);
  }

  /**
   * 사용자 프로필 조회
   */
  async getUserProfile(uid: string) {
    return this.findById(uid);
  }

  /**
   * 사용자 프로필 업데이트
   */
  async updateProfile(uid: string, updates: Partial<UserProfile>) {
    return this.update(uid, updates);
  }

  /**
   * 역할별 사용자 목록 조회
   */
  async getUsersByRole(role: UserRole) {
    return this.findMany({
      where: [{ field: 'role', operator: '==', value: role }],
      orderBy: [{ field: 'displayName', direction: 'asc' }],
    });
  }

  /**
   * 클럽별 사용자 목록 조회
   */
  async getUsersByClub(clubId: string) {
    return this.findMany({
      where: [{ field: 'clubId', operator: '==', value: clubId }],
      orderBy: [{ field: 'displayName', direction: 'asc' }],
    });
  }

  /**
   * 활성 사용자 목록 조회
   */
  async getActiveUsers() {
    return this.findMany({
      where: [{ field: 'status', operator: '==', value: 'active' }],
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    });
  }

  /**
   * 사용자 검색
   */
  async searchUsers(searchTerm: string, limit: number = 20) {
    // Firestore는 full-text search를 지원하지 않으므로
    // displayName과 email로 간단한 검색 구현
    const [nameResults, emailResults] = await Promise.all([
      this.findMany({
        where: [
          { field: 'displayName', operator: '>=', value: searchTerm },
          { field: 'displayName', operator: '<=', value: searchTerm + '\uf8ff' }
        ],
        limit,
      }),
      this.findMany({
        where: [
          { field: 'email', operator: '>=', value: searchTerm },
          { field: 'email', operator: '<=', value: searchTerm + '\uf8ff' }
        ],
        limit,
      }),
    ]);

    // 중복 제거 및 결합
    const allResults = [...nameResults.data, ...emailResults.data];
    const uniqueResults = allResults.filter((user, index, self) => 
      index === self.findIndex(u => u.id === user.id)
    );

    return {
      data: uniqueResults.slice(0, limit),
      success: true,
    };
  }

  /**
   * 사용자 통계 조회
   */
  async getUserStats() {
    const [totalUsers, activeUsers, pendingUsers] = await Promise.all([
      this.findMany(),
      this.findMany({
        where: [{ field: 'status', operator: '==', value: 'active' }],
      }),
      this.findMany({
        where: [{ field: 'status', operator: '==', value: 'pending' }],
      }),
    ]);

    return {
      data: {
        total: totalUsers.data.length,
        active: activeUsers.data.length,
        pending: pendingUsers.data.length,
        inactive: totalUsers.data.length - activeUsers.data.length - pendingUsers.data.length,
      },
      success: true,
    };
  }
}
