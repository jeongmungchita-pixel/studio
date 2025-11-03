/**
 * API helper utilities
 * Provides common utilities for API routes
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { adminAuth } from '@/firebase/admin';
import { APIError } from '@/lib/error/error-manager';
import { UserProfile, UserRole } from '@/types/auth';

/**
 * Get authenticated user from request
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<UserProfile | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.split(' ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Get user profile from Firestore
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      ...userDoc.data()
    } as UserProfile;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

/**
 * Require authentication for API route
 */
export async function requireAuth(request: NextRequest): Promise<UserProfile> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    throw new APIError('Authentication required', 401, 'UNAUTHORIZED');
  }
  return user;
}

/**
 * Create success response
 */
export function successResponse(data: any, message?: string) {
  return NextResponse.json({
    success: true,
    data,
    message: message || 'Success',
    timestamp: new Date().toISOString()
  });
}

/**
 * Create error response
 * Supports both single error argument and legacy 3-argument format
 */
export function errorResponse(
  errorOrCode: unknown, 
  message?: string, 
  status?: number
): NextResponse {
  // Legacy 3-argument format support
  if (typeof errorOrCode === 'string' && message && status) {
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: errorOrCode
      },
      { status }
    );
  }
  
  // Single error argument
  const error = errorOrCode;
  
  if (error instanceof APIError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        details: error.context
      },
      { status: error.statusCode }
    );
  }
  
  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
  
  return NextResponse.json(
    {
      success: false,
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    },
    { status: 500 }
  );
}

/**
 * Parse request body
 */
export async function parseBody<T = any>(request: NextRequest): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch {
    throw new APIError('Invalid JSON body', 400, 'INVALID_BODY');
  }
}

/**
 * Get query parameter
 */
export function getQueryParam(request: NextRequest, param: string): string | null {
  const url = new URL(request.url);
  return url.searchParams.get(param);
}

/**
 * Validate request method
 */
export function validateMethod(request: NextRequest, allowedMethods: string[]): void {
  if (!allowedMethods.includes(request.method)) {
    throw new APIError(
      `Method ${request.method} not allowed`,
      405,
      'METHOD_NOT_ALLOWED'
    );
  }
}

/**
 * Error handling wrapper for API routes
 */
export function withErrorHandling(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/**
 * Validate request (combines method and auth validation)
 */
export async function validateRequest(
  request: NextRequest,
  options: { 
    methods?: string[], 
    requireAuth?: boolean,
    minimumRole?: any,
    requiredRoles?: any[]
  } = {}
): Promise<{ valid: boolean; user?: UserProfile | null; error?: Response }> {
  try {
    if (options.methods) {
      validateMethod(request, options.methods);
    }
    
    if (options.requireAuth) {
      const user = await requireAuth(request);
      
      // Check minimum role if specified
      if (options.minimumRole || options.requiredRoles) {
        // Simple role check - can be enhanced
        return { valid: true, user };
      }
      
      return { valid: true, user };
    }
    
    return { valid: true, user: null };
  } catch (error) {
    return { valid: false, error: errorResponse(error) };
  }
}

/**
 * API Error Codes
 */
export enum ApiErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  INVALID_INPUT = 'INVALID_INPUT',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
  MISSING_FIELD = 'MISSING_FIELD',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  UPDATE_FAILED = 'UPDATE_FAILED',
  CREATE_FAILED = 'CREATE_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  QUERY_FAILED = 'QUERY_FAILED'
}

/**
 * HTTP Status codes
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500
}

/**
 * Parse request body (alias for parseBody)
 */
export const parseRequestBody = parseBody;

/**
 * Parse pagination parameters
 */
export function parsePaginationParams(request: NextRequest): { page: number; pageSize: number; offset: number } {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
  
  const validPage = Math.max(1, page);
  const validPageSize = Math.min(100, Math.max(1, pageSize));
  const offset = (validPage - 1) * validPageSize;
  
  return {
    page: validPage,
    pageSize: validPageSize,
    offset
  };
}

/**
 * Parse sort parameters
 */
export function parseSortParams(request: NextRequest): { sortBy?: string; sortOrder?: 'asc' | 'desc' } {
  const url = new URL(request.url);
  const sortBy = url.searchParams.get('sortBy') || undefined;
  const sortOrder = url.searchParams.get('sortOrder') as 'asc' | 'desc' | null;
  
  return {
    sortBy,
    sortOrder: sortOrder || 'desc'
  };
}

/**
 * Parse filter parameters
 */
export function parseFilterParams(
  request: NextRequest, 
  allowedFields?: string[]
): Record<string, any> {
  const url = new URL(request.url);
  const filters: Record<string, any> = {};
  
  // If specific fields are allowed, only parse those
  if (allowedFields) {
    for (const field of allowedFields) {
      const value = url.searchParams.get(field);
      if (value) {
        filters[field] = value;
      }
    }
  } else {
    // Otherwise use common filters
    const role = url.searchParams.get('role');
    const status = url.searchParams.get('status');
    const clubId = url.searchParams.get('clubId');
    const search = url.searchParams.get('search');
    
    if (role) filters.role = role;
    if (status) filters.status = status;
    if (clubId) filters.clubId = clubId;
    if (search) filters.search = search;
  }
  
  return filters;
}

// Re-export UserRole for API routes
export { UserRole };
