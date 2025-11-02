import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/firebase', () => ({
  useAuth: vi.fn(),
  useFirestore: vi.fn(),
}));

import { useUser } from '../use-user';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual<any>('firebase/auth');
  return {
    ...actual,
    onAuthStateChanged: vi.fn(),
    signOut: vi.fn(),
  };
});

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<any>('firebase/firestore');
  return {
    ...actual,
    doc: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(),
  };
});

const { useAuth, useFirestore } = await import('@/firebase');

function mockSignedInUser(overrides: Partial<any> = {}) {
  return {
    uid: 'u1',
    email: 'e@x.com',
    displayName: 'User',
    photoURL: null,
    phoneNumber: undefined,
    providerData: [{ providerId: 'password' }],
    reload: vi.fn(async () => {}),
    ...overrides,
  };
}

describe('useUser extended', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges existing Firestore profile when user signed in', async () => {
    (useAuth as any).mockReturnValue({});
    (useFirestore as any).mockReturnValue({});

    const fbUser = mockSignedInUser();
    vi.mocked(onAuthStateChanged as any).mockImplementation((_auth: any, cb: any) => {
      cb(fbUser);
      return () => {};
    });

    vi.mocked(doc as any).mockReturnValue({});
    vi.mocked(getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => ({
        uid: 'u1',
        email: 'e@x.com',
        displayName: 'FromProfile',
        role: 'MEMBER',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
      }),
    });

    const { result } = renderHook(() => useUser());
    await waitFor(() => {
      expect(result.current.isUserLoading).toBe(false);
    });
    expect(result.current._user).not.toBeNull();
    expect(result.current._user?.displayName).toBe('FromProfile');
    expect(result.current._user?.email).toBe('e@x.com');
  });

  it('on profile fetch error, reload succeeds and sets basic profile with _profileError', async () => {
    (useAuth as any).mockReturnValue({});
    (useFirestore as any).mockReturnValue({});

    const fbUser = mockSignedInUser();
    vi.mocked(onAuthStateChanged as any).mockImplementation((_auth: any, cb: any) => {
      cb(fbUser);
      return () => {};
    });

    vi.mocked(doc as any).mockReturnValue({});
    vi.mocked(getDoc as any).mockRejectedValue(new Error('firestore down'));

    const { result } = renderHook(() => useUser());
    await waitFor(() => {
      expect(result.current.isUserLoading).toBe(false);
    });
    expect(fbUser.reload).toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(result.current._user?._profileError).toBe(true);
    expect(result.current._user?.status).toBe('pending');
  });
});
