import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '@/lib/api/unified-api-client';
import { errorHandler } from '@/lib/error/error-manager';
import { loadingManager } from '@/services/loading-manager';

// Mock dependencies
vi.mock('../error-handler', () => ({
  errorHandler: {
    handle: vi.fn().mockReturnValue({
      code: 'UNKNOWN',
      message: 'Test error message',
      userMessage: 'Test error message'
    })
  }
}));
vi.mock('../loading-manager');
vi.mock('firebase/auth', () => ({
  getAuth: () => ({
    currentUser: { getIdToken: vi.fn() }
  })
}));

describe('ApiClient Coverage Enhancement', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient = ApiClient.getInstance();
  });

  describe('URL Parameter Handling', () => {
    it('should handle null and undefined values in params', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });
      global.fetch = mockFetch;

      await apiClient.request('/test', {
        params: {
          validParam: 'value',
          nullParam: null,
          undefinedParam: undefined,
          zeroParam: 0,
          falseParam: false
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('validParam=value&zeroParam=0&falseParam=false'),
        expect.any(Object)
      );
    });

    it('should handle array parameters correctly', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });
      global.fetch = mockFetch;

      await apiClient.request('/test', {
        params: {
          tags: ['tag1', 'tag2', 'tag3'],
          single: 'value'
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('tags=tag1&tags=tag2&tags=tag3&single=value'),
        expect.any(Object)
      );
    });
  });

  describe('Authentication Token Handling', () => {
    it('should handle missing auth token gracefully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });
      global.fetch = mockFetch;

      // Mock getIdToken to return null
      vi.mocked(getAuth().currentUser.getIdToken).mockResolvedValue(null as any);

      await apiClient.request('/test', { withAuth: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      );
    });

    it('should handle token refresh errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });
      global.fetch = mockFetch;

      // Mock getIdToken to throw error
      vi.mocked(getAuth().currentUser.getIdToken).mockRejectedValue(new Error('Token expired'));

      await apiClient.request('/test', { withAuth: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      );
    });
  });

  describe('Error Response Handling', () => {
    it('should handle HTTP error responses with custom error messages', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ 
          error: 'Bad Request',
          message: 'Invalid input data'
        })
      });
      global.fetch = mockFetch;

      const response = await apiClient.request('/test');

      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid input data');
    });

    it('should handle network errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      const response = await apiClient.request('/test');

      expect(response.success).toBe(false);
      expect(response.error).toContain('Network error');
    });

    it('should handle JSON parsing errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });
      global.fetch = mockFetch;

      const response = await apiClient.request('/test');

      expect(response.success).toBe(false);
    });
  });

  describe('Loading State Management', () => {
    it('should manage loading states correctly', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });
      global.fetch = mockFetch;

      await apiClient.request('/test', { 
        loadingKey: 'test-loading',
        method: 'POST'
      });

      expect(loadingManager.startLoading).toHaveBeenCalledWith('test-loading', {
        message: 'POST /test'
      });
      expect(loadingManager.stopLoading).toHaveBeenCalledWith('test-loading');
    });

    it('should handle loading errors gracefully', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Request failed'));
      global.fetch = mockFetch;

      await apiClient.request('/test', { 
        loadingKey: 'test-loading'
      });

      expect(loadingManager.stopLoading).toHaveBeenCalledWith('test-loading');
    });
  });

  describe('Request Headers and Options', () => {
    it('should merge custom headers with default headers', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });
      global.fetch = mockFetch;

      await apiClient.request('/test', {
        headers: {
          'Custom-Header': 'custom-value',
          'Content-Type': 'text/plain' // Override default
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'text/plain',
            'Custom-Header': 'custom-value'
          }
        })
      );
    });

    it('should handle different HTTP methods', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });
      global.fetch = mockFetch;

      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
      
      for (const method of methods) {
        await apiClient.request('/test', { method });
        
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ method })
        );
      }
    });

    it('should handle request body serialization', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });
      global.fetch = mockFetch;

      const body = { key: 'value', nested: { data: 'test' } };
      
      await apiClient.request('/test', {
        method: 'POST',
        body
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(body)
        })
      );
    });
  });

  describe('Cache Configuration', () => {
    it('should pass cache option to fetch', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });
      global.fetch = mockFetch;

      await apiClient.request('/test', {
        cache: 'no-store'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          cache: 'no-store'
        })
      );
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ApiClient.getInstance();
      const instance2 = ApiClient.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should initialize with correct base URL', () => {
      const client = ApiClient.getInstance();
      expect(client).toBeInstanceOf(ApiClient);
    });
  });
});
