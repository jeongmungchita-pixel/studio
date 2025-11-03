import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventService } from '../event-service';
import { IAPIClient } from '@/lib/di/interfaces';
import type { ClubEvent } from '@/types/club';

describe('EventService Real DI Testing', () => {
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
          status: 'upcoming' as const,
          clubId: 'club-1',
          startDate: '2025-01-15T10:00:00Z',
        },
        { 
          id: 'event-2', 
          title: 'Training Session', 
          status: 'ongoing' as const,
          clubId: 'club-1',
          startDate: '2025-01-10T14:00:00Z',
        },
      ];

      const mockResponse = {
        data: mockEvents,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      };

      mockApiClient.paginated.mockResolvedValue(mockResponse);

      const filters = { clubId: 'club-1', status: 'published' };
      const result = await eventService.getEvents(1, 20, filters);

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.paginated).toHaveBeenCalledWith('/events', 1, 20, {
        clubId: 'club-1',
        status: 'published',
      });
    });

    it('should handle empty events list', async () => {
      const mockResponse = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };

      mockApiClient.paginated.mockResolvedValue(mockResponse);

      const result = await eventService.getEvents();

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(mockApiClient.paginated).toHaveBeenCalledWith('/events', 1, 20, {});
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockApiClient.paginated.mockRejectedValue(error);

      await expect(eventService.getEvents()).rejects.toThrow('API Error');
    });
  });

  describe('이벤트 상세 조회', () => {
    it('should get event by ID successfully', async () => {
      const mockEvent: Event = {
        id: 'event-1',
        title: 'Football Match',
        description: 'Championship match',
        status: 'upcoming',
        clubId: 'club-1',
        location: 'Seoul Stadium',
        startDate: '2025-01-15T10:00:00Z',
        endDate: '2025-01-15T12:00:00Z',
        participantCount: 22,
        maxParticipants: 30,
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

    it('should handle non-existent event', async () => {
      mockApiClient.get.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await eventService.getEvent('nonexistent');

      expect(result).toBeNull();
      expect(mockApiClient.get).toHaveBeenCalledWith('/events/nonexistent');
    });
  });

  describe('이벤트 생성', () => {
    it('should create event successfully', async () => {
      const eventData = {
        title: 'New Tournament',
        description: 'Annual tournament',
        clubId: 'club-1',
        location: 'Sports Complex',
        startDate: '2025-02-01T09:00:00Z',
        endDate: '2025-02-01T18:00:00Z',
        maxParticipants: 50,
      };
      const mockCreatedEvent: Event = {
        id: 'event-3',
        ...eventData,
        status: 'upcoming',
        participantCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.post.mockResolvedValue({ success: true, data: mockCreatedEvent });

      const result = await eventService.createEvent(eventData);

      expect(result).toEqual(mockCreatedEvent);
      expect(mockApiClient.post).toHaveBeenCalledWith('/events', eventData);
    });

    it('should handle validation errors', async () => {
      const invalidData = { title: '' };
      const error = new Error('Title is required');

      mockApiClient.post.mockRejectedValue(error);

      await expect(eventService.createEvent(invalidData)).rejects.toThrow('Title is required');
    });
  });

  describe('이벤트 업데이트', () => {
    it('should update event successfully', async () => {
      const eventId = 'event-1';
      const updateData = {
        title: 'Updated Match',
        description: 'Updated description',
      };
      const mockUpdatedEvent: Event = {
        id: eventId,
        title: 'Updated Match',
        description: 'Updated description',
        status: 'upcoming',
        clubId: 'club-1',
        location: 'Seoul Stadium',
        startDate: '2025-01-15T10:00:00Z',
        endDate: '2025-01-15T12:00:00Z',
        participantCount: 22,
        maxParticipants: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.put.mockResolvedValue({ success: true, data: mockUpdatedEvent });

      const result = await eventService.updateEvent(eventId, updateData);

      expect(result).toEqual(mockUpdatedEvent);
      expect(mockApiClient.put).toHaveBeenCalledWith(`/events/${eventId}`, updateData);
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      mockApiClient.put.mockRejectedValue(error);

      await expect(eventService.updateEvent('event-1', {})).rejects.toThrow('Update failed');
    });
  });

  describe('이벤트 상태 업데이트', () => {
    it('should update event status successfully', async () => {
      const eventId = 'event-1';
      const status = 'completed' as const;
      const mockResult = {
        success: true,
        eventId,
        previousStatus: 'ongoing',
        newStatus: status,
        timestamp: new Date().toISOString(),
      };

      mockApiClient.post.mockResolvedValue({ success: true, data: mockResult });

      const result = await eventService.updateEventStatus(eventId, status);

      expect(result).toEqual(mockResult);
      expect(mockApiClient.post).toHaveBeenCalledWith('/admin/events/update-status', {
        eventId,
        status,
        reason: null,
      });
    });

    it('should handle status update with reason', async () => {
      const eventId = 'event-1';
      const status = 'cancelled' as const;
      const reason = 'Weather conditions';
      const mockResult = {
        success: true,
        eventId,
        previousStatus: 'upcoming',
        newStatus: status,
        timestamp: new Date().toISOString(),
      };

      mockApiClient.post.mockResolvedValue({ success: true, data: mockResult });

      const result = await eventService.updateEventStatus(eventId, status, reason);

      expect(result).toEqual(mockResult);
      expect(mockApiClient.post).toHaveBeenCalledWith('/admin/events/update-status', {
        eventId,
        status,
        reason,
      });
    });
  });

  describe('이벤트 삭제', () => {
    it('should delete event successfully', async () => {
      const eventId = 'event-1';
      const mockResult = {
        success: true,
        eventId,
        deletedAt: new Date().toISOString(),
      };

      mockApiClient.delete.mockResolvedValue({ success: true, data: mockResult });

      const result = await eventService.deleteEvent(eventId);

      expect(result).toEqual(mockResult);
      expect(mockApiClient.delete).toHaveBeenCalledWith(`/events/${eventId}`);
    });

    it('should handle delete errors', async () => {
      const error = new Error('Delete failed');
      mockApiClient.delete.mockRejectedValue(error);

      await expect(eventService.deleteEvent('event-1')).rejects.toThrow('Delete failed');
    });
  });

  describe('이벤트 참여자 관리', () => {
    it('should get event participants successfully', async () => {
      const eventId = 'event-1';
      const mockParticipants = [
        { 
          id: 'participant-1', 
          userId: 'user-1',
          name: 'John Doe',
          role: 'PLAYER' as const,
          registeredAt: '2025-01-01T10:00:00Z'
        },
        { 
          id: 'participant-2', 
          userId: 'user-2',
          name: 'Jane Smith',
          role: 'COACH' as const,
          registeredAt: '2025-01-01T11:00:00Z'
        },
      ];

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockParticipants,
      });

      const result = await eventService.getEventParticipants(eventId);

      expect(result).toEqual(mockParticipants);
      expect(mockApiClient.get).toHaveBeenCalledWith(`/events/${eventId}/participants`);
    });

    it('should add participant to event successfully', async () => {
      const eventId = 'event-1';
      const participantData = {
        userId: 'user-3',
        name: 'New Participant',
        role: 'PLAYER' as const,
      };
      const mockParticipant = {
        id: 'participant-3',
        ...participantData,
        registeredAt: new Date().toISOString(),
      };

      mockApiClient.post.mockResolvedValue({ success: true, data: mockParticipant });

      const result = await eventService.addEventParticipant(eventId, participantData);

      expect(result).toEqual(mockParticipant);
      expect(mockApiClient.post).toHaveBeenCalledWith(`/events/${eventId}/participants`, participantData);
    });

    it('should remove participant from event successfully', async () => {
      const eventId = 'event-1';
      const participantId = 'participant-1';
      const mockResult = {
        success: true,
        participantId,
        removedAt: new Date().toISOString(),
      };

      mockApiClient.delete.mockResolvedValue({ success: true, data: mockResult });

      const result = await eventService.removeEventParticipant(eventId, participantId);

      expect(result).toEqual(mockResult);
      expect(mockApiClient.delete).toHaveBeenCalledWith(`/events/${eventId}/participants/${participantId}`);
    });
  });

  describe('이벤트 통계', () => {
    it('should get event statistics successfully', async () => {
      const eventId = 'event-1';
      const mockStats = {
        totalParticipants: 22,
        confirmedParticipants: 20,
        pendingParticipants: 2,
        players: 18,
        coaches: 2,
        staff: 2,
        registrationRate: 73.3,
      };

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result = await eventService.getEventStatistics(eventId);

      expect(result).toEqual(mockStats);
      expect(mockApiClient.get).toHaveBeenCalledWith(`/events/${eventId}/statistics`);
    });
  });

  describe('이벤트 검색', () => {
    it('should search events by query successfully', async () => {
      const query = 'Football';
      const mockResults = [
        { 
          id: 'event-1', 
          title: 'Football Match', 
          status: 'upcoming' as const,
          clubId: 'club-1',
          startDate: '2025-01-15T10:00:00Z',
        },
        { 
          id: 'event-4', 
          title: 'Football Training', 
          status: 'ongoing' as const,
          clubId: 'club-2',
          startDate: '2025-01-10T14:00:00Z',
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

    it('should handle empty search results', async () => {
      mockApiClient.get.mockResolvedValue({ success: true, data: [] });

      const result = await eventService.searchEvents('nonexistent');

      expect(result).toEqual([]);
    });
  });
});
