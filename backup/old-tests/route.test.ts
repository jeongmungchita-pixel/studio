import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  setupTestDI, 
  createMockRequest, 
  createMockUser, 
  getMockService,
  spyOnService 
} from '@/lib/di/test-utils';
import type { IUserService, IAuthService } from '@/lib/di';

describe('/api/admin/users/update-status route with DI', () => {
  let mockUserService: IUserService;
  let mockAuthService: IAuthService;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setupTestDI();
    
    mockUserService = getMockService<IUserService>('userService');
    mockAuthService = getMockService<IAuthService>('authService');
  });

  afterEach(() => {
    // DI 컨테이너 정리는 test-utils에서 자동으로 처리
  });

  it('updates user status for admin', async () => {
    // Mock 관리자 설정
    const mockUser = createMockUser({
      uid: 'admin-123',
      role: 'SUPER_ADMIN'
    });

    // Mock 서비스 설정
    const userServiceSpy = spyOnService<IUserService>('userService', 'updateStatus');
    const authServiceSpy = spyOnService<IAuthService>('authService', 'getUserProfile');

    userServiceSpy.mockResolvedValue({
      success: true,
      previousStatus: 'pending',
      newStatus: 'active'
    });

    authServiceSpy.mockResolvedValue(mockUser);

    // 테스트 요청 생성
    const request = createMockRequest(
      'https://example.com/api/admin/users/update-status',
      'POST',
      {
        userId: 'user-123',
        status: 'active',
        reason: '승인 완료'
      }
    );

    // API 라우트 테스트
    const { POST } = await import('../route');
    const response = await POST(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.status).toBe('active');
    expect(data.previousStatus).toBe('pending');
  });

  it('rejects unauthorized access', async () => {
    // Mock 일반 사용자 설정
    const mockUser = createMockUser({
      uid: 'user-123',
      role: 'MEMBER'
    });

    const authServiceSpy = spyOnService<IAuthService>('authService', 'getUserProfile');
    authServiceSpy.mockResolvedValue(mockUser);

    const request = createMockRequest(
      'https://example.com/api/admin/users/update-status',
      'POST',
      {
        userId: 'user-123',
        status: 'active'
      }
    );

    const { POST } = await import('../route');
    const response = await POST(request);
    
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('권한이 없습니다');
  });

  it('validates required fields', async () => {
    const mockUser = createMockUser({
      uid: 'admin-123',
      role: 'SUPER_ADMIN'
    });

    const authServiceSpy = spyOnService<IAuthService>('authService', 'getUserProfile');
    authServiceSpy.mockResolvedValue(mockUser);

    // userId 없이 요청
    const request = createMockRequest(
      'https://example.com/api/admin/users/update-status',
      'POST',
      {
        status: 'active'
      }
    );

    const { POST } = await import('../route');
    const response = await POST(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('User ID와 status는 필수입니다');
  });

  it('validates status values', async () => {
    const mockUser = createMockUser({
      uid: 'admin-123',
      role: 'SUPER_ADMIN'
    });

    const authServiceSpy = spyOnService<IAuthService>('authService', 'getUserProfile');
    authServiceSpy.mockResolvedValue(mockUser);

    // 잘못된 status 값으로 요청
    const request = createMockRequest(
      'https://example.com/api/admin/users/update-status',
      'POST',
      {
        userId: 'user-123',
        status: 'invalid'
      }
    );

    const { POST } = await import('../route');
    const response = await POST(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('status는 pending, active, inactive 중 하나여야 합니다');
  });

  it('handles user not found gracefully', async () => {
    const mockUser = createMockUser({
      uid: 'admin-123',
      role: 'SUPER_ADMIN'
    });

    const userServiceSpy = spyOnService<IUserService>('userService', 'updateStatus');
    const authServiceSpy = spyOnService<IAuthService>('authService', 'getUserProfile');

    userServiceSpy.mockRejectedValue(new Error('User not found'));
    authServiceSpy.mockResolvedValue(mockUser);

    const request = createMockRequest(
      'https://example.com/api/admin/users/update-status',
      'POST',
      {
        userId: 'nonexistent-user',
        status: 'active'
      }
    );

    const { POST } = await import('../route');
    const response = await POST(request);
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain('서버 오류가 발생했습니다');
  });
});
