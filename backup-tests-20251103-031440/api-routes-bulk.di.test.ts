import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest } from '@/components/__tests__/test-utils';
import { setupApiHelpersMock, resetApiHelpersMock } from '@/components/__tests__/api-helpers-mock';

// 정면돌파 전략: API Routes 대량 DI 테스트
describe('API Routes with DI - Bulk Coverage', () => {
  let mockServices: any;
  let mockApiHelpers: any;

  beforeEach(() => {
    resetApiHelpersMock();
    
    // Mock services
    mockServices = {
      users: {
        updateStatus: vi.fn(),
        linkMember: vi.fn(),
        getUsers: vi.fn(),
        getUser: vi.fn(),
      },
      approvals: {
        approveAdult: vi.fn(),
        approveFamily: vi.fn(),
        approveMember: vi.fn(),
        rejectRequest: vi.fn(),
      },
      passes: {
        approve: vi.fn(),
        reject: vi.fn(),
        cancel: vi.fn(),
        request: vi.fn(),
      },
      notifications: {
        getNotifications: vi.fn(),
        createNotification: vi.fn(),
        markAsRead: vi.fn(),
      },
    };

    vi.stubGlobal('services', mockServices);
    
    // Setup API helpers mock
    mockApiHelpers = setupApiHelpersMock();
  });

  describe('/api/admin/users/update-status', () => {
    it('should update user status successfully', async () => {
      mockServices.users.updateStatus.mockResolvedValue({ success: true });
      
      const { POST } = await import('../admin/users/update-status/route');
      const request = createMockRequest({
        userId: 'user-123',
        status: 'active',
        reason: 'Admin approval'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockServices.users.updateStatus).toHaveBeenCalledWith('user-123', 'active', {
        performedBy: expect.any(String),
        reason: 'Admin approval'
      });
    });

    it('should handle missing required fields', async () => {
      const { POST } = await import('../admin/users/update-status/route');
      const request = createMockRequest({ userId: 'user-123' }); // status missing

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('/api/admin/users/link-member', () => {
    it('should link user to member successfully', async () => {
      mockServices.users.linkMember.mockResolvedValue({ success: true });
      
      const { POST } = await import('../admin/users/link-member/route');
      const request = createMockRequest({
        userId: 'user-123',
        memberId: 'member-456',
        clubId: 'club-789'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockServices.users.linkMember).toHaveBeenCalledWith(
        'user-123', 'member-456', 'club-789'
      );
    });

    it('should handle missing link data', async () => {
      const { POST } = await import('../admin/users/link-member/route');
      const request = createMockRequest({ userId: 'user-123' }); // missing memberId and clubId

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('/api/admin/approvals/adult', () => {
    it('should approve adult registration successfully', async () => {
      mockServices.approvals.approveAdult.mockResolvedValue({ success: true });
      
      const { POST } = await import('../admin/approvals/adult/route');
      const request = createMockRequest({
        requestId: 'request-123',
        approved: true,
        notes: 'Registration approved'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockServices.approvals.approveAdult).toHaveBeenCalledWith('request-123', {
        approved: true,
        notes: 'Registration approved',
        performedBy: expect.any(String)
      });
    });

    it('should handle rejection of adult registration', async () => {
      mockServices.approvals.approveAdult.mockResolvedValue({ success: true });
      
      const { POST } = await import('../admin/approvals/adult/route');
      const request = createMockRequest({
        requestId: 'request-123',
        approved: false,
        notes: 'Incomplete documentation'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockServices.approvals.approveAdult).toHaveBeenCalledWith('request-123', {
        approved: false,
        notes: 'Incomplete documentation',
        performedBy: expect.any(String)
      });
    });
  });

  describe('/api/admin/approvals/family', () => {
    it('should approve family registration successfully', async () => {
      mockServices.approvals.approveFamily.mockResolvedValue({ success: true });
      
      const { POST } = await import('../admin/approvals/family/route');
      const request = createMockRequest({
        requestId: 'request-456',
        approved: true,
        notes: 'Family registration approved'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockServices.approvals.approveFamily).toHaveBeenCalledWith('request-456', {
        approved: true,
        notes: 'Family registration approved',
        performedBy: expect.any(String)
      });
    });
  });

  describe('/api/admin/approvals/member', () => {
    it('should approve member registration successfully', async () => {
      mockServices.approvals.approveMember.mockResolvedValue({ success: true });
      
      const { POST } = await import('../admin/approvals/member/route');
      const request = createMockRequest({
        requestId: 'request-789',
        approved: true,
        notes: 'Member registration approved'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockServices.approvals.approveMember).toHaveBeenCalledWith('request-789', {
        approved: true,
        notes: 'Member registration approved',
        performedBy: expect.any(String)
      });
    });
  });

  describe('/api/admin/passes/approve', () => {
    it('should approve pass request successfully', async () => {
      mockServices.passes.approve.mockResolvedValue({ success: true });
      
      const { POST } = await import('../admin/passes/approve/route');
      const request = createMockRequest({
        passId: 'pass-123',
        approved: true,
        notes: 'Pass approved'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockServices.passes.approve).toHaveBeenCalledWith('pass-123', {
        approved: true,
        notes: 'Pass approved',
        performedBy: expect.any(String)
      });
    });
  });

  describe('/api/admin/passes/reject', () => {
    it('should reject pass request successfully', async () => {
      mockServices.passes.reject.mockResolvedValue({ success: true });
      
      const { POST } = await import('../admin/passes/reject/route');
      const request = createMockRequest({
        passId: 'pass-456',
        approved: false,
        notes: 'Pass rejected - insufficient documentation'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockServices.passes.reject).toHaveBeenCalledWith('pass-456', {
        approved: false,
        notes: 'Pass rejected - insufficient documentation',
        performedBy: expect.any(String)
      });
    });
  });

  describe('/api/notifications', () => {
    it('should get user notifications successfully', async () => {
      const mockNotifications = [
        { id: 'notif-1', title: 'Test 1', status: 'unread' },
        { id: 'notif-2', title: 'Test 2', status: 'read' }
      ];

      mockServices.notifications.getNotifications.mockResolvedValue(mockNotifications);
      
      const { GET } = await import('../notifications/route');
      const request = createMockRequest();

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockNotifications);
      expect(mockServices.notifications.getNotifications).toHaveBeenCalled();
    });

    it('should create new notification successfully', async () => {
      const newNotification = {
        id: 'notif-123',
        title: 'New Notification',
        message: 'Test message',
        status: 'unread'
      };

      mockServices.notifications.createNotification.mockResolvedValue(newNotification);
      
      const { POST } = await import('../notifications/route');
      const request = createMockRequest({
        title: 'New Notification',
        message: 'Test message',
        type: 'INFO'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(newNotification);
      expect(mockServices.notifications.createNotification).toHaveBeenCalledWith({
        title: 'New Notification',
        message: 'Test message',
        type: 'INFO'
      });
    });
  });

  describe('/api/users', () => {
    it('should get users list successfully', async () => {
      const mockUsers = [
        { uid: 'user-1', email: 'test1@example.com', role: 'MEMBER' },
        { uid: 'user-2', email: 'test2@example.com', role: 'ADMIN' }
      ];

      mockServices.users.getUsers.mockResolvedValue(mockUsers);
      
      const { GET } = await import('../users/route');
      const request = createMockRequest();

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUsers);
      expect(mockServices.users.getUsers).toHaveBeenCalled();
    });
  });

  describe('/api/users/[id]', () => {
    it('should get single user successfully', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'test@example.com',
        role: 'MEMBER',
        status: 'active'
      };

      mockServices.users.getUser.mockResolvedValue(mockUser);
      
      const { GET } = await import('../users/[id]/route');
      const request = createMockRequest();

      const response = await GET(request, { params: { id: 'user-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUser);
      expect(mockServices.users.getUser).toHaveBeenCalledWith('user-123');
    });

    it('should return 404 for non-existent user', async () => {
      mockServices.users.getUser.mockResolvedValue(null);
      
      const { GET } = await import('../users/[id]/route');
      const request = createMockRequest();

      const response = await GET(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);
    });
  });

  describe('/api/health', () => {
    it('should return health status successfully', async () => {
      const { GET } = await import('../health/route');
      const request = createMockRequest();

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockServices.users.updateStatus.mockRejectedValue(new Error('Service error'));
      
      const { POST } = await import('../admin/users/update-status/route');
      const request = createMockRequest({
        userId: 'user-123',
        status: 'active',
        reason: 'Test'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Service error');
    });

    it('should handle invalid JSON in request body', async () => {
      const { POST } = await import('../admin/users/update-status/route');
      const request = new Request('http://localhost', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });
});
