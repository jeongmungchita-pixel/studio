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

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, collection, id) => ({ collection, id })),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  collection: vi.fn((db, name) => ({ name })),
  query: vi.fn((...args) => ({ query: args })),
  where: vi.fn((field, op, value) => ({ field, op, value })),
}));

describe('useUser Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => null,
    });
    
    mockGetDocs.mockResolvedValue({
      empty: true,
      docs: [],
    });
    
    mockSetDoc.mockResolvedValue(undefined);
  });

  it('should return null user when not authenticated', async () => {
    mockOnAuthStateChanged.mockImplementation((callback) => {
      callback(null);
      return () => {};
    });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.isUserLoading).toBe(false);
    });

    expect(result.current._user).toBe(null);
  });

  it('should handle authenticated user without profile', async () => {
    const mockFirebaseUser: Partial<User> = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: null,
      phoneNumber: null,
      providerData: [{ providerId: 'password' }] as any,
    };

    mockOnAuthStateChanged.mockImplementation((callback) => {
      callback(mockFirebaseUser);
      return () => {};
    });

    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => null,
    });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.isUserLoading).toBe(false);
    });

    expect(result.current._user).toBeTruthy();
    expect(result.current._user?.uid).toBe('test-uid');
    expect(result.current._user?.email).toBe('test@example.com');
    expect(result.current._user?.role).toBe(UserRole.MEMBER);
  });

  it('should load existing user profile', async () => {
    const mockFirebaseUser: Partial<User> = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
    } as any;

    const mockUserProfile = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Existing User',
      status: 'active',
      role: UserRole.CLUB_OWNER,
      clubId: 'club-123',
      provider: 'email',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockOnAuthStateChanged.mockImplementation((callback) => {
      callback(mockFirebaseUser);
      return () => {};
    });

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockUserProfile,
    });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.isUserLoading).toBe(false);
    });

    expect(result.current._user).toBeTruthy();
    expect(result.current._user?.displayName).toBe('Existing User');
    expect(result.current._user?.role).toBe(UserRole.CLUB_OWNER);
    expect(result.current._user?.clubId).toBe('club-123');
  });

  it('should handle club owner approval request', async () => {
    const mockFirebaseUser: Partial<User> = {
      uid: 'test-uid',
      email: 'test@example.com',
    } as any;

    mockOnAuthStateChanged.mockImplementation((callback) => {
      callback(mockFirebaseUser);
      return () => {};
    });

    // No existing profile
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => null,
    });

    // Club owner request
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        type: 'clubOwner',
        status: 'pending',
        email: 'test@example.com',
        name: 'Club Owner',
        clubName: 'Test Club',
        phoneNumber: '010-1234-5678',
      }),
    });

    // No super admin request
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => null,
    });

    // No member request
    mockGetDocs.mockResolvedValueOnce({
      empty: true,
      docs: [],
    });

    // Club query for club ID
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{
        id: 'club-123',
        data: () => ({ name: 'Test Club' }),
      }],
    });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.isUserLoading).toBe(false);
    });

    expect(result.current._user).toBeTruthy();
    expect(result.current._user?.role).toBe(UserRole.CLUB_OWNER);
    expect(result.current._user?.displayName).toBe('Club Owner');
  });

  it('should handle super admin approval request', async () => {
    const mockFirebaseUser: Partial<User> = {
      uid: 'test-uid',
      email: 'test@example.com',
    } as any;

    mockOnAuthStateChanged.mockImplementation((callback) => {
      callback(mockFirebaseUser);
      return () => {};
    });

    // No existing profile
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => null,
    });

    // No club owner request
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => null,
    });

    // Super admin request
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        type: 'superAdmin',
        status: 'approved',
        email: 'test@example.com',
        name: 'Super Admin',
        phoneNumber: '010-1234-5678',
      }),
    });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.isUserLoading).toBe(false);
    }, { timeout: 5000 });

    expect(result.current._user).toBeTruthy();
    expect(result.current._user?.role).toBe(UserRole.SUPER_ADMIN);
    expect(result.current._user?.displayName).toBe('Super Admin');
  });

  it('should handle member approval request', async () => {
    const mockFirebaseUser: Partial<User> = {
      uid: 'test-uid',
      email: 'test@example.com',
    } as any;

    mockOnAuthStateChanged.mockImplementation((callback) => {
      callback(mockFirebaseUser);
      return () => {};
    });

    // No existing profile
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => null,
    });

    // No club owner request
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => null,
    });

    // No super admin request
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => null,
    });

    // Member request
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{
        data: () => ({
          type: 'member',
          status: 'approved',
          email: 'test@example.com',
          memberName: 'Member Name',
          phoneNumber: '010-1234-5678',
          clubId: 'club-456',
        }),
      }],
    });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.isUserLoading).toBe(false);
    }, { timeout: 5000 });

    expect(result.current._user).toBeTruthy();
    expect(result.current._user?.role).toBe(UserRole.MEMBER);
    expect(result.current._user?.displayName).toBe('Member Name');
    expect(result.current._user?.clubId).toBe('club-456');
  });

  it('should create new profile when none exists', async () => {
    const mockFirebaseUser: Partial<User> = {
      uid: 'new-uid',
      email: 'new@example.com',
      displayName: null,
    } as any;

    mockOnAuthStateChanged.mockImplementation((callback) => {
      callback(mockFirebaseUser);
      return () => {};
    });

    // No existing profile
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => null,
    });

    // No requests
    mockGetDocs.mockResolvedValue({
      empty: true,
      docs: [],
    });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.isUserLoading).toBe(false);
    });

    expect(mockSetDoc).toHaveBeenCalled();
    expect(result.current._user).toBeTruthy();
    expect(result.current._user?.uid).toBe('new-uid');
    expect(result.current._user?.email).toBe('new@example.com');
    expect(result.current._user?.role).toBe(UserRole.MEMBER);
  });

  it('should handle errors gracefully', async () => {
    const mockFirebaseUser: Partial<User> = {
      uid: 'test-uid',
      email: 'test@example.com',
    } as any;

    mockOnAuthStateChanged.mockImplementation((callback) => {
      callback(mockFirebaseUser);
      return () => {};
    });

    // Error loading profile
    mockGetDoc.mockRejectedValueOnce(new Error('Firestore error'));

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.isUserLoading).toBe(false);
    });

    expect(result.current._user).toBeTruthy();
    expect(result.current._user?._profileError).toBe(true);
  });

  it('should cleanup subscription on unmount', () => {
    const unsubscribe = vi.fn();
    mockOnAuthStateChanged.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useUser());

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('should update loading state correctly', async () => {
    mockOnAuthStateChanged.mockImplementation((callback) => {
      // Simulate delayed auth state
      setTimeout(() => callback(null), 100);
      return () => {};
    });

    const { result, rerender } = renderHook(() => useUser());

    expect(result.current.isUserLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isUserLoading).toBe(false);
    });
  });
});
