/**
 * Adult Registration API Route DI 통합 테스트
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  setupTestDI, 
  createMockRequest, 
  createMockUser, 
  getMockService,
  spyOnService 
} from '@/lib/di/test-utils';
import type { IMemberService, IAuthService } from '@/lib/di';

describe('/api/admin/registrations/adult route with DI', () => {
  let mockMemberService: IMemberService;
  let mockAuthService: IAuthService;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setupTestDI();
    
    mockMemberService = getMockService<IMemberService>('memberService');
    mockAuthService = getMockService<IAuthService>('authService');
  });

  afterEach(() => {
    // DI 컨테이너 정리는 test-utils에서 자동으로 처리
  });

  it('creates adult registration for admin', async () => {
    // Mock 관리자 설정
    const mockUser = createMockUser({
      uid: 'admin-123',
      role: 'CLUB_OWNER',
      clubId: 'club-456'
    });

    // Mock 서비스 설정
    const authServiceSpy = spyOnService<IAuthService>('authService', 'getUserProfile');
    const memberServiceSpy = spyOnService<IMemberService>('memberService', 'createAdultRegistration');

    authServiceSpy.mockResolvedValue(mockUser);
    memberServiceSpy.mockResolvedValue({
      requestId: 'request-789',
      requestData: {
        requestedBy: 'user-123',
        name: '홍길동',
        birthDate: '1990-01-01',
        gender: 'male',
        phoneNumber: '010-1234-5678',
        email: 'hong@example.com',
        clubId: 'club-456',
        clubName: '테스트 클럽'
      }
    });

    // 테스트 요청 생성
    const request = createMockRequest(
      'https://example.com/api/admin/registrations/adult',
      'POST',
      {
        requestedBy: 'user-123',
        name: '홍길동',
        birthDate: '1990-01-01',
        gender: 'male',
        phoneNumber: '010-1234-5678',
        email: 'hong@example.com',
        clubId: 'club-456',
        clubName: '테스트 클럽'
      }
    );

    // API 라우트 테스트
    const { POST } = await import('../route');
    const response = await POST(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.requestId).toBe('request-789');
    expect(data.data.requestData.name).toBe('홍길동');
    expect(memberServiceSpy).toHaveBeenCalledWith({
      requestedBy: 'user-123',
      name: '홍길동',
      birthDate: '1990-01-01',
      gender: 'male',
      phoneNumber: '010-1234-5678',
      email: 'hong@example.com',
      clubId: 'club-456',
      clubName: '테스트 클럽'
    });
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
      'https://example.com/api/admin/registrations/adult',
      'POST',
      {
        requestedBy: 'user-123',
        name: '테스트',
        birthDate: '1990-01-01',
        gender: 'male',
        phoneNumber: '010-1234-5678',
        clubId: 'club-456'
      }
    );

    const { POST } = await import('../route');
    const response = await POST(request);
    
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('권한 없음');
  });

  it('validates required fields', async () => {
    const mockUser = createMockUser({
      uid: 'admin-123',
      role: 'CLUB_OWNER'
    });

    const authServiceSpy = spyOnService<IAuthService>('authService', 'getUserProfile');
    authServiceSpy.mockResolvedValue(mockUser);

    // 필드 누락 요청
    const request = createMockRequest(
      'https://example.com/api/admin/registrations/adult',
      'POST',
      {
        name: '홍길동'
        // 다른 필수 필드들 누락
      }
    );

    const { POST } = await import('../route');
    const response = await POST(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('필수 정보');
  });

  it('validates email format', async () => {
    const mockUser = createMockUser({
      uid: 'admin-123',
      role: 'CLUB_OWNER'
    });

    const authServiceSpy = spyOnService<IAuthService>('authService', 'getUserProfile');
    authServiceSpy.mockResolvedValue(mockUser);

    // 잘못된 이메일 형식
    const request = createMockRequest(
      'https://example.com/api/admin/registrations/adult',
      'POST',
      {
        requestedBy: 'user-123',
        name: '홍길동',
        birthDate: '1990-01-01',
        gender: 'male',
        phoneNumber: '010-1234-5678',
        email: 'invalid-email',
        clubId: 'club-456'
      }
    );

    const { POST } = await import('../route');
    const response = await POST(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('유효한 이메일');
  });

  it('validates gender values', async () => {
    const mockUser = createMockUser({
      uid: 'admin-123',
      role: 'CLUB_OWNER'
    });

    const authServiceSpy = spyOnService<IAuthService>('authService', 'getUserProfile');
    authServiceSpy.mockResolvedValue(mockUser);

    // 잘못된 성별 값
    const request = createMockRequest(
      'https://example.com/api/admin/registrations/adult',
      'POST',
      {
        requestedBy: 'user-123',
        name: '홍길동',
        birthDate: '1990-01-01',
        gender: 'invalid',
        phoneNumber: '010-1234-5678',
        clubId: 'club-456'
      }
    );

    const { POST } = await import('../route');
    const response = await POST(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('유효한 성별');
  });
});
