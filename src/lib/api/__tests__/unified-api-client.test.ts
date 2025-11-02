/**
 * Unified API Client 테스트
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UnifiedAPIClient, adminAPI } from '../unified-api-client';

// Mock fetch globally
global.fetch = vi.fn();

describe('UnifiedAPIClient', () => {
  let client: UnifiedAPIClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = UnifiedAPIClient.getInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic HTTP Methods', () => {
    it('should make GET request correctly', async () => {
      const mockData = { id: 1, name: 'Test' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await client.get('/test');

      expect(result).toEqual({
        success: true,
        data: mockData,
        error: null,
      });
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should make POST request with body', async () => {
      const payload = { name: 'New Item' };
      const mockResponse = { id: 2, ...payload };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await client.post('/test', payload);

      expect(result).toEqual({
        success: true,
        data: mockResponse,
        error: null,
      });
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        })
      );
    });

    it('should handle errors correctly', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await client.get('/test');

      expect(result).toEqual({
        success: false,
        data: null,
        error: {
          message: 'Network error',
          code: 'NETWORK_ERROR',
        },
      });
    });

    it('should handle HTTP errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Resource not found' }),
      });

      const result = await client.get('/test');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('HTTP_ERROR_404');
    });
  });

  describe('Pagination', () => {
    it('should handle paginated requests', async () => {
      const mockData = {
        items: [{ id: 1 }, { id: 2 }],
        total: 100,
        page: 1,
        pageSize: 10,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await client.paginated('/test', 1, 10);

      expect(result).toEqual({
        success: true,
        data: mockData,
        error: null,
      });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=10'),
        expect.any(Object)
      );
    });
  });

  describe('Admin API Methods', () => {
    it('should call admin approvals endpoint', async () => {
      const mockResponse = { success: true, message: 'Approved' };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await adminAPI.approvals.approveAdult('request-123');

      expect(result).toEqual({
        success: true,
        data: mockResponse,
        error: null,
      });
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/api/admin/approvals/adult',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ requestId: 'request-123' }),
        })
      );
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests', async () => {
      // First call fails, second succeeds
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
          headers: new Headers({ 'content-type': 'application/json' }),
        });

      const result = await client.get('/test', { retry: true, maxRetries: 2 });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry if maxRetries is 0', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Error'));

      const result = await client.get('/test', { retry: false });

      expect(result.success).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache', () => {
    it('should cache GET requests by default', async () => {
      const mockData = { id: 1, cached: false };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      // First call
      const result1 = await client.get('/test');
      // Second call (should use cache)
      const result2 = await client.get('/test');

      expect(result1.data).toEqual(mockData);
      expect(result2.data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only called once due to cache
    });

    it('should not cache POST requests', async () => {
      const mockData = { id: 1 };
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockData,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await client.post('/test', {});
      await client.post('/test', {});

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
        text: async () => 'Not JSON',
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await client.get('/test');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid JSON');
    });

    it('should handle timeout', async () => {
      vi.useFakeTimers();
      
      (global.fetch as any).mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true }), 10000);
        })
      );

      const resultPromise = client.get('/test', { timeout: 1000 });
      
      vi.advanceTimersByTime(1001);
      
      const result = await resultPromise;
      expect(result.success).toBe(false);
      expect(result.error?.code).toContain('TIMEOUT');
      
      vi.useRealTimers();
    });
  });
});
