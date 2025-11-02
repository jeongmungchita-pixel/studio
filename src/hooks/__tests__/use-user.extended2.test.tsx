import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/firebase', () => ({
  useAuth: vi.fn(),
  useFirestore: vi.fn(),
}));

import { useUser } from '../use-user';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

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
    uid: 'u2',
    email: 'user2@example.com',
    displayName: 'User2',
    photoURL: null,
    phoneNumber: undefined,
    providerData: [{ providerId: 'password' }],
    reload: vi.fn(async () => {}),
    ...overrides,
  };
}

function makeQuerySnapshot(docs: any[]) {
  return {
    empty: docs.length === 0,
    docs: docs.map((data, idx) => ({ id: `d${idx}`, data: () => data })),
  };
}

describe('useUser approval-driven defaults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({});
    (useFirestore as any).mockReturnValue({});
    vi.mocked(doc as any).mockReturnValue({});
  });

  it('creates default CLUB_OWNER profile with pending status when clubOwner request exists (pending)', async () => {
    const fbUser = mockSignedInUser();
    vi.mocked(onAuthStateChanged as any).mockImplementation((_auth: any, cb: any) => {
      cb(fbUser);
      return () => {};
    });

    // getDoc returns non-existent profile
    vi.mocked(getDoc as any).mockResolvedValue({ exists: () => false, data: () => ({}) });
    // getDocs mocks for clubOwnerRequests (pending), superAdminRequests none, memberRegistration none
    vi.mocked(collection as any).mockImplementation((_fs: any, name: string) => ({ name }));
    vi.mocked(query as any).mockImplementation((ref: any) => ref);
    vi.mocked(where as any).mockImplementation(() => ({}));

    vi.mocked(getDocs as any)
      .mockResolvedValueOnce(makeQuerySnapshot([{ email: fbUser.email, name: 'Owner', clubName: 'ABC', status: 'pending' }])) // clubOwnerRequests
      .mockResolvedValueOnce(makeQuerySnapshot([])) // superAdminRequests
      .mockResolvedValueOnce(makeQuerySnapshot([])); // memberRegistrationRequests

    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.isUserLoading).toBe(false));

    expect(setDoc).toHaveBeenCalled();
    expect(result.current._user?.role).toBe('CLUB_OWNER');
    expect(result.current._user?.status).toBe('pending');
  });

  it('creates default MEMBER profile with active status when memberRegistration approved exists', async () => {
    const fbUser = mockSignedInUser();
    vi.mocked(onAuthStateChanged as any).mockImplementation((_auth: any, cb: any) => {
      cb(fbUser);
      return () => {};
    });

    vi.mocked(getDoc as any).mockResolvedValue({ exists: () => false, data: () => ({}) });
    vi.mocked(collection as any).mockImplementation((_fs: any, name: string) => ({ name }));
    vi.mocked(query as any).mockImplementation((ref: any) => ref);
    vi.mocked(where as any).mockImplementation(() => ({}));

    // clubOwner none, superAdmin none, memberRegistration approved
    vi.mocked(getDocs as any)
      .mockResolvedValueOnce(makeQuerySnapshot([]))
      .mockResolvedValueOnce(makeQuerySnapshot([]))
      .mockResolvedValueOnce(makeQuerySnapshot([{ email: fbUser.email, name: 'Mem', clubId: 'c1', clubName: 'XYZ', status: 'approved' }]));

    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.isUserLoading).toBe(false));

    expect(setDoc).toHaveBeenCalled();
    expect(result.current._user?.role).toBe('MEMBER');
    expect(result.current._user?.status).toBe('active');
    expect(result.current._user?.clubId).toBe('c1');
  });

  it('signs out when profile fetch fails and reload also fails', async () => {
    const fbUser = mockSignedInUser({ reload: vi.fn(async () => { throw new Error('reload fail'); }) });
    vi.mocked(onAuthStateChanged as any).mockImplementation((_auth: any, cb: any) => {
      cb(fbUser);
      return () => {};
    });

    vi.mocked(getDoc as any).mockRejectedValue(new Error('firestore down'));

    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.isUserLoading).toBe(false));

    expect(signOut).toHaveBeenCalled();
    expect(result.current._user).toBeNull();
  });
});
