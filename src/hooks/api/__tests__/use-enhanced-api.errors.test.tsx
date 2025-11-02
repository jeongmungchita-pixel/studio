import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEnhancedAPI } from '../use-enhanced-api';
import { APIError } from '@/utils/error/api-error';

vi.mock('@/firebase', () => ({
  useFirestore: () => null,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useEnhancedAPI when API not initialized', () => {
  it('isInitialized is false and mutation throws API_NOT_INITIALIZED', async () => {
    const { result } = renderHook(() => useEnhancedAPI(), { wrapper });
    expect(result.current.isInitialized).toBe(false);

    const { useUpdateUserProfile } = result.current;
    const { result: m } = renderHook(() => useUpdateUserProfile(), { wrapper });
    await expect(
      m.current.mutateAsync({ userId: 'u1', updates: { name: 'X' } })
    ).rejects.toBeInstanceOf(APIError);
  });
});
