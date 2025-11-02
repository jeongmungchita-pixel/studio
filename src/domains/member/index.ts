'use client';
// ============================================
// 👤 회원 도메인 모듈
// ============================================
// 타입 정의
export * from '@/types/member';
// 유틸리티
export * from './utils';
// 컴포넌트 (도메인별 특화 컴포넌트)
// export { MemberCard } from './components/member-card'; // 삭제됨
// export { MemberStatusBadge } from './components/member-status-badge'; // 삭제됨
// export { MemberSearch } from './components/member-search'; // 삭제됨
export { MemberStats as MemberStatsComponent } from './components/member-stats';
// export { AttendanceTracker } from './components/attendance-tracker'; // 삭제됨
