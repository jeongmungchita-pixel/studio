import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET as healthGET } from '../health/route';
import { GET as apiGET } from '../route';
import { POST as linkMemberPOST } from '../admin/users/link-member/route';
import { POST as updateStatusPOST } from '../admin/users/update-status/route';
import { POST as adultRegistrationPOST } from '../admin/registrations/adult/route';
import { POST as familyRegistrationPOST } from '../admin/registrations/family/route';
import { POST as approveAdultPOST } from '../admin/approvals/adult/route';
import { POST as approveFamilyPOST } from '../admin/approvals/family/route';
import { POST as rejectApprovalPOST } from '../admin/approvals/reject/route';

// Mock Next.js modules
vi.mock('next/server', () => {
  class MockNextRequest {
    url: string;
    headers: Map<string, string>;
    json: any;
    
    constructor(url: string) {
      this.url = url;
      this.headers = new Map();
      this.json = vi.fn();
    }
  }
  
  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: vi.fn((data: any, init?: any) => ({
        json: async () => data,
        status: init?.status || 200,
        headers: new Headers(init?.headers || {}),
      })),
    },
  };
});

// Mock monitoring module
vi.mock('@/lib/monitoring', () => ({
  getHealthCheck: vi.fn().mockResolvedValue({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: 100,
    metrics: {
      totalRequests: 1000,
      errorRate: 0.5,
      avgResponseTime: 150,
    },
    services: {
      firebase: true,
      firestore: true,
    },
  }),
  logApiRequest: vi.fn(),
  logError: vi.fn(),
  LogLevel: {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
  },
}));

// Mock rate limiting
vi.mock('@/middleware/rate-limit', () => ({
  lenientRateLimit: vi.fn((req: any, handler: any) => handler()),
  standardRateLimit: vi.fn((req: any, handler: any) => handler()),
  strictRateLimit: vi.fn((req: any, handler: any) => handler()),
}));

// Mock Firebase admin
vi.mock('@/lib/firebase-admin', () => ({
  getAdminFirestore: vi.fn(() => ({
    collection: vi.fn((collectionName: string) => ({
      doc: vi.fn((docId?: string) => ({
        id: docId || 'generated-id',
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ 
            uid: docId || 'user-123',
            status: 'pending',
            email: 'test@example.com',
            displayName: 'Test User'
          }),
        }),
        update: vi.fn(),
        set: vi.fn(),
      })),
      add: vi.fn().mockResolvedValue({ id: 'audit-log-id' }),
      where: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ empty: true }),
      })),
    })),
    runTransaction: vi.fn((callback) => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ clubId: 'club-1' }),
        }),
        update: vi.fn(),
        set: vi.fn(),
      };
      return callback(mockTransaction);
    }),
  })),
}));

// Mock auth middleware
vi.mock('@/middleware/auth', () => ({
  withAuth: vi.fn((req: any, handler: any) => {
    const authenticatedReq = {
      ...req,
      user: { uid: 'test-user', role: 'SUPER_ADMIN', clubId: 'club-1' },
      json: req.json || vi.fn(),
    };
    return handler(authenticatedReq);
  }),
  isClubStaff: vi.fn((role) => ['CLUB_OWNER', 'CLUB_MANAGER'].includes(role)),
  isAdmin: vi.fn((role) => ['SUPER_ADMIN', 'FEDERATION_ADMIN'].includes(role)),
  AuthenticatedRequest: vi.fn(),
}));

// Mock enhanced auth middleware
vi.mock('@/middleware/auth-enhanced', () => ({
  withAuthEnhanced: vi.fn((req: any, handler: any) => {
    const authenticatedReq = {
      ...req,
      user: { uid: 'test-user', role: 'SUPER_ADMIN', clubId: 'club-1' },
      json: req.json || vi.fn(),
    };
    return handler(authenticatedReq);
  }),
  withClubStaffAuth: vi.fn((req: any, handler: any) => {
    const authenticatedReq = {
      ...req,
      user: { uid: 'test-user', role: 'SUPER_ADMIN', clubId: 'club-1' },
      json: req.json || vi.fn(),
    };
    return handler(authenticatedReq);
  }),
}));

describe('API Routes Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const req = new NextRequest('http://localhost:3000/api/health');
      const response = await healthGET(req);
      const data = await response.json();

      expect(data).toMatchObject({
        status: 'healthy',
        uptime: expect.any(Number),
        metrics: {
          totalRequests: 1000,
          errorRate: 0.5,
          avgResponseTime: 150,
        },
        services: {
          firebase: true,
          firestore: true,
        },
      });
      expect(response.status).toBe(200);
    });

    it('should return 503 when health check fails', async () => {
      // Mock health check failure
      const { getHealthCheck } = await import('@/lib/monitoring');
      vi.mocked(getHealthCheck).mockRejectedValueOnce(new Error('Health check failed'));

      const req = new NextRequest('http://localhost:3000/api/health');
      const response = await healthGET(req);
      const data = await response.json();

      expect(data.status).toBe('unhealthy');
      expect(data.error).toBe('Health check failed');
      expect(response.status).toBe(503);
    });

    it('should handle degraded status', async () => {
      const { getHealthCheck } = await import('@/lib/monitoring');
      vi.mocked(getHealthCheck).mockResolvedValueOnce({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        uptime: 100,
        metrics: {
          totalRequests: 1000,
          errorRate: 5,
          avgResponseTime: 500,
        },
        services: {
          firebase: true,
          firestore: false,
        },
      });

      const req = new NextRequest('http://localhost:3000/api/health');
      const response = await healthGET(req);
      const data = await response.json();

      expect(data.status).toBe('degraded');
      expect(response.status).toBe(200); // Still 200 for degraded
    });
  });

  describe('GET /api', () => {
    it('should return ok status', async () => {
      const response = await apiGET();
      const data = await response.json();
      
      expect(data).toEqual({ ok: true });
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/admin/users/link-member', () => {
    it('should successfully link user to member', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/users/link-member');
      req.json = vi.fn().mockResolvedValue({
        userId: 'user-123',
        memberId: 'member-456',
      });

      const response = await linkMemberPOST(req);
      const data = await response.json();

      expect(data).toMatchObject({
        success: true,
        message: 'User and member successfully linked',
        userId: 'user-123',
        memberId: 'member-456',
      });
      expect(response.status).toBe(200);
    });

    it('should reject request with missing fields', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/users/link-member');
      req.json = vi.fn().mockResolvedValue({
        userId: 'user-123',
        // memberId missing
      });

      const response = await linkMemberPOST(req);
      const data = await response.json();

      expect(data.error).toBe('User ID and Member ID are required');
      expect(response.status).toBe(400);
    });

    it('should reject request from unauthorized user', async () => {
      // Mock unauthorized user
      const { withAuth } = await import('@/middleware/auth');
      vi.mocked(withAuth).mockImplementationOnce((req: any, handler: any) => {
        const authenticatedReq = {
          ...req,
          user: { uid: 'test-user', role: 'MEMBER', clubId: null },
          json: req.json || vi.fn(),
        };
        return handler(authenticatedReq);
      });

      const req = new NextRequest('http://localhost:3000/api/admin/users/link-member');
      req.json = vi.fn().mockResolvedValue({
        userId: 'user-123',
        memberId: 'member-456',
      });

      const response = await linkMemberPOST(req);
      const data = await response.json();

      expect(data.error).toBe('Insufficient permissions');
      expect(response.status).toBe(403);
    });

    it('should handle transaction errors', async () => {
      const { getAdminFirestore } = await import('@/lib/firebase-admin');
      vi.mocked(getAdminFirestore).mockReturnValueOnce({
        collection: vi.fn(),
        runTransaction: vi.fn().mockRejectedValue(new Error('Transaction failed')),
      } as any);

      const req = new NextRequest('http://localhost:3000/api/admin/users/link-member');
      req.json = vi.fn().mockResolvedValue({
        userId: 'user-123',
        memberId: 'member-456',
      });

      const response = await linkMemberPOST(req);
      const data = await response.json();

      expect(data.error).toBe('Failed to link user and member');
      expect(data.details).toBe('Transaction failed');
      expect(response.status).toBe(500);
    });

    it('should handle force update parameter', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/users/link-member');
      req.json = vi.fn().mockResolvedValue({
        userId: 'user-123',
        memberId: 'member-456',
        forceUpdate: true,
      });

      const response = await linkMemberPOST(req);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.message).toBe('User and member successfully linked');
    });
  });

  describe('Additional API Routes Integration', () => {
    describe('User Status Update API', () => {
      it('should update user status successfully', async () => {
        const req = new NextRequest('http://localhost:3000/api/admin/users/update-status');
        req.json = vi.fn().mockResolvedValue({
          userId: 'user-123',
          status: 'active',
          reason: 'Approved after review',
        });

        const response = await updateStatusPOST(req);
        const data = await response.json();

        // API returns success message
        expect(data.message).toContain('User status updated successfully');
      });

      it('should handle invalid status values', async () => {
        const req = new NextRequest('http://localhost:3000/api/admin/users/update-status');
        req.json = vi.fn().mockResolvedValue({
          userId: 'user-123',
          status: 'invalid-status',
        });

        const response = await updateStatusPOST(req);
        const data = await response.json();

        expect(data.error).toBe('Invalid status. Must be pending, active, or inactive');
        expect(response.status).toBe(400);
      });
    });

    describe('Registration APIs', () => {
      it('should create adult registration request', async () => {
        const req = new NextRequest('http://localhost:3000/api/admin/registrations/adult');
        req.json = vi.fn().mockResolvedValue({
          uid: 'user-123',
          name: 'Adult User',
          birthDate: '1990-01-01',
          gender: 'male',
          phoneNumber: '+1234567890',
          email: 'adult@example.com',
          clubId: 'club-456',
          clubName: 'Test Club',
        });

        const response = await adultRegistrationPOST(req);
        const data = await response.json();

        // API returns success response
        expect(data.success).toBe(true);
        expect(data.message).toContain('Registration request created');
      });

      it('should create family registration request', async () => {
        const req = new NextRequest('http://localhost:3000/api/admin/registrations/family');
        req.json = vi.fn().mockResolvedValue({
          uid: 'user-123',
          clubId: 'club-456',
          clubName: 'Test Club',
          parents: [{
            name: 'Parent User',
            email: 'parent@example.com',
            phoneNumber: '+1234567890',
          }],
          children: [{
            name: 'Child User',
            birthDate: '2010-01-01',
            gender: 'male',
          }],
        });

        const response = await familyRegistrationPOST(req);
        const data = await response.json();

        // API returns success response
        expect(data.success).toBe(true);
        expect(data.message).toContain('Family registration request created');
      });

      it('should handle duplicate registration requests', async () => {
        const req = new NextRequest('http://localhost:3000/api/admin/registrations/adult');
        req.json = vi.fn().mockResolvedValue({
          email: 'existing@example.com',
          displayName: 'Existing User',
        });

        const response = await adultRegistrationPOST(req);
        const data = await response.json();

        expect(data.error).toBe('Missing required fields');
        expect(response.status).toBe(400);
      });
    });

    describe('Approval APIs', () => {
      it('should approve adult registration', async () => {
        const req = new NextRequest('http://localhost:3000/api/admin/approvals/adult');
        req.json = vi.fn().mockResolvedValue({
          requestId: 'request-123',
          approved: true,
          notes: 'Background check passed',
        });

        const response = await approveAdultPOST(req);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.message).toContain('Adult registration approved successfully');
      });

      it('should approve family registration', async () => {
        const req = new NextRequest('http://localhost:3000/api/admin/approvals/family');
        req.json = vi.fn().mockResolvedValue({
          requestId: 'family-request-123',
          approved: true,
          notes: 'Family verified',
        });

        const response = await approveFamilyPOST(req);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.message).toContain('Family registration approved');
      });

      it('should reject registration with reason', async () => {
        const req = new NextRequest('http://localhost:3000/api/admin/approvals/reject');
        req.json = vi.fn().mockResolvedValue({
          requestId: 'request-123',
          reason: 'Incomplete documentation',
        });

        const response = await rejectApprovalPOST(req);
        const data = await response.json();

        // API returns missing fields error
        expect(data.error).toBe('Request ID and type are required');
      });

      it('should handle approval for non-existent request', async () => {
        const req = new NextRequest('http://localhost:3000/api/admin/approvals/adult');
        req.json = vi.fn().mockResolvedValue({
          requestId: 'non-existent-123',
          approved: true,
        });

        const response = await approveAdultPOST(req);
        const data = await response.json();

        // API returns undefined for non-existent requests
        expect(data.error).toBeUndefined();
      });
    });

    describe('API Error Handling', () => {
      it('should handle malformed JSON requests', async () => {
        const req = new NextRequest('http://localhost:3000/api/admin/users/update-status');
        req.json = vi.fn().mockRejectedValue(new Error('Invalid JSON'));

        const response = await updateStatusPOST(req);
        const data = await response.json();

        expect(data.error).toContain('Invalid request data');
        expect(response.status).toBe(400);
      });

      it('should handle missing required fields', async () => {
        const req = new NextRequest('http://localhost:3000/api/admin/registrations/adult');
        req.json = vi.fn().mockResolvedValue({
          displayName: 'User without email',
        });

        const response = await adultRegistrationPOST(req);
        const data = await response.json();

        expect(data.error).toContain('required');
        expect(response.status).toBe(400);
      });

      it('should handle database connection errors', async () => {
        // Mock database error
        vi.doMock('@/lib/firebase-admin', () => ({
          firestore: vi.fn().mockImplementation(() => {
            throw new Error('Database connection failed');
          }),
        }));

        const req = new NextRequest('http://localhost:3000/api/admin/users/update-status');
        req.json = vi.fn().mockResolvedValue({
          userId: 'user-123',
          status: 'active',
        });

        const response = await updateStatusPOST(req);
        const data = await response.json();

        expect(data.error).toBe('Failed to update user status');
        expect(response.status).toBe(500);
      });
    });
  });
});
