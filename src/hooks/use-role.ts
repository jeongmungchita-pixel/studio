'use client';

import { UserRole, hasEqualOrHigherRole, hasHigherRole, canManageUser, roleHierarchy } from '@/types';
import { useUser } from '@/hooks/use-user';

/**
 * 역할 관리를 위한 커스텀 훅
 * 
 * @example
 * const { userRole, isAdmin, canManage, hasRole } = useRole();
 * 
 * if (isAdmin) {
 *   // 관리자 전용 기능
 * }
 * 
 * if (canManage(UserRole.MEMBER)) {
 *   // 회원을 관리할 수 있음
 * }
 */
export function useRole() {
  const { user } = useUser();

  const userRole = user?.role as UserRole | undefined;

  // 특정 역할 이상인지 확인
  const hasRole = (role: UserRole): boolean => {
    if (!userRole) return false;
    return hasEqualOrHigherRole(userRole, role);
  };

  // 특정 역할보다 높은지 확인
  const isHigherThan = (role: UserRole): boolean => {
    if (!userRole) return false;
    return hasHigherRole(userRole, role);
  };

  // 특정 역할의 사용자를 관리할 수 있는지 확인
  const canManage = (targetRole: UserRole): boolean => {
    if (!userRole) return false;
    return canManageUser(userRole, targetRole);
  };

  // 권한 레벨 가져오기
  const getLevel = (): number => {
    if (!userRole) return 0;
    return roleHierarchy[userRole];
  };

  // 편의 속성들
  const isSuperAdmin = hasRole(UserRole.SUPER_ADMIN);
  const isFederationAdmin = hasRole(UserRole.FEDERATION_ADMIN);
  const isClubOwner = hasRole(UserRole.CLUB_OWNER);
  const isClubManager = hasRole(UserRole.CLUB_MANAGER);
  const isCoach = hasRole(UserRole.ASSISTANT_COACH);
  const isMember = userRole === UserRole.MEMBER;
  const isParent = userRole === UserRole.PARENT;

  // 관리자 여부 (연맹 관리자 이상)
  const isAdmin = hasRole(UserRole.FEDERATION_ADMIN);

  // 클럽 관리 권한 (클럽 매니저 이상)
  const canManageClub = hasRole(UserRole.CLUB_MANAGER);

  // 위원회 권한
  const isCommitteeMember = hasRole(UserRole.COMMITTEE_MEMBER);
  const isCommitteeChair = hasRole(UserRole.COMMITTEE_CHAIR);

  return {
    // 현재 역할
    userRole,
    level: getLevel(),

    // 권한 체크 함수
    hasRole,
    isHigherThan,
    canManage,

    // 편의 속성
    isSuperAdmin,
    isFederationAdmin,
    isAdmin,
    isClubOwner,
    isClubManager,
    canManageClub,
    isCoach,
    isMember,
    isParent,
    isCommitteeMember,
    isCommitteeChair,

    // 사용자 정보
    user,
  };
}
