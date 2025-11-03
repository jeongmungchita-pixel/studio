/**
 * 사용자-멤버 연결 도메인 로직 테스트
 * 
 * 이 테스트는 순수 비즈니스 로직만 검증함
 * - Mock 없음
 * - 실제 의존성 없음
 * - 빠르고 신뢰성 높음
 */

import { describe, it, expect } from 'vitest';
import { 
  canLinkUserToMember, 
  linkUserToMember, 
  unlinkUserFromMember,
  getLinkingStatus,
  type User, 
  type Member 
} from '../user-member-linking';

describe('User-Member Linking Domain Logic', () => {
  // 테스트 데이터
  const createUser = (overrides: Partial<User> = {}): User => ({
    uid: 'user-123',
    email: 'user@test.com',
    role: 'MEMBER',
    ...overrides
  });

  const createMember = (overrides: Partial<Member> = {}): Member => ({
    id: 'member-456',
    name: 'Test Member',
    email: 'member@test.com',
    clubId: 'club-789',
    status: 'active',
    ...overrides
  });

  describe('canLinkUserToMember', () => {
    it('유효한 사용자와 멤버는 연결 가능해야 함', () => {
      const user = createUser();
      const member = createMember();
      const options = { performedBy: 'admin-123' };

      const result = canLinkUserToMember(user, member, options);

      expect(result.canLink).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('ID가 없으면 연결 불가능해야 함', () => {
      const user = createUser({ uid: '' });
      const member = createMember();
      const options = { performedBy: 'admin-123' };

      const result = canLinkUserToMember(user, member, options);

      expect(result.canLink).toBe(false);
      expect(result.reason).toBe('사용자 ID와 멤버 ID는 필수입니다');
    });

    it('다른 클럽 소속이면 연결 불가능해야 함', () => {
      const user = createUser({ clubId: 'club-111' });
      const member = createMember({ clubId: 'club-222' });
      const options = { performedBy: 'admin-123' };

      const result = canLinkUserToMember(user, member, options);

      expect(result.canLink).toBe(false);
      expect(result.reason).toBe('동일한 클럽 소속이 아닙니다');
    });

    it('이미 연결된 사용자는 forceUpdate 없으면 연결 불가능해야 함', () => {
      const user = createUser({ linkedMemberId: 'other-member' });
      const member = createMember();
      const options = { performedBy: 'admin-123' };

      const result = canLinkUserToMember(user, member, options);

      expect(result.canLink).toBe(false);
      expect(result.reason).toContain('forceUpdate 옵션이 필요합니다');
    });

    it('이미 연결된 사용자는 forceUpdate 있으면 연결 가능해야 함', () => {
      const user = createUser({ linkedMemberId: 'other-member' });
      const member = createMember();
      const options = { performedBy: 'admin-123', forceUpdate: true };

      const result = canLinkUserToMember(user, member, options);

      expect(result.canLink).toBe(true);
    });

    it('비활성 멤버는 연결 불가능해야 함', () => {
      const user = createUser();
      const member = createMember({ status: 'inactive' });
      const options = { performedBy: 'admin-123' };

      const result = canLinkUserToMember(user, member, options);

      expect(result.canLink).toBe(false);
      expect(result.reason).toBe('활성 멤버만 연결할 수 있습니다');
    });
  });

  describe('linkUserToMember', () => {
    it('성공적으로 연결해야 함', () => {
      const user = createUser();
      const member = createMember();
      const options = { performedBy: 'admin-123' };

      const result = linkUserToMember(user, member, options);

      expect(result.success).toBe(true);
      expect(result.user.linkedMemberId).toBe(member.id);
      expect(result.member.linkedUserId).toBe(user.uid);
      expect(result.auditLog.action).toBe('USER_MEMBER_LINKED');
      expect(result.auditLog.performedBy).toBe('admin-123');
      expect(result.previousLink).toBeUndefined();
    });

    it('연결 불가능한 경우 에러를 던져야 함', () => {
      const user = createUser({ clubId: 'club-111' });
      const member = createMember({ clubId: 'club-222' });
      const options = { performedBy: 'admin-123' };

      expect(() => {
        linkUserToMember(user, member, options);
      }).toThrow('동일한 클럽 소속이 아닙니다');
    });

    it('기존 연결이 있으면 previousLink를 기록해야 함', () => {
      const user = createUser({ linkedMemberId: 'old-member' });
      const member = createMember({ linkedUserId: 'old-user' });
      const options = { performedBy: 'admin-123', forceUpdate: true };

      const result = linkUserToMember(user, member, options);

      expect(result.success).toBe(true);
      expect(result.previousLink).toEqual({
        userId: 'user-123',
        memberId: 'old-member'
      });
    });
  });

  describe('unlinkUserFromMember', () => {
    it('성공적으로 연결 해제해야 함', () => {
      const user = createUser({ linkedMemberId: 'member-456' });
      const member = createMember({ linkedUserId: 'user-123' });
      const performedBy = 'admin-123';

      const result = unlinkUserFromMember(user, member, performedBy);

      expect(result.success).toBe(true);
      expect(result.user.linkedMemberId).toBeUndefined();
      expect(result.member.linkedUserId).toBeUndefined();
      expect(result.auditLog.action).toBe('USER_MEMBER_UNLINKED');
      expect(result.previousLink).toEqual({
        userId: 'user-123',
        memberId: 'member-456'
      });
    });

    it('연결되지 않은 경우 에러를 던져야 함', () => {
      const user = createUser();
      const member = createMember();
      const performedBy = 'admin-123';

      expect(() => {
        unlinkUserFromMember(user, member, performedBy);
      }).toThrow('연결되지 않은 사용자와 멤버입니다');
    });
  });

  describe('getLinkingStatus', () => {
    it('정상적으로 연결된 상태를 감지해야 함', () => {
      const user = createUser({ linkedMemberId: 'member-456' });
      const member = createMember({ linkedUserId: 'user-123' });

      const status = getLinkingStatus(user, member);

      expect(status.isLinked).toBe(true);
      expect(status.userToMember).toBe(true);
      expect(status.memberToUser).toBe(true);
      expect(status.consistent).toBe(true);
    });

    it('일방향 연결을 감지해야 함', () => {
      const user = createUser({ linkedMemberId: 'member-456' });
      const member = createMember({ linkedUserId: undefined });

      const status = getLinkingStatus(user, member);

      expect(status.isLinked).toBe(false);
      expect(status.userToMember).toBe(true);
      expect(status.memberToUser).toBe(false);
      expect(status.consistent).toBe(false);
    });

    it('연결되지 않은 상태를 감지해야 함', () => {
      const user = createUser();
      const member = createMember();

      const status = getLinkingStatus(user, member);

      expect(status.isLinked).toBe(false);
      expect(status.userToMember).toBe(false);
      expect(status.memberToUser).toBe(false);
      expect(status.consistent).toBe(true);
    });
  });

  describe('복잡한 비즈니스 시나리오', () => {
    it('관리자가 사용자를 다른 멤버로 재연결하는 시나리오', () => {
      // 초기 상태: 사용자가 기존 멤버와 연결됨
      const user = createUser({ 
        linkedMemberId: 'old-member',
        clubId: 'club-789'
      });
      const oldMember = createMember({ 
        id: 'old-member',
        linkedUserId: 'user-123'  // 기존 연결 상태
      });
      
      // 새로운 멤버로 연결 시도
      const newMember = createMember({ 
        id: 'new-member',
        linkedUserId: undefined
      });
      
      const options = { performedBy: 'admin-123', forceUpdate: true };

      // 연결 가능 여부 확인
      const canLink = canLinkUserToMember(user, newMember, options);
      expect(canLink.canLink).toBe(true);

      // 연결 실행
      const result = linkUserToMember(user, newMember, options);

      // 결과 검증
      expect(result.success).toBe(true);
      expect(result.user.linkedMemberId).toBe('new-member');
      expect(result.member.linkedUserId).toBe('user-123');
      expect(result.previousLink?.userId).toBe('user-123');
      expect(result.previousLink?.memberId).toBe('old-member');
    });

    it('클럽 관리자가 자기 클럽 멤버만 연결할 수 있는 시나리오', () => {
      const clubManager = createUser({ 
        role: 'CLUB_MANAGER',
        clubId: 'club-789'
      });
      
      const sameClubMember = createMember({ clubId: 'club-789' });
      const differentClubMember = createMember({ clubId: 'club-999' });
      
      const options = { performedBy: clubManager.uid };

      // 같은 클럽 멤버는 연결 가능
      const sameClubResult = canLinkUserToMember(clubManager, sameClubMember, options);
      expect(sameClubResult.canLink).toBe(true);

      // 다른 클럽 멤버는 연결 불가능
      const differentClubResult = canLinkUserToMember(clubManager, differentClubMember, options);
      expect(differentClubResult.canLink).toBe(false);
      expect(differentClubResult.reason).toBe('동일한 클럽 소속이 아닙니다');
    });
  });
});
