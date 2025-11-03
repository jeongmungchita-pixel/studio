/**
 * 사용자 상태 관리 도메인 로직 테스트
 * 
 * 순수 비즈니스 로직만 검증함
 * - Mock 없음
 * - 실제 의존성 없음
 * - 빠르고 신뢰성 높음
 */

import { describe, it, expect } from 'vitest';
import { 
  canUpdateUserStatus, 
  updateUserStatus,
  canBulkUpdateUserStatus,
  generateStatusChangeStats,
  type User, 
  type StatusUpdateOptions 
} from '../status-management';

describe('User Status Management Domain Logic', () => {
  // 테스트 데이터 생성 헬퍼
  const createUser = (overrides: Partial<User> = {}): User => ({
    uid: 'user-123',
    email: 'user@test.com',
    role: 'MEMBER',
    status: 'pending', // 기본값 설정
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides
  });

  const createOptions = (overrides: Partial<StatusUpdateOptions> = {}): StatusUpdateOptions => ({
    performedBy: 'admin-123',
    ...overrides
  });

  describe('canUpdateUserStatus', () => {
    it('관리자는 모든 상태 변경이 가능해야 함', () => {
      const admin = createUser({ role: 'SUPER_ADMIN', status: 'pending' });
      const options = createOptions({ performerRole: 'SUPER_ADMIN' });

      // pending -> active
      expect(canUpdateUserStatus(admin, 'active', options).canUpdate).toBe(true);
      // active -> inactive
      expect(canUpdateUserStatus(createUser({ role: 'SUPER_ADMIN', status: 'active' }), 'inactive', options).canUpdate).toBe(true);
      // inactive -> pending
      expect(canUpdateUserStatus(createUser({ role: 'SUPER_ADMIN', status: 'inactive' }), 'pending', options).canUpdate).toBe(true);
    });

    it('클럽 관리자는 inactive로 변경할 수 없어야 함', () => {
      const clubManager = createUser({ role: 'MEMBER', status: 'active' }); // 일반 멤버로 변경
      const options = createOptions({ performerRole: 'CLUB_MANAGER' });

      const result = canUpdateUserStatus(clubManager, 'inactive', options);
      
      expect(result.canUpdate).toBe(false);
      expect(result.reason).toContain('비활성화할 수 없습니다');
    });

    it('클럽 관리자는 active/pending 변경은 가능해야 함', () => {
      const clubMember = createUser({ role: 'MEMBER', status: 'pending' }); // 일반 멤버로 변경
      const options = createOptions({ performerRole: 'CLUB_MANAGER' });

      expect(canUpdateUserStatus(clubMember, 'active', options).canUpdate).toBe(true);
      expect(canUpdateUserStatus(clubMember, 'pending', options).canUpdate).toBe(false); // 동일 상태
    });

    it('코치는 inactive로 변경할 수 없어야 함', () => {
      const coachMember = createUser({ role: 'MEMBER', status: 'active' }); // 일반 멤버로 변경
      const options = createOptions({ performerRole: 'HEAD_COACH' });

      const result = canUpdateUserStatus(coachMember, 'inactive', options);
      
      expect(result.canUpdate).toBe(false);
      expect(result.reason).toContain('비활성화할 수 없습니다');
    });

    it('일반 사용자는 상태를 변경할 수 없어야 함', () => {
      const member = createUser({ role: 'MEMBER' });
      const options = createOptions({ performerRole: 'MEMBER' });

      const result = canUpdateUserStatus(member, 'active', options);
      
      expect(result.canUpdate).toBe(false);
      expect(result.reason).toContain('상태 변경 권한이 없습니다');
    });

    it('동일한 상태로 변경할 수 없어야 함', () => {
      const user = createUser({ status: 'active' });
      const options = createOptions();

      const result = canUpdateUserStatus(user, 'active', options);
      
      expect(result.canUpdate).toBe(false);
      expect(result.reason).toBe('이미 동일한 상태입니다');
    });

    it('허용되지 않는 상태 전환은 불가능해야 함', () => {
      const user = createUser({ status: 'pending' });
      const options = createOptions();

      // pending -> pending (동일)
      expect(canUpdateUserStatus(user, 'pending', options).canUpdate).toBe(false);
      
      // 하지만 pending -> active, pending -> inactive는 가능
      expect(canUpdateUserStatus(user, 'active', options).canUpdate).toBe(true);
      expect(canUpdateUserStatus(user, 'inactive', options).canUpdate).toBe(true);
    });

    it('최근 로그인한 사용자를 비활성화할 때 경고가 생성되어야 함', () => {
      const recentUser = createUser({ 
        status: 'active',
        lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2일 전
      });
      const options = createOptions({ performerRole: 'SUPER_ADMIN' });

      const result = canUpdateUserStatus(recentUser, 'inactive', options);
      
      expect(result.canUpdate).toBe(true);
      expect(result.warnings).toContain('최근에 로그인한 사용자입니다. 비활성화 전에 사용자에게 통지하세요.');
    });
  });

  describe('updateUserStatus', () => {
    it('성공적으로 상태를 변경해야 함', () => {
      const user = createUser({ status: 'pending' });
      const options = createOptions({ performerRole: 'SUPER_ADMIN' });

      const result = updateUserStatus(user, 'active', options);

      expect(result.success).toBe(true);
      expect(result.user.status).toBe('active');
      expect(result.previousStatus).toBe('pending');
      expect(result.newStatus).toBe('active');
      expect(result.auditLog.action).toBe('USER_STATUS_UPDATED');
      expect(result.auditLog.performedBy).toBe('admin-123');
    });

    it('변경 불가능한 경우 에러를 던져야 함', () => {
      const member = createUser({ role: 'MEMBER' });
      const options = createOptions({ performerRole: 'MEMBER' });

      expect(() => {
        updateUserStatus(member, 'active', options);
      }).toThrow('상태 변경 권한이 없습니다');
    });

    it('경고가 있는 경우 결과에 포함해야 함', () => {
      const activeUser = createUser({ 
        status: 'active',
        lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      });
      const options = createOptions({ performerRole: 'SUPER_ADMIN' });

      const result = updateUserStatus(activeUser, 'inactive', options);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('활성 사용자를 비활성화하면 모든 접근 권한이 즉시 중단됩니다');
      expect(result.warnings).toContain('최근에 로그인한 사용자입니다. 비활성화 전에 사용자에게 통지하세요.');
    });

    it('업데이트 시간이 변경되어야 함', () => {
      const user = createUser({ 
        updatedAt: new Date('2024-01-01')
      });
      const options = createOptions({ performerRole: 'SUPER_ADMIN' });

      const result = updateUserStatus(user, 'active', options);
      
      expect(result.user.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
    });
  });

  describe('canBulkUpdateUserStatus', () => {
    it('모든 사용자가 변경 가능하면 통과해야 함', () => {
      const users = [
        createUser({ uid: 'user-1', role: 'SUPER_ADMIN' }),
        createUser({ uid: 'user-2', role: 'FEDERATION_ADMIN' })
      ];
      const options = createOptions({ performerRole: 'SUPER_ADMIN' });

      const result = canBulkUpdateUserStatus(users, 'active', options);

      expect(result.canUpdate).toBe(true);
      expect(result.userValidationResults).toHaveLength(2);
      expect(result.userValidationResults.every(r => r.canUpdate)).toBe(true);
    });

    it('일부 사용자가 변경 불가능하면 실패해야 함', () => {
      const users = [
        createUser({ uid: 'user-1', role: 'SUPER_ADMIN', status: 'pending' }),
        createUser({ uid: 'user-2', role: 'MEMBER', status: 'pending' })
      ];
      const options = createOptions({ performerRole: 'MEMBER' }); // 멤버는 권한 없음

      const result = canBulkUpdateUserStatus(users, 'active', options);

      expect(result.canUpdate).toBe(false);
      expect(result.reason).toContain('2명의 사용자 상태를 변경할 수 없습니다');
      expect(result.userValidationResults[0].canUpdate).toBe(false);
      expect(result.userValidationResults[1].canUpdate).toBe(false);
    });

    it('forceUpdate 옵션이 있으면 일부 실패도 통과해야 함', () => {
      const users = [
        createUser({ uid: 'user-1', role: 'SUPER_ADMIN', status: 'pending' }),
        createUser({ uid: 'user-2', role: 'MEMBER', status: 'pending' })
      ];
      const options = createOptions({ performerRole: 'MEMBER', forceUpdate: true });

      const result = canBulkUpdateUserStatus(users, 'active', options);

      expect(result.canUpdate).toBe(true); // forceUpdate는 항상 통과
      expect(result.userValidationResults[0].canUpdate).toBe(false);
      expect(result.userValidationResults[1].canUpdate).toBe(false);
    });
  });

  describe('generateStatusChangeStats', () => {
    it('상태 분포를 정확히 계산해야 함', () => {
      const users = [
        createUser({ status: 'pending' }),
        createUser({ status: 'pending' }),
        createUser({ status: 'active' }),
        createUser({ status: 'inactive' })
      ];

      const stats = generateStatusChangeStats(users);

      expect(stats.totalUsers).toBe(4);
      expect(stats.statusDistribution.pending).toBe(2);
      expect(stats.statusDistribution.active).toBe(1);
      expect(stats.statusDistribution.inactive).toBe(1);
    });

    it('특정 상태 사용자만 필터링해야 함', () => {
      const users = [
        createUser({ status: 'pending' }),
        createUser({ status: 'pending' }),
        createUser({ status: 'active' }),
        createUser({ status: 'inactive' })
      ];

      const pendingStats = generateStatusChangeStats(users, 'pending');
      const activeStats = generateStatusChangeStats(users, 'active');

      expect(pendingStats.totalUsers).toBe(2);
      expect(activeStats.totalUsers).toBe(1);
    });

    it('최근 상태 변경을 정확히 계산해야 함', () => {
      const now = new Date();
      const users = [
        createUser({ updatedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000) }), // 12시간 전
        createUser({ updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) }), // 2일 전
        createUser({ updatedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) }) // 10일 전
      ];

      const stats = generateStatusChangeStats(users);

      expect(stats.recentStatusChanges.last24Hours).toBe(1);
      expect(stats.recentStatusChanges.last7Days).toBe(2);
      expect(stats.recentStatusChanges.last30Days).toBe(3);
    });
  });

  describe('복잡한 비즈니스 시나리오', () => {
    it('연맹 관리자가 클럽 멤버 상태를 변경하는 시나리오', () => {
      const federationAdmin = createUser({ 
        role: 'FEDERATION_ADMIN',
        status: 'active'
      });
      
      const options = createOptions({ performedBy: federationAdmin.uid, performerRole: 'FEDERATION_ADMIN' });

      // 연맹 관리자는 모든 상태 변경 가능
      expect(canUpdateUserStatus(federationAdmin, 'inactive', options).canUpdate).toBe(true);
      
      const result = updateUserStatus(federationAdmin, 'inactive', options);
      expect(result.success).toBe(true);
      expect(result.user.status).toBe('inactive');
    });

    it('클럽 소유자가 비활성 멤버를 활성화하는 시나리오', () => {
      const clubMember = createUser({ 
        role: 'MEMBER', // 일반 멤버로 변경
        status: 'inactive',
        clubId: 'club-123'
      });
      
      const options = createOptions({ performedBy: 'admin-123', performerRole: 'CLUB_OWNER' });

      // 클럽 소유어는 inactive로 변경 불가, but 활성화는 가능
      expect(canUpdateUserStatus(clubMember, 'active', options).canUpdate).toBe(true);
      expect(canUpdateUserStatus(clubMember, 'inactive', options).canUpdate).toBe(false);
      
      const result = updateUserStatus(clubMember, 'active', options);
      expect(result.success).toBe(true);
      expect(result.user.status).toBe('active');
      expect(result.warnings).toContain('비활성 사용자를 활성화합니다. 모든 접근 권한이 복원됩니다');
    });

    it('대량 사용자 상태 변경 시나리오', () => {
      const users = [
        createUser({ uid: 'user-1', role: 'SUPER_ADMIN', status: 'pending' }),
        createUser({ uid: 'user-2', role: 'CLUB_MANAGER', status: 'pending' }),
        createUser({ uid: 'user-3', role: 'MEMBER', status: 'pending' }), // 실패 예상
        createUser({ uid: 'user-4', role: 'HEAD_COACH', status: 'pending' })
      ];
      
      const options = createOptions({ performerRole: 'MEMBER' }); // 멤버는 권한 없음

      // forceUpdate 없이 시도
      const withoutForce = canBulkUpdateUserStatus(users, 'active', options);
      expect(withoutForce.canUpdate).toBe(false);
      expect(withoutForce.userValidationResults.filter(r => !r.canUpdate)).toHaveLength(4);

      // SUPER_ADMIN으로 시도
      const withAdmin = canBulkUpdateUserStatus(users, 'active', { ...options, performerRole: 'SUPER_ADMIN' });
      expect(withAdmin.canUpdate).toBe(true);
      expect(withAdmin.userValidationResults.filter(r => r.canUpdate)).toHaveLength(4);
    });

    it('상태 변경 통계 및 리포팅 시나리오', () => {
      const now = new Date();
      const users = [
        createUser({ status: 'pending', updatedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000) }),
        createUser({ status: 'pending', updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) }),
        createUser({ status: 'active', updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) }),
        createUser({ status: 'inactive', updatedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) })
      ];

      const stats = generateStatusChangeStats(users);

      // 전체 통계
      expect(stats.totalUsers).toBe(4);
      expect(stats.statusDistribution.pending).toBe(2);
      expect(stats.statusDistribution.active).toBe(1);
      expect(stats.statusDistribution.inactive).toBe(1);

      // 최근 변경 통계
      expect(stats.recentStatusChanges.last24Hours).toBe(1);
      expect(stats.recentStatusChanges.last7Days).toBe(3);
      expect(stats.recentStatusChanges.last30Days).toBe(4);

      // 특정 상태 필터링
      const pendingStats = generateStatusChangeStats(users, 'pending');
      expect(pendingStats.totalUsers).toBe(2);
      expect(pendingStats.recentStatusChanges.last24Hours).toBe(1);
      expect(pendingStats.recentStatusChanges.last7Days).toBe(3); // 3개 모두 7일 이내
    });
  });
});
