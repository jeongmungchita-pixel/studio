'use client';
// ============================================
// ⚙️ 앱 설정 상수
// ============================================
// 앱 기본 정보
export const APP_CONFIG = {
  NAME: 'KGF 넥서스',
  DESCRIPTION: '대한체조연맹 통합 관리 시스템',
  VERSION: '1.0.0',
  AUTHOR: 'KGF Development Team',
  // 연락처 정보
  CONTACT: {
    EMAIL: 'support@kgf-nexus.com',
    PHONE: '02-123-4567',
    ADDRESS: '서울특별시 강남구 테헤란로 123',
  },
  // 소셜 미디어
  SOCIAL: {
    WEBSITE: 'https://www.kgf.or.kr',
    FACEBOOK: 'https://facebook.com/kgf.korea',
    INSTAGRAM: 'https://instagram.com/kgf_korea',
    YOUTUBE: 'https://youtube.com/c/KGFKorea',
  },
} as const;
// 페이지네이션 설정
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  SIZES: [10, 20, 50, 100],
} as const;
// 파일 업로드 설정
export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif',
  ],
  ALLOWED_VIDEO_TYPES: [
    'video/mp4',
    'video/webm',
    'video/ogg',
  ],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
} as const;
// 캐시 설정
export const CACHE_CONFIG = {
  DURATIONS: {
    SHORT: 5 * 60 * 1000, // 5분
    MEDIUM: 15 * 60 * 1000, // 15분
    LONG: 60 * 60 * 1000, // 1시간
    VERY_LONG: 24 * 60 * 60 * 1000, // 24시간
  },
  KEYS: {
    USER_PROFILE: 'user_profile',
    CLUBS: 'clubs',
    MEMBERS: 'members',
    CLASSES: 'classes',
    EVENTS: 'events',
  },
} as const;
// 알림 설정
export const NOTIFICATION_CONFIG = {
  TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
  },
  DURATIONS: {
    SHORT: 3000, // 3초
    MEDIUM: 5000, // 5초
    LONG: 8000, // 8초
    PERSISTENT: 0, // 수동 닫기
  },
} as const;
// 날짜/시간 형식
export const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  TIME: 'HH:mm',
  DATETIME: 'YYYY-MM-DD HH:mm',
  DISPLAY_DATE: 'YYYY년 MM월 DD일',
  DISPLAY_DATETIME: 'YYYY년 MM월 DD일 HH:mm',
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
} as const;
// 체조 레벨 시스템
export const GYMNASTICS_LEVELS = [
  { id: 'beginner', name: '입문', code: 'BEGINNER', color: '#8B4513', minScore: 0, maxScore: 59, order: 1, icon: '🟤' },
  { id: 'elementary', name: '초급', code: 'ELEMENTARY', color: '#FF6B35', minScore: 60, maxScore: 69, order: 2, icon: '🟠' },
  { id: 'intermediate', name: '중급', code: 'INTERMEDIATE', color: '#F7931E', minScore: 70, maxScore: 79, order: 3, icon: '🟡' },
  { id: 'advanced', name: '고급', code: 'ADVANCED', color: '#FFD700', minScore: 80, maxScore: 89, order: 4, icon: '🟨' },
  { id: 'expert', name: '전문가', code: 'EXPERT', color: '#32CD32', minScore: 90, maxScore: 95, order: 5, icon: '🟢' },
  { id: 'master', name: '마스터', code: 'MASTER', color: '#4169E1', minScore: 96, maxScore: 100, order: 6, icon: '🔵' },
] as const;
// 상태 번역
export const STATUS_TRANSLATIONS = {
  MEMBER: {
    active: '활동중',
    inactive: '비활동',
    pending: '승인대기',
  },
  PAYMENT: {
    pending: '결제대기',
    paid: '결제완료',
    overdue: '연체',
    refunded: '환불완료',
  },
  PASS: {
    active: '사용중',
    expired: '만료됨',
    suspended: '일시정지',
    cancelled: '취소됨',
  },
  EVENT: {
    draft: '초안',
    published: '게시됨',
    'registration-open': '등록 가능',
    'registration-closed': '등록 마감',
    'in-progress': '진행중',
    completed: '완료됨',
    cancelled: '취소됨',
  },
  CLUB: {
    active: '운영중',
    inactive: '비활성',
    pending: '승인대기',
    suspended: '정지됨',
  },
} as const;
// 연령대 분류
export const AGE_GROUPS = [
  { id: 'toddler', name: '유아', minAge: 3, maxAge: 6 },
  { id: 'child', name: '아동', minAge: 7, maxAge: 12 },
  { id: 'teen', name: '청소년', minAge: 13, maxAge: 17 },
  { id: 'adult', name: '성인', minAge: 18, maxAge: 64 },
  { id: 'senior', name: '시니어', minAge: 65, maxAge: 100 },
] as const;
// 성별 옵션
export const GENDER_OPTIONS = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
  { value: 'other', label: '기타' },
] as const;
// 요일 설정
export const WEEKDAYS = [
  { id: 0, name: '일요일', short: '일' },
  { id: 1, name: '월요일', short: '월' },
  { id: 2, name: '화요일', short: '화' },
  { id: 3, name: '수요일', short: '수' },
  { id: 4, name: '목요일', short: '목' },
  { id: 5, name: '금요일', short: '금' },
  { id: 6, name: '토요일', short: '토' },
] as const;
// 결제 방법
export const PAYMENT_METHODS = [
  { id: 'card', name: '신용카드', icon: '💳' },
  { id: 'cash', name: '현금', icon: '💵' },
  { id: 'transfer', name: '계좌이체', icon: '🏦' },
  { id: 'auto', name: '자동결제', icon: '🔄' },
] as const;
// 체조 종목
export const GYMNASTICS_EVENTS = [
  { id: 'floor', name: '마루운동', icon: '🤸' },
  { id: 'vault', name: '도마', icon: '🏃' },
  { id: 'bars', name: '철봉', icon: '🏋️' },
  { id: 'beam', name: '평균대', icon: '⚖️' },
  { id: 'rings', name: '링', icon: '💍' },
  { id: 'parallel_bars', name: '평행봉', icon: '🏗️' },
] as const;
