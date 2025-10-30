// ============================================
// 🛣️ 라우트 상수 정의
// ============================================

// 기본 라우트
export const ROUTES = {
  // 홈 및 대시보드
  HOME: '/',
  DASHBOARD: '/dashboard',
  
  // 인증
  LOGIN: '/login',
  PENDING_APPROVAL: '/pending-approval',
  PROFILE_SETUP: '/profile-setup',
  
  // 관리자
  ADMIN: {
    ROOT: '/admin',
    CLUBS: '/admin/clubs',
    MEMBERS: '/admin/members',
    COMMITTEES: '/admin/committees',
    COMPETITIONS: '/admin/competitions',
    JUDGES: '/admin/judges',
    USERS: '/admin/users',
    APPROVALS: '/admin/approvals',
  },
  
  // 슈퍼 관리자
  SUPER_ADMIN: {
    ROOT: '/super-admin',
    INVITES: '/super-admin/invites',
    APPROVALS: '/system/super-admin-approvals',
  },
  
  // 클럽 대시보드
  CLUB_DASHBOARD: {
    ROOT: '/club-dashboard',
    ANALYTICS: '/club-dashboard/analytics',
    ANNOUNCEMENTS: '/club-dashboard/announcements',
    APPROVALS: '/club-dashboard/approvals',
    ATTENDANCE: '/club-dashboard/attendance',
    CLASS_STATUS: '/club-dashboard/class-status',
    CLASSES: '/club-dashboard/classes',
    COACHES: '/club-dashboard/coaches',
    EVENTS: '/club-dashboard/events',
    FINANCE: '/club-dashboard/finance',
    LEVEL_TESTS: '/club-dashboard/level-tests',
    MEDIA: '/club-dashboard/media',
    MEMBER_APPROVALS: '/club-dashboard/member-approvals',
    MESSAGES: '/club-dashboard/messages',
    PASS_TEMPLATES: '/club-dashboard/pass-templates',
    PASSES: '/club-dashboard/passes',
    PAYMENTS: '/club-dashboard/payments',
    SETTINGS: '/club-dashboard/settings',
  },
  
  // 개인 프로필
  MY_PROFILE: {
    ROOT: '/my-profile',
    FAMILY: '/my-profile/family',
    ADD_CHILD: '/my-profile/add-child',
    ADD_FAMILY: '/my-profile/add-family',
    ADD_FAMILY_MEMBER: '/my-profile/add-family-member',
  },
  
  // 회원가입
  REGISTER: {
    ROOT: '/register',
    ADULT: '/register/adult',
    FAMILY: '/register/family',
    CLUB_OWNER: '/register/club-owner',
    MEMBER: '/register/member',
    MEMBER_WITH_CONTRACT: '/register/member-with-contract',
    SUCCESS: '/register/success',
    SUPER_ADMIN: '/register/super-admin',
  },
  
  // 공통 기능
  MEMBERS: '/members',
  CLUBS: '/clubs',
  COMMITTEES: '/committees',
  COMMITTEES_NEW: '/committees/new',
  COMPETITIONS: '/competitions',
  EVENTS: '/events',
  LEVEL_TESTS: '/level-tests',
  ANNOUNCEMENTS: '/announcements',
  
  // 초대 시스템
  INVITE: {
    ROOT: '/invite',
    ACCEPT: '/invite/accept',
    ACCEPT_TOKEN: (token: string) => `/invite/accept/${token}`,
    VIEW_TOKEN: (token: string) => `/invite/${token}`,
  },
  
  // 시스템 관리
  SYSTEM: {
    ROOT: '/system',
    SUPER_ADMIN_APPROVALS: '/system/super-admin-approvals',
  },
  
  // 설정 및 초기화
  SETUP: {
    INITIAL_ADMIN: '/setup/initial-admin',
  },
  
  // API 엔드포인트
  API: {
    ROOT: '/api',
    ADMIN_RESET: '/api/admin/reset-firestore',
  },
  
  // 동적 라우트 헬퍼
  DYNAMIC: {
    MEMBER_DETAIL: (id: string) => `/members/${id}`,
    CLUB_DETAIL: (id: string) => `/clubs/${id}`,
    COMMITTEE_DETAIL: (id: string) => `/committees/${id}`,
    COMPETITION_DETAIL: (id: string) => `/competitions/${id}`,
    COMPETITION_LIVE: (id: string) => `/competitions/${id}/live`,
    COMPETITION_SCORING: (id: string) => `/admin/competitions/${id}/scoring`,
    CLASS_DETAIL: (id: string) => `/club-dashboard/classes/${id}`,
    LEVEL_TEST_EVALUATE: (id: string) => `/club-dashboard/level-tests/${id}/evaluate`,
    SCOREBOARD: (id: string) => `/scoreboard/${id}`,
  },
} as const;

// 라우트 유틸리티 함수들
export const getRouteWithParams = (route: string, params: Record<string, string>): string => {
  let result = route;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`[${key}]`, value);
  });
  return result;
};

export const isValidRoute = (path: string): boolean => {
  // 모든 라우트를 평면화하여 확인
  const flatRoutes: string[] = [];

  const flatten = (obj: unknown): void => {
    if (!obj) return;
    if (typeof obj === 'string') {
      flatRoutes.push(obj);
      return;
    }
    if (typeof obj === 'object') {
      Object.values(obj as Record<string, unknown>).forEach((value) => {
        flatten(value);
      });
    }
  };

  flatten(ROUTES);

  // 정확한 매치 또는 동적 라우트 매치
  return flatRoutes.some((route) => {
    if (route === path) return true;
    // 동적 라우트 패턴 매치 (예: /clubs/[id] -> /clubs/123)
    const pattern = route.replace(/\[([^\]]+)\]/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(path);
  });
};

export const getRouteGroup = (path: string): string | null => {
  if (path.startsWith('/admin')) return 'ADMIN';
  if (path.startsWith('/club-dashboard')) return 'CLUB_DASHBOARD';
  if (path.startsWith('/dashboard')) return 'DASHBOARD';
  if (path === '/login' || path === '/register') return 'AUTH';
  return null;
};

// 라우트 그룹
export const ROUTE_GROUPS = {
  ADMIN: [
    ROUTES.ADMIN.ROOT,
    ROUTES.ADMIN.CLUBS,
    ROUTES.ADMIN.MEMBERS,
    ROUTES.ADMIN.COMMITTEES,
    ROUTES.ADMIN.COMPETITIONS,
    ROUTES.ADMIN.JUDGES,
    ROUTES.ADMIN.USERS,
    ROUTES.ADMIN.APPROVALS,
  ],
  
  CLUB_DASHBOARD: [
    ROUTES.CLUB_DASHBOARD.ROOT,
    ROUTES.CLUB_DASHBOARD.ANALYTICS,
    ROUTES.CLUB_DASHBOARD.ANNOUNCEMENTS,
    ROUTES.CLUB_DASHBOARD.APPROVALS,
    ROUTES.CLUB_DASHBOARD.CLASS_STATUS,
    ROUTES.CLUB_DASHBOARD.CLASSES,
    ROUTES.CLUB_DASHBOARD.COACHES,
    ROUTES.CLUB_DASHBOARD.EVENTS,
    ROUTES.CLUB_DASHBOARD.FINANCE,
    ROUTES.CLUB_DASHBOARD.LEVEL_TESTS,
    ROUTES.CLUB_DASHBOARD.MEDIA,
    ROUTES.CLUB_DASHBOARD.MEMBER_APPROVALS,
    ROUTES.CLUB_DASHBOARD.MESSAGES,
    ROUTES.CLUB_DASHBOARD.PASS_TEMPLATES,
    ROUTES.CLUB_DASHBOARD.PASSES,
    ROUTES.CLUB_DASHBOARD.PAYMENTS,
    ROUTES.CLUB_DASHBOARD.SETTINGS,
  ],
  
  PUBLIC: [
    ROUTES.HOME,
    ROUTES.LOGIN,
    ROUTES.REGISTER.ROOT,
    ROUTES.REGISTER.ADULT,
    ROUTES.REGISTER.FAMILY,
    ROUTES.REGISTER.CLUB_OWNER,
    ROUTES.REGISTER.SUPER_ADMIN,
    ROUTES.MEMBERS,
    ROUTES.CLUBS,
    ROUTES.COMPETITIONS,
    ROUTES.ANNOUNCEMENTS,
    ROUTES.INVITE.ROOT,
    ROUTES.SETUP.INITIAL_ADMIN,
  ],
  
  PROTECTED: [
    ROUTES.DASHBOARD,
    ROUTES.MY_PROFILE.ROOT,
    ROUTES.MY_PROFILE.FAMILY,
    ROUTES.MY_PROFILE.ADD_CHILD,
    ROUTES.MY_PROFILE.ADD_FAMILY,
    ROUTES.MY_PROFILE.ADD_FAMILY_MEMBER,
    ROUTES.EVENTS,
    ROUTES.LEVEL_TESTS,
    ROUTES.COMMITTEES,
    ROUTES.PENDING_APPROVAL,
    ROUTES.PROFILE_SETUP,
  ],
} as const;

// 라우트 유틸리티 함수
export const routeUtils = {
  isAdminRoute: (path: string): boolean => {
    return ROUTE_GROUPS.ADMIN.some(route => path.startsWith(route));
  },
  
  isClubDashboardRoute: (path: string): boolean => {
    return ROUTE_GROUPS.CLUB_DASHBOARD.some(route => path.startsWith(route));
  },
  
  isPublicRoute: (path: string): boolean => {
    return ROUTE_GROUPS.PUBLIC.some(route => path === route || path.startsWith(route + '/'));
  },
  
  isProtectedRoute: (path: string): boolean => {
    return ROUTE_GROUPS.PROTECTED.some(route => path === route || path.startsWith(route + '/'));
  },
  
  getRouteGroup: (path: string): string | null => {
    if (routeUtils.isAdminRoute(path)) return 'admin';
    if (routeUtils.isClubDashboardRoute(path)) return 'club-dashboard';
    if (routeUtils.isPublicRoute(path)) return 'public';
    if (routeUtils.isProtectedRoute(path)) return 'protected';
    return null;
  },
};
