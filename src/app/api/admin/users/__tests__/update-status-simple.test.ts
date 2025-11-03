import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../update-status/route';

// Mock API Services with factory function
vi.mock('@/lib/di/global-di', () => ({
  apiServices: {
    audit: {
      logAuditEvent: vi.fn(),
    },
    users: {
      updateStatus: vi.fn(),
    },
  },
}));

// Mock API helpers
vi.mock('@/lib/di/api-helpers', () => ({
  withAdminApiHandler: vi.fn((handler) => {
    return async (request: NextRequest) => {
      // Mock authenticated admin user
      const mockUser = {
        uid: 'admin-uid',
        email: 'admin@example.com',
        role: 'SUPER_ADMIN',
      };
      
      try {
        const body = await request.json();
        const response = await handler(request, { user: mockUser });
        return response;
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    };
  }),
  parseRequestBody: vi.fn((request) => request.json()),
  createApiResponse: vi.fn((data) => {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
  logApiRequest: vi.fn(),
  logAuditEvent: vi.fn(),
  ApiError: class extends Error {
    constructor(message: string, public statusCode: number) {
      super(message);
    }
  },
}));

// Mock user data
const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'MEMBER',
  status: 'active',
};

describe('Update Status API Simple Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should update user status successfully', async () => {
    const { apiServices } = await import('@/lib/di/global-di');
    
    // Mock successful status update
    apiServices.users.updateStatus.mockResolvedValue({
      previousStatus: 'active',
    });

    const request = new NextRequest('http://localhost/api/admin/users/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'test-uid',
        status: 'inactive',
        reason: 'User requested deactivation',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.status).toBe('inactive');
    expect(apiServices.users.updateStatus).toHaveBeenCalledWith(
      'test-uid',
      'inactive',
      {
        performedBy: 'admin-uid',
        reason: 'User requested deactivation',
      }
    );
  });

  it('should handle missing required fields', async () => {
    const request = new NextRequest('http://localhost/api/admin/users/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Missing userId and status
        reason: 'Test reason',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('User ID와 status는 필수입니다');
  });

  it('should handle invalid status value', async () => {
    const request = new NextRequest('http://localhost/api/admin/users/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'test-uid',
        status: 'invalid-status',
        reason: 'Test reason',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('status는 pending, active, inactive 중 하나여야 합니다');
  });

  it('should handle service errors', async () => {
    const { apiServices } = await import('@/lib/di/global-di');
    
    // Mock service error
    apiServices.users.updateStatus.mockRejectedValue(
      new Error('Service unavailable')
    );

    const request = new NextRequest('http://localhost/api/admin/users/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'test-uid',
        status: 'inactive',
        reason: 'Test reason',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Service unavailable');
  });

  it('should handle invalid JSON', async () => {
    const request = new NextRequest('http://localhost/api/admin/users/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: 'invalid-json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Unexpected token');
  });
});
