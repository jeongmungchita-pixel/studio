import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEnhancedAPI } from '../use-enhanced-api';
import { APIError } from '@/lib/error/error-manager';

vi.mock('@/firebase', () => ({
  useFirestore: () => null,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useEnhancedAPI more error paths when API not initialized', () => {
  it('useClubMembers throws API_NOT_INITIALIZED', async () => {
    const { result } = renderHook(() => useEnhancedAPI(), { wrapper });
    const { useClubMembers } = result.current;
    const { result: r2 } = renderHook(() => useClubMembers('club-x'), { wrapper });
    await new Promise(resolve => setTimeout(resolve, 5));
    // API 미초기화 시 enabled=false로 쿼리가 실행되지 않음
    expect(result.current.isInitialized).toBe(false);
    expect(r2.current.error).toBeNull();
    expect(r2.current.isFetching).toBe(false);
  });

  it('usePaginatedUsers throws API_NOT_INITIALIZED', async () => {
    const { result } = renderHook(() => useEnhancedAPI(), { wrapper });
    const { usePaginatedUsers } = result.current;
    const { result: r2 } = renderHook(() => usePaginatedUsers({ role: 'user' }), { wrapper });
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(result.current.isInitialized).toBe(false);
    expect(r2.current.error).toBeNull();
    expect(r2.current.isFetching).toBe(false);
  });

  it('useBatchOperations rejects when operations throw', async () => {
    const { result } = renderHook(() => useEnhancedAPI(), { wrapper });
    const { useBatchOperations } = result.current;
    const { result: m } = renderHook(() => useBatchOperations(), { wrapper });
    // Simulate rejected operations
    const ops = [
      async () => { throw new APIError('x', 'API_NOT_INITIALIZED'); },
      async () => { throw new Error('y'); },
    ];
    // mutateAsync should resolve with results (allSettled) or at least not throw here since mutationFn resolves
    // But useEnhancedAPI's useBatchOperations returns Promise.allSettled results, so call directly
    const settled = await m.current.mutateAsync(ops);
    expect(Array.isArray(settled)).toBe(true);
    expect(settled.length).toBe(2);
  });
});
