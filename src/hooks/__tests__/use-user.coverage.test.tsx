import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUser } from '../use-user';
import { User } from 'firebase/auth';
import { UserRole } from '@/types/auth';

// Mock Firebase modules
const mockOnAuthStateChanged = vi.fn();
const mockSignOut = vi.fn();
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockSetDoc = vi.fn();

vi.mock('@/firebase', () => ({
  useAuth: vi.fn(() => ({
    onAuthStateChanged: mockOnAuthStateChanged,
    signOut: mockSignOut,
  })),
  useFirestore: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: any[]) => (mockOnAuthStateChanged as any)(...args),
  signOut: (...args: any[]) => (mockSignOut as any)(...args),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, collection, id) => ({ collection, id })),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  collection: vi.fn((db, name) => ({ name })),
  query: vi.fn((...args) => ({ query: args })),
  where: vi.fn((field, op, value) => ({ field, op, value })),
}));

describe('useUser Hook Coverage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset all mocks to default behavior
    mockOnAuthStateChanged.mockReset();
    mockGetDoc.mockReset();
    mockGetDocs.mockReset();
    mockSetDoc.mockReset();
    mockSignOut.mockReset();
    
    // Set default implementations
    mockOnAuthStateChanged.mockImplementation((callback) => {
      return () => {};
    });
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => null,
    });
    mockGetDocs.mockResolvedValue({
      empty: true,
      docs: [],
    });
  });

  describe('Auth initialization loading state (lines 21-22)', () => {
    it('should set loading to true when auth is not initialized', async () => {
      mockOnAuthStateChanged.mockImplementation((callback) => {
        // Don't call callback immediately - simulates auth not ready
        return () => {};
      });

      const { result } = renderHook(() => useUser());
      
      // Should have loading true initially
      expect(result.current.isUserLoading).toBe(true);
      expect(result.current._user).toBe(null);
    });
  });

  describe('User profile loading (lines 27-49)', () => {
    it('should load user profile from Firestore when user exists', async () => {
      const mockFirebaseUser = {
        uid: 'test-uid',
        email: 'test@example.com',
      } as User;

      const mockUserProfile = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.MEMBER,
        status: 'active',
      };

      // Clear and set up fresh mock
      mockOnAuthStateChanged.mockClear();
      let capturedCallback: (user: User | null) => void;
      
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        console.log('Mock implementation called with callback:', typeof callback);
        capturedCallback = callback;
        return () => {};
      });

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockUserProfile,
      });

      const { result } = renderHook(() => useUser());

      // Check if mock was called
      expect(mockOnAuthStateChanged).toHaveBeenCalled();
      console.log('Mock calls:', mockOnAuthStateChanged.mock.calls);
      console.log('Captured callback type:', typeof capturedCallback);

      // Verify callback was captured
      expect(typeof capturedCallback).toBe('function');

      // Trigger auth state change
      capturedCallback(mockFirebaseUser);

      await waitFor(() => {
        expect(result.current._user).toEqual(mockUserProfile);
        expect(result.current.isUserLoading).toBe(false);
      });
    });

    it('should check clubOwnerRequests when user profile does not exist', async () => {
      const mockFirebaseUser = {
        uid: 'test-uid',
        email: 'owner@example.com',
      } as User;

      const mockRequestData = {
        email: 'owner@example.com',
        status: 'pending',
        clubName: 'Test Club',
      };

      mockOnAuthStateChanged.mockClear();
      let capturedCallback: (user: User | null) => void;
      
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        capturedCallback = callback;
        return () => {};
      });

      // User profile doesn't exist
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => null,
      });

      // Mock clubOwnerRequests query
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          data: () => mockRequestData,
        }],
      });

      // Mock other queries as empty
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: [],
      });

      const { result } = renderHook(() => useUser());

      // Trigger auth state change
      capturedCallback!(mockFirebaseUser);

      await waitFor(() => {
        expect(result.current.isUserLoading).toBe(false);
      });

      // Should have called getDocs for clubOwnerRequests
      expect(mockGetDocs).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle Firestore errors gracefully', async () => {
      const mockFirebaseUser = {
        uid: 'test-uid',
        email: 'test@example.com',
      } as User;

      mockOnAuthStateChanged.mockClear();
      let capturedCallback: (user: User | null) => void;
      
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        capturedCallback = callback;
        return () => {};
      });

      // Simulate Firestore error
      mockGetDoc.mockRejectedValue(new Error('Firestore error'));

      const { result } = renderHook(() => useUser());

      // Trigger auth state change
      capturedCallback!(mockFirebaseUser);

      await waitFor(() => {
        expect(result.current.isUserLoading).toBe(false);
      });

      // Should handle error without crashing
      expect(result.current._user).toBe(null);
    });
  });

  describe('Auth state changes', () => {
    it('should handle user sign out', async () => {
      const mockFirebaseUser = {
        uid: 'test-uid',
        email: 'test@example.com',
      } as User;

      mockOnAuthStateChanged.mockClear();
      let capturedCallback: (user: User | null) => void;
      
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        capturedCallback = callback;
        return () => {};
      });

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          uid: 'test-uid',
          email: 'test@example.com',
          role: UserRole.MEMBER,
        }),
      });

      const { result } = renderHook(() => useUser());

      // Initial sign in
      capturedCallback!(mockFirebaseUser);

      await waitFor(() => {
        expect(result.current._user).not.toBe(null);
      });

      // Sign out
      capturedCallback!(null);

      await waitFor(() => {
        expect(result.current._user).toBe(null);
        expect(result.current.isUserLoading).toBe(false);
      });
    });
  });

  describe('Role-based access', () => {
    it('should provide user role information', async () => {
      const mockFirebaseUser = {
        uid: 'admin-uid',
        email: 'admin@example.com',
      } as User;

      const mockAdminProfile = {
        uid: 'admin-uid',
        email: 'admin@example.com',
        role: UserRole.FEDERATION_ADMIN,
        status: 'active',
      };

      mockOnAuthStateChanged.mockClear();
      let capturedCallback: (user: User | null) => void;
      
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        capturedCallback = callback;
        return () => {};
      });

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockAdminProfile,
      });

      const { result } = renderHook(() => useUser());

      // Trigger auth state change
      capturedCallback!(mockFirebaseUser);

      await waitFor(() => {
        expect(result.current._user?.role).toBe(UserRole.FEDERATION_ADMIN);
      });
    });
  });
});
