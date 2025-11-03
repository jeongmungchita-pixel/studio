import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClubService } from '../club-service';
import { IAPIClient } from '@/lib/di/interfaces';
import type { Club } from '@/types/club';

describe('ClubService Real DI Testing', () => {
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
        { 
          id: 'club-2', 
          name: 'Suwon FC', 
          status: 'active' as const,
          memberCount: 120 
        },
      ];

      const mockResponse = {
        data: mockClubs,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      };

      mockApiClient.paginated.mockResolvedValue(mockResponse);

      const filters = { status: 'active' };
      const result = await clubService.getClubs(1, 20, filters);

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.paginated).toHaveBeenCalledWith('/clubs', 1, 20, filters, 'createdAt', 'desc');
    });

    it('should handle empty clubs list', async () => {
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

      const result = await clubService.getClubs();

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(mockApiClient.paginated).toHaveBeenCalledWith('/clubs', 1, 20, undefined, 'createdAt', 'desc');
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
        description: 'Professional football club',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockClub,
      });

      const result = await clubService.getClubById('club-1');

      expect(result).toEqual(mockClub);
      expect(mockApiClient.get).toHaveBeenCalledWith('/clubs/club-1');
    });

    it('should handle non-existent club', async () => {
      mockApiClient.get.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await clubService.getClubById('nonexistent');

      expect(result).toBeNull();
      expect(mockApiClient.get).toHaveBeenCalledWith('/clubs/nonexistent');
    });
  });

  describe('클럽 생성', () => {
    it('should create club successfully', async () => {
      const clubData = {
        name: 'New FC',
        description: 'New football club',
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

    it('should handle validation errors', async () => {
      const invalidData = { name: '' };
      const error = new Error('Name is required');

      mockApiClient.post.mockRejectedValue(error);

      await expect(clubService.createClub(invalidData)).rejects.toThrow('Name is required');
    });
  });

  describe('클럽 업데이트', () => {
    it('should update club successfully', async () => {
      const clubId = 'club-1';
      const updateData = {
        name: 'Updated FC',
        description: 'Updated description',
      };
      const mockUpdatedClub: Club = {
        id: clubId,
        name: 'Updated FC',
        status: 'active',
        memberCount: 150,
        description: 'Updated description',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.put.mockResolvedValue({ success: true, data: mockUpdatedClub });

      const result = await clubService.updateClub(clubId, updateData);

      expect(result).toEqual(mockUpdatedClub);
      expect(mockApiClient.put).toHaveBeenCalledWith(`/clubs/${clubId}`, updateData);
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      mockApiClient.put.mockRejectedValue(error);

      await expect(clubService.updateClub('club-1', {})).rejects.toThrow('Update failed');
    });
  });

  describe('클럽 상태 업데이트', () => {
    it('should update club status successfully', async () => {
      const clubId = 'club-1';
      const status = 'inactive' as const;
      const mockResult = {
        success: true,
        clubId,
        previousStatus: 'active',
        newStatus: status,
        timestamp: new Date().toISOString(),
      };

      mockApiClient.post.mockResolvedValue({ success: true, data: mockResult });

      const result = await clubService.updateClubStatus(clubId, status);

      expect(result).toEqual(mockResult);
      expect(mockApiClient.post).toHaveBeenCalledWith('/admin/clubs/update-status', {
        clubId,
        status,
        reason: null,
      });
    });

    it('should handle status update with reason', async () => {
      const clubId = 'club-1';
      const status = 'suspended' as const;
      const reason = 'Violation of rules';
      const mockResult = {
        success: true,
        clubId,
        previousStatus: 'active',
        newStatus: status,
        timestamp: new Date().toISOString(),
      };

      mockApiClient.post.mockResolvedValue({ success: true, data: mockResult });

      const result = await clubService.updateClubStatus(clubId, status, reason);

      expect(result).toEqual(mockResult);
      expect(mockApiClient.post).toHaveBeenCalledWith('/admin/clubs/update-status', {
        clubId,
        status,
        reason,
      });
    });
  });

  describe('클럽 삭제', () => {
    it('should delete club successfully', async () => {
      const clubId = 'club-1';
      const mockResult = {
        success: true,
        clubId,
        deletedAt: new Date().toISOString(),
      };

      mockApiClient.delete.mockResolvedValue({ success: true, data: mockResult });

      const result = await clubService.deleteClub(clubId);

      expect(result).toEqual(mockResult);
      expect(mockApiClient.delete).toHaveBeenCalledWith(`/clubs/${clubId}`);
    });

    it('should handle delete errors', async () => {
      const error = new Error('Delete failed');
      mockApiClient.delete.mockRejectedValue(error);

      await expect(clubService.deleteClub('club-1')).rejects.toThrow('Delete failed');
    });
  });

  describe('클럽 멤버 관리', () => {
    it('should get club members successfully', async () => {
      const clubId = 'club-1';
      const mockMembers = [
        { 
          id: 'member-1', 
          userId: 'user-1',
          name: 'John Doe',
          role: 'PLAYER' as const 
        },
        { 
          id: 'member-2', 
          userId: 'user-2',
          name: 'Jane Smith',
          role: 'COACH' as const 
        },
      ];

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockMembers,
      });

      const result = await clubService.getClubMembers(clubId);

      expect(result).toEqual(mockMembers);
      expect(mockApiClient.get).toHaveBeenCalledWith(`/clubs/${clubId}/members`);
    });

    it('should add member to club successfully', async () => {
      const clubId = 'club-1';
      const memberData = {
        userId: 'user-3',
        name: 'New Member',
        role: 'PLAYER' as const,
      };
      const mockMember = {
        id: 'member-3',
        ...memberData,
        joinedAt: new Date().toISOString(),
      };

      mockApiClient.post.mockResolvedValue({ success: true, data: mockMember });

      const result = await clubService.addClubMember(clubId, memberData);

      expect(result).toEqual(mockMember);
      expect(mockApiClient.post).toHaveBeenCalledWith(`/clubs/${clubId}/members`, memberData);
    });

    it('should remove member from club successfully', async () => {
      const clubId = 'club-1';
      const memberId = 'member-1';
      const mockResult = {
        success: true,
        memberId,
        removedAt: new Date().toISOString(),
      };

      mockApiClient.delete.mockResolvedValue({ success: true, data: mockResult });

      const result = await clubService.removeClubMember(clubId, memberId);

      expect(result).toEqual(mockResult);
      expect(mockApiClient.delete).toHaveBeenCalledWith(`/clubs/${clubId}/members/${memberId}`);
    });
  });

  describe('클럽 통계', () => {
    it('should get club statistics successfully', async () => {
      const clubId = 'club-1';
      const mockStats = {
        totalMembers: 150,
        activeMembers: 120,
        players: 80,
        coaches: 15,
        staff: 5,
        monthlyGrowth: 5.2,
      };

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result = await clubService.getClubStatistics(clubId);

      expect(result).toEqual(mockStats);
      expect(mockApiClient.get).toHaveBeenCalledWith(`/clubs/${clubId}/statistics`);
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
        { 
          id: 'club-4', 
          name: 'Seoul United', 
          status: 'active' as const,
          memberCount: 80 
        },
      ];

      mockApiClient.get.mockResolvedValue({ success: true, data: mockResults });

      const result = await clubService.searchClubs(query);

      expect(result).toEqual(mockResults);
      expect(mockApiClient.get).toHaveBeenCalledWith('/clubs/search', {
        params: { q: query },
      });
    });

    it('should handle empty search results', async () => {
      mockApiClient.get.mockResolvedValue({ success: true, data: [] });

      const result = await clubService.searchClubs('nonexistent');

      expect(result).toEqual([]);
    });
  });
});
