'use client';

import { UserRole } from '@/types/auth';

// ============================================
// 👥 역할 및 권한 상수
// ============================================

// 역할별 표시 이름
export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: '최고 관리자',
  [UserRole.FEDERATION_ADMIN]: '연맹 관리자',
  [UserRole.FEDERATION_SECRETARIAT]: '연맹 사무국',
  [UserRole.COMMITTEE_CHAIR]: '위원회 위원장',
  [UserRole.COMMITTEE_MEMBER]: '위원회 위원',
  [UserRole.CLUB_OWNER]: '클럽 오너',
  [UserRole.CLUB_MANAGER]: '클럽 매니저',
  [UserRole.CLUB_STAFF]: '클럽 스태프',
  [UserRole.MEDIA_MANAGER]: '미디어 매니저',
  [UserRole.HEAD_COACH]: '헤드 코치',
  [UserRole.ASSISTANT_COACH]: '어시스턴트 코치',
  [UserRole.MEMBER]: '회원',
  [UserRole.PARENT]: '학부모',
  [UserRole.VENDOR]: '벤더',
};

// 역할별 색상 (배지용)
export const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: '#dc2626', // red-600
  [UserRole.FEDERATION_ADMIN]: '#ea580c', // orange-600
  [UserRole.FEDERATION_SECRETARIAT]: '#d97706', // amber-600
  [UserRole.COMMITTEE_CHAIR]: '#ca8a04', // yellow-600
  [UserRole.COMMITTEE_MEMBER]: '#65a30d', // lime-600
  [UserRole.CLUB_OWNER]: '#16a34a', // green-600
  [UserRole.CLUB_MANAGER]: '#059669', // emerald-600
  [UserRole.CLUB_STAFF]: '#0891b2', // cyan-600
  [UserRole.MEDIA_MANAGER]: '#0284c7', // sky-600
  [UserRole.HEAD_COACH]: '#2563eb', // blue-600
  [UserRole.ASSISTANT_COACH]: '#4f46e5', // indigo-600
  [UserRole.MEMBER]: '#7c3aed', // violet-600
  [UserRole.PARENT]: '#9333ea', // purple-600
  [UserRole.VENDOR]: '#c2410c', // orange-700
};

// ============================================
// 🏛️ 역할 계층 구조 (Role Hierarchy)
// ============================================

/**
 * 역할 계층 구조 - 숫자가 높을수록 상위 권한
 * 상위 역할은 하위 역할의 모든 권한을 포함함
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 100,           // 최고 관리자 (모든 권한)
  [UserRole.FEDERATION_ADMIN]: 90,       // 연맹 관리자
  [UserRole.FEDERATION_SECRETARIAT]: 80, // 연맹 사무국
  [UserRole.COMMITTEE_CHAIR]: 70,        // 위원회 위원장
  [UserRole.COMMITTEE_MEMBER]: 60,       // 위원회 위원
  [UserRole.CLUB_OWNER]: 50,             // 클럽 오너
  [UserRole.CLUB_MANAGER]: 40,           // 클럽 매니저
  [UserRole.HEAD_COACH]: 35,             // 헤드 코치
  [UserRole.MEDIA_MANAGER]: 30,          // 미디어 매니저
  [UserRole.CLUB_STAFF]: 25,             // 클럽 스태프
  [UserRole.ASSISTANT_COACH]: 20,        // 어시스턴트 코치
  [UserRole.MEMBER]: 10,                 // 일반 회원
  [UserRole.PARENT]: 5,                  // 학부모
  [UserRole.VENDOR]: 1,                  // 벤더 (최소 권한)
};

/**
 * 역할 간 권한 상속 확인
 * @param userRole 사용자 역할
 * @param requiredRole 필요한 역할
 * @returns 권한이 있으면 true
 */
export function hasRoleOrHigher(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * 사용자가 특정 권한을 가지고 있는지 확인
 * @param userRole 사용자 역할
 * @param permission 권한 배열
 * @returns 권한이 있으면 true
 */
export function hasPermission(userRole: UserRole, permission: UserRole[]): boolean {
  return permission.includes(userRole);
}

/**
 * 사용자가 다른 사용자를 관리할 수 있는지 확인
 * @param managerRole 관리자 역할
 * @param targetRole 대상 역할
 * @returns 관리 권한이 있으면 true
 */
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * 역할의 상위 역할들 가져오기
 * @param role 기준 역할
 * @returns 상위 역할 배열
 */
export function getSuperiorRoles(role: UserRole): UserRole[] {
  const currentLevel = ROLE_HIERARCHY[role];
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level > currentLevel)
    .map(([roleKey, _]) => roleKey as UserRole)
    .sort((a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]);
}

/**
 * 역할의 하위 역할들 가져오기
 * @param role 기준 역할
 * @returns 하위 역할 배열
 */
export function getSubordinateRoles(role: UserRole): UserRole[] {
  const currentLevel = ROLE_HIERARCHY[role];
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level < currentLevel)
    .map(([roleKey, _]) => roleKey as UserRole)
    .sort((a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]);
}

/**
 * 역할의 레벨 가져오기
 * @param role 역할
 * @returns 레벨 (0-100)
 */
export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY[role];
}

/**
 * 최고 권한 역할인지 확인
 * @param role 역할
 * @returns 최고 권한이면 true
 */
export function isTopRole(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN;
}

/**
 * 관리자 역할인지 확인 (레벨 70 이상)
 * @param role 역할
 * @returns 관리자면 true
 */
export function isAdminRole(role: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= 70;
}

/**
 * 클럽 관련 역할인지 확인
 * @param role 역할
 * @returns 클럽 관련 역할이면 true
 */
export function isClubRole(role: UserRole): boolean {
  return (ROLE_GROUPS.CLUB_MANAGEMENT as readonly UserRole[]).includes(role) || (ROLE_GROUPS.COACHING as readonly UserRole[]).includes(role);
}

// 역할 그룹
export const ROLE_GROUPS = {
  ADMIN: [
    UserRole.SUPER_ADMIN,
    UserRole.FEDERATION_ADMIN,
    UserRole.FEDERATION_SECRETARIAT,
  ],
  
  COMMITTEE: [
    UserRole.COMMITTEE_CHAIR,
    UserRole.COMMITTEE_MEMBER,
  ],
  
  CLUB_MANAGEMENT: [
    UserRole.CLUB_OWNER,
    UserRole.CLUB_MANAGER,
    UserRole.CLUB_STAFF,
    UserRole.MEDIA_MANAGER,
  ],
  
  COACHING: [
    UserRole.HEAD_COACH,
    UserRole.ASSISTANT_COACH,
  ],
  
  MEMBERS: [
    UserRole.MEMBER,
    UserRole.PARENT,
  ],
  
  EXTERNAL: [
    UserRole.VENDOR,
  ],
} as const;

// 권한 매트릭스
export const PERMISSIONS = {
  // 클럽 관리
  MANAGE_CLUBS: [
    UserRole.SUPER_ADMIN,
    UserRole.FEDERATION_ADMIN,
  ],
  
  // 회원 관리
  MANAGE_ALL_MEMBERS: [
    UserRole.SUPER_ADMIN,
    UserRole.FEDERATION_ADMIN,
  ],
  
  MANAGE_CLUB_MEMBERS: [
    UserRole.SUPER_ADMIN,
    UserRole.FEDERATION_ADMIN,
    UserRole.CLUB_OWNER,
    UserRole.CLUB_MANAGER,
  ],
  
  // 대회 관리
  MANAGE_COMPETITIONS: [
    UserRole.SUPER_ADMIN,
    UserRole.FEDERATION_ADMIN,
    UserRole.COMMITTEE_CHAIR,
  ],
  
  // 위원회 관리
  MANAGE_COMMITTEES: [
    UserRole.SUPER_ADMIN,
    UserRole.FEDERATION_ADMIN,
  ],
  
  // 심사위원 관리
  MANAGE_JUDGES: [
    UserRole.SUPER_ADMIN,
    UserRole.FEDERATION_ADMIN,
    UserRole.COMMITTEE_CHAIR,
  ],
  
  // 클럽 운영
  MANAGE_CLASSES: [
    UserRole.CLUB_OWNER,
    UserRole.CLUB_MANAGER,
    UserRole.HEAD_COACH,
  ],
  
  MANAGE_ATTENDANCE: [
    UserRole.CLUB_OWNER,
    UserRole.CLUB_MANAGER,
    UserRole.CLUB_STAFF,
    UserRole.HEAD_COACH,
    UserRole.ASSISTANT_COACH,
  ],
  
  MANAGE_PASSES: [
    UserRole.CLUB_OWNER,
    UserRole.CLUB_MANAGER,
  ],
  
  MANAGE_PAYMENTS: [
    UserRole.CLUB_OWNER,
    UserRole.CLUB_MANAGER,
  ],
  
  // 미디어 관리
  MANAGE_MEDIA: [
    UserRole.CLUB_OWNER,
    UserRole.CLUB_MANAGER,
    UserRole.MEDIA_MANAGER,
  ],
  
  // 메시지 발송
  SEND_MESSAGES: [
    UserRole.CLUB_OWNER,
    UserRole.CLUB_MANAGER,
    UserRole.CLUB_STAFF,
    UserRole.HEAD_COACH,
  ],
  
  // 레벨 테스트
  MANAGE_LEVEL_TESTS: [
    UserRole.CLUB_OWNER,
    UserRole.CLUB_MANAGER,
    UserRole.HEAD_COACH,
  ],
  
  EVALUATE_LEVEL_TESTS: [
    UserRole.CLUB_OWNER,
    UserRole.CLUB_MANAGER,
    UserRole.HEAD_COACH,
    UserRole.ASSISTANT_COACH,
  ],
} as const;

// 권한 체크 유틸리티
export const roleUtils = {
  hasPermission: (userRole: UserRole, permission: keyof typeof PERMISSIONS): boolean => {
    return (PERMISSIONS[permission] as readonly UserRole[]).includes(userRole);
  },
  
  getRoleGroup: (role: UserRole): string | null => {
    for (const [groupName, roles] of Object.entries(ROLE_GROUPS)) {
      if ((roles as readonly UserRole[]).includes(role)) {
        return groupName.toLowerCase();
      }
    }
    return null;
  },
  
  getRoleLabel: (role: UserRole): string => {
    return ROLE_LABELS[role] || role;
  },
  
  getRoleColor: (role: UserRole): string => {
    return ROLE_COLORS[role] || '#6b7280'; // gray-500 as default
  },
  
  isAdminRole: (role: UserRole): boolean => {
    return (ROLE_GROUPS.ADMIN as readonly UserRole[]).includes(role);
  },
  
  isClubRole: (role: UserRole): boolean => {
    return (ROLE_GROUPS.CLUB_MANAGEMENT as readonly UserRole[]).includes(role) || (ROLE_GROUPS.COACHING as readonly UserRole[]).includes(role);
  },
  
  isMemberRole: (role: UserRole): boolean => {
    return (ROLE_GROUPS.MEMBERS as readonly UserRole[]).includes(role);
  },
};
