import { z } from 'zod';
import { UserRole } from '@/types/auth';
import { APIError } from '@/lib/error/error-manager';
/**
 * 서버사이드 검증 스키마 정의
 */
// 기본 검증 스키마
export const BaseSchemas = {
  // ID 검증 (Firebase UID 형식)
  firebaseId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  // 이메일 검증
  email: z.string().email().max(254),
  // 전화번호 검증 (한국 형식)
  phoneNumber: z.string().regex(/^01[0-9]-?[0-9]{4}-?[0-9]{4}$/),
  // 날짜 검증
  isoDate: z.string().datetime(),
  // URL 검증
  url: z.string().url().max(2048),
  // 파일 크기 검증 (바이트)
  fileSize: z.number().min(0).max(10 * 1024 * 1024), // 10MB
};
// 사용자 관련 스키마
export const UserSchemas = {
  // 사용자 생성
  createUser: z.object({
    email: BaseSchemas.email,
    displayName: z.string().min(2).max(50).trim(),
    phoneNumber: BaseSchemas.phoneNumber.optional(),
    role: z.nativeEnum(UserRole),
    clubId: BaseSchemas.firebaseId.optional(),
    birthDate: BaseSchemas.isoDate.optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    address: z.string().max(200).optional(),
    emergencyContact: z.object({
      name: z.string().min(2).max(50),
      phone: BaseSchemas.phoneNumber,
      relationship: z.string().max(20),
    }).optional(),
  }),
  // 사용자 업데이트
  updateUser: z.object({
    displayName: z.string().min(2).max(50).trim().optional(),
    phoneNumber: BaseSchemas.phoneNumber.optional(),
    birthDate: BaseSchemas.isoDate.optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    address: z.string().max(200).optional(),
    profileImageUrl: BaseSchemas.url.optional(),
    emergencyContact: z.object({
      name: z.string().min(2).max(50),
      phone: BaseSchemas.phoneNumber,
      relationship: z.string().max(20),
    }).optional(),
  }),
  // 역할 변경 (관리자만)
  updateRole: z.object({
    userId: BaseSchemas.firebaseId,
    newRole: z.nativeEnum(UserRole),
    reason: z.string().min(10).max(500),
  }),
  // 사용자 상태 변경
  updateStatus: z.object({
    userId: BaseSchemas.firebaseId,
    status: z.enum(['active', 'inactive', 'suspended', 'pending']),
    reason: z.string().min(5).max(500).optional(),
  }),
};
// 클럽 관련 스키마
export const ClubSchemas = {
  // 클럽 생성
  createClub: z.object({
    name: z.string().min(2).max(100).trim(),
    description: z.string().max(1000).optional(),
    address: z.string().min(10).max(200),
    phoneNumber: BaseSchemas.phoneNumber,
    email: BaseSchemas.email,
    website: BaseSchemas.url.optional(),
    establishedDate: BaseSchemas.isoDate.optional(),
    licenseNumber: z.string().min(5).max(50).optional(),
    maxMembers: z.number().min(1).max(10000).optional(),
  }),
  // 클럽 업데이트
  updateClub: z.object({
    name: z.string().min(2).max(100).trim().optional(),
    description: z.string().max(1000).optional(),
    address: z.string().min(10).max(200).optional(),
    phoneNumber: BaseSchemas.phoneNumber.optional(),
    email: BaseSchemas.email.optional(),
    website: BaseSchemas.url.optional(),
    maxMembers: z.number().min(1).max(10000).optional(),
  }),
};
// 이벤트 관련 스키마
export const EventSchemas = {
  // 이벤트 생성
  createEvent: z.object({
    title: z.string().min(2).max(200).trim(),
    description: z.string().max(2000).optional(),
    startDate: BaseSchemas.isoDate,
    endDate: BaseSchemas.isoDate,
    location: z.string().min(2).max(200),
    maxParticipants: z.number().min(1).max(1000).optional(),
    registrationDeadline: BaseSchemas.isoDate.optional(),
    fee: z.number().min(0).max(1000000).optional(),
    category: z.enum(['competition', 'training', 'seminar', 'social', 'other']),
    isPublic: z.boolean().default(true),
  }).refine(data => new Date(data.endDate) > new Date(data.startDate), {
    message: "종료일은 시작일보다 늦어야 합니다",
    path: ["endDate"],
  }),
  // 이벤트 참가 신청
  registerEvent: z.object({
    eventId: BaseSchemas.firebaseId,
    participantInfo: z.object({
      name: z.string().min(2).max(50),
      email: BaseSchemas.email,
      phone: BaseSchemas.phoneNumber,
      specialRequests: z.string().max(500).optional(),
    }),
  }),
};
/**
 * 서버사이드 검증 클래스
 */
export class ServerValidator {
  /**
   * 스키마 검증 실행
   */
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        throw new APIError(
          `검증 실패: ${errorMessages}`, 400, 'VALIDATION_ERROR'
        );
      }
      throw error;
    }
  }
  /**
   * 안전한 검증 (에러를 반환)
   */
  static safeParse<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: boolean;
    data?: T;
    error?: string;
  } {
    try {
      const result = schema.safeParse(data);
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        const errorMessages = result.error.issues.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        return { success: false, error: errorMessages };
      }
    } catch (error: unknown) {
      return { 
        success: false, 
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : '알 수 없는 오류' 
      };
    }
  }
  /**
   * 권한 기반 검증
   */
  static validateWithPermission<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    userRole: UserRole,
    requiredRoles: UserRole[]
  ): T {
    // 권한 확인
    if (!requiredRoles.includes(userRole)) {
      throw new APIError(
        '이 작업을 수행할 권한이 없습니다', 403, 'INSUFFICIENT_PERMISSIONS'
      );
    }
    // 데이터 검증
    return this.validate(schema, data);
  }
  /**
   * 파일 업로드 검증
   */
  static validateFileUpload(file: {
    name: string;
    size: number;
    type: string;
  }): void {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const maxNameLength = 255;
    if (!allowedTypes.includes(file.type)) {
      throw new APIError(
        '허용되지 않는 파일 형식입니다', 400, 'INVALID_FILE_TYPE'
      );
    }
    if (file.size > maxSize) {
      throw new APIError(
        '파일 크기가 너무 큽니다 (최대 10MB)', 400, 'FILE_TOO_LARGE'
      );
    }
    if (file.name.length > maxNameLength) {
      throw new APIError(
        '파일명이 너무 깁니다', 400, 'FILENAME_TOO_LONG'
      );
    }
    // 악성 파일명 패턴 검사
    const dangerousPatterns = [
      /\.\./,           // 디렉토리 순회
      /[<>:"|?*]/,      // 특수 문자
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows 예약어
    ];
    if (dangerousPatterns.some(pattern => pattern.test(file.name))) {
      throw new APIError(
        '안전하지 않은 파일명입니다', 400, 'UNSAFE_FILENAME'
      );
    }
  }
  /**
   * 입력 데이터 정화 (XSS 방지)
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // HTML 태그 각괄호 제거 (레거시 호환)
      .replace(/javascript:/gi, '') // JavaScript 프로토콜 제거
      .replace(/on\w+=/gi, '') // 인라인 이벤트 핸들러 제거
      .trim();
  }
  /**
   * SQL 인젝션 방지 (NoSQL 인젝션 포함)
   */
  static sanitizeQuery(_query: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(_query)) {
      // 키 검증
      if (!/^[a-zA-Z0-9_.-]+$/.test(key)) {
        continue; // 안전하지 않은 키는 제외
      }
      // 값 검증 및 정화
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeInput(value);
      } else if (typeof value === 'number' && isFinite(value)) {
        sanitized[key] = value;
      } else if (typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value === null) {
        sanitized[key] = null;
      }
      // 다른 타입은 제외
    }
    return sanitized;
  }
  /**
   * 레이트 리미팅 검증
   */
  static validateRateLimit(
    identifier: string,
    maxRequests: number,
    windowMs: number,
    storage: Map<string, { count: number; resetTime: number }> = new Map()
  ): void {
    const now = Date.now();
    const record = storage.get(identifier);
    if (!record || now > record.resetTime) {
      // 새로운 윈도우 시작
      storage.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return;
    }
    if (record.count >= maxRequests) {
      throw new APIError(
        '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.', 429, 'RATE_LIMIT_EXCEEDED'
      );
    }
    record.count++;
  }
}
/**
 * 검증 미들웨어 팩토리
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (data: unknown) => {
    return ServerValidator.validate(schema, data);
  };
}
/**
 * 권한 검증 미들웨어 팩토리
 */
export function createPermissionMiddleware(requiredRoles: UserRole[]) {
  return (userRole: UserRole) => {
    if (!requiredRoles.includes(userRole)) {
      throw new APIError(
        '이 작업을 수행할 권한이 없습니다', 403, 'INSUFFICIENT_PERMISSIONS'
      );
    }
  };
}
