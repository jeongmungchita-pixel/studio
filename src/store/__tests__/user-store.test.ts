import { describe, it, expect, beforeEach } from 'vitest';
import { useUserStore } from '../user-store';
import { UserProfile, UserRole } from '@/types/auth';
import { APIError } from '@/utils/error/api-error';

const mockUser: UserProfile = {
  uid: 'user123',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'MEMBER' as UserRole,
  status: 'active',
  provider: 'email',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('User Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useUserStore.getState().reset();
  });

  describe('User Management', () => {
    it('should set user correctly', () => {
      const { setUser } = useUserStore.getState();
      
      setUser(mockUser);
      
      const state = useUserStore.getState();
      expect(state._user).toEqual(mockUser);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should clear error when setting user', () => {
      const { setError, setUser } = useUserStore.getState();
      
      // Set an error first
      const error = new APIError('Test error', 'TEST_ERROR', 500);
      setError(error);
      expect(useUserStore.getState().error).toEqual(error);
      
      // Setting user should clear error
      setUser(mockUser);
      expect(useUserStore.getState().error).toBeNull();
    });

    it('should clear user correctly', () => {
      const { setUser, clearUser } = useUserStore.getState();
      
      setUser(mockUser);
      expect(useUserStore.getState()._user).toEqual(mockUser);
      
      clearUser();
      
      const state = useUserStore.getState();
      expect(state._user).toBeNull();
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('Profile Updates', () => {
    it('should update profile when user exists', () => {
      const { setUser, updateProfile } = useUserStore.getState();
      
      setUser(mockUser);
      
      const updates = {
        displayName: 'Updated Name',
        phoneNumber: '010-1234-5678',
      };
      
      updateProfile(updates);
      
      const updatedUser = useUserStore.getState()._user;
      expect(updatedUser).toBeDefined();
      expect(updatedUser?.displayName).toBe('Updated Name');
      expect(updatedUser?.phoneNumber).toBe('010-1234-5678');
      expect(updatedUser?.email).toBe(mockUser.email); // Original field preserved
      expect(updatedUser?.updatedAt).toBeDefined();
      expect(new Date(updatedUser!.updatedAt!).getTime()).toBeGreaterThanOrEqual(
        new Date(mockUser.updatedAt!).getTime()
      );
    });

    it('should not update profile when no user exists', () => {
      const { updateProfile } = useUserStore.getState();
      
      expect(useUserStore.getState()._user).toBeNull();
      
      updateProfile({ displayName: 'Should Not Update' });
      
      expect(useUserStore.getState()._user).toBeNull();
    });

    it('should handle partial updates correctly', () => {
      const { setUser, updateProfile } = useUserStore.getState();
      
      setUser(mockUser);
      
      // Update only one field
      updateProfile({ status: 'inactive' });
      
      const updatedUser = useUserStore.getState()._user;
      expect(updatedUser?.status).toBe('inactive');
      expect(updatedUser?.displayName).toBe(mockUser.displayName); // Others unchanged
    });
  });

  describe('Loading State', () => {
    it('should set loading state', () => {
      const { setLoading } = useUserStore.getState();
      
      expect(useUserStore.getState().isLoading).toBe(false);
      
      setLoading(true);
      expect(useUserStore.getState().isLoading).toBe(true);
      
      setLoading(false);
      expect(useUserStore.getState().isLoading).toBe(false);
    });

    it('should clear loading when setting user', () => {
      const { setLoading, setUser } = useUserStore.getState();
      
      setLoading(true);
      expect(useUserStore.getState().isLoading).toBe(true);
      
      setUser(mockUser);
      expect(useUserStore.getState().isLoading).toBe(false);
    });

    it('should clear loading when setting error', () => {
      const { setLoading, setError } = useUserStore.getState();
      
      setLoading(true);
      expect(useUserStore.getState().isLoading).toBe(true);
      
      setError(new APIError('Error', 'ERROR_CODE', 400));
      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should set error correctly', () => {
      const { setError } = useUserStore.getState();
      
      const error = new APIError('Something went wrong', 'SERVER_ERROR', 500);
      setError(error);
      
      const state = useUserStore.getState();
      expect(state.error).toEqual(error);
      expect(state.error?.message).toBe('Something went wrong');
      expect(state.error?.statusCode).toBe(500);
      expect(state.isLoading).toBe(false);
    });

    it('should clear error on reset', () => {
      const { setError, reset } = useUserStore.getState();
      
      setError(new APIError('Error', 'ERROR_CODE', 400));
      expect(useUserStore.getState().error).toBeDefined();
      
      reset();
      expect(useUserStore.getState().error).toBeNull();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all state to initial values', () => {
      const { setUser, setLoading, setError, reset } = useUserStore.getState();
      
      // Set various states
      setUser(mockUser);
      setLoading(true);
      setError(new APIError('Error', 'ERROR_CODE', 500));
      
      // Verify states are set
      let state = useUserStore.getState();
      expect(state._user).toBeDefined();
      expect(state.error).toBeDefined();
      
      // Reset
      reset();
      
      // Verify all reset
      state = useUserStore.getState();
      expect(state._user).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Store Persistence', () => {
    it('should maintain state consistency across operations', () => {
      const { setUser, updateProfile, setError, setLoading } = useUserStore.getState();
      
      // Complex sequence of operations
      setLoading(true);
      setUser(mockUser);
      updateProfile({ role: 'CLUB_OWNER' as UserRole });
      setError(new APIError('Temporary error', 'TEMP_ERROR', 400));
      
      const state = useUserStore.getState();
      expect(state._user?.role).toBe('CLUB_OWNER');
      expect(state.error?.message).toBe('Temporary error');
      expect(state.isLoading).toBe(false); // Should be false after setError
      
      // Clear error and update again
      setUser(state._user);
      updateProfile({ status: 'pending' });
      
      const newState = useUserStore.getState();
      expect(newState._user?.status).toBe('pending');
      expect(newState.error).toBeNull();
    });
  });
});
