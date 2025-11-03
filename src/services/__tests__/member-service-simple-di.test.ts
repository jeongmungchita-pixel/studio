import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemberService } from '../member-service';
import { IAPIClient } from '@/lib/di/interfaces';
import type { Member } from '@/types/member';

describe('MemberService Simple DI Testing', () => {
  let mockApiClient: IAPIClient;
  let memberService: MemberService;

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

    // DI로 MemberService 인스턴스 생성
    memberService = MemberService.createWithDI(mockApiClient);
    
    // Mock 초기화
    vi.clearAllMocks();
  });

  describe('멤버 목록 조회', () => {
    it('should get members with filters successfully', async () => {
      const mockMembers = [
        { 
          id: 'member-1', 
          name: 'John Doe', 
          status: 'active' as const,
          clubId: 'club-1',
        },
      ];

      const mockResponse = {
        data: mockMembers,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockApiClient.paginated.mockResolvedValue(mockResponse);

      const filters = { status: 'active' as const };
      const result = await memberService.getMembers(1, 20, filters);

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.paginated).toHaveBeenCalledWith('/members', 1, 20, {
        ...filters,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockApiClient.paginated.mockRejectedValue(error);

      await expect(memberService.getMembers()).rejects.toThrow('API Error');
    });
  });

  describe('멤버 상세 조회', () => {
    it('should get member by ID successfully', async () => {
      const mockMember: Member = {
        id: 'member-1',
        name: 'John Doe',
        status: 'active',
        clubId: 'club-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockMember,
      });

      const result = await memberService.getMember('member-1');

      expect(result).toEqual(mockMember);
      expect(mockApiClient.get).toHaveBeenCalledWith('/members/member-1');
    });
  });

  describe('멤버 생성', () => {
    it('should create member successfully', async () => {
      const memberData = {
        name: 'New Member',
        status: 'pending' as const,
        clubId: 'club-1',
      };
      const mockCreatedMember: Member = {
        id: 'member-3',
        ...memberData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.post.mockResolvedValue({ success: true, data: mockCreatedMember });

      const result = await memberService.createMember(memberData);

      expect(result).toEqual(mockCreatedMember);
      expect(mockApiClient.post).toHaveBeenCalledWith('/members', memberData);
    });
  });

  describe('멤버 업데이트', () => {
    it('should update member successfully', async () => {
      const memberId = 'member-1';
      const updateData = { name: 'Updated Member' };
      const mockUpdatedMember: Member = {
        id: memberId,
        name: 'Updated Member',
        status: 'active',
        clubId: 'club-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.put.mockResolvedValue({ success: true, data: mockUpdatedMember });

      const result = await memberService.updateMember(memberId, updateData);

      expect(result).toEqual(mockUpdatedMember);
      expect(mockApiClient.put).toHaveBeenCalledWith(`/members/${memberId}`, updateData);
    });
  });

  describe('멤버 삭제', () => {
    it('should delete member successfully', async () => {
      const memberId = 'member-1';
      const mockResult = { id: memberId };

      mockApiClient.delete.mockResolvedValue({ success: true, data: mockResult });

      const result = await memberService.deleteMember(memberId);

      expect(result).toEqual(mockResult);
      expect(mockApiClient.delete).toHaveBeenCalledWith(`/members/${memberId}`);
    });
  });

  describe('멤버 검색', () => {
    it('should search members by query successfully', async () => {
      const query = 'John';
      const mockResults = [
        { 
          id: 'member-1', 
          name: 'John Doe', 
          status: 'active' as const,
          clubId: 'club-1',
        },
      ];

      mockApiClient.get.mockResolvedValue({ success: true, data: mockResults });

      const result = await memberService.searchMembers(query);

      expect(result).toEqual(mockResults);
      expect(mockApiClient.get).toHaveBeenCalledWith('/members/search', {
        params: { q: query },
      });
    });
  });

  describe('성인 회원가입 요청', () => {
    it('should create adult registration successfully', async () => {
      const registrationData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '010-1234-5678',
      };
      const mockResult = {
        requestId: 'req-1',
        status: 'pending' as const,
      };

      mockApiClient.post.mockResolvedValue({ success: true, data: mockResult });

      const result = await memberService.createAdultRegistration(registrationData);

      expect(result).toEqual(mockResult);
      expect(mockApiClient.post).toHaveBeenCalledWith('/admin/registrations/adult', registrationData);
    });
  });

  describe('가족 회원가입 요청', () => {
    it('should create family registration successfully', async () => {
      const registrationData = {
        parentName: 'Jane Doe',
        parentEmail: 'jane@example.com',
        children: [
          { name: 'Child 1', age: 10 },
        ],
      };
      const mockResult = {
        requestId: 'req-2',
        status: 'pending' as const,
      };

      mockApiClient.post.mockResolvedValue({ success: true, data: mockResult });

      const result = await memberService.createFamilyRegistration(registrationData);

      expect(result).toEqual(mockResult);
      expect(mockApiClient.post).toHaveBeenCalledWith('/admin/registrations/family', registrationData);
    });
  });

  describe('회원가입 승인', () => {
    it('should approve adult registration successfully', async () => {
      const requestId = 'req-1';
      const approvalOptions = {
        reason: 'Documents verified',
        clubId: 'club-1',
      };
      const mockResult = {
        success: true,
        memberId: 'member-1',
        userId: 'user-1',
      };

      mockApiClient.post.mockResolvedValue({ success: true, data: mockResult });

      const result = await memberService.approveAdultRegistration(requestId, approvalOptions);

      expect(result).toEqual(mockResult);
      expect(mockApiClient.post).toHaveBeenCalledWith(`/admin/approvals/adult/${requestId}`, approvalOptions);
    });

    it('should reject registration successfully', async () => {
      const requestId = 'req-1';
      const rejectOptions = {
        reason: 'Invalid documents',
      };

      mockApiClient.post.mockResolvedValue({ success: true, data: null });

      await memberService.rejectRegistration(requestId, rejectOptions);

      expect(mockApiClient.post).toHaveBeenCalledWith('/admin/approvals/reject', {
        requestId,
        ...rejectOptions,
      });
    });
  });

  describe('멤버 상태 변경', () => {
    it('should change member status successfully', async () => {
      const memberId = 'member-1';
      const status = 'inactive' as const;
      const mockUpdatedMember: Member = {
        id: memberId,
        name: 'John Doe',
        status,
        clubId: 'club-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.put.mockResolvedValue({ success: true, data: mockUpdatedMember });

      const result = await memberService.changeMemberStatus(memberId, status);

      expect(result).toEqual(mockUpdatedMember);
      expect(mockApiClient.put).toHaveBeenCalledWith(`/members/${memberId}`, { status });
    });
  });
});
