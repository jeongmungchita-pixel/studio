import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAPI, useMutation } from '../use-api';

class DummyApiError extends Error {}

vi.mock('@/utils/error/api-error', () => ({
  APIError: {
    fromError: (err: unknown) => {
      if (err instanceof Error) return Object.assign(new DummyApiError(err.message), { name: 'APIError' });
      return Object.assign(new DummyApiError(String(err)), { name: 'APIError' });
    },
  },
}));

describe('useAPI', () => {
  it('fetches on mount and sets data on success', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: { ok: true }, success: true });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAPI(queryFn, { onSuccess }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ ok: true });
    expect(onSuccess).toHaveBeenCalledWith({ ok: true });
  });

  it('sets error via APIError.fromError on failure', async () => {
    const queryFn = vi.fn().mockRejectedValue(new Error('boom'));
    const onError = vi.fn();
    const { result } = renderHook(() => useAPI(queryFn, { onError }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(DummyApiError);
    expect(onError).toHaveBeenCalled();
  });

  it('does not fetch when enabled=false, and refetch is a no-op', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 1, success: true });
    const { result } = renderHook(() => useAPI<number>(queryFn, { enabled: false }));

    // no auto fetch
    expect(queryFn).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.refetch();
    });

    // still not called because enabled=false gates fetchData
    expect(queryFn).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('can refetch after enabling via rerender', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 1, success: true });
    const { result, rerender } = renderHook(({ enabled }) => useAPI<number>(queryFn, { enabled }), {
      initialProps: { enabled: false },
    });

    expect(queryFn).not.toHaveBeenCalled();

    // toggle enabled to true
    rerender({ enabled: true });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // first auto fetch runs due to enabled true
    expect(queryFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
    expect(result.current.data).toBe(1);
  });

  it('refetches on interval when refetchInterval provided', async () => {
    vi.useFakeTimers();
    const queryFn = vi.fn().mockResolvedValue({ data: 'x', success: true });
    renderHook(() => useAPI(queryFn, { refetchInterval: 1000 }));

    // initial
    await vi.advanceTimersByTimeAsync(0);
    // tick 1s
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1);

    expect(queryFn.mock.calls.length).toBeGreaterThanOrEqual(2);
    vi.useRealTimers();
  });
});

describe('useMutation', () => {
  it('mutateAsync returns data and fires callbacks on success', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ data: { id: 1 }, success: true });
    const onSuccess = vi.fn();
    const onSettled = vi.fn();
    const { result } = renderHook(() => useMutation(mutationFn, { onSuccess, onSettled }));

    const data = await act(async () => await result.current.mutateAsync({ a: 1 } as any));
    expect(data).toEqual({ id: 1 });
    expect(onSuccess).toHaveBeenCalledWith({ id: 1 }, { a: 1 });
    expect(onSettled).toHaveBeenCalledWith({ id: 1 }, null, { a: 1 });
    expect(result.current.data).toEqual({ id: 1 });
  });

  it('mutate handles error via APIError.fromError and onError/onSettled', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('fail'));
    const onError = vi.fn();
    const onSettled = vi.fn();
    const { result } = renderHook(() => useMutation(mutationFn, { onError, onSettled }));

    // mutate swallows error
    await act(async () => {
      await result.current.mutate({ v: 1 } as any);
    });
    expect(onError).toHaveBeenCalled();
    expect(onSettled).toHaveBeenCalled();
    expect(result.current.error).toBeInstanceOf(DummyApiError);
  });

  it('reset clears data and error', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ data: 1, success: true });
    const { result } = renderHook(() => useMutation<number, { x: number }>(mutationFn));

    await act(async () => {
      await result.current.mutateAsync({ x: 1 });
    });
    expect(result.current.data).toBe(1);

    act(() => {
      result.current.reset();
    });
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
