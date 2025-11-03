/**
 * 사용자 상태 관리 도메인 로직
 * 
 * 순수 비즈니스 규칙만 담고 있음
 * - 외부 의존성 없음 (Firebase, API 등)
 * - 순수 함수들로 구성
 * - 테스트하기 쉬움
 */

export interface User {
  uid: string;
  email: string;
  role: string;
  status: 'pending' | 'active' | 'inactive';
  clubId?: string;
  linkedMemberId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface StatusUpdateOptions {
  performedBy: string;
  reason?: string | null;
  forceUpdate?: boolean;
  performerRole?: string; // 수행자 역할 추가
}

export interface StatusUpdateResult {
  success: boolean;
  user: User;
  previousStatus: 'pending' | 'active' | 'inactive';
  newStatus: 'pending' | 'active' | 'inactive';
  auditLog: {
    action: string;
    performedBy: string;
    timestamp: Date;
    details: any;
  };
  warnings?: string[];
}

export type UserStatus = 'pending' | 'active' | 'inactive';

/**
 * 사용자 상태 변경 가능 여부 검증
 */
export function canUpdateUserStatus(
  targetUser: User,  // 상태를 변경당할 사용자
  newStatus: UserStatus, 
  options: StatusUpdateOptions  // 수행자 정보
): {
  canUpdate: boolean;
  reason?: string;
  warnings?: string[];
} {
  const warnings: string[] = [];

  // 1. 기본 필수 조건 검증
  if (!targetUser.uid) {
    return { canUpdate: false, reason: '사용자 ID가 필요합니다' };
  }

  // 2. 상태 전환 규칙 검증
  const statusTransition = validateStatusTransition(targetUser.status, newStatus);
  if (!statusTransition.allowed) {
    return { canUpdate: false, reason: statusTransition.reason };
  }

  // 3. 역할 기반 상태 변경 권한 검증 (options.performedBy의 역할로 검증)
  const roleValidation = validateRoleBasedStatusChange(targetUser, newStatus, options);
  if (!roleValidation.allowed) {
    return { canUpdate: false, reason: roleValidation.reason };
  }

  // 4. 비즈니스 규칙 기반 경고 생성
  const businessWarnings = generateBusinessWarnings(targetUser, newStatus);
  warnings.push(...businessWarnings);

  return { canUpdate: true, warnings: warnings.length > 0 ? warnings : undefined };
}

/**
 * 상태 전환 규칙 검증
 */
function validateStatusTransition(
  currentStatus: UserStatus, 
  newStatus: UserStatus
): { allowed: boolean; reason?: string } {
  // 동일한 상태로의 변경은 불필요
  if (currentStatus === newStatus) {
    return { allowed: false, reason: '이미 동일한 상태입니다' };
  }

  // 허용된 상태 전환 맵
  const allowedTransitions: Record<UserStatus, UserStatus[]> = {
    pending: ['active', 'inactive'],
    active: ['inactive', 'pending'],
    inactive: ['pending', 'active']
  };

  if (!allowedTransitions[currentStatus].includes(newStatus)) {
    return { 
      allowed: false, 
      reason: `${currentStatus} 상태에서 ${newStatus} 상태로 직접 변경할 수 없습니다` 
    };
  }

  return { allowed: true };
}

/**
 * 역할 기반 상태 변경 권한 검증
 * performedBy 사용자의 역할로 권한 검증
 */
function validateRoleBasedStatusChange(
  targetUser: User, 
  newStatus: UserStatus, 
  options: StatusUpdateOptions
): { allowed: boolean; reason?: string } {
  // 수행자 역할 가져오기 (options에 있거나 기본값)
  const performerRole = options.performerRole || 'SUPER_ADMIN';
  
  // 관리자는 모든 사용자의 상태 변경 가능
  if (['SUPER_ADMIN', 'FEDERATION_ADMIN'].includes(performerRole)) {
    return { allowed: true };
  }

  // 클럽 소유자/관리자는 자기 클럽 사용자만 변경 가능
  if (['CLUB_OWNER', 'CLUB_MANAGER'].includes(performerRole)) {
    // 관리자/클럽 관리자가 아닌 사용자만 변경 가능
    if (['SUPER_ADMIN', 'FEDERATION_ADMIN', 'CLUB_OWNER', 'CLUB_MANAGER'].includes(targetUser.role)) {
      return { 
        allowed: false, 
        reason: '클럽 관리자는 다른 관리자의 상태를 변경할 수 없습니다' 
      };
    }
    // inactive로 변경하는 것은 제한
    if (newStatus === 'inactive') {
      return { 
        allowed: false, 
        reason: '클럽 관리자는 사용자를 비활성화할 수 없습니다. 연맹 관리자에게 문의하세요.' 
      };
    }
    return { allowed: true };
  }

  // 코치는 자기 팀 멤버만 active/pending 변경 가능
  if (['HEAD_COACH', 'ASSISTANT_COACH'].includes(performerRole)) {
    // 코치 이상 역할은 변경 불가
    if (['SUPER_ADMIN', 'FEDERATION_ADMIN', 'CLUB_OWNER', 'CLUB_MANAGER', 'HEAD_COACH', 'ASSISTANT_COACH'].includes(targetUser.role)) {
      return { 
        allowed: false, 
        reason: '코치는 다른 스태프의 상태를 변경할 수 없습니다' 
      };
    }
    if (newStatus === 'inactive') {
      return { 
        allowed: false, 
        reason: '코치는 사용자를 비활성화할 수 없습니다' 
      };
    }
    return { allowed: true };
  }

  // 일반 사용자는 자기 상태를 변경할 수 없음
  return { 
    allowed: false, 
    reason: '상태 변경 권한이 없습니다' 
  };
}

/**
 * 비즈니스 규칙 기반 경고 생성
 */
function generateBusinessWarnings(user: User, newStatus: UserStatus): string[] {
  const warnings: string[] = [];

  // 활성 사용자를 비활성화할 때 경고
  if (user.status === 'active' && newStatus === 'inactive') {
    warnings.push('활성 사용자를 비활성화하면 모든 접근 권한이 즉시 중단됩니다');
    
    // 최근 로그인 사용자 추가 경고
    if (user.lastLoginAt) {
      const daysSinceLastLogin = Math.floor(
        (Date.now() - user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastLogin < 7) {
        warnings.push('최근에 로그인한 사용자입니다. 비활성화 전에 사용자에게 통지하세요.');
      }
    }
  }

  // 비활성 사용자를 활성화할 때 정보
  if (user.status === 'inactive' && newStatus === 'active') {
    warnings.push('비활성 사용자를 활성화합니다. 모든 접근 권한이 복원됩니다');
  }

  // 보류 중인 사용자를 활성화할 때
  if (user.status === 'pending' && newStatus === 'active') {
    warnings.push('보류 중인 사용자를 활성화합니다. 승인 프로세스가 완료된 것으로 간주됩니다');
  }

  return warnings;
}

/**
 * 사용자 상태 업데이트 실행
 */
export function updateUserStatus(
  targetUser: User, 
  newStatus: UserStatus, 
  options: StatusUpdateOptions
): StatusUpdateResult {
  // 변경 가능 여부 확인
  const validation = canUpdateUserStatus(targetUser, newStatus, options);
  if (!validation.canUpdate) {
    throw new Error(validation.reason);
  }

  const previousStatus = targetUser.status;

  // 새로운 사용자 상태 생성
  const updatedUser: User = {
    ...targetUser,
    status: newStatus,
    updatedAt: new Date()
  };

  // 감사 로그 생성
  const auditLog = {
    action: 'USER_STATUS_UPDATED',
    performedBy: options.performedBy,
    timestamp: new Date(),
    details: {
      userId: targetUser.uid,
      previousStatus,
      newStatus,
      reason: options.reason || null,
      roleAtTime: targetUser.role,
      clubId: targetUser.clubId
    }
  };

  return {
    success: true,
    user: updatedUser,
    previousStatus,
    newStatus,
    auditLog,
    warnings: validation.warnings
  };
}

/**
 * 대량 상태 업데이트 검증
 */
export function canBulkUpdateUserStatus(
  targetUsers: User[], 
  newStatus: UserStatus, 
  options: StatusUpdateOptions
): {
  canUpdate: boolean;
  reason?: string;
  userValidationResults: Array<{
    userId: string;
    canUpdate: boolean;
    reason?: string;
  }>;
} {
  const userValidationResults = targetUsers.map(user => ({
    userId: user.uid,
    ...canUpdateUserStatus(user, newStatus, options)
  }));

  const failedUsers = userValidationResults.filter(result => !result.canUpdate);
  
  if (failedUsers.length > 0 && !options.forceUpdate) {
    return {
      canUpdate: false,
      reason: `${failedUsers.length}명의 사용자 상태를 변경할 수 없습니다`,
      userValidationResults
    };
  }

  return {
    canUpdate: true,
    userValidationResults
  };
}

/**
 * 상태 변경 통계 생성
 */
export function generateStatusChangeStats(
  users: User[], 
  fromStatus?: UserStatus,
  toStatus?: UserStatus
): {
  totalUsers: number;
  statusDistribution: Record<UserStatus, number>;
  recentStatusChanges: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
} {
  const filteredUsers = users.filter(user => {
    if (fromStatus && user.status !== fromStatus) return false;
    if (toStatus && user.status !== toStatus) return false;
    return true;
  });

  const statusDistribution: Record<UserStatus, number> = {
    pending: 0,
    active: 0,
    inactive: 0
  };

  filteredUsers.forEach(user => {
    statusDistribution[user.status]++;
  });

  const now = Date.now();
  const recentStatusChanges = {
    last24Hours: users.filter(u => 
      u.updatedAt && (now - u.updatedAt.getTime()) < (24 * 60 * 60 * 1000)
    ).length,
    last7Days: users.filter(u => 
      u.updatedAt && (now - u.updatedAt.getTime()) < (7 * 24 * 60 * 60 * 1000)
    ).length,
    last30Days: users.filter(u => 
      u.updatedAt && (now - u.updatedAt.getTime()) < (30 * 24 * 60 * 60 * 1000)
    ).length
  };

  return {
    totalUsers: filteredUsers.length,
    statusDistribution,
    recentStatusChanges
  };
}
