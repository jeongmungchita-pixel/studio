/**
 * 타입 가드 유틸리티 함수들
 */

import { UserProfile, UserRole } from '@/types/auth';
import { Member } from '@/types/member';
import { ApiError, ApiResponse } from '@/types/api';
import { DocumentData } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';

/**
 * UserProfile 타입 가드
 */
export function isUserProfile(obj: unknown): obj is UserProfile {
  if (!obj || typeof obj !== 'object') return false;
  const user = obj as Record<string, unknown>;
  
  return (
    typeof user.uid === 'string' &&
    typeof user.email === 'string' &&
    typeof user.displayName === 'string' &&
    typeof user.status === 'string' &&
    Object.values(UserRole).includes(user.role as UserRole)
  );
}

/**
 * Member 타입 가드
 */
export function isMember(obj: unknown): obj is Member {
  if (!obj || typeof obj !== 'object') return false;
  const member = obj as Record<string, unknown>;
  
  return (
    typeof member.id === 'string' &&
    typeof member.name === 'string' &&
    typeof member.clubId === 'string' &&
    (member.memberCategory === 'adult' || member.memberCategory === 'child') &&
    (member.memberType === 'individual' || member.memberType === 'family')
  );
}

/**
 * ApiError 타입 가드
 */
export function isApiError(error: unknown): error is ApiError {
  if (!error || typeof error !== 'object') return false;
  const apiError = error as Record<string, unknown>;
  
  return (
    typeof apiError.code === 'string' &&
    typeof apiError.message === 'string' &&
    typeof apiError.statusCode === 'number'
  );
}

/**
 * ApiResponse 타입 가드
 */
export function isApiResponse<T = unknown>(obj: unknown): obj is ApiResponse<T> {
  if (!obj || typeof obj !== 'object') return false;
  const response = obj as Record<string, unknown>;
  
  return (
    typeof response.success === 'boolean' &&
    typeof response.timestamp === 'string'
  );
}

/**
 * Firebase Error 타입 가드
 */
export function isFirebaseError(error: unknown): error is FirebaseError {
  if (!error || typeof error !== 'object') return false;
  const fbError = error as Record<string, unknown>;
  
  return (
    typeof fbError.code === 'string' &&
    typeof fbError.message === 'string' &&
    typeof fbError.name === 'string' &&
    fbError.name === 'FirebaseError'
  );
}

/**
 * DocumentData 타입 가드
 */
export function isDocumentData(obj: unknown): obj is DocumentData {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    !Array.isArray(obj)
  );
}

/**
 * 배열 타입 가드
 */
export function isArray<T>(
  value: unknown,
  itemGuard: (item: unknown) => item is T
): value is T[] {
  return (
    Array.isArray(value) &&
    value.every(item => itemGuard(item))
  );
}

/**
 * null이 아닌 값 타입 가드
 */
export function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

/**
 * undefined가 아닌 값 타입 가드
 */
export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

/**
 * null이나 undefined가 아닌 값 타입 가드
 */
export function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * 문자열 타입 가드
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 숫자 타입 가드
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 불린 타입 가드
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * 날짜 타입 가드
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * 권한 레벨 체크 타입 가드
 */
export function hasMinimumRole(
  userRole: UserRole | undefined,
  minimumRole: UserRole
): boolean {
  if (!userRole) return false;
  
  const roleHierarchy: Record<UserRole, number> = {
    [UserRole.SUPER_ADMIN]: 100,
    [UserRole.FEDERATION_ADMIN]: 90,
    [UserRole.FEDERATION_SECRETARIAT]: 80,
    [UserRole.COMMITTEE_CHAIR]: 70,
    [UserRole.COMMITTEE_MEMBER]: 60,
    [UserRole.CLUB_OWNER]: 50,
    [UserRole.CLUB_MANAGER]: 45,
    [UserRole.CLUB_STAFF]: 40,
    [UserRole.MEDIA_MANAGER]: 40,
    [UserRole.HEAD_COACH]: 35,
    [UserRole.ASSISTANT_COACH]: 30,
    [UserRole.MEMBER]: 20,
    [UserRole.PARENT]: 15,
    [UserRole.VENDOR]: 10,
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[minimumRole];
}

/**
 * 클럽 스태프 체크
 */
export function isClubStaff(role: UserRole | undefined): boolean {
  if (!role) return false;
  
  const staffRoles: UserRole[] = [
    UserRole.CLUB_OWNER,
    UserRole.CLUB_MANAGER,
    UserRole.CLUB_STAFF,
    UserRole.HEAD_COACH,
    UserRole.ASSISTANT_COACH,
  ];
  
  return staffRoles.includes(role);
}

/**
 * 관리자 체크
 */
export function isAdmin(role: UserRole | undefined): boolean {
  if (!role) return false;
  
  return role === UserRole.SUPER_ADMIN || role === UserRole.FEDERATION_ADMIN;
}

/**
 * 에러 메시지 추출
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }
  
  if (isFirebaseError(error)) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Unknown error occurred';
}

/**
 * 안전한 JSON 파싱
 */
export function safeJsonParse<T = unknown>(
  json: string,
  fallback: T
): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * 객체 속성 존재 확인
 */
export function hasProperty<K extends PropertyKey>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return obj !== null && typeof obj === 'object' && key in obj;
}

/**
 * 타입 안전한 객체 키 추출
 */
export function objectKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * 타입 안전한 객체 값 추출
 */
export function objectValues<T extends object>(obj: T): T[keyof T][] {
  return Object.values(obj) as T[keyof T][];
}

/**
 * 타입 안전한 객체 엔트리 추출
 */
export function objectEntries<T extends object>(
  obj: T
): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}
