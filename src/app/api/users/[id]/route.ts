/**
 * 개별 사용자 API 엔드포인트
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
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdmin } from '@/firebase/admin';
// Admin SDK 초기화
initializeAdmin();
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
    // 사용자 조회
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc?.exists) {
      return errorResponse(
        ApiErrorCode.NOT_FOUND,
        '사용자를 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND
      );
    }
    const userData = {
      id: userDoc.id,
      ...userDoc?.data(),
      createdAt: userDoc?.data()?.createdAt?.toDate?.() || userDoc?.data()?.createdAt,
      updatedAt: userDoc?.data()?.updatedAt?.toDate?.() || userDoc?.data()?.updatedAt
    };
    return successResponse(userData);
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
    // 사용자 존재 확인
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc?.exists) {
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
    await db.collection('users').doc(userId).update(updateData);
    // 업데이트된 사용자 정보 반환
    const updatedDoc = await db.collection('users').doc(userId).get();
    const updatedUser = {
      id: updatedDoc.id,
      ...updatedDoc?.data(),
      createdAt: updatedDoc?.data()?.createdAt?.toDate?.() || updatedDoc?.data()?.createdAt,
      updatedAt: updatedDoc?.data()?.updatedAt?.toDate?.() || updatedDoc?.data()?.updatedAt
    };
    return successResponse(
      updatedUser,
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
    // 사용자 존재 확인
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc?.exists) {
      return errorResponse(
        ApiErrorCode.NOT_FOUND,
        '사용자를 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND
      );
    }
    // 삭제할 사용자의 역할 확인
    const targetUserRole = userDoc?.data()?.role;
    if (targetUserRole && !canDeleteUser(validation.user!.role!, targetUserRole)) {
      return errorResponse(
        ApiErrorCode.INSUFFICIENT_PERMISSIONS,
        '해당 사용자를 삭제할 권한이 없습니다.',
        HttpStatus.FORBIDDEN
      );
    }
    // 소프트 삭제 (실제로는 status를 'deleted'로 변경)
    await db.collection('users').doc(userId).update({
      status: 'deleted',
      deletedAt: new Date(),
      deletedBy: validation.user?.uid
    });
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
