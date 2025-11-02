import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../user-service';
import { apiClient } from '@/lib/api/unified-api-client';
import { UserRole } from '@/types/auth';

vi.mock('../api-client', () => {
  const real = vi.importActual<any>('../api-client');
  return {
    ...real,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      upload: vi.fn(),
      download: vi.fn(),
      getPaginated: vi.fn(),
    },
  };
});

describe('UserService Coverage Tests', () => {
  let service: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockReset();
    (apiClient.post as any).mockReset();
    (apiClient.put as any).mockReset();
    (apiClient.delete as any).mockReset();
    (apiClient.upload as any).mockReset();
    (apiClient.download as any).mockReset();
    (apiClient.getPaginated as any).mockReset();
    (UserService as any).instance = undefined;
    service = UserService.getInstance();
  });

  describe('changeUserClub method (line 161)', () => {
    it('should change user club to valid clubId', async () => {
      const mockUser = { uid: 'user1', clubId: 'club1' };
      (apiClient.put as any).mockResolvedValueOnce(mockUser);
      
      const result = await service.changeUserClub('user1', 'club1');
      
      expect(apiClient.put).toHaveBeenCalledWith('/users/user1', { clubId: 'club1' }, { loadingKey: 'update-user' });
      expect(result.clubId).toBe('club1');
    });

    it('should change user club to null (remove from club)', async () => {
      const mockUser = { uid: 'user1', clubId: undefined };
      (apiClient.put as any).mockResolvedValueOnce(mockUser);
      
      const result = await service.changeUserClub('user1', null);
      
      expect(apiClient.put).toHaveBeenCalledWith('/users/user1', { clubId: undefined }, { loadingKey: 'update-user' });
      expect(result.clubId).toBeUndefined();
    });
  });

  describe('activateUser method (line 167)', () => {
    it('should activate user by changing status to active', async () => {
      const mockUser = { uid: 'user1', status: 'active' };
      (apiClient.put as any).mockResolvedValueOnce(mockUser);
      
      const result = await service.activateUser('user1');
      
      expect(apiClient.put).toHaveBeenCalledWith('/users/user1', { status: 'active' }, { loadingKey: 'update-user' });
      expect(result.status).toBe('active');
    });
  });

  describe('deactivateUser method', () => {
    it('should deactivate user by changing status to inactive', async () => {
      const mockUser = { uid: 'user1', status: 'inactive' };
      (apiClient.put as any).mockResolvedValueOnce(mockUser);
      
      const result = await service.deactivateUser('user1');
      
      expect(apiClient.put).toHaveBeenCalledWith('/users/user1', { status: 'inactive' }, { loadingKey: 'update-user' });
      expect(result.status).toBe('inactive');
    });
  });

  describe('changeUserStatus method', () => {
    it('should change user status to suspended', async () => {
      const mockUser = { uid: 'user1', status: 'suspended' };
      (apiClient.put as any).mockResolvedValueOnce(mockUser);
      
      const result = await service.changeUserStatus('user1', 'suspended');
      
      expect(apiClient.put).toHaveBeenCalledWith('/users/user1', { status: 'suspended' }, { loadingKey: 'update-user' });
      expect(result.status).toBe('suspended');
    });
  });

  describe('changeUserRole method', () => {
    it('should change user role', async () => {
      const mockUser = { uid: 'user1', role: UserRole.COACH };
      (apiClient.put as any).mockResolvedValueOnce(mockUser);
      
      const result = await service.changeUserRole('user1', UserRole.COACH);
      
      expect(apiClient.put).toHaveBeenCalledWith('/users/user1', { role: UserRole.COACH }, { loadingKey: 'update-user' });
      expect(result.role).toBe(UserRole.COACH);
    });
  });

  describe('updateUser method', () => {
    it('should update user with provided data', async () => {
      const updateData = { displayName: 'New Name', email: 'new@example.com' };
      const mockUser = { uid: 'user1', ...updateData };
      (apiClient.put as any).mockResolvedValueOnce(mockUser);
      
      const result = await service.updateUser('user1', updateData);
      
      expect(apiClient.put).toHaveBeenCalledWith('/users/user1', updateData, { loadingKey: 'update-user' });
      expect(result.displayName).toBe('New Name');
      expect(result.email).toBe('new@example.com');
    });
  });

  describe('deleteUser method', () => {
    it('should delete user', async () => {
      (apiClient.delete as any).mockResolvedValueOnce({});
      
      await service.deleteUser('user1');
      
      expect(apiClient.delete).toHaveBeenCalledWith('/users/user1', { loadingKey: 'delete-user' });
    });
  });

  describe('createUser method', () => {
    it('should create new user', async () => {
      const userData = { email: 'test@example.com', displayName: 'Test User' };
      const mockUser = { uid: 'newUser1', ...userData };
      (apiClient.post as any).mockResolvedValueOnce(mockUser);
      
      const result = await service.createUser(userData);
      
      expect(apiClient.post).toHaveBeenCalledWith('/users', userData, { loadingKey: 'create-user' });
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('searchUsers method', () => {
    it('should search users with query', async () => {
      const mockResults = [{ uid: 'user1', displayName: 'John Doe' }];
      (apiClient.get as any).mockResolvedValueOnce(mockResults);
      
      const result = await service.searchUsers('John');
      
      expect(apiClient.get).toHaveBeenCalledWith('/users/search', { loadingKey: 'search-users', params: { q: 'John' } });
      expect(result).toEqual(mockResults);
    });
  });

  describe('getUserStats method', () => {
    it('should get user statistics', async () => {
      const mockStats = { totalUsers: 100, activeUsers: 80, inactiveUsers: 20 };
      (apiClient.get as any).mockResolvedValueOnce(mockStats);
      
      const result = await service.getUserStats();
      
      expect(apiClient.get).toHaveBeenCalledWith('/users/stats', { loadingKey: 'fetch-user-stats' });
      expect(result.totalUsers).toBe(100);
    });
  });
});
