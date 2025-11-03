/**
 * Adult Approval API Route Working 테스트
 * 실제 동작 방식에 맞는 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('/api/admin/approvals/adult route (Working)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return async function from POST', async () => {
    // 완전한 mock 설정
    vi.mock('@/lib/di/api-helpers', () => ({
      withClubStaffApiHandler: vi.fn((handler) => {
        // 핸들러 함수를 그대로 반환 (실제 동작)
        return handler;
      }),
      parseRequestBody: vi.fn(() => Promise.resolve({ requestId: 'test-123' })),
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
          approveAdultRegistration: vi.fn().mockResolvedValue({
            memberId: 'member-123',
            userId: 'user-123'
          })
        }
      }
    }));

    const { POST } = await import('../route');
    const mockRequest = {
      url: 'https://example.com/api/admin/approvals/adult/test-123',
      method: 'POST',
      json: async () => ({}),
      headers: { get: vi.fn() }
    };

    // POST는 함수를 반환
    const handlerFunction = await POST(mockRequest);
    expect(typeof handlerFunction).toBe('function');
  });

  it('should call handler function with context', async () => {
    vi.mock('@/lib/di/api-helpers', () => ({
      withClubStaffApiHandler: vi.fn((handler) => {
        // 핸들러를 반환하고, 호출될 때 context를 전달
        return async (request: any) => {
          // Mock context 생성
          const mockContext = {
            user: {
              uid: 'admin-123',
              email: 'admin@example.com',
              role: 'CLUB_OWNER',
              clubId: 'club-456'
            }
          };
          
          // 핸들러 호출
          return await handler(request, mockContext);
        };
      }),
      parseRequestBody: vi.fn(() => Promise.resolve({ requestId: 'test-123' })),
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
          approveAdultRegistration: vi.fn().mockResolvedValue({
            memberId: 'member-123',
            userId: 'user-123'
          })
        }
      }
    }));

    const { POST } = await import('../route');
    const mockRequest = {
      url: 'https://example.com/api/admin/approvals/adult/test-123',
      method: 'POST',
      json: async () => ({}),
      headers: { get: vi.fn() }
    };

    const handlerFunction = await POST(mockRequest);
    const result = await handlerFunction(mockRequest);
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.success).toBe(true);
  });

  it('should test complete flow with proper context', async () => {
    vi.mock('@/lib/di/api-helpers', () => ({
      withClubStaffApiHandler: vi.fn((handler) => {
        // 완전한 시뮬레이션
        return async (request: any) => {
          const mockContext = {
            user: {
              uid: 'admin-123',
              email: 'admin@example.com',
              role: 'CLUB_OWNER',
              clubId: 'club-456'
            }
          };
          
          return await handler(request, mockContext);
        };
      }),
      parseRequestBody: vi.fn((request) => {
        // URL에서 requestId 추출 시뮬레이션
        const url = request.url || '';
        const parts = url.split('/');
        const requestId = parts[parts.length - 1];
        return Promise.resolve({ requestId });
      }),
      createApiResponse: vi.fn((data) => ({
        ...data,
        success: true,
        message: 'Adult registration approved successfully'
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

    const { POST } = await import('../route');
    const { parseRequestBody, apiServices, createApiResponse } = await import('@/lib/di/api-helpers');
    
    const mockRequest = {
      url: 'https://example.com/api/admin/approvals/adult/request-456',
      method: 'POST',
      json: async () => ({}),
      headers: { get: vi.fn() }
    };

    const handlerFunction = await POST(mockRequest);
    const result = await handlerFunction(mockRequest);
    
    // 모든 함수가 호출되었는지 확인
    expect(parseRequestBody).toHaveBeenCalledWith(mockRequest);
    expect(apiServices.members.approveAdultRegistration).toHaveBeenCalledWith(
      'request-456',
      expect.objectContaining({
        approvedBy: 'admin-123',
        performedBy: 'admin-123',
        performerRole: 'CLUB_OWNER',
        clubId: 'club-456'
      })
    );
    expect(createApiResponse).toHaveBeenCalledWith({
      success: true,
      message: 'Adult registration approved successfully',
      requestId: 'request-456',
      memberId: 'member-789',
      userId: 'user-123'
    });
    
    // 최종 결과 확인
    expect(result.success).toBe(true);
    expect(result.memberId).toBe('member-789');
    expect(result.userId).toBe('user-123');
    expect(result.requestId).toBe('request-456');
  });
});
