import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAPI } from '../use-api';
import { APIError } from '@/lib/error/error-manager';

// Mock APIError
vi.mock('@/utils/error/api-error', () => ({
  APIError: {
    fromError: vi.fn((err) => ({
      message: err?.message || 'API Error',
      code: 'API_ERROR',
      status: 500
    }))
  }
}));

describe('useAPI Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should initialize with default state', () => {
      const mockQueryFn = vi.fn().mockResolvedValue({ data: 'test', success: true });
      
      const { result } = renderHook(() => useAPI(mockQueryFn, { enabled: false }));
      
      expect(result.current.data).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should fetch data successfully', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockQueryFn = vi.fn().mockResolvedValue({ data: mockData, success: true });
      
      const { result } = renderHook(() => useAPI(mockQueryFn, { enabled: false }));
      
      await act(async () => {
        await result.current.refetch();
      });
      
      expect(result.current.data).toEqual(mockData);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Network error');
      const mockQueryFn = vi.fn().mockRejectedValue(mockError);
      
      const { result } = renderHook(() => useAPI(mockQueryFn));
      
      await act(async () => {
        await result.current.refetch();
      });
      
      expect(result.current.data).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toEqual({
        message: 'Network error',
        code: 'API_ERROR',
        status: 500
      });
    });
  });

  describe('Options handling', () => {
    it('should respect enabled option', async () => {
      const mockQueryFn = vi.fn().mockResolvedValue({ data: 'test', success: true });
      
      const { result } = renderHook(() => 
        useAPI(mockQueryFn, { enabled: false })
      );
      
      await act(async () => {
        await result.current.refetch();
      });
      
      expect(mockQueryFn).not.toHaveBeenCalled();
      expect(result.current.data).toBe(null);
    });

    it('should call onSuccess callback when request succeeds', async () => {
      const mockData = { id: 1 };
      const mockQueryFn = vi.fn().mockResolvedValue({ data: mockData, success: true });
      const onSuccess = vi.fn();
      
      const { result } = renderHook(() => 
        useAPI(mockQueryFn, { onSuccess })
      );
      
      await act(async () => {
        await result.current.refetch();
      });
      
      expect(onSuccess).toHaveBeenCalledWith(mockData);
    });

    it('should call onError callback when request fails', async () => {
      const mockError = new Error('API Error');
      const mockQueryFn = vi.fn().mockRejectedValue(mockError);
      const onError = vi.fn();
      const apiError = { message: 'API Error', code: 'API_ERROR', status: 500 };
      
      vi.mocked(APIError.fromError).mockReturnValue(apiError);
      
      const { result } = renderHook(() => 
        useAPI(mockQueryFn, { onError })
      );
      
      await act(async () => {
        await result.current.refetch();
      });
      
      expect(onError).toHaveBeenCalledWith(apiError);
    });
  });

  describe('Loading states', () => {
    it('should set loading state during request', async () => {
      const mockQueryFn = vi.fn().mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({ data: 'test', success: true }), 100)
        )
      );
      
      const { result } = renderHook(() => useAPI(mockQueryFn));
      
      act(() => {
        result.current.refetch();
      });
      
      // Should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBe(null);
      expect(result.current.error).toBe(null);
      
      // Wait for completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.data).toBe('test');
    });
  });

  describe('Refetch functionality', () => {
    it('should allow multiple refetch calls', async () => {
      const mockQueryFn = vi.fn()
        .mockResolvedValueOnce({ data: 'first', success: true })
        .mockResolvedValueOnce({ data: 'second', success: true });
      
      const { result } = renderHook(() => useAPI(mockQueryFn, { enabled: false }));
      
      // First fetch
      await act(async () => {
        await result.current.refetch();
      });
      expect(result.current.data).toBe('first');
      
      // Second fetch
      await act(async () => {
        await result.current.refetch();
      });
      expect(result.current.data).toBe('second');
      
      expect(mockQueryFn).toHaveBeenCalledTimes(2);
    });

    it('should handle refetch during loading', async () => {
      let resolveFirst: (value: any) => void;
      const mockQueryFn = vi.fn().mockImplementation(() => 
        new Promise(resolve => {
          resolveFirst = resolve;
        })
      );
      
      const { result } = renderHook(() => useAPI(mockQueryFn, { enabled: false }));
      
      // Start first request
      act(() => {
        result.current.refetch();
      });
      
      expect(result.current.isLoading).toBe(true);
      
      // Start second request while first is loading
      const secondPromise = act(async () => {
        await result.current.refetch();
      });
      
      // Resolve first request
      await act(async () => {
        resolveFirst!({ data: 'first', success: true });
      });
      
      await secondPromise;
      
      expect(mockQueryFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data persistence', () => {
    it('should maintain previous data on error', async () => {
      const mockQueryFn = vi.fn()
        .mockResolvedValueOnce({ data: 'initial', success: true })
        .mockRejectedValueOnce(new Error('Network error'));
      
      const { result } = renderHook(() => useAPI(mockQueryFn));
      
      // Successful first fetch
      await act(async () => {
        await result.current.refetch();
      });
      expect(result.current.data).toBe('initial');
      
      // Failed second fetch
      await act(async () => {
        await result.current.refetch();
      });
      
      expect(result.current.data).toBe('initial'); // Should maintain previous data
      expect(result.current.error).not.toBe(null);
    });

    it('should update data on successful refetch', async () => {
      const mockQueryFn = vi.fn()
        .mockResolvedValueOnce({ data: 'old', success: true })
        .mockResolvedValueOnce({ data: 'new', success: true });
      
      const { result } = renderHook(() => useAPI(mockQueryFn, { enabled: false }));
      
      // First fetch
      await act(async () => {
        await result.current.refetch();
      });
      expect(result.current.data).toBe('old');
      
      // Refetch with new data
      await act(async () => {
        await result.current.refetch();
      });
      expect(result.current.data).toBe('new');
    });
  });

  describe('Edge cases', () => {
    it('should handle query function throwing non-Error objects', async () => {
      const mockQueryFn = vi.fn().mockRejectedValue('String error');
      
      const { result } = renderHook(() => useAPI(mockQueryFn, { enabled: false }));
      
      await act(async () => {
        await result.current.refetch();
      });
      
      expect(result.current.error).toEqual({
        message: 'API Error',
        code: 'API_ERROR',
        status: 500
      });
    });

    it('should handle query function returning null data', async () => {
      const mockQueryFn = vi.fn().mockResolvedValue({ data: null, success: true });
      
      const { result } = renderHook(() => useAPI(mockQueryFn, { enabled: false }));
      
      await act(async () => {
        await result.current.refetch();
      });
      
      expect(result.current.data).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('should handle query function returning undefined data', async () => {
      const mockQueryFn = vi.fn().mockResolvedValue({ data: undefined, success: true });
      
      const { result } = renderHook(() => useAPI(mockQueryFn, { enabled: false }));
      
      await act(async () => {
        await result.current.refetch();
      });
      
      expect(result.current.data).toBe(undefined);
      expect(result.current.error).toBe(null);
    });
  });

  describe('Type safety', () => {
    it('should work with generic types', async () => {
      interface TestData {
        id: number;
        name: string;
      }
      
      const mockData: TestData = { id: 1, name: 'Test' };
      const mockQueryFn = vi.fn().mockResolvedValue({ data: mockData, success: true });
      
      const { result } = renderHook(() => useAPI<TestData>(mockQueryFn, { enabled: false }));
      
      await act(async () => {
        await result.current.refetch();
      });
      
      // TypeScript should infer the correct type
      expect(result.current.data?.id).toBe(1);
      expect(result.current.data?.name).toBe('Test');
    });
  });
});
