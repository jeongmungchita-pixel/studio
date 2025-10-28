import { UserRole } from '@/types/auth';

/**
 * 라우트 접근 권한 설정
 */
export const routeConfig = {
  // 인증 없이 접근 가능한 공개 라우트
  publicRoutes: [
    '/login',
    '/register',
    '/register/*',
    '/invite/*',
    '/setup/initial-admin'
  ],
  
  // 역할별 접근 가능 라우트
  roleRoutes: {
    [UserRole.SUPER_ADMIN]: [
      '/super-admin',
      '/super-admin/*',
      '/system/*',
      '/admin',
      '/admin/*',
      '/club-dashboard',
      '/club-dashboard/*',
      '/my-profile',
      '/my-profile/*'
    ],
    
    [UserRole.FEDERATION_ADMIN]: [
      '/admin',
      '/admin/*',
      '/committees',
      '/committees/*',
      '/competitions',
      '/competitions/*',
      '/members',
      '/members/*',
      '/my-profile',
      '/my-profile/*'
    ],
    
    [UserRole.FEDERATION_SECRETARIAT]: [
      '/admin',
      '/admin/*',
      '/committees',
      '/committees/*',
      '/competitions',
      '/competitions/*',
      '/members',
      '/members/*',
      '/my-profile',
      '/my-profile/*'
    ],
    
    [UserRole.COMMITTEE_CHAIR]: [
      '/committees',
      '/committees/*',
      '/competitions',
      '/competitions/*',
      '/my-profile',
      '/my-profile/*'
    ],
    
    [UserRole.COMMITTEE_MEMBER]: [
      '/committees',
      '/committees/*',
      '/competitions',
      '/competitions/*',
      '/my-profile',
      '/my-profile/*'
    ],
    
    [UserRole.CLUB_OWNER]: [
      '/club-dashboard',
      '/club-dashboard/*',
      '/members',
      '/members/*',
      '/events',
      '/events/*',
      '/competitions',
      '/competitions/*',
      '/my-profile',
      '/my-profile/*'
    ],
    
    [UserRole.CLUB_MANAGER]: [
      '/club-dashboard',
      '/club-dashboard/*',
      '/members',
      '/members/*',
      '/events',
      '/events/*',
      '/competitions',
      '/competitions/*',
      '/my-profile',
      '/my-profile/*'
    ],
    
    [UserRole.CLUB_STAFF]: [
      '/club-dashboard/class-status',
      '/club-dashboard/classes',
      '/club-dashboard/attendance',
      '/members',
      '/members/*',
      '/my-profile',
      '/my-profile/*'
    ],
    
    [UserRole.HEAD_COACH]: [
      '/club-dashboard',
      '/club-dashboard/*',
      '/members',
      '/members/*',
      '/events',
      '/events/*',
      '/my-profile',
      '/my-profile/*'
    ],
    
    [UserRole.ASSISTANT_COACH]: [
      '/club-dashboard/class-status',
      '/club-dashboard/classes',
      '/club-dashboard/level-tests',
      '/members',
      '/members/*',
      '/my-profile',
      '/my-profile/*'
    ],
    
    [UserRole.MEDIA_MANAGER]: [
      '/club-dashboard/media',
      '/club-dashboard/announcements',
      '/events',
      '/events/*',
      '/my-profile',
      '/my-profile/*'
    ],
    
    [UserRole.MEMBER]: [
      '/my-profile',
      '/my-profile/*',
      '/events',
      '/events/*',
      '/competitions',
      '/competitions/*',
      '/announcements',
      '/announcements/*',
      '/level-tests',
      '/level-tests/*'
    ],
    
    [UserRole.PARENT]: [
      '/my-profile',
      '/my-profile/*',
      '/events',
      '/events/*',
      '/competitions',
      '/competitions/*',
      '/announcements',
      '/announcements/*'
    ],
    
    [UserRole.VENDOR]: [
      '/my-profile',
      '/my-profile/*'
    ]
  },
  
  // 승인 대기 중인 사용자가 접근 가능한 라우트
  pendingUserRoutes: [
    '/pending-approval',
    '/profile-setup',
    '/login'
  ]
};

/**
 * 라우트 접근 권한 확인
 */
export function canAccessRoute(
  pathname: string,
  userRole?: UserRole,
  userStatus?: string
): boolean {
  // 공개 라우트 확인
  if (isPublicRoute(pathname)) {
    return true;
  }
  
  // 로그인하지 않은 경우
  if (!userRole) {
    return false;
  }
  
  // 승인 대기 중인 사용자
  if (userStatus === 'pending') {
    return routeConfig.pendingUserRoutes.some(route => 
      matchRoute(pathname, route)
    );
  }
  
  // 역할별 접근 권한 확인
  const allowedRoutes = routeConfig.roleRoutes[userRole];
  if (!allowedRoutes) {
    return false;
  }
  
  return allowedRoutes.some(route => matchRoute(pathname, route));
}

/**
 * 공개 라우트인지 확인
 */
export function isPublicRoute(pathname: string): boolean {
  return routeConfig.publicRoutes.some(route => 
    matchRoute(pathname, route)
  );
}

/**
 * 라우트 패턴 매칭
 */
function matchRoute(pathname: string, pattern: string): boolean {
  // 정확히 일치
  if (pathname === pattern) {
    return true;
  }
  
  // 와일드카드 패턴 매칭 (예: /admin/* )
  if (pattern.endsWith('/*')) {
    const basePath = pattern.slice(0, -2);
    return pathname.startsWith(basePath);
  }
  
  return false;
}

/**
 * 역할별 기본 라우트 가져오기
 */
export function getDefaultRoute(userRole?: UserRole, userStatus?: string): string {
  // 승인 대기 중인 경우
  if (userStatus === 'pending') {
    return '/pending-approval';
  }
  
  // 역할별 기본 라우트
  switch (userRole) {
    case UserRole.SUPER_ADMIN:
      return '/super-admin';
    case UserRole.FEDERATION_ADMIN:
    case UserRole.FEDERATION_SECRETARIAT:
      return '/admin';
    case UserRole.COMMITTEE_CHAIR:
    case UserRole.COMMITTEE_MEMBER:
      return '/committees';
    case UserRole.CLUB_OWNER:
    case UserRole.CLUB_MANAGER:
    case UserRole.HEAD_COACH:
    case UserRole.ASSISTANT_COACH:
    case UserRole.CLUB_STAFF:
    case UserRole.MEDIA_MANAGER:
      return '/club-dashboard';
    case UserRole.MEMBER:
    case UserRole.PARENT:
      return '/my-profile';
    case UserRole.VENDOR:
      return '/my-profile';
    default:
      return '/login';
  }
}
