/**
 * Adult Approval API Route 간단 통합 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Next.js internals
vi.mock('next/server', () => ({
  NextRequest: class MockRequest {
    constructor(url: string, init?: any) {
      this.url = url;
      this.method = init?.method || 'GET';
      this.headers = new Map(Object.entries(init?.headers || {}));
    }
    url: string;
    method: string;
    headers: Map<string, string>;
    json: () => Promise<any>;
  },
  NextResponse: {
    json: (data: any, init?: any) => ({
      ...data,
      status: init?.status || 200,
      headers: new Headers(init?.headers)
    })
  }
}));

// Mock DI helpers
vi.mock('@/lib/di/api-helpers', () => ({
  withClubStaffApiHandler: vi.fn((handler) => async (request: any) => {
    // Mock admin user
    const mockUser = { uid: 'admin-123', role: 'CLUB_OWNER', clubId: 'club-456' };
    return handler(request, { user: mockUser });
  }),
  parseRequestBody: vi.fn((request) => {
    // URL에서 requestId 추출
    const urlParts = request.url.split('/');
    const requestId = urlParts[urlParts.length - 1];
    return Promise.resolve({ requestId });
  }),
  createApiResponse: vi.fn((data) => data),
  logApiRequest: vi.fn(),
  logAuditEvent: vi.fn(),
  ApiError: class MockError extends Error {
    constructor(message: string, public statusCode: number) {
      super(message);
    }
  },
  apiServices: {
    members: {
      approveAdultRegistration: vi.fn().mockResolvedValue({
        memberId: 'member-789',
        userId: 'user-123',
        requestData: { requestId: 'request-456' }
      })
    }
  }
}));

describe('/api/admin/approvals/adult route (Simple)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('approves adult registration successfully', async () => {
    // Mock request
    const mockRequest = {
      url: 'https://example.com/api/admin/approvals/adult/request-456',
      method: 'POST',
      json: async () => ({}),
      headers: new Map()
    };

    // Import route after mocks are set up
    const { POST } = await import('../route');
    const response = await POST(mockRequest);
    
    expect(response.success).toBe(true);
    expect(response.memberId).toBe('member-789');
    expect(response.requestId).toBe('request-456');
  });

  it('handles missing request ID', async () => {
    // Mock request with empty URL
    const mockRequest = {
      url: 'https://example.com/api/admin/approvals/adult/',
      method: 'POST',
      json: async () => ({}),
      headers: new Map()
    };

    const { POST } = await import('../route');
    
    // Should throw error for missing request ID
    await expect(POST(mockRequest)).rejects.toThrow();
  });
});
