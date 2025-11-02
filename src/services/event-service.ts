/**
 * 이벤트 서비스
 * 클럽 이벤트 관련 비즈니스 로직을 처리합니다.
 */
import { apiClient, ApiClient } from './api-client';
import { PaginatedResponse } from '@/types/api';
import { ClubEvent } from '@/types/club';

export interface EventFilters {
  clubId?: string;
  status?: 'draft' | 'published' | 'registration-open' | 'registration-closed' | 'in-progress' | 'completed' | 'cancelled';
  type?: 'competition' | 'workshop' | 'performance' | 'social' | 'training';
  search?: string;
}

export interface CreateEventData extends Omit<ClubEvent, 'id' | 'createdAt' | 'updatedAt'> {}
export interface UpdateEventData extends Partial<Omit<ClubEvent, 'id' | 'createdAt'>> {}

export class EventService {
  private static instance: EventService;
  private readonly api: ApiClient;

  private constructor(api: ApiClient = apiClient) {
    this.api = api;
  }

  static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService();
    }
    return EventService.instance;
  }

  // 목록 조회
  async getEvents(
    page: number = 1,
    pageSize: number = 20,
    filters?: EventFilters,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedResponse<ClubEvent>> {
    return this.api.getPaginated<ClubEvent>(
      '/events',
      { page, pageSize, sortBy, sortOrder, ...filters },
      { loadingKey: 'fetch-events' }
    );
  }

  // 상세 조회
  async getEvent(eventId: string): Promise<ClubEvent> {
    return this.api.get<ClubEvent>(`/events/${eventId}`, { loadingKey: 'fetch-event' });
  }

  // 생성
  async createEvent(data: CreateEventData): Promise<ClubEvent> {
    return this.api.post<ClubEvent>('/events', data, { loadingKey: 'create-event' });
  }

  // 수정
  async updateEvent(eventId: string, data: UpdateEventData): Promise<ClubEvent> {
    return this.api.put<ClubEvent>(`/events/${eventId}`, data, { loadingKey: 'update-event' });
  }

  // 삭제
  async deleteEvent(eventId: string): Promise<{ id: string }> {
    return this.api.delete<{ id: string }>(`/events/${eventId}`, { loadingKey: 'delete-event' });
  }

  // 검색
  async searchEvents(query: string): Promise<ClubEvent[]> {
    return this.api.get<ClubEvent[]>('/events/search', { params: { q: query }, loadingKey: 'search-events' });
  }

  // 클럽별 이벤트
  async getEventsByClub(clubId: string): Promise<ClubEvent[]> {
    const res = await this.getEvents(1, 100, { clubId });
    return res.items;
  }

  // 이벤트 등록
  async registerForEvent(eventId: string, memberId: string): Promise<{ registrationId: string }> {
    return this.api.post<{ registrationId: string }>(`/events/${eventId}/registrations`, { memberId }, { loadingKey: 'register-event' });
  }

  // 이벤트 등록 취소
  async cancelRegistration(eventId: string, registrationId: string): Promise<{ id: string }> {
    return this.api.delete<{ id: string }>(`/events/${eventId}/registrations/${registrationId}`, { loadingKey: 'cancel-registration' });
  }

  // 이벤트 통계(엔드포인트 가정)
  async getEventStats(eventId: string): Promise<any> {
    return this.api.get<any>(`/events/${eventId}/stats`, { loadingKey: 'fetch-event-stats' });
  }

  // 상태 변경(간단 위임)
  async changeEventStatus(eventId: string, status: ClubEvent['status']): Promise<ClubEvent> {
    return this.updateEvent(eventId, { status });
  }

  clearCache(): void {
    // 필요 시 구현
  }
}

export const eventService = EventService.getInstance();
