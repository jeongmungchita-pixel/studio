import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/firebase', () => ({
  useAuth: vi.fn(),
  useFirestore: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (auth: any, cb: any) => {
    // default: simulate no signed-in user
    cb(null);
    return () => {};
  },
  signOut: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
}));

const { useAuth, useFirestore } = await import('@/firebase');
import { useUser } from '../use-user';

describe('useUser basic states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps loading true if firebase services are unavailable', () => {
    (useAuth as any).mockReturnValue(null);
    (useFirestore as any).mockReturnValue(null);

    const { result } = renderHook(() => useUser());
    expect(result.current.isUserLoading).toBe(true);
  });

  it('returns null user and loading false when no user signed in', () => {
    // Provide non-null services so hook proceeds to subscribe
    (useAuth as any).mockReturnValue({});
    (useFirestore as any).mockReturnValue({});

    const { result } = renderHook(() => useUser());
    // onAuthStateChanged mock fires immediately with null, hook sets loading false
    expect(result.current._user).toBeNull();
    expect(result.current.isUserLoading).toBe(false);
  });
});
