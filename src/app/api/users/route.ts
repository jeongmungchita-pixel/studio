/**
 * 사용자 API 엔드포인트
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
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdmin } from '@/firebase/admin';
// Admin SDK 초기화
initializeAdmin();
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
    // Firestore 쿼리 구성
    const db = getFirestore();
    let _query = db.collection('users') as FirebaseFirestore.Query;
    // 필터 적용
    if (filters.role) {
      _query = _query.where('role', '==', filters.role);
    }
    if (filters.status) {
      _query = _query.where('status', '==', filters.status);
    }
    if (filters.clubId) {
      _query = _query.where('clubId', '==', filters.clubId);
    }
    // 정렬 적용
    _query = _query.orderBy(sortBy, sortOrder);
    // 전체 개수 조회
    const countSnapshot = await _query.count().get();
    const total = countSnapshot.data().count;
    // 페이지네이션 적용
    _query = _query.limit(pageSize).offset(offset);
    // 데이터 조회
    const snapshot = await _query.get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
    }));
    // 응답 반환
    return successResponse({
      items: users,
      total,
      page,
      pageSize,
      hasNext: offset + pageSize < total,
      hasPrev: page > 1
    });
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
    if (!body.email || !body.name || !body.role) {
      return errorResponse(
        ApiErrorCode.MISSING_FIELD,
        '필수 필드가 누락되었습니다.',
        HttpStatus.BAD_REQUEST
      );
    }
    // 이메일 중복 확인
    const db = getFirestore();
    const existingUser = await db
      .collection('users')
      .where('email', '==', body.email)
      .limit(1)
      .get();
    if (!existingUser.empty) {
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
    const newUser = {
      email: body.email,
      name: body.name,
      role: body.role,
      clubId: body.clubId || null,
      phoneNumber: body.phoneNumber || null,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: validation.user?.uid
    };
    const docRef = await db.collection('users').add(newUser);
    const createdUser = {
      id: docRef.id,
      ...newUser
    };
    return successResponse(
      createdUser,
      '사용자가 생성되었습니다.',
      HttpStatus.CREATED
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
