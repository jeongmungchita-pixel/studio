import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UserService } from '../user-service';
import { apiClient } from '@/lib/api/unified-api-client';
import { UserRole } from '@/types/auth';

// Mock apiClient
vi.mock('../api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getPaginated: vi.fn(),
    upload: vi.fn(),
    download: vi.fn(),
  }
}));

describe('UserService - Complete Test Suite', () => {
  let userService: UserService;
  
  const mockUser = {
    uid: 'user-123',
    email: 'user@example.com',
    displayName: 'Test User',
    role: UserRole.MEMBER,
    status: 'active' as const,
    provider: 'email' as const,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    // Reset singleton
    (UserService as any).instance = null;
    userService = UserService.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = UserService.getInstance();
      const instance2 = UserService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('User CRUD Operations', () => {
    describe('getUsers', () => {
      it('should fetch paginated users', async () => {
        const mockResponse = {
          items: [mockUser],
          total: 1,
          page: 1,
          pageSize: 20,
          hasNext: false,
          hasPrev: false
        };
        
        vi.mocked(apiClient.getPaginated).mockResolvedValue(mockResponse);
        
        const result = await userService.getUsers(1, 20);
        
        expect(result).toEqual(mockResponse);
        expect(apiClient.getPaginated).toHaveBeenCalledWith(
          '/users',
          expect.objectContaining({
            page: 1,
            pageSize: 20,
            sortBy: 'createdAt',
            sortOrder: 'desc'
          }),
          { loadingKey: 'fetch-users' }
        );
      });

      it('should apply filters correctly', async () => {
        const mockResponse = {
          items: [],
          total: 0,
          page: 1,
          pageSize: 20,
          hasNext: false,
          hasPrev: false
        };
        
        vi.mocked(apiClient.getPaginated).mockResolvedValue(mockResponse);
        
        await userService.getUsers(1, 20, { 
          role: UserRole.CLUB_OWNER,
          status: 'active',
          clubId: 'club-123'
        });
        
        expect(apiClient.getPaginated).toHaveBeenCalledWith(
          '/users',
          expect.objectContaining({
            role: UserRole.CLUB_OWNER,
            status: 'active',
            clubId: 'club-123'
          }),
          expect.any(Object)
        );
      });
    });

    describe('getUser', () => {
      it('should fetch a single user', async () => {
        vi.mocked(apiClient.get).mockResolvedValue(mockUser);
        
        const result = await userService.getUser('user-123');
        
        expect(result).toEqual(mockUser);
        expect(apiClient.get).toHaveBeenCalledWith(
          '/users/user-123',
          { loadingKey: 'fetch-user' }
        );
      });
    });

    describe('createUser', () => {
      it('should create a new user', async () => {
        const createData = {
          email: 'new@example.com',
          name: 'New User',
          role: UserRole.MEMBER,
          phoneNumber: '010-1234-5678'
        };
        
        vi.mocked(apiClient.post).mockResolvedValue({
          ...mockUser,
          ...createData
        });
        
        const result = await userService.createUser(createData);
        
        expect(result).toMatchObject(createData);
        expect(apiClient.post).toHaveBeenCalledWith(
          '/users',
          createData,
          { loadingKey: 'create-user' }
        );
      });
    });

    describe('updateUser', () => {
      it('should update user data', async () => {
        const updateData = {
          name: 'Updated Name',
          phoneNumber: '010-9999-8888'
        };
        
        vi.mocked(apiClient.put).mockResolvedValue({
          ...mockUser,
          ...updateData
        });
        
        const result = await userService.updateUser('user-123', updateData);
        
        expect(result).toMatchObject(updateData);
        expect(apiClient.put).toHaveBeenCalledWith(
          '/users/user-123',
          updateData,
          { loadingKey: 'update-user' }
        );
      });
    });

    describe('deleteUser', () => {
      it('should delete a user', async () => {
        vi.mocked(apiClient.delete).mockResolvedValue({ id: 'user-123' });
        
        const result = await userService.deleteUser('user-123');
        
        expect(result).toEqual({ id: 'user-123' });
        expect(apiClient.delete).toHaveBeenCalledWith(
          '/users/user-123',
          { loadingKey: 'delete-user' }
        );
      });
    });
  });

  describe('Profile Operations', () => {
    describe('getMyProfile', () => {
      it('should fetch current user profile', async () => {
        vi.mocked(apiClient.get).mockResolvedValue(mockUser);
        
        const result = await userService.getMyProfile();
        
        expect(result).toEqual(mockUser);
        expect(apiClient.get).toHaveBeenCalledWith(
          '/users/me',
          { loadingKey: 'fetch-my-profile', cache: 'no-cache' }
        );
      });
    });

    describe('updateMyProfile', () => {
      it('should update current user profile', async () => {
        const updateData = {
          name: 'My New Name',
          phoneNumber: '010-5555-5555'
        };
        
        vi.mocked(apiClient.put).mockResolvedValue({
          ...mockUser,
          ...updateData
        });
        
        const result = await userService.updateMyProfile(updateData);
        
        expect(result).toMatchObject(updateData);
        expect(apiClient.put).toHaveBeenCalledWith(
          '/users/me',
          updateData,
          { loadingKey: 'update-my-profile' }
        );
      });
    });

    describe('uploadProfileImage', () => {
      it('should upload profile image', async () => {
        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const mockUrl = 'https://example.com/profile.jpg';
        
        vi.mocked(apiClient.upload).mockResolvedValue({ url: mockUrl });
        
        const result = await userService.uploadProfileImage('user-123', mockFile);
        
        expect(result).toEqual({ url: mockUrl });
        expect(apiClient.upload).toHaveBeenCalledWith(
          '/users/profile-image',
          mockFile,
          { userId: 'user-123' },
          { loadingKey: 'upload-profile-image' }
        );
      });
    });
  });

  describe('Query Operations', () => {
    describe('getUsersByRole', () => {
      it('should fetch users by role', async () => {
        const mockUsers = [
          { ...mockUser, role: UserRole.CLUB_OWNER },
          { ...mockUser, uid: 'user-456', role: UserRole.CLUB_OWNER }
        ];
        
        vi.mocked(apiClient.getPaginated).mockResolvedValue({
          items: mockUsers,
          total: 2,
          page: 1,
          pageSize: 100,
          hasNext: false,
          hasPrev: false
        });
        
        const result = await userService.getUsersByRole(UserRole.CLUB_OWNER);
        
        expect(result).toEqual(mockUsers);
        expect(apiClient.getPaginated).toHaveBeenCalledWith(
          '/users',
          expect.objectContaining({
            role: UserRole.CLUB_OWNER,
            pageSize: 100
          }),
          expect.any(Object)
        );
      });
    });

    describe('getUsersByClub', () => {
      it('should fetch users by club', async () => {
        const mockUsers = [
          { ...mockUser, clubId: 'club-123' },
          { ...mockUser, uid: 'user-789', clubId: 'club-123' }
        ];
        
        vi.mocked(apiClient.getPaginated).mockResolvedValue({
          items: mockUsers,
          total: 2,
          page: 1,
          pageSize: 100,
          hasNext: false,
          hasPrev: false
        });
        
        const result = await userService.getUsersByClub('club-123');
        
        expect(result).toEqual(mockUsers);
        expect(apiClient.getPaginated).toHaveBeenCalledWith(
          '/users',
          expect.objectContaining({
            clubId: 'club-123',
            pageSize: 100
          }),
          expect.any(Object)
        );
      });
    });

    describe('searchUsers', () => {
      it('should search users', async () => {
        const searchResults = [mockUser];
        
        vi.mocked(apiClient.get).mockResolvedValue(searchResults);
        
        const result = await userService.searchUsers('test');
        
        expect(result).toEqual(searchResults);
        expect(apiClient.get).toHaveBeenCalledWith(
          '/users/search',
          {
            params: { q: 'test' },
            loadingKey: 'search-users'
          }
        );
      });
    });
  });

  describe('Status and Role Management', () => {
    describe('changeUserStatus', () => {
      it('should change user status', async () => {
        const updatedUser = { ...mockUser, status: 'inactive' as const };
        
        vi.mocked(apiClient.put).mockResolvedValue(updatedUser);
        
        const result = await userService.changeUserStatus('user-123', 'inactive');
        
        expect(result).toEqual(updatedUser);
        expect(apiClient.put).toHaveBeenCalledWith(
          '/users/user-123',
          { status: 'inactive' },
          expect.any(Object)
        );
      });
    });

    describe('changeUserRole', () => {
      it('should change user role', async () => {
        const updatedUser = { ...mockUser, role: UserRole.CLUB_MANAGER };
        
        vi.mocked(apiClient.put).mockResolvedValue(updatedUser);
        
        const result = await userService.changeUserRole('user-123', UserRole.CLUB_MANAGER);
        
        expect(result).toEqual(updatedUser);
        expect(apiClient.put).toHaveBeenCalledWith(
          '/users/user-123',
          { role: UserRole.CLUB_MANAGER },
          expect.any(Object)
        );
      });
    });

    describe('changeUserClub', () => {
      it('should change user club', async () => {
        const updatedUser = { ...mockUser, clubId: 'new-club-123' };
        
        vi.mocked(apiClient.put).mockResolvedValue(updatedUser);
        
        const result = await userService.changeUserClub('user-123', 'new-club-123');
        
        expect(result).toEqual(updatedUser);
        expect(apiClient.put).toHaveBeenCalledWith(
          '/users/user-123',
          { clubId: 'new-club-123' },
          expect.any(Object)
        );
      });

      it('should handle null club ID', async () => {
        const updatedUser = { ...mockUser, clubId: undefined };
        
        vi.mocked(apiClient.put).mockResolvedValue(updatedUser);
        
        const result = await userService.changeUserClub('user-123', null);
        
        expect(result).toEqual(updatedUser);
        expect(apiClient.put).toHaveBeenCalledWith(
          '/users/user-123',
          { clubId: undefined },
          expect.any(Object)
        );
      });
    });

    describe('activateUser', () => {
      it('should activate user', async () => {
        const activatedUser = { ...mockUser, status: 'active' as const };
        
        vi.mocked(apiClient.put).mockResolvedValue(activatedUser);
        
        const result = await userService.activateUser('user-123');
        
        expect(result).toEqual(activatedUser);
        expect(apiClient.put).toHaveBeenCalledWith(
          '/users/user-123',
          { status: 'active' },
          expect.any(Object)
        );
      });
    });

    describe('deactivateUser', () => {
      it('should deactivate user', async () => {
        const deactivatedUser = { ...mockUser, status: 'inactive' as const };
        
        vi.mocked(apiClient.put).mockResolvedValue(deactivatedUser);
        
        const result = await userService.deactivateUser('user-123');
        
        expect(result).toEqual(deactivatedUser);
        expect(apiClient.put).toHaveBeenCalledWith(
          '/users/user-123',
          { status: 'inactive' },
          expect.any(Object)
        );
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('createBulkUsers', () => {
      it('should create multiple users', async () => {
        const usersData = [
          { email: 'user1@example.com', name: 'User 1', role: UserRole.MEMBER },
          { email: 'user2@example.com', name: 'User 2', role: UserRole.MEMBER }
        ];
        
        const createdUsers = usersData.map((data, index) => ({
          ...mockUser,
          ...data,
          uid: `user-${index}`
        }));
        
        vi.mocked(apiClient.post).mockResolvedValue(createdUsers);
        
        const result = await userService.createBulkUsers(usersData);
        
        expect(result).toEqual(createdUsers);
        expect(apiClient.post).toHaveBeenCalledWith(
          '/users/bulk',
          { users: usersData },
          { loadingKey: 'create-bulk-users' }
        );
      });
    });

    describe('exportUsers', () => {
      it('should export users to CSV', async () => {
        vi.mocked(apiClient.download).mockResolvedValue(undefined);
        
        await userService.exportUsers({ role: UserRole.MEMBER });
        
        expect(apiClient.download).toHaveBeenCalledWith(
          '/users/export',
          'users.csv'
        );
      });
    });
  });

  describe('Statistics', () => {
    describe('getUserStats', () => {
      it('should fetch user statistics', async () => {
        const mockStats = {
          total: 100,
          byRole: {
            [UserRole.SUPER_ADMIN]: 1,
            [UserRole.CLUB_OWNER]: 5,
            [UserRole.MEMBER]: 80,
            [UserRole.PARENT]: 14
          } as Record<UserRole, number>,
          byStatus: {
            active: 85,
            inactive: 10,
            pending: 5
          },
          recentlyActive: 50
        };
        
        vi.mocked(apiClient.get).mockResolvedValue(mockStats);
        
        const result = await userService.getUserStats();
        
        expect(result).toEqual(mockStats);
        expect(apiClient.get).toHaveBeenCalledWith(
          '/users/stats',
          { loadingKey: 'fetch-user-stats' }
        );
      });
    });
  });

  describe('Permissions', () => {
    describe('hasPermission', () => {
      it('should check permission correctly for hierarchy', () => {
        const adminUser = { ...mockUser, role: UserRole.FEDERATION_ADMIN };
        
        // Admin can access lower roles
        expect(userService.hasPermission(adminUser, UserRole.MEMBER)).toBe(true);
        expect(userService.hasPermission(adminUser, UserRole.CLUB_OWNER)).toBe(true);
        
        // Admin cannot access higher roles
        expect(userService.hasPermission(adminUser, UserRole.SUPER_ADMIN)).toBe(false);
      });

      it('should handle MEMBER permissions', () => {
        const memberUser = { ...mockUser, role: UserRole.MEMBER };
        
        // Member can access same or lower
        expect(userService.hasPermission(memberUser, UserRole.MEMBER)).toBe(true);
        expect(userService.hasPermission(memberUser, UserRole.PARENT)).toBe(true);
        
        // Member cannot access higher
        expect(userService.hasPermission(memberUser, UserRole.CLUB_OWNER)).toBe(false);
        expect(userService.hasPermission(memberUser, UserRole.HEAD_COACH)).toBe(false);
      });

      it('should handle SUPER_ADMIN permissions', () => {
        const superAdmin = { ...mockUser, role: UserRole.SUPER_ADMIN };
        
        // Super admin can access everything
        expect(userService.hasPermission(superAdmin, UserRole.SUPER_ADMIN)).toBe(true);
        expect(userService.hasPermission(superAdmin, UserRole.FEDERATION_ADMIN)).toBe(true);
        expect(userService.hasPermission(superAdmin, UserRole.MEMBER)).toBe(true);
        expect(userService.hasPermission(superAdmin, UserRole.VENDOR)).toBe(true);
      });
    });
  });
});
