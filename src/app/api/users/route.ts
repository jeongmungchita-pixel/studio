/**
 * 사용자 API 엔드포인트 (DI 기반)
 * GET /api/users - 사용자 목록 조회
 * POST /api/users - 사용자 생성
 */
import { NextRequest } from 'next/server';
import { 
  successResponse, 
  errorResponse, 
  validateRequest,
  parsePaginationParams,
  parseSortParams,
  parseFilterParams,
  withErrorHandling,
  parseRequestBody,
  ApiErrorCode,
  HttpStatus
} from '@/lib/api-helpers';
import { UserRole } from '@/types/auth';
import { getUserService } from '@/composition-root';
/**
 * GET: 사용자 목록 조회
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    // 인증 및 권한 확인
    const validation = await validateRequest(request, {
      requireAuth: true,
      minimumRole: UserRole.CLUB_MANAGER
    });
    if (!validation.valid) {
      return validation.error!;
    }
    // 파라미터 파싱
    const { page, pageSize, offset } = parsePaginationParams(request);
    const { sortBy, sortOrder } = parseSortParams(request);
    const filters = parseFilterParams(request, ['role', 'status', 'clubId']);
    // DI 서비스 사용
    const userService = getUserService();
    const result = await userService.getUsers({
      page,
      pageSize,
      filters
    });

    if (!result.success) {
      return errorResponse(
        ApiErrorCode.QUERY_FAILED,
        result.error?.message || '사용자 목록 조회에 실패했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    return successResponse(result.data, '사용자 목록을 성공적으로 조회했습니다.');
  });
}
/**
 * POST: 사용자 생성
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    // 인증 및 권한 확인
    const validation = await validateRequest(request, {
      requireAuth: true,
      requiredRoles: [UserRole.SUPER_ADMIN, UserRole.FEDERATION_ADMIN, UserRole.CLUB_OWNER]
    });
    if (!validation.valid) {
      return validation.error!;
    }
    // 요청 본문 파싱
    const body = await parseRequestBody<{
      email: string;
      password: string;
      name: string;
      role: UserRole;
      clubId?: string;
      phoneNumber?: string;
    }>(request);
    if (!body) {
      return errorResponse(
        ApiErrorCode.INVALID_INPUT,
        '잘못된 요청 형식입니다.',
        HttpStatus.BAD_REQUEST
      );
    }
    // 필수 필드 검증
    if (!body.email || !body.password || !body.name || !body.role) {
      return errorResponse(
        ApiErrorCode.MISSING_FIELD,
        '필수 필드가 누락되었습니다.',
        HttpStatus.BAD_REQUEST
      );
    }
    // DI 서비스 사용
    const userService = getUserService();
    
    // 이메일 중복 확인
    const existingUser = await userService.getUserByEmail(body.email);
    if (existingUser) {
      return errorResponse(
        ApiErrorCode.ALREADY_EXISTS,
        '이미 존재하는 이메일입니다.',
        HttpStatus.CONFLICT
      );
    }
    // 권한 검증: 자신보다 높은 권한 부여 불가
    const userRole = validation.user?.role;
    if (userRole && !canAssignRole(userRole, body.role)) {
      return errorResponse(
        ApiErrorCode.INSUFFICIENT_PERMISSIONS,
        '해당 역할을 부여할 권한이 없습니다.',
        HttpStatus.FORBIDDEN
      );
    }
    // 사용자 생성
    const result = await userService.createUser({
      email: body.email,
      password: body.password,
      displayName: body.name,
      role: body.role
    });

    if (!result.success) {
      return errorResponse(
        ApiErrorCode.CREATE_FAILED,
        result.error?.message || '사용자 생성에 실패했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    return successResponse(
      result.data,
      '사용자가 생성되었습니다.'
    );
  });
}
/**
 * 역할 부여 권한 확인
 */
function canAssignRole(assignerRole: UserRole, targetRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    [UserRole.SUPER_ADMIN]: 100,
    [UserRole.FEDERATION_ADMIN]: 90,
    [UserRole.FEDERATION_SECRETARIAT]: 85,
    [UserRole.COMMITTEE_CHAIR]: 80,
    [UserRole.COMMITTEE_MEMBER]: 75,
    [UserRole.CLUB_OWNER]: 70,
    [UserRole.CLUB_MANAGER]: 65,
    [UserRole.CLUB_STAFF]: 60,
    [UserRole.MEDIA_MANAGER]: 55,
    [UserRole.HEAD_COACH]: 50,
    [UserRole.ASSISTANT_COACH]: 45,
    [UserRole.MEMBER]: 30,
    [UserRole.PARENT]: 20,
    [UserRole.VENDOR]: 10
  };
  const assignerLevel = roleHierarchy[assignerRole] || 0;
  const targetLevel = roleHierarchy[targetRole] || 0;
  // 자신보다 낮은 권한만 부여 가능
  return assignerLevel > targetLevel;
}

/**
 * 임시 비밀번호 생성
 */
function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
