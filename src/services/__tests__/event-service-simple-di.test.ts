import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventService } from '../event-service';
import { IAPIClient } from '@/lib/di/interfaces';
import type { ClubEvent } from '@/types/club';

describe('EventService Simple DI Testing', () => {
  let mockApiClient: IAPIClient;
  let eventService: EventService;

  beforeEach(() => {
    // Mock API Client 생성
    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      upload: vi.fn(),
      download: vi.fn(),
      paginated: vi.fn(),
    } as any;

    // DI로 EventService 인스턴스 생성
    eventService = EventService.createWithDI(mockApiClient);
    
    // Mock 초기화
    vi.clearAllMocks();
  });

  describe('이벤트 목록 조회', () => {
    it('should get events with filters successfully', async () => {
      const mockEvents = [
        { 
          id: 'event-1', 
          title: 'Football Match', 
          status: 'published',
          clubId: 'club-1',
          startDate: '2025-01-15T10:00:00Z',
        },
      ];

      const mockResponse = {
        data: mockEvents,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockApiClient.paginated.mockResolvedValue(mockResponse);

      const filters = { clubId: 'club-1', status: 'published' };
      const result = await eventService.getEvents(1, 20, filters);

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.paginated).toHaveBeenCalledWith('/events', 1, 20, {
        ...filters,
        page: '1',
        pageSize: '20',
      });
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockApiClient.paginated.mockRejectedValue(error);

      await expect(eventService.getEvents()).rejects.toThrow('API Error');
    });
  });

  describe('이벤트 상세 조회', () => {
    it('should get event by ID successfully', async () => {
      const mockEvent: ClubEvent = {
        id: 'event-1',
        title: 'Football Match',
        status: 'published',
        clubId: 'club-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockEvent,
      });

      const result = await eventService.getEvent('event-1');

      expect(result).toEqual(mockEvent);
      expect(mockApiClient.get).toHaveBeenCalledWith('/events/event-1');
    });
  });

  describe('이벤트 생성', () => {
    it('should create event successfully', async () => {
      const eventData = {
        title: 'New Tournament',
        clubId: 'club-1',
        status: 'draft',
      };
      const mockCreatedEvent: ClubEvent = {
        id: 'event-3',
        ...eventData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.post.mockResolvedValue({ success: true, data: mockCreatedEvent });

      const result = await eventService.createEvent(eventData);

      expect(result).toEqual(mockCreatedEvent);
      expect(mockApiClient.post).toHaveBeenCalledWith('/events', eventData);
    });
  });

  describe('이벤트 업데이트', () => {
    it('should update event successfully', async () => {
      const eventId = 'event-1';
      const updateData = { title: 'Updated Match' };
      const mockUpdatedEvent: ClubEvent = {
        id: eventId,
        title: 'Updated Match',
        status: 'published',
        clubId: 'club-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.put.mockResolvedValue({ success: true, data: mockUpdatedEvent });

      const result = await eventService.updateEvent(eventId, updateData);

      expect(result).toEqual(mockUpdatedEvent);
      expect(mockApiClient.put).toHaveBeenCalledWith(`/events/${eventId}`, updateData);
    });
  });

  describe('이벤트 삭제', () => {
    it('should delete event successfully', async () => {
      const eventId = 'event-1';
      const mockResult = { id: eventId };

      mockApiClient.delete.mockResolvedValue({ success: true, data: mockResult });

      const result = await eventService.deleteEvent(eventId);

      expect(result).toEqual(mockResult);
      expect(mockApiClient.delete).toHaveBeenCalledWith(`/events/${eventId}`);
    });
  });

  describe('이벤트 검색', () => {
    it('should search events by query successfully', async () => {
      const query = 'Football';
      const mockResults = [
        { 
          id: 'event-1', 
          title: 'Football Match', 
          status: 'published',
          clubId: 'club-1',
        },
      ];

      mockApiClient.get.mockResolvedValue({ success: true, data: mockResults });

      const result = await eventService.searchEvents(query);

      expect(result).toEqual(mockResults);
      expect(mockApiClient.get).toHaveBeenCalledWith('/events/search', {
        params: { q: query },
        loadingKey: 'search-events',
      });
    });
  });

  describe('클럽별 이벤트', () => {
    it('should get events by club successfully', async () => {
      const clubId = 'club-1';
      const mockEvents = [
        { 
          id: 'event-1', 
          title: 'Club Match', 
          status: 'published',
          clubId,
        },
      ];

      mockApiClient.get.mockResolvedValue({ success: true, data: mockEvents });

      const result = await eventService.getEventsByClub(clubId);

      expect(result).toEqual(mockEvents);
      expect(mockApiClient.get).toHaveBeenCalledWith(`/clubs/${clubId}/events`);
    });
  });

  describe('다가오는 이벤트', () => {
    it('should get upcoming events successfully', async () => {
      const mockEvents = [
        { 
          id: 'event-1', 
          title: 'Upcoming Match', 
          status: 'published',
        },
      ];

      mockApiClient.get.mockResolvedValue({ success: true, data: mockEvents });

      const result = await eventService.getUpcomingEvents();

      expect(result).toEqual(mockEvents);
      expect(mockApiClient.get).toHaveBeenCalledWith('/events/upcoming');
    });
  });

  describe('이벤트 등록', () => {
    it('should register for event successfully', async () => {
      const eventId = 'event-1';
      const participantData = {
        userId: 'user-1',
        name: 'John Doe',
      };
      const mockResult = { registrationId: 'reg-1' };

      mockApiClient.post.mockResolvedValue({ success: true, data: mockResult });

      const result = await eventService.registerForEvent(eventId, participantData);

      expect(result).toEqual(mockResult);
      expect(mockApiClient.post).toHaveBeenCalledWith(`/events/${eventId}/register`, participantData);
    });

    it('should cancel registration successfully', async () => {
      const eventId = 'event-1';
      const registrationId = 'reg-1';
      const mockResult = { id: registrationId };

      mockApiClient.delete.mockResolvedValue({ success: true, data: mockResult });

      const result = await eventService.cancelRegistration(eventId, registrationId);

      expect(result).toEqual(mockResult);
      expect(mockApiClient.delete).toHaveBeenCalledWith(`/events/${eventId}/registrations/${registrationId}`);
    });
  });
});
