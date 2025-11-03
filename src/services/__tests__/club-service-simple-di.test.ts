import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClubService } from '../club-service';
import { IAPIClient } from '@/lib/di/interfaces';
import type { Club } from '@/types/club';

describe('ClubService Simple DI Testing', () => {
  let mockApiClient: IAPIClient;
  let clubService: ClubService;

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

    // DI로 ClubService 인스턴스 생성
    clubService = ClubService.createWithDI(mockApiClient);
    
    // Mock 초기화
    vi.clearAllMocks();
  });

  describe('클럽 목록 조회', () => {
    it('should get clubs with filters successfully', async () => {
      const mockClubs = [
        { 
          id: 'club-1', 
          name: 'FC Seoul', 
          status: 'active' as const,
          memberCount: 150 
        },
      ];

      const mockResponse = {
        data: mockClubs,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockApiClient.paginated.mockResolvedValue(mockResponse);

      const filters = { status: 'active' as const };
      const result = await clubService.getClubs(1, 20, filters);

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.paginated).toHaveBeenCalledWith('/clubs', 1, 20, {
        ...filters,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockApiClient.paginated.mockRejectedValue(error);

      await expect(clubService.getClubs()).rejects.toThrow('API Error');
    });
  });

  describe('클럽 상세 조회', () => {
    it('should get club by ID successfully', async () => {
      const mockClub: Club = {
        id: 'club-1',
        name: 'FC Seoul',
        status: 'active',
        memberCount: 150,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockClub,
      });

      const result = await clubService.getClub('club-1');

      expect(result).toEqual(mockClub);
      expect(mockApiClient.get).toHaveBeenCalledWith('/clubs/club-1');
    });
  });

  describe('클럽 생성', () => {
    it('should create club successfully', async () => {
      const clubData = {
        name: 'New FC',
        status: 'pending' as const,
      };
      const mockCreatedClub: Club = {
        id: 'club-3',
        ...clubData,
        memberCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.post.mockResolvedValue({ success: true, data: mockCreatedClub });

      const result = await clubService.createClub(clubData);

      expect(result).toEqual(mockCreatedClub);
      expect(mockApiClient.post).toHaveBeenCalledWith('/clubs', clubData);
    });
  });

  describe('클럽 업데이트', () => {
    it('should update club successfully', async () => {
      const clubId = 'club-1';
      const updateData = { name: 'Updated FC' };
      const mockUpdatedClub: Club = {
        id: clubId,
        name: 'Updated FC',
        status: 'active',
        memberCount: 150,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.put.mockResolvedValue({ success: true, data: mockUpdatedClub });

      const result = await clubService.updateClub(clubId, updateData);

      expect(result).toEqual(mockUpdatedClub);
      expect(mockApiClient.put).toHaveBeenCalledWith(`/clubs/${clubId}`, updateData);
    });
  });

  describe('클럽 삭제', () => {
    it('should delete club successfully', async () => {
      const clubId = 'club-1';
      const mockResult = { id: clubId };

      mockApiClient.delete.mockResolvedValue({ success: true, data: mockResult });

      const result = await clubService.deleteClub(clubId);

      expect(result).toEqual(mockResult);
      expect(mockApiClient.delete).toHaveBeenCalledWith(`/clubs/${clubId}`);
    });
  });

  describe('클럽 검색', () => {
    it('should search clubs by query successfully', async () => {
      const query = 'Seoul';
      const mockResults = [
        { 
          id: 'club-1', 
          name: 'FC Seoul', 
          status: 'active' as const,
          memberCount: 150 
        },
      ];

      mockApiClient.get.mockResolvedValue({ success: true, data: mockResults });

      const result = await clubService.searchClubs(query);

      expect(result).toEqual(mockResults);
      expect(mockApiClient.get).toHaveBeenCalledWith('/clubs/search', {
        params: { q: query },
      });
    });
  });

  describe('지역별 클럽', () => {
    it('should get clubs by region successfully', async () => {
      const region = 'Seoul';
      const mockResults = [
        { 
          id: 'club-1', 
          name: 'FC Seoul', 
          status: 'active' as const,
          region,
          memberCount: 150 
        },
      ];

      const mockResponse = {
        data: mockResults,
        items: mockResults, // getClubsByRegion은 response.items를 반환
        pagination: {
          page: 1,
          limit: 100,
          total: 1,
          totalPages: 1,
        },
      };

      mockApiClient.paginated.mockResolvedValue(mockResponse);

      const result = await clubService.getClubsByRegion(region);

      expect(result).toEqual(mockResults);
      expect(mockApiClient.paginated).toHaveBeenCalledWith('/clubs', 1, 100, {
        region,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });
  });

  describe('전체 클럽', () => {
    it('should get all clubs successfully', async () => {
      const mockResults = [
        { 
          id: 'club-1', 
          name: 'FC Seoul', 
          status: 'active' as const,
          memberCount: 150 
        },
      ];

      mockApiClient.get.mockResolvedValue({ success: true, data: mockResults });

      const result = await clubService.getAll();

      expect(result).toEqual(mockResults);
      expect(mockApiClient.get).toHaveBeenCalledWith('/clubs');
    });
  });

  describe('클럽 통계', () => {
    it('should get club statistics successfully', async () => {
      const clubId = 'club-1';
      const mockStats = {
        totalMembers: 150,
        activeMembers: 120,
        monthlyGrowth: 5.2,
      };

      mockApiClient.get.mockResolvedValue({ success: true, data: mockStats });

      const result = await clubService.getClubStats(clubId);

      expect(result).toEqual(mockStats);
      expect(mockApiClient.get).toHaveBeenCalledWith(`/clubs/${clubId}/stats`);
    });
  });

  describe('클럽 상태 변경', () => {
    it('should change club status successfully', async () => {
      const clubId = 'club-1';
      const status = 'inactive' as const;
      const mockUpdatedClub: Club = {
        id: clubId,
        name: 'FC Seoul',
        status,
        memberCount: 150,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.put.mockResolvedValue({ success: true, data: mockUpdatedClub });

      const result = await clubService.changeClubStatus(clubId, status);

      expect(result).toEqual(mockUpdatedClub);
      expect(mockApiClient.put).toHaveBeenCalledWith(`/clubs/${clubId}`, { status });
    });
  });
});
