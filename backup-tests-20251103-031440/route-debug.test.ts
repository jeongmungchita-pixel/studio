/**
 * Adult Approval API Route 디버그 테스트
 * 실제 반환 값을 확인하고 문제 분석
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('/api/admin/approvals/adult route (Debug)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should debug actual return value', async () => {
    // 모든 의존성 mock
    vi.mock('@/lib/di/api-helpers', () => ({
      withClubStaffApiHandler: vi.fn((handler) => handler),
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

    const result = await POST(mockRequest);
    
    console.log('Result type:', typeof result);
    console.log('Result value:', result);
    console.log('Result constructor:', result?.constructor?.name);
    
    // 실제 값 확인
    expect(result).toBeDefined();
  });

  it('should check if POST returns a function', async () => {
    vi.mock('@/lib/di/api-helpers', () => ({
      withClubStaffApiHandler: vi.fn((handler) => {
        // handler를 그대로 반환하는지 확인
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

    const result = await POST(mockRequest);
    
    console.log('Is function?', typeof result === 'function');
    
    if (typeof result === 'function') {
      // 만약 함수라면 호출해보기
      const innerResult = await result(mockRequest);
      console.log('Inner result:', innerResult);
      console.log('Inner result type:', typeof innerResult);
    }
    
    expect(result).toBeDefined();
  });
});
