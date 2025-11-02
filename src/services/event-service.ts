/**
 * 이벤트 서비스
 * 클럽 이벤트 관련 비즈니스 로직을 처리합니다.
 */
import { apiClient, UnifiedAPIClient } from '@/lib/api/unified-api-client';
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
  private readonly api: UnifiedAPIClient;

  private constructor(api: UnifiedAPIClient = apiClient) {
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
    return this.api.paginated<ClubEvent>(
      '/events',
      page,
      pageSize,
      { sortBy, sortOrder, ...filters }
    );
  }

  // 상세 조회
  async getById(eventId: string): Promise<ClubEvent> {
    const response = await this.api.get<ClubEvent>(`/events/${eventId}`);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get event');
    }
    return response.data;
  }

  // 생성
  async create(data: CreateEventData): Promise<ClubEvent> {
    const response = await this.api.post<ClubEvent>('/events', data);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to create event');
    }
    return response.data;
  }

  // 수정
  async update(eventId: string, data: UpdateEventData): Promise<ClubEvent> {
    const response = await this.api.put<ClubEvent>(`/events/${eventId}`, data);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to update event');
    }
    return response.data;
  }

  // 삭제
  async delete(eventId: string): Promise<{ id: string }> {
    const response = await this.api.delete<{ id: string }>(`/events/${eventId}`);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to delete event');
    }
    return response.data;
  }

  // 검색
  async searchEvents(query: string): Promise<ClubEvent[]> {
    const response = await this.api.get<ClubEvent[]>('/events/search', { params: { q: query }, loadingKey: 'search-events' });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to search events');
    }
    return response.data;
  }

  // 클럽별 이벤트
  async getUpcoming(clubId?: string): Promise<ClubEvent[]> {
    const response = await this.api.get<ClubEvent[]>('/events/upcoming', {
      params: { clubId }
    });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get upcoming events');
    }
    return response.data;
  }

  // 이벤트 등록
  async registerForEvent(eventId: string, participantData: any): Promise<{ registrationId: string }> {
    const response = await this.api.post<{ registrationId: string }>(
      `/events/${eventId}/register`,
      participantData
    );
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to register for event');
    }
    return response.data;
  }

  // 이벤트 등록 취소
  async cancelRegistration(eventId: string, registrationId: string): Promise<{ id: string }> {
    const response = await this.api.delete<{ id: string }>(
      `/events/${eventId}/registrations/${registrationId}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to cancel registration');
    }
    return response.data;
  }

  // 이벤트 통계(엔드포인트 가정)
  async getEventStats(eventId: string): Promise<any> {
    return this.api.get<any>(`/events/${eventId}/stats`, { loadingKey: 'fetch-event-stats' });
  }

  // 상태 변경(간단 위임)
  async changeEventStatus(eventId: string, status: ClubEvent['status']): Promise<ClubEvent> {
    return this.update(eventId, { status });
  }

  clearCache(): void {
    // 필요 시 구현
  }
}

export const eventService = EventService.getInstance();
