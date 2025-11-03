/**
 * Adult Approval API Route 완전한 테스트
 * 모든 의존성을 mock하고 성공 시나리오 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('/api/admin/approvals/adult route (Complete)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should test successful adult approval flow', async () => {
    // Mock user
    const mockUser = {
      uid: 'admin-123',
      email: 'admin@example.com',
      role: 'CLUB_OWNER',
      clubId: 'club-456'
    };

    // Mock request
    const mockRequest = {
      url: 'https://example.com/api/admin/approvals/adult/request-456',
      method: 'POST',
      json: async () => ({}),
      headers: { get: vi.fn() }
    };

    // Complete mock setup
    vi.doMock('@/lib/di/api-helpers', () => ({
      withClubStaffApiHandler: vi.fn((handler) => {
        return async (request: any) => {
          const context = { user: mockUser };
          return await handler(request, context);
        };
      }),
      parseRequestBody: vi.fn((request) => {
        const url = request.url || '';
        const parts = url.split('/');
        const requestId = parts[parts.length - 1];
        return Promise.resolve({ requestId });
      }),
      createApiResponse: vi.fn((data) => ({
        success: true,
        message: 'Adult registration approved successfully',
        ...data
      })),
      logApiRequest: vi.fn(),
      logAuditEvent: vi.fn(),
      ApiError: class extends Error {
        constructor(message: string, public statusCode: number) {
          super(message);
        }
      },
      apiServices: {
        members: {
          approveAdultRegistration: vi.fn().mockResolvedValue({
            memberId: 'member-789',
            userId: 'user-123',
            requestData: { name: '홍길동' }
          })
        }
      }
    }));

    // Reset modules and import
    vi.resetModules();
    const { POST } = await import('../route');
    const { parseRequestBody, apiServices, createApiResponse, logApiRequest, logAuditEvent } = await import('@/lib/di/api-helpers');

    // Execute POST (returns handler function)
    const handlerFunction = await POST(mockRequest);
    
    // Verify handler is function
    expect(typeof handlerFunction).toBe('function');
    
    // Execute handler with request
    const result = await handlerFunction(mockRequest);

    // Verify result structure
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toBe('Adult registration approved successfully');
    expect(result.memberId).toBe('member-789');
    expect(result.userId).toBe('user-123');
    expect(result.requestId).toBe('request-456');

    // Verify all functions were called
    expect(parseRequestBody).toHaveBeenCalledWith(mockRequest);
    expect(apiServices.members.approveAdultRegistration).toHaveBeenCalledWith(
      'request-456',
      {
        approvedBy: 'admin-123',
        performedBy: 'admin-123',
        performerRole: 'CLUB_OWNER',
        clubId: 'club-456'
      }
    );
    expect(createApiResponse).toHaveBeenCalledWith({
      success: true,
      message: 'Adult registration approved successfully',
      requestId: 'request-456',
      memberId: 'member-789',
      userId: 'user-123'
    });
    expect(logApiRequest).toHaveBeenCalledWith(mockRequest, mockUser, 'APPROVE_ADULT_REGISTRATION');
    expect(logAuditEvent).toHaveBeenCalledWith(
      mockUser,
      'ADULT_REGISTRATION_APPROVED',
      'request-456',
      {
        memberId: 'member-789',
        userId: 'user-123',
        requestData: { name: '홍길동' }
      }
    );
  });

  it('should handle missing request ID error', async () => {
    const mockUser = {
      uid: 'admin-123',
      email: 'admin@example.com',
      role: 'CLUB_OWNER',
      clubId: 'club-456'
    };

    const mockRequest = {
      url: 'https://example.com/api/admin/approvals/adult/',
      method: 'POST',
      json: async () => ({}),
      headers: { get: vi.fn() }
    };

    vi.doMock('@/lib/di/api-helpers', () => ({
      withClubStaffApiHandler: vi.fn((handler) => {
        return async (request: any) => {
          const context = { user: mockUser };
          try {
            return await handler(request, context);
          } catch (error) {
            if (error.constructor.name === 'ApiError') {
              return {
                error: {
                  message: error.message,
                  code: error.statusCode
                }
              };
            }
            throw error;
          }
        };
      }),
      parseRequestBody: vi.fn(() => Promise.resolve({ requestId: '' })), // Empty requestId
      createApiResponse: vi.fn((data) => data),
      logApiRequest: vi.fn(),
      logAuditEvent: vi.fn(),
      ApiError: class extends Error {
        constructor(message: string, public statusCode: number) {
          super(message);
          this.name = 'ApiError';
        }
      },
      apiServices: {
        members: {
          approveAdultRegistration: vi.fn()
        }
      }
    }));

    vi.resetModules();
    const { POST } = await import('../route');

    const handlerFunction = await POST(mockRequest);
    const result = await handlerFunction(mockRequest);

    expect(result.error).toBeDefined();
    expect(result.error.message).toBe('Request ID는 필수입니다');
    expect(result.error.code).toBe(400);
  });

  it('should handle API service errors', async () => {
    const mockUser = {
      uid: 'admin-123',
      email: 'admin@example.com',
      role: 'CLUB_OWNER',
      clubId: 'club-456'
    };

    const mockRequest = {
      url: 'https://example.com/api/admin/approvals/adult/request-456',
      method: 'POST',
      json: async () => ({}),
      headers: { get: vi.fn() }
    };

    vi.doMock('@/lib/di/api-helpers', () => ({
      withClubStaffApiHandler: vi.fn((handler) => {
        return async (request: any) => {
          const context = { user: mockUser };
          try {
            return await handler(request, context);
          } catch (error) {
            return {
              error: {
                message: error.message,
                code: 500
              }
            };
          }
        };
      }),
      parseRequestBody: vi.fn(() => Promise.resolve({ requestId: 'request-456' })),
      createApiResponse: vi.fn((data) => data),
      logApiRequest: vi.fn(),
      logAuditEvent: vi.fn(),
      ApiError: class extends Error {
        constructor(message: string, public statusCode: number) {
          super(message);
        }
      },
      apiServices: {
        members: {
          approveAdultRegistration: vi.fn().mockRejectedValue(
            new Error('Service unavailable')
          )
        }
      }
    }));

    vi.resetModules();
    const { POST } = await import('../route');

    const handlerFunction = await POST(mockRequest);
    const result = await handlerFunction(mockRequest);

    expect(result.error).toBeDefined();
    expect(result.error.message).toBe('Service unavailable');
  });
});
