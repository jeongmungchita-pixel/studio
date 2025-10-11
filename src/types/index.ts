'use client';
// This file is aligned with docs/backend.json

// ============================================
// 🎯 역할 및 권한 시스템 (windsurf 통합)
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

export enum CommitteeType {
  COMPETITION = 'COMPETITION',
  EDUCATION = 'EDUCATION',
  MARKETING = 'MARKETING',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
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

// ============================================
// 📋 기존 타입 정의
// ============================================

export type Member = {
  id: string;
  name: string;
  dateOfBirth?: string; // ISO 8601 date string
  gender?: 'male' | 'female';
  email?: string;
  phoneNumber?: string;
  clubId: string;
  status: 'active' | 'inactive' | 'pending';
  guardianIds?: string[];
  photoURL?: string;
  activePassId?: string; // ID of the current MemberPass
  classId?: string; // ID of the class the member is enrolled in
};

export type Club = {
  id: string;
  name: string;
  contactName: string;
  contactEmail:string;
  contactPhoneNumber: string;
  location: string;
};

export type Competition = {
  id: string;
  name: string;
  startDate: string; // ISO 8601 date string
  endDate: string; // ISO 8601 date string
  location: string;
  status: 'upcoming' | 'ongoing' | 'completed'; // Not in backend.json, but can be derived
};

export type LevelTest = {
  id: string;
  name: string;
  date: string; // ISO 8601 date string
  location: string;
  status: 'scheduled' | 'completed';
};

export type Attendance = {
  id:string;
  memberId: string;
  clubId: string;
  date: string; // ISO 8601 date string
  status: 'present' | 'absent' | 'excused';
  passId: string;
};

export type MemberPass = {
  id: string;
  memberId: string;
  clubId: string;
  passType: string; // e.g., 'standard', 'premium'
  passName: string; // e.g. 'Standard 5-session pass'
  paymentMethod?: 'bank-transfer' | 'card';
  startDate?: string; // ISO 8601 date string
  endDate?: string; // ISO 8601 date string, optional
  totalSessions?: number; // e.g. 5
  attendableSessions?: number; // e.g. 4
  remainingSessions?: number;
  attendanceCount?: number;
  status: 'active' | 'expired' | 'pending';
};


// ============================================
// 👤 사용자 프로필 (업그레이드됨)
// ============================================

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole; // 13개 역할 시스템 사용
  provider: 'email' | 'google';
  status: 'pending' | 'approved';
  isGuardian?: boolean;
  clubName?: string;
  phoneNumber?: string;
  clubId?: string;
  committeeId?: string; // 위원회 소속
  parentId?: string; // 상위 관리자 (코치의 경우 상위 코치)
  
  // 추가 프로필 정보
  address?: string;
  birthDate?: string;
  gender?: Gender;
  bio?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
};

// 레거시 호환성을 위한 타입 (기존 코드가 깨지지 않도록)
export type LegacyUserRole = 'admin' | 'member' | 'club-admin';

// 레거시 역할을 새 역할로 변환하는 헬퍼
export function convertLegacyRole(legacyRole: LegacyUserRole): UserRole {
  switch (legacyRole) {
    case 'admin':
      return UserRole.FEDERATION_ADMIN;
    case 'club-admin':
      return UserRole.CLUB_MANAGER;
    case 'member':
      return UserRole.MEMBER;
    default:
      return UserRole.MEMBER;
  }
}

export type PassTemplate = {
    id: string;
    clubId: string;
    name: string;
    totalSessions?: number;
    attendableSessions?: number;
    durationDays?: number;
    price?: number;
    description?: string;
}

export type GymClass = {
  id: string;
  clubId: string;
  name: string;
  dayOfWeek: '월' | '화' | '수' | '목' | '금' | '토' | '일';
  time: string; // e.g., "14:00"
  capacity: number;
  memberIds: string[];
};

export type MediaItem = {
    id: string;
    memberId: string;
    clubId: string;
    mediaURL: string;
    mediaType: 'image' | 'video';
    caption?: string;
    uploadDate: string; // ISO 8601 date string
};

// ============================================
// 🏛️ 위원회 시스템 (windsurf 통합)
// ============================================

export type Committee = {
  id: string;
  name: string;
  type: CommitteeType;
  description?: string;
  chairId?: string; // 위원장 ID
  createdAt: string;
  updatedAt: string;
};

export type CommitteeMember = {
  committeeId: string;
  userId: string;
  role: UserRole;
  joinedAt: string;
  isActive: boolean;
};

// ============================================
// 🏪 벤더 및 공동구매 시스템 (windsurf 통합)
// ============================================

export type Vendor = {
  id: string;
  name: string;
  description?: string;
  category: string; // 장비, 의류, 영양제 등
  contactPerson: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  address?: string;
  businessNumber?: string; // 사업자등록번호
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VendorProduct = {
  id: string;
  vendorId: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  discountPrice?: number;
  imageUrl?: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GroupOrder = {
  id: string;
  vendorId: string;
  productId: string;
  clubId?: string; // 특정 클럽 전용 주문인 경우
  title: string;
  description?: string;
  targetQuantity: number;
  currentQuantity: number;
  unitPrice: number;
  discountPrice: number;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'ACTIVE' | 'CLOSED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
};

export type OrderParticipation = {
  id: string;
  orderId: string;
  userId: string;
  quantity: number;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'PAID' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
};
