import { UserRole } from '@/types/auth';
import { APIError } from '@/utils/error/api-error';

/**
 * 강화된 역할 기반 접근 제어 (RBAC) 시스템
 */

// 권한 정의
export enum Permission {
  // 사용자 관리
  USER_READ = 'user:read',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_UPDATE_ROLE = 'user:update_role',
  USER_UPDATE_STATUS = 'user:update_status',

  // 클럽 관리
  CLUB_READ = 'club:read',
  CLUB_CREATE = 'club:create',
  CLUB_UPDATE = 'club:update',
  CLUB_DELETE = 'club:delete',
  CLUB_MANAGE_MEMBERS = 'club:manage_members',

  // 이벤트 관리
  EVENT_READ = 'event:read',
  EVENT_CREATE = 'event:create',
  EVENT_UPDATE = 'event:update',
  EVENT_DELETE = 'event:delete',
  EVENT_MANAGE_PARTICIPANTS = 'event:manage_participants',

  // 재정 관리
  FINANCE_READ = 'finance:read',
  FINANCE_CREATE = 'finance:create',
  FINANCE_UPDATE = 'finance:update',
  FINANCE_DELETE = 'finance:delete',

  // 시스템 관리
  SYSTEM_READ = 'system:read',
  SYSTEM_UPDATE = 'system:update',
  SYSTEM_DELETE = 'system:delete',
  SYSTEM_BACKUP = 'system:backup',

  // 감사 로그
  AUDIT_READ = 'audit:read',
  AUDIT_EXPORT = 'audit:export',

  // 보고서
  REPORT_READ = 'report:read',
  REPORT_CREATE = 'report:create',
  REPORT_EXPORT = 'report:export',
}

// 리소스 타입 정의
export enum ResourceType {
  USER = 'user',
  CLUB = 'club',
  EVENT = 'event',
  FINANCE = 'finance',
  SYSTEM = 'system',
  AUDIT = 'audit',
  REPORT = 'report',
}

// 액션 타입 정의
export enum Action {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
  EXPORT = 'export',
}

// 역할별 권한 매트릭스
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    // 모든 권한
    ...Object.values(Permission),
  ],

  [UserRole.FEDERATION_ADMIN]: [
    // 사용자 관리 (역할 변경 제외)
    Permission.USER_READ,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_UPDATE_STATUS,

    // 클럽 관리
    Permission.CLUB_READ,
    Permission.CLUB_CREATE,
    Permission.CLUB_UPDATE,
    Permission.CLUB_DELETE,
    Permission.CLUB_MANAGE_MEMBERS,

    // 이벤트 관리
    Permission.EVENT_READ,
    Permission.EVENT_CREATE,
    Permission.EVENT_UPDATE,
    Permission.EVENT_DELETE,
    Permission.EVENT_MANAGE_PARTICIPANTS,

    // 재정 관리 (읽기만)
    Permission.FINANCE_READ,

    // 시스템 관리 (읽기만)
    Permission.SYSTEM_READ,

    // 감사 로그
    Permission.AUDIT_READ,
    Permission.AUDIT_EXPORT,

    // 보고서
    Permission.REPORT_READ,
    Permission.REPORT_CREATE,
    Permission.REPORT_EXPORT,
  ],

  [UserRole.FEDERATION_SECRETARIAT]: [
    // 사용자 관리 (제한적)
    Permission.USER_READ,
    Permission.USER_UPDATE,

    // 클럽 관리 (제한적)
    Permission.CLUB_READ,
    Permission.CLUB_UPDATE,

    // 이벤트 관리
    Permission.EVENT_READ,
    Permission.EVENT_CREATE,
    Permission.EVENT_UPDATE,
    Permission.EVENT_MANAGE_PARTICIPANTS,

    // 보고서
    Permission.REPORT_READ,
    Permission.REPORT_CREATE,
  ],

  [UserRole.COMMITTEE_CHAIR]: [
    // 위원회 관련 권한
    Permission.USER_READ,
    Permission.CLUB_READ,
    Permission.EVENT_READ,
    Permission.EVENT_CREATE,
    Permission.EVENT_UPDATE,
    Permission.REPORT_READ,
    Permission.REPORT_CREATE,
  ],

  [UserRole.COMMITTEE_MEMBER]: [
    // 위원회 멤버 권한
    Permission.USER_READ,
    Permission.CLUB_READ,
    Permission.EVENT_READ,
    Permission.REPORT_READ,
  ],

  [UserRole.CLUB_OWNER]: [
    // 자신의 클럽 사용자 관리
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_UPDATE_STATUS,

    // 자신의 클럽 관리
    Permission.CLUB_READ,
    Permission.CLUB_UPDATE,
    Permission.CLUB_MANAGE_MEMBERS,

    // 클럽 이벤트 관리
    Permission.EVENT_READ,
    Permission.EVENT_CREATE,
    Permission.EVENT_UPDATE,
    Permission.EVENT_DELETE,
    Permission.EVENT_MANAGE_PARTICIPANTS,

    // 클럽 재정 관리
    Permission.FINANCE_READ,
    Permission.FINANCE_CREATE,
    Permission.FINANCE_UPDATE,

    // 클럽 보고서
    Permission.REPORT_READ,
    Permission.REPORT_CREATE,
  ],

  [UserRole.CLUB_MANAGER]: [
    // 클럽 회원 관리
    Permission.USER_READ,
    Permission.USER_UPDATE,

    // 클럽 정보 읽기
    Permission.CLUB_READ,
    Permission.CLUB_MANAGE_MEMBERS,

    // 이벤트 관리
    Permission.EVENT_READ,
    Permission.EVENT_CREATE,
    Permission.EVENT_UPDATE,
    Permission.EVENT_MANAGE_PARTICIPANTS,

    // 재정 읽기
    Permission.FINANCE_READ,

    // 보고서 읽기
    Permission.REPORT_READ,
  ],

  [UserRole.CLUB_STAFF]: [
    // 클럽 스태프 권한
    Permission.USER_READ,
    Permission.CLUB_READ,
    Permission.EVENT_READ,
    Permission.EVENT_UPDATE,
  ],

  [UserRole.MEDIA_MANAGER]: [
    // 미디어 관리 권한
    Permission.USER_READ,
    Permission.CLUB_READ,
    Permission.EVENT_READ,
    Permission.REPORT_READ,
  ],

  [UserRole.HEAD_COACH]: [
    // 회원 정보 읽기
    Permission.USER_READ,

    // 클럽 정보 읽기
    Permission.CLUB_READ,

    // 이벤트 참여
    Permission.EVENT_READ,
    Permission.EVENT_CREATE,

    // 보고서 읽기
    Permission.REPORT_READ,
  ],

  [UserRole.ASSISTANT_COACH]: [
    // 회원 정보 읽기
    Permission.USER_READ,

    // 클럽 정보 읽기
    Permission.CLUB_READ,

    // 이벤트 읽기
    Permission.EVENT_READ,
  ],

  [UserRole.MEMBER]: [
    // 자신의 정보 읽기/수정
    Permission.USER_READ,
    Permission.USER_UPDATE,

    // 클럽 정보 읽기
    Permission.CLUB_READ,

    // 이벤트 참여
    Permission.EVENT_READ,
  ],

  [UserRole.PARENT]: [
    // 자녀 정보 읽기
    Permission.USER_READ,

    // 클럽 정보 읽기
    Permission.CLUB_READ,

    // 이벤트 읽기
    Permission.EVENT_READ,
  ],

  [UserRole.VENDOR]: [
    // 벤더 권한 (제한적)
    Permission.CLUB_READ,
    Permission.EVENT_READ,
  ],
};

// 컨텍스트 기반 권한 검사를 위한 인터페이스
export interface AccessContext {
  userId: string;
  userRole: UserRole;
  clubId?: string;
  resourceOwnerId?: string;
  resourceClubId?: string;
  isPublicResource?: boolean;
}

/**
 * 강화된 RBAC 클래스
 */
export class EnhancedRBAC {
  /**
   * 기본 권한 확인
   */
  static hasPermission(userRole: UserRole, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    return rolePermissions.includes(permission);
  }

  /**
   * 다중 권한 확인
   */
  static hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(userRole, permission));
  }

  /**
   * 모든 권한 확인
   */
  static hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(userRole, permission));
  }

  /**
   * 컨텍스트 기반 권한 확인
   */
  static hasContextualPermission(
    context: AccessContext,
    permission: Permission,
    resourceType: ResourceType
  ): boolean {
    // 기본 권한 확인
    if (!this.hasPermission(context.userRole, permission)) {
      return false;
    }

    // 컨텍스트별 추가 검증
    switch (resourceType) {
      case ResourceType.USER:
        return this.checkUserResourceAccess(context, permission);
      
      case ResourceType.CLUB:
        return this.checkClubResourceAccess(context, permission);
      
      case ResourceType.EVENT:
        return this.checkEventResourceAccess(context, permission);
      
      case ResourceType.FINANCE:
        return this.checkFinanceResourceAccess(context, permission);
      
      default:
        return true;
    }
  }

  /**
   * 사용자 리소스 접근 권한 확인
   */
  private static checkUserResourceAccess(
    context: AccessContext,
    permission: Permission
  ): boolean {
    const { userId, userRole, clubId, resourceOwnerId, resourceClubId } = context;

    // 자신의 정보는 항상 접근 가능 (읽기/수정)
    if (resourceOwnerId === userId) {
      return [Permission.USER_READ, Permission.USER_UPDATE].includes(permission);
    }

    // 슈퍼 관리자는 모든 접근 가능
    if (userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // 연맹 관리자는 모든 사용자 접근 가능
    if (userRole === UserRole.FEDERATION_ADMIN) {
      return true;
    }

    // 클럽 오너/매니저는 같은 클럽 회원만 접근 가능
    if ([UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER].includes(userRole)) {
      return clubId === resourceClubId;
    }

    // 부모는 자녀 정보만 접근 가능 (별도 로직 필요)
    if (userRole === UserRole.PARENT) {
      // TODO: 부모-자녀 관계 확인 로직
      return false;
    }

    return false;
  }

  /**
   * 클럽 리소스 접근 권한 확인
   */
  private static checkClubResourceAccess(
    context: AccessContext,
    permission: Permission
  ): boolean {
    const { userRole, clubId, resourceClubId } = context;

    // 슈퍼 관리자, 연맹 관리자는 모든 클럽 접근 가능
    if ([UserRole.SUPER_ADMIN, UserRole.FEDERATION_ADMIN].includes(userRole)) {
      return true;
    }

    // 클럽 관련 역할은 자신의 클럽만 접근 가능
    if ([
      UserRole.CLUB_OWNER,
      UserRole.CLUB_MANAGER,
      UserRole.HEAD_COACH,
      UserRole.ASSISTANT_COACH,
      UserRole.MEMBER,
      UserRole.PARENT,
    ].includes(userRole)) {
      return clubId === resourceClubId;
    }

    // 읽기 권한은 공개 클럽에 대해 허용
    if (permission === Permission.CLUB_READ) {
      return true;
    }

    return false;
  }

  /**
   * 이벤트 리소스 접근 권한 확인
   */
  private static checkEventResourceAccess(
    context: AccessContext,
    permission: Permission
  ): boolean {
    const { userRole, clubId, resourceClubId, isPublicResource } = context;

    // 슈퍼 관리자, 연맹 관리자는 모든 이벤트 접근 가능
    if ([UserRole.SUPER_ADMIN, UserRole.FEDERATION_ADMIN].includes(userRole)) {
      return true;
    }

    // 공개 이벤트 읽기는 모든 사용자 가능
    if (permission === Permission.EVENT_READ && isPublicResource) {
      return true;
    }

    // 클럽 이벤트는 해당 클럽 회원만 접근 가능
    if (resourceClubId) {
      return clubId === resourceClubId;
    }

    return false;
  }

  /**
   * 재정 리소스 접근 권한 확인
   */
  private static checkFinanceResourceAccess(
    context: AccessContext,
    permission: Permission
  ): boolean {
    const { userRole, clubId, resourceClubId } = context;

    // 슈퍼 관리자만 모든 재정 정보 접근 가능
    if (userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // 연맹 관리자는 읽기만 가능
    if (userRole === UserRole.FEDERATION_ADMIN) {
      return permission === Permission.FINANCE_READ;
    }

    // 클럽 오너는 자신의 클럽 재정 관리 가능
    if (userRole === UserRole.CLUB_OWNER) {
      return clubId === resourceClubId;
    }

    // 클럽 매니저는 자신의 클럽 재정 읽기만 가능
    if (userRole === UserRole.CLUB_MANAGER) {
      return clubId === resourceClubId && permission === Permission.FINANCE_READ;
    }

    return false;
  }

  /**
   * 권한 확인 및 예외 발생
   */
  static requirePermission(
    context: AccessContext,
    permission: Permission,
    resourceType: ResourceType
  ): void {
    if (!this.hasContextualPermission(context, permission, resourceType)) {
      throw new APIError(
        '이 작업을 수행할 권한이 없습니다',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }
  }

  /**
   * 역할 계층 확인
   */
  static isHigherRole(role1: UserRole, role2: UserRole): boolean {
    const roleHierarchy = [
      UserRole.SUPER_ADMIN,
      UserRole.FEDERATION_ADMIN,
      UserRole.FEDERATION_SECRETARIAT,
      UserRole.COMMITTEE_CHAIR,
      UserRole.COMMITTEE_MEMBER,
      UserRole.CLUB_OWNER,
      UserRole.CLUB_MANAGER,
      UserRole.CLUB_STAFF,
      UserRole.MEDIA_MANAGER,
      UserRole.HEAD_COACH,
      UserRole.ASSISTANT_COACH,
      UserRole.MEMBER,
      UserRole.PARENT,
      UserRole.VENDOR,
    ];

    const index1 = roleHierarchy.indexOf(role1);
    const index2 = roleHierarchy.indexOf(role2);

    return index1 < index2;
  }

  /**
   * 역할 변경 권한 확인
   */
  static canChangeRole(
    currentUserRole: UserRole,
    targetCurrentRole: UserRole,
    targetNewRole: UserRole
  ): boolean {
    // 자신보다 높은 역할의 사용자는 변경할 수 없음
    if (!this.isHigherRole(currentUserRole, targetCurrentRole)) {
      return false;
    }

    // 자신과 같거나 높은 역할로 승격시킬 수 없음
    if (!this.isHigherRole(currentUserRole, targetNewRole)) {
      return false;
    }

    return true;
  }

  /**
   * 사용자별 접근 가능한 리소스 목록 생성
   */
  static getAccessibleResources(
    userRole: UserRole,
    resourceType: ResourceType
  ): Permission[] {
    const allPermissions = ROLE_PERMISSIONS[userRole] || [];
    
    return allPermissions.filter(permission => {
      const [resource] = permission.split(':');
      return resource === resourceType;
    });
  }

  /**
   * 권한 매트릭스 조회 (디버깅용)
   */
  static getPermissionMatrix(): Record<UserRole, Permission[]> {
    return { ...ROLE_PERMISSIONS };
  }
}
