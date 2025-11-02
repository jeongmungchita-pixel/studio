import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEnhancedAPI } from '../use-enhanced-api';

// Mock Firestore to enable API initialization
vi.mock('@/firebase', () => ({ useFirestore: () => ({}) }));

// Mock API factory
const updateProfileMock = vi.fn();
vi.mock('@/api', () => ({
  getAPI: () => ({
    user: {
      updateProfile: updateProfileMock,
    },
  }),
}));

// Mock optimistic update to simply call the asyncFn
vi.mock('../use-optimistic-update', () => ({
  useOptimisticUpdate: () => ({
    optimisticUpdate: async (_updates: any, asyncFn: () => Promise<any>) => asyncFn(),
  }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useEnhancedAPI mutations', () => {
  it('useUpdateUserProfile success path resolves with data', async () => {
    updateProfileMock.mockResolvedValueOnce({ data: { ok: true } });
    const { result } = renderHook(() => useEnhancedAPI(), { wrapper });
    const { useUpdateUserProfile } = result.current;
    const { result: m } = renderHook(() => useUpdateUserProfile(), { wrapper });

    let out: any;
    await act(async () => {
      out = await m.current.mutateAsync({ userId: 'u1', updates: { name: 'A' } });
    });
    expect(out).toEqual({ ok: true });
    expect(updateProfileMock).toHaveBeenCalledTimes(1);
  });

  it('useUpdateUserProfile failure path rejects', async () => {
    updateProfileMock.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useEnhancedAPI(), { wrapper });
    const { useUpdateUserProfile } = result.current;
    const { result: m } = renderHook(() => useUpdateUserProfile(), { wrapper });

    await expect(m.current.mutateAsync({ userId: 'u1', updates: { name: 'B' } })).rejects.toBeTruthy();
    expect(updateProfileMock.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
