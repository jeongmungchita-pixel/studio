/**
 * Update User Status API Route DI 통합 테스트
 */
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
    const authServiceSpy = spyOnService<IAuthService>('authService', 'getUserProfile');
    const userServiceSpy = spyOnService<IUserService>('userService', 'updateStatus');

    authServiceSpy.mockResolvedValue(mockUser);
    userServiceSpy.mockResolvedValue({
      userId: 'user-456',
      previousStatus: 'pending',
      newStatus: 'active',
      updatedBy: 'admin-123',
      updatedAt: new Date().toISOString()
    });

    // 테스트 요청 생성
    const request = createMockRequest(
      'https://example.com/api/admin/users/update-status',
      'POST',
      {
        userId: 'user-456',
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
    expect(data.data.newStatus).toBe('active');
    expect(userServiceSpy).toHaveBeenCalledWith('user-456', 'active', {
      performedBy: 'admin-123',
      reason: '승인 완료'
    });
  });

  it('updates status with null reason', async () => {
    const mockUser = createMockUser({
      uid: 'admin-123',
      role: 'SUPER_ADMIN'
    });

    const authServiceSpy = spyOnService<IAuthService>('authService', 'getUserProfile');
    const userServiceSpy = spyOnService<IUserService>('userService', 'updateStatus');

    authServiceSpy.mockResolvedValue(mockUser);
    userServiceSpy.mockResolvedValue({
      userId: 'user-456',
      previousStatus: 'active',
      newStatus: 'inactive',
      updatedBy: 'admin-123',
      updatedAt: new Date().toISOString()
    });

    const request = createMockRequest(
      'https://example.com/api/admin/users/update-status',
      'POST',
      {
        userId: 'user-456',
        status: 'inactive',
        reason: null
      }
    );

    const { POST } = await import('../route');
    const response = await POST(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
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
        userId: 'user-456',
        status: 'active'
      }
    );

    const { POST } = await import('../route');
    const response = await POST(request);
    
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('권한 없음');
  });

  it('handles missing user gracefully', async () => {
    const userServiceSpy = spyOnService<IUserService>('userService', 'updateStatus');
    userServiceSpy.mockRejectedValue(new Error('User not found'));

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
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toContain('사용자를 찾을 수 없습니다');
  });

  it('validates status values', async () => {
    const mockUser = createMockUser({
      uid: 'admin-123',
      role: 'SUPER_ADMIN'
    });

    const authServiceSpy = spyOnService<IAuthService>('authService', 'getUserProfile');
    authServiceSpy.mockResolvedValue(mockUser);

    // 잘못된 상태값
    const request = createMockRequest(
      'https://example.com/api/admin/users/update-status',
      'POST',
      {
        userId: 'user-456',
        status: 'invalid-status'
      }
    );

    const { POST } = await import('../route');
    const response = await POST(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('유효하지 않은 상태값');
  });

  it('validates required fields', async () => {
    const mockUser = createMockUser({
      uid: 'admin-123',
      role: 'SUPER_ADMIN'
    });

    const authServiceSpy = spyOnService<IAuthService>('authService', 'getUserProfile');
    authServiceSpy.mockResolvedValue(mockUser);

    // 필드 누락 요청
    const request = createMockRequest(
      'https://example.com/api/admin/users/update-status',
      'POST',
      {
        status: 'active'
        // userId 필드 누락
      }
    );

    const { POST } = await import('../route');
    const response = await POST(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('필수 정보');
  });
});
