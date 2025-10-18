'use client';

// ============================================
// 💼 비즈니스 로직 및 운영 시스템
// ============================================

export enum CommitteeType {
  COMPETITION = 'COMPETITION',
  EDUCATION = 'EDUCATION',
  MARKETING = 'MARKETING',
}

// 위원회
export interface Committee {
  id: string;
  name: string;
  type: CommitteeType;
  description?: string;
  
  // 구성원
  chairId: string;
  chairName: string;
  memberIds: string[];
  memberCount: number;
  
  // 상태
  status: 'active' | 'inactive' | 'dissolved';
  
  // 메타데이터
  createdAt: string;
  updatedAt?: string;
  establishedDate: string;
}

// 이용권 템플릿
export interface PassTemplate {
  id: string;
  name: string;
  description?: string;
  clubId: string;
  clubName: string;
  
  // 이용권 정보
  type: 'monthly' | 'quarterly' | 'yearly' | 'session-based' | 'unlimited';
  duration: number; // 일 단위 (월간: 30, 분기: 90, 연간: 365)
  sessionCount?: number; // 세션 기반인 경우
  
  // 가격 정보
  price: number;
  discountPrice?: number;
  currency: string; // 'KRW'
  
  // 사용 조건
  validDays: number[]; // 0=일요일, 1=월요일, ... 사용 가능한 요일
  validTimes?: {
    start: string; // HH:MM
    end: string; // HH:MM
  };
  
  // 대상
  targetCategory: 'adult' | 'child' | 'family' | 'all';
  ageRestrictions?: {
    minAge?: number;
    maxAge?: number;
  };
  
  // 혜택
  benefits: string[]; // 예: ['무료 체험 1회', '개인 상담', '이벤트 우선 참가']
  
  // 상태
  status: 'active' | 'inactive' | 'archived';
  
  // 메타데이터
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

// 회원 이용권
export interface MemberPass {
  id: string;
  templateId: string;
  templateName: string;
  memberId: string;
  memberName: string;
  clubId: string;
  
  // 이용권 정보
  type: 'monthly' | 'quarterly' | 'yearly' | 'session-based' | 'unlimited';
  startDate: string;
  endDate: string;
  remainingSessions?: number; // 세션 기반인 경우
  
  // 결제 정보
  price: number;
  paymentStatus: 'pending' | 'paid' | 'overdue' | 'refunded';
  paymentDate?: string;
  paymentMethod?: string;
  
  // 상태
  status: 'active' | 'expired' | 'suspended' | 'cancelled';
  
  // 사용 기록
  usageCount: number;
  lastUsedAt?: string;
  
  // 메타데이터
  createdAt: string;
  updatedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

// 이용권 갱신 요청
export interface PassRenewalRequest {
  id: string;
  currentPassId: string;
  newTemplateId: string;
  memberId: string;
  memberName: string;
  clubId: string;
  
  // 요청 정보
  requestedStartDate: string;
  paymentMethod: 'card' | 'cash' | 'transfer' | 'auto';
  
  // 상태
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  
  // 처리 정보
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
  
  // 메타데이터
  requestedAt: string;
  createdAt: string;
}

// 결제 정보
export interface Payment {
  id: string;
  memberId: string;
  memberName: string;
  clubId: string;
  
  // 결제 대상
  targetType: 'pass' | 'event' | 'class' | 'merchandise' | 'other';
  targetId: string;
  targetName: string;
  
  // 결제 정보
  amount: number;
  currency: string;
  method: 'card' | 'cash' | 'transfer' | 'auto';
  
  // 상태
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  
  // 결제 세부사항
  paymentDate?: string;
  transactionId?: string;
  receiptURL?: string;
  
  // 환불 정보
  refundAmount?: number;
  refundDate?: string;
  refundReason?: string;
  
  // 메타데이터
  createdAt: string;
  updatedAt?: string;
  processedBy?: string;
}

// 재무 수입/지출
export interface IncomeSplitAllocation {
  month: string; // YYYY-MM
  amount: number;
  allocated: boolean;
}

export interface IncomeSplitInfo {
  totalAmount: number;
  months: number;
  monthlyAmount: number;
  startMonth: string; // YYYY-MM
  allocations: IncomeSplitAllocation[];
}

export interface Income {
  id: string;
  clubId: string;
  type: 'membership' | 'registration' | 'event' | 'sponsorship' | 'other';
  category: string;
  amount: number;
  description: string;
  date: string; // ISO string
  isRecurring: boolean;
  isSplit: boolean;
  splitInfo?: IncomeSplitInfo | null;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  clubId: string;
  category: string;
  amount: number;
  description: string;
  date: string; // ISO string
  isRecurring: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  paymentMethod?: string;
}

// 재정 거래
export interface FinancialTransaction {
  id: string;
  clubId: string;
  
  // 거래 정보
  type: 'income' | 'expense';
  category: string; // 예: 'membership', 'equipment', 'utilities', 'salary'
  amount: number;
  currency: string;
  
  // 설명
  description: string;
  notes?: string;
  
  // 관련 정보
  relatedMemberId?: string;
  relatedPaymentId?: string;
  relatedInvoiceId?: string;
  
  // 날짜
  date: string; // YYYY-MM-DD
  
  // 분할 거래 (여러 카테고리로 나누는 경우)
  splitTransactions?: {
    category: string;
    amount: number;
    description: string;
  }[];
  splitParentId?: string; // 분할된 거래의 부모 ID
  
  // 상태
  status: 'pending' | 'completed' | 'cancelled';
  isCancelled: boolean;
  
  // 메타데이터
  createdAt: string;
  updatedAt?: string;
  recordedBy: string;
  recordedByName: string;
}

// 승급 심사 - 평가 항목
export interface EvaluationItem {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
  weight?: number;
  order?: number;
}

// 승급 심사 - 레벨 정의
export interface TestLevel {
  id: string;
  name: string;
  code: string;
  color: string;
  minScore: number;
  maxScore: number;
  order: number;
  icon?: string;
  description?: string;
}

// 승급 심사 (클럽 전용)
export interface ClubLevelTest {
  id: string;
  clubId: string;
  title: string;
  description: string;
  registrationStart: string;
  registrationEnd: string;
  testDate: string;
  location?: string;
  levels: TestLevel[];
  evaluationItems: EvaluationItem[];
  status: 'draft' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'registration-open' | 'registration-closed' | 'in-progress';
  maxParticipants?: number;
  currentParticipants?: number;
  createdAt: string;
  updatedAt?: string;
}

// 승급 심사 등록
export interface LevelTestRegistration {
  id: string;
  testId: string;
  testName: string;
  memberId: string;
  memberName: string;
  clubId: string;
  
  // 등록 정보
  currentLevel: string;
  targetLevel: string;
  registeredAt: string;
  
  // 결과
  status: 'registered' | 'approved' | 'pending' | 'tested' | 'passed' | 'failed' | 'absent' | 'cancelled';
  totalScore?: number;
  skillScores?: {
    skill: string;
    score: number;
    maxScore: number;
  }[];
  
  // 심사 결과
  feedback?: string;
  certificate?: string; // 인증서 URL
  
  // 결제 정보
  paymentStatus?: 'pending' | 'paid' | 'waived';
  paymentAmount?: number;
  
  // 메타데이터
  createdAt: string;
  updatedAt?: string;
  evaluatedAt?: string;
  evaluatedBy?: string;
}

export interface LevelTestScore {
  id: string;
  testId: string;
  registrationId: string;
  memberId: string;
  memberName: string;
  targetLevel: string;
  itemScores: {
    itemId: string;
    itemName: string;
    score: number;
    maxScore: number;
  }[];
  totalScore: number;
  percentage: number;
  passed: boolean;
  achievedLevel: string;
  evaluatorId: string;
  evaluatorName: string;
  notes?: string;
  rank?: number;
  createdAt: string;
  updatedAt?: string;
}

// 메시지 히스토리
export interface MessageRecipient {
  memberId: string;
  memberName: string;
  phone: string;
  status: 'pending' | 'sent' | 'failed';
}

export interface MessageHistory {
  id: string;
  clubId: string;
  
  // 메시지 정보
  type: 'sms' | 'lms' | 'kakao' | 'email' | 'push' | 'in-app';
  subject?: string;
  content: string;
  recipients?: MessageRecipient[];
  recipientType?: 'all' | 'members' | 'parents' | 'coaches' | 'specific';
  recipientIds?: string[];
  recipientCount?: number;
  
  // 발송 정보
  sentAt?: string;
  sentBy: string;
  sentByName: string;
  
  // 상태
  status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  
  // 통계
  totalCount?: number;
  successCount?: number;
  failCount?: number;
  deliveredCount?: number;
  readCount?: number;
  clickCount?: number;
  
  // 메타데이터
  createdAt: string;
  updatedAt?: string;
}

// 체조 경기 관련 타입들
export interface GymnasticsCompetition {
  id: string;
  name: string;
  title?: string; // 대회 제목 (name과 동일하거나 별도)
  description?: string;
  startDate?: string;
  endDate?: string;
  registrationStart?: string; // 등록 시작일
  registrationEnd?: string; // 등록 마감일
  competitionDate?: string; // 대회 날짜
  venue?: string;
  status: 'draft' | 'open' | 'closed' | 'completed' | 'registration_open' | 'registration_closed' | 'in_progress';
  categories?: CompetitionCategory[];
  events?: GymnasticsEvent[];
  genderSeparate?: boolean; // 성별 분리 여부
  createdBy?: string; // 생성자
  createdAt: string;
  updatedAt?: string;
}

export interface CompetitionCategory {
  id: string;
  name: string;
  ageGroup?: string;
  gender?: 'male' | 'female' | 'mixed';
  level?: string;
  type?: string; // 카테고리 타입
  minAge?: number; // 최소 나이
  maxAge?: number; // 최대 나이
}

export interface GymnasticsEvent {
  id: string;
  name: string;
  code?: string; // 종목 코드
  type?: 'floor' | 'pommel_horse' | 'rings' | 'vault' | 'parallel_bars' | 'horizontal_bar' | 'uneven_bars' | 'beam';
  gender: 'male' | 'female' | 'mixed' | 'both';
  maxScore?: number; // 최대 점수
  judgeCount?: number; // 심판 수
}

export interface CompetitionRegistration {
  id: string;
  competitionId: string;
  memberId: string;
  memberName?: string; // 회원 이름
  clubName?: string; // 클럽 이름
  categoryId: string;
  events: string[];
  registeredEvents?: string[]; // 등록된 종목들
  status: 'registered' | 'confirmed' | 'cancelled' | 'approved' | 'rejected' | 'pending';
  gender?: 'male' | 'female';
  age?: number;
  createdAt: string;
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
  difficulty: number;
  execution: number;
  penalty: number;
  total: number;
  judgeId?: string;
  createdAt: string;
}
