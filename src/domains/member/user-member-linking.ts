/**
 * 사용자-멤버 연결 도메인 로직
 * 
 * 이 파일은 순수 비즈니스 규칙만 담고 있음
 * - 외부 의존성 없음 (Firebase, API 등)
 * - 순수 함수들로 구성
 * - 테스트하기 쉬움
 */

export interface User {
  uid: string;
  email: string;
  role: string;
  clubId?: string;
  linkedMemberId?: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  clubId: string;
  status: 'pending' | 'active' | 'inactive';
  linkedUserId?: string;
}

export interface LinkingOptions {
  forceUpdate?: boolean;
  performedBy: string;
}

export interface LinkingResult {
  success: boolean;
  user: User;
  member: Member;
  previousLink?: {
    userId: string;
    memberId: string;
  };
  auditLog: {
    action: string;
    performedBy: string;
    timestamp: Date;
    details: any;
  };
}

/**
 * 사용자-멤버 연결 가능 여부 검증
 */
export function canLinkUserToMember(user: User, member: Member, options: LinkingOptions): {
  canLink: boolean;
  reason?: string;
} {
  // 1. 기본 필수 조건 검증
  if (!user.uid || !member.id) {
    return { canLink: false, reason: '사용자 ID와 멤버 ID는 필수입니다' };
  }

  // 2. 클럽 소속 검증
  if (user.clubId && member.clubId && user.clubId !== member.clubId) {
    return { canLink: false, reason: '동일한 클럽 소속이 아닙니다' };
  }

  // 3. 기존 연결 상태 검증
  const userAlreadyLinked = user.linkedMemberId && user.linkedMemberId !== member.id;
  const memberAlreadyLinked = member.linkedUserId && member.linkedUserId !== user.uid;

  if (userAlreadyLinked || memberAlreadyLinked) {
    if (!options.forceUpdate) {
      return { 
        canLink: false, 
        reason: '이미 다른 사용자/멤버와 연결되어 있습니다. forceUpdate 옵션이 필요합니다.' 
      };
    }
  }

  // 4. 멤버 상태 검증
  if (member.status !== 'active') {
    return { canLink: false, reason: '활성 멤버만 연결할 수 있습니다' };
  }

  return { canLink: true };
}

/**
 * 사용자-멤버 연결 실행
 */
export function linkUserToMember(
  user: User, 
  member: Member, 
  options: LinkingOptions
): LinkingResult {
  // 연결 가능 여부 확인
  const validation = canLinkUserToMember(user, member, options);
  if (!validation.canLink) {
    throw new Error(validation.reason);
  }

  // 이전 연결 정보 저장
  const previousLink = (user.linkedMemberId && user.linkedMemberId !== member.id) ? {
    userId: user.uid,
    memberId: user.linkedMemberId
  } : (member.linkedUserId && member.linkedUserId !== user.uid) ? {
    userId: member.linkedUserId,
    memberId: member.id
  } : undefined;

  // 새로운 연결 생성
  const updatedUser: User = {
    ...user,
    linkedMemberId: member.id
  };

  const updatedMember: Member = {
    ...member,
    linkedUserId: user.uid
  };

  // 감사 로그 생성
  const auditLog = {
    action: 'USER_MEMBER_LINKED',
    performedBy: options.performedBy,
    timestamp: new Date(),
    details: {
      userId: user.uid,
      memberId: member.id,
      forceUpdate: options.forceUpdate,
      previousLink
    }
  };

  return {
    success: true,
    user: updatedUser,
    member: updatedMember,
    previousLink,
    auditLog
  };
}

/**
 * 연결 해제
 */
export function unlinkUserFromMember(
  user: User, 
  member: Member, 
  performedBy: string
): LinkingResult {
  if (user.linkedMemberId !== member.id || member.linkedUserId !== user.uid) {
    throw new Error('연결되지 않은 사용자와 멤버입니다');
  }

  const previousLink = {
    userId: user.uid,
    memberId: member.id
  };

  // 연결 해제
  const updatedUser: User = {
    ...user,
    linkedMemberId: undefined
  };

  const updatedMember: Member = {
    ...member,
    linkedUserId: undefined
  };

  const auditLog = {
    action: 'USER_MEMBER_UNLINKED',
    performedBy,
    timestamp: new Date(),
    details: {
      userId: user.uid,
      memberId: member.id,
      previousLink
    }
  };

  return {
    success: true,
    user: updatedUser,
    member: updatedMember,
    previousLink,
    auditLog
  };
}

/**
 * 연결 상태 확인
 */
export function getLinkingStatus(user: User, member: Member): {
  isLinked: boolean;
  userToMember: boolean;
  memberToUser: boolean;
  consistent: boolean;
} {
  const userToMember = user.linkedMemberId === member.id;
  const memberToUser = member.linkedUserId === user.uid;
  const isLinked = userToMember && memberToUser;
  const consistent = userToMember === memberToUser;

  return {
    isLinked,
    userToMember,
    memberToUser,
    consistent
  };
}
