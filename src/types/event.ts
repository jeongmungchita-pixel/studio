'use client';

// 이벤트 기본 정보
export interface ClubEvent {
  id: string;
  title: string;
  description?: string;
  // 시간 정보
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  // 위치 정보
  location?: string;
  address?: string;
  // 참여 정보
  maxParticipants?: number;
  currentParticipants: number;
  participantIds: string[];
  // 상태
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  // 클럽 정보
  clubId: string;
  clubName: string;
  // 생성자 정보
  createdBy: string;
  createdByName: string;
  // 메타데이터
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string;
  // 비용
  cost?: number;
  costType?: 'free' | 'paid' | 'donation';
  // 카테고리
  category?: string;
  tags?: string[];
  // 이미지
  imageURL?: string;
  images?: string[];
  // 반복 정보
  isRecurring: boolean;
  recurringPattern?: {
    type: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string;
  };
}

// 이벤트 통계
export interface EventStats {
  totalEvents: number;
  upcomingEvents: number;
  ongoingEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  totalParticipants: number;
  averageParticipants: number;
}

// 이벤트 생성 데이터
export interface CreateEventData {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  location?: string;
  address?: string;
  maxParticipants?: number;
  cost?: number;
  costType?: 'free' | 'paid' | 'donation';
  category?: string;
  tags?: string[];
  imageURL?: string;
  images?: string[];
  isRecurring: boolean;
  recurringPattern?: {
    type: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string;
  };
}

// 이벤트 업데이트 데이터
export interface UpdateEventData {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  address?: string;
  maxParticipants?: number;
  status?: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  cost?: number;
  costType?: 'free' | 'paid' | 'donation';
  category?: string;
  tags?: string[];
  imageURL?: string;
  images?: string[];
}

// 이벤트 참여자
export interface EventParticipant {
  userId: string;
  userName: string;
  userEmail: string;
  joinedAt: string;
  status: 'registered' | 'attended' | 'cancelled' | 'no-show';
}

// 이벤트 필터
export interface EventFilters {
  clubId?: string;
  status?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}
