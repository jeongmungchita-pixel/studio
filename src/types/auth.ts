'use client';
// ============================================
// 🔐 인증 및 권한 시스템
// ============================================
// 13개 계층적 역할 시스템
export enum UserRole {
  // 최상위 관리자
  SUPER_ADMIN = 'SUPER_ADMIN',
  // 연맹 레벨
  FEDERATION_ADMIN = 'FEDERATION_ADMIN',
  FEDERATION_SECRETARIAT = 'FEDERATION_SECRETARIAT',
  // 위원회 레벨
  COMMITTEE_CHAIR = 'COMMITTEE_CHAIR',
  COMMITTEE_MEMBER = 'COMMITTEE_MEMBER',
  // 클럽 레벨
  CLUB_OWNER = 'CLUB_OWNER',
  CLUB_MANAGER = 'CLUB_MANAGER',
  CLUB_STAFF = 'CLUB_STAFF',
  MEDIA_MANAGER = 'MEDIA_MANAGER',
  // 코치 레벨
  HEAD_COACH = 'HEAD_COACH',
  ASSISTANT_COACH = 'ASSISTANT_COACH',
  // 회원 레벨
  MEMBER = 'MEMBER',
  PARENT = 'PARENT',
  // 벤더
  VENDOR = 'VENDOR',
}
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}
export enum CommitteeType {
  COMPETITION = 'COMPETITION',
  EDUCATION = 'EDUCATION',
  MARKETING = 'MARKETING',
}
// 역할 계층 구조 (숫자가 높을수록 높은 권한)
export const roleHierarchy: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.FEDERATION_ADMIN]: 90,
  [UserRole.FEDERATION_SECRETARIAT]: 80,
  [UserRole.COMMITTEE_CHAIR]: 70,
  [UserRole.COMMITTEE_MEMBER]: 60,
  [UserRole.CLUB_OWNER]: 50,
  [UserRole.CLUB_MANAGER]: 45,
  [UserRole.CLUB_STAFF]: 40,
  [UserRole.MEDIA_MANAGER]: 40,
  [UserRole.HEAD_COACH]: 35,
  [UserRole.ASSISTANT_COACH]: 30,
  [UserRole.MEMBER]: 20,
  [UserRole.PARENT]: 15,
  [UserRole.VENDOR]: 10,
};
// 권한 체크 헬퍼 함수
export function hasHigherRole(userRole: UserRole, targetRole: UserRole): boolean {
  return roleHierarchy[userRole] > roleHierarchy[targetRole];
}
export function hasEqualOrHigherRole(userRole: UserRole, targetRole: UserRole): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[targetRole];
}
export function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  return hasHigherRole(managerRole, targetRole);
}
// 사용자 프로필 타입
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'pending';
  provider: 'email' | 'google';
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  // 클럽 관련 (클럽 오너/매니저인 경우)
  clubId?: string;
  clubName?: string;
  // 위원회 관련 (위원회 멤버인 경우)
  committeeId?: string;
  committeeName?: string;
  // 추가 메타데이터
  metadata?: {
    onboardingCompleted?: boolean;
    termsAcceptedAt?: string;
    privacyAcceptedAt?: string;
  };
}
// 인증 상태
export interface AuthState {
  _user: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
}
// 로그인 요청
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}
// 회원가입 요청
export interface SignupRequest {
  email: string;
  password: string;
  displayName: string;
  phoneNumber?: string;
  role: UserRole;
  clubId?: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}
// 초대 시스템
export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  invitedBy: string;
  invitedByName: string;
  clubId?: string;
  clubName?: string;
  committeeId?: string;
  committeeName?: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  token: string;
}
// 클럽 소유자 등록 요청
export interface ClubOwnerRequest {
  id: string;
  userId: string; // 사용자 ID
  name: string;
  email: string;
  phoneNumber: string;
  clubName: string;
  clubAddress: string | { latitude: number; longitude: number; };
  businessLicense?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string; // 요청 시간
  createdAt: string;
  updatedAt?: string;
}
