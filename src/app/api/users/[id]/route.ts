/**
 * 개별 사용자 API 엔드포인트 (DI 기반)
 * GET /api/users/[id] - 사용자 상세 조회
 * PUT /api/users/[id] - 사용자 정보 수정
 * DELETE /api/users/[id] - 사용자 삭제
 */
import { NextRequest } from 'next/server';
import { 
  successResponse, 
  errorResponse, 
  validateRequest,
  withErrorHandling,
  parseRequestBody,
  ApiErrorCode,
  HttpStatus
} from '@/lib/api-helpers';
import { UserRole } from '@/types/auth';
import { getUserService } from '@/composition-root';
interface RouteParams {
  params: {
    id: string;
  };
}
/**
 * GET: 사용자 상세 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withErrorHandling(async () => {
    // 인증 확인
    const validation = await validateRequest(request, {
      requireAuth: true
    });
    if (!validation.valid) {
      return validation.error!;
    }
    const userId = params.id;
    // 권한 확인: 자신의 정보이거나 관리자
    if (validation.user?.uid !== userId) {
      const hasPermission = await validateRequest(request, {
        requireAuth: true,
        minimumRole: UserRole.CLUB_MANAGER
      });
      if (!hasPermission.valid) {
        return errorResponse(
          ApiErrorCode.FORBIDDEN,
          '다른 사용자의 정보를 조회할 권한이 없습니다.',
          HttpStatus.FORBIDDEN
        );
      }
    }
    // DI 서비스 사용
    const userService = getUserService();
    const user = await userService.getUserById(userId);

    if (!user) {
      return errorResponse(
        ApiErrorCode.NOT_FOUND,
        '사용자를 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND
      );
    }

    return successResponse(user, '사용자 정보를 성공적으로 조회했습니다.');
  });
}
/**
 * PUT: 사용자 정보 수정
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withErrorHandling(async () => {
    // 인증 확인
    const validation = await validateRequest(request, {
      requireAuth: true
    });
    if (!validation.valid) {
      return validation.error!;
    }
    const userId = params.id;
    // 권한 확인: 자신의 정보이거나 관리자
    const isSelf = validation.user?.uid === userId;
    const isAdmin = validation.user?.role && [
      UserRole.SUPER_ADMIN,
      UserRole.FEDERATION_ADMIN,
      UserRole.CLUB_OWNER,
      UserRole.CLUB_MANAGER
    ].includes(validation.user.role);
    if (!isSelf && !isAdmin) {
      return errorResponse(
        ApiErrorCode.FORBIDDEN,
        '사용자 정보를 수정할 권한이 없습니다.',
        HttpStatus.FORBIDDEN
      );
    }
    // 요청 본문 파싱
    const body = await parseRequestBody<{
      name?: string;
      phoneNumber?: string;
      role?: UserRole;
      status?: string;
      clubId?: string;
    }>(request);
    if (!body) {
      return errorResponse(
        ApiErrorCode.INVALID_INPUT,
        '잘못된 요청 형식입니다.',
        HttpStatus.BAD_REQUEST
      );
    }
    // DI 서비스 사용
    const userService = getUserService();
    const existingUser = await userService.getUserById(userId);

    if (!existingUser) {
      return errorResponse(
        ApiErrorCode.NOT_FOUND,
        '사용자를 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND
      );
    }

    // 업데이트 데이터 준비
    const updateData: any = {
      updatedAt: new Date()
    };
    // 일반 사용자는 일부 필드만 수정 가능
    if (isSelf && !isAdmin) {
      if (body.name) updateData.name = body.name;
      if (body.phoneNumber) updateData.phoneNumber = body.phoneNumber;
    } else if (isAdmin) {
      // 관리자는 모든 필드 수정 가능
      if (body.name) updateData.name = body.name;
      if (body.phoneNumber) updateData.phoneNumber = body.phoneNumber;
      if (body.role) {
        // 역할 변경 권한 확인
        if (!canAssignRole(validation.user!.role!, body.role)) {
          return errorResponse(
            ApiErrorCode.INSUFFICIENT_PERMISSIONS,
            '해당 역할을 부여할 권한이 없습니다.',
            HttpStatus.FORBIDDEN
          );
        }
        updateData.role = body.role;
      }
      if (body.status) updateData.status = body.status;
      if (body.clubId !== undefined) updateData.clubId = body.clubId;
    }
    // 업데이트 실행
    const result = await userService.updateUser(userId, updateData);

    if (!result.success) {
      return errorResponse(
        ApiErrorCode.UPDATE_FAILED,
        result.error?.message || '사용자 정보 수정에 실패했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    return successResponse(
      result.data,
      '사용자 정보가 수정되었습니다.'
    );
  });
}
/**
 * DELETE: 사용자 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withErrorHandling(async () => {
    // 인증 및 권한 확인
    const validation = await validateRequest(request, {
      requireAuth: true,
      requiredRoles: [UserRole.SUPER_ADMIN, UserRole.FEDERATION_ADMIN]
    });
    if (!validation.valid) {
      return validation.error!;
    }
    const userId = params.id;
    // 자기 자신은 삭제 불가
    if (validation.user?.uid === userId) {
      return errorResponse(
        ApiErrorCode.OPERATION_NOT_ALLOWED,
        '자신의 계정은 삭제할 수 없습니다.',
        HttpStatus.BAD_REQUEST
      );
    }
    // DI 서비스 사용
    const userService = getUserService();
    const existingUser = await userService.getUserById(userId);

    if (!existingUser) {
      return errorResponse(
        ApiErrorCode.NOT_FOUND,
        '사용자를 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND
      );
    }

    // 삭제할 사용자의 역할 확인
    const targetUserRole = existingUser.role;
    if (targetUserRole && !canDeleteUser(validation.user!.role!, targetUserRole)) {
      return errorResponse(
        ApiErrorCode.INSUFFICIENT_PERMISSIONS,
        '해당 사용자를 삭제할 권한이 없습니다.',
        HttpStatus.FORBIDDEN
      );
    }
    // 소프트 삭제 (실제로는 status를 'deleted'로 변경)
    const result = await userService.updateUser(userId, {
      status: 'deleted',
      deletedAt: new Date().toISOString(),
      deletedBy: validation.user?.uid
    });

    if (!result.success) {
      return errorResponse(
        ApiErrorCode.DELETE_FAILED,
        result.error?.message || '사용자 삭제에 실패했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    return successResponse(
      { id: userId },
      '사용자가 삭제되었습니다.'
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
  return assignerLevel > targetLevel;
}
/**
 * 사용자 삭제 권한 확인
 */
function canDeleteUser(deleterRole: UserRole, targetRole: UserRole): boolean {
  // canAssignRole과 동일한 로직 사용
  return canAssignRole(deleterRole, targetRole);
}
