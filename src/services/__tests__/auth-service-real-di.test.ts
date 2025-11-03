import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../auth-service';
import { IAPIClient } from '@/lib/di/interfaces';
import type { UserProfile } from '@/types/auth';

// Mock Firebase Auth
const mockSignInWithEmailAndPassword = vi.fn();
const mockSignOut = vi.fn();
const mockSendPasswordResetEmail = vi.fn();

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  signOut: mockSignOut,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
}));

describe('AuthService Real DI Testing', () => {
  let mockApiClient: IAPIClient;
  let authService: AuthService;

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

    // DI로 AuthService 인스턴스 생성
    authService = AuthService.createWithDI(mockApiClient);
    
    // Mock 초기화
    vi.clearAllMocks();
  });

  describe('사용자 인증', () => {
    it('should sign in user successfully', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const mockUser = {
        uid: 'user-123',
        email,
        role: 'MEMBER' as const,
        status: 'active' as const,
      };

      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      });

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await authService.signIn(email, password);

      expect(result).toEqual(mockUser);
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object), // auth instance
        email,
        password
      );
      expect(mockApiClient.get).toHaveBeenCalledWith('/users/profile', {
        params: { uid: mockUser.uid },
      });
    });

    it('should handle sign in errors', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';
      const error = new Error('Invalid credentials');
      
      mockSignInWithEmailAndPassword.mockRejectedValue(error);

      await expect(authService.signIn(email, password)).rejects.toThrow('Invalid credentials');
    });

    it('should sign out user successfully', async () => {
      mockSignOut.mockResolvedValue(undefined);

      await authService.signOut();

      expect(mockSignOut).toHaveBeenCalledWith(expect.any(Object)); // auth instance
    });

    it('should handle sign out errors', async () => {
      const error = new Error('Sign out failed');
      mockSignOut.mockRejectedValue(error);

      await expect(authService.signOut()).rejects.toThrow('Sign out failed');
    });
  });

  describe('사용자 프로필 관리', () => {
    it('should get user profile successfully', async () => {
      const userId = 'user-123';
      const mockProfile: UserProfile = {
        uid: userId,
        email: 'test@example.com',
        role: 'MEMBER',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      const result = await authService.getUserProfile(userId);

      expect(result).toEqual(mockProfile);
      expect(mockApiClient.get).toHaveBeenCalledWith('/users/profile', {
        params: { uid: userId },
      });
    });

    it('should update user profile successfully', async () => {
      const userId = 'user-123';
      const updateData = {
        displayName: 'Updated Name',
        phoneNumber: '+1234567890',
      };
      const mockUpdatedProfile: UserProfile = {
        uid: userId,
        email: 'test@example.com',
        role: 'MEMBER',
        status: 'active',
        displayName: 'Updated Name',
        phoneNumber: '+1234567890',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.put.mockResolvedValue({
        success: true,
        data: mockUpdatedProfile,
      });

      const result = await authService.updateUserProfile(userId, updateData);

      expect(result).toEqual(mockUpdatedProfile);
      expect(mockApiClient.put).toHaveBeenCalledWith('/users/profile', {
        uid: userId,
        ...updateData,
      });
    });

    it('should handle profile update errors', async () => {
      const userId = 'user-123';
      const updateData = { displayName: 'Updated Name' };
      const error = new Error('Update failed');

      mockApiClient.put.mockRejectedValue(error);

      await expect(authService.updateUserProfile(userId, updateData)).rejects.toThrow('Update failed');
    });
  });

  describe('비밀번호 관리', () => {
    it('should send password reset email successfully', async () => {
      const email = 'test@example.com';

      mockSendPasswordResetEmail.mockResolvedValue(undefined);

      await authService.resetPassword(email);

      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        expect.any(Object), // auth instance
        email
      );
    });

    it('should handle password reset errors', async () => {
      const email = 'test@example.com';
      const error = new Error('Email not found');

      mockSendPasswordResetEmail.mockRejectedValue(error);

      await expect(authService.resetPassword(email)).rejects.toThrow('Email not found');
    });
  });

  describe('사용자 상태 관리', () => {
    it('should update user status successfully', async () => {
      const userId = 'user-123';
      const status = 'active' as const;
      const mockResult = {
        success: true,
        userId,
        previousStatus: 'pending',
        newStatus: status,
        timestamp: new Date().toISOString(),
      };

      mockApiClient.post.mockResolvedValue({
        success: true,
        data: mockResult,
      });

      const result = await authService.updateUserStatus(userId, status);

      expect(result).toEqual(mockResult);
      expect(mockApiClient.post).toHaveBeenCalledWith('/admin/users/update-status', {
        userId,
        status,
        reason: null,
      });
    });

    it('should handle status update with reason', async () => {
      const userId = 'user-123';
      const status = 'inactive' as const;
      const reason = 'Account suspended';
      const mockResult = {
        success: true,
        userId,
        previousStatus: 'active',
        newStatus: status,
        timestamp: new Date().toISOString(),
      };

      mockApiClient.post.mockResolvedValue({
        success: true,
        data: mockResult,
      });

      const result = await authService.updateUserStatus(userId, status, reason);

      expect(result).toEqual(mockResult);
      expect(mockApiClient.post).toHaveBeenCalledWith('/admin/users/update-status', {
        userId,
        status,
        reason,
      });
    });
  });

  describe('권한 검증', () => {
    it('should check if user has minimum role', () => {
      const userRole = 'CLUB_MANAGER';
      const requiredRole = 'MEMBER';

      const result = authService.hasMinimumRole(userRole, requiredRole);

      expect(result).toBe(true);
    });

    it('should check if user does not have minimum role', () => {
      const userRole = 'MEMBER';
      const requiredRole = 'CLUB_MANAGER';

      const result = authService.hasMinimumRole(userRole, requiredRole);

      expect(result).toBe(false);
    });

    it('should check if user is admin', () => {
      const userProfile: UserProfile = {
        uid: 'user-123',
        email: 'admin@example.com',
        role: 'FEDERATION_ADMIN',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = authService.isAdmin(userProfile);

      expect(result).toBe(true);
    });

    it('should check if user is club staff', () => {
      const userProfile: UserProfile = {
        uid: 'user-123',
        email: 'manager@example.com',
        role: 'CLUB_MANAGER',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = authService.isClubStaff(userProfile);

      expect(result).toBe(true);
    });
  });

  describe('세션 관리', () => {
    it('should get current user session', async () => {
      const mockUser: UserProfile = {
        uid: 'user-123',
        email: 'test@example.com',
        role: 'MEMBER',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await authService.getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/session');
    });

    it('should handle no current session', async () => {
      mockApiClient.get.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });
  });
});
