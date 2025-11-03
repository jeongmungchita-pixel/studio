import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuthService } from '@/lib/di/auth-service';
import type { IAPIClient } from '@/lib/di/interfaces';

// Mock API Client
const mockAPIClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
} as unknown as IAPIClient;

describe('AuthService Simple Tests', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.resetAllMocks();
    authService = new AuthService(mockAPIClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
      };

      mockAPIClient.post.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result).toEqual(mockUser);
      expect(mockAPIClient.post).toHaveBeenCalledWith(
        '/auth/login',
        {
          email: 'test@example.com',
          password: 'password123'
        }
      );
    });

    it('should throw error with invalid credentials', async () => {
      mockAPIClient.post.mockResolvedValue({
        success: false,
        error: { message: 'Invalid credentials' },
      });

      await expect(authService.login({
        email: 'test@example.com',
        password: 'wrongpassword'
      })).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should register new user successfully', async () => {
      const mockUser = {
        uid: 'new-user-uid',
        email: 'newuser@example.com',
        displayName: 'New User',
      };

      mockAPIClient.post.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await authService.register({
        email: 'newuser@example.com',
        password: 'password123',
        displayName: 'New User'
      });

      expect(result).toEqual(mockUser);
      expect(mockAPIClient.post).toHaveBeenCalledWith(
        '/auth/register',
        {
          email: 'newuser@example.com',
          password: 'password123',
          displayName: 'New User'
        }
      );
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockAPIClient.post.mockResolvedValue({
        success: true,
      });

      await expect(authService.logout()).resolves.not.toThrow();
      expect(mockAPIClient.post).toHaveBeenCalledWith('/auth/logout');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user', async () => {
      const mockUser = {
        uid: 'current-user-uid',
        email: 'current@example.com',
        displayName: 'Current User',
      };

      mockAPIClient.get.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await authService.getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(mockAPIClient.get).toHaveBeenCalledWith('/auth/me');
    });

    it('should return null when no user logged in', async () => {
      mockAPIClient.get.mockResolvedValue({
        success: false,
      });

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Updated Name',
      };

      mockAPIClient.put.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await authService.updateProfile('test-uid', {
        displayName: 'Updated Name',
      });

      expect(result).toEqual(mockUser);
      expect(mockAPIClient.put).toHaveBeenCalledWith('/auth/profile/test-uid', {
        displayName: 'Updated Name',
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      mockAPIClient.post.mockResolvedValue({
        success: true,
      });

      await expect(authService.resetPassword('test@example.com')).resolves.not.toThrow();
      expect(mockAPIClient.post).toHaveBeenCalledWith('/auth/reset-password', {
        email: 'test@example.com'
      });
    });
  });

  describe('getRedirectUrl', () => {
    it('should return correct redirect URL for role', () => {
      expect(authService.getRedirectUrl('SUPER_ADMIN')).toBe('/super-admin');
      expect(authService.getRedirectUrl('FEDERATION_ADMIN')).toBe('/admin');
      expect(authService.getRedirectUrl('CLUB_OWNER')).toBe('/club-dashboard');
      expect(authService.getRedirectUrl('MEMBER')).toBe('/member');
      expect(authService.getRedirectUrl('PARENT')).toBe('/my-profile');
      expect(authService.getRedirectUrl('UNKNOWN')).toBe('/dashboard');
    });
  });
});
