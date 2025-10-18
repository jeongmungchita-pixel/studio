'use client';

// ============================================
// 🏢 클럽 관리 시스템
// ============================================

// 클럽 기본 정보
export interface Club {
  id: string;
  name: string;
  description?: string;
  address: string;
  phoneNumber: string;
  email: string;
  website?: string;
  
  // 운영 정보
  ownerId: string;
  ownerName: string;
  contactName?: string; // 담당자 이름
  contactEmail?: string; // 담당자 이메일
  contactPhoneNumber?: string; // 담당자 전화번호
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  
  // 시설 정보
  facilities: string[]; // 예: ['매트', '평균대', '철봉', '도마']
  capacity: number; // 최대 수용 인원
  
  // 운영 시간
  operatingHours: {
    [key: string]: { // 'monday', 'tuesday', etc.
      open: string; // HH:MM
      close: string; // HH:MM
      closed: boolean;
    };
  };
  
  // 위치 정보
  location?: {
    latitude: number;
    longitude: number;
  };
  
  // 이미지
  logoURL?: string;
  images?: string[];
  
  // 메타데이터
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  
  // 통계 (비정규화)
  memberCount?: number;
  activeClassCount?: number;
  coachCount?: number;
}

// 클럽 등록 요청
export interface ClubRegistrationRequest {
  id: string;
  
  // 클럽 정보
  clubName: string;
  description?: string;
  address: string;
  phoneNumber: string;
  email: string;
  website?: string;
  
  // 오너 정보
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerExperience?: string;
  
  // 시설 정보
  facilities: string[];
  capacity: number;
  
  // 운영 계획
  businessPlan?: string;
  targetAudience?: string;
  
  // 첨부 문서
  businessLicense?: string; // 사업자등록증 URL
  facilityPhotos?: string[]; // 시설 사진 URLs
  
  // 상태
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
}

export interface EventOption {
  id: string;
  name: string;
  values: string[];
  required?: boolean;
}

// 체조 수업
export interface GymClass {
  id: string;
  name: string;
  description?: string;
  clubId: string;
  clubName: string;
  
  // 수업 정보
  level: string; // 'beginner', 'intermediate', 'advanced'
  ageGroup: string; // '유아', '초등', '중등', '성인'
  targetCategory?: 'adult' | 'child' | 'all'; // 대상 회원 분류
  ageRange?: { // 연령 제한
    min?: number;
    max?: number;
  };
  maxCapacity: number;
  currentEnrollment: number;
  
  // 스케줄
  schedule: {
    dayOfWeek: number; // 0=일요일, 1=월요일, ...
    startTime: string; // HH:MM
    endTime: string; // HH:MM
  }[];
  
  // 레거시 필드 (일부 UI 호환용)
  dayOfWeek?: string; // 예: '월', '화'
  time?: string; // 예: '18:00 ~ 19:30'
  capacity?: number;
  memberIds?: string[];

  // 담당 코치
  coachId: string;
  coachName: string;
  assistantCoachIds?: string[];
  
  // 비용
  monthlyFee: number;
  registrationFee?: number;
  
  // 상태
  status: 'active' | 'inactive' | 'full' | 'cancelled';
  
  // 메타데이터
  createdAt: string;
  updatedAt?: string;
  startDate: string; // 수업 시작일
  endDate?: string; // 수업 종료일 (정기 수업인 경우 선택적)
}

// 코치 정보
export interface Coach {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  clubId: string;
  clubName: string;
  
  // 자격 정보
  certifications: string[]; // 자격증 목록
  experience: number; // 경력 (년)
  specialties: string[]; // 전문 분야
  
  // 고용 정보
  employmentType: 'full-time' | 'part-time' | 'contract';
  startDate: string;
  endDate?: string;
  salary?: number;
  
  // 담당 수업
  assignedClasses: string[]; // GymClass IDs
  
  // 상태
  status: 'active' | 'inactive' | 'on-leave';
  
  // 개인 정보
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  
  // 프로필
  photoURL?: string;
  bio?: string;
  
  // 메타데이터
  createdAt: string;
  updatedAt?: string;
}

// 클럽 이벤트
export interface ClubEvent {
  id: string;
  title: string;
  description: string;
  clubId: string;
  clubName?: string;

  // 이벤트 정보
  type?: 'competition' | 'workshop' | 'performance' | 'social' | 'training';
  eventType: 'merchandise' | 'uniform' | 'special_class' | 'competition' | 'event' | 'other';
  startDate?: string;
  endDate?: string;
  location?: string;
  eventDate?: string | null;
  price?: number;
  priceUnit?: 'per_person' | 'per_item';

  // 등록 정보
  maxParticipants?: number | null;
  currentParticipants: number;
  registrationStart?: string;
  registrationEnd?: string;
  registrationFee?: number;
  minParticipants?: number | null;
  allowMultipleQuantity?: boolean;
  options?: EventOption[] | null;

  // 대상
  targetAudience?: string[]; // 예: ['beginner', 'intermediate']
  ageRestrictions?: {
    minAge?: number;
    maxAge?: number;
  };

  // 상태
  status: 'draft' | 'published' | 'registration-open' | 'registration-closed' | 'in-progress' | 'completed' | 'cancelled' | 'upcoming' | 'open' | 'closed';

  // 미디어
  posterURL?: string;
  images?: string[];

  // 주최자
  organizerId?: string;
  organizerName?: string;

  // 메타데이터
  createdAt: string;
  updatedAt?: string;
}

// 이벤트 등록
export interface EventRegistration {
  id: string;
  eventId: string;
  eventTitle: string;
  memberId: string;
  memberName: string;
  clubId: string;
  
  // 등록 정보
  registeredAt: string;
  status: 'registered' | 'waitlist' | 'cancelled' | 'attended' | 'no-show';
  
  // 결제 정보
  paymentStatus?: 'pending' | 'paid' | 'refunded' | 'cancelled';
  paymentAmount?: number;
  paymentDate?: string;
  quantity?: number;
  totalPrice?: number | null;
  selectedOptions?: Record<string, string> | null;
  allowMultipleQuantity?: boolean;

  // 추가 정보
  notes?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  
  // 메타데이터
  createdAt: string;
  updatedAt?: string;
}

// 클럽 통계
export interface ClubStats {
  clubId: string;
  
  // 회원 통계
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  memberRetentionRate: number;
  
  // 수업 통계
  totalClasses: number;
  activeClasses: number;
  averageClassSize: number;
  classUtilizationRate: number;
  
  // 재정 통계
  monthlyRevenue: number;
  yearlyRevenue: number;
  averageRevenuePerMember: number;
  
  // 출석 통계
  averageAttendanceRate: number;
  monthlyAttendance: {
    month: string;
    attendanceRate: number;
    totalSessions: number;
  }[];
  
  // 이벤트 통계
  eventsThisYear: number;
  averageEventParticipation: number;
  
  // 업데이트 시간
  lastUpdated: string;
}
