import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient } from '@/lib/api/unified-api-client';
import { getAuth } from 'firebase/auth';

// Mock dependencies
vi.mock('firebase/auth');
vi.mock('../error-handler', () => ({
  errorHandler: {
    handle: vi.fn((error) => ({
      code: 'ERROR_CODE',
      userMessage: 'Error occurred',
      context: { error },
    })),
  },
}));
vi.mock('../loading-manager', () => ({
  loadingManager: {
    startLoading: vi.fn(() => 'loading-key'),
    stopLoading: vi.fn(),
  },
}));

// Setup fetch mock
global.fetch = vi.fn();

describe('ApiClient', () => {
  let apiClient: ApiClient;
  let mockGetIdToken: any;

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient = ApiClient.getInstance();
    
    // Mock Firebase Auth
    mockGetIdToken = vi.fn().mockResolvedValue('test-token');
    (getAuth as any).mockReturnValue({
      currentUser: {
        getIdToken: mockGetIdToken,
      },
    });

    // Reset fetch mock
    (global.fetch as any).mockReset();
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = ApiClient.getInstance();
      const instance2 = ApiClient.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('request', () => {
    it('should make a GET request successfully', async () => {
      const mockResponse = {
        success: true,
        data: { id: '123', name: 'Test' },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiClient.request('/test-endpoint', {
        method: 'GET',
      });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-endpoint'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should make a POST request with body', async () => {
      const mockResponse = {
        success: true,
        data: { created: true },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const body = { name: 'Test Item', value: 100 };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiClient.request('/test-endpoint', {
        method: 'POST',
        body,
      });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-endpoint'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should include auth token when withAuth is true', async () => {
      const mockResponse = {
        success: true,
        data: {},
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await apiClient.request('/test-endpoint', {
        withAuth: true,
      });

      expect(mockGetIdToken).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('should handle query parameters', async () => {
      const mockResponse = {
        success: true,
        data: [],
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await apiClient.request('/test-endpoint', {
        params: {
          page: 1,
          limit: 10,
          search: 'test query',
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1&limit=10&search=test+query'),
        expect.any(Object)
      );
    });

    it('should handle fetch errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await apiClient.request('/test-endpoint');

      expect(result).toEqual({
        success: false,
        error: expect.objectContaining({
          code: 'ERROR_CODE',
          message: 'Error occurred',
        }),
        timestamp: expect.any(String),
      });
    });

    it('should handle non-ok response', async () => {
      const mockErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => mockErrorResponse,
      });

      const result = await apiClient.request('/test-endpoint');

      // ApiClient uses errorHandler to normalize errors, so we assert against the handler output
      expect(result).toEqual({
        success: false,
        error: expect.objectContaining({
          code: 'ERROR_CODE',
          message: 'Error occurred',
        }),
        timestamp: expect.any(String),
      });
    });

    it('should handle loading state', async () => {
      const mockResponse = {
        success: true,
        data: {},
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { loadingManager } = await import('../loading-manager');
      vi.clearAllMocks(); // Clear previous calls
      
      await apiClient.request('/test-endpoint', {
        loadingKey: 'test-loading',
      });

      // Implementation may pass metadata as 2nd arg
      expect(loadingManager.startLoading).toHaveBeenCalledWith('test-loading', expect.any(Object));
      expect(loadingManager.stopLoading).toHaveBeenCalled();
    });

    it('should handle cache header', async () => {
      const mockResponse = {
        success: true,
        data: {},
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await apiClient.request('/test-endpoint', {
        cache: 'no-cache',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          cache: 'no-cache',
        })
      );
    });
  });

  describe('HTTP method helpers', () => {
    beforeEach(() => {
      const mockResponse = {
        success: true,
        data: { test: true },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
    });

    it('get() should call request with GET method', async () => {
      await apiClient.get('/test');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('post() should call request with POST method', async () => {
      const data = { test: true };
      await apiClient.post('/test', data);
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ 
          method: 'POST',
          body: JSON.stringify(data)
        })
      );
    });

    it('put() should call request with PUT method', async () => {
      const data = { test: true };
      await apiClient.put('/test', data);
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ 
          method: 'PUT',
          body: JSON.stringify(data)
        })
      );
    });

    it('patch() should call request with PATCH method', async () => {
      const data = { test: true };
      await apiClient.patch('/test', data);
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ 
          method: 'PATCH',
          body: JSON.stringify(data)
        })
      );
    });

    it('delete() should call request with DELETE method', async () => {
      await apiClient.delete('/test');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Paginated requests', () => {
    it('should handle paginated response', async () => {
      const mockApiResponse = {
        success: true,
        data: {
          items: [
            { id: '1', name: 'Item 1' },
            { id: '2', name: 'Item 2' },
          ],
          total: 100,
          page: 1,
          pageSize: 10,
          totalPages: 10,
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await apiClient.getPaginated('/test', {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual(mockApiResponse.data);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1&limit=10'),
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('Error scenarios', () => {
    it('should handle no auth user', async () => {
      (getAuth as any).mockReturnValue({
        currentUser: null,
      });

      const result = await apiClient.request('/test', {
        withAuth: true,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ERROR_CODE');
    });

    it('should handle getIdToken failure', async () => {
      mockGetIdToken.mockRejectedValueOnce(new Error('Token error'));

      const result = await apiClient.request('/test', {
        withAuth: true,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ERROR_CODE');
    });

    it('should handle non-JSON response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Not JSON');
        },
      });

      const result = await apiClient.request('/test');

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(500);
    });
  });
});
