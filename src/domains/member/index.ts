'use client';

// ============================================
// 👤 회원 도메인 모듈
// ============================================

// 타입 정의
export * from '@/types/member';

// 서비스
export { 
  MemberService, 
  RegistrationRequestService, 
  AttendanceService 
} from '@/services/member.service';

// 훅
export { useMemberService } from '@/services';

// 유틸리티
export * from './utils';

// 컴포넌트 (도메인별 특화 컴포넌트)
export * from './components';
