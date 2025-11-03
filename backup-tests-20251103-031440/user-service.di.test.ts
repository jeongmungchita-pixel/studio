/**
 * UserService DI 패턴 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../user-service';
import { UserProfile, UserRole } from '@/types/auth';
import { PaginatedResponse } from '@/types/api';
import { setupTesting, MockFactory } from '@/lib/di';
import type { IAPIClient, IUserService } from '@/lib/di';

describe('UserService (DI Pattern)', () => {
  let userService: IUserService;
  let mockAPIClient: IAPIClient;
  let mockUser: UserProfile;

  beforeEach(() => {
    // 테스트 환경 설정
    setupTesting();
    
    // Mock API 클라이언트 생성
    mockAPIClient = MockFactory.createAPIClient();
    
    // DI를 통해 UserService 생성
    userService = new UserService(mockAPIClient);
    
    mockUser = {
      uid: 'test-uid-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: UserRole.MEMBER,
      status: 'active',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      provider: 'email',
      photoURL: 'https://example.com/photo.jpg'
    };

    vi.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should fetch paginated users with default parameters', async () => {
      const mockResponse: PaginatedResponse<UserProfile> = {
        data: [mockUser],
        pagination: {
          total: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1
        }
      };

      // Mock API 응답 설정
      vi.spyOn(mockAPIClient, 'paginated').mockResolvedValue(mockResponse);

      const result = await userService.getUsers();

      expect(mockAPIClient.paginated).toHaveBeenCalledWith('/users', 1, 20, {
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch paginated users with custom parameters', async () => {
      const mockResponse: PaginatedResponse<UserProfile> = {
        data: [mockUser],
        pagination: {
          total: 1,
          page: 2,
          pageSize: 10,
          totalPages: 1
        }
      };

      vi.spyOn(mockAPIClient, 'paginated').mockResolvedValue(mockResponse);

      const result = await userService.getUsers(2, 10);

      expect(mockAPIClient.paginated).toHaveBeenCalledWith('/users', 2, 10, {
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch users with filters', async () => {
      const filters = {
        role: UserRole.CLUB_OWNER,
        status: 'active',
        clubId: 'club-123'
      };

      const mockResponse: PaginatedResponse<UserProfile> = {
        data: [mockUser],
        pagination: {
          total: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1
        }
      };

      vi.spyOn(mockAPIClient, 'paginated').mockResolvedValue(mockResponse);

      const result = await userService.getUsers(1, 20, filters);

      expect(mockAPIClient.paginated).toHaveBeenCalledWith('/users', 1, 20, {
        sortBy: 'createdAt',
        sortOrder: 'desc',
        ...filters
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getUser', () => {
    it('should fetch user by ID', async () => {
      vi.spyOn(mockAPIClient, 'get').mockResolvedValue({
        success: true,
        data: mockUser,
        error: null
      });

      const result = await userService.getUser('test-uid-123');

      expect(mockAPIClient.get).toHaveBeenCalledWith('/users/test-uid-123');
      expect(result).toEqual(mockUser);
    });

    it('should throw error when user not found', async () => {
      const error = new Error('User not found');
      vi.spyOn(mockAPIClient, 'get').mockRejectedValue(error);

      await expect(userService.getUser('non-existent')).rejects.toThrow('User not found');
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        role: UserRole.MEMBER,
        phoneNumber: '+1234567890'
      };

      const createdUser = {
        ...mockUser,
        uid: 'new-uid-456',
        email: userData.email,
        displayName: userData.name,
        phoneNumber: userData.phoneNumber
      };

      vi.spyOn(mockAPIClient, 'post').mockResolvedValue({
        success: true,
        data: createdUser,
        error: null
      });

      const result = await userService.createUser(userData);

      expect(mockAPIClient.post).toHaveBeenCalledWith('/users', userData);
      expect(result).toEqual(createdUser);
    });
  });

  describe('updateUser', () => {
    it('should update an existing user', async () => {
      const updateData = {
        displayName: 'Updated User',
        role: UserRole.CLUB_OWNER
      };

      const updatedUser = {
        ...mockUser,
        displayName: updateData.displayName,
        role: updateData.role,
        updatedAt: new Date()
      };

      vi.spyOn(mockAPIClient, 'put').mockResolvedValue({
        success: true,
        data: updatedUser,
        error: null
      });

      const result = await userService.updateUser('test-uid-123', updateData);

      expect(mockAPIClient.put).toHaveBeenCalledWith('/users/test-uid-123', updateData);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      const deleteResponse = { id: 'test-uid-123' };
      vi.spyOn(mockAPIClient, 'delete').mockResolvedValue({
        success: true,
        data: deleteResponse,
        error: null
      });

      const result = await userService.deleteUser('test-uid-123');

      expect(mockAPIClient.delete).toHaveBeenCalledWith('/users/test-uid-123');
      expect(result).toEqual(deleteResponse);
    });
  });

  describe('DI Pattern Benefits', () => {
    it('should allow easy mock injection', async () => {
      // 다른 Mock API 클라이언트로 교체 가능
      const customMockAPIClient = MockFactory.createAPIClient();
      const customUserService = new UserService(customMockAPIClient);
      
      const customResponse: PaginatedResponse<UserProfile> = {
        data: [{ ...mockUser, displayName: 'Custom User' }],
        pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 }
      };

      vi.spyOn(customMockAPIClient, 'paginated').mockResolvedValue(customResponse);

      const result = await customUserService.getUsers();

      expect(result.data[0].displayName).toBe('Custom User');
    });

    it('should support different API clients', async () => {
      // 의존성 주입으로 다른 API 클라이언트 사용 가능
      const anotherMockAPIClient = MockFactory.createAPIClient();
      const anotherUserService = new UserService(anotherMockAPIClient);
      
      expect(anotherUserService).toBeDefined();
      expect(anotherUserService).not.toBe(userService);
    });
  });
});
