'use client';

// ============================================
// 📋 상수 모듈 통합 Export
// ============================================

// 라우트 상수
export * from './routes';

// 역할 및 권한 상수
export * from './roles';

// 앱 설정 상수
export * from './config';

// 편의를 위한 재export
export { ROUTES, ROUTE_GROUPS, routeUtils } from './routes';
export { ROLE_LABELS, ROLE_COLORS, PERMISSIONS, roleUtils } from './roles';
export { 
  APP_CONFIG, 
  PAGINATION, 
  FILE_UPLOAD, 
  CACHE_CONFIG,
  NOTIFICATION_CONFIG,
  DATE_FORMATS,
  STATUS_TRANSLATIONS,
  GYMNASTICS_LEVELS,
  AGE_GROUPS,
  GENDER_OPTIONS,
  WEEKDAYS,
  PAYMENT_METHODS,
  GYMNASTICS_EVENTS
} from './config';
