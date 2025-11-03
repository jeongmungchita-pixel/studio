import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../user-service';
import { UserRole } from '@/types/auth';
import type { IAPIClient, IUserService } from '@/lib/di';

// Mock API Client for DI
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();
const mockUpload = vi.fn();
const mockDownload = vi.fn();
const mockGetPaginated = vi.fn();

const mockAPIClient: IAPIClient = {
  get: mockGet,
  post: mockPost,
  put: mockPut,
  delete: mockDelete,
  upload: mockUpload,
  download: mockDownload,
  getPaginated: mockGetPaginated,
};

describe('UserService Coverage Tests - DI Pattern', () => {
  let service: IUserService;

  beforeEach(() => {
    vi.clearAllMocks();
    // DI 패턴으로 서비스 생성
    service = UserService.createWithDI(mockAPIClient);
  });

  describe('changeUserClub method (line 161)', () => {
    it('should change user club to valid clubId', async () => {
      const mockUser = { uid: 'user1', clubId: 'club1' };
      mockPut.mockResolvedValueOnce({
        success: true,
        data: mockUser
      });
      
      const result = await service.changeUserClub('user1', 'club1');
      
      expect(mockPut).toHaveBeenCalledWith('/users/user1', { clubId: 'club1' }, { loadingKey: 'update-user' });
      expect(result.clubId).toBe('club1');
    });

    it('should change user club to null (remove from club)', async () => {
      const mockUser = { uid: 'user1', clubId: undefined };
      mockPut.mockResolvedValueOnce({
        success: true,
        data: mockUser
      });
      
      const result = await service.changeUserClub('user1', null);
      
      expect(mockPut).toHaveBeenCalledWith('/users/user1', { clubId: undefined }, { loadingKey: 'update-user' });
      expect(result.clubId).toBeUndefined();
    });
  });

  describe('activateUser method (line 167)', () => {
    it('should activate user by changing status to active', async () => {
      const mockUser = { uid: 'user1', status: 'active' };
      mockPut.mockResolvedValueOnce({
        success: true,
        data: mockUser
      });
      
      const result = await service.activateUser('user1');
      
      expect(mockPut).toHaveBeenCalledWith('/users/user1', { status: 'active' }, { loadingKey: 'update-user' });
      expect(result.status).toBe('active');
    });
  });

  describe('deactivateUser method', () => {
    it('should deactivate user by changing status to inactive', async () => {
      const mockUser = { uid: 'user1', status: 'inactive' };
      mockPut.mockResolvedValueOnce({
        success: true,
        data: mockUser
      });
      
      const result = await service.deactivateUser('user1');
      
      expect(mockPut).toHaveBeenCalledWith('/users/user1', { status: 'inactive' }, { loadingKey: 'update-user' });
      expect(result.status).toBe('inactive');
    });
  });

  describe('changeUserStatus method', () => {
    it('should change user status to suspended', async () => {
      const mockUser = { uid: 'user1', status: 'suspended' };
      mockPut.mockResolvedValueOnce({
        success: true,
        data: mockUser
      });
      
      const result = await service.changeUserStatus('user1', 'suspended');
      
      expect(mockPut).toHaveBeenCalledWith('/users/user1', { status: 'suspended' }, { loadingKey: 'update-user' });
      expect(result.status).toBe('suspended');
    });
  });

  describe('changeUserRole method', () => {
    it('should change user role', async () => {
      const mockUser = { uid: 'user1', role: UserRole.CLUB_MANAGER };
      mockPut.mockResolvedValueOnce({
        success: true,
        data: mockUser
      });
      
      const result = await service.changeUserRole('user1', UserRole.CLUB_MANAGER);
      
      expect(mockPut).toHaveBeenCalledWith('/users/user1', { role: UserRole.CLUB_MANAGER }, { loadingKey: 'update-user' });
      expect(result.role).toBe(UserRole.CLUB_MANAGER);
    });
  });

  describe('updateUser method', () => {
    it('should update user with provided data', async () => {
      const updateData = { name: 'Updated Name', email: 'updated@example.com' };
      const mockUser = { uid: 'user1', ...updateData };
      mockPut.mockResolvedValueOnce({
        success: true,
        data: mockUser
      });
      
      const result = await service.updateUser('user1', updateData);
      
      expect(mockPut).toHaveBeenCalledWith('/users/user1', updateData, { loadingKey: 'update-user' });
      expect(result.name).toBe('Updated Name');
      expect(result.email).toBe('updated@example.com');
    });
  });

  describe('deleteUser method', () => {
    it('should delete user', async () => {
      mockDelete.mockResolvedValueOnce({ id: 'user1' });
      
      const result = await service.deleteUser('user1');
      
      expect(mockDelete).toHaveBeenCalledWith('/users/user1', { loadingKey: 'delete-user' });
      expect(result.id).toBe('user1');
    });
  });

  describe('createUser method', () => {
    it('should create new user', async () => {
      const userData = { name: 'New User', email: 'new@example.com' };
      const mockUser = { uid: 'new-user-1', ...userData };
      mockPost.mockResolvedValueOnce({
        success: true,
        data: mockUser
      });
      
      const result = await service.createUser(userData);
      
      expect(mockPost).toHaveBeenCalledWith('/users', userData, { loadingKey: 'create-user' });
      expect(result.name).toBe('New User');
      expect(result.email).toBe('new@example.com');
    });
  });

  describe('searchUsers method', () => {
    it('should search users with query', async () => {
      const mockUsers = [{ uid: 'user1', name: 'Test User' }];
      mockGet.mockResolvedValueOnce(mockUsers);
      
      const result = await service.searchUsers('test');
      
      expect(mockGet).toHaveBeenCalledWith('/users/search', { query: 'test' });
      expect(result).toEqual(mockUsers);
    });
  });

  describe('getUserStats method', () => {
    it('should get user statistics', async () => {
      const mockStats = { total: 100, active: 80, inactive: 20 };
      mockGet.mockResolvedValueOnce(mockStats);
      
      const result = await service.getUserStats();
      
      expect(mockGet).toHaveBeenCalledWith('/users/stats');
      expect(result).toEqual(mockStats);
    });
  });
});
