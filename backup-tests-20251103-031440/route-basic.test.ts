/**
 * Adult Approval API Route 기본 테스트
 * DI 시스템 없이 직접 Mock으로 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  auth: () => ({
    getUser: vi.fn().mockResolvedValue({
      uid: 'admin-123',
      email: 'admin@example.com',
      role: 'CLUB_OWNER'
    })
  }),
  firestore: () => ({
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({ status: 'pending' })
    }),
    update: vi.fn().mockResolvedValue(undefined),
    runTransaction: vi.fn((callback) => callback({
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({ 
          requestData: { name: '홍길동' },
          requestedBy: 'user-123'
        })
      }),
      set: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
    }))
  })
}));

// Mock API helpers
vi.mock('@/lib/di/api-helpers', () => ({
  withClubStaffApiHandler: vi.fn((handler) => handler),
  parseRequestBody: vi.fn((request) => {
    const url = request.url || '';
    const parts = url.split('/');
    const requestId = parts[parts.length - 1];
    return Promise.resolve({ requestId });
  }),
  createApiResponse: vi.fn((data) => ({
    success: true,
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

describe('/api/admin/approvals/adult route (Basic)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should import route successfully', async () => {
    const routeModule = await import('../route');
    expect(routeModule.POST).toBeDefined();
    expect(typeof routeModule.POST).toBe('function');
  });

  it('should handle valid request structure', async () => {
    const mockRequest = {
      url: 'https://example.com/api/admin/approvals/adult/request-456',
      method: 'POST',
      json: async () => ({}),
      headers: {
        get: vi.fn()
      }
    };

    const { POST } = await import('../route');
    const result = await POST(mockRequest);
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should call member service with correct parameters', async () => {
    const mockRequest = {
      url: 'https://example.com/api/admin/approvals/adult/request-456',
      method: 'POST',
      json: async () => ({}),
      headers: {
        get: vi.fn()
      }
    };

    const { apiServices } = await import('@/lib/di/api-helpers');
    const { POST } = await import('../route');
    
    await POST(mockRequest);
    
    expect(apiServices.members.approveAdultRegistration).toHaveBeenCalledWith(
      'request-456',
      expect.objectContaining({
        approvedBy: expect.any(String),
        performedBy: expect.any(String),
        performerRole: expect.any(String),
        clubId: expect.any(String)
      })
    );
  });
});
