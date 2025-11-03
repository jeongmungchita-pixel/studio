/**
 * Adult Approval API Route DI 테스트 (수정)
 * 실제 DI 시스템과 withClubStaffApiHandler 동작 방식에 맞게 수정
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupTestDI, getMockService, createMockRequest, createMockUser } from '@/lib/di/test-utils';

describe('/api/admin/approvals/adult route (DI Fixed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTestDI();
  });

  it('should setup DI correctly', () => {
    const mockMemberService = getMockService('memberService');
    expect(mockMemberService).toBeDefined();
  });

  it('should import route with DI', async () => {
    const routeModule = await import('../route');
    expect(routeModule.POST).toBeDefined();
    expect(typeof routeModule.POST).toBe('function');
  });

  it('should handle request through withClubStaffApiHandler', async () => {
    // Mock user 설정
    const mockUser = createMockUser({
      uid: 'admin-123',
      email: 'admin@example.com',
      role: 'CLUB_OWNER',
      clubId: 'club-456'
    });

    // Mock request 생성
    const mockRequest = createMockRequest(
      'https://example.com/api/admin/approvals/adult/request-456',
      'POST',
      { requestId: 'request-456' }
    );

    // Mock member service 설정
    const mockMemberService = getMockService('memberService');
    mockMemberService.approveAdultRegistration = vi.fn().mockResolvedValue({
      memberId: 'member-789',
      userId: 'user-123',
      requestData: { name: '홍길동' }
    });

    // withClubStaffApiHandler mock 수정 - 실제 핸들러를 호출하도록
    vi.doMock('@/lib/di/api-helpers', async (importOriginal) => {
      const mod = await importOriginal() as any;
      return {
        ...mod,
        withClubStaffApiHandler: vi.fn((handler) => {
          // 실제 핸들러를 context와 함께 호출
          return async (request: any) => {
            const context = {
              user: mockUser
            };
            return await handler(request, context);
          };
        })
      };
    });

    // 모듈 재로드
    vi.resetModules();
    const { POST } = await import('../route');

    // POST 함수 호출 (withClubStaffApiHandler가 핸들러를 반환)
    const handlerFunction = await POST(mockRequest);
    
    // 핸들러가 함수인지 확인
    expect(typeof handlerFunction).toBe('function');
    
    // 핸들러 실행
    const result = await handlerFunction(mockRequest);
    
    // 결과 확인
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should test complete flow with proper mocking', async () => {
    // Mock user
    const mockUser = createMockUser({
      uid: 'admin-123',
      email: 'admin@example.com',
      role: 'CLUB_OWNER',
      clubId: 'club-456'
    });

    // Mock request
    const mockRequest = createMockRequest(
      'https://example.com/api/admin/approvals/adult/request-456',
      'POST',
      {}
    );

    // Mock services
    const mockMemberService = getMockService('memberService');
    mockMemberService.approveAdultRegistration = vi.fn().mockResolvedValue({
      memberId: 'member-789',
      userId: 'user-123',
      requestData: { name: '홍길동' }
    });

    // Complete mock setup
    vi.doMock('@/lib/di/api-helpers', () => ({
      withClubStaffApiHandler: vi.fn((handler) => {
        return async (request: any) => {
          const context = { user: mockUser };
          return await handler(request, context);
        };
      }),
      parseRequestBody: vi.fn((request) => {
        // URL에서 requestId 추출
        const url = request.url || '';
        const parts = url.split('/');
        const requestId = parts[parts.length - 1];
        return Promise.resolve({ requestId });
      }),
      createApiResponse: vi.fn((data) => ({
        ...data,
        success: true,
        message: 'Adult registration approved successfully'
      })),
      logApiRequest: vi.fn(),
      logAuditEvent: vi.fn(),
      ApiError: class extends Error {
        constructor(message: string, public statusCode: number) {
          super(message);
        }
      },
      apiServices: {
        members: mockMemberService
      }
    }));

    // Reset and re-import
    vi.resetModules();
    const { POST } = await import('../route');

    // Execute
    const handlerFunction = await POST(mockRequest);
    const result = await handlerFunction(mockRequest);

    // Verify
    expect(result.success).toBe(true);
    expect(result.memberId).toBe('member-789');
    expect(result.userId).toBe('user-123');
    expect(result.requestId).toBe('request-456');

    // Verify service calls
    expect(mockMemberService.approveAdultRegistration).toHaveBeenCalledWith(
      'request-456',
      expect.objectContaining({
        approvedBy: 'admin-123',
        performedBy: 'admin-123',
        performerRole: 'CLUB_OWNER',
        clubId: 'club-456'
      })
    );
  });
});
