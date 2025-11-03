/**
 * Adult Approval API Route 최소 테스트
 * 기본적인 import와 함수 호출만 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

describe('/api/admin/approvals/adult route (Minimal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should import and export POST function', async () => {
    const routeModule = await import('../route');
    expect(routeModule.POST).toBeDefined();
    expect(typeof routeModule.POST).toBe('function');
  });

  it('should be callable without throwing', async () => {
    const { POST } = await import('../route');
    const mockRequest = {
      url: 'https://example.com/api/admin/approvals/adult/test-123',
      method: 'POST',
      json: async () => ({}),
      headers: { get: vi.fn() }
    };

    // 단순히 호출만 가능한지 테스트
    await expect(POST(mockRequest)).resolves.toBeDefined();
  });

  it('should return a response with expected structure', async () => {
    const { POST } = await import('../route');
    const mockRequest = {
      url: 'https://example.com/api/admin/approvals/adult/test-123',
      method: 'POST',
      json: async () => ({}),
      headers: { get: vi.fn() }
    };

    const response = await POST(mockRequest);
    
    // 응답이 객체인지 확인
    expect(typeof response).toBe('object');
    expect(response).not.toBeNull();
  });
});
