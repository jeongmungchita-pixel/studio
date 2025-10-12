import { renderHook, waitFor } from '@testing-library/react';
import { useUser } from '@/firebase/hooks/use-user';
import { UserRole } from '@/types';

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  onAuthStateChanged: jest.fn((auth, callback) => {
    // Simulate authenticated user
    callback({
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
    });
    return jest.fn(); // unsubscribe function
  }),
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(() =>
    Promise.resolve({
      exists: () => true,
      data: () => ({
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.MEMBER,
        status: 'approved',
      }),
    })
  ),
}));

describe('useUser Hook', () => {
  it('should return user data when authenticated', async () => {
    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.user).toBeDefined();
      expect(result.current.user?.email).toBe('test@example.com');
    });
  });

  it('should not be loading after data is fetched', async () => {
    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.isUserLoading).toBe(false);
    });
  });

  it('should have correct user role', async () => {
    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.user?.role).toBe(UserRole.MEMBER);
    });
  });
});
