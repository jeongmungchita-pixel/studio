import { NextResponse } from 'next/server';
import { logApiRequest, LogLevel } from '@/lib/monitoring';
import { NextRequest } from 'next/server';
/**
 * API Error codes
 */
export enum ErrorCode {
  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  // Client errors (400)
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  // Not found errors (404)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  // Conflict errors (409)
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  // Rate limiting (429)
  RATE_LIMITED = 'RATE_LIMITED',
  // Server errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  // Service unavailable (503)
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}
/**
 * Custom API Error class
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
  /**
   * Common error factories
   */
  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(401, ErrorCode.UNAUTHORIZED, message);
  }
  static invalidToken(message = 'Invalid or expired token'): ApiError {
    return new ApiError(401, ErrorCode.INVALID_TOKEN, message);
  }
  static forbidden(message = 'Access denied'): ApiError {
    return new ApiError(403, ErrorCode.FORBIDDEN, message);
  }
  static insufficientPermissions(message = 'Insufficient permissions'): ApiError {
    return new ApiError(403, ErrorCode.INSUFFICIENT_PERMISSIONS, message);
  }
  static badRequest(message = 'Bad request', details?: unknown): ApiError {
    return new ApiError(400, ErrorCode.BAD_REQUEST, message, details as Record<string, unknown>);
  }
  static validationError(message = 'Validation failed', details?: unknown): ApiError {
    return new ApiError(400, ErrorCode.VALIDATION_ERROR, message, details as Record<string, unknown>);
  }
  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, ErrorCode.NOT_FOUND, message);
  }
  static conflict(message = 'Resource conflict', details?: unknown): ApiError {
    return new ApiError(409, ErrorCode.CONFLICT, message, details as Record<string, unknown>);
  }
  static rateLimited(message = 'Too many requests'): ApiError {
    return new ApiError(429, ErrorCode.RATE_LIMITED, message);
  }
  static internal(message = 'Internal server error', details?: unknown): ApiError {
    return new ApiError(500, ErrorCode.INTERNAL_ERROR, message, details as Record<string, unknown>);
  }
  static databaseError(message = 'Database operation failed', details?: unknown): ApiError {
    return new ApiError(500, ErrorCode.DATABASE_ERROR, message, details as Record<string, unknown>);
  }
  static serviceUnavailable(message = 'Service temporarily unavailable'): ApiError {
    return new ApiError(503, ErrorCode.SERVICE_UNAVAILABLE, message);
  }
}
/**
 * Error response formatter
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    path?: string;
    method?: string;
    requestId?: string;
  };
}
/**
 * Format error response
 */
function formatErrorResponse(
  error: ApiError | Error,
  request?: NextRequest
): ErrorResponse {
  const isApiError = error instanceof ApiError;
  const response: ErrorResponse = {
    error: {
      code: isApiError ? error.code : ErrorCode.INTERNAL_ERROR,
      message: (error as any).message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    }
  };
  // Add details if available
  if (isApiError && error.details) {
    response.error.details = error.details;
  }
  // Add request context if available
  if (request) {
    response.error.path = request.nextUrl.pathname;
    response.error.method = request.method;
    response.error.requestId = request.headers.get('x-request-id') || undefined;
  }
  // In development, add stack trace
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.error.details = {
      ...response.error.details,
      stack: error.stack.split('\n')
    };
  }
  return response;
}
/**
 * Global error handler for API routes
 */
export async function handleApiError(
  error: unknown,
  request?: NextRequest
): Promise<NextResponse> {
  // Log the error
  if (request) {
    await logApiRequest(request, {
      level: LogLevel.ERROR,
      error,
      metadata: {
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    });
  }
  // Handle different error types
  if (error instanceof ApiError) {
    return NextResponse.json(
      formatErrorResponse(error, request),
      { status: error.statusCode }
    );
  }
  // Handle Firebase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as any;
    switch (firebaseError.code) {
      case 'auth/id-token-expired':
        return NextResponse.json(
          formatErrorResponse(ApiError.invalidToken('Token has expired'), request),
          { status: 401 }
        );
      case 'auth/invalid-id-token':
        return NextResponse.json(
          formatErrorResponse(ApiError.invalidToken('Invalid token'), request),
          { status: 401 }
        );
      case 'auth/user-not-found':
        return NextResponse.json(
          formatErrorResponse(ApiError.notFound('User not found'), request),
          { status: 404 }
        );
      case 'permission-denied':
        return NextResponse.json(
          formatErrorResponse(ApiError.forbidden('Permission denied'), request),
          { status: 403 }
        );
      default:
    }
  }
  // Default to internal server error
  const internalError = error instanceof Error ? error : new Error(String(error));
  // Log critical error
  return NextResponse.json(
    formatErrorResponse(internalError, request),
    { status: 500 }
  );
}
/**
 * Async error handler wrapper
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R | NextResponse> {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error: unknown) {
      // Try to find request object in args
      const request = args.find(arg => arg instanceof NextRequest) as NextRequest | undefined;
      return handleApiError(error, request);
    }
  };
}
/**
 * Validation helper
 */
export function validateRequiredFields(
  data: unknown,
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(field => !(data as any)[field]);
  if (missingFields.length > 0) {
    throw ApiError.validationError(
      `Missing required fields: ${missingFields.join(', ')}`,
      { missingFields }
    );
  }
}
/**
 * Type validation helper
 */
export function validateFieldTypes(
  data: unknown,
  fieldTypes: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>
): void {
  const invalidFields: string[] = [];
  for (const [field, expectedType] of Object.entries(fieldTypes)) {
    if (field in (data as any)) {
      const actualType = Array.isArray((data as any)[field]) ? 'array' : typeof (data as any)[field];
      if (actualType !== expectedType) {
        invalidFields.push(`${field} (expected ${expectedType}, got ${actualType})`);
      }
    }
  }
  if (invalidFields.length > 0) {
    throw ApiError.validationError(
      `Invalid field types: ${invalidFields.join(', ')}`,
      { invalidFields }
    );
  }
}
/**
 * Sanitize error for client
 */
export function sanitizeError(error: unknown): Record<string, unknown> {
  // Remove sensitive information
  const sanitized: Record<string, unknown> = { ...(error as Record<string, unknown>) };
  // Remove internal details in production
  if (process.env.NODE_ENV === 'production') {
    delete sanitized.stack;
    delete (sanitized as any).config;
    delete (sanitized as any).request;
    const response = sanitized.response as Record<string, unknown> | undefined;
    if (response) {
      delete (response as any).config;
      delete (response as any).request;
    }
  }
  return sanitized;
}
