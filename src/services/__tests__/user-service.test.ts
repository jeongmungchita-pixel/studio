import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService, UserFilters, CreateUserData, UpdateUserData } from '../user-service';
import { UserProfile, UserRole } from '@/types/auth';
import { PaginatedResponse } from '@/types/api';

// Mock API Client
const mockGetPaginated = vi.fn();
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();
const mockUpload = vi.fn();

vi.mock('../api-client', () => ({
  apiClient: {
    getPaginated: mockGetPaginated,
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
    upload: mockUpload,
  },
  ApiClient: vi.fn()
}));

describe('UserService', () => {
  let userService: UserService;
  let mockUser: UserProfile;

  beforeEach(() => {
    userService = UserService.getInstance();
    
    mockUser = {
      uid: 'test-uid-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: UserRole.MEMBER,
      status: 'active',
      createdAt: '2024-01-01T00:00:00.000Z',
      provider: 'email',
      photoURL: 'https://example.com/photo.jpg'
    };

    vi.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should fetch paginated users with default parameters', async () => {
      const mockResponse: PaginatedResponse<UserProfile> = {
        items: [mockUser],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1
      };

      mockGetPaginated.mockResolvedValue(mockResponse);

      const result = await userService.getUsers();

      expect(mockGetPaginated).toHaveBeenCalledWith('/users', {
        page: 1,
        pageSize: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }, {
        loadingKey: 'fetch-users'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch paginated users with custom parameters and filters', async () => {
      const filters: UserFilters = {
        role: UserRole.CLUB_OWNER,
        status: 'active',
        clubId: 'club-123'
      };

      const mockResponse: PaginatedResponse<UserProfile> = {
        items: [mockUser],
        total: 1,
        page: 2,
        pageSize: 10,
        totalPages: 1
      };

      mockGetPaginated.mockResolvedValue(mockResponse);

      const result = await userService.getUsers(2, 10, filters, 'displayName', 'asc');

      expect(mockGetPaginated).toHaveBeenCalledWith('/users', {
        page: 2,
        pageSize: 10,
        sortBy: 'displayName',
        sortOrder: 'asc',
        ...filters
      }, {
        loadingKey: 'fetch-users'
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getUser', () => {
    it('should fetch a single user by ID', async () => {
      mockGet.mockResolvedValue(mockUser);

      const result = await userService.getUser('test-uid-123');

      expect(mockGet).toHaveBeenCalledWith('/users/test-uid-123', {
        loadingKey: 'fetch-user'
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const createData: CreateUserData = {
        email: 'new@example.com',
        name: 'New User',
        role: UserRole.MEMBER,
        clubId: 'club-123',
        phoneNumber: '+1234567890'
      };

      const newUser = { ...mockUser, ...createData, uid: 'new-uid-456' };
      mockPost.mockResolvedValue(newUser);

      const result = await userService.createUser(createData);

      expect(mockPost).toHaveBeenCalledWith('/users', createData, {
        loadingKey: 'create-user'
      });
      expect(result).toEqual(newUser);
    });
  });

  describe('updateUser', () => {
    it('should update an existing user', async () => {
      const updateData: UpdateUserData = {
        name: 'Updated Name',
        phoneNumber: '+9876543210',
        status: 'inactive'
      };

      const updatedUser = { ...mockUser, ...updateData };
      mockPut.mockResolvedValue(updatedUser);

      const result = await userService.updateUser('test-uid-123', updateData);

      expect(mockPut).toHaveBeenCalledWith('/users/test-uid-123', updateData, {
        loadingKey: 'update-user'
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      const deleteResponse = { id: 'test-uid-123' };
      mockDelete.mockResolvedValue(deleteResponse);

      const result = await userService.deleteUser('test-uid-123');

      expect(mockDelete).toHaveBeenCalledWith('/users/test-uid-123', {
        loadingKey: 'delete-user'
      });
      expect(result).toEqual(deleteResponse);
    });
  });

  describe('getMyProfile', () => {
    it('should fetch current user profile with no cache', async () => {
      mockGet.mockResolvedValue(mockUser);

      const result = await userService.getMyProfile();

      expect(mockGet).toHaveBeenCalledWith('/users/me', {
        loadingKey: 'fetch-my-profile',
        cache: 'no-cache'
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateMyProfile', () => {
    it('should update current user profile', async () => {
      const updateData = {
        name: 'Updated Name',
        phoneNumber: '+9876543210'
      };

      const updatedUser = { ...mockUser, ...updateData };
      mockPut.mockResolvedValue(updatedUser);

      const result = await userService.updateMyProfile(updateData);

      expect(mockPut).toHaveBeenCalledWith('/users/me', updateData, {
        loadingKey: 'update-my-profile'
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe('uploadProfileImage', () => {
    it('should upload profile image', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const uploadResponse = { url: 'https://example.com/uploaded.jpg' };

      mockUpload.mockResolvedValue(uploadResponse);

      const result = await userService.uploadProfileImage('test-uid-123', file);

      expect(mockUpload).toHaveBeenCalledWith('/users/profile-image', file, { userId: 'test-uid-123' }, {
        loadingKey: 'upload-profile-image'
      });
      expect(result).toEqual(uploadResponse);
    });
  });

  describe('getUsersByRole', () => {
    it('should fetch users by role', async () => {
      const mockResponse: PaginatedResponse<UserProfile> = {
        items: [mockUser],
        total: 1,
        page: 1,
        pageSize: 100,
        totalPages: 1
      };

      mockGetPaginated.mockResolvedValue(mockResponse);

      const result = await userService.getUsersByRole(UserRole.MEMBER);

      expect(mockGetPaginated).toHaveBeenCalledWith('/users', {
        page: 1,
        pageSize: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        role: UserRole.MEMBER
      }, {
        loadingKey: 'fetch-users'
      });
      expect(result).toEqual([mockUser]);
    });
  });

  describe('getUsersByClub', () => {
    it('should fetch users by club', async () => {
      const mockResponse: PaginatedResponse<UserProfile> = {
        items: [mockUser],
        total: 1,
        page: 1,
        pageSize: 100,
        totalPages: 1
      };

      mockGetPaginated.mockResolvedValue(mockResponse);

      const result = await userService.getUsersByClub('club-123');

      expect(mockGetPaginated).toHaveBeenCalledWith('/users', {
        page: 1,
        pageSize: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        clubId: 'club-123'
      }, {
        loadingKey: 'fetch-users'
      });
      expect(result).toEqual([mockUser]);
    });
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      const searchResults = [mockUser];
      mockGet.mockResolvedValue(searchResults);

      const result = await userService.searchUsers('test query');

      expect(mockGet).toHaveBeenCalledWith('/users/search', {
        params: { q: 'test query' },
        loadingKey: 'search-users'
      });
      expect(result).toEqual(searchResults);
    });
  });

  describe('changeUserStatus', () => {
    it('should change user status', async () => {
      const updatedUser = { ...mockUser, status: 'inactive' };
      mockPut.mockResolvedValue(updatedUser);

      const result = await userService.changeUserStatus('test-uid-123', 'inactive');

      expect(mockPut).toHaveBeenCalledWith('/users/test-uid-123', { status: 'inactive' }, {
        loadingKey: 'update-user'
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe('getUserStats', () => {
    it('should fetch user statistics', async () => {
      const mockStats = {
        total: 100,
        active: 80,
        pending: 15,
        inactive: 5
      };

      mockGet.mockResolvedValue(mockStats);

      const result = await userService.getUserStats();

      expect(mockGet).toHaveBeenCalledWith('/users/stats', {
        loadingKey: 'fetch-user-stats'
      });
      expect(result).toEqual(mockStats);
    });
  });

  describe('hasPermission', () => {
    it('should correctly check role hierarchy permissions', () => {
      const testCases = [
        { userRole: UserRole.SUPER_ADMIN, requiredRole: UserRole.MEMBER, expected: true },
        { userRole: UserRole.SUPER_ADMIN, requiredRole: UserRole.SUPER_ADMIN, expected: true },
        { userRole: UserRole.FEDERATION_ADMIN, requiredRole: UserRole.SUPER_ADMIN, expected: false },
        { userRole: UserRole.FEDERATION_ADMIN, requiredRole: UserRole.CLUB_OWNER, expected: true },
        { userRole: UserRole.CLUB_OWNER, requiredRole: UserRole.FEDERATION_ADMIN, expected: false },
        { userRole: UserRole.CLUB_OWNER, requiredRole: UserRole.MEMBER, expected: true },
        { userRole: UserRole.MEMBER, requiredRole: UserRole.PARENT, expected: true },
        { userRole: UserRole.PARENT, requiredRole: UserRole.MEMBER, expected: false },
        { userRole: UserRole.VENDOR, requiredRole: UserRole.MEMBER, expected: false },
      ];

      testCases.forEach(({ userRole, requiredRole, expected }) => {
        const user = { ...mockUser, role: userRole };
        expect(userService.hasPermission(user, requiredRole)).toBe(expected);
      });
    });

    it('should handle undefined role', () => {
      const userWithoutRole = { ...mockUser, role: undefined as any };
      expect(userService.hasPermission(userWithoutRole, UserRole.MEMBER)).toBe(false);
    });

    it('should handle invalid required role', () => {
      expect(userService.hasPermission(mockUser, 'INVALID_ROLE' as UserRole)).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear cache without errors', () => {
      expect(() => userService.clearCache()).not.toThrow();
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = UserService.getInstance();
      const instance2 = UserService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});
