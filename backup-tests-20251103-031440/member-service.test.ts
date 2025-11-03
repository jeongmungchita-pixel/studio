import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemberService, MemberFilters, CreateMemberData, UpdateMemberData } from '../member-service';
import { Member, MemberStats } from '@/types/member';
import { PaginatedResponse } from '@/types/api';
import type { IAPIClient, IMemberService } from '@/lib/di';

describe('MemberService (DI Pattern)', () => {
  let memberService: IMemberService;
  let mockAPIClient: IAPIClient;
  let mockMember: Member;
  let mockGet: any;
  let mockPost: any;
  let mockPut: any;
  let mockDelete: any;
  let mockPaginated: any;

  beforeEach(() => {
    // Mock API 클라이언트 생성
    mockGet = vi.fn();
    mockPost = vi.fn();
    mockPut = vi.fn();
    mockDelete = vi.fn();
    mockPaginated = vi.fn();
    
    mockAPIClient = {
      get: mockGet,
      post: mockPost,
      put: mockPut,
      delete: mockDelete,
      paginated: mockPaginated,
      upload: vi.fn(),
      download: vi.fn()
    } as unknown as IAPIClient;
    
    // DI를 통해 MemberService 생성
    memberService = new MemberService(mockAPIClient);
    
    mockMember = {
      id: 'member-123',
      userId: 'user-123',
      name: 'Test Member',
      email: 'member@example.com',
      phoneNumber: '+1234567890',
      dateOfBirth: '1990-01-01',
      category: 'adult',
      status: 'active',
      clubId: 'club-123',
      guardianUserIds: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };
  });

  describe('getMembers', () => {
    it('should fetch paginated members with default parameters', async () => {
      const mockResponse: PaginatedResponse<Member> = {
        items: [mockMember],
        total: 1,
        page: 1,
        pageSize: 20,
        hasNext: false,
        hasPrev: false
      };

      mockPaginated.mockResolvedValue(mockResponse);

      const result = await memberService.getMembers();

      expect(mockPaginated).toHaveBeenCalledWith('/members', 1, 20, {
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch paginated members with custom parameters and filters', async () => {
      const filters: MemberFilters = {
        status: 'active',
        clubId: 'club-123',
        category: 'adult',
        search: 'Test'
      };

      const mockResponse: PaginatedResponse<Member> = {
        items: [mockMember],
        total: 1,
        page: 2,
        pageSize: 10,
        hasNext: false,
        hasPrev: false
      };

      mockPaginated.mockResolvedValue(mockResponse);

      const result = await memberService.getMembers(2, 10, filters, 'name', 'asc');

      expect(mockPaginated).toHaveBeenCalledWith('/members', 2, 10, {
        sortBy: 'name',
        sortOrder: 'asc',
        ...filters
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getMember', () => {
    it('should fetch a single member by ID', async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: mockMember
      });

      const result = await memberService.getMember('member-123');

      expect(mockGet).toHaveBeenCalledWith('/members/member-123');
      expect(result).toEqual(mockMember);
    });

    it('should throw error when member not found', async () => {
      mockGet.mockResolvedValue({
        success: false,
        error: { message: 'Member not found' }
      });

      await expect(memberService.getMember('invalid-id')).rejects.toThrow('Member not found');
    });
  });

  describe('createMember', () => {
    it('should create a new member', async () => {
      const createData: CreateMemberData = {
        userId: 'user-456',
        name: 'New Member',
        email: 'new@example.com',
        phoneNumber: '+9876543210',
        dateOfBirth: '1995-05-05',
        category: 'adult',
        status: 'pending',
        clubId: 'club-123'
      };

      const newMember = { ...mockMember, ...createData, id: 'member-456' };
      mockPost.mockResolvedValue({
        success: true,
        data: newMember
      });

      const result = await (memberService as MemberService).createMember(createData);

      expect(mockPost).toHaveBeenCalledWith('/members', createData);
      expect(result).toEqual(newMember);
    });
  });

  describe('updateMember', () => {
    it('should update an existing member', async () => {
      const updateData: UpdateMemberData = {
        name: 'Updated Name',
        phoneNumber: '+5555555555',
        status: 'inactive'
      };

      const updatedMember = { ...mockMember, ...updateData };
      mockPut.mockResolvedValue({
        success: true,
        data: updatedMember
      });

      const result = await (memberService as MemberService).updateMember('member-123', updateData);

      expect(mockPut).toHaveBeenCalledWith('/members/member-123', updateData);
      expect(result).toEqual(updatedMember);
    });
  });

  describe('deleteMember', () => {
    it('should delete a member', async () => {
      const deleteResponse = { success: true, data: { id: 'member-123' } };
      mockDelete.mockResolvedValue(deleteResponse);

      const result = await (memberService as MemberService).deleteMember('member-123');

      expect(mockDelete).toHaveBeenCalledWith('/members/member-123');
      expect(result).toEqual({ id: 'member-123' });
    });
  });

  describe('getMemberStats', () => {
    it('should fetch member statistics', async () => {
      const mockStats: MemberStats = {
        total: 100,
        active: 80,
        pending: 15,
        inactive: 5,
        adults: 60,
        children: 40
      };

      mockGet.mockResolvedValue({
        success: true,
        data: mockStats
      });

      const result = await (memberService as MemberService).getMemberStats('member-123');

      expect(mockGet).toHaveBeenCalledWith('/members/member-123/stats');
      expect(result).toEqual(mockStats);
    });
  });

  describe('getMembersByClub', () => {
    it('should fetch members by club ID', async () => {
      const mockResponse: PaginatedResponse<Member> = {
        items: [mockMember],
        total: 1,
        page: 1,
        pageSize: 100,
        hasNext: false,
        hasPrev: false
      };

      mockPaginated.mockResolvedValue(mockResponse);

      const result = await (memberService as MemberService).getMembersByClub('club-123');

      expect(mockPaginated).toHaveBeenCalledWith('/members', 1, 100, {
        clubId: 'club-123',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      expect(result).toEqual([mockMember]);
    });
  });

  describe('searchMembers', () => {
    it('should search members by query', async () => {
      const searchResults = [mockMember];
      mockGet.mockResolvedValue({
        success: true,
        data: searchResults
      });

      const result = await (memberService as MemberService).searchMembers('Test query');

      expect(mockGet).toHaveBeenCalledWith('/members/search', { params: { q: 'Test query' } });
      expect(result).toEqual(searchResults);
    });
  });

  describe('createAdultRegistration', () => {
    it('should create an adult registration', async () => {
      const registrationData = {
        requestedBy: 'user-123',
        name: 'Adult Member',
        email: 'adult@example.com',
        phoneNumber: '+1234567890',
        dateOfBirth: '1980-01-01',
        clubId: 'club-123'
      };

      const registrationResult = {
        success: true,
        requestId: 'request-456',
        status: 'pending'
      };

      mockPost.mockResolvedValue({
        success: true,
        data: registrationResult
      });

      const result = await memberService.createAdultRegistration(registrationData);

      expect(mockPost).toHaveBeenCalledWith('/admin/registrations/adult', registrationData);
      expect(result).toEqual(registrationResult);
    });
  });

  describe('createFamilyRegistration', () => {
    it('should create a family registration', async () => {
      const familyData = {
        requestedBy: 'user-123',
        guardian: {
          name: 'Parent',
          email: 'parent@example.com',
          phoneNumber: '+1234567890',
          dateOfBirth: '1980-01-01'
        },
        children: [
          {
            name: 'Child 1',
            dateOfBirth: '2010-01-01'
          }
        ],
        clubId: 'club-123'
      };

      const registrationResult = {
        success: true,
        requestId: 'family-456',
        status: 'pending'
      };

      mockPost.mockResolvedValue({
        success: true,
        data: registrationResult
      });

      const result = await memberService.createFamilyRegistration(familyData);

      expect(mockPost).toHaveBeenCalledWith('/admin/registrations/family', familyData);
      expect(result).toEqual(registrationResult);
    });
  });

  describe('approveAdultRegistration', () => {
    it('should approve an adult registration', async () => {
      const approvalOptions = {
        performedBy: 'admin-123',
        notes: 'Approved after verification'
      };

      const approvalResult = {
        memberId: 'member-123',
        userId: 'user-123',
        requestData: {}
      };

      mockPost.mockResolvedValue({
        success: true,
        data: approvalResult
      });

      const result = await memberService.approveAdultRegistration('request-123', approvalOptions);

      expect(mockPost).toHaveBeenCalledWith('/admin/approvals/adult/request-123', approvalOptions);
      expect(result).toEqual(approvalResult);
    });
  });

  describe('rejectRegistration', () => {
    it('should reject a registration', async () => {
      const rejectOptions = {
        performedBy: 'admin-123',
        reason: 'Incomplete documentation',
        type: 'adult' as const
      };

      mockPost.mockResolvedValue({
        success: true,
        data: {}
      });

      const result = await memberService.rejectRegistration('request-123', rejectOptions);

      expect(mockPost).toHaveBeenCalledWith('/admin/approvals/reject', {
        requestId: 'request-123',
        ...rejectOptions
      });
      expect(result).toEqual(undefined);
    });
  });
});
