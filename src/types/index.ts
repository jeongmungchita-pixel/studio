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
  email?: string; // 선택적 (자녀는 없을 수 있음)
  phoneNumber?: string;
  clubId: string;
  clubName?: string; // 비정규화 - 클럽 이름 (조인 방지)
  status: 'active' | 'inactive' | 'pending';
  guardianIds?: string[]; // 부모 UserProfile UID 배열
  photoURL?: string;
  activePassId?: string; // ID of the current MemberPass
  classId?: string; // ID of the class the member is enrolled in
  
  // 가족 회원 관련
  memberType?: 'individual' | 'family'; // 개인 or 가족 회원
  familyRole?: 'parent' | 'child'; // 부모 or 자녀
  
  // 승인 관련
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  requestedAt?: string;
  
  // 추가 필드 (분석/통계용)
  joinDate?: string; // 가입일
  level?: string; // 현재 급수 (예: "1급", "2급")
  levelColor?: string; // 띠 색상 (예: "black", "red")
  levelRank?: number; // 급수 순위 (숫자)
  grade?: string; // 학년 (예: "초등 3학년")
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
  note?: string; // 메모/사유
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
  id: string; // 문서 ID (uid와 동일하거나 별도 ID)
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole; // 13개 역할 시스템 사용
  provider: 'email' | 'google';
  status: 'pending' | 'approved' | 'rejected';
  isGuardian?: boolean;
  clubName?: string;
  phoneNumber?: string;
  clubId?: string;
  committeeId?: string; // 위원회 소속
  parentId?: string; // 상위 관리자 (코치의 경우 상위 코치)
  
  // 승인 관련
  approvedBy?: string; // 승인한 사람 UID
  approvedAt?: string; // 승인 날짜
  rejectedBy?: string; // 거부한 사람 UID
  rejectedAt?: string; // 거부 날짜
  rejectionReason?: string; // 거부 사유
  requestedAt?: string; // 신청 날짜
  
  // 가족 회원
  familyType?: 'individual' | 'parent' | 'child';
  familyMembers?: string[]; // 가족 구성원 UID 배열
  
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
    passType?: 'period' | 'session' | 'unlimited'; // 기간제, 횟수제, 기간+횟수제
    totalSessions?: number;
    attendableSessions?: number;
    durationDays?: number;
    price?: number;
    description?: string;
}

export type PassRenewalRequest = {
    id: string;
    memberId: string;
    memberName: string;
    clubId: string;
    passTemplateId: string;
    passTemplateName: string;
    requestedAt: string;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
}

export type GymClass = {
  id: string;
  clubId: string;
  name: string;
  dayOfWeek: '월' | '화' | '수' | '목' | '금' | '토' | '일';
  time: string;
  capacity: number;
  memberIds: string[];
};

export interface MediaItem {
  id: string;
  memberId: string;
  clubId: string;
  mediaType: 'image' | 'video';
  mediaURL: string;
  thumbnailURL?: string;
  uploadDate: string;
  caption?: string;
  tags?: string[];
}

export interface EventOption {
  id: string;
  name: string;
  values: string[];
  required: boolean;
}

export interface ClubEvent {
  id: string;
  clubId: string;
  title: string;
  description: string;
  eventType: 'merchandise' | 'uniform' | 'special_class' | 'competition' | 'event' | 'other';
  price: number;
  priceUnit: 'per_person' | 'per_item';
  registrationStart: string;
  registrationEnd: string;
  eventDate?: string;
  minParticipants?: number;
  maxParticipants?: number;
  currentParticipants: number;
  options?: EventOption[];
  allowMultipleQuantity: boolean;
  status: 'upcoming' | 'open' | 'closed' | 'completed' | 'cancelled';
  imageURL?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  memberId: string;
  memberName: string;
  clubId: string;
  selectedOptions: Record<string, string>;
  quantity: number;
  totalPrice: number;
  paymentStatus: 'pending' | 'paid' | 'cancelled';
  registeredAt: string;
  notes?: string;
}

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

// ============================================
// ✅ 승인 시스템 (Approval System)
// ============================================

// 승인 규칙: 누가 누구를 승인할 수 있는가
export const approvalRules: Record<UserRole, UserRole[]> = {
  // 슈퍼 어드민이 승인
  [UserRole.SUPER_ADMIN]: [
    UserRole.FEDERATION_ADMIN,
    UserRole.FEDERATION_SECRETARIAT,
    UserRole.COMMITTEE_CHAIR,
    UserRole.CLUB_OWNER,
  ],
  
  // 연맹 관리자가 승인
  [UserRole.FEDERATION_ADMIN]: [
    UserRole.COMMITTEE_MEMBER,
  ],
  
  // 클럽 오너가 승인
  [UserRole.CLUB_OWNER]: [
    UserRole.CLUB_MANAGER,
    UserRole.CLUB_STAFF,
    UserRole.MEDIA_MANAGER,
    UserRole.HEAD_COACH,
    UserRole.ASSISTANT_COACH,
    UserRole.MEMBER,
    UserRole.PARENT,
  ],
  
  // 나머지 역할은 승인 권한 없음
  [UserRole.FEDERATION_SECRETARIAT]: [],
  [UserRole.COMMITTEE_CHAIR]: [],
  [UserRole.COMMITTEE_MEMBER]: [],
  [UserRole.CLUB_MANAGER]: [],
  [UserRole.CLUB_STAFF]: [],
  [UserRole.MEDIA_MANAGER]: [],
  [UserRole.HEAD_COACH]: [],
  [UserRole.ASSISTANT_COACH]: [],
  [UserRole.MEMBER]: [],
  [UserRole.PARENT]: [],
  [UserRole.VENDOR]: [],
};

// 승인 권한 체크 함수
export function canApproveRole(approverRole: UserRole, targetRole: UserRole): boolean {
  return approvalRules[approverRole]?.includes(targetRole) || false;
}

// 승인 요청 타입
export type ApprovalRequest = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  requestedRole: UserRole;
  clubId?: string;
  clubName?: string;
  familyType?: 'individual' | 'parent' | 'child';
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
};

// 최고 관리자 신청 타입
export type SuperAdminRequest = {
  id: string;
  userId: string;
  name: string;
  email: string;
  phoneNumber: string;
  organization: string;
  position: string;
  reason: string;
  secretCode: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
};

// 클럽 오너 신청 타입
export type ClubOwnerRequest = {
  id: string;
  userId: string;
  name: string;
  email: string;
  phoneNumber: string;
  clubName: string;
  clubAddress: string;
  clubPhone: string;
  clubEmail?: string;
  clubDescription?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
};

// 회원 가입 신청 타입
export type MemberRequest = {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  clubId: string;
  clubName: string;
  memberType: 'individual' | 'family';
  familyRole?: 'parent' | 'child';
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
};

// 가족 대표 가입 신청 타입
export type FamilyRequest = {
  id: string;
  userId: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  clubId: string;
  clubName: string;
  children: Array<{
    name: string;
    dateOfBirth: string;
    gender: 'male' | 'female';
  }>;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
};

// ============================================
// 🏆 시합 시스템
// ============================================

export interface GymnasticsEvent {
  id: string;
  name: string;
  code: string; // FX, PH, SR, VT, PB, HB, UB, BB
  gender: 'male' | 'female' | 'both';
  maxScore: number;
  judgeCount: number;
}

export interface CompetitionCategory {
  id: string;
  type: 'grade' | 'level';
  name: string;
  minAge?: number;
  maxAge?: number;
  level?: string;
}

export interface GymnasticsCompetition {
  id: string;
  title: string;
  description: string;
  registrationStart: string;
  registrationEnd: string;
  competitionDate: string;
  venue?: string;
  status: 'draft' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled';
  events: GymnasticsEvent[];
  categories: CompetitionCategory[];
  genderSeparate: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CompetitionRegistration {
  id: string;
  competitionId: string;
  memberId: string;
  memberName: string;
  clubId: string;
  clubName: string;
  gender: 'male' | 'female';
  birthDate: string;
  age: number;
  grade?: string;
  level?: string;
  registeredEvents: string[];
  clubOrder?: number;
  categoryId?: string;
  status: 'pending' | 'approved' | 'rejected';
  registeredAt: string;
}

export interface CompetitionSchedule {
  id: string;
  competitionId: string;
  eventId: string;
  eventName: string;
  categoryId: string;
  categoryName: string;
  gender: 'male' | 'female';
  participants: ScheduleParticipant[];
  assignedJudges: string[];
  status: 'scheduled' | 'in_progress' | 'completed';
  startTime?: string;
  endTime?: string;
}

export interface ScheduleParticipant {
  registrationId: string;
  memberId: string;
  memberName: string;
  clubName: string;
  order: number;
  bib?: string;
}

export interface JudgeScore {
  judgeId: string;
  judgeName: string;
  score: number;
  note?: string;
}

export interface GymnasticsScore {
  id: string;
  competitionId: string;
  scheduleId: string;
  registrationId: string;
  memberId: string;
  memberName: string;
  clubName: string;
  eventId: string;
  eventName: string;
  categoryId: string;
  gender: 'male' | 'female';
  dScore: {
    judge1: number;
    judge2: number;
    final: number;
  };
  eScore: {
    judge1: number;
    judge2: number;
    final: number;
  };
  deductions?: Array<{
    type: string;
    points: number;
  }>;
  finalScore: number;
  rank?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionResult {
  id: string;
  competitionId: string;
  competitionTitle: string;
  memberId: string;
  memberName: string;
  clubName: string;
  categoryId: string;
  categoryName: string;
  gender: 'male' | 'female';
  eventScores: Array<{
    eventId: string;
    eventName: string;
    score: number;
    rank: number;
  }>;
  totalScore: number;
  overallRank: number;
  completedAt: string;
}

export interface Judge {
  id: string;
  name: string;
  email: string;
  phone: string;
  certification?: string;
  assignedEvents: string[];
  role: 'D' | 'E';
  createdAt: string;
}

// ============================================
// 🥋 레벨테스트 시스템
// ============================================

export interface TestLevel {
  id: string;
  name: string;
  code: string;
  color: string;
  minScore: number;
  maxScore: number;
  order: number;
  icon?: string;
}

export interface EvaluationItem {
  id: string;
  name: string;
  maxScore: number;
  weight: number;
}

export interface ClubLevelTest {
  id: string;
  clubId: string;
  title: string;
  description: string;
  testDate: string;
  registrationStart: string;
  registrationEnd: string;
  levels: TestLevel[];
  evaluationItems: EvaluationItem[];
  status: 'draft' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface LevelTestRegistration {
  id: string;
  testId: string;
  memberId: string;
  memberName: string;
  clubId: string;
  currentLevel?: string;
  targetLevel: string;
  status: 'pending' | 'approved' | 'rejected';
  registeredAt: string;
}

export interface LevelTestScore {
  id: string;
  testId: string;
  registrationId: string;
  memberId: string;
  memberName: string;
  targetLevel: string;
  itemScores: Array<{
    itemId: string;
    itemName: string;
    score: number;
    maxScore: number;
  }>;
  totalScore: number;
  percentage: number;
  passed: boolean;
  achievedLevel?: string;
  rank?: number;
  evaluatorId: string;
  evaluatorName: string;
  notes?: string;
  createdAt: string;
}

export interface LevelTestResult {
  id: string;
  testId: string;
  testTitle: string;
  memberId: string;
  clubId: string;
  targetLevel: string;
  achievedLevel: string;
  passed: boolean;
  totalScore: number;
  percentage: number;
  rank?: number;
  badge: {
    level: string;
    color: string;
    icon?: string;
    earnedAt: string;
  };
  completedAt: string;
}

export interface MemberLevel {
  currentLevel: string;
  levelCode: string;
  levelColor: string;
  levelIcon?: string;
  earnedAt: string;
  testId: string;
  testTitle: string;
  rank?: number;
}

// ============================================
// 📊 통계 및 분석
// ============================================

export interface ClubStatistics {
  clubId: string;
  totalMembers: number;
  activeMemberCount: number;
  newMembersThisMonth: number;
  totalAttendanceThisMonth: number;
  attendanceRate: number;
  revenueThisMonth: number;
  levelDistribution: Record<string, number>;
  ageDistribution: Record<string, number>;
  genderDistribution: { male: number; female: number };
  updatedAt: string;
}

// ============================================
// 📢 공지사항
// ============================================

export interface Announcement {
  id: string;
  clubId?: string;
  federationId?: string;
  title: string;
  content: string;
  type: 'general' | 'important' | 'event' | 'emergency';
  targetAudience: 'all' | 'members' | 'parents' | 'staff';
  isPinned: boolean;
  attachments?: string[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// 🔔 알림
// ============================================

export interface Notification {
  id: string;
  userId: string;
  type: 'announcement' | 'event' | 'pass' | 'attendance' | 'competition' | 'level_test' | 'payment';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

// ============================================
// 💳 결제
// ============================================

export interface Payment {
  id: string;
  memberId: string;
  memberName: string;
  clubId: string;
  type: 'pass' | 'event' | 'competition' | 'level_test' | 'other';
  relatedId?: string;
  amount: number;
  method: 'card' | 'bank_transfer' | 'cash' | 'other';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  bankTransferInfo?: {
    depositorName: string;
    depositDate: string;
    receiptImage?: string;
  };
  verifiedBy?: string;
  verifiedAt?: string;
  paidAt?: string;
  createdAt: string;
}

// ============================================
// 🏦 클럽 계좌 정보
// ============================================

export interface ClubBankAccount {
  clubId: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// 📱 단체문자 / 알림톡
// ============================================

export interface MessageTemplate {
  id: string;
  clubId: string;
  name: string;
  type: 'sms' | 'lms' | 'kakao';
  content: string;
  variables: string[];
  createdAt: string;
}

export interface MessageHistory {
  id: string;
  clubId: string;
  type: 'sms' | 'lms' | 'kakao';
  templateId?: string;
  recipients: Array<{
    memberId: string;
    memberName: string;
    phone: string;
    status: 'pending' | 'sent' | 'failed';
    sentAt?: string;
    failReason?: string;
  }>;
  content: string;
  totalCount: number;
  successCount: number;
  failCount: number;
  sentBy: string;
  sentByName: string;
  createdAt: string;
}

// ============================================
// 🔔 네이버 클라우드 설정
// ============================================

export interface NaverCloudConfig {
  clubId: string;
  serviceId: string;
  accessKey: string;
  secretKey: string;
  senderPhone: string;
  kakaoSenderId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// 📧 연맹 관리자 초대
// ============================================

export interface FederationAdminInvite {
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
  inviteToken: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invitedBy: string;
  invitedByName: string;
  invitedAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

// ============================================
// 💰 재무 관리
// ============================================

export interface Income {
  id: string;
  clubId: string;
  type: 'pass' | 'event' | 'competition' | 'level_test' | 'other';
  category: string;
  amount: number;
  description: string;
  date: string;
  paymentId?: string;
  memberId?: string;
  memberName?: string;
  isRecurring: boolean;
  isSplit: boolean;
  splitInfo?: {
    totalAmount: number;
    months: number;
    monthlyAmount: number;
    startMonth: string;
    allocations: Array<{
      month: string;
      amount: number;
      allocated: boolean;
    }>;
  };
  createdBy: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  clubId: string;
  category: 'rent' | 'salary' | 'equipment' | 'supplies' | 'utilities' | 'marketing' | 'maintenance' | 'other';
  amount: number;
  description: string;
  date: string;
  isRecurring: boolean;
  recurringInfo?: {
    frequency: 'monthly' | 'quarterly' | 'yearly';
    nextDate: string;
  };
  receiptImage?: string;
  createdBy: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  clubId: string;
  month: string;
  categories: {
    rent: number;
    salary: number;
    equipment: number;
    supplies: number;
    utilities: number;
    marketing: number;
    maintenance: number;
    other: number;
  };
  totalBudget: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialSummary {
  clubId: string;
  month: string;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
  memberCount: number;
  arpu: number;
  updatedAt: string;
}
