'use client';

// ============================================
// 👤 회원 관리 시스템
// ============================================

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export type MemberCategory = 'adult' | 'child';

// 회원 기본 정보
export interface Member {
  id: string;
  userId?: string;
  name: string;
  dateOfBirth?: string; // ISO 8601 date string
  gender?: 'male' | 'female';
  email?: string; // 선택적 (자녀는 없을 수 있음)
  phoneNumber?: string;
  clubId: string;
  clubName?: string; // 비정규화 - 클럽 이름 (조인 방지)
  status: 'active' | 'inactive' | 'pending';
  guardianIds?: string[]; // 부모 Member ID 배열
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
  photoURL?: string;
  activePassId?: string; // ID of the current MemberPass
  memberCategory?: MemberCategory; // 회원 분류
  memberType?: 'individual' | 'family';
  familyRole?: 'parent' | 'child';
  grade?: string;
  createdAt: string;
  updatedAt?: string;
  
  // 추가 정보
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalConditions?: string;
  notes?: string;
  
  // 체조 관련
  currentLevel?: string;
  experience?: string;
  goals?: string;
}

// 회원 등록 요청
export interface MemberRegistrationRequest {
  id: string;
  type: 'adult' | 'family';
  
  // 기본 정보
  name: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  
  // 클럽 정보
  clubId: string;
  clubName: string;
  
  // 추가 정보
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalConditions?: string;
  experience?: string;
  goals?: string;
  
  // 가족 등록인 경우
  children?: {
    name: string;
    dateOfBirth: string;
    gender: 'male' | 'female';
    medicalConditions?: string;
  }[];
  
  // 상태
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
}

export interface MemberRequest {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  clubId: string;
  clubName?: string;
  memberType?: 'individual' | 'family';
  familyRole?: 'parent' | 'child';
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  createdMemberId?: string;
}

export interface AdultRegistrationRequest {
  id: string;
  clubId: string;
  clubName: string;
  requestType: 'adult';
  name: string;
  birthDate: string;
  gender: 'male' | 'female';
  phoneNumber: string;
  email?: string;
  agreements: {
    personal: boolean;
    terms: boolean;
    safety: boolean;
    portrait: boolean;
    agreedAt: string;
  };
  signature: string;
  signedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  createdMemberId?: string;
}

export interface FamilyParent {
  name: string;
  birthDate: string;
  gender: 'male' | 'female';
  phoneNumber: string;
  email?: string;
}

export interface FamilyChild {
  name: string;
  birthDate: string;
  gender: 'male' | 'female';
  grade?: string;
}

export interface ExternalGuardian {
  name: string;
  phoneNumber: string;
  relation: 'parent' | 'grandparent' | 'legal_guardian' | 'other';
}

export interface FamilyRegistrationRequest {
  id: string;
  clubId: string;
  clubName: string;
  requestType: 'family';
  parents: FamilyParent[];
  children: FamilyChild[];
  externalGuardian?: ExternalGuardian;
  agreements: {
    personal: boolean;
    terms: boolean;
    safety: boolean;
    portrait: boolean;
    agreedAt: string;
  };
  signature: string;
  signedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  createdMemberIds?: string[];
}

// 회원 레벨 시스템
export interface MemberLevel {
  id: string;
  name: string; // 예: '입문', '초급', '중급', '고급'
  code: string; // 예: 'BEGINNER', 'INTERMEDIATE'
  color: string; // 배지 색상
  minScore: number; // 최소 점수
  maxScore: number; // 최대 점수
  order: number; // 정렬 순서
  icon?: string; // 아이콘 또는 이모지
  description?: string;
  requirements?: string[]; // 승급 요구사항
}

// 출석 기록
export interface Attendance {
  id: string;
  memberId: string;
  memberName: string;
  clubId: string;
  classId?: string;
  className?: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // ISO 8601
  checkOutTime?: string; // ISO 8601
  status: 'present' | 'late' | 'absent' | 'excused';
  notes?: string;
  recordedBy: string; // 기록한 사람 (코치/스태프)
  createdAt: string;
}

// 미디어 아이템
export interface MediaItem {
  id: string;
  memberId: string;
  memberName: string;
  clubId: string;
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  tags?: string[];
  uploadDate: string;
  uploadedBy: string;
  uploadedByName: string;
  isPublic: boolean;
  
  // 메타데이터
  fileSize?: number;
  mimeType?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number; // 비디오인 경우 (초)
}

// 회원 통계
export interface MemberStats {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  adultMembers: number;
  childMembers: number;
  
  // 월별 통계
  monthlyStats: {
    month: string; // YYYY-MM
    newMembers: number;
    activeMembers: number;
    attendanceRate: number;
  }[];
  
  // 레벨별 분포
  levelDistribution: {
    level: string;
    count: number;
    percentage: number;
  }[];
}
