import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiClient } from '../api-client';
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

// Mock DOM methods for download tests
global.document.createElement = vi.fn();
global.document.body.appendChild = vi.fn();
global.document.body.removeChild = vi.fn();
global.window.URL.createObjectURL = vi.fn(() => 'blob:test-url');
global.window.URL.revokeObjectURL = vi.fn();

describe('ApiClient Extended Tests', () => {
  let apiClient: ApiClient;
  let mockGetIdToken: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a new instance for each test
    (ApiClient as any).instance = null;
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('File Upload', () => {
    it('should upload file successfully', async () => {
      const mockResponse = {
        success: true,
        data: { url: 'https://example.com/file.jpg' }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const result = await apiClient.upload('/upload', mockFile, { userId: '123' });

      expect(result).toEqual(mockResponse.data);
      
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain('/upload');
      expect(fetchCall[1].method).toBe('POST');
      expect(fetchCall[1].body).toBeInstanceOf(FormData);
    });

    it('should handle upload without additional data', async () => {
      const mockResponse = {
        success: true,
        data: { url: 'https://example.com/file.jpg' }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const result = await apiClient.upload('/upload', mockFile);

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle upload with blob additional data', async () => {
      const mockResponse = {
        success: true,
        data: { url: 'https://example.com/file.jpg' }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const mockBlob = new Blob(['blob content'], { type: 'text/plain' });
      
      await apiClient.upload('/upload', mockFile, { 
        userId: '123',
        thumbnail: mockBlob,
        description: 'Test file' 
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].body).toBeInstanceOf(FormData);
    });

    it('should handle upload failure', async () => {
      const mockErrorResponse = {
        success: false,
        error: { message: 'Upload failed' }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => mockErrorResponse,
      });

      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      await expect(apiClient.upload('/upload', mockFile)).rejects.toThrow('Upload failed');
    });

    it('should not include auth token when withAuth is false', async () => {
      const mockResponse = {
        success: true,
        data: { url: 'https://example.com/file.jpg' }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      await apiClient.upload('/upload', mockFile, {}, { withAuth: false });

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers.Authorization).toBeUndefined();
    });
  });

  describe('File Download', () => {
    it('should download file successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['test content']),
      });

      const mockElement = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      (global.document.createElement as any).mockReturnValue(mockElement);

      await apiClient.download('/download/file.pdf', 'custom-name.pdf');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/download/file.pdf'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );

      expect(mockElement.download).toBe('custom-name.pdf');
      expect(mockElement.click).toHaveBeenCalled();
      expect(global.document.body.appendChild).toHaveBeenCalled();
      expect(global.document.body.removeChild).toHaveBeenCalled();
      expect(global.window.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should use default filename if not provided', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['test content']),
      });

      const mockElement = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      (global.document.createElement as any).mockReturnValue(mockElement);

      await apiClient.download('/download/file');

      expect(mockElement.download).toBe('download');
    });

    it('should handle download without auth token', async () => {
      (getAuth as any).mockReturnValue({
        currentUser: null,
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['test content']),
      });

      const mockElement = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      (global.document.createElement as any).mockReturnValue(mockElement);

      await apiClient.download('/download/file');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers.Authorization).toBeUndefined();
    });

    it('should handle download failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      await expect(apiClient.download('/download/file')).rejects.toThrow('파일 다운로드 실패');
    });
  });

  describe('Header Management', () => {
    it('should set default header', async () => {
      apiClient.setDefaultHeader('X-Custom-Header', 'custom-value');

      const mockResponse = {
        success: true,
        data: {},
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await apiClient.request('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });

    it('should remove default header', async () => {
      apiClient.setDefaultHeader('X-Custom-Header', 'custom-value');
      apiClient.removeDefaultHeader('X-Custom-Header');

      const mockResponse = {
        success: true,
        data: {},
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await apiClient.request('/test');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers['X-Custom-Header']).toBeUndefined();
    });

    it('should override default header with request header', async () => {
      apiClient.setDefaultHeader('X-Custom-Header', 'default-value');

      const mockResponse = {
        success: true,
        data: {},
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await apiClient.request('/test', {
        headers: {
          'X-Custom-Header': 'override-value',
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'override-value',
          }),
        })
      );
    });
  });

  describe('Base URL Management', () => {
    it('should use custom base URL', async () => {
      apiClient.setBaseUrl('https://api.example.com');

      const mockResponse = {
        success: true,
        data: {},
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await apiClient.request('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.any(Object)
      );
    });

    it('should change base URL dynamically', async () => {
      const mockResponse = {
        success: true,
        data: {},
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      // First request with default URL
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await apiClient.request('/test1');
      
      const firstCall = (global.fetch as any).mock.calls[0];
      expect(firstCall[0]).toContain('/api/test1');

      // Change base URL
      apiClient.setBaseUrl('https://new-api.example.com');

      // Second request with new URL
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await apiClient.request('/test2');
      
      const secondCall = (global.fetch as any).mock.calls[1];
      expect(secondCall[0]).toBe('https://new-api.example.com/test2');
    });
  });

  describe('Complex Query Parameters', () => {
    it('should handle array parameters', async () => {
      const mockResponse = {
        success: true,
        data: [],
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await apiClient.request('/test', {
        params: {
          ids: ['1', '2', '3'],
          tags: ['tag1', 'tag2'],
          single: 'value'
        },
      });

      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).toContain('ids=1&ids=2&ids=3');
      expect(fetchCall).toContain('tags=tag1&tags=tag2');
      expect(fetchCall).toContain('single=value');
    });

    it('should skip undefined and null parameters', async () => {
      const mockResponse = {
        success: true,
        data: [],
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await apiClient.request('/test', {
        params: {
          defined: 'value',
          undefined: undefined,
          null: null,
          zero: 0,
          false: false,
          empty: '',
        },
      });

      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).toContain('defined=value');
      expect(fetchCall).toContain('zero=0');
      expect(fetchCall).toContain('false=false');
      expect(fetchCall).toContain('empty=');
      expect(fetchCall).not.toContain('undefined');
      expect(fetchCall).not.toContain('null');
    });

    it('should handle array with null/undefined values', async () => {
      const mockResponse = {
        success: true,
        data: [],
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await apiClient.request('/test', {
        params: {
          mixed: ['valid', undefined, null, 'another', 0],
        },
      });

      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).toContain('mixed=valid');
      expect(fetchCall).toContain('mixed=another');
      expect(fetchCall).toContain('mixed=0');
      // undefined and null should be skipped
      const mixedCount = (fetchCall.match(/mixed=/g) || []).length;
      expect(mixedCount).toBe(3); // Only valid, another, and 0
    });
  });

  describe('Error Response Handling', () => {
    it('should handle API error with details', async () => {
      const mockErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: {
            fields: ['email', 'password']
          }
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockErrorResponse,
      });

      const result = await apiClient.request('/test');

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(400);
    });

    it('should handle network timeout', async () => {
      (global.fetch as any).mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100);
        })
      );

      const result = await apiClient.request('/test');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Error occurred');
    });

    it('should handle non-success response with success=false', async () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'BUSINESS_ERROR',
          message: 'Business logic error'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true, // HTTP 200
        json: async () => mockResponse,
      });

      const result = await apiClient.request('/test');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ERROR_CODE'); // From error handler mock
    });
  });

  describe('HTTP Method Error Handling', () => {
    it('should throw error for failed GET request', async () => {
      const mockResponse = {
        success: false,
        error: { message: 'Not found' }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => mockResponse,
      });

      await expect(apiClient.get('/test')).rejects.toThrow();
    });

    it('should throw error for failed POST request', async () => {
      const mockResponse = {
        success: false,
        error: { message: 'Bad request' }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => mockResponse,
      });

      await expect(apiClient.post('/test', {})).rejects.toThrow();
    });

    it('should throw error for failed PUT request', async () => {
      const mockResponse = {
        success: false,
        error: { message: 'Conflict' }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => mockResponse,
      });

      await expect(apiClient.put('/test', {})).rejects.toThrow();
    });

    it('should throw error for failed DELETE request', async () => {
      const mockResponse = {
        success: false,
        error: { message: 'Forbidden' }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => mockResponse,
      });

      await expect(apiClient.delete('/test')).rejects.toThrow();
    });

    it('should throw error for failed PATCH request', async () => {
      const mockResponse = {
        success: false,
        error: { message: 'Unprocessable entity' }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => mockResponse,
      });

      await expect(apiClient.patch('/test', {})).rejects.toThrow();
    });
  });

  describe('Auth Token Edge Cases', () => {
    it('should handle expired token refresh', async () => {
      let tokenCallCount = 0;
      mockGetIdToken.mockImplementation(() => {
        tokenCallCount++;
        return Promise.resolve(`test-token-${tokenCallCount}`);
      });

      const mockResponse = {
        success: true,
        data: {},
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      // First request
      await apiClient.request('/test1', { withAuth: true });
      expect(mockGetIdToken).toHaveBeenCalledTimes(1);
      
      // Second request should get a new token
      await apiClient.request('/test2', { withAuth: true });
      expect(mockGetIdToken).toHaveBeenCalledTimes(2);

      const firstCall = (global.fetch as any).mock.calls[0];
      const secondCall = (global.fetch as any).mock.calls[1];
      
      expect(firstCall[1].headers.Authorization).toBe('Bearer test-token-1');
      expect(secondCall[1].headers.Authorization).toBe('Bearer test-token-2');
    });

    it('should skip auth for public endpoints', async () => {
      const mockResponse = {
        success: true,
        data: {},
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await apiClient.request('/public/endpoint', { withAuth: false });

      expect(mockGetIdToken).not.toHaveBeenCalled();
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers.Authorization).toBeUndefined();
    });
  });
});
