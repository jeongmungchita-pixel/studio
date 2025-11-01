/**
 * API 헬퍼 유틸리티
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin';
import { ApiResponse, ApiError, ApiErrorCode } from '@/types/api';
import { HttpStatus } from './http-status';
import { UserRole, UserProfile } from '@/types/auth';
import { ErrorDetails } from '@/types/common';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
// Re-export for convenience
export { ApiErrorCode, HttpStatus } from '@/types/api';
/**
 * 성공 응답 생성
 */
export function successResponse<T>(
  data: T,
  message?: string,
  statusCode: number = HttpStatus.OK
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    },
    { status: statusCode }
  );
}
/**
 * 에러 응답 생성
 */
export function errorResponse(
  code: ApiErrorCode,
  message: string,
  statusCode: number = HttpStatus.BAD_REQUEST,
  details?: ErrorDetails
): NextResponse<ApiResponse> {
  const error: ApiError = {
    code,
    message,
    statusCode,
    details
  };
  return NextResponse.json(
    {
      success: false,
      error,
      timestamp: new Date().toISOString()
    },
    { status: statusCode }
  );
}
/**
 * 인증 토큰 검증
 */
export async function verifyAuth(request: NextRequest): Promise<{
  uid: string;
  email?: string;
  role?: UserRole;
} | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.substring(7);
    const decodedToken = await verifyIdToken(token);
    
    if (!decodedToken) {
      return null;
    }
    
    // Firestore에서 사용자 정보 가져오기
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc?.exists) {
      return {
        uid: decodedToken.uid,
        email: decodedToken.email
      };
    }
    const userData = userDoc?.data();
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userData?.role
    };
  } catch (error: unknown) {
    return null;
  }
}
/**
 * 권한 확인
 */
export function hasRole(userRole: UserRole | undefined, requiredRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}
/**
 * 권한 레벨 확인 (계층적)
 */
export function hasMinimumRole(userRole: UserRole | undefined, minimumRole: UserRole): boolean {
  if (!userRole) return false;
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
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[minimumRole] || 0;
  return userLevel >= requiredLevel;
}
/**
 * 요청 검증 미들웨어
 */
export async function validateRequest(
  request: NextRequest,
  options: {
    requireAuth?: boolean;
    requiredRoles?: UserRole[];
    minimumRole?: UserRole;
  } = {}
): Promise<{ valid: boolean; user?: { uid: string; email?: string; role?: UserRole }; error?: NextResponse }> {
  // 인증 확인
  if (options.requireAuth) {
    const _user = await verifyAuth(request);
    if (!_user) {
      return {
        valid: false,
        error: errorResponse(
          ApiErrorCode.UNAUTHORIZED,
          '인증이 필요합니다.',
          HttpStatus.UNAUTHORIZED
        )
      };
    }
    // 특정 역할 확인
    if (options.requiredRoles && !hasRole(_user.role, options.requiredRoles)) {
      return {
        valid: false,
        error: errorResponse(
          ApiErrorCode.FORBIDDEN,
          '권한이 없습니다.',
          HttpStatus.FORBIDDEN
        )
      };
    }
    // 최소 역할 레벨 확인
    if (options.minimumRole && !hasMinimumRole(_user.role, options.minimumRole)) {
      return {
        valid: false,
        error: errorResponse(
          ApiErrorCode.INSUFFICIENT_PERMISSIONS,
          '권한이 부족합니다.',
          HttpStatus.FORBIDDEN
        )
      };
    }
    return { valid: true, user: _user };
  }
  return { valid: true };
}
/**
 * 페이지네이션 파라미터 파싱
 */
export function parsePaginationParams(request: NextRequest): {
  page: number;
  pageSize: number;
  offset: number;
} {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}
/**
 * 정렬 파라미터 파싱
 */
export function parseSortParams(request: NextRequest): {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
} {
  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  return { sortBy, sortOrder };
}
/**
 * 필터 파라미터 파싱
 */
export function parseFilterParams(request: NextRequest, allowedFilters: string[]): Record<string, unknown> {
  const { searchParams } = new URL(request.url);
  const filters: Record<string, unknown> = {};
  allowedFilters.forEach(filter => {
    const value = searchParams.get(filter);
    if (value !== null) {
      // boolean 값 처리
      if (value === 'true' || value === 'false') {
        filters[filter] = value === 'true';
      }
      // 숫자 처리
      else if (!isNaN(Number(value))) {
        filters[filter] = Number(value);
      }
      // 문자열
      else {
        filters[filter] = value;
      }
    }
  });
  return filters;
}
/**
 * 에러 핸들링 래퍼
 */
export async function withErrorHandling<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error: unknown) {
    // Firebase 에러 처리
    if ((error as any).code?.startsWith('auth/')) {
      return errorResponse(
        ApiErrorCode.UNAUTHORIZED,
        '인증 오류가 발생했습니다.',
        HttpStatus.UNAUTHORIZED,
        (error as any).code
      );
    }
    // Firestore 에러 처리
    if ((error as any).code === 'permission-denied') {
      return errorResponse(
        ApiErrorCode.FORBIDDEN,
        '접근 권한이 없습니다.',
        HttpStatus.FORBIDDEN
      );
    }
    // 기본 에러
    return errorResponse(
      ApiErrorCode.INTERNAL_ERROR,
      '서버 오류가 발생했습니다.',
      HttpStatus.INTERNAL_SERVER_ERROR,
      process.env.NODE_ENV === 'development' ? (error as any).message : undefined
    );
  }
}
/**
 * 요청 본문 파싱
 */
export async function parseRequestBody<T>(request: NextRequest): Promise<T | null> {
  try {
    const body = await request.json();
    return body as T;
  } catch {
    return null;
  }
}
/**
 * 캐시 헤더 설정
 */
export function setCacheHeaders(
  response: NextResponse,
  options: {
    maxAge?: number;
    sMaxAge?: number;
    staleWhileRevalidate?: number;
    private?: boolean;
  } = {}
): NextResponse {
  const { maxAge = 0, sMaxAge, staleWhileRevalidate, private: isPrivate = false } = options;
  const directives: string[] = [];
  if (isPrivate) {
    directives.push('private');
  } else {
    directives.push('public');
  }
  directives.push(`max-age=${maxAge}`);
  if (sMaxAge !== undefined) {
    directives.push(`s-maxage=${sMaxAge}`);
  }
  if (staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
  }
  response.headers.set('Cache-Control', directives.join(', '));
  return response;
}
